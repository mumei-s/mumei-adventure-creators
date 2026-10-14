/** A visitor-initiated palace gate. It never changes articles or opens their links. */
export const PALACE_OPENING_MS = 600;
export const PALACE_WALK_MS = 550;

const validMode = value => value === 'halloween' || value === 'normal';
const browserTimers = {
  // Browser timer methods must keep their Window receiver, even in an ES module.
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: handle => globalThis.clearTimeout(handle),
};

/** Deterministic state machine; timers and environment readings can be injected. */
export function createPalaceEntranceController({
  initialMode = 'halloween',
  timers = browserTimers,
  reducedMotion = () => false,
  motionPaused = () => false,
  hidden = () => false,
  onChange = () => {},
} = {}) {
  let mode = validMode(initialMode) ? initialMode : 'halloween';
  let view = mode === 'normal' ? 'gallery' : 'palace';
  let opening = false, walking = false, disposed = false, timer = null, version = 0, pendingFocus = false;
  const getState = () => ({ mode, view, opening, walking });
  const notify = (focus = false, reason = 'navigation') => {
    onChange(getState(), { focus: Boolean(focus && !hidden()), reason });
    return getState();
  };
  function cancelPending() {
    version++;
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
    pendingFocus = false;
  }
  function finish({ focus = pendingFocus } = {}) {
    if (disposed || !opening) return getState();
    cancelPending();
    opening = false; walking = false;
    view = 'gallery';
    return notify(focus);
  }
  function enter({ immediate = false, focus = true } = {}) {
    if (disposed || view === 'gallery') return getState();
    const skipMotion = immediate || reducedMotion() || motionPaused() || hidden();
    // Repeated clicks do not restart or multiply the deadline.
    if (opening && !skipMotion) return getState();
    cancelPending();
    if (skipMotion) {
      opening = false; walking = false;
      view = 'gallery';
      return notify(focus);
    }
    opening = true;
    pendingFocus = focus;
    const token = version;
    notify(false);
    // A host callback may already have navigated away during notification.
    if (disposed || token !== version || !opening) return getState();
    timer = timers.setTimeout(() => {
      if (disposed || token !== version || !opening) return;
      timer = null;
      walking = true;
      notify(false);
      if (disposed || token !== version || !opening) return;
      timer = timers.setTimeout(() => {
        if (disposed || token !== version || !opening) return;
        timer = null;
        finish();
      }, PALACE_WALK_MS);
    }, PALACE_OPENING_MS);
    return getState();
  }
  function home({ focus = true } = {}) {
    if (disposed) return getState();
    cancelPending();
    opening = false; walking = false;
    view = mode === 'normal' ? 'gallery' : 'palace';
    return notify(focus);
  }
  function setMode(value) {
    if (disposed || !validMode(value)) return false;
    if (value === mode) return true;
    cancelPending();
    mode = value;
    opening = false; walking = false;
    view = mode === 'normal' ? 'gallery' : 'palace';
    notify(false, 'mode');
    return true;
  }
  function refreshEnvironment() {
    if (!disposed && opening && (hidden() || reducedMotion() || motionPaused())) {
      return finish({ focus: pendingFocus && !hidden() });
    }
    return getState();
  }
  function destroy() {
    if (disposed) return;
    const wasOpening = opening;
    cancelPending();
    disposed = true;
    opening = false; walking = false;
    // Disposing during an opening leaves a closed, usable view, not aria-busy.
    if (wasOpening) notify(false, 'destroy');
  }
  notify(false, 'initial');
  return { getState, enter, home, setMode, refreshEnvironment, finish, destroy };
}

const instances = new WeakMap();
const statusText = ({ mode, view, opening, walking }) => mode === 'normal'
  ? '通常展示を表示しています。'
  : walking
    ? '宮殿の中へ進んでいます。まもなく記事の展示室です。'
    : opening
    ? '大きな扉を開いています。まもなく記事の展示室へ入ります。'
    : view === 'gallery'
      ? '記事の展示室へようこそ。気になる扉を選んでください。'
      : '大きな扉を押して、記事の展示室へお入りください。';

