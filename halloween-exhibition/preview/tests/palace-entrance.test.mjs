import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PALACE_OPENING_MS, createPalaceEntranceController, initPalaceEntrance } from '../palace-entrance.js';

class FakeTimers {
  now = 0;
  next = 0;
  jobs = new Map();
  historical = new Map();
  maxPending = 0;
  setTimeout(callback, delay) {
    const id = this.next++;
    const job = { callback, due: this.now + delay };
    this.jobs.set(id, job);
    this.historical.set(id, job);
    this.maxPending = Math.max(this.maxPending, this.jobs.size);
    return id;
  }
  clearTimeout(id) { this.jobs.delete(id); }
  tick(ms) {
    const end = this.now + ms;
    while (true) {
      const next = [...this.jobs].filter(([, job]) => job.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      this.now = next[1].due;
      this.jobs.delete(next[0]);
      next[1].callback();
    }
    this.now = end;
  }
  fireCancelled(id) { this.historical.get(id).callback(); }
}
function setup(options = {}) {
  const timers = new FakeTimers(), states = [];
  const controller = createPalaceEntranceController({ timers, onChange: (state, meta) => states.push({ ...state, ...meta }), ...options });
  return { controller, timers, states };
}

class Events {
  listeners = new Map();
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
  }
  removeEventListener(name, callback) {
    this.listeners.get(name)?.delete(callback);
    if (!this.listeners.get(name)?.size) this.listeners.delete(name);
  }
  dispatch(name, detail) {
    for (const callback of [...this.listeners.get(name) || []]) callback({ type: name, target: this, detail });
  }
}
class Element extends Events {
  constructor(doc, tagName, id = '') {
    super();
    Object.assign(this, { ownerDocument: doc, tagName: tagName.toUpperCase(), id, children: [], dataset: {}, attributes: new Map(), hidden: false, inert: false, disabled: false, isConnected: true, textContent: '', focusCalls: [] });
  }
  append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
  querySelector(selector) {
    for (const child of this.children) {
      if (selector === `#${child.id}`) return child;
      const match = child.querySelector(selector);
      if (match) return match;
    }
    return null;
  }
  contains(element) { return Boolean(element && (element === this || this.children.some(child => child.contains(element)))); }
  closest(selector) {
    assert.equal(selector, '[hidden], [inert]');
    for (let node = this; node; node = node.parentElement) if (node.hidden || node.inert) return node;
    return null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus(options) {
    assert.equal(this.closest('[hidden], [inert]'), null, 'focus must never enter a hidden or inert view');
    assert.equal(this.ownerDocument.hidden, false, 'focus must not move in a hidden tab');
    this.ownerDocument.activeElement = this;
    this.focusCalls.push(options);
  }
  click() { if (!this.disabled) this.dispatch('click'); }
}
function dom({ mode = 'halloween', paused = false, reduced = false, disabled = false, legacyMedia = false } = {}) {
  const timers = new FakeTimers(), doc = new Events(), win = new Events(), media = new Events();
  doc.hidden = false;
  doc.defaultView = win;
  media.matches = reduced;
  win.matchMedia = function(query) {
    assert.equal(this, win, 'matchMedia must keep its Window receiver');
    assert.equal(query, '(prefers-reduced-motion: reduce)');
    return media;
  };
  win.setTimeout = function(callback, delay) {
    assert.equal(this, win, 'setTimeout must keep its Window receiver');
    return timers.setTimeout(callback, delay);
  };
  win.clearTimeout = function(handle) {
    assert.equal(this, win, 'clearTimeout must keep its Window receiver');
    timers.clearTimeout(handle);
  };
  if (legacyMedia) {
    media.addListener = callback => Events.prototype.addEventListener.call(media, 'change', callback);
    media.removeListener = callback => Events.prototype.removeEventListener.call(media, 'change', callback);
    media.addEventListener = undefined;
  }
  const root = new Element(doc, 'main', 'theater');
  const palace = new Element(doc, 'section', 'palace-entrance');
  const gate = new Element(doc, 'button', 'palace-gate');
  const status = new Element(doc, 'p', 'palace-status');
  const gallery = new Element(doc, 'div', 'article-theater');
  const back = new Element(doc, 'button', 'palace-return');
  const stage = new Element(doc, 'section', 'stage');
  const heading = new Element(doc, 'h1', 'room-title');
  const header = new Element(doc, 'button', 'mode-normal');
  root.append(header, palace, gallery);
  palace.append(gate, status);
  gallery.append(back, stage);
  stage.append(heading);
  root.dataset.motionPaused = String(paused);
  gate.disabled = disabled;
  gate.setAttribute('aria-describedby', 'gate-help');
  const views = [];
  const controller = initPalaceEntrance({ root, initialMode: mode, onViewChange: state => views.push(state) });
  return { controller, timers, doc, win, media, root, palace, gate, status, gallery, back, stage, heading, header, views };
}

// Pure transition tests deliberately invoke cancelled callbacks as a hostile scheduler.
test('Halloween waits at the palace indefinitely; normal starts in the gallery', () => {
  const { controller, timers, states } = setup();
  assert.deepEqual(controller.getState(), { mode: 'halloween', view: 'palace', opening: false });
  timers.tick(60_000);
  assert.equal(states.length, 1);
  assert.equal(timers.jobs.size, 0);
  assert.equal(states[0].focus, false);
  assert.deepEqual(setup({ initialMode: 'normal' }).controller.getState(), { mode: 'normal', view: 'gallery', opening: false });
  assert.equal(setup({ initialMode: 'invalid' }).controller.getState().mode, 'halloween');
});

test('one click opens in at most 650 ms, keeping the palace visible until completion', () => {
  const { controller, timers, states } = setup();
  assert.ok(PALACE_OPENING_MS > 0 && PALACE_OPENING_MS <= 650);
  controller.enter();
  assert.deepEqual(controller.getState(), { mode: 'halloween', view: 'palace', opening: true });
  timers.tick(PALACE_OPENING_MS - 1);
  assert.equal(controller.getState().view, 'palace');
  timers.tick(1);
  assert.deepEqual(controller.getState(), { mode: 'halloween', view: 'gallery', opening: false });
  assert.equal(states.at(-1).focus, true);
  assert.equal(timers.jobs.size, 0);
});

test('repeated clicks never delay completion, multiply timers or refocus the gallery', () => {
  const { controller, timers, states } = setup();
  controller.enter();
  timers.tick(200);
  for (let i = 0; i < 30; i++) controller.enter();
  timers.tick(PALACE_OPENING_MS - 200);
  assert.equal(controller.getState().view, 'gallery');
  controller.enter();
  assert.equal(states.filter(state => state.focus).length, 1);
  assert.equal(timers.maxPending, 1);
  assert.equal(states.length, 3);
});

test('home cancels timer zero and a stale callback cannot complete a newer opening', () => {
  const { controller, timers } = setup();
  controller.enter();
  controller.home();
  assert.equal(timers.jobs.size, 0, 'timer handle zero is still cancellable');
  controller.enter();
  timers.fireCancelled(0);
  assert.equal(controller.getState().opening, true);
  assert.equal(controller.getState().view, 'palace');
  timers.tick(PALACE_OPENING_MS);
  assert.equal(controller.getState().view, 'gallery');
});

test('explicit immediate navigation cancels an opening without stealing requested focus', () => {
  const { controller, timers, states } = setup();
  controller.enter();
  controller.enter({ immediate: true, focus: false });
  assert.equal(controller.getState().view, 'gallery');
  assert.equal(states.at(-1).focus, false);
  const count = states.length;
  timers.fireCancelled(0);
  assert.equal(states.length, count);
  assert.equal(timers.jobs.size, 0);
});

test('switching modes cancels transitions, preserves a same-mode visit, and rejects invalid modes', () => {
  const { controller, timers } = setup();
  controller.enter();
  assert.equal(controller.setMode('normal'), true);
  assert.deepEqual(controller.getState(), { mode: 'normal', view: 'gallery', opening: false });
  timers.fireCancelled(0);
  controller.home();
  assert.equal(controller.getState().view, 'gallery');
  assert.equal(controller.setMode('other'), false);
  controller.setMode('halloween');
  assert.equal(controller.getState().view, 'palace');
  controller.enter({ immediate: true });
  controller.setMode('halloween');
  assert.equal(controller.getState().view, 'gallery', 'idempotent mode updates do not reset navigation');
  assert.equal(timers.jobs.size, 0);
});

test('reduced motion, paused motion and hidden tabs enter immediately without animation timers', () => {
  for (const option of ['reducedMotion', 'motionPaused', 'hidden']) {
    const { controller, timers, states } = setup({ [option]: () => true });
    controller.enter();
    assert.equal(controller.getState().view, 'gallery', option);
    assert.equal(controller.getState().opening, false, option);
    assert.equal(timers.jobs.size, 0, option);
    assert.equal(states.at(-1).focus, option !== 'hidden', option);
  }
});

test('motion changes finish in-flight openings; hidden tabs finish without delayed focus', () => {
  for (const option of ['reducedMotion', 'motionPaused', 'hidden']) {
    let active = false;
    const { controller, timers, states } = setup({ [option]: () => active });
    controller.enter();
    active = true;
    controller.refreshEnvironment();
    assert.equal(controller.getState().view, 'gallery', option);
    assert.equal(states.at(-1).focus, option !== 'hidden', option);
    const count = states.length;
    active = false;
    controller.refreshEnvironment();
    timers.fireCancelled(0);
    assert.equal(states.length, count, 'restoring visibility cannot replay the entrance or focus');
  }
});

test('destroy resets an interrupted opening and prevents every later transition', () => {
  const { controller, timers, states } = setup();
  controller.enter();
  controller.destroy();
  assert.deepEqual(controller.getState(), { mode: 'halloween', view: 'palace', opening: false });
  const count = states.length;
  controller.enter();
  controller.home();
  controller.finish();
  controller.refreshEnvironment();
  assert.equal(controller.setMode('normal'), false);
  timers.fireCancelled(0);
  controller.destroy();
  assert.equal(states.length, count);
  assert.equal(timers.jobs.size, 0);
});

test('host navigation during an opening notification cannot leave a stray timer', () => {
  const timers = new FakeTimers();
  let controller;
  controller = createPalaceEntranceController({ timers, onChange: state => { if (state.opening) controller.home({ focus: false }); } });
  controller.enter();
  assert.equal(controller.getState().opening, false);
  assert.equal(controller.getState().view, 'palace');
  assert.equal(timers.jobs.size, 0);
});

// DOM contracts complement, rather than pretend to replace, browser keyboard/focus QA.
test('initializer needs the full native-button contract and does not auto-enter or focus', () => {
  assert.equal(initPalaceEntrance(), null);
  assert.equal(initPalaceEntrance({ root: {} }), null);
  const f = dom();
  assert.equal(f.root.dataset.palaceState, 'palace');
  assert.equal(f.palace.hidden, false);
  assert.equal(f.gallery.hidden, true);
  assert.equal(f.gallery.inert, true);
  assert.equal(f.gallery.hasAttribute('inert'), true);
  assert.equal(f.back.hidden, true);
  assert.equal(f.doc.activeElement, undefined);
  assert.equal(f.gate.getAttribute('aria-expanded'), 'false');
  assert.equal(f.gate.getAttribute('aria-busy'), 'false');
  assert.equal(f.status.getAttribute('role'), 'status');
  assert.equal(f.status.getAttribute('aria-live'), 'polite');
  assert.match(f.status.textContent, /大きな扉を押して/);
  f.controller.destroy();
  f.gate.tagName = 'DIV';
  assert.equal(initPalaceEntrance({ root: f.root }), null, 'a div is not a keyboard-operable substitute');
});

test('DOM opening updates only its state, then reveals the gallery before focusing the heading', () => {
  const f = dom();
  f.gate.click();
  assert.equal(f.root.dataset.palaceState, 'opening');
  assert.equal(f.gallery.hidden, true);
  assert.equal(f.palace.inert, false);
  assert.equal(f.gate.getAttribute('aria-expanded'), 'false');
  assert.equal(f.gate.getAttribute('aria-busy'), 'true');
  assert.match(f.status.textContent, /開いています/);
  assert.equal(f.heading.focusCalls.length, 0);
  f.timers.tick(PALACE_OPENING_MS);
  assert.equal(f.root.dataset.palaceState, 'gallery');
  assert.equal(f.palace.hidden, true);
  assert.equal(f.palace.inert, true);
  assert.equal(f.gallery.hidden, false);
  assert.equal(f.gallery.inert, false);
  assert.equal(f.gallery.hasAttribute('inert'), false);
  assert.equal(f.back.hidden, false);
  assert.equal(f.gate.getAttribute('aria-busy'), 'false');
  assert.equal(f.gate.getAttribute('aria-expanded'), 'true');
  assert.match(f.status.textContent, /展示室へようこそ/);
  assert.equal(f.heading.getAttribute('tabindex'), '-1');
  assert.deepEqual(f.heading.focusCalls, [{ preventScroll: true }]);
  assert.deepEqual(f.views, [{ view: 'palace', opening: false }, { view: 'palace', opening: true }, { view: 'gallery', opening: false }]);
  f.back.click();
  assert.equal(f.root.dataset.palaceState, 'palace');
  assert.equal(f.gallery.hidden, true);
  assert.equal(f.doc.activeElement, f.gate);
  assert.equal(f.gate.focusCalls.length, 1);
});

test('load-owned disabled state survives setup, transitions and mode changes', () => {
  const f = dom({ disabled: true });
  assert.equal(f.gate.disabled, true);
  f.gate.dispatch('click');
  assert.equal(f.root.dataset.palaceState, 'palace');
  f.controller.enter({ immediate: true, focus: false });
  f.controller.home({ focus: false });
  f.controller.setMode('normal');
  f.controller.setMode('halloween');
  assert.equal(f.gate.disabled, true);
  assert.equal(f.timers.jobs.size, 0);
  f.gate.disabled = false;
  f.gate.click();
  assert.equal(f.gate.disabled, false, 'opening does not override the host disabled state');
  assert.equal(f.root.dataset.palaceState, 'opening');
});

test('normal DOM mode hides the palace and return control and keeps gallery navigation available', () => {
  const f = dom({ mode: 'normal' });
  assert.equal(f.palace.hidden, true);
  assert.equal(f.palace.inert, true);
  assert.equal(f.gallery.hidden, false);
  assert.equal(f.gallery.inert, false);
  assert.equal(f.back.hidden, true);
  assert.equal(f.root.dataset.palaceState, 'gallery');
  assert.match(f.status.textContent, /通常展示/);
  f.controller.home({ focus: false });
  assert.equal(f.root.dataset.palaceState, 'gallery');
  f.controller.setMode('halloween');
  assert.equal(f.root.dataset.palaceState, 'palace');
});

test('native buttons retain standard Enter/Space activation without custom keyboard handlers', () => {
  const f = dom();
  assert.equal(f.gate.tagName, 'BUTTON');
  assert.equal(f.gate.type, 'button');
  assert.equal(f.back.type, 'button');
  assert.equal(f.gate.getAttribute('aria-controls'), 'article-theater');
  assert.equal(f.gate.getAttribute('aria-describedby'), 'gate-help palace-status');
  assert.deepEqual([...f.gate.listeners.keys()], ['click']);
  assert.deepEqual([...f.back.listeners.keys()], ['click']);
  assert.equal(f.doc.listeners.has('keydown'), false);
  assert.equal(f.root.listeners.has('keydown'), false);
  f.gate.click(); // This is the browser's common activation path for pointer, Enter and Space.
  f.gate.click();
  assert.equal(f.timers.jobs.size, 1);
  f.timers.tick(PALACE_OPENING_MS);
  assert.equal(f.heading.focusCalls.length, 1);
});

test('visibility and pagehide safely complete openings without focusing a hidden document', () => {
  for (const event of ['visibilitychange', 'pagehide']) {
    const f = dom();
    f.gate.click();
    if (event === 'visibilitychange') { f.doc.hidden = true; f.doc.dispatch(event); }
    else f.win.dispatch(event);
    assert.equal(f.root.dataset.palaceState, 'gallery', event);
    assert.equal(f.gate.getAttribute('aria-busy'), 'false', event);
    assert.equal(f.heading.focusCalls.length, 0, event);
    assert.equal(f.timers.jobs.size, 0, event);
    f.timers.fireCancelled(0);
    f.doc.hidden = false;
    f.doc.dispatch('visibilitychange');
    assert.equal(f.heading.focusCalls.length, 0, event);
  }
});

test('motion-state and modern/legacy media events finish safely; pre-existing pause enters instantly', () => {
  for (const options of [{ reduced: true }, { paused: true }]) {
    const f = dom(options);
    f.gate.click();
    assert.equal(f.root.dataset.palaceState, 'gallery');
    assert.equal(f.timers.jobs.size, 0);
  }
  for (const legacyMedia of [false, true]) {
    const f = dom({ legacyMedia });
    f.gate.click();
    f.media.matches = true;
    f.media.dispatch('change');
    assert.equal(f.root.dataset.palaceState, 'gallery');
    assert.equal(f.heading.focusCalls.length, 1);
    f.controller.destroy();
    assert.equal(f.media.listeners.size, 0);
  }
  const f = dom();
  f.gate.click();
  f.root.dataset.motionPaused = 'true';
  f.root.dispatch('yearbook:motion-state', { paused: true });
  assert.equal(f.root.dataset.palaceState, 'gallery');
  assert.equal(f.timers.jobs.size, 0);
});

test('mode changes restore only focus that would become hidden', () => {
  const f = dom();
  f.header.focus();
  f.controller.setMode('normal');
  assert.equal(f.doc.activeElement, f.header, 'visible mode controls keep focus');
  f.heading.focus();
  f.controller.setMode('halloween');
  assert.equal(f.doc.activeElement, f.gate, 'a newly hidden gallery cannot retain focus');
  f.controller.setMode('normal');
  assert.equal(f.doc.activeElement, f.heading, 'a newly hidden gate cannot retain focus');
});

test('explicit focus false is respected and a hidden or empty stage falls back to the wrapper', () => {
  const f = dom();
  f.controller.enter({ immediate: true, focus: false });
  assert.equal(f.doc.activeElement, undefined);
  f.controller.home({ focus: false });
  f.stage.hidden = true;
  f.controller.enter({ immediate: true });
  assert.equal(f.doc.activeElement, f.gallery);
  assert.equal(f.gallery.getAttribute('tabindex'), '-1');
  assert.equal(f.heading.focusCalls.length, 0);
});

test('destroy cleans all listeners and stale timers, and initialization never duplicates handlers', () => {
  const f = dom();
  assert.equal(initPalaceEntrance({ root: f.root }), f.controller);
  assert.equal(f.gate.listeners.get('click').size, 1);
  f.gate.click();
  f.controller.destroy();
  assert.equal(f.root.dataset.palaceState, 'palace');
  assert.equal(f.gate.getAttribute('aria-busy'), 'false');
  for (const target of [f.gate, f.back, f.doc, f.win, f.media, f.root]) assert.equal(target.listeners.size, 0);
  f.timers.fireCancelled(0);
  f.gate.click();
  assert.equal(f.root.dataset.palaceState, 'palace');
  const second = initPalaceEntrance({ root: f.root });
  assert.notEqual(second, f.controller);
  f.controller.destroy();
  assert.equal(initPalaceEntrance({ root: f.root }), second, 'disposing an old instance cannot unmount its replacement');
  second.destroy();
});

test('gate controller has no storage, network, external navigation, camera or keyboard interception', async () => {
  const source = await readFile(new URL('../palace-entrance.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|window\.open|location\s*[.=]|\.style\b|keydown|keyup|preventDefault/);
  assert.match(source, /setTimeout: \(callback, delay\) => win\.setTimeout\(callback, delay\)/);
});
