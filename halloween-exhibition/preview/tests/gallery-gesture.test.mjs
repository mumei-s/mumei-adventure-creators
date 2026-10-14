import test from 'node:test';
import assert from 'node:assert/strict';
import { installGalleryGesture } from '../gallery-gesture.js';

class Target {
  listeners = new Map();
  addEventListener(type, fn) { const list = this.listeners.get(type) || new Set(); list.add(fn); this.listeners.set(type, list); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, event) { for (const fn of this.listeners.get(type) || []) fn(event); }
}
function fixture() {
  const document = new Target();
  document.defaultView = new Target();
  const stage = new Target(); stage.ownerDocument = document;
  const navigation = [], suppression = [];
  const cleanup = installGalleryGesture(stage, { onNavigate: d => navigation.push(d), onSuppressClick: t => suppression.push(t) });
  const event = (x, y = 0, extra = {}) => ({ pointerType: 'touch', pointerId: 1, clientX: x, clientY: y, target: { closest: () => null }, preventDefault() { throw Error('Pointer scrolling must not be prevented'); }, ...extra });
  const down = (x = 0, y = 0, extra = {}) => { const e = event(x, y, extra); document.emit('pointerdown', e); stage.emit('pointerdown', e); };
  const move = (x, y = 0, extra = {}) => document.emit('pointermove', event(x, y, extra));
  const up = (x, y = 0, extra = {}) => document.emit('pointerup', event(x, y, extra));
  return { document, stage, navigation, suppression, cleanup, event, down, move, up };
}

test('24px touch swipe navigates once and supplies click suppression deadline', () => {
  const f = fixture(); f.down(); f.move(-12); f.move(-24); assert.deepEqual(f.navigation, []); f.up(-24); f.up(-30);
  assert.deepEqual(f.navigation, [1]); assert.ok(f.suppression[0] >= Date.now());
  f.down(); f.up(24); assert.deepEqual(f.navigation, [1, -1]);
});
test('tap, short drag, mouse and pen do not navigate', () => {
  const f = fixture(); f.down(); f.up(0); f.down(); f.up(23);
  for (const pointerType of ['mouse', 'pen']) { f.down(0, 0, { pointerType }); f.up(-90, 0, { pointerType }); }
  assert.deepEqual(f.navigation, []);
});
test('vertical direction locks and diagonal scrolling does not navigate', () => {
  const f = fixture(); f.down(); f.move(0, 12); f.up(90, 13); f.down(); f.up(30, 30);
  assert.deepEqual(f.navigation, []);
});
test('controls excluded, nested artwork button accepts swipes', () => {
  const f = fixture();
  for (const id of ['next', 'year-open', 'search']) { f.down(0, 0, { target: { closest: () => ({ id }) } }); f.up(-90); }
  f.down(0, 0, { target: { closest: () => ({ id: 'artwork-open' }) } }); f.up(-24);
  assert.deepEqual(f.navigation, [1]);
});
test('multitouch cancels until all fingers have released, including outside stage', () => {
  const f = fixture(); f.down(); f.move(-30);
  f.document.emit('pointerdown', f.event(0, 0, { pointerId: 2 }));
  f.up(0, 0, { pointerId: 2 }); f.move(-90); f.up(-90);
  assert.deepEqual(f.navigation, []); f.down(); f.up(-24); assert.deepEqual(f.navigation, [1]);
});
test('pointercancel clears swipe and supports the next fresh gesture', () => {
  const f = fixture(); f.down(); f.move(-30); f.document.emit('pointercancel', f.event(-30)); f.up(-50);
  assert.deepEqual(f.navigation, []); f.down(); f.up(25); assert.deepEqual(f.navigation, [-1]);
});
test('successful swipe consumes ghost click while keyboard clicks remain usable', () => {
  const f = fixture(); f.down(); f.up(-24);
  let prevented = 0, stopped = 0;
  const click = { detail: 1, preventDefault: () => prevented++, stopImmediatePropagation: () => stopped++ };
  f.stage.emit('click', click); assert.equal(prevented, 1); assert.equal(stopped, 1);
  f.stage.emit('click', { ...click, detail: 0 }); assert.equal(prevented, 1);
});
test('cleanup removes all listeners and prevents further navigation', () => {
  const f = fixture(); f.down(); f.cleanup(); f.up(-90); f.down(); f.up(-90);
  assert.deepEqual(f.navigation, []);
  for (const target of [f.stage, f.document, f.document.defaultView]) for (const listeners of target.listeners.values()) assert.equal(listeners.size, 0);
});
test('blur clears an abandoned touch sequence', () => {
  const f = fixture(); f.down(); f.document.defaultView.emit('blur', {}); f.down(); f.up(-24); assert.deepEqual(f.navigation, [1]);
});
test('cancelling one finger does not revive a remaining multitouch contact', () => {
  const f = fixture(); f.down(); f.down(0, 0, { pointerId: 2 });
  f.document.emit('pointercancel', f.event(0, 0, { pointerId: 2 }));
  f.move(-90); f.up(-90); assert.deepEqual(f.navigation, []);
  f.down(); f.up(-24); assert.deepEqual(f.navigation, [1]);
});
test('a horizontal start ending in a predominantly vertical motion does not swipe', () => {
  const f = fixture(); f.down(); f.move(12, 0); f.up(25, 80);
  assert.deepEqual(f.navigation, []); assert.deepEqual(f.suppression, []);
});
