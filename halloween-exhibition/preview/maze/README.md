# The Haunted Annex: separate horror room

This directory is ONLY the horror-room maze. Ordinary and Halloween exhibitions remain the non-maze yearbook at `../`. Its Halloween-only door enters `./maze/?return=theatre`; every exit here returns to `../?mode=halloween`. The parent owns restoration of its selected creator/year/search state. This room never writes those preferences.

## Run

Serve the assembled `preview/` directory with a local static server and open `/maze/`. Run `npm test` in this directory. There is no build or runtime CDN. Three.js 0.180.0 (official npm, MIT) is vendored with its license. Keep the existing `assets/`, `data/catalog.json`, and sibling `visitor-preferences.js`/`.css` when assembling the site.

## Exploration and comfort

- Explicit, always-available **2D・酔いにくい / 3D** buttons. 2D works independently of WebGL, including movement, collisions, keys, gate, inner-corridor consent, article dialogs and battles. Switching preserves position, keys and current-session battle rewards. The 2D map is fixed top-down with no camera rotation or bob.
- 3D uses WASD to move, left/right arrows or drag to look. 2D uses WASD or all four arrows for cardinal movement. Touch buttons work in both. E inspects, B begins a nearby optional duel, L toggles the lantern, and Escape closes dialogs or returns to the room entrance.
- System reduced-motion defaults to 2D when no display choice is saved; all ambient animation is suppressed while reduced-motion is active, including in explicitly selected 3D. The scene camera never bobs. The “演出停止” button stops decorative animation, not movement.
- A dark violet night baseline, warm localized handheld spot/near light, jack-o’-lanterns and quiet cobweb scenery replace the former broad pale lighting. Lantern OFF removes both light sources and its visible model. Architectural markers, readable controls and the minimap remain available. Brightness still uses the shared visitor range of 75–175%; it never dims UI text or controls.
- When WebGL creation/context fails, the same playable 2D mode takes over. Visibility and blur clear held input. Dialogs freeze walking; leaving an article resumes in the same position.

## Optional lantern duels

The visible “🎃 モンスターと遊ぶ” control introduces three **fictional stage characters**, a pumpkin guardian near the entrance, a book-loving ghost in the key chamber, and a bat in the unlocked archive. They have authored geometry in 3D and map icons in 2D; no participant portrait or submitted artwork is used as a monster.

Encounters default OFF on every load. “入口のカボチャに会う” enables them and returns to the entrance. Approach a character, then press its clearly labeled nearby battle button or B. Nothing starts by proximity alone.

Duels are untimed, turn-based, non-gory and silent. “光を当てる” (1) reduces mischief; “ランタンを守る” (2) prevents the next prank and doubles the next light. Intent, courage and mischief are displayed in text. Three ordinary light actions win; guarding offers a gentler alternative. Escape/Close/“逃げて探索に戻る” exits immediately with no penalty. Results offer retry, and the monster menu resets only duel progress. Battles never gate keys, articles or exits and never modify catalog data. Candy marks are local session rewards only, with no payments, score upload or real-world value.

## Content and state boundaries

Nine supplied public identities remain in the participant list. This room's collection is `horror` only and currently contains **zero confirmed articles**. Empty frames are labeled environmental placeholders. The owner's Halloween invitation is not a horror article. Historical unused assets are retained, not displayed as horror submissions.

Maze keys use `halloween-exhibition:labyrinth:v1`; lantern preference uses `halloween-exhibition:horror-light:v1`; the optional display preference uses `halloween-exhibition:horror-view:v1`. Brightness/volume share `halloween-exhibition:visitor-preferences:v1` with the exhibition. No encounter consent or duel progress is persisted. Storage errors degrade to session memory. Music starts only from the shared setting's explicit ON gesture, stops on hidden pages, and never auto-resumes.

Article additions remain owner-managed through the existing separate `../admin/` local-draft editor and its manual export/publication flow. `visible:false` hides a record from lists and frames; numeric order sorts stably. Hidden JSON records are still public, not private. No database, authentication, uploads, self-submission, extra participant slots, or unrelated service is added here.

## Verification

Current assembled-source checks: 32/32 model/static tests and the offline controller simulation pass. Existing portrait assets are present and the original asset-existence check passes. These are not browser interaction tests. The new Canvas illustration has additionally been rendered and visually inspected with native Canvas; see the update below for the exact scope and remaining browser checks. Earlier local Chromium launch was blocked by the execution environment; no unsupported retry or rendered 3D claim is made.

## Illustrated 2D gameplay stage (October 14 update)

2D now has a dedicated layout and close-up Canvas renderer (`stage-2d.css` / `stage-2d.js`). It is a full-width, player-led illustrated game viewport, separate from the overview map. A lantern keeper replaces the position triangle; stone masonry, drapery, bookshelves, patterned rugs, lunar inlays, plants, candles, pumpkins, a key pedestal, doors and fictional creatures are all authored geometry. No external images or participant likenesses are used. The overview stays available in the menu.

On 400×606 the layout reserves 400×344 for the game (56.8% of viewport area); on 390×844 it reserves 390×582 (69.0%). These are CSS grid targets, not measurements from a browser. The top HUD totals 134 px; the bottom touch dock/status totals 128 px. Controls are at least 44 px and remain outside the stage. The compact menu retains articles, overview, brightness/music, monsters, entrance reset, animation control and Halloween return. The drawn exit at the south of the hall opens a return confirmation dialog when inspected.

The view moves only as the player moves, with no camera easing, rotation, shake, bob, autonomous drift or animated sprite loops. Reduced-motion is honored. Static 2D frames are cached until position, size, lighting or game state changes. The lantern veil affects scene pixels only; controls and edge wayfinding stay readable. Mode switching retains the same keys, gates, positions, article navigation and optional turn-based duels.

Validation for this update: 32/32 model/static tests pass against the assembled source, including unchanged portrait assets. Controller simulation covers movement, modes, duels, reset, key/gate and dialogs. The actual Canvas renderer was rasterized with native Canvas at both phone-stage dimensions, plus lantern OFF, the key room and the library, and its pixels were visually reviewed. This validates illustration output, not HTML/CSS layout or browser input. No new local Chromium attempt was made after the earlier known execution restriction. Permitted browser verification of exact HUD bounds, 44 px hit targets, short-screen modal scrolling and gameplay remains required. No 3D rendered verification is claimed.
