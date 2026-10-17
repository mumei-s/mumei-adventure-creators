/* Public exhibition shell only. No admin, maze, archive data, remote portraits,
 * API requests, unknown query strings, authentication or background activity. */
const SCOPE = new URL('./', self.location.href);
const CACHE = 'mumei-atelier-shell-v32-20261017-town1:' + SCOPE.pathname;
const PUBLIC_RELEASES = Object.freeze({
  "transition-effects.js": "20261017-review1",
  "transition-effects.css": "20261016-living1",
  "palace-living-scene.js": "20261017-review1",
  "palace-living-scene.css": "20261016-living1",
  "viewport.js": "20261016-ios1",
  "ios-viewport.css": "20261016-ios1",
  "fate-roulette.css": "20261016-fate1",
  "castle-counter-bootstrap.js": "20261016-visits1",
  "castle-visit-counter.js": "20261016-visits1",
  "castle-visit-counter.css": "20261016-visits1",
  "app-exit.js": "20261016-fate1",
  "safe-navigation.css": "20261016-living1",
  "door-reveal-clock.js": "20261015-playful1",
  "festival-scene.js": "20261015-glamour1",
  "magical-loading.css": "20261015-interior1",
  "magical-loading.js": "20261017-review1",
  "palace-startup.js": "20261017-review1",
  "host-celebration.css": "20261015-host3",
  "door-reveal.css": "20261015-glamour1",
  "gallery-refinement.css": "20261016-fate1",
  "gallery-gesture.js": "20261017-review1",
  "door-palette.js": "20261015-festival1",
  "palace-entrance.js": "20261014-palace2",
  "palace-entrance.css": "20261016-living1",
  "theater.js": "20261017-town1",
  "town-entry.css": "20261017-town1",
  "theater.css": "20261014-layout1",
  "data-model.js": "20261014-doors1",
  "roster-pagination.js": "20261017-review1",
  "scene-motion.js": "20261017-review1",
  "scene-motion.css": "20261015-music-garden1",
  "gallery-depth.css": "20261014-layout1",
  "visitor-preferences.js": "20261016-ios1",
  "visitor-preferences.css": "20261015-settings2",
  "display-mode.js": "20261014-layout1",
  "display-mode.css": "20261014-layout1",
  "magical-entrance.css": "20261014-layout1",
  "article-doors.css": "20261014-doors1",
  "gallery-controls.css": "20261017-review1",
  "slideshow.js": "20261015-festival1",
  "pwa.js": "20261015-startup1"
});
const SHELL = [
  'transition-effects.js', 'transition-effects.css', 'palace-living-scene.js', 'palace-living-scene.css',
  'viewport.js', 'ios-viewport.css',
  'fate-roulette.css',
  'castle-counter-bootstrap.js', 'castle-visit-counter.js', 'castle-visit-counter.css',
  'app-exit.js', 'safe-navigation.css',
  'door-reveal-clock.js', 'festival-scene.js', 'assets/palace/magic-courtyard.webp',
  'assets/palace/host-invitation.webp', 'assets/palace/palace-interior.webp', 'magical-loading.css', 'magical-loading.js', 'palace-startup.js', 'host-celebration.css', 'door-reveal.css',
  'gallery-refinement.css', 'gallery-gesture.js', 'door-palette.js',
  'assets/palace/palace-franken.webp', 'assets/palace/palace-zombie.webp', 'assets/palace/palace-bat.webp',
  'palace-entrance.js', 'palace-entrance.css', 'assets/palace/palace-desktop.webp', 'assets/palace/palace-phone.webp', 'assets/palace/gate-desktop.webp', 'assets/palace/gate-phone.webp',
  'index.html', 'theater.js', 'theater.css', 'town-entry.css', 'data-model.js', 'roster-pagination.js',
  'scene-motion.js', 'scene-motion.css', 'gallery-depth.css',
  'visitor-preferences.js', 'visitor-preferences.css', 'display-mode.js', 'display-mode.css',
  'magical-entrance.css', 'article-doors.css', 'gallery-controls.css', 'slideshow.js', 'pwa.js', 'manifest.webmanifest',
  'assets/atelier-icon.svg', 'assets/atelier-icon-192.png',
  'assets/atelier-icon-512.png', 'assets/atelier-maskable-512.png'
];
// Only exact public asset release queries are cacheable; tokens/other queries bypass.
const PUBLIC_URLS = SHELL.flatMap(path => [new URL(path, SCOPE).href, ...(PUBLIC_RELEASES[path] ? [new URL(path + '?v=' + PUBLIC_RELEASES[path], SCOPE).href] : [])]);
const ALLOWED = new Set(PUBLIC_URLS);
const inPreview = SCOPE.pathname.endsWith('/halloween-exhibition/preview/');
self.addEventListener('install', event => {
  if (!inPreview) return;
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_URLS.map(url => new Request(url, { cache: 'reload', credentials: 'omit' })))));
  // No skipWaiting: an open gallery keeps a coherent version until it is closed.
});
self.addEventListener('activate', event => {
  if (!inPreview) return;
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('mumei-atelier-shell-') && key.endsWith(':' + SCOPE.pathname) && key !== CACHE).map(key => caches.delete(key)))));
  // No clients.claim(): never take over a running admin or another app's page.
});
self.addEventListener('fetch', event => {
  if (!inPreview || event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  // The live public archive stays network-only so hidden/reordered work isn't stale.
  // Every path except the exact shell allowlist (including admin and maze) bypasses.
  if (!ALLOWED.has(url.href)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic' && !response.redirected) {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
        } catch { /* storage denied/full: keep the successful network response */ }
      }
      return response;
    } catch {
      const cached = await caches.match(event.request, { cacheName: CACHE });
      return cached || Response.error();
    }
  })());
});

