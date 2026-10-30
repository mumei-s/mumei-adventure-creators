# その人、参加者じゃない。

無名S note Halloween Atelier: 4 reading chapters and 3 optional street scenes.

## Scope
All new runtime files live under `halloween-exhibition/preview/horror-night/`. Original town, exhibition, other projects, deployment settings and existing saves are unchanged. The controller reads the approved town modules and character assets but writes only `mumei.halloween.reading-night.2026.v1` in localStorage. No backend or paid service is added.

## Routes
- `./` — reading and optional exploration, resumes device progress.
- `./?chapter=0` — start reading from chapter one.
- `./?scene=1`, `./?scene=2`, `./?scene=3` — enter each street scene directly.
- `./reading.html` — full text without JavaScript.
- Optional `return` query accepts only https://note.com/ss_yr/n/... and adds a manual return link. No claim is made about restoring scroll position in the note app.

## Presentation
First scene: familiar square and a masked intruder. Second: fewer people and darker street. Third: original participant sprites near the gate and a duplicate of the approved owner sprite. Scene completion opens a short event and the next prose chapter. Movement can be manual or guided by a four-neighbour route. Skipping exploration never blocks reading. Sound starts off. Reduced motion is respected. No sudden loud audio or flashing is used.

The supplied original horror illustration is optimized to 640-pixel AVIF for the final visual. Images that cannot decode fall back to an explicit mask silhouette; reading remains available.

## Verification
`npm test` — 18 passing tests as of 2026-10-31: state/path tests and UI controller tests using a minimal DOM and town-engine stub. All new JavaScript files pass `node --check`.

These are NOT browser rendering tests. No Chromium executable is available in the authoring container, so actual 3D/2D rendering, Android/iOS operation, image loading, frame rate and navigation in the note app remain unverified. Do not report those as tested or finished. Narrative illustrations and manga beyond the supplied mask art have not been added.

## Deployment
Existing Pages staging recursively includes HTML/CSS/JS/AVIF under this directory. Runtime files deliberately use `.js`; `.mjs` is excluded by the existing staging script. Tests, package metadata and this README are excluded from the public site. The route becomes public only after an additive merge to the publishing branch and a successful existing Pages workflow.
