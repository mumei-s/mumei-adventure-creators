import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_DISPLAY_KEY, normalizeGameDisplayPreferences, readGameDisplayPreferences,
  writeGameDisplayPreferences, createGameDisplayController, initGameDisplay,
} from '../game-display.js';

const defaults = { size: 100, controlSize: 100, side: 'left' };
const memoryStorage = entries => {
  const values = new Map(entries);
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('display choices clamp and snap to real slider steps, rejecting malformed settings', () => {
  for (const value of [undefined, null, [], true, 'bad']) assert.deepEqual(normalizeGameDisplayPreferences(value), defaults);
  assert.deepEqual(normalizeGameDisplayPreferences({ size: 0, controlSize: 200, side: 'right', audio: true }), { size: 70, controlSize: 125, side: 'right' });
  assert.deepEqual(normalizeGameDisplayPreferences({ size: 83, controlSize: 112, side: 'constructor' }), { size: 85, controlSize: 110, side: 'left' });
  assert.deepEqual(normalizeGameDisplayPreferences({ size: Infinity, controlSize: NaN }), defaults);
  assert.deepEqual(normalizeGameDisplayPreferences({ size: '75', controlSize: '120' }), defaults);
});

test('read/save touch only their independent key and recover from corrupt or denied storage', () => {
  const otherKey = 'halloween-exhibition:visitor-preferences:v1';
  const storage = memoryStorage([[otherKey, 'preserve-audio'], ['halloween-exhibition:labyrinth:v1', 'preserve-progress']]);
  assert.equal(writeGameDisplayPreferences(storage, { size: 75, controlSize: 120, side: 'right', music: true }), true);
  assert.deepEqual(readGameDisplayPreferences(storage), { size: 75, controlSize: 120, side: 'right' });
  assert.deepEqual(JSON.parse(storage.values.get(GAME_DISPLAY_KEY)), { size: 75, controlSize: 120, side: 'right' });
  assert.equal(storage.values.get(otherKey), 'preserve-audio');
  assert.equal(storage.values.get('halloween-exhibition:labyrinth:v1'), 'preserve-progress');
  storage.values.set(GAME_DISPLAY_KEY, '{bad');
  assert.deepEqual(readGameDisplayPreferences(storage), defaults);
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  assert.deepEqual(readGameDisplayPreferences(denied), defaults);
  assert.equal(writeGameDisplayPreferences(denied, defaults), false);
  assert.equal(writeGameDisplayPreferences(undefined, defaults), false);
});

test('controller notifies initial saved choices, preserves partial settings and applies changes when save fails', () => {
  const changes = [], saves = [];
  const storage = { getItem: () => '{"size":80,"controlSize":115,"side":"right"}', setItem() { throw Error('quota'); } };
  const controller = createGameDisplayController({ storage, onChange: value => changes.push(value), onPersistence: value => saves.push(value) });
  assert.deepEqual(changes, [{ size: 80, controlSize: 115, side: 'right' }]);
  assert.deepEqual(saves, []);
  controller.setPreferences({ size: 70 });
  assert.deepEqual(controller.getPreferences(), { size: 70, controlSize: 115, side: 'right' });
  assert.deepEqual(saves, [false]);
  changes.at(-1).size = 100;
  assert.equal(controller.getPreferences().size, 70);
  assert.deepEqual(controller.fitToScreen(), { size: 100, controlSize: 115, side: 'right' });
});

class Element {
  constructor(tagName) {
    this.tagName = tagName; this.children = []; this.attributes = {}; this.listeners = new Map(); this.dataset = {};
    const properties = new Map();
    this.style = { setProperty: (key, value) => properties.set(key, value), getPropertyValue: key => properties.get(key) || '' };
  }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(name, handler) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(handler); }
  removeEventListener(name, handler) { this.listeners.get(name)?.delete(handler); }
  emit(name) { return Promise.all([...this.listeners.get(name) || []].map(handler => handler({ target: this }))); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
}

function descendants(element) { return [element, ...element.children.flatMap(descendants)]; }
function byClass(element, name) { return descendants(element).find(child => child.className === name); }
function bySuffix(element, suffix) { return descendants(element).find(child => child.id?.endsWith(suffix)); }

async function withBrowser(run, storage = memoryStorage()) {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const doc = new Element('document'), root = new Element('html'), body = new Element('body'), parent = new Element('div');
  doc.documentElement = root; doc.body = body; doc.createElement = tag => new Element(tag); body.dataset.layout = 'existing-layout';
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  let display;
  try { await run({ doc, root, body, parent, storage, init(options) { display = initGameDisplay(options); return display; } }); }
  finally {
    display?.destroy();
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument); else delete globalThis.document;
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else delete globalThis.localStorage;
  }
}

