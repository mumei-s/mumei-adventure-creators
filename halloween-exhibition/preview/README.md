# Original participant yearbook preview

Independent static exhibition at `halloween-exhibition/preview/`. The original folding-theatre interface, creator navigation, profile detail, searchable roster, and passport are retained. CSS perspective, vaulted scenery, layered glass, polished floor, moving light ribbons and lanterns provide decorative depth. No WebGL is required here.

## Content boundaries

`data/archive.json` contains nine verified public creator profiles. Profile avatars are not submitted works. There are no planned slots or invented participants.

- Halloween reads the selected year's `years[].entries`. Only the owner's confirmed invitation article `n52be511ec082` is currently available; the other eight entries remain preparation labels and profile links.
- Normal mode reads `evergreenEntries`, independent of year. This collection is currently empty. Nine creator profiles remain browsable, with neutral preparation labels. Halloween article images, titles, messages, and article links are never reused as normal content.
- New actual normal submissions belong in `evergreenEntries`; new Halloween submissions belong in the specified year's entries. The validator checks creator identity, duplicate entries, and field structure.

## Separate Halloween adventure room

Only Halloween displays the hinged-door entrance at `./maze/?return=theatre`. There is no inline horror lighting mode. The separate room returns to `../?mode=halloween`. The original display restores its selected creator, year, and roster search from its own prefixed session storage. The explicit return mode overrides a stored normal preference once; the return query is removed afterward. Storage restrictions degrade safely; restoration across navigation cannot be guaranteed when browser storage is unavailable.

## Interaction and accessibility

Previous/next, arrow keys, and horizontal touch swipes navigate. Roster selection jumps directly. Touch gestures use only the ordinary horizontal-swipe navigation. The previous view/reset toggle has been removed. Three optional collectible lights are distributed across the real roster and never gate profile access. Finishing their constellation illuminates the surrounding architecture.

Motion pause stops ambient effects and cancels finite entrance effects safely. Reduced-motion starts static. Hidden tabs and open dialogs pause rendering. Drawing is capped at 30 fps and 2.2 million canvas pixels. All decorative layers ignore pointer input. No account setup, analytics, submission form, shared service, or authentication implementation is included.

## Local records

Halloween visits and optional light seals are scoped per year. Normal mode keeps only genuine viewed-creator history from the evergreen collection; light controls and completion effects are hidden and cannot collect. Reset affects only the current collection. Old sample IDs are filtered from completion; legacy host IDs are migrated. Only exhibition-prefixed storage keys are used; storage denial falls back to session memory.

## Verification

Run `npm test`. Node tests cover real identities, safe URLs, content separation, missing images, search, navigation races, reduced motion, pause, swipe navigation, separate-room link visibility, return-state restoration and slideshow timing/cancellation. DOM mocks do not prove browser layout, native focus trapping, performance, or artistic quality. Live browser QA at 400px and desktop remains a separate gate.

## Visitor brightness and music

The settings control mounts `visitor-preferences.js`. Brightness (75–175%) affects scenic surfaces, leaving reading and navigation unchanged; volume (0–100%) and brightness use the exhibition-only `halloween-exhibition:visitor-preferences:v1` key. The separate room can mount the same controls inside its existing dialog via `initVisitorPreferences({container,onBrightness,legacyBrightness})`.

Music is an original local WebAudio four-chord ambient pad with no recording or network dependency. It starts only after the visitor presses ON, is always OFF on a new page, and stops on tab hiding/page exit without auto-resuming. Volume zero mutes. Playback preference is never persisted. Audio availability errors and denied storage show readable status. Automated audio tests use a mock AudioContext; audible quality and real browser playback require separate browser QA.

## Owner-managed visibility and ordering

Canonical metadata is `visible: false` and numeric `order`, on entries and on individual `links`/`works`. Sorting is stable, using array position when order is absent. Hiding an entry removes its submitted image, title, message, tags and article links, but keeps the verified creator as a profile-only introduction. It does not remove membership. Individually hidden links/works are absent from both display and search. Multiple visible links/works remain available; no single-article truncation is applied.


