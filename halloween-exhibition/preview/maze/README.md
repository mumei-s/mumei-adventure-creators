# The Living Archive: explorable vertical slice

A standalone static WebGL article gallery, intended for `halloween-exhibition/preview/maze/`. No root-site, atelier, INSIGHT, database, authentication, or shared storage integration. Serve this directory over HTTP (`python -m http.server 4173`) and visit the server URL. `npm test` runs the independent model/schema tests; there is no build step.

## What exists

A real first-person world with occluding geometry, branching routes, three geographically separate article collections, collision, a map, keyboard and touch movement, drag-look, and optional ambient motion. Find the brass key in the eastern ordinary-article wing, use it on the northern locked gate, then enter the archive. The gate changes traversability. The western horror wing requires explicit entry consent and has an obvious return-to-entrance control. No audio, jump scares, gore, strobing or forced auto-tour.

The verified host article is exhibited in Halloween 2026. Close its panel to resume at exactly the same location. The direct article/participant list bypasses the game. There are exactly nine supplied public creator records and no additional-person placeholders. Ordinary articles and horror-illustration articles are distinct collections, currently empty because no articles for them have been confirmed. Environmental sculpture is original code-generated scenery, not a participant's submitted artwork.

`data/catalog.json` separates stable `creators` from `articles`; article collection is `normal`, `halloween`, or `horror`. Halloween articles have an annual `year`; normal/horror are evergreen. Append years/articles without overwriting archives. UI text uses textContent and links permit HTTPS only. Public profile portraits are labeled via the participant list, never presumed submitted artworks.

## Technical boundaries

Three.js 0.180.0 from the official npm package is vendored in `vendor/` with its MIT license. No runtime CDN. Geometry is original and large repeated masonry is GPU-instanced. Renderer caps DPR; pause freezes ambient movement, while direct player movement remains available. A lost/unavailable WebGL context switches to a playable top-down map and retains the article list. State is local-only under `halloween-exhibition:labyrinth:v1`, by year; storage failure degrades to current-session memory. Horror entry is never restored automatically.

A basic static prototype is not a complete production game. Actual device frame rate, controls, accessibility, rendering fidelity, and the user's ambitious visual benchmark require live browser review. Native Back does not dismiss a dialog; use Close/Escape.

## Self-submission

No working publish/upload button, login, credential, or database is created. Participant self-submission needs a separate design: authenticate author, validate article URL/category/year, establish consent/licensing, review queue, approve/update/unpublish records, audit history and media handling. This must not connect to existing INSIGHT infrastructure. A private draft form or GitHub-reviewed JSON proposal can precede a new dedicated service, subject to explicit approval.

## Acceptance route

1. From entrance, observe both side branches and northern locked gate.
2. Walk east into the daylight wing; collect key with E / action button.
3. Return to central hall; approach the article frame and open the verified note article.
4. Close panel; verify unchanged position and orientation.
5. Walk north, use key, pass through the physically opened gate into archive.
6. Return west; opt into horror wing and verify separate empty horror collection.
7. Repeat on narrow viewport and touch device; verify no HUD overflow and clear movement/look affordances.
8. Disable WebGL and local storage independently; verify visual/list fallback and no crash.

## If the visual target is still unmet

Handoff this runnable source, catalog, vendor license and tests to the next Work implementation. Preserve the corrected content model and isolated deployment boundary. Replace prototype materials/lighting and procedural props with a single authored environment-art direction, develop genuine horror illustration exhibits only after real submissions, improve touch navigation with a tested analog stick, add browser integration tests and performance budgets, then review recorded traversal against the user's benchmark. Do not claim superiority based on passing logic tests.
