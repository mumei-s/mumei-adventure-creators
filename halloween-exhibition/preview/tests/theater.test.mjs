import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateArchive, safeURL, normalizeSearch } from '../data-model.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = await readFile(new URL('../theater.js', import.meta.url), 'utf8');
const archive = JSON.parse(await readFile(new URL('../data/archive.json', import.meta.url)));

// Deliberately lightweight DOM/event/timer harness. This verifies program logic,
// not browser layout, native dialog focus trapping, or rendering fidelity.
class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.doc = doc; this.children = [];
    this.attrs = {}; this.dataset = {}; this.handlers = {}; this.parentNode = null;
    this.hidden = false; this.disabled = false; this.open = false; this.value = '';
    this.style = { setProperty(k, v) { this[k] = v; } };
    this.classList = {
      contains: c => this.className.split(/\s+/).includes(c),
      add: (...cs) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...cs])].join(' '); },
      remove: (...cs) => { this.className = this.className.split(/\s+/).filter(c => !cs.includes(c)).join(' '); },
      toggle: (c, force) => { const on = force === undefined ? !this.classList.contains(c) : force; this.classList[on ? 'add' : 'remove'](c); return on; }
    };
  }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = v; }
  get id() { return this.attrs.id || ''; }
  set id(v) { this.attrs.id = v; }
  get textContent() { return (this._text || '') + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); for (const c of this.children) c.parentNode = null; this.children = []; }
  get isConnected() { return this === this.doc.documentElement || Boolean(this.parentNode?.isConnected); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'hidden') this.hidden = true; if (k === 'disabled') this.disabled = true; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...children) { for (const c of children) { c.parentNode = this; this.children.push(c); } }
  replaceChildren(...children) { this.textContent = ''; this.append(...children); }
  remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; } }
  replaceWith(el) { const p = this.parentNode; if (p) { const i = p.children.indexOf(this); p.children[i] = el; el.parentNode = p; this.parentNode = null; } }
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
  dispatch(type, event = {}) { for (const fn of this.handlers[type] || []) fn({ target: this, preventDefault() {}, ...event }); }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { if (!this.disabled) this.doc.activeElement = this; }
  showModal() { this.open = true; this.querySelector('button')?.focus(); }
  close() { if (!this.open) return; this.open = false; this.doc.queue(() => this.dispatch('close'), 0); }
  getBoundingClientRect() { return { left: 0, top: 0, right: 500, bottom: 500 }; }
  querySelectorAll(selector) {
    const selectors = selector.split(','); const out = [];
    const matches = (el, sel) => sel.startsWith('.') ? el.classList.contains(sel.slice(1)) : sel === 'dialog[open]' ? el.tagName === 'DIALOG' && el.open : el.tagName === sel.toUpperCase();
    const walk = el => { for (const c of el.children) { if (selectors.some(sel => matches(c, sel.trim()))) out.push(c); walk(c); } };
    walk(this); return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

async function harness({ data = archive, reduced = true, storageThrows = false, saved = null } = {}) {
  let now = 0, seq = 0; const timers = new Map(), storage = new Map(saved ? [['halloween-yearbook:night-doors:v1', saved]] : []);
  const queue = (fn, delay = 0) => { const id = ++seq; timers.set(id, { at: now + delay, fn }); return id; };
  const doc = { queue, handlers: {}, activeElement: null, createElement(tag) { return new Element(tag, this); }, addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); } };
  doc.documentElement = doc.createElement('html'); doc.activeElement = doc.documentElement;
  const stack = [doc.documentElement]; const voids = new Set(['meta','link','input','img','br','hr']);
  for (const token of html.matchAll(/<\/?([a-z][\w-]*)([^>]*)>/gi)) {
    const [full, name, attrs] = token;
    if (name.toLowerCase() === 'html') continue;
    if (full.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
    const el = doc.createElement(name);
    for (const a of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) el.setAttribute(a[1], a[2] ?? '');
    stack.at(-1).append(el); if (!voids.has(name.toLowerCase())) stack.push(el);
  }
  doc.querySelectorAll = s => doc.documentElement.querySelectorAll(s);
  doc.querySelector = s => doc.documentElement.querySelector(s);
  doc.getElementById = id => {
    const walk = el => el.id === id ? el : el.children.map(walk).find(Boolean);
    return walk(doc.documentElement);
  };
  const requests = [];
  const context = vm.createContext({ document: doc, validateArchive, safeURL, normalizeSearch,
    matchMedia: () => ({ matches: reduced }), setTimeout: queue, clearTimeout: id => timers.delete(id),
    Date: class extends Date { static now() { return now; } },
    localStorage: { getItem(k) { if (storageThrows) throw Error('blocked'); return storage.get(k) || null; }, setItem(k, v) { if (storageThrows) throw Error('blocked'); storage.set(k, v); } },
    fetch: () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
  });
  vm.runInContext(source.replace(/^import[^\n]+\n/, '') + '\nglobalThis.testAPI={navigate,setYear,load,openStory,renderProgress, get state(){return {currentYear,currentIndex,busy,storageOK,progress};}};', context);
  async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
  async function tick(ms) { const end = now + ms; for (;;) { const item = [...timers.entries()].filter(([,v]) => v.at <= end).sort((a,b) => a[1].at - b[1].at || a[0] - b[0])[0]; if (!item) break; now = item[1].at; timers.delete(item[0]); item[1].fn(); await flush(); } now = end; await flush(); }
  async function succeed(request, result = data) { request.resolve({ ok: true, json: async () => structuredClone(result) }); await flush(); }
  await succeed(requests[0]);
  return { doc, $: doc.getElementById, api: context.testAPI, requests, storage, tick, flush, succeed };
}

