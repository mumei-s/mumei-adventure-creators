/* Public exhibition shell only. No admin, maze, archive data, remote portraits,
 * API requests, query-bearing files, authentication or background activity. */
const SCOPE = new URL('./', self.location.href);
const CACHE = 'mumei-atelier-shell-v2:' + SCOPE.pathname;
const SHELL = [
  'index.html', 'theater.js', 'theater.css', 'data-model.js',
  'scene-motion.js', 'scene-motion.css', 'gallery-depth.css',
  'visitor-preferences.js', 'visitor-preferences.css',
  'magical-entrance.css', 'gallery-controls.css', 'slideshow.js', 'pwa.js', 'manifest.webmanifest',
  'assets/atelier-icon.svg', 'assets/atelier-icon-192.png',
  'assets/atelier-icon-512.png', 'assets/atelier-maskable-512.png'
];
const ALLOWED = new Set(SHELL.map(path => new URL(path, SCOPE).href));
const inPreview = SCOPE.pathname.endsWith('/halloween-exhibition/preview/');
self.addEventListener('install', event => {
  if (!inPreview) return;
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new Request(new URL(path, SCOPE), { cache: 'reload', credentials: 'omit' })))));
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
  if (url.search || !ALLOWED.has(url.href)) return;
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

