# floamusic.github.io

Public showcase for **Fløa**: the instrument, **FLOATING**, and the music. (KONSOLL was taken off on 11.11.2026: its development stopped; its site `floamusic/konsoll-site` is unpublished.)
Live (once published): <https://floamusic.github.io/>

| Path | What it is |
| --- | --- |
| `index.html` | The showcase: FLOATING's card (the whole card opens its site; it turns from the classic look into the cassette, and a Looks switch in the summary turns it back) with its summary beside it on wide screens and under it on phones and tablets. Downloads table; support and contact |
| `assets/css/site.css` | Single stylesheet. The stage is FLOATING's world: black running into a little graphite, two ember pools that drift on wide screens with a pointer and stay still on phones (no blur or blend there). Card and summary in FLOATING's palette; downloads and contact on a graphite floor |
| `music/index.html` | Music: Fløa's releases on a shelf. The chosen cover faces the room and the page takes its colour; arrows, keys, swipe or a sideways trackpad scroll move along; a timeline marks each release at its date; the full list opens on request. `#slug` in the address opens the page on that release. **Listen here** loads the Spotify player only when pressed. The list between `<!-- releases:start -->` and `<!-- releases:end -->` is written by the updater; `assets/js/music.js` builds the shelf from it, and without script the list is the page |
| `assets/css/music.css`, `assets/js/music.js` | The Music page's styles (on top of `site.css`) and its script |
| `assets/data/releases.json` | Every release with its barcode, date, label, other artists, links and cover colours; the updater's state |
| `assets/img/music/` | Covers, 760 px for the shelf and 120 px for the list, made from the originals and never enlarged. The shelf's cover is also kept as WebP (a third of the JPEG), which the page asks for first; the JPEG stays for the list, the address preview and browsers without WebP |
| `tools/releases/` | `update.py` brings the releases up to date: Deezer lists them, Apple Music (matched by barcode) gives the original cover and its link, Spotify gives its link when `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` are set. `config.json` holds the artist ids and `hide`, the Deezer ids never to show (label compilations, releases wrongly credited). Runs locally with `python3 tools/releases/update.py` (curl and `sips`; WebP covers come from `sips` or ImageMagick, and a run that can make neither leaves the page on the JPEGs) |
| `.github/workflows/releases.yml` | Runs the updater every day at 05:23 UTC and on request (Actions → Releases → Run workflow); commits only when something changed; the push rebuilds Pages |
| `assets/fonts/` | Geist Mono and Share Tech Mono as WOFF2 (TTF kept as fallback), SIL OFL, licences included |
| `assets/img/` | Interface renders: FLOATING in both looks, one held state (`look-classic` / `look-cassette` from `floating-site`). The card opens on `floating-classic*` and turns into the cassette (`floating*`) after four seconds in view; "Looks" at the top of FLOATING's summary is a Classic / Cassette switch, the same on every screen, and once pressed the visitor's choice stands. The cassette is fetched only after the page has loaded; with reduced motion the looks swap without the fade. ⚠ `floating-classic*` is the one edited render: so the two looks line up during the fade, the classic is moved down in two bands (at 2880 px: 78 px above row 1440, 30 px from there on; the gap is filled with the panel's own colour), which puts its knob values and Atmosphere exactly on the cassette's. Nothing is drawn or changed inside the interface. Re-make it from fresh `--site-shots` renders rather than editing the files here. Each at 1080, 1920 and 2560 px, as JPEG and as AVIF (Pillow, quality 78, 4:4:4), which the page offers first. `og.jpg` is the picture shown when an address is shared: FLOATING-site's `cassette-hero-wide-1600.jpg` (1600×1000), the same picture its own pages share |
| `404.html` | Served by GitHub Pages for any address it cannot find on the domain, so its links and assets are absolute |

Static HTML and CSS, no build step, nothing from a CDN. Where the browser can, moving between the showcase, Music and FLOATING's site cross-fades (`@view-transition` in each site's stylesheet; all of them opt in). One call goes to `api.github.com` for FLOATING's latest release tag; the markup carries the fallback. The Music page calls nothing until someone presses Listen (then Spotify's player).

## Rules

- **The instrument keeps its own site and releases.** FLOATING: `floamusic/floating-site` at `/floating-site/` — its `updates.html` URL is baked into shipped plug-ins and must never move. This repo only links to it.
- No version numbers inside screenshots; refresh renders rather than editing them.
- A release that should not appear goes into `hide` in `tools/releases/config.json` (its Deezer id); the next run takes it and its covers off the page.
