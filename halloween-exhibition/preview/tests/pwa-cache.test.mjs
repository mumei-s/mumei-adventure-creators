import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import vm from 'node:vm';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const base = 'https://mumei-s.github.io/mumei-adventure-creators/halloween-exhibition/preview/';
function basic(body = '<!doctype html>current gallery', options = {}) {
  const response = new Response(body, { headers: { 'content-type': 'text/html' }, ...options });
  function tag(value) {
    Object.defineProperty(value, 'type', { value: 'basic' });
    const clone = value.clone.bind(value);
    value.clone = () => tag(clone());
    return value;
  }
  return tag(response);
}
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
function publicResponse(request) {
  return new URL(request.url).pathname.endsWith('.css') ?
    basic('body { color: ivory; }', { headers: { 'content-type': 'text/css; charset=utf-8' } }) : basic();
}
function harness({ scope = base, network = async request => publicResponse(request), storageDenied = false, storageBlocked = false, readBlocked = false, sourceText = source } = {}) {
  const handlers = {}, stores = new Map(), fetched = [], deleted = [], timers = new Map();
  let clock = 0, timerId = 0;
  const keyOf = value => typeof value === 'string' ? value : value.url;
  const context = vm.createContext({
    URL, Request, Response, AbortController, Set, Map,
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    self: { location: { href: scope + 'sw.js' }, addEventListener(type, handler) { handlers[type] = handler; } },
    caches: {
      async open(name) {
        if (storageDenied) throw Error('storage denied');
        if (!stores.has(name)) stores.set(name, new Map());
        return { async put(key, response) { if (storageBlocked) await new Promise(() => {}); stores.get(name).set(keyOf(key), response.clone()); } };
      },
      async match(key, { cacheName }) {
        if (storageDenied) throw Error('storage denied');
        if (readBlocked) await new Promise(() => {});
        return stores.get(cacheName)?.get(keyOf(key))?.clone();
      },
      async keys() { return [...stores.keys()]; },
      async delete(key) { deleted.push(key); return stores.delete(key); }
    },
    async fetch(request) { fetched.push(request); return network(request); }
  });
  vm.runInContext(sourceText, context);
  const config = vm.runInContext('({CACHE, HTML_KEY, HTML_LIMIT, NAVIGATION_WAIT_MS, NETWORK_TIMEOUT_MS, CACHE_READ_TIMEOUT_MS, PUBLIC_ASSETS})', context);
  function dispatch(type, url = scope, { mode = 'cors', method = 'GET', headers = {} } = {}) {
    let response;
    const work = [];
    handlers[type]?.({ request: { url, mode, method, headers: new Headers(headers) }, respondWith(value) { response = value; }, waitUntil(value) { work.push(value); } });
    const done = Promise.all(work);
    // Tests may intentionally inspect an install rejection after advancing time.
    void done.catch(() => {});
    return { intercepted: Boolean(response), response, done };
  }
  async function advance(ms) {
    clock += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
    await settle();
  }
  function seed(key, value, cacheName = config.CACHE, options = {}) {
    if (!stores.has(cacheName)) stores.set(cacheName, new Map());
    stores.get(cacheName).set(key, basic(value, options));
  }
  return { config, dispatch, advance, seed, stores, fetched, deleted, timers };
}

test('generated exact dependency map is current and has hard count/byte bounds', async () => {
  await promisify(execFile)(process.execPath, [new URL('../../scripts/build-preview-cache.mjs', import.meta.url).pathname, '--check']);
  const { PUBLIC_ASSETS, HTML_LIMIT } = harness().config;
  assert.ok(PUBLIC_ASSETS.length > 20 && PUBLIC_ASSETS.length <= 90);
  assert.equal(new Set(PUBLIC_ASSETS.map(([path]) => path)).size, PUBLIC_ASSETS.length);
  assert.ok(PUBLIC_ASSETS.reduce((sum, [, bytes]) => sum + bytes, HTML_LIMIT) <= 8 * 1024 * 1024);
  for (const [path, bytes] of PUBLIC_ASSETS) {
    assert.ok(bytes > 0 && bytes <= 2 * 1024 * 1024, path);
    assert.doesNotMatch(path, /^(?:admin|town|maze|data)\/|supabase|INSIGHT|palace-cast-rig|adventure-atmosphere/i);
    await access(new URL('../' + path, import.meta.url));
    if (/\.(?:js|css)(?:\?|$)/.test(path)) assert.match(path, /\?v=[a-zA-Z0-9._-]+$/);
  }
  for (const match of html.matchAll(/(?:href|src)="\.\/([^"?]+\.(?:js|css)\?v=[^"]+)"/g)) {
    assert.ok(PUBLIC_ASSETS.some(([path]) => path === match[1]), match[1]);
  }
});

