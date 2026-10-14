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

`tests/model.test.mjs` retains the existing catalog, assets, route, collision, article, return-context and preference tests. `tests/encounters.test.mjs` adds deterministic duel, consent-boundary, reachable-monster, cardinal movement, mode, lighting-source and UI contract checks. These tests are logic/static evidence, not rendered visual verification.

The development shell's Chromium could not start because local sockets were restricted; its reviewed execution also failed before browser launch. Consequently actual WebGL darkness/lantern appearance, mobile layout and rendered 2D interactions need a permitted browser check before calling the visual work verified. The source-only local restoration also omitted unchanged portrait binaries, so the existing asset-existence test requires the complete assembled repository.

Suggested browser checks: 390×606 and desktop layouts; explicit 3D→2D→3D switches at the same position; lantern ON/OFF at 75/100/175%; key/gate route in 2D; article open/close; all duel actions, Escape, retry and reset; encounters OFF/reload; reduced-motion; forced WebGL failure; context loss; blur while holding a movement key; and the return link restoring Halloween mode in the parent.
