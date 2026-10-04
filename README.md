# floamusic.github.io

Public showcase for **Fløa** instruments: the visitor picks **FLOATING** or **KONSOLL**.
Live (once published): <https://floamusic.github.io/>

| Path | What it is |
| --- | --- |
| `index.html` | The showcase: two equal instrument cards (whole card opens the instrument's site). The page opens on FLOATING. With a pointer, hover or focus picks an instrument: its summary shows below and the stage turns to its world (the choice stays). On phones, touch screens and windows up to 960px the cards swipe sideways, each with its own summary, and a pager names them; the stage follows the swipe. Downloads table; support and contact |
| `assets/css/site.css` | Single stylesheet. Behind the cards, the two worlds lie side by side on one strip twice the stage's width: FLOATING's black and ember, graphite between, KONSOLL's light stone and module colours. In FLOATING's world KONSOLL's light shows at the right edge; choosing KONSOLL slides the strip across (`--p`, a transform only, so the gradient is painted once) and the hero copy takes the dark ink. Pools drift on wide screens with a pointer and stay still on phones, where blur and blend are left out too. Cards and summaries are drawn in their own instrument's palette; downloads and contact sit on a graphite floor |
| `assets/fonts/` | Geist Mono and Share Tech Mono as WOFF2 (TTF kept as fallback), SIL OFL, licences included |
| `assets/img/` | Interface renders: FLOATING from `floating-site`, KONSOLL from `Konsoll_DSPTests --render-promo <file> [preset]` (2x, footer cropped so no version is pictured) |

Static HTML and CSS, no build step, nothing from a CDN. One call goes to `api.github.com` for FLOATING's latest release tag; the markup carries the fallback.

## Rules

- **Each instrument keeps its own site and releases.** FLOATING: `floamusic/floating-site` at `/floating-site/` — its `updates.html` URL is baked into shipped plug-ins and must never move. KONSOLL: `floamusic/konsoll-site` at `/konsoll-site/` (to be created). This repo only links to them.
- KONSOLL downloads are **SOON** placeholders until `konsoll-site` has its first release (`v0.9.0`). Then the KONSOLL card's Download and the downloads table point at `https://github.com/floamusic/konsoll-site/releases/latest/download/Konsoll-macOS-latest.pkg` and its install guide.
- No version numbers inside screenshots; refresh renders rather than editing them.
