# floamusic.github.io

Public showcase for **Fløa** instruments: the visitor picks **FLOATING** or **KONSOLL**.
Live (once published): <https://floamusic.github.io/>

| Path | What it is |
| --- | --- |
| `index.html` | The showcase: two equal instrument cards (whole card opens the instrument's site); hover or focus shows that instrument's summary below (both are shown on touch screens); downloads table; support and contact |
| `assets/css/site.css` | Single stylesheet: a graphite room; each instrument card keeps its own palette (FLOATING kDark + orange, KONSOLL Soft Strata + module colours) |
| `assets/fonts/` | Geist Mono and Share Tech Mono, SIL OFL, licences included |
| `assets/img/` | Interface renders: FLOATING from `floating-site`, KONSOLL from `Konsoll_DSPTests --render-promo <file> [preset]` (2x, footer cropped so no version is pictured) |

Static HTML and CSS, no build step, nothing from a CDN. One call goes to `api.github.com` for FLOATING's latest release tag; the markup carries the fallback.

## Rules

- **Each instrument keeps its own site and releases.** FLOATING: `floamusic/floating-site` at `/floating-site/` — its `updates.html` URL is baked into shipped plug-ins and must never move. KONSOLL: `floamusic/konsoll-site` at `/konsoll-site/` (to be created). This repo only links to them.
- KONSOLL downloads are **SOON** placeholders until `konsoll-site` has its first release (`v0.9.0`). Then the KONSOLL card's Download and the downloads table point at `https://github.com/floamusic/konsoll-site/releases/latest/download/Konsoll-macOS-latest.pkg` and its install guide.
- No version numbers inside screenshots; refresh renders rather than editing them.
