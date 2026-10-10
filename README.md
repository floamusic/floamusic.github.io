# floamusic.github.io

Public showcase for **Fløa**: the visitor picks an instrument, **FLOATING** or **KONSOLL**, or goes to the music.
Live (once published): <https://floamusic.github.io/>

| Path | What it is |
| --- | --- |
| `index.html` | The showcase: two equal instrument cards (whole card opens the instrument's site). The page opens on FLOATING. With a pointer, hover or focus picks an instrument: its summary shows below and the stage turns to its world (the choice stays). On phones, touch screens and windows up to 960px the cards swipe sideways, each with its own summary, and a pager names them; the stage follows the swipe. Downloads table; support and contact |
| `assets/css/site.css` | Single stylesheet. Behind the cards, the two worlds lie side by side on one strip twice the stage's width: FLOATING's black and ember, graphite between, KONSOLL's light stone and module colours. In FLOATING's world KONSOLL's light shows at the right edge; choosing KONSOLL slides the strip across (`--p`, a transform only, so the gradient is painted once) and the hero copy takes the dark ink. Pools drift on wide screens with a pointer and stay still on phones, where blur and blend are left out too. Cards and summaries are drawn in their own instrument's palette; downloads and contact sit on a graphite floor |
| `music/index.html` | Music: Fløa's releases on a shelf. The chosen cover faces the room and the page takes its colour; arrows, keys, swipe or a sideways trackpad scroll move along; a timeline marks each release at its date; the full list opens on request. `#slug` in the address opens the page on that release. **Listen here** loads the Spotify player only when pressed. The list between `<!-- releases:start -->` and `<!-- releases:end -->` is written by the updater; `assets/js/music.js` builds the shelf from it, and without script the list is the page |
| `assets/css/music.css`, `assets/js/music.js` | The Music page's styles (on top of `site.css`) and its script |
| `assets/data/releases.json` | Every release with its barcode, date, label, other artists, links and cover colours; the updater's state |
| `assets/img/music/` | Covers, 760 px for the shelf and 120 px for the list, made from the originals and never enlarged |
| `tools/releases/` | `update.py` brings the releases up to date: Deezer lists them, Apple Music (matched by barcode) gives the original cover and its link, Spotify gives its link when `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` are set. `config.json` holds the artist ids and `hide`, the Deezer ids never to show (label compilations, releases wrongly credited). Runs locally with `python3 tools/releases/update.py` (curl and `sips`) |
| `.github/workflows/releases.yml` | Runs the updater every day at 05:23 UTC and on request (Actions → Releases → Run workflow); commits only when something changed; the push rebuilds Pages |
| `assets/fonts/` | Geist Mono and Share Tech Mono as WOFF2 (TTF kept as fallback), SIL OFL, licences included |
| `assets/img/` | Interface renders: FLOATING from `floating-site`, KONSOLL from `Konsoll_DSPTests --render-promo <file> [preset]` (2x, footer cropped so no version is pictured) |

Static HTML and CSS, no build step, nothing from a CDN. One call goes to `api.github.com` for FLOATING's latest release tag; the markup carries the fallback. The Music page calls nothing until someone presses Listen (then Spotify's player).

## Rules

- **Each instrument keeps its own site and releases.** FLOATING: `floamusic/floating-site` at `/floating-site/` — its `updates.html` URL is baked into shipped plug-ins and must never move. KONSOLL: `floamusic/konsoll-site` at `/konsoll-site/` (to be created). This repo only links to them.
- KONSOLL downloads are **SOON** placeholders until `konsoll-site` has its first release (`v0.9.0`). Then the KONSOLL card's Download and the downloads table point at `https://github.com/floamusic/konsoll-site/releases/latest/download/Konsoll-macOS-latest.pkg` and its install guide.
- No version numbers inside screenshots; refresh renders rather than editing them.
- A release that should not appear goes into `hide` in `tools/releases/config.json` (its Deezer id); the next run takes it and its covers off the page.
