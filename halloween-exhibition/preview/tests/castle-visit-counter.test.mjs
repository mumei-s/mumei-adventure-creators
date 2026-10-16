import test from 'node:test';
import assert from 'node:assert/strict';
import { CASTLE_VISIT_STORAGE_KEY, CASTLE_VISIT_RPC, castleVisitDay, isPublicCastleLocation, prepareCastleVisit, createCastleVisitCounter, initCastleVisitCounter } from '../castle-visit-counter.js';

const PUBLIC = 'https://mumei-s.github.io/mumei-adventure-creators/halloween-exhibition/preview/';
const flush = () => new Promise(resolve => setImmediate(resolve));
const response = (total = 7, status = 'ok') => ({ ok: true, json: async () => ({ total, status }) });
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
function tokenEnvironment() {
  let n = 0;
  return { storage: storage(), locks: { request: async (name, options, callback) => { assert.match(name, /^halloween-exhibition:/); assert.equal(options.ifAvailable, true); return callback({}); } }, crypto: { getRandomValues: bytes => bytes.fill(++n) } };
}
function harness(overrides = {}) {
  const env = tokenEnvironment(), calls = [], states = [], jobs = new Map(); let timerId = 0;
  const timers = { setTimeout(fn, delay) { jobs.set(++timerId, { fn, delay }); return timerId; }, clearTimeout: id => jobs.delete(id) };
  let visible = true, allowed = true, date = Date.parse('2026-10-16T01:00:00Z');
  const counter = createCastleVisitCounter({ ...env, timers, now: () => date, isVisible: () => visible, isAllowed: () => allowed,
    fetchImpl: async (...args) => { calls.push(args); return response(); }, onState: state => states.push(state), ...overrides });
  return { ...env, counter, calls, states, jobs, setVisible: v => { visible = v; }, setAllowed: v => { allowed = v; }, setDate: v => { date = Date.parse(v); }, fireTimeout() { for (const { fn } of [...jobs.values()]) fn(); } };
}
test('JST day changes at 15:00 UTC, independent of host timezone', () => {
  assert.equal(castleVisitDay('2026-10-15T14:59:59Z'), '2026-10-15');
  assert.equal(castleVisitDay('2026-10-15T15:00:00Z'), '2026-10-16');
});
test('production counting is limited to the exact public castle page and excludes automation', () => {
  for (const suffix of ['', 'index.html', '?from=link#castle']) assert.equal(isPublicCastleLocation(PUBLIC + suffix), true);
  for (const url of ['http://mumei-s.github.io/mumei-adventure-creators/halloween-exhibition/preview/', PUBLIC.replace('preview/', ''), PUBLIC + 'test.html', PUBLIC.replace('halloween-exhibition/preview/', 'halloween/'), 'http://localhost:4173/', 'https://evil.test/' ]) assert.equal(isPublicCastleLocation(url), false);
  assert.equal(isPublicCastleLocation(PUBLIC, { webdriver: true }), false);
});
test('random daily tokens persist only in the castle key, reuse across tabs, and rotate next day', async () => {
  const env = tokenEnvironment(); env.storage.setItem('atelier-counter', 'untouched');
  const [a, b] = await Promise.all([prepareCastleVisit({ ...env, day: '2026-10-16' }), prepareCastleVisit({ ...env, day: '2026-10-16' })]);
  assert.deepEqual(a, b); assert.match(a.p_token, /^[0-9a-f]{64}$/); assert.equal(a.p_day, '2026-10-16');
  const next = await prepareCastleVisit({ ...env, day: '2026-10-17' }); assert.notEqual(next.p_token, a.p_token);
  assert.equal(env.storage.values.size, 2); assert.equal(env.storage.getItem('atelier-counter'), 'untouched');
});
test('confirmed browser-day is read only; denied/busy/unsupported persistence never invents a visit', async () => {
  const env = tokenEnvironment(), readOnly = { p_token: null, p_day: null };
  env.storage.setItem(CASTLE_VISIT_STORAGE_KEY, JSON.stringify({ day: '2026-10-16', token: 'a'.repeat(64), recorded: true }));
  assert.deepEqual(await prepareCastleVisit({ ...env, day: '2026-10-16' }), readOnly);
  for (const override of [{ locks: null }, { crypto: null }, { storage: () => { throw Error('denied'); } }, { storage: { getItem() { return null; }, setItem() {} } }, { locks: { request: async (name, opts, cb) => cb(null) } }]) {
    assert.deepEqual(await prepareCastleVisit({ ...env, day: '2026-10-17', ...override }), readOnly);
  }
});
test('hidden or nonproduction pages make no request', async () => {
  const h = harness(); h.setVisible(false); await h.counter.refresh(); assert.equal(h.calls.length, 0);
  h.setVisible(true); h.setAllowed(false); await h.counter.refresh(); assert.equal(h.counter.getState().status, 'disabled'); assert.equal(h.calls.length, 0);
});
test('refreshes coalesce and a successful request is never repeated on same-day re-entry', async () => {
  const h = harness(); const a = h.counter.refresh(), b = h.counter.refresh(); assert.equal(a, b); await a;
  h.setVisible(false); await h.counter.refresh(); h.setVisible(true); await h.counter.refresh();
  assert.equal(h.calls.length, 1); assert.equal(h.counter.getState().total, 7); assert.equal(h.jobs.size, 0);
  assert.equal(JSON.parse(h.storage.getItem(CASTLE_VISIT_STORAGE_KEY)).recorded, true);
});
test('request contains only daily random token/day and omits cookies and referrer', async () => {
  const h = harness(); await h.counter.refresh(); const [url, options] = h.calls[0];
  assert.equal(url, CASTLE_VISIT_RPC); assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer'); assert.equal(options.cache, 'no-store');
  assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(), ['p_day', 'p_token']);
  assert.deepEqual(Object.keys(options.headers).sort(), ['apikey', 'content-type']);
});
test('unsupported storage still displays the genuine shared total without increment', async () => {
  const h = harness({ locks: null }); await h.counter.refresh(); assert.deepEqual(JSON.parse(h.calls[0][1].body), { p_token: null, p_day: null }); assert.equal(h.counter.getState().total, 7);
});
test('a newly opened page with confirmed daily storage only reads total', async () => {
  const env = tokenEnvironment(), first = harness(env); await first.counter.refresh(); const second = harness(env); await second.counter.refresh();
  assert.deepEqual(JSON.parse(second.calls[0][1].body), { p_token: null, p_day: null });
});
test('next-day explicit refresh can count again; no polling is scheduled', async () => {
  const h = harness(); await h.counter.refresh(); const first = JSON.parse(h.calls[0][1].body);
  h.setDate('2026-10-16T15:00:00Z'); assert.equal(h.calls.length, 1); assert.equal(h.jobs.size, 0); await h.counter.refresh();
  const second = JSON.parse(h.calls[1][1].body); assert.equal(second.p_day, '2026-10-17'); assert.notEqual(first.p_token, second.p_token);
});
test('leaving the castle while local preparation is pending sends no stale visit', async () => {
  let release; const h = harness({ locks: { request: () => new Promise(resolve => { release = resolve; }) } });
  const pending = h.counter.refresh(); h.setVisible(false); release({ p_token: 'a'.repeat(64), p_day: '2026-10-16' }); await pending;
  assert.equal(h.calls.length, 0); assert.equal(h.counter.getState().status, 'idle');
});
test('HTTP/response failures stay isolated and do not retry or display fabricated zero', async () => {
  for (const fetchImpl of [async () => ({ ok: false }), async () => { throw Error('offline'); }, async () => response(-1), async () => response(Number.MAX_SAFE_INTEGER + 1), async () => response(2, 'bogus')]) {
    let count = 0; const h = harness({ fetchImpl: async (...args) => { count++; return fetchImpl(...args); } });
    await h.counter.refresh(); await h.counter.refresh(); assert.equal(count, 1); assert.deepEqual(h.counter.getState(), { status: 'unavailable', total: null });
  }
});
test('timeout bounds both fetch and response body, aborts, and does not retry', async () => {
  for (const bodyHangs of [false, true]) {
    let signal, count = 0;
    const h = harness({ timeoutMs: 9000, fetchImpl: async (url, options) => { signal = options.signal; count++; return bodyHangs ? { ok: true, json: () => new Promise(() => {}) } : new Promise(() => {}); } });
    const pending = h.counter.refresh(); await flush(); assert.equal([...h.jobs.values()][0].delay, 5000); h.fireTimeout(); await pending;
    assert.equal(signal.aborted, true); assert.equal(h.counter.getState().status, 'unavailable'); await h.counter.refresh(); assert.equal(count, 1);
  }
});
test('destroy settles an uncooperative fetch and prevents late rendering', async () => {
  let resolve; const h = harness({ fetchImpl: () => new Promise(r => { resolve = r; }) });
  const pending = h.counter.refresh(); await flush(); h.counter.destroy(); await pending; const count = h.states.length;
  resolve(response(999)); await flush(); assert.equal(h.states.length, count); assert.equal(h.jobs.size, 0); await h.counter.refresh();
});
test('unavailable AbortController or throwing optional UI never rejects core-facing refresh', async () => {
  const h = harness({ AbortControllerImpl: null }); await assert.doesNotReject(h.counter.refresh()); assert.equal(h.calls.length, 0); assert.equal(h.counter.getState().status, 'unavailable');
  const second = harness({ onState() { throw Error('UI absent'); } }); await assert.doesNotReject(second.counter.refresh()); assert.equal(second.counter.getState().status, 'ready');
});
test('server day mismatch and daily limit retain real count without marking a visit recorded', async () => {
  for (const status of ['day_changed', 'daily_limit']) {
    const h = harness({ fetchImpl: async () => response(1234, status) }); await h.counter.refresh();
    assert.deepEqual(h.counter.getState(), { status: 'ready', total: 1234, limited: true }); assert.equal(JSON.parse(h.storage.getItem(CASTLE_VISIT_STORAGE_KEY)).recorded, false);
  }
});
class Element {
  constructor(doc) { Object.assign(this, { ownerDocument: doc, children: [], dataset: {}, hidden: false, inert: false, handlers: new Map(), attributes: new Map() }); }
  append(...children) { for (const child of children) { this.children.push(child); child.parentElement = this; } }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(name, fn) { this.handlers.set(name, fn); }
  removeEventListener(name) { this.handlers.delete(name); }
  querySelector(selector) { for (const child of this.children) { if ('#' + child.id === selector) return child; const found = child.querySelector(selector); if (found) return found; } return null; }
  remove() { this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
}
function dom({ observer = true, embedded = false } = {}) {
  const env = tokenEnvironment(), calls = [], observers = [];
  const doc = new Element(null); doc.hidden = false; doc.createElement = () => new Element(doc);
  const win = new Element(doc); Object.assign(win, { location: { href: PUBLIC }, navigator: { locks: env.locks }, crypto: env.crypto, localStorage: env.storage, AbortController, setTimeout, clearTimeout,
    fetch: async (...args) => { calls.push(args); return response(1234); }, MutationObserver: observer ? class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } } : undefined });
  win.self = win; win.top = embedded ? {} : win; doc.defaultView = win;
  const root = doc.createElement(), mount = doc.createElement(); mount.id = 'palace-entrance'; root.append(mount);
  Object.assign(root.dataset, { mode: 'halloween', palaceState: 'opening', palaceReady: 'ready', archiveState: 'ready' });
  const api = initCastleVisitCounter({ root }); return { doc, win, root, mount, api, calls, observers, panel: root.querySelector('#castle-visit-counter') };
}
test('DOM panel waits for stable ready castle, hides through transitions, and mounts once', async () => {
  const h = dom(); assert.equal(h.panel.hidden, true); assert.equal(h.calls.length, 0); assert.equal(initCastleVisitCounter({ root: h.root }), h.api);
  h.root.dataset.palaceState = 'palace'; h.observers[0].cb(); await flush(); assert.equal(h.panel.hidden, false); assert.equal(h.calls.length, 1); assert.equal(h.panel.children[1].textContent, '1,234');
  assert.equal(h.panel.children[3].textContent, '実人数ではありません'); assert.equal(h.panel.attributes.get('aria-live'), 'polite');
  for (const [key, value] of [['palaceState', 'gallery'], ['palaceReady', 'loading'], ['archiveState', 'loading'], ['mode', 'normal']]) {
    const original = h.root.dataset[key]; h.root.dataset[key] = value; h.api.refresh(); assert.equal(h.panel.hidden, true); h.root.dataset[key] = original;
  }
  h.doc.hidden = true; h.doc.handlers.get('visibilitychange')(); assert.equal(h.panel.hidden, true); h.doc.hidden = false;
  h.root.inert = true; h.api.refresh(); assert.equal(h.panel.hidden, true); h.root.inert = false;
  h.api.refresh(); await flush(); assert.equal(h.calls.length, 1); h.api.destroy(); assert.equal(h.mount.children.length, 0); assert.equal(h.observers[0].disconnected, true);
});
test('unsupported observer mounts nothing and embedded previews never contact counter', async () => {
  const h = dom({ observer: false }); assert.equal(h.api, null); assert.equal(h.mount.children.length, 0); assert.equal(h.calls.length, 0);
  const embedded = dom({ embedded: true }); embedded.root.dataset.palaceState = 'palace'; embedded.api.refresh(); await flush(); assert.equal(embedded.calls.length, 0); assert.equal(embedded.panel.dataset.status, 'disabled'); embedded.api.destroy();
});
