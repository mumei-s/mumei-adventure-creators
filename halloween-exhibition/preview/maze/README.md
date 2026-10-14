# The Haunted Annex: separate horror room

This directory is ONLY the horror-room maze. Ordinary and Halloween exhibitions remain the original non-maze yearbook at `../`. Its Halloween-only door links to `./maze/?return=theatre`; this room returns to `../?mode=halloween`. The parent exhibition owns restoration of its selected creator/year/search state. The maze never writes the parent's storage.

For deployment place this directory at `preview/maze/`, beside the shared `preview/visitor-preferences.js` and `.css`. Serve the assembled preview parent with `python -m http.server 4173`; open `/maze/`. Run `npm test` in the maze source directory. No build step or runtime CDN. Three.js 0.180.0 (official npm, MIT) is vendored with its license.

## Implemented
- Real occluding geometry, movement/collision, keys and a physically opening gate, inner portrait corridor, floating-folio environmental installation.
- WASD/arrows, touch movement buttons, drag-look, minimap/direct list, stable position while article dialogs open.
- Shared visitor brightness range 75–175%, default 100% (legacy preference migrates when no shared setting exists); useful baseline architectural lighting remains with the handheld lantern off. Lantern ON/OFF controls both its camera-held model and real spotlight.
- Four fictional environmental spirits, optional encounters OFF initially and after reload, gentle proximity reveal, no audio, flashing, blocking exits or creator likenesses.
- Motion pause/reduced-motion, hidden-page pause, bounded renderer DPR, visual top-down fallback if WebGL is unavailable.

Nine supplied public identities remain in the participant list. This room's collection is `horror` only, with no confirmed horror articles yet. Empty frames are explicitly environmental placeholders. The owner's Halloween invitation is not a horror article and is not displayed here. The old unused image asset is retained only as historical source material, never referenced by this room's current catalog. There are no extra-person placeholders.

## Local state and boundaries
Maze progress uses `halloween-exhibition:labyrinth:v1`; lantern preference uses `halloween-exhibition:horror-light:v1`. Brightness and music volume share `halloween-exhibition:visitor-preferences:v1` with the original exhibition. Original procedural ambient music starts only on an explicit user gesture, stops when the page is hidden, and never resumes automatically. Playback state is not persisted. Creature consent is never persisted. Storage failure degrades to session memory. Only `halloween-exhibition/preview/maze/` is modified by this task; existing atelier, INSIGHT, site root and original exhibition are separate.

Article additions are managed manually by the owner through the dedicated local-draft editor at `../admin/`, exporting catalog JSON for manual publication. Article `visible:false` is excluded from both list and frame selection; numeric `order` sorts stably. Multiple articles per creator remain independent records. Hidden records are still public JSON, not private data. Participant self-submission and authentication are out of scope. No database, credentials, authentication, upload/publish backend or connection to INSIGHT exists. Future horror articles must be confirmed actual submissions with title, creator ID, HTTPS URL and permitted image; don't fill unknown work with profiles or invented biographies.

## Verification limits
Model/data/lighting tests do not prove visual quality or actual-device performance. The earlier cloud-browser review disabled WebGL and could only verify the fallback key/gate route, dialog return, navigation and 400×606 CSS-pixel layout. New lantern/brightness/creature rendering requires an actual permitted WebGL-capable browser. Never describe source implementation as rendered verification.
