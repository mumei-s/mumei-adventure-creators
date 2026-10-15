import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAppExitController, initAppExit } from '../app-exit.js';

function setup({ state = 'palace', closeThrows = false } = {}) {
  const calls = []; let view = state;
  const controller = createAppExitController({ canExit: () => view === 'palace', stop: () => calls.push('stop'), resume: () => calls.push('resume'), render: ended => calls.push(ended ? 'ended-screen' : 'castle-screen'), close: () => { calls.push('close-attempt'); if (closeThrows) throw Error('blocked'); } });
  return { controller, calls, setView: value => { view = value; } };
}
test('only the stable castle permits exit; opening, walking and gallery never close', () => {
  for (const state of ['gallery', 'opening', 'walking', 'normal', undefined]) {
    const h = setup({ state: state ?? 'unknown' });
    assert.equal(h.controller.end(), false); assert.deepEqual(h.calls, []); assert.equal(h.controller.getState().ended, false);
  }
});
test('exit stops work and renders the fallback before one synchronous close attempt', () => {
  const h = setup(); assert.equal(h.controller.end(), true);
  assert.deepEqual(h.calls, ['stop', 'ended-screen', 'close-attempt']);
  assert.equal(h.controller.end(), false); assert.equal(h.calls.length, 3);
});
test('refused and throwing close leave an honest stopped screen and allow explicit resume', () => {
  for (const closeThrows of [false, true]) {
    const h = setup({ closeThrows }); h.controller.end(); assert.equal(h.controller.getState().ended, true);
    assert.equal(h.controller.resume(), true); assert.equal(h.controller.getState().ended, false);
    assert.deepEqual(h.calls.slice(-2), ['resume', 'castle-screen']);
    assert.equal(h.controller.resume(), false); assert.equal(h.controller.end(), true);
    assert.equal(h.calls.filter(v => v === 'close-attempt').length, 2);
  }
});
class Element {
  constructor(doc, tagName = 'div') { Object.assign(this, { ownerDocument: doc, tagName, children: [], attributes: new Map(), handlers: new Map(), dataset: {}, hidden: false, inert: false, disabled: false, textContent: '' }); }
  append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(name, handler) { this.handlers.set(name, handler); }
  removeEventListener(name) { this.handlers.delete(name); }
  click() { if (!this.disabled) this.handlers.get('click')?.(); }
  focus() { for (let el = this; el; el = el.parentElement) assert.equal(el.hidden || el.inert, false); this.ownerDocument.activeElement = this; }
  querySelector(selector) { for (const child of this.children) { if (selector === '#' + child.id) return child; const found = child.querySelector(selector); if (found) return found; } return null; }
  remove() { this.parentElement.children = this.parentElement.children.filter(el => el !== this); }
}
function dom({ standalone = false, ios = false } = {}) {
  const doc = new Element(null); doc.hidden = false; doc.createElement = tag => new Element(doc, tag);
  const calls = [], observers = [];
  doc.defaultView = { navigator: { standalone: ios }, matchMedia: () => ({ matches: standalone }), close: () => calls.push('close'), MutationObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() {} } };
  doc.body = doc.createElement('body'); const root = doc.createElement('main'), toolbar = doc.createElement('nav'), gate = doc.createElement('button'); gate.id = 'palace-gate';
  root.dataset.palaceState = 'palace'; root.append(toolbar, gate); doc.body.append(root);
  const dialog = { close() { calls.push('dialog-close'); } }; doc.querySelectorAll = () => [dialog];
  const api = initAppExit({ root, triggerParent: toolbar, onStop: () => calls.push('stop'), onResume: () => calls.push('resume') });
  const trigger = root.querySelector('#app-exit'), screen = doc.body.querySelector('#app-ended-screen');
  return { doc, root, gate, trigger, screen, api, calls, observers };
}
test('DOM exit hides and inerts the app, focuses the end heading, and resumes the castle', () => {
  const h = dom(); assert.equal(h.trigger.hidden, false); h.trigger.click();
  assert.deepEqual(h.calls, ['dialog-close', 'stop', 'close']); assert.equal(h.root.hidden, true); assert.equal(h.root.inert, true);
  assert.equal(h.screen.hidden, false); assert.equal(h.doc.activeElement.id, 'app-ended-title');
  assert.match(h.screen.children[2].textContent, /ブラウザのタブ/); assert.equal(h.doc.body.dataset.appEnded, 'true');
  h.screen.children[3].click(); assert.equal(h.root.hidden, false); assert.equal(h.root.inert, false); assert.equal(h.screen.hidden, true);
  assert.equal(h.doc.body.dataset.appEnded, undefined); assert.equal(h.doc.activeElement, h.gate); assert.equal(h.trigger.hidden, false);
});
test('castle exit disappears during transitions and ignores stale direct calls', () => {
  const h = dom();
  for (const state of ['opening', 'walking', 'gallery']) {
    h.root.dataset.palaceState = state; h.observers[0].callback();
    assert.equal(h.trigger.hidden, true); assert.equal(h.trigger.disabled, true); assert.equal(h.api.end(), false);
  }
  h.root.dataset.palaceState = 'palace'; h.api.refresh(); assert.equal(h.trigger.hidden, false);
  h.doc.hidden = true; h.api.refresh(); assert.equal(h.api.end(), false); assert.deepEqual(h.calls, []);
});
test('standalone guidance never promises the OS app is closed; loading castle can regain focus', () => {
  for (const flags of [{ standalone: true }, { ios: true }]) {
    const h = dom(flags); h.gate.disabled = true; h.trigger.click();
    assert.match(h.screen.children[2].textContent, /端末の操作でアプリ画面を閉じて/);
    assert.doesNotMatch(h.screen.children[2].textContent, /終了しました|閉じました/);
    h.api.resume(); assert.equal(h.doc.activeElement, h.trigger);
  }
});
test('exit has no navigation workaround, preference reset, or automatic lifecycle trigger', async () => {
  const source = await readFile(new URL('../app-exit.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /history\.(back|go)|about:blank|window\.open|location\.(href|replace|assign)|localStorage\.(clear|removeItem)|beforeunload/);
  assert.match(source, /close: \(\) => win\.close\(\)/);
  assert.match(source, /trigger\.addEventListener\('click', \(\) => controller\.end\(\)\)/);
});
