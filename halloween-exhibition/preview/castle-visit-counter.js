/** Castle-only, approximate cumulative visits. No identity, image or article data is sent. */
export const CASTLE_VISIT_STORAGE_KEY = 'halloween-exhibition:castle-visits:v1';
export const CASTLE_VISIT_RPC = 'https://xxhaerjvrgmnadxjqetz.supabase.co/rest/v1/rpc/castle_record_visit';
const PUBLISHABLE_KEY = 'sb_publishable_yUoJtk-zLMLBZFyBUZehIw_9Bym2Z3w';
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const LOCK_NAME = 'halloween-exhibition:castle-visits:token';
const STATUS = new Set(['ok', 'day_changed', 'daily_limit']);

export function castleVisitDay(value = Date.now()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value));
}

export function isPublicCastleLocation(location, navigator = {}) {
  try {
    const url = new URL(location?.href || String(location));
    return navigator.webdriver !== true && url.origin === 'https://mumei-s.github.io'
      && /^\/mumei-adventure-creators\/halloween-exhibition\/preview\/(?:index\.html)?$/.test(url.pathname);
  } catch { return false; }
}

function savedVisit(storage, day) {
  try {
    const value = JSON.parse(storage?.getItem(CASTLE_VISIT_STORAGE_KEY) || 'null');
    return value?.day === day && TOKEN_PATTERN.test(value.token) ? value : null;
  } catch { return null; }
}

/** Cross-tab creation is atomic with Web Locks. Without safe persistence, read only. */
export async function prepareCastleVisit({ day, storage, locks, crypto } = {}) {
  const readOnly = { p_token: null, p_day: null };
  if (!locks?.request || !crypto?.getRandomValues) return readOnly;
  try {
    return await locks.request(LOCK_NAME, { mode: 'exclusive', ifAvailable: true }, lock => {
      if (!lock) return readOnly;
      const store = typeof storage === 'function' ? storage() : storage;
      if (!store?.getItem || !store?.setItem) return readOnly;
      let visit = savedVisit(store, day);
      if (visit?.recorded === true) return readOnly;
      if (!visit) {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        visit = { day, token: Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(''), recorded: false };
        store.setItem(CASTLE_VISIT_STORAGE_KEY, JSON.stringify(visit));
        // Never count if the storage silently failed to persist the same token.
        if (savedVisit(store, day)?.token !== visit.token) return readOnly;
      }
      return { p_token: visit.token, p_day: day };
    });
  } catch { return readOnly; }
}

async function rememberRecorded({ request, storage, locks }) {
  if (!request.p_token || !locks?.request) return;
  try {
    await locks.request(LOCK_NAME, { mode: 'exclusive', ifAvailable: true }, lock => {
      if (!lock) return;
      const store = typeof storage === 'function' ? storage() : storage;
      const visit = savedVisit(store, request.p_day);
      if (visit?.token === request.p_token) store.setItem(CASTLE_VISIT_STORAGE_KEY, JSON.stringify({ ...visit, recorded: true }));
    });
  } catch { /* Server-side token deduplication still prevents a repeat increment. */ }
}