test('UI-less startup applies saved scales and side without changing existing layout or creating controls', async () => {
  const storage = memoryStorage([[GAME_DISPLAY_KEY, '{"size":85,"controlSize":125,"side":"right"}']]);
  await withBrowser(({ init, body, root, doc }) => {
    const changes = [], display = init({ page: 'town', onChange: preferences => changes.push(preferences) });
    assert.equal(body.children.length, 0);
    assert.equal(root.style.getPropertyValue('--game-frame-scale'), '0.85');
    assert.equal(root.style.getPropertyValue('--game-control-scale'), '1.25');
    assert.deepEqual(body.dataset, { layout: 'existing-layout', gameControls: 'right', gameDisplay: 'town' });
    assert.equal(changes.length, 1);
    display.destroy();
    assert.equal(doc.listeners.get('fullscreenchange').size, 0);
    display.setPreferences({ size: 70 });
    assert.equal(root.style.getPropertyValue('--game-frame-scale'), '0.85');
  }, storage);
});

test('range, fit and side controls update both presentation and the independent saved preferences', async () => {
  await withBrowser(async ({ init, parent, root, body, storage }) => {
    const display = init({ controlsParent: parent });
    const frame = bySuffix(parent, '-frame'), controls = bySuffix(parent, '-controls'), side = byClass(parent, 'game-display-side');
    assert.deepEqual([frame.min, frame.max, frame.step], ['70', '100', '5']);
    assert.deepEqual([controls.min, controls.max, controls.step], ['100', '125', '5']);
    frame.value = '75'; await frame.emit('input');
    controls.value = '120'; await controls.emit('input');
    side.value = 'right'; await side.emit('change');
    assert.equal(root.style.getPropertyValue('--game-frame-scale'), '0.75');
    assert.equal(root.style.getPropertyValue('--game-control-scale'), '1.2');
    assert.equal(body.dataset.gameControls, 'right');
    await byClass(parent, 'game-display-fit').emit('click');
    assert.deepEqual(display.getPreferences(), { size: 100, controlSize: 120, side: 'right' });
    assert.deepEqual(JSON.parse(storage.values.get(GAME_DISPLAY_KEY)), display.getPreferences());
    assert.equal(frame.value, '100');
    display.destroy(); assert.equal(parent.children.length, 0);
  });
});

test('fullscreen requires a click, tracks enter/exit and external browser changes', async () => {
  await withBrowser(async ({ init, parent, root, doc }) => {
    let requests = 0, exits = 0;
    root.requestFullscreen = async function () { assert.equal(this, root); requests++; doc.fullscreenElement = root; await doc.emit('fullscreenchange'); };
    doc.exitFullscreen = async function () { assert.equal(this, doc); exits++; doc.fullscreenElement = null; await doc.emit('fullscreenchange'); };
    init({ controlsParent: parent });
    const button = byClass(parent, 'game-display-fullscreen');
    assert.equal(requests, 0); assert.equal(button.disabled, false); assert.equal(button.attributes['aria-pressed'], 'false');
    await button.emit('click');
    assert.equal(requests, 1); assert.equal(button.textContent, '全画面を解除'); assert.equal(button.attributes['aria-pressed'], 'true');
    await button.emit('click');
    assert.equal(exits, 1); assert.equal(button.textContent, '全画面にする');
    doc.fullscreenElement = root; await doc.emit('fullscreenchange');
    assert.equal(button.attributes['aria-pressed'], 'true');
    doc.fullscreenElement = null; await doc.emit('fullscreenchange');
    assert.equal(button.attributes['aria-pressed'], 'false');
  });
});

