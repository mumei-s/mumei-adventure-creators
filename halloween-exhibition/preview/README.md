# Original participant yearbook preview

Independent static exhibition at `halloween-exhibition/preview/`. The original folding-theatre interface, creator navigation, profile detail, searchable roster, and passport are retained. CSS perspective, vaulted scenery, layered glass, polished floor, moving light ribbons and lanterns provide decorative depth. No WebGL is required here.

## Content boundaries

`data/archive.json` contains nine verified public creator profiles. Profile avatars are not submitted works. There are no planned slots or invented participants.

- Halloween reads the selected year's `years[].entries`. Only the owner's confirmed invitation article `n52be511ec082` is currently available; the other eight entries remain preparation labels and profile links.
- Normal mode reads `evergreenEntries`, independent of year. This collection is currently empty. Nine creator profiles remain browsable, with neutral preparation labels. Halloween article images, titles, messages, and article links are never reused as normal content.
- New actual normal submissions belong in `evergreenEntries`; new Halloween submissions belong in the specified year's entries. The validator checks creator identity, duplicate entries, and field structure.

## Separate horror room

Only Halloween displays the hinged-door entrance at `./maze/?return=theatre`. There is no inline horror lighting mode. The separate room returns to `../?mode=halloween`. The original display restores its selected creator, year, and roster search from its own prefixed session storage. The explicit return mode overrides a stored normal preference once; the return query is removed afterward. Storage restrictions degrade safely; restoration across navigation cannot be guaranteed when browser storage is unavailable.

## Interaction and accessibility

Previous/next, arrow keys, and horizontal touch swipes navigate. Roster selection jumps directly. The explicit view control reserves touch dragging for decorative depth; default swipe navigation remains available. Three optional collectible lights are distributed across the real roster and never gate profile access. Finishing their constellation illuminates the surrounding architecture.

Motion pause stops ambient effects and cancels finite entrance effects safely. Reduced-motion starts static. Hidden tabs and open dialogs pause rendering. Drawing is capped at 30 fps and 2.2 million canvas pixels. All decorative layers ignore pointer input. No account setup, analytics, submission form, shared service, or authentication implementation is included.

## Local records

Halloween visits and light seals are scoped per year. Normal visits and seals use the evergreen collection. Reset affects only the current collection. Old sample IDs are filtered from completion; legacy host IDs are migrated. Only exhibition-prefixed storage keys are used; storage denial falls back to session memory.

## Verification

Run `npm test`. Node tests cover real identities, safe URLs, content separation, missing images, search, navigation races, reduced-motion, pause, touch-view arbitration, separate-room link visibility and return-state restoration. DOM mocks do not prove browser layout, native focus trapping, performance, or artistic quality. Live browser QA at 400px and desktop remains a separate gate.