export function createCastleVisitCounter({
  isVisible = () => false, isAllowed = () => false,
  storage = () => globalThis.localStorage, locks = globalThis.navigator?.locks,
  crypto = globalThis.crypto, fetchImpl = globalThis.fetch,
  now = Date.now, timeoutMs = 5000, timers = globalThis, onState = () => {},
  AbortControllerImpl = globalThis.AbortController,
} = {}) {
  let state = { status: 'idle', total: null }, attemptedDay = null, pending = null;
  let disposed = false, controller = null, timer = null, cancelDeadline = null;
  const emit = value => { state = value; if (!disposed) { try { onState({ ...state }); } catch { /* Optional UI must never break the castle. */ } } };
  const getState = () => ({ ...state });
  function refresh() {
    if (disposed || !isVisible()) return Promise.resolve(getState());
    if (!isAllowed()) {
      if (state.status !== 'disabled') emit({ status: 'disabled', total: null });
      return Promise.resolve(getState());
    }
    const day = castleVisitDay(now());
    if (pending || attemptedDay === day) return pending || Promise.resolve(getState());
    attemptedDay = day;
    emit({ status: 'loading', total: null });
    pending = (async () => {
      const request = await prepareCastleVisit({ day, storage, locks, crypto });
      // Preparing a local daily token must not cause a stale view to send a visit.
      if (disposed || !isVisible()) { attemptedDay = null; if (!disposed) emit({ status: 'idle', total: null }); return getState(); }
      try {
        if (typeof AbortControllerImpl !== 'function') throw new Error('Counter unavailable');
        controller = new AbortControllerImpl();
        const deadline = new Promise((_, reject) => {
          cancelDeadline = () => reject(new Error('Counter stopped'));
          timer = timers.setTimeout(() => { controller?.abort(); reject(new Error('Counter timeout')); }, Math.max(1, Math.min(timeoutMs, 5000)));
        });
        const transfer = Promise.resolve().then(async () => {
          if (typeof fetchImpl !== 'function') throw new Error('Counter unavailable');
          const response = await fetchImpl(CASTLE_VISIT_RPC, {
            method: 'POST', mode: 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
            headers: { apikey: PUBLISHABLE_KEY, 'content-type': 'application/json' },
            body: JSON.stringify(request), signal: controller.signal,
          });
          if (!response.ok) throw new Error('Counter unavailable');
          const value = await response.json();
          if (!Number.isSafeInteger(value?.total) || value.total < 0 || !STATUS.has(value.status)) throw new Error('Invalid count');
          return value;
        });
        const result = await Promise.race([transfer, deadline]);
        if (disposed) return getState();
        emit({ status: 'ready', total: result.total, limited: result.status !== 'ok' });
        if (result.status === 'ok') void rememberRecorded({ request, storage, locks });
      } catch {
        if (!disposed) emit({ status: 'unavailable', total: null });
      } finally {
        if (timer !== null) timers.clearTimeout(timer);
        timer = null; controller = null; cancelDeadline = null;
      }
      return getState();
    })().finally(() => { pending = null; });
    return pending;
  }
  return { refresh, getState, destroy() { disposed = true; controller?.abort(); cancelDeadline?.(); if (timer !== null) timers.clearTimeout(timer); } };
}

const mounted = new WeakMap();
export function initCastleVisitCounter({ root, mount = root?.querySelector?.('#palace-entrance') } = {}) {
  if (!root || !mount) return null;
  if (mounted.has(root)) return mounted.get(root);
  const doc = root.ownerDocument, win = doc.defaultView;
  if (typeof win?.MutationObserver !== 'function') return null;
  const panel = doc.createElement('aside');
  panel.className = 'castle-visit-counter'; panel.id = 'castle-visit-counter'; panel.hidden = true;
  panel.setAttribute('role', 'status'); panel.setAttribute('aria-live', 'polite');
  const label = doc.createElement('span'); label.textContent = '累計訪問回数';
  const number = doc.createElement('strong'); number.textContent = '—';
  const note = doc.createElement('small'); note.textContent = '同じブラウザは1日1回';
  const scope = doc.createElement('small'); scope.textContent = '実人数ではありません';
  panel.append(label, number, note, scope); mount.append(panel);
  const visible = () => !doc.hidden && !doc.prerendering && !root.hidden && !root.inert
    && root.dataset.mode === 'halloween' && root.dataset.palaceState === 'palace'
    && ['ready', 'fallback'].includes(root.dataset.palaceReady) && root.dataset.archiveState === 'ready';
  const counter = createCastleVisitCounter({
    isVisible: visible,
    isAllowed: () => isPublicCastleLocation(win.location, win.navigator) && win.top === win.self,
    storage: () => win.localStorage, locks: win.navigator?.locks, crypto: win.crypto,
    fetchImpl: win.fetch?.bind(win), timers: win, AbortControllerImpl: win.AbortController,
    onState(state) {
      panel.dataset.status = state.status;
      number.textContent = state.total === null ? '—' : state.total.toLocaleString('ja-JP');
      note.textContent = state.status === 'unavailable' ? '集計を取得できません'
        : state.status === 'disabled' ? '公開ページで集計します'
        : state.status === 'loading' ? '集計を確認しています'
        : state.limited ? '一部の訪問は集計できません' : '同じブラウザは1日1回';
      panel.title = '設置後の累計訪問回数です。実人数ではありません。同じブラウザは日本時間で1日1回。保存できない端末では閲覧のみです。';
    },
  });
  function refresh() { panel.hidden = !visible(); void counter.refresh(); }
  const observer = new win.MutationObserver(refresh);
  observer.observe(root, { attributes: true, attributeFilter: ['data-mode', 'data-palace-state', 'data-palace-ready', 'data-archive-state', 'hidden', 'inert'] });
  doc.addEventListener('visibilitychange', refresh);
  win.addEventListener('pageshow', refresh);
  refresh();
  const api = { refresh, getState: counter.getState, destroy() { counter.destroy(); observer.disconnect(); doc.removeEventListener('visibilitychange', refresh); win.removeEventListener('pageshow', refresh); panel.remove(); mounted.delete(root); } };
  mounted.set(root, api);
  return api;
}
