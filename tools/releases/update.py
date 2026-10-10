#!/usr/bin/env python3
"""Keeps the Music page in step with Fløa's releases.

Deezer lists the releases (it carries the label, the other artists and the barcode). Each new one
is then found on Apple Music by its barcode, which gives the cover at its original size and the
Apple link, and on Spotify when SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are set. Covers are only
ever made smaller. The result goes to assets/data/releases.json, the covers to assets/img/music/,
and the list of releases is written into music/index.html, where the page's script builds the
shelf from it.

Runs daily on GitHub (.github/workflows/releases.yml) and by hand: python3 tools/releases/update.py
Needs curl and either sips (macOS) or ImageMagick; nothing else outside the standard library.
"""
import base64
import colorsys
import html
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import unicodedata
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CONFIG = os.path.join(ROOT, 'tools', 'releases', 'config.json')
DATA = os.path.join(ROOT, 'assets', 'data', 'releases.json')
IMG = os.path.join(ROOT, 'assets', 'img', 'music')
PAGE = os.path.join(ROOT, 'music', 'index.html')
BIG, SMALL = 760, 120  # cover on the shelf (380 px at 2x) and in the list


# ---------------------------------------------------------------- network

def curl(args):
    out = subprocess.run(['curl', '-sfL', '--retry', '3', '--max-time', '180'] + args, capture_output=True)
    if out.returncode:
        raise RuntimeError('curl failed (%d): %s' % (out.returncode, args[-1]))
    return out.stdout


def get_json(url, headers=()):
    args = []
    for h in headers:
        args += ['-H', h]
    return json.loads(curl(args + [url]))


def download(url, path):
    curl(['-o', path, url])


# ---------------------------------------------------------------- images

SIPS = shutil.which('sips')
MAGICK = shutil.which('magick') or shutil.which('convert')


def image_size(path):
    if SIPS:
        out = subprocess.run([SIPS, '-g', 'pixelWidth', '-g', 'pixelHeight', path], capture_output=True, text=True).stdout.split()
        return int(out[-3]), int(out[-1])
    out = subprocess.run([MAGICK, path, '-format', '%w %h', 'info:'], capture_output=True, text=True).stdout.split()
    return int(out[0]), int(out[1])


def make_jpeg(src, dst, size, quality):
    """Writes a square JPEG at most `size` wide; a smaller original keeps its own size."""
    n = min(size, image_size(src)[0])
    if SIPS:
        subprocess.run([SIPS, '-s', 'format', 'jpeg', '-s', 'formatOptions', str(quality), '-Z', str(n), src, '--out', dst],
                       check=True, capture_output=True)
    else:
        subprocess.run([MAGICK, src, '-resize', '%dx%d>' % (n, n), '-strip', '-quality', str(quality),
                        '-sampling-factor', '4:2:0', '-interlace', 'JPEG', dst], check=True, capture_output=True)


def tiny_pixels(src, tmp):
    bmp = os.path.join(tmp, 'tiny.bmp')
    if SIPS:
        subprocess.run([SIPS, '-s', 'format', 'bmp', '-z', '12', '12', src, '--out', bmp], check=True, capture_output=True)
    else:
        subprocess.run([MAGICK, src, '-resize', '12x12!', '-alpha', 'off', 'BMP3:' + bmp], check=True, capture_output=True)
    b = open(bmp, 'rb').read()
    off = struct.unpack('<I', b[10:14])[0]
    w, h = struct.unpack('<ii', b[18:26])
    step = struct.unpack('<H', b[28:30])[0] // 8
    row = (w * step + 3) // 4 * 4
    return [(b[off + y * row + x * step + 2], b[off + y * row + x * step + 1], b[off + y * row + x * step])
            for y in range(abs(h)) for x in range(w)]


def tones(pixels):
    """The cover's most telling colour, as a light accent and a deep ground for the page."""
    def score(p):
        _, l, s = colorsys.rgb_to_hls(*[c / 255 for c in p])
        return s * (1 - abs(l - .5) * 1.6)

    h, _, s = colorsys.rgb_to_hls(*[c / 255 for c in max(pixels, key=score)])

    def tone(l, s_max):
        r, g, b = colorsys.hls_to_rgb(h, l, min(s, s_max))
        return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))

    return tone(.62, .6), tone(.16, .45)


# ---------------------------------------------------------------- sources