/**
 * Attach to native buttons and the two distinct views. The host owns loading
 * disabled states. The door leaves open first, followed by one bounded visitor-triggered step forward.
 */
export function initPalaceEntrance({ root, initialMode = 'halloween', onViewChange = () => {}, timers } = {}) {
  if (!root?.querySelector || !root.dataset) return null;
  if (instances.has(root)) return instances.get(root);
  const palace = root.querySelector('#palace-entrance');
  const gate = root.querySelector('#palace-gate');
  const status = root.querySelector('#palace-status');
  const gallery = root.querySelector('#article-theater');
  const back = root.querySelector('#palace-return');
  if (!palace || !gate || !status || !gallery || !back || gate.tagName !== 'BUTTON' || back.tagName !== 'BUTTON') return null;
  const doc = root.ownerDocument;
  const win = doc?.defaultView;
  const media = win?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const isHidden = () => Boolean(doc?.hidden);
  const listeners = [];
  const listen = (target, name, callback) => {
    if (!target?.addEventListener) return;
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
  const show = (element, visible) => {
    element.hidden = !visible;
    element.inert = !visible;
    if (visible) element.removeAttribute('inert');
    else element.setAttribute('inert', '');
  };
  const isVisible = element => element && element.isConnected !== false && !element.hidden && !element.inert && !element.closest?.('[hidden], [inert]');
  const focusView = view => {
    if (isHidden()) return;
    const candidates = view === 'palace' ? [gate] : [gallery.querySelector('#room-title'), gallery.querySelector('#stage'), gallery];
    const target = candidates.find(isVisible);
    if (!target || target.disabled) return;
    if (target !== gate && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus?.({ preventScroll: true });
  };
  gate.type = 'button';
  back.type = 'button';
  gate.setAttribute('aria-controls', 'article-theater');
  const describedBy = new Set((gate.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  describedBy.add('palace-status');
  gate.setAttribute('aria-describedby', [...describedBy].join(' '));
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  const controller = createPalaceEntranceController({
    initialMode,
    timers: timers || (win ? {
      setTimeout: (callback, delay) => win.setTimeout(callback, delay),
      clearTimeout: handle => win.clearTimeout(handle),
    } : browserTimers),
    reducedMotion: () => Boolean(media?.matches),
    motionPaused: () => root.dataset.motionPaused === 'true',
    hidden: isHidden,
    onChange(state, { focus, reason }) {
      const galleryVisible = state.view === 'gallery';
      const hiddenView = galleryVisible ? palace : gallery;
      const restoreHiddenFocus = reason === 'mode' && hiddenView.contains(doc?.activeElement);
      root.dataset.palaceState = state.walking ? 'walking' : state.opening ? 'opening' : state.view;
      show(palace, !galleryVisible);
      show(gallery, galleryVisible);
      back.hidden = state.mode !== 'halloween' || !galleryVisible;
      gate.setAttribute('aria-expanded', String(galleryVisible));
      gate.setAttribute('aria-busy', String(state.opening));
      const text = statusText(state);
      if (status.textContent !== text) status.textContent = text;
      if (focus || restoreHiddenFocus) focusView(state.view);
      onViewChange({ view: state.view, opening: state.opening });
    },
  });
  listen(gate, 'click', () => { if (!gate.disabled) controller.enter(); });
  listen(back, 'click', () => { if (!back.disabled) controller.home(); });
  listen(doc, 'visibilitychange', () => controller.refreshEnvironment());
  listen(root, 'yearbook:motion-state', () => controller.refreshEnvironment());
  listen(win, 'pagehide', () => controller.finish({ focus: false }));
  if (media?.addEventListener) listen(media, 'change', () => controller.refreshEnvironment());
  else if (media?.addListener) {
    const changed = () => controller.refreshEnvironment();
    media.addListener(changed);
    listeners.push(() => media.removeListener(changed));
  }
  const instance = {
    getState: controller.getState,
    enter: controller.enter,
    home: controller.home,
    setMode: controller.setMode,
    destroy() {
      for (const remove of listeners.splice(0)) remove();
      controller.destroy();
      if (instances.get(root) === instance) instances.delete(root);
    },
  };
  instances.set(root, instance);
  return instance;
}