test('installation performs exactly one bounded credential-free HTML request', async () => {
  const h = harness(); await h.dispatch('install').done;
  assert.equal(h.fetched.length, 1);
  assert.equal(h.fetched[0].url, h.config.HTML_KEY);
  assert.equal(h.fetched[0].credentials, 'omit');
  assert.equal(h.fetched[0].cache, 'no-cache');
  assert.deepEqual([...h.stores.get(h.config.CACHE).keys()], [h.config.HTML_KEY]);
  assert.equal(h.timers.size, 0);
});

test('each exact version fills once on demand, then serves without a network roundtrip', async () => {
  const h = harness();
  for (const [path] of h.config.PUBLIC_ASSETS) {
    const before = h.fetched.length;
    const first = h.dispatch('fetch', base + path);
    assert.equal(first.intercepted, true, path); await first.response; await first.done;
    const second = h.dispatch('fetch', base + path); await second.response; await second.done;
    assert.equal(h.fetched.length, before + 1, path);
    assert.equal(h.dispatch('fetch', base + path + '&token=private').intercepted, false);
  }
});

test('wrong CSS MIME responses reach the browser but never become persistent stylesheets', async () => {
  const [path] = harness().config.PUBLIC_ASSETS.find(([path]) => path.startsWith('gallery-styles.css?'));
  for (const mime of ['text/html', 'text/plain', 'text/css-error', '']) {
    const h = harness({ network: async () => {
      const response = basic('<!doctype html>temporary upstream error', { headers: {} });
      if (mime) response.headers.set('content-type', mime);
      else response.headers.delete('content-type');
      return response;
    } });
    for (let attempt = 0; attempt < 2; attempt++) {
      const request = h.dispatch('fetch', base + path);
      assert.equal((await request.response).ok, true, 'the original network response is preserved');
      await request.done;
    }
    assert.equal(h.fetched.length, 2, `${mime || 'missing MIME'} must retry the network`);
    assert.equal(h.stores.get(h.config.CACHE)?.has(base + path) || false, false);
  }
});

test('a poisoned cached CSS response is bypassed and replaced by a valid stylesheet', async () => {
  const h = harness();
  const [path] = h.config.PUBLIC_ASSETS.find(([path]) => path.startsWith('gallery-styles.css?'));
  const url = base + path;
  h.seed(url, '<!doctype html>cached upstream error');
  const request = h.dispatch('fetch', url);
  assert.equal((await request.response).headers.get('content-type'), 'text/css; charset=utf-8');
  await request.done;
  assert.equal(h.fetched.length, 1);
  assert.match(await h.stores.get(h.config.CACHE).get(url).clone().text(), /color: ivory/);
  const warm = h.dispatch('fetch', url);
  assert.match(await (await warm.response).text(), /color: ivory/);
  await warm.done;
  assert.equal(h.fetched.length, 1, 'a valid replacement is reused');
});

test('invalid cached CSS is never replayed when the network is unavailable', async () => {
  const h = harness({ network: async () => { throw Error('offline'); } });
  const [path] = h.config.PUBLIC_ASSETS.find(([path]) => path.startsWith('gallery-styles.css?'));
  h.seed(base + path, '<!doctype html>cached upstream error');
  const request = h.dispatch('fetch', base + path);
  assert.equal((await request.response).type, 'error');
  await request.done;
  assert.equal(h.fetched.length, 1);
});

test('valid cached CSS MIME parameters and case are accepted without a network transfer', async () => {
  for (const mime of ['text/css', 'text/css; charset=UTF-8', 'Text/CSS ; charset=utf-8']) {
    const h = harness({ network: async () => { throw Error('offline'); } });
    const [path] = h.config.PUBLIC_ASSETS.find(([path]) => path.startsWith('gallery-styles.css?'));
    h.seed(base + path, 'body { background: navy; }', h.config.CACHE, { headers: { 'content-type': mime } });
    const request = h.dispatch('fetch', base + path);
    assert.match(await (await request.response).text(), /background: navy/);
    await request.done;
    assert.equal(h.fetched.length, 0, mime);
  }
});