def deezer_albums(artist):
    url, albums = 'https://api.deezer.com/artist/%s/albums?limit=100' % artist, []
    while url:
        page = get_json(url)
        albums += page.get('data', [])
        url = page.get('next')
    return albums


def apple_by_upc(upc, countries):
    for country in countries if upc else ():  # the first store that has it
        found = get_json('https://itunes.apple.com/lookup?upc=%s&entity=album&country=%s' % (upc, country))
        albums = [r for r in found.get('results', []) if r.get('wrapperType') == 'collection']
        if albums:
            return albums[0]
    return None


def spotify_token():
    cid, secret = os.environ.get('SPOTIFY_CLIENT_ID'), os.environ.get('SPOTIFY_CLIENT_SECRET')
    if not (cid and secret):
        return None
    auth = base64.b64encode(('%s:%s' % (cid, secret)).encode()).decode()
    return json.loads(curl(['-X', 'POST', '-H', 'Authorization: Basic ' + auth, '-d', 'grant_type=client_credentials',
                            'https://accounts.spotify.com/api/token']))['access_token']


def spotify_by_upc(upc, token):
    if not (upc and token):
        return None
    found = get_json('https://api.spotify.com/v1/search?type=album&limit=1&q=upc:' + upc, ['Authorization: Bearer ' + token])
    items = found.get('albums', {}).get('items', [])
    return items[0]['external_urls']['spotify'] if items else None


# ---------------------------------------------------------------- releases

def fold(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().casefold()


def slug_for(title, taken):
    base = re.sub(r'[^a-z0-9]+', '-', fold(title)).strip('-') or 'release'
    slug, n = base, 2
    while slug in taken:
        slug, n = '%s-%d' % (base, n), n + 1
    return slug


def kind(detail, apple):
    name = (apple or {}).get('collectionName', '')
    if name.endswith(' - EP') or re.search(r'\bEP\b', detail['title'], re.I):
        return 'EP'
    if name.endswith(' - Single'):
        return 'Single'
    if detail.get('record_type') == 'album':
        return 'Album'
    return 'EP' if detail.get('nb_tracks', 1) >= 3 else 'Single'


def complete(r):
    return all(r.get(k) for k in ('upc', 'date', 'slug', 'light', 'deep')) and r.get('links', {}).get('apple') is not None \
        and os.path.exists(os.path.join(IMG, r['slug'] + '.jpg')) and os.path.exists(os.path.join(IMG, r['slug'] + '-s.jpg'))


def fill(r, cfg, token, taken):
    """Completes one release in place; returns a note when something was added."""
    d = get_json('https://api.deezer.com/album/%s' % r['id'])
    me = fold(cfg['artist'])
    apple = apple_by_upc(d.get('upc'), cfg['apple_countries'])
    r.update({
        'title': d['title'],
        'with': [c['name'] for c in d.get('contributors', []) if fold(c['name']) != me],
        'date': d['release_date'],
        'label': d.get('label') or '',
        'upc': d.get('upc') or '',
        'type': kind(d, apple),
    })
    links = r.setdefault('links', {})
    links['deezer'] = d['link']
    links['apple'] = apple['collectionViewUrl'].split('?')[0] if apple else links.get('apple') or ''
    if not links.get('spotify'):
        links['spotify'] = spotify_by_upc(r['upc'], token) or ''
    if not r.get('slug'):
        r['slug'] = slug_for(d['title'], taken)
        taken.add(r['slug'])
    big, small = os.path.join(IMG, r['slug'] + '.jpg'), os.path.join(IMG, r['slug'] + '-s.jpg')
    if not (os.path.exists(big) and os.path.exists(small) and r.get('light')):
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, 'cover.jpg')
            if apple:  # Apple keeps the original; asking for more than it has returns the original size
                download(apple['artworkUrl100'].replace('100x100bb', '10000x10000bb'), src)
            else:
                download(d['cover_xl'], src)
            make_jpeg(src, big, BIG, 82)
            make_jpeg(src, small, SMALL, 80)
            r['light'], r['deep'] = tones(tiny_pixels(src, tmp))
    return r['title']


# ---------------------------------------------------------------- page

