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
  querySelector(selector) { for (const child of this.children) { if (selector === '#' + child.id || (selector.startsWith('.') && (child.className || '').split(' ').includes(selector.slice(1)))) return child; const found = child.querySelector(selector); if (found) return found; } return null; }
  remove() { this.parentElement.children = this.parentElement.children.filter(el => el !== this); }
}
function dom({ standalone = false, ios = false } = {}) {
  const doc = new Element(null); doc.hidden = false; doc.createElement = tag => new Element(doc, tag);
  const calls = [], observers = [];
  doc.defaultView = { navigator: { standalone: ios }, matchMedia: () => ({ matches: standalone }), close: () => calls.push('close'), MutationObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() {} } };
  doc.body = doc.createElement('body'); const root = doc.createElement('main'), header = doc.createElement('header'), toolbar = doc.createElement('nav'), gate = doc.createElement('button'); header.className = 'masthead'; toolbar.className = 'header-actions'; gate.id = 'palace-gate';
  root.dataset.palaceState = 'palace'; header.append(toolbar); root.append(header, gate); doc.body.append(root);
  const dialog = { close() { calls.push('dialog-close'); } }; doc.querySelectorAll = () => [dialog];
  const api = initAppExit({ root, triggerParent: toolbar, onStop: () => calls.push('stop'), onResume: () => calls.push('resume') });
  const trigger = root.querySelector('#app-exit'), screen = doc.body.querySelector('#app-ended-screen');
  return { doc, root, header, toolbar, gate, trigger, panel: root.querySelector('#castle-exit-panel'), screen, api, calls, observers };
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
    assert.equal(h.panel.hidden, true); assert.equal(h.panel.inert, true); assert.equal(h.trigger.hidden, true); assert.equal(h.trigger.disabled, true); assert.equal(h.api.end(), false);
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

test('castle exit has its own header row outside the scrolling action strip', () => {
  const h = dom();
  assert.equal(h.panel.parentElement, h.header); assert.equal(h.trigger.parentElement, h.panel);
  assert.equal(h.toolbar.querySelector('#app-exit'), null);
  assert.equal(h.panel.hidden, false); assert.equal(h.panel.inert, false);
  assert.equal(h.panel.children[0].textContent, 'お城の入口'); assert.equal(h.trigger.textContent, 'アプリ終了');
  h.trigger.click(); assert.equal(h.panel.hidden, true); assert.equal(h.panel.inert, true);
  h.api.resume(); assert.equal(h.panel.hidden, false); assert.equal(h.panel.inert, false);
  h.api.destroy(); assert.equal(h.root.querySelector('#castle-exit-panel'), null);
});
test('castle exit panel uses wrapping normal flow and a readable touch target', async () => {
  const css = await readFile(new URL('../safe-navigation.css', import.meta.url), 'utf8');
  assert.match(css, /\.masthead>\.castle-exit-panel\{[^}]*position:relative[^}]*flex-wrap:wrap[^}]*max-width:100%[^}]*min-width:0[^}]*overflow:visible/);
  assert.match(css, /\.castle-exit-panel>\.app-exit-trigger\{[^}]*position:static[^}]*min-height:44px[^}]*max-width:100%[^}]*font:600 13px[^}]*white-space:normal/);
  assert.match(css, /\.castle-exit-panel\[hidden\][^}]*display:none!important/);
  assert.doesNotMatch(css, /\.header-actions \.app-exit-trigger/);
});