## Magical entrance, roulette, and sharing card

Halloween now uses the requested title, “無名S note / 🎃Halloween Atelier / 魔法の入口🚪”. The existing folding theatre gains gold-edged hinged doors, a soft creator entrance, floating original ghost/pumpkin ornaments, and a “運命のとびら” roulette. These ornaments and roulette are absent in normal mode. Ordinary submitted titles now appear on the stage, in the detail and in the roster; unsubmitted/hidden entries remain profile-only.

The roulette selects only an existing non-fictional creator with a safe public profile or visible work link in the current collection. It does not fabricate submissions, open tabs, or count a visit automatically. Pressing it again, navigating, switching modes/years, opening a dialog, hiding the tab, or pausing motion cancels it. Reduced motion skips the reel and door animation. Decorative layers never intercept input. On narrow screens, the portrait strip scrolls horizontally with 44px-wide targets.

`assets/atelier-og.svg` is an original vector illustration, rendered to the crawler-facing `assets/atelier-og.png` (1200×630). The HTML uses absolute HTTPS PNG metadata and the exact requested textual title. It does not use the supplied external reference's art or code.

## Optional PWA installation

`manifest.webmanifest`, original 192px/512px/maskable icons, and `pwa.js` provide optional installation. The “アプリ” control shows browser-specific guidance; a native install button appears only after a supported browser supplies `beforeinstallprompt`. No prompt is promised on every browser, and native prompting requires a visitor click. No push permission, sign-in, analytics, background sync or music autoplay is added.

The `sw.js` scope is exactly this `halloween-exhibition/preview/` directory. Both registration and worker execution refuse a copied root/other-app location. Registration checks all overlapping workers and leaves any different application alone. It never unregisters workers, calls `skipWaiting`, or claims existing clients.

Only an explicit list of public shell files is precached. Fetch handling is network-first and limited to those exact URLs. The one release query `?v=20261014-layout1` is allowed only for explicitly listed public JS/CSS; all other queries bypass. The public `data/archive.json` stays network-only so current visibility and order are not served from an old offline cache. Admin, private drafts, maze, external images/links, APIs, root and INSIGHT are never cached or intercepted. Offline/latest-content limitations are explained in the install guide and load-error UI. Old cache deletion is restricted to this application's cache prefix and exact scope. This is an installable online-first gallery, not an offline article archive.

Tests cover the title, ordinary submitted-title display, valid roulette destinations and cancellation races, reduced motion, manifest/image dimensions, local shell paths, scope guards, worker conflicts, network-first caching, forbidden-path bypass, and user-triggered install prompting. Real browser installation, native focus handling, mobile layout and artistic motion still require browser QA; the lightweight tests do not prove them.



## Clear controls and responsive document flow

The header now uses two named grid areas for navigation and actions. The Halloween doorway and mode switch are in normal flow, and all action buttons wrap within their own area. The stage caption and footer are also in flow, so additional text height pushes following content downward rather than covering another control. The old forced 800px mobile page and absolute-coordinate collision fixes are overridden by `gallery-controls.css`. Narrow screens or enlarged text may scroll naturally; controls remain available. Verify 320px, 333px, 400px and desktop sizes, plus browser-supported text enlargement, in real-browser QA.

The redundant “参加者をひらく” CTA is removed; tapping a creator image opens the same real detail. The confusing “視点 / 戻す” toggle is removed. The useful ambient pause is under Settings with explicit “演出を止める / 演出を動かす” labels. Normal mode's viewing history lists only creators whose detail the visitor actually opened, and each history item can return to that creator. It has no light currency or completion target.

Halloween has warmer orange/copper highlights and framed participant cards with a short, staggered entrance, visible real names and profile/content labels. Card motion stops for reduced motion or an explicit ambient pause. Decorative borders never replace submitted works or portraits.

## Explicit, optional creator slideshow

