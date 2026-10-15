# Halloween冒険室 / The Lantern Archive

A game-first adventure annex, entered from the Halloween yearbook door. All exits return to `../?mode=halloween`. The normal/Halloween yearbook remains independent and owns its creator/year/search restoration. This room never writes those preferences.

## Run and assemble

Serve the assembled `halloween-exhibition/preview/` directory and open `maze/`. Run `npm test` here. No build, runtime CDN or service-worker registration is required. Keep the existing data, portraits and vendored Three.js/license. The sibling `visitor-preferences.js`/`.css` and `display-mode.js`/`.css` are shared dependencies, supplied by the parent exhibition. JS/CSS release URLs use `?v=20261014-adventure2` consistently.

## Play

- Choose **2D・酔いにくい** or **3D** at any time. Both preserve position, keys, gates, articles and current-session duel rewards. If WebGL is unavailable, 2D remains playable.
- In 2D, WASD/arrows move north/south/east/west. In 3D, WASD moves, left/right arrows or drag turn. Touch movement buttons work in both. E inspects, B begins an optional nearby duel, L toggles the lantern. Escape closes dialogs; outside a dialog it returns to the entrance.
- Find the key in the east chamber, unlock the north gate and enter the archive. The west portrait corridor still has a voluntary entry dialog. Open articles directly from the menu without completing the game.
- **モンスターと遊ぶ** introduces six original fictional creatures. Residents are visible from the start of each visit, roaming slowly without aggression. They can be hidden temporarily in the guide. “入口のカボチャに会う” enables them and returns to the entrance. Approach and choose “話しかける”/B, then explicitly choose “対戦する” or “立ち去る”. Proximity never opens a dialog or starts a battle. The compact “モンスターに出会ったら” panel links to all six room hints; “近くへ案内” brings the player to a nearby safe point without unlocking any door.
- Duels are untimed, turn-based, non-gory and silent. Light (1) reduces mischief; guard (2) blocks a prank and doubles the next light. Text, meters and scene feedback show the result. Escape/Close exits without penalty. Retry and encounter-only reset are available. Battles never block articles, keys or exits. The new stitched alchemist’s golem alternates footsteps, a harmless wind-up and a gentle clap. The slow stitched zombie alternates a harmless step and a stronger prank; the vampire count opens with a cloak prank, then gives gentler bows. Their named next actions are displayed before each turn.

## Original 2D RPG presentation

Thirteen locally bundled original WebP images total **1,454,424 bytes**. The raster environment combines slate floors, painted floor inlay, shelves, moon windows, lantern columns and pumpkins with existing architectural geometry. The hero uses a normalized four-direction/four-frame atlas with a shared foot anchor. Its limited hand-painted walk cycle has similar second/fourth poses; this is not a commercial-animation parity claim. Ground shadows and foot-depth sorting place characters behind foreground walls and shelves. Two freestanding shelf bases have compact physical collisions; all interaction routes remain traversable.

The camera follows walking with gentle translation only. Room-edge bounds keep the full hero and nearby architecture onscreen rather than exposing large blank areas. There is no rotation, bob or shake. Reduced-motion or “演出停止” suppresses interpolation and decorative character/particle/effect motion. The handheld lantern uses a local, wall-clipped light veil, while UI and wayfinding stay readable. Lantern OFF and the shared 75–175% brightness range remain usable. A failed artwork load reports a simple-rendering notice rather than silently claiming the full artwork loaded.

The battle scene uses the painted library, actual hero/enemy sprites, local light projectiles, a visible guard shield, small damage text and restrained reaction motion. No full-screen flashes, jump scares or autoplay battle audio are added. Optional music remains controlled by the shared explicit-ON preference.

## Screen layout and accessibility

Both modes now use the same compact frame: the game canvas owns a full-width grid row, independent from the overview map. With zero safe-area inset, the 400×606 layout targets a 400×332 stage (54.8% of the viewport); 390×844 targets 390×570 (67.5%). Touch controls are at least 44 px and sit outside the stage. Safe-area padding reduces the available stage only as needed for a notch/home indicator.

The menu retains library, map, lighting/audio, monsters, entrance reset, motion and return. Shared Auto / Phone / Tablet / PC presentation is available in settings. It changes responsive presentation, not the physical viewport or zoom, and resizes the canvas after changes. Manual PC on a phone still wraps within the viewport. iOS home-screen metadata and the existing touch icon are included; no maze service worker is registered. Actual iOS installation is not locally verified.

## Library and data boundaries

**物語の書庫 accepts all genres**, including illustrations, stories and essays. The internal `collection:'horror'` identifier remains for backward compatibility only, not as a genre filter. There is no schema migration. The existing article selector filters collection/visibility/order, never genre.

Currently there are **zero confirmed articles**. The modal reports that compactly and separately presents nine real participant profile links. Their avatars are identity portraits, never submitted artwork or monster skins. Empty scene frames remain labeled environmental placeholders. The host invitation is not repurposed as a submission.

