/* Public exhibition shell only. No admin, maze, archive data, remote portraits,
 * API requests, unknown query strings, authentication or background activity. */
const SCOPE = new URL('./', self.location.href);
const RELEASE = '20261014-layout1';
const STYLE_RELEASE = '20261014-portrait1';
const DOOR_RELEASE = '20261014-doors1';
const PALACE_RELEASE = '20261014-palace2';
const CONTROL_RELEASE = '20261015-controls1';
const COLOR_RELEASE = '20261015-festival1';
const SETTINGS_RELEASE = '20261015-settings2';
const DOORSTAGE_RELEASE = '20261015-reveal1';
const MAGAZINE_RELEASE = '20261015-finale1';
const HOST_RELEASE = '20261015-host3';
const CACHE = 'mumei-atelier-shell-v35-castle2-' + PALACE_RELEASE + ':' + SCOPE.pathname;
const SHELL = [
  'compact-gallery-header.css',
  'presentation-profiles.css',
  'phone-layout.css',
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
  'index.html', 'theater.js', 'theater.css', 'data-model.js',
  'scene-motion.js', 'scene-motion.css', 'gallery-depth.css',
  'visitor-preferences.js', 'visitor-preferences.css', 'display-mode.js', 'display-mode.css',
  'magical-entrance.css', 'article-doors.css', 'gallery-controls.css', 'slideshow.js', 'pwa.js', 'manifest.webmanifest',
  'assets/atelier-icon.svg', 'assets/atelier-icon-192.png',
  'assets/atelier-icon-512.png', 'assets/atelier-maskable-512.png'
];
// Only exact public asset release queries are cacheable; tokens/other queries bypass.
const PUBLIC_URLS = SHELL.flatMap(path => [new URL(path, SCOPE).href, ...(/\.(?:js|css)$/.test(path) ? [new URL(path + '?v=' + (['castle-counter-bootstrap.js', 'castle-visit-counter.js', 'castle-visit-counter.css', 'presentation-profiles.css', 'compact-gallery-header.css'].includes(path)?'20261017-castle2':['presentation-profiles.css','palace-startup.js','theater.js'].includes(path)?'20261017-readable1':path==='phone-layout.css'?'20261017-phone1':path==='castle-visit-counter.css'?'20261017-compact1':['transition-effects.js','transition-effects.css','palace-living-scene.js','palace-living-scene.css','palace-startup.js','palace-entrance.css','safe-navigation.css','theater.js'].includes(path)?'20261016-living1':['theater.js','viewport.js','ios-viewport.css','gallery-gesture.js','visitor-preferences.js'].includes(path)?'20261016-ios1':['theater.js','fate-roulette.css','gallery-refinement.css','app-exit.js','safe-navigation.css'].includes(path)?'20261016-fate1':['castle-counter-bootstrap.js','castle-visit-counter.js','castle-visit-counter.css'].includes(path)?'20261016-visits1':['theater.js','gallery-refinement.css','door-reveal.css','festival-scene.js','app-exit.js','safe-navigation.css','scene-motion.js'].includes(path)?'20261015-glamour1':path==='door-reveal-clock.js'?'20261015-playful1':['theater.js','visitor-preferences.js','gallery-refinement.css','safe-navigation.css'].includes(path)?'20261015-return1':['theater.js','gallery-refinement.css','visitor-preferences.js','festival-scene.js','scene-motion.js','scene-motion.css'].includes(path)?'20261015-music-garden1':['magical-loading.css','theater.js','palace-startup.js'].includes(path)?'20261015-interior1':path==='magical-loading.js'?'20261015-journey1':path==='palace-entrance.css'?'20261015-startup2':['palace-startup.js','theater.js','pwa.js'].includes(path) ? '20261015-startup1' : path==='host-celebration.css' ? HOST_RELEASE : path==='gallery-refinement.css' ? MAGAZINE_RELEASE : ['theater.js','door-reveal.css'].includes(path) ? DOORSTAGE_RELEASE : ['visitor-preferences.js','visitor-preferences.css'].includes(path) ? SETTINGS_RELEASE : ['gallery-refinement.css','door-palette.js','slideshow.js'].includes(path) ? COLOR_RELEASE : path==='gallery-gesture.js' ? CONTROL_RELEASE : path === 'palace-entrance.css' ? '20261014-corner2' : ['theater.js','assets/palace/palace-franken.webp', 'assets/palace/palace-zombie.webp', 'assets/palace/palace-bat.webp',
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