def render_list(releases):
    rows = []
    for r in releases:
        links = r['links']
        spotify = links.get('spotify') or ''
        anchors = ''.join('<a href="%s" rel="noopener">%s</a>' % (html.escape(u), name)
                          for name, u in (('Spotify', spotify), ('Apple Music', links.get('apple')), ('Deezer', links.get('deezer'))) if u)
        with_ = ', '.join(r['with'])
        rows.append(
            '<li class="rel" id="%(slug)s" data-date="%(date)s" data-type="%(type)s" data-light="%(light)s" data-deep="%(deep)s"'
            ' data-spotify="%(spotify)s">'
            '<img class="rel-thumb" src="../assets/img/music/%(slug)s-s.jpg" alt="" width="60" height="60" loading="lazy" decoding="async">'
            '<span class="rel-year">%(year)s</span>'
            '<button type="button" class="rel-title">%(title)s</button>'
            '<span class="rel-with">%(with)s</span>'
            '<span class="rel-label">%(label)s</span>'
            '<span class="rel-type">%(type)s</span>'
            '<span class="rel-links">%(anchors)s</span></li>' % {
                'slug': r['slug'], 'date': r['date'], 'type': r['type'], 'light': r['light'], 'deep': r['deep'],
                'spotify': html.escape(spotify), 'year': r['date'][:4], 'title': html.escape(r['title']),
                'with': html.escape(with_), 'label': html.escape(r['label']), 'anchors': anchors})
    return '\n'.join('        ' + row for row in rows)


def write_page(releases):
    page = open(PAGE, encoding='utf-8').read()
    page = re.sub(r'<!-- releases:start -->.*?<!-- releases:end -->',
                  lambda m: '<!-- releases:start -->\n' + render_list(releases) + '\n        <!-- releases:end -->', page, flags=re.S)
    latest = releases[0]['slug'] if releases else ''
    page = re.sub(r'(<meta property="og:image" content=")[^"]*(")',
                  lambda m: m.group(1) + 'https://floamusic.github.io/assets/img/music/%s.jpg' % latest + m.group(2), page)
    open(PAGE, 'w', encoding='utf-8').write(page)


# ---------------------------------------------------------------- main

def main():
    cfg = json.load(open(CONFIG, encoding='utf-8'))
    releases = json.load(open(DATA, encoding='utf-8')) if os.path.exists(DATA) else []
    hidden = set(cfg['hide'])
    for r in [r for r in releases if r['id'] in hidden]:  # hidden after it was shown: drop it and its covers
        for suffix in ('.jpg', '-s.jpg'):
            path = os.path.join(IMG, r.get('slug', '') + suffix)
            if r.get('slug') and os.path.exists(path):
                os.remove(path)
    releases = [r for r in releases if r['id'] not in hidden]
    known = {r['id']: r for r in releases}
    for a in deezer_albums(cfg['deezer_artist']):
        if a['id'] in hidden or a.get('record_type') == 'compile' or a['id'] in known:
            continue
        known[a['id']] = {'id': a['id'], 'title': a['title']}
        releases.append(known[a['id']])

    todo = [r for r in releases if not complete(r)]
    token = spotify_token()
    taken = {r['slug'] for r in releases if r.get('slug')}
    for r in todo:  # slugs before the parallel part, so two new releases never share one
        if not r.get('slug'):
            r['slug'] = slug_for(r.get('title') or str(r['id']), taken)
            taken.add(r['slug'])
    for r in releases:  # a Spotify key added later fills the links that were missing
        if token and complete(r) and not r['links'].get('spotify'):
            r['links']['spotify'] = spotify_by_upc(r['upc'], token) or ''
    os.makedirs(IMG, exist_ok=True)
    added, failed = [], []

    def work(r):
        try:
            added.append(fill(r, cfg, token, taken))
        except Exception as e:  # one release that cannot be read now is tried again next run
            failed.append('%s (%s)' % (r.get('title', r['id']), e))

    with ThreadPoolExecutor(6) as pool:
        list(pool.map(work, todo))

    ready = sorted([r for r in releases if complete(r)], key=lambda r: (r['date'], r['id']), reverse=True)
    pending = [r for r in releases if not complete(r)]
    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    with open(DATA, 'w', encoding='utf-8') as f:
        json.dump(ready + pending, f, ensure_ascii=False, indent=1)
        f.write('\n')
    write_page(ready)
    print('%d releases on the page; updated: %s' % (len(ready), ', '.join(sorted(added)) or 'none'))
    if failed:
        print('could not finish: ' + '; '.join(failed), file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