`slideshow.js` is a DOM-independent controller. The visible “自動送り OFF / ON” button controls it; speed is explicitly labelled as 5, 10 or 20 seconds. Every new page starts OFF. Only speed is saved, under `halloween-exhibition:preview:slideshow:v1`; enabled state is never restored. Storage denial keeps the current-page controls usable.

The slideshow blocks while loading, in a collection with fewer than two creators, with a dialog open, in hidden tabs, during roulette, while ambient effects are paused, or when reduced motion is requested. Resume waits a complete interval. Manual navigation invalidates any pending automatic transition and resets timing; stale async completions cannot overwrite a newer choice. The controller never opens external links or counts a viewed profile. Page exit turns it OFF, while returning through browser history still leaves the controls usable.

The service worker remains strictly scoped to this preview. Its v3 release-versioned public-shell allowlist includes `slideshow.js`, `gallery-controls.css` and the shared display module/styles; archive/admin/maze/private/remote data still bypass cache handling. The exact title, original profile archive, ordinary article isolation, OG asset and visitor brightness/music behavior remain intact.

## Display size and iPhone/iPad Home Screen

The visitor Settings now includes Auto / スマホ / タブレット / PC. `display-mode.js` uses the separate `halloween-exhibition:preview:layout:v1` key, shared by the gallery, adventure room and editor presentation only. Auto resolves at 680px and 1100px; manual choices change composition and maximum content width (520 / 1000 / 1440px). They do not spoof a device, modify viewport scale, disable zoom, change content collection or touch editor drafts. At small widths every choice still wraps and scrolls. The preference can be changed even if storage is denied, and Auto restores viewport-based behavior. The init function is inert outside `/halloween-exhibition/preview/`.

The gallery's Home Screen help now gives the current Safari steps for iPhone and iPad, with official Apple links. `apple-touch-icon`, standalone metadata, `viewport-fit=cover`, safe-area padding and bounded scrollable dialogs are provided. On supported Apple versions: open Safari, Share (sometimes through the page menu), Add to Home Screen, enable Open as Web App if shown, then Add. Menu names vary by OS and layout. A native install button appears only after the browser actually supplies its install event. No notification, account or background-sync permission is requested.

Official references checked 2026-10-14:
- https://support.apple.com/guide/iphone/iphea86e5236/ios
- https://support.apple.com/guide/ipad/open-as-web-app-ipad8f1f7a29/ipados

Node tests cover mode validation, viewport boundaries, manual overrides, shared scoped storage, denial/malformed fallback, DOM controls, resize/storage updates, iPhone/iPad guidance and standalone/unsupported states. They do not prove installation on a real iPhone/iPad. Native device installation and visual checks at 320/400/768/1024/1440px, including landscape and enlarged text, remain manual acceptance checks.

The separate entrance is labeled `Halloween冒険室`. Its genre-unrestricted `物語の書庫` is edited as `冒険室の書庫`; the internal `horror` collection ID and `catalog.json` remain compatible. No article content or migration is included in this presentation update.


## Roster pages and complete portraits

The participant list paginates the filtered real result set in groups of five. Nine creators are 5 + 4; the current eight pending creators are 5 + 3. The range, page count and previous/next buttons describe the current filter. Search, tags, year and normal/Halloween mode changes reset to page one. Reopening the roster after selecting a creator preserves the current page; restored pages are clamped to available results. Both buttons are native keyboard controls with 44px targets.

Portraits use `object-fit: contain` within proportional insets, replacing the legacy fixed-width image that overflowed the narrower ornamental door. Images are not cropped or covered by a half-door. The card surface is warmer orange only in Halloween mode.

All current main/editor JS/CSS entry URLs and local module imports carry the same `20261014-layout1` release query. This ensures a prior controlled page bypasses stale unversioned modules while the new v3 worker waits normally; it does not call skipWaiting, clients.claim, unregister, clear storage or delete other apps’ caches. The new worker precaches only exact public shell URLs and their known release variants. Archive/editor/maze data remains network-only. Manual slideshow navigation keeps ON selected and restarts the full chosen interval; this is stated in the live control hint.