Articles remain owner-managed through the separate `../admin/` local-draft export/publication workflow. Hidden JSON records remain public, not private. No database, authentication, upload or self-submission flow is added.

Maze keys use `halloween-exhibition:labyrinth:v1`; lantern uses `halloween-exhibition:horror-light:v1`; 2D/3D uses `halloween-exhibition:horror-view:v1`. Brightness/audio share `halloween-exhibition:visitor-preferences:v1`; device layout shares `halloween-exhibition:preview:layout:v1`. Encounters and duel rewards are session-only. Storage errors degrade to memory. Hidden pages and blur clear held input; dialogs pause exploration.

## Verification and remaining limits

- **65/65** model/static regression tests pass, including animation frames, bounded camera behavior, shelf collisions and full route reachability, all-genre selection, assets, battle effects, cache versioning and layout hooks.
- Offline controller simulation passes movement, both mode choices, explicit encounter entry, guard/light victory, retry/escape/reset, key/gate, all-genre empty library with nine profiles, map/lantern and shared display selection. This is not a browser test.
- The actual Canvas renderer loaded all thirteen WebP assets successfully and rendered 400×332 and 390×570 exploration, east/north chambers, four directions, lantern OFF and attack/guard battle scenes. Those composed pixels were visually reviewed. This proves renderer output, not HTML/CSS layout, browser input or timing.
- New browser checks remain necessary for all four device layouts, modal scrolling, safe areas, movement/occlusion/collision, action feedback and focus. The previous full-stage revision was browser-checked at 400×606; that does not certify this RPG revision.
- Local Chromium was previously restricted; no repeated launch or bypass was attempted. No rendered 3D or actual iOS-install verification is claimed.

See `assets/rpg/README.md` for artwork provenance and exact atlas integration details.

## Centered circular controls and 3D resident presentation

The bottom-center 112 px circular pad supports one captured pointer: dragging between sectors changes direction without lifting; its center is neutral. Release, cancel, lost capture, blur/visibility interruption, dialog open and mode change clear input. Each direction retains a 44 px native button for keyboard focus and Space/Enter holds. In 2D the pad moves cardinally. In 3D left/right turn and up/down move forward/back; WASD strafing, arrow turning and optional drag-look remain available. The prior scoped selection/callout protection is retained; article copy and editable fields remain usable.

All six species have distinct actual 3D content: the original transparent artwork is loaded into grounded, depth-tested sprites, with individual authored mesh fallbacks. Texture crops and boot anchors are shared with 2D. The handheld 3D lantern is smaller. The camera does not auto-spin. Reduced-motion leaves residents stationary and disables decorative animation; battles remain silent and explicitly chosen.

All maze entry CSS and local module URLs now use `20261014-adventure2`; settings display that release. The old screenshot title is absent from current markup. The one legacy collection display name in `data/catalog.json` changes to `冒険室の書庫`; internal `id:'horror'`, creators, articles and all other metadata remain unchanged. Legacy genre-only kind labels are normalized only for display, without rewriting articles.

Native Canvas previews verify the new golem in exploration and battle, with thirteen decoded assets. Model/controller tests verify circular drag, 3D-turn mapping, explicit encounter choices and six-species discovery. These are not rendered WebGL, Android gesture or browser CSS-layout evidence. New browser review remains required for 400×606 and 390×844 control placement and modal flows.


## 2026-10-15: shared library and local clear souvenir

The runtime loads `../data/archive.json` as the canonical participant/name/avatar and Halloween-work source, derived by `library-catalog.js`. It selects the latest year, excludes hidden/pending works, deduplicates participant identities and separates the host introduction. `data/catalog.json` remains schemaVersion 2 solely for administrator-added supplemental library articles; its duplicated legacy identity list is not used to render the public library. Existing admin drafts/exports remain compatible. Supplementary articles retain their own maze-relative asset paths.

A clear requires six distinct resident victories, the unlocked gate and an explicit visit to the vault. Clear progress and a run ID persist in the existing maze namespace; souvenir receipts use a separate local namespace. Reopening/reloading does not increment. Only an explicitly restarted adventure can earn a new receipt after meeting the same conditions. Numbers are browser-local, not global ranks or identity verification. Web Locks serialize simultaneous allocation when supported; no-lock fallback preserves distinct run records but does not promise globally unique or cross-tab-unique numbers. Failed storage produces an explicitly session-only receipt. No server/API/account/automatic image generation is added.

The clear panel offers a creator-ID-assisted status-card prompt (the ID is for public-profile lookup by the user's image-creation chat, never printed as the character name), copy and TXT download. Image creation and posting are optional. The static `clear-gallery/` menu destination labels the supplied card as a sample, not an authenticated clear. Walking speed is 0.5–2x in quarter steps, default 1x, shared by 2D/3D and preserved locally; collision substeps do not alter turning speed.