test('unknown/stale versions, private paths, games, auth and external requests bypass entirely', () => {
  const h = harness();
  for (const path of ['admin/index.html','admin/app.js','admin/model.js','admin/private-draft.json','maze/','maze/app.js','maze/touch-pad.css','maze/owner-rig.js','maze/assets/rigs/monster-franken/rig.json','town/','town/app.js','data/archive.json','palace-cast-rig.js','adventure-atmosphere.css','unknown.js','theater.js','theater.js?v=old','index.html?token=private','?return=palace&token=private','?v=old','?return=palace&return=palace','?return=theatre','?mode=normal']) {
    for (const mode of ['navigate', 'cors']) assert.equal(h.dispatch('fetch', base + path, { mode }).intercepted, false, path);
  }
  for (const url of ['https://mumei-s.github.io/','https://mumei-s.github.io/INSIGHT/app.js','https://assets.st-note.com/private.png','https://example.supabase.co/rest/v1/rpc/castle_visit']) assert.equal(h.dispatch('fetch', url).intercepted, false);
  const asset = base + h.config.PUBLIC_ASSETS[0][0];
  assert.equal(h.dispatch('fetch', asset, { method: 'POST' }).intercepted, false);
  assert.equal(h.dispatch('fetch', asset, { headers: { authorization: 'Bearer private' } }).intercepted, false);
  assert.equal(h.fetched.length, 0);
});

test('gallery root, index and exact return queries share only the gallery HTML key', async () => {
  const h = harness();
  for (const path of ['', 'index.html', '?return=palace', 'index.html?mode=halloween', '?mode=halloween&return=palace', '?return=palace&mode=halloween']) {
    const request = h.dispatch('fetch', base + path, { mode: 'navigate' });
    assert.equal(request.intercepted, true, path);
    assert.match(await (await request.response).text(), /current gallery/); await request.done;
    assert.equal(h.fetched.at(-1).url, base + path, 'network preserves the return URL');
  }
  assert.deepEqual([...h.stores.get(h.config.CACHE).keys()], [h.config.HTML_KEY]);
});