test('unsupported fullscreen stays explicit while denied storage leaves display controls usable', async () => {
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  await withBrowser(async ({ init, parent, root }) => {
    init({ controlsParent: parent });
    const button = byClass(parent, 'game-display-fullscreen'), status = byClass(parent, 'game-display-status');
    assert.equal(button.disabled, true); assert.match(status.textContent, /対応していません/);
    const frame = bySuffix(parent, '-frame'); frame.value = '80'; await frame.emit('input');
    assert.equal(root.style.getPropertyValue('--game-frame-scale'), '0.8');
    assert.match(status.textContent, /保存できません.*反映/);
  }, denied);
});

test('fullscreen reports synchronous and promise rejection, then permits retry', async () => {
  for (const fail of [() => { throw Error('blocked'); }, () => Promise.reject(Error('blocked'))]) {
    await withBrowser(async ({ init, parent, root, doc }) => {
      root.requestFullscreen = fail;
      doc.exitFullscreen = () => Promise.reject(Error('blocked'));
      init({ controlsParent: parent });
      const button = byClass(parent, 'game-display-fullscreen'), status = byClass(parent, 'game-display-status');
      await button.emit('click');
      assert.match(status.textContent, /全画面にできませんでした/); assert.equal(button.disabled, false);
      doc.fullscreenElement = root; await doc.emit('fullscreenchange'); await button.emit('click');
      assert.match(status.textContent, /解除できませんでした/); assert.equal(button.attributes['aria-pressed'], 'true');
    });
  }
});

test('WebKit fullscreen fallback supports void results and pending native requests cannot duplicate', async () => {
  await withBrowser(async ({ init, parent, root, doc }) => {
    let requests = 0;
    root.webkitRequestFullscreen = function () { requests++; doc.webkitFullscreenElement = root; doc.emit('webkitfullscreenchange'); };
    doc.webkitExitFullscreen = function () { doc.webkitFullscreenElement = null; doc.emit('webkitfullscreenchange'); };
    init({ controlsParent: parent });
    const button = byClass(parent, 'game-display-fullscreen');
    await button.emit('click'); assert.equal(requests, 1); assert.equal(button.attributes['aria-pressed'], 'true');
    await button.emit('click'); assert.equal(button.attributes['aria-pressed'], 'false');
    let release;
    root.webkitRequestFullscreen = () => { requests++; return new Promise(resolve => { release = resolve; }); };
    const pending = button.emit('click'); assert.equal(button.disabled, true);
    await button.emit('click'); assert.equal(requests, 2);
    release(); await pending; assert.equal(button.disabled, false);
  });
});

test('a blocked localStorage getter cannot stop initialization or local updates', async () => {
  await withBrowser(({ init, root }) => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('denied'); } });
    const display = init();
    display.setPreferences({ size: 90, controlSize: 110 });
    assert.equal(root.style.getPropertyValue('--game-frame-scale'), '0.9');
    assert.equal(root.style.getPropertyValue('--game-control-scale'), '1.1');
  });
});

test('closing and reopening settings on another game retains choices without leaving old controls active', async () => {
  await withBrowser(async ({ init, parent, root, body, doc }) => {
    const first = init({ controlsParent: parent, page: 'maze' });
    first.setPreferences({ size: 70, controlSize: 125, side: 'right' });
    const oldFrame = bySuffix(parent, '-frame');
    first.destroy();
    assert.equal(parent.children.length, 0);
    assert.equal(doc.listeners.get('fullscreenchange').size, 0);
    const second = init({ controlsParent: parent, page: 'town' });
    assert.deepEqual(second.getPreferences(), { size: 70, controlSize: 125, side: 'right' });
    assert.equal(body.dataset.gameDisplay, 'town');
    assert.equal(bySuffix(parent, '-frame').value, '70');
    assert.equal(bySuffix(parent, '-controls').value, '125');
    assert.equal(byClass(parent, 'game-display-side').value, 'right');
    assert.equal(doc.listeners.get('fullscreenchange').size, 1);
    oldFrame.value = '100'; await oldFrame.emit('input');
    assert.equal(root.style.getPropertyValue('--game-frame-scale'), '0.7');
    await byClass(parent, 'game-display-fit').emit('click');
    assert.deepEqual(second.getPreferences(), { size: 100, controlSize: 125, side: 'right' });
  });
});
