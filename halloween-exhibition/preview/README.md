# Participant yearbook preview

Independent static exhibition. Serve this directory with any static HTTP server, or open the deployed GitHub Pages `halloween-exhibition/preview/` path. No build, backend, account, analytics, or external data service is required. JavaScript is required.

## Data and annual additions

`data/archive.json` separates stable creator IDs from annual entries. Add a creator once to `creators`; append the creator ID to the relevant year's `entries`. Append a new year without replacing earlier years. `plannedSlots` is a count of unknown future places: these do not enter navigation, visits, or completion.

The current 2026 preview has nine supplied members and two planned places. Public profile photographs/illustrations are identified as profile images. Only the host's invitation article is confirmed here; other entries remain `submissionStatus: "pending"`. Do not assign decorative stage art to a participant as submitted work. Names and avatars are not biographies.

Optional entry fields: `image`, `imageAlt`, `message`, `works`, `links`, `tags`. Use an explicit `role: "host"` only for the host. Profile links and public avatar sources are recorded on each creator. The validator rejects duplicate IDs/annual entries and unsafe links.

## Modes and controls

Halloween, ordinary daylight gallery, and an optional Halloween-only horror atmosphere share the same people and records. Horror never restores itself after reload. Previous/next, arrow keys, and ordinary horizontal touch swipes change people. The explicit view control instead lets a touch drag move decorative depth layers; it can be turned off without changing the selected person. A direct searchable roster is always available.

A motion control stops continuous effects. Reduced-motion settings start static. The simulation stops when hidden or while a dialog is open, caps drawing at 30 fps, and limits canvas pixel cost. Three optional light seals form a constellation without gating profiles.

## Local records

Visits and seals are stored only in this browser, independently per year. Completion counts only current real entries. Removed sample IDs are excluded; the old host ID is migrated once. Reset deletes only this year's records. Storage denial falls back to memory for the open session. Mode and pause preferences have separate exhibition-prefixed keys. Nothing clears shared-origin storage.

## Tests

Run `npm test`. Tests cover data validation, nine-versus-two counts, old-sample exclusion, image fallback, search, navigation races, mode/horror transitions, local storage failure, annual seals, and touch-view arbitration. DOM mocks do not establish browser rendering, native focus trapping, or actual-device performance; those require browser review. Dialog close and Escape are supported. Browser Back is not mapped to dialog dismissal.
