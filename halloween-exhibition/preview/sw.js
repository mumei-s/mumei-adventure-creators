/* Public exhibition shell only. Archive, admin, games, APIs, remote images,
 * credentials and unknown query strings always bypass this worker. */
const SCOPE = new URL('./', self.location.href);
// BEGIN GENERATED SHELL (node halloween-exhibition/scripts/build-preview-cache.mjs)
const SHELL_REVISION = '51ca45ed146c1ec6';
const PUBLIC_ASSETS = [
  ["assets/atelier-door-180.png",56294],
  ["assets/atelier-door-192.png",62766],
  ["assets/atelier-door-512.png",374122],
  ["assets/atelier-door-maskable-512.png",195117],
  ["assets/haunted-branches.svg",4667],
  ["assets/manor-hero.webp",401663],
  ["assets/palace/gate-desktop.webp",267018],
  ["assets/palace/gate-phone.webp",282548],
  ["assets/palace/host-invitation.webp",118886],
  ["assets/palace/magic-courtyard.webp",590102],
  ["assets/palace/palace-bat.webp",67146],
  ["assets/palace/palace-desktop.webp",490143],
  ["assets/palace/palace-franken.webp",95799],
  ["assets/palace/palace-interior.webp",209020],
  ["assets/palace/palace-phone.webp",506183],
  ["assets/panel-magic/book.svg",6094],
  ["assets/panel-magic/branch.svg",4788],
  ["assets/panel-magic/butterfly.svg",4902],
  ["assets/panel-magic/ghost.svg",5094],
  ["assets/panel-magic/lantern.svg",5194],
  ["castle-visit-counter.js?v=20261017-castle2",15215],
  ["gallery-entry.js?v=20261019-fast2-4afeae157b8b",127158],
  ["gallery-styles.css?v=20261019-fast2-ed2cce760a93",330219],
  ["manifest.webmanifest",4955],
  ["palace-living-scene.css?v=20261024-ready1",6521],
  ["palace-living-scene.js?v=20261024-ready1",19609]
];
// END GENERATED SHELL
const CACHE_PREFIX = 'mumei-atelier-shell-';
const CACHE = CACHE_PREFIX + 'v43-startup-' + SHELL_REVISION + ':' + SCOPE.pathname;
const HTML_KEY = new URL('index.html', SCOPE).href;
const HTML_LIMIT = 192 * 1024;
const NAVIGATION_WAIT_MS = 450;
const NETWORK_TIMEOUT_MS = 8000;
const CACHE_READ_TIMEOUT_MS = 150;
const ASSETS = new Map(PUBLIC_ASSETS.map(([path, limit]) => [new URL(path, SCOPE).href, limit]));
const inPreview = SCOPE.pathname.endsWith('/halloween-exhibition/preview/');
const pending = new Map();