test('initial load renders eight rooms with one owner article and seven fictional labels', async () => {
  const h = await harness(); assert.equal(h.$('room-dots').children.length, 8);
  assert.match(h.$('creator-name').textContent, /主催者の企画紹介記事/);
  await h.api.navigate(1); assert.match(h.$('creator-name').textContent, /架空の参加者/);
  h.$('story-open').click(); assert.match(h.$('detail-content').textContent, /実在の人物・参加表明・作品紹介ではありません/);
});

test('previous and next wrap around and selected dots match the room', async () => {
  const h = await harness(); await h.api.navigate(-1); assert.equal(h.api.state.currentIndex, 7);
  assert.equal(h.$('room-dots').children[7].getAttribute('aria-current'), 'true');
  await h.api.navigate(8); assert.equal(h.api.state.currentIndex, 0);
});

test('swipe advances once and suppresses following synthetic artwork click', async () => {
  const h = await harness(); const stage = h.$('stage');
  stage.dispatch('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 200 });
  stage.dispatch('pointerup', { pointerId: 1, clientX: 80, clientY: 210 });
  await h.flush(); assert.equal(h.api.state.currentIndex, 1);
  h.$('artwork-open').click(); assert.equal(h.$('detail').open, false);
  await h.tick(451); h.$('artwork-open').click(); assert.equal(h.$('detail').open, true);
});

test('vertical gestures do not change rooms and cancelled touches do nothing', async () => {
  const h = await harness(); const stage = h.$('stage');
  stage.dispatch('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100 });
  stage.dispatch('pointerup', { pointerId: 1, clientX: 110, clientY: 250 });
  assert.equal(h.api.state.currentIndex, 0);
  stage.dispatch('pointerdown', { pointerType: 'touch', pointerId: 2, clientX: 200, clientY: 100 });
  stage.dispatch('pointercancel'); stage.dispatch('pointerup', { pointerId: 2, clientX: 0, clientY: 100 });
  assert.equal(h.api.state.currentIndex, 0);
});

test('opening the same story twice counts it once and reset is year-specific', async () => {
  const data = structuredClone(archive); data.years.push({ ...structuredClone(data.years[0]), year: 2025 });
  const h = await harness({ data }); h.$('story-open').click(); h.$('detail').close(); await h.tick(0);
  h.$('story-open').click(); h.$('detail').close(); await h.tick(0); assert.equal(h.$('visit-count').textContent, '1');
  h.api.setYear(2025); h.$('story-open').click(); h.$('detail').close(); await h.tick(0);
  h.$('passport-open').click(); h.$('reset').click(); assert.equal(h.$('visit-count').textContent, '0');
  h.api.setYear(2026); assert.equal(h.$('visit-count').textContent, '1');
});

test('storage denial keeps the page usable and tells the reader memory is temporary', async () => {
  const h = await harness({ storageThrows: true }); h.$('story-open').click();
  assert.equal(h.api.state.storageOK, false); assert.equal(h.$('visit-count').textContent, '1');
  assert.match(h.$('detail-content').textContent, /保存できません/);
});

test('dialog close restores its opener', async () => {
  const h = await harness(); h.$('list-open').focus(); h.$('list-open').click();
  h.$('roster').querySelector('.close').click(); await h.tick(0); assert.equal(h.doc.activeElement, h.$('list-open'));
});

test('search and tags filter the roster safely', async () => {
  const h = await harness(); h.$('list-open').click(); h.$('search').value = '森';
  h.$('search').dispatch('input'); assert.equal(h.$('roster-grid').children.length, 1);
  assert.match(h.$('roster-grid').textContent, /森の魔法道具屋/);
  h.$('search').value = '<img onerror=alert(1)>'; h.$('search').dispatch('input');
  assert.match(h.$('results').textContent, /^0 \/ 8/);
});

test('an empty newest year can switch to a populated year with navigation fully enabled', async () => {
  const data = structuredClone(archive); data.years.push({ year: 2027, title: '', description: '', entries: [] });
  const h = await harness({ data }); assert.equal(h.$('stage').hidden, true);
  h.api.setYear(2026); assert.equal(h.$('stage').hidden, false);
  for (const id of ['previous','next','story-open','artwork-open']) assert.equal(h.$(id).disabled, false, `${id} must be enabled`);
});

test('selecting a roster room interrupts an in-progress turn rather than losing the selection', async () => {
  const h = await harness({ reduced: false }); h.$('next').click(); await h.tick(100);
  h.$('list-open').click(); h.$('roster-grid').children[4].click(); await h.tick(700);
  assert.equal(h.api.state.currentIndex, 4); assert.equal(h.$('roster').open, false);
});

test('a cancelled old transition cannot clear the new year transition busy state', async () => {
  const data = structuredClone(archive); data.years.push({ ...structuredClone(data.years[0]), year: 2025 });
  const h = await harness({ data, reduced: false }); h.$('next').click(); await h.tick(100);
  h.api.setYear(2025); h.$('next').click(); await h.tick(100);
  assert.equal(h.api.state.busy, true, 'new transition is still waiting for its own 200ms turn');
  await h.tick(100); assert.equal(h.api.state.currentIndex, 1);
});

test('a stale failed load cannot overwrite a later successful retry', async () => {
  const h = await harness(); h.api.load(); const old = h.requests.at(-1); h.api.load(); const latest = h.requests.at(-1);
  await h.succeed(latest); old.reject(Error('old request failed')); await h.flush();
  assert.equal(h.$('load-error').hidden, true);
});

test('old load animation timer does not remove a newer room entrance animation', async () => {
  const h = await harness({ reduced: false }); await h.tick(600);
  h.$('next').click(); await h.tick(200); assert.equal(h.$('theater').classList.contains('turning-in'), true);
  await h.tick(100); assert.equal(h.api.state.busy, true);
  assert.equal(h.$('theater').classList.contains('turning-in'), true, 'new animation should remain until its own 450ms completes');
});

test('a failed reload recovers and re-enables navigation on retry', async () => {
  const h = await harness(); h.api.load(); h.requests.at(-1).reject(Error('offline')); await h.flush();
  assert.equal(h.$('load-error').hidden, false); assert.equal(h.$('next').disabled, true);
  h.$('retry').click(); await h.succeed(h.requests.at(-1));
  assert.equal(h.$('load-error').hidden, true); assert.equal(h.$('next').disabled, false);
});

test('all eight stories produce completion, and reset removes completion', async () => {
  const h = await harness();
  for (let i = 0; i < 8; i++) { await h.api.navigate(i); h.$('story-open').click(); h.$('detail').close(); await h.tick(0); }
  assert.equal(h.$('visit-count').textContent, '8'); assert.equal(h.$('theater').classList.contains('complete'), true);
  h.$('passport-open').click(); h.$('reset').click();
  assert.equal(h.$('visit-count').textContent, '0'); assert.equal(h.$('theater').classList.contains('complete'), false);
});