test('ordinary reload uses new network HTML even when an older shell is cached', async () => {
  const h = harness({ network: async () => basic('<!doctype html>new release ?v=next') });
  h.seed(h.config.HTML_KEY, '<!doctype html>old release');
  const request = h.dispatch('fetch', base, { mode: 'navigate' });
  assert.match(await (await request.response).text(), /new release/); await request.done;
  assert.match(await h.stores.get(h.config.CACHE).get(h.config.HTML_KEY).text(), /new release/);
  assert.equal(h.dispatch('fetch', base + 'theater.js?v=next').intercepted, false);
  assert.doesNotMatch(source.replace(/\/\/[^\n]*/g, ''), /skipWaiting\s*\(|clients\.claim\s*\(|location\.reload|localStorage|sessionStorage|\.clear\(/);
});

test('slow warm navigation falls back at 450 ms, then refreshes the next visit', async () => {
  let resolveNetwork;
  const h = harness({ network: () => new Promise(resolve => { resolveNetwork = resolve; }) });
  h.seed(h.config.HTML_KEY, '<!doctype html>cached gallery');
  const request = h.dispatch('fetch', base + '?return=palace', { mode: 'navigate' });
  await settle(); let answered = false; request.response.then(() => { answered = true; });
  await h.advance(449); assert.equal(answered, false);
  await h.advance(1); assert.match(await (await request.response).text(), /cached gallery/);
  resolveNetwork(basic('<!doctype html>late new gallery')); await request.done;
  assert.match(await h.stores.get(h.config.CACHE).get(h.config.HTML_KEY).text(), /late new/);
  assert.equal(h.timers.size, 0);
});

test('offline and server failures retain cached HTML without poisoning it', async () => {
  for (const network of [async () => { throw Error('offline'); }, async () => basic('unavailable', { status: 503 })]) {
    const h = harness({ network }); h.seed(h.config.HTML_KEY, '<!doctype html>cached gallery');
    const request = h.dispatch('fetch', base, { mode: 'navigate' });
    assert.match(await (await request.response).text(), /cached gallery/); await request.done;
    assert.match(await h.stores.get(h.config.CACHE).get(h.config.HTML_KEY).text(), /cached gallery/);
  }
});

test('a stalled cold request, warm refresh and install all terminate at the network deadline', async () => {
  for (const kind of ['cold', 'warm', 'install']) {
    const h = harness({ network: () => new Promise(() => {}) });
    if (kind === 'warm') h.seed(h.config.HTML_KEY, '<!doctype html>cached gallery');
    const request = kind === 'install' ? h.dispatch('install') : h.dispatch('fetch', base, { mode: 'navigate' });
    await settle(); await h.advance(h.config.NETWORK_TIMEOUT_MS);
    assert.equal(h.fetched[0].signal.aborted, true);
    if (kind === 'install') await assert.rejects(request.done, /timed out/);
    else { const response = await request.response; assert.equal(response.type === 'error', kind === 'cold'); await request.done; }
    assert.equal(h.timers.size, 0);
  }
});

test('oversized/private bodies do not enter the cache but a good response still reaches the page', async () => {
  const config = harness().config;
  const [path, limit] = config.PUBLIC_ASSETS[0];
  for (const network of [async () => basic('x'.repeat(limit + 1)), async () => basic('private', { headers: { 'cache-control': 'private' } })]) {
    const h = harness({ network }); const request = h.dispatch('fetch', base + path);
    assert.equal((await request.response).ok, true); await request.done;
    assert.equal(h.stores.get(config.CACHE)?.size || 0, 0);
  }
  const denied = harness({ storageDenied: true });
  assert.equal((await denied.dispatch('fetch', base + path).response).ok, true);
  await assert.rejects(denied.dispatch('install').done, /storage unavailable/);
});

test('slow cache writes never hold a successful network response on the rendering path', async () => {
  const h = harness({ storageBlocked: true });
  const request = h.dispatch('fetch', base + h.config.PUBLIC_ASSETS[0][0]);
  assert.equal((await request.response).ok, true);
  await h.advance(h.config.NETWORK_TIMEOUT_MS); await request.done;
  assert.equal(h.fetched[0].signal.aborted, false, 'cache work must not abort an image or script already streaming to the page');
  assert.equal(h.timers.size, 0);
});

test('simultaneous identical asset requests share one network transfer', async () => {
  let finish;
  const h = harness({ network: () => new Promise(resolve => { finish = resolve; }) });
  const url = base + h.config.PUBLIC_ASSETS[0][0];
  const a = h.dispatch('fetch', url), b = h.dispatch('fetch', url);
  await settle(); assert.equal(h.fetched.length, 1);
  finish(basic('shared asset'));
  assert.equal(await (await a.response).text(), 'shared asset');
  assert.equal(await (await b.response).text(), 'shared asset');
  await Promise.all([a.done, b.done]);
});

test('hung CacheStorage reads cannot block current HTML or indefinitely stall an asset', async () => {
  const h = harness({ readBlocked: true });
  const navigation = h.dispatch('fetch', base, { mode: 'navigate' });
  assert.equal((await navigation.response).ok, true); await navigation.done;
  const asset = h.dispatch('fetch', base + h.config.PUBLIC_ASSETS[0][0]);
  await settle(); await h.advance(h.config.CACHE_READ_TIMEOUT_MS);
  assert.equal((await asset.response).ok, true); await asset.done;
  assert.equal(h.timers.size, 0);
});

test('new release never reads old caches and activation prunes only this app epoch', async () => {
  const h = harness({ network: async () => { throw Error('offline'); } });
  const old = 'mumei-atelier-shell-v42-old:' + new URL(base).pathname;
  h.seed(h.config.HTML_KEY, 'old release', old);
  h.seed(h.config.HTML_KEY, 'other app', 'mumei-atelier-shell-other:/other/');
  h.seed(h.config.HTML_KEY, 'root app', 'root-app');
  h.seed(h.config.HTML_KEY, 'current release');
  const [path] = h.config.PUBLIC_ASSETS[0]; h.seed(base + path, 'old script', old);
  assert.equal((await h.dispatch('fetch', base + path).response).type, 'error');
  await h.dispatch('activate').done;
  assert.deepEqual(h.deleted, [old]);
  assert.equal(h.stores.has('root-app'), true); assert.equal(h.stores.has('mumei-atelier-shell-other:/other/'), true);
});

test('copied worker outside preview is inert', async () => {
  const h = harness({ scope: 'https://example.com/' });
  await h.dispatch('install').done; await h.dispatch('activate').done;
  assert.equal(h.dispatch('fetch', 'https://example.com/', { mode: 'navigate' }).intercepted, false);
  assert.equal(h.fetched.length, 0); assert.equal(h.deleted.length, 0);
});

test('optional counter remains independent and all API/data traffic stays network-only', async () => {
  const boot = await readFile(new URL('../castle-counter-bootstrap.js', import.meta.url), 'utf8');
  const theater = await readFile(new URL('../theater.js', import.meta.url), 'utf8');
  const {galleryEntrySources} = await import('../scripts/build-gallery-script.mjs');
  assert.ok(galleryEntrySources.includes('./castle-counter-bootstrap.js'));
  assert.match(html, /type="module" src="\.\/gallery-entry\.js\?v=20261019-fast2-[a-f0-9]{12}"/);
  assert.match(boot, /import\('\.\/castle-visit-counter\.js\?v=20261017-castle2'\)/);
  assert.match(boot, /\.catch\(\(\) => \{\}\)/);
  assert.doesNotMatch(theater, /castle-visit-counter|initCastleVisitCounter/);
});