// Only these public gallery routes share HTML. The query remains in the browser
// address, so return state is still interpreted by theater.js. Never ignore all
// queries, or match a town/maze/admin document to the gallery shell.
function isGalleryDocument(url) {
  if (url.pathname !== SCOPE.pathname && url.pathname !== new URL(HTML_KEY).pathname) return false;
  const params = [...url.searchParams];
  return params.length <= 2 && new Set(params.map(([key]) => key)).size === params.length &&
    params.every(([key, value]) => (key === 'return' && value === 'palace') || (key === 'mode' && value === 'halloween'));
}
function usable(response) {
  return response?.ok && response.type === 'basic' && !response.redirected &&
    !/(?:no-store|private)/i.test(response.headers.get('cache-control') || '') &&
    response.headers.get('vary') !== '*';
}
function matchesAssetType(key, response) {
  // A server's HTML error page can carry a 200 status. Never persist or replay
  // it as CSS: browsers reject that MIME type, leaving the entire gallery bare.
  return !new URL(key).pathname.endsWith('.css') ||
    /^\s*text\/css\s*(?:;|$)/i.test(response?.headers.get('content-type') || '');
}
async function readCache(key) {
  let timer;
  try {
    const response = await Promise.race([
      caches.match(key, { cacheName: CACHE }),
      new Promise(resolve => { timer = setTimeout(() => resolve(undefined), CACHE_READ_TIMEOUT_MS); })
    ]);
    return matchesAssetType(key, response) ? response : undefined;
  } catch { return undefined; }
  finally { clearTimeout(timer); }
}
async function fitsBudget(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) return false;
  const reader = response.body?.getReader();
  if (!reader) return true;
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return true;
      size += value.byteLength;
      if (size > limit) { void reader.cancel().catch(() => {}); return false; }
    }
  } catch { return false; }
}
async function save(key, response, limit) {
  if (!usable(response) || !matchesAssetType(key, response)) return;
  // Each exact URL has a source-sized byte budget (never > 2 MiB). Together
  // with one HTML key this is a finite cache, not an image/history collector.
  try {
    if (!(await fitsBudget(response.clone(), limit))) return;
    await (await caches.open(CACHE)).put(key, response);
  } catch { /* Storage restrictions never discard a good network response. */ }
}
function requestPublic(url, consume = async () => {}) {
  const controller = new AbortController();
  let timer;
  // Race as well as abort: even a stalled fetch implementation must settle.
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('Public shell request timed out')); }, NETWORK_TIMEOUT_MS);
  });
  return Promise.race([
    fetch(new Request(url, { credentials: 'omit', cache: 'no-cache', signal: controller.signal })).then(async response => {
      // Once headers arrive, a slow body/cache write must not abort the stream
      // already being painted by the page. Bound only the background cache work.
      clearTimeout(timer);
      let cacheTimer;
      try {
        await Promise.race([
          Promise.resolve(consume(response.clone())),
          new Promise(resolve => { cacheTimer = setTimeout(resolve, NETWORK_TIMEOUT_MS); })
        ]);
      } finally { clearTimeout(cacheTimer); }
      return response;
    }),
    timeout
  ]).finally(() => clearTimeout(timer));
}
function refresh(key, url, limit) {
  let task = pending.get(key);
  if (!task) {
    let ready, failed;
    const response = new Promise((resolve, reject) => { ready = resolve; failed = reject; });
    const done = requestPublic(url, result => {
      // Let the document/image stream to the page immediately. Cache body
      // validation and storage run in waitUntil, never on the rendering path.
      ready(result.clone());
      return save(key, result, limit);
    }).then(() => {}, failed).finally(() => pending.delete(key));
    task = { response, done };
    pending.set(key, task);
  }
  return { response: task.response.then(response => response.clone()), done: task.done };
}

self.addEventListener('install', event => {
  if (!inPreview) return;
  // One small revalidated HTML request, rather than 117 force-reload requests
  // including duplicate script URLs and artwork for both device orientations.
  event.waitUntil((async () => {
    await requestPublic(HTML_KEY, async response => {
      if (!usable(response) || !/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('Public gallery HTML unavailable');
      await save(HTML_KEY, response, HTML_LIMIT);
      if (!(await readCache(HTML_KEY))) throw new Error('Public shell storage unavailable');
    });
  })());
  // No skipWaiting: never force a reload or interrupt a game in progress.
});
self.addEventListener('activate', event => {
  if (!inPreview) return;
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key =>
    key.startsWith(CACHE_PREFIX) && key.endsWith(':' + SCOPE.pathname) && key !== CACHE
  ).map(key => caches.delete(key)))));
  // No clients.claim(): never seize another page or app's existing session.
});
self.addEventListener('fetch', event => {
  if (!inPreview || event.request.method !== 'GET' || event.request.headers.has('authorization')) return;
  const url = new URL(event.request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const navigation = event.request.mode === 'navigate' && isGalleryDocument(url);
  if (!navigation && !ASSETS.has(url.href)) return;
  if (navigation) {
    // Always try current HTML, even while a newer worker waits. A normal reload
    // can see a deployment immediately; a poor connection cannot stall a warm
    // launch indefinitely. A late successful response warms the next visit.
    const task = refresh(HTML_KEY, url.href, HTML_LIMIT);
    const network = task.response;
    event.waitUntil(task.done);
    event.respondWith((async () => {
      const cached = readCache(HTML_KEY);
      let timer;
      const answer = network.then(async response => usable(response) ? response : ((await cached) || response)).catch(async () => (await cached) || Response.error());
      try {
        const fallback = new Promise(resolve => { timer = setTimeout(resolve, NAVIGATION_WAIT_MS); }).then(async () => (await cached) || answer);
        return await Promise.race([answer, fallback]);
      } finally { clearTimeout(timer); }
    })());
    return;
  }
  // Exact release URLs only. A new version not in this worker bypasses it, so
  // updated HTML cannot be paired with a different cached query/version.
  let background;
  const response = (async () => {
    const cached = await readCache(url.href);
    if (cached) return cached;
    try {
      const task = refresh(url.href, url.href, ASSETS.get(url.href));
      background = task.done;
      return await task.response;
    }
    catch { return Response.error(); }
  })();
  event.respondWith(response);
  event.waitUntil(response.then(() => background, () => {}));
});
