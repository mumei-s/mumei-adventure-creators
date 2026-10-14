/* Public exhibition shell only. No admin, maze, archive data, remote portraits,
 * API requests, unknown query strings, authentication or background activity. */
const SCOPE = new URL('./', self.location.href);
const RELEASE = '20261014-layout1';
const STYLE_RELEASE = '20261014-portrait1';
const DOOR_RELEASE = '20261014-doors1';
const PALACE_RELEASE = '20261014-palace2';
const CACHE = 'mumei-atelier-shell-v8-' + PALACE_RELEASE + ':' + SCOPE.pathname;
const SHELL = [
  'assets/palace/palace-franken.webp', 'assets/palace/palace-zombie.webp', 'assets/palace/palace-bat.webp',
  'palace-entrance.js', 'palace-entrance.css', 'assets/palace/palace-desktop.webp', 'assets/palace/palace-phone.webp', 'assets/palace/gate-desktop.webp', 'assets/palace/gate-phone.webp',
  'index.html', 'theater.js', 'theater.css', 'data-model.js',
  'scene-motion.js', 'scene-motion.css', 'gallery-depth.css',
  'visitor-preferences.js', 'visitor-preferences.css', 'display-mode.js', 'display-mode.css',
  'magical-entrance.css', 'article-doors.css', 'gallery-controls.css', 'slideshow.js', 'pwa.js', 'manifest.webmanifest',
  'assets/atelier-icon.svg', 'assets/atelier-icon-192.png',
  'assets/atelier-icon-512.png', 'assets/atelier-maskable-512.png'
];
// Only exact public asset release queries are cacheable; tokens/other queries bypass.
const PUBLIC_URLS = SHELL.flatMap(path => [new URL(path, SCOPE).href, ...(/\.(?:js|css)$/.test(path) ? [new URL(path + '?v=' + (path === 'palace-entrance.css' ? '20261014-corner1' : ['theater.js','assets/palace/palace-franken.webp', 'assets/palace/palace-zombie.webp', 'assets/palace/palace-bat.webp',
  'palace-entrance.js','palace-entrance.css'].includes(path) ? PALACE_RELEASE : ['data-model.js','article-doors.css'].includes(path) ? DOOR_RELEASE : path === 'gallery-controls.css' ? STYLE_RELEASE : RELEASE), SCOPE).href] : [])]);
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

