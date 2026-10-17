# Bounded public startup cache

The installed icon/name splash is rendered by the operating system/browser. CSS
cannot remove that screen. This worker reduces avoidable network waits before
the gallery document can paint; it does not promise a particular device timing.

## Loading and updates

- The exact gallery root, index.html, and known `return=palace` / `mode=halloween`
  navigation variants share one public HTML cache key. The actual browser URL is
  preserved, so theater.js still restores the requested return state.
- Navigation requests current HTML first. With a cached document, a slow network
  falls back after 450 ms; a successful late response refreshes the next visit.
  Network/body-cache work is aborted and bounded at 8 seconds. A successful
  response streams to the page without waiting for cache writes or HTML cache
  reads. Cache reads have their own 150 ms limit before treating storage as a miss.
- An ordinary reload can receive new HTML even while a newer worker is waiting.
  Changed resource URLs unknown to the active worker bypass its cache entirely.
  Bump the `v` query whenever an existing script/style changes.
- No skipWaiting, clients.claim, forced reload, storage clearing, or automatic
  interruption of an open gallery/game. Worker replacement follows the normal
  browser lifecycle when controlled windows close. There is no new update modal.
- Install revalidates only index.html, with no-cache and credentials omitted.
  Other exact public assets enter the cache only when requested and are then
  cache-first within that release. Concurrent identical requests are deduplicated.
  This is a visited-shell cache, not a promise that an unvisited gallery or game
  works offline. Live archive/participant content still requires the network.

## Privacy and size bounds

Only the generated exact same-origin static asset URLs are cacheable. Admin,
archive/data, town, maze/rigs, APIs, remote images, unknown query strings,
Authorization requests and non-GET requests bypass. Private/no-store/redirected,
failed or oversized responses are never persisted. Query matching never uses
ignoreSearch. No browser storage, participant records or counter protocol changes.

Every asset has a byte limit of its checked-in size plus 10% and 4096 bytes,
capped at 2 MiB; HTML has a 192 KiB limit. The generator rejects more than 90
asset URLs or an aggregate 8 MiB budget. The consolidated gallery currently uses
46 asset URLs plus one HTML key, with a total body ceiling of 4,050,732 bytes.
Headers and browser-managed storage bookkeeping are additional. Only the previous
cache generations for this exact app scope are removed on activation. A waiting
worker may temporarily coexist with the active worker's cache.

## Build and verify

After editing gallery source CSS, regenerate the gallery stylesheet first:

    node halloween-exhibition/preview/scripts/build-gallery-styles.mjs
    node halloween-exhibition/scripts/build-preview-cache.mjs

The second command derives the exact allowlist from index.html and its static
module/CSS/icon dependencies. It excludes build-only files and game/rig modules.
The revision includes the dependency contents and worker implementation, so a
changed file produces a new isolated cache epoch. Do not hand-maintain the map.

    node halloween-exhibition/scripts/build-preview-cache.mjs --check
    node --test halloween-exhibition/preview/tests/pwa*.test.mjs

The VM tests cover warm/cold/offline/slow/server failure, update freshness,
stale-version bypass, all return-query variants, deadlines, storage failures,
streaming before cache completion, duplicate transfers, byte budgets and scope
isolation. They do not replace device-level PWA or browser rendering checks.
