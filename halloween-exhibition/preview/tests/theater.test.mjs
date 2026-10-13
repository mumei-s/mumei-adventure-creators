import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
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
  dispatch(type, event = {}) { const dispatched = { target: this, preventDefault() {}, ...event }; this['on' + type]?.(dispatched); for (const fn of this.handlers[type] || []) fn(dispatched); }
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

async function harness({ data = archive, reduced = true, storageThrows = false, storageWriteThrows = false, saved = null, savedMode = null, autoLoad = true } = {}) {
  let now = 0, seq = 0; const timers = new Map(), storage = new Map(saved ? [['halloween-yearbook:night-doors:v1', saved]] : []);
  if (savedMode !== null) storage.set('halloween-yearbook:display-mode:v1', savedMode);
  const queue = (fn, delay = 0) => { const id = ++seq; timers.set(id, { at: now + delay, fn }); return id; };
  const doc = { queue, handlers: {}, activeElement: null, createElement(tag) { return new Element(tag, this); }, createTextNode(text) { const el = new Element('#text', this); el.textContent = text; return el; }, addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); } };
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
  doc.body = doc.querySelector('body');
  doc.getElementById = id => {
    const walk = el => el.id === id ? el : el.children.map(walk).find(Boolean);
    return walk(doc.documentElement);
  };
  const requests = [], storageWrites = [], motionInitializations = [], viewCalls = [];
  const context = vm.createContext({ document: doc, initSceneMotion:root=>{motionInitializations.push(root);const dock=doc.createElement('div');dock.className='scene-controls';root.append(dock);return {setView(x,y){viewCalls.push([x,y]);}};}, validateArchive, safeURL, normalizeSearch,
    matchMedia: () => ({ matches: reduced }), setTimeout: queue, clearTimeout: id => timers.delete(id),
    Date: class extends Date { static now() { return now; } },
    localStorage: { getItem(k) { if (storageThrows) throw Error('blocked'); return storage.get(k) || null; }, setItem(k, v) { storageWrites.push({key:k,value:v}); if (storageThrows || storageWriteThrows) throw Error('blocked'); storage.set(k, v); } },
    fetch: () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
  });
  vm.runInContext(source.replace(/^import[^\n]+\n/gm, '') + '\nglobalThis.testAPI={navigate,setYear,load,openStory,renderProgress,setMode,setHorror, get state(){return {currentYear,currentIndex,busy,storageOK,progress,displayMode,horrorActive,search,activeTag};}};', context);
  async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
  async function tick(ms) { const end = now + ms; for (;;) { const item = [...timers.entries()].filter(([,v]) => v.at <= end).sort((a,b) => a[1].at - b[1].at || a[0] - b[0])[0]; if (!item) break; now = item[1].at; timers.delete(item[0]); item[1].fn(); await flush(); } now = end; await flush(); }
  async function succeed(request, result = data) { request.resolve({ ok: true, json: async () => structuredClone(result) }); await flush(); }
  if (autoLoad) await succeed(requests[0]);
  // Model the browser's unprevented Escape default separately from app listeners.
  // This is not a verification of a browser's native dialog/focus implementation.
  function keydown(key, target = doc.activeElement) {
    let prevented = false;
    const event = { key, target, preventDefault() { prevented = true; } };
    for (const fn of doc.handlers.keydown || []) fn(event);
    if (key === 'Escape' && !prevented) doc.querySelectorAll('dialog[open]').at(-1)?.close();
    return prevented;
  }
  return { doc, keydown, $: doc.getElementById, api: context.testAPI, requests, storage, storageWrites, motionInitializations, viewCalls, tick, flush, succeed };
}

test('initial load renders nine real rooms plus two upcoming markers, never eleven participants', async () => {
  const h = await harness();
  assert.equal(h.$('load-error').hidden, true);
  assert.equal(h.$('room-dots').querySelectorAll('button').length, 9);
  assert.equal(h.$('room-dots').querySelectorAll('.future-face').length, 2);
  assert.equal(h.$('total-index').textContent, '09');
  assert.equal(h.$('sample-notice').textContent, '参加者9人 · あと2人が追加予定');
  assert.equal(h.$('results').textContent, '参加者 9 / 9人 · ほか2人追加予定');
  assert.match(h.$('creator-name').textContent, /主催者の企画紹介記事/);
  assert.equal(h.$('room-title').textContent, archive.creators[0].name);
  assert.equal(h.$('artwork-image').src, archive.years[0].entries[0].image);
  await h.api.navigate(1);
  assert.match(h.$('creator-name').textContent, /プロフィール画像 · 作品準備中/);
  assert.equal(h.$('artwork-image').src, archive.creators[1].avatar);
  assert.equal(h.$('artwork-image').alt, `${archive.creators[1].name}のnoteプロフィール画像`);
  h.$('story-open').click();
  assert.match(h.$('detail-content').textContent, /ハロウィン作品は準備中/);
  assert.doesNotMatch(h.$('detail-content').textContent, /架空の参加者|展示サンプル/);
});

test('previous and next wrap around and selected dots match the room', async () => {
  const h = await harness(); await h.api.navigate(-1); assert.equal(h.api.state.currentIndex, 8);
  assert.equal(h.$('room-dots').children[8].getAttribute('aria-current'), 'true');
  await h.api.navigate(9); assert.equal(h.api.state.currentIndex, 0);
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
  const h = await harness(); h.$('list-open').click(); h.$('search').value = 'ミナト';
  h.$('search').dispatch('input'); assert.equal(h.$('roster-grid').children.length, 1);
  assert.match(h.$('roster-grid').textContent, /ミナト汐/);
  h.$('search').value = '<img onerror=alert(1)>'; h.$('search').dispatch('input');
  assert.match(h.$('results').textContent, /^参加者 0 \/ 9人/);
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

test('all nine real profiles produce completion, and reset removes completion', async () => {
  const h = await harness();
  for (let i = 0; i < 9; i++) { await h.api.navigate(i); h.$('story-open').click(); h.$('detail').close(); await h.tick(0); }
  assert.equal(h.$('visit-count').textContent, '9'); assert.equal(h.$('theater').classList.contains('complete'), true);
  h.$('passport-open').click(); h.$('reset').click();
  assert.equal(h.$('visit-count').textContent, '0'); assert.equal(h.$('theater').classList.contains('complete'), false);
});


test('every displayed local room background exists', async () => {
  const h = await harness();
  for (let i = 0; i < archive.years[0].entries.length; i++) {
    await h.api.navigate(i);
    const url = h.$('world-backdrop').style.backgroundImage.match(/^url\("([^"]+)"\)$/)?.[1];
    assert.ok(url?.startsWith('./assets/'));
    await access(new URL('../' + url, import.meta.url));
  }
});

const legacyFictionalIDs = Array.from({ length: 7 }, (_, i) => `fictional-${i + 1}`);
const savedProgress = (ids, extra = {}) => JSON.stringify({ stamps: { 'archive:2026': ids, ...extra }, stars: {} });

test('old seven fictional stamps never increase real-roster progress', async () => {
  const h = await harness({ saved: savedProgress(legacyFictionalIDs) });
  assert.equal(h.$('visit-count').textContent, '0');
  assert.equal(h.$('theater').classList.contains('complete'), false);
  assert.equal(h.$('theater').style['--journey-progress'], '0');
  assert.equal(h.$('room-dots').querySelectorAll('.visited').length, 0);
  h.$('passport-open').click();
  assert.match(h.$('passport-content').textContent, /0 \/ 9人を訪問/);
  assert.equal(h.$('passport-content').querySelectorAll('.passport-stamp').length, 9);
  assert.equal(h.$('passport-content').querySelectorAll('.visited').length, 0);
});

test('ss-yr migrates to ss_yr and only the real owner visit survives legacy progress', async () => {
  const h = await harness({ saved: savedProgress(['ss-yr', ...legacyFictionalIDs]) });
  assert.equal(h.$('visit-count').textContent, '1');
  assert.equal(h.$('theater').classList.contains('complete'), false);
  assert.deepEqual(h.$('room-dots').querySelectorAll('.visited').map(n => n.dataset.creatorId), ['ss_yr']);
  assert.equal(h.$('theater').style['--journey-progress'], String(1 / 9));
  h.$('story-open').click(); h.$('detail').close(); await h.tick(0);
  assert.equal(h.$('visit-count').textContent, '1', 'opening the migrated owner does not add another visit');
  h.$('passport-open').click();
  assert.match(h.$('passport-content').textContent, /1 \/ 9人を訪問/);
  assert.equal(h.$('passport-content').querySelectorAll('.visited').length, 1);
  const reloaded = await harness({ saved: h.storage.get('halloween-yearbook:night-doors:v1') });
  assert.equal(reloaded.$('visit-count').textContent, '1', 'saved migration is idempotent across reloads');
});

test('migration does not double-count an already-current owner or touch another year', async () => {
  const data = structuredClone(archive);
  data.years.push({ ...structuredClone(data.years[0]), year: 2025 });
  const h = await harness({ data, saved: savedProgress(['ss-yr', 'ss_yr', ...legacyFictionalIDs], { 'archive:2025': ['koakumako'] }) });
  assert.equal(h.$('visit-count').textContent, '1');
  h.api.setYear(2025); assert.equal(h.$('visit-count').textContent, '1');
  assert.deepEqual(h.$('room-dots').querySelectorAll('.visited').map(n => n.dataset.creatorId), ['koakumako']);
  h.api.setYear(2026); assert.equal(h.$('visit-count').textContent, '1');
});

test('duplicate persisted IDs do not inflate progress or produce premature completion', async () => {
  const h = await harness({ saved: savedProgress(Array(9).fill('ss_yr')) });
  assert.equal(h.$('visit-count').textContent, '1');
  assert.equal(h.$('theater').classList.contains('complete'), false);
  h.$('passport-open').click();
  assert.match(h.$('passport-content').textContent, /1 \/ 9人を訪問/);
  assert.equal(h.$('passport-content').querySelectorAll('.visited').length, 1);
});

test('completion is exactly nine unique real participants, ignoring stale and planned IDs', async () => {
  const realIDs = archive.creators.map(c => c.id);
  const stale = ['future-1', 'future-2', 'pending-1', 'pending-2', ...legacyFictionalIDs];
  const h = await harness({ saved: savedProgress([...stale, ...realIDs.slice(0, 8), realIDs[0]]) });
  assert.equal(h.$('visit-count').textContent, '8');
  assert.equal(h.$('theater').classList.contains('complete'), false);
  await h.api.navigate(8); h.$('story-open').click(); h.$('detail').close(); await h.tick(0);
  assert.equal(h.$('visit-count').textContent, '9');
  assert.equal(h.$('theater').style['--journey-progress'], '1');
  assert.equal(h.$('theater').classList.contains('complete'), true);
  assert.equal(h.$('room-dots').querySelectorAll('.visited').length, 9);
  assert.ok(h.$('room-dots').querySelectorAll('.future-face').every(n => !n.classList.contains('visited')));
  assert.match(h.$('toast').textContent, /9人との出会い/);
  h.$('passport-open').click();
  assert.match(h.$('passport-content').textContent, /9 \/ 9人を訪問/);
  assert.equal(h.$('passport-content').querySelectorAll('.passport-stamp').length, 9);
});

test('upcoming placeholders are labelled, noninteractive, and absent from the passport', async () => {
  const h = await harness(); h.$('list-open').click();
  assert.equal(h.$('roster-grid').querySelectorAll('button').length, 9);
  const markers = [...h.$('room-dots').querySelectorAll('.future-face'), ...h.$('roster-grid').querySelectorAll('.future-card')];
  assert.equal(markers.length, 4);
  for (const marker of markers) {
    assert.notEqual(marker.tagName, 'BUTTON');
    assert.notEqual(marker.tagName, 'A');
    assert.equal(marker.getAttribute('tabindex'), null);
    assert.equal(marker.getAttribute('href'), null);
    assert.equal(marker.handlers.click, undefined);
    assert.match(marker.getAttribute('aria-label') || marker.textContent, /追加予定/);
    marker.click();
  }
  assert.equal(h.api.state.currentIndex, 0);
  assert.equal(h.$('visit-count').textContent, '0');
  h.$('roster').close(); await h.tick(0); h.$('passport-open').click();
  assert.equal(h.$('passport-content').querySelectorAll('.passport-stamp').length, 9);
  assert.doesNotMatch(h.$('passport-content').textContent, /追加予定/);
});

test('all nine profile links have safe URLs and safe new-tab attributes', async () => {
  const h = await harness();
  for (let i = 0; i < archive.creators.length; i++) {
    await h.api.navigate(i); h.$('story-open').click();
    const links = h.$('detail-content').querySelectorAll('a');
    const profile = links.find(a => a.href === archive.creators[i].profileURL);
    assert.ok(profile, `${archive.creators[i].id} has its verified profile link`);
    for (const link of links) {
      assert.equal(link.href, safeURL(link.href));
      assert.equal(link.target, '_blank');
      assert.equal(link.rel, 'noopener noreferrer');
    }
    h.$('detail').close(); await h.tick(0);
  }
});

test('profile names, handles and link labels render as text, and unsafe links are omitted', async () => {
  const data = structuredClone(archive);
  const attack = '<img src=x onerror="globalThis.pwned=true"> & <script>alert(1)</script>';
  data.creators[1].name = attack;
  data.years[0].entries[1].links = [
    { title: attack, url: 'https://note.com/koakumako?q="<tag>&ref=test' },
    { title: 'unsafe script', url: 'javascript:alert(1)' },
    { title: 'unsafe data', url: 'data:text/html,<script>alert(1)</script>' },
    { title: 'unsafe relative', url: '//evil.example/test' }
  ];
  const h = await harness({ data }); await h.api.navigate(1); h.$('story-open').click();
  assert.equal(h.$('room-title').textContent, attack);
  assert.equal(h.$('room-title').children.length, 0);
  assert.equal(h.$('detail-title').textContent, attack);
  assert.equal(h.$('detail-title').children.length, 0);
  const links = h.$('detail-content').querySelectorAll('a');
  assert.equal(links.length, 1);
  assert.ok(links[0].textContent.startsWith(attack));
  assert.equal(links[0].href, safeURL(data.years[0].entries[1].links[0].url));
  assert.equal(links[0].querySelectorAll('img').length, 0);
  assert.equal(links[0].querySelectorAll('script').length, 0);
  assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML\s*\(/);
});

test('portrait errors use initials with a profile label, never decorative fake artwork', async () => {
  const h = await harness(); await h.api.navigate(1);
  const originalSource = h.$('artwork-image').src;
  h.$('artwork-image').dispatch('error');
  assert.equal(h.$('artwork-image').hidden, true);
  assert.equal(h.$('artwork-fallback').hidden, false);
  assert.equal(h.$('artwork-image').src, originalSource, 'an error must not load a decorative illustration');
  assert.match(h.$('artwork-fallback').textContent, /プロフィール画像/);
  assert.ok(h.$('artwork-fallback').textContent.startsWith(Array.from(archive.creators[1].name).slice(0, 2).join('')));
  assert.equal(h.doc.querySelector('.artwork-mat').style.backgroundImage, 'none');
  h.$('story-open').click();
  const portrait = h.$('detail-content').querySelector('img'); portrait.dispatch('error');
  assert.equal(h.$('detail-content').querySelectorAll('img').length, 0);
  assert.equal(h.$('detail-content').querySelector('.profile-fallback').textContent, Array.from(archive.creators[1].name).slice(0, 2).join(''));
  h.$('detail').close(); await h.tick(0);
  await h.api.navigate(2);
  assert.equal(h.$('artwork-image').hidden, false, 'a later room recovers its own portrait');
  assert.equal(h.$('artwork-fallback').hidden, true);
});

test('failed navigation and roster avatars leave named initials behind', async () => {
  const h = await harness();
  const face = h.$('room-dots').querySelector('button');
  face.querySelector('img').dispatch('error');
  assert.equal(face.querySelectorAll('img').length, 0);
  assert.equal(face.querySelector('.face-initial').textContent, Array.from(archive.creators[0].name)[0]);
  assert.match(face.getAttribute('aria-label'), new RegExp(archive.creators[0].name));
  h.$('list-open').click(); const card = h.$('roster-grid').querySelector('button');
  card.querySelector('img').dispatch('error');
  assert.equal(card.querySelectorAll('img').length, 0);
  assert.match(card.textContent, new RegExp(archive.creators[0].name));
});

test('missing or unsafe portrait URLs display labelled initials without an image request', async () => {
  for (const url of [undefined, 'javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'assets/../private.jpg']) {
    const data = structuredClone(archive); data.creators[1].avatar = url;
    const h = await harness({ data }); await h.api.navigate(1);
    assert.equal(h.$('artwork-image').hidden, true);
    assert.equal(h.$('artwork-fallback').hidden, false);
    assert.match(h.$('artwork-fallback').textContent, /プロフィール画像/);
    assert.equal(h.doc.querySelector('.artwork-mat').style.backgroundImage, 'none');
    h.$('story-open').click();
    assert.equal(h.$('detail-content').querySelectorAll('img').length, 0);
    assert.ok(h.$('detail-content').querySelector('.profile-fallback'));
  }
});

test('owner article error does not substitute invented art and host avatar errors hide cleanly', async () => {
  const h = await harness();
  const articleSource = h.$('artwork-image').src;
  assert.equal(h.$('host-avatar').hidden, false);
  h.$('host-avatar').dispatch('error'); assert.equal(h.$('host-avatar').hidden, true);
  h.$('artwork-image').dispatch('error');
  assert.equal(h.$('artwork-image').hidden, true);
  assert.equal(h.$('artwork-fallback').hidden, false);
  assert.equal(h.$('artwork-image').src, articleSource);
  assert.equal(h.doc.querySelector('.artwork-mat').style.backgroundImage, 'none');
});

test('name and @note-handle search work, and pending-work tag excludes future placeholders', async () => {
  const h = await harness(); h.$('list-open').click();
  for (const query of ['Pajama de mama', '@mama_ca', 'mama_ca']) {
    h.$('search').value = query; h.$('search').dispatch('input');
    assert.equal(h.$('roster-grid').querySelectorAll('button').length, 1);
    assert.match(h.$('roster-grid').textContent, /Pajama de mama/);
    assert.equal(h.$('roster-grid').querySelectorAll('.future-card').length, 0);
  }
  h.$('search').value = ''; h.$('search').dispatch('input');
  h.$('tags').children.find(n => n.textContent === '作品準備中').click();
  assert.equal(h.$('roster-grid').querySelectorAll('button').length, 8);
  assert.equal(h.$('roster-grid').querySelectorAll('.future-card').length, 0);
  assert.equal(h.$('results').textContent, '参加者 8 / 9人 · ほか2人追加予定');
});

test('future slots do not change year-picker counts and an empty year stays incomplete', async () => {
  const data = structuredClone(archive);
  data.years.push({ year: 2027, title: '', description: '', plannedSlots: 2, entries: [] });
  const h = await harness({ data });
  assert.equal(h.$('visit-count').textContent, '0');
  assert.equal(h.$('theater').classList.contains('complete'), false);
  assert.equal(h.$('room-dots').querySelectorAll('button').length, 0);
  assert.equal(h.$('room-dots').querySelectorAll('.future-face').length, 2);
  h.$('year-open').click();
  assert.match(h.$('year-list').children[0].textContent, /2027.*0の物語/);
  assert.match(h.$('year-list').children[1].textContent, /2026.*9の物語/);
});

test('Halloween is the default mode and horror always starts off', async () => {
  const h = await harness();
  assert.equal(h.api.state.displayMode, 'halloween');
  assert.equal(h.$('theater').dataset.mode, 'halloween');
  assert.equal(h.doc.body.dataset.mode, 'halloween');
  assert.equal(h.$('mode-halloween').getAttribute('aria-pressed'), 'true');
  assert.equal(h.$('mode-normal').getAttribute('aria-pressed'), 'false');
  assert.equal(h.$('horror-toggle').hidden, false);
  assert.equal(h.$('horror-toggle').getAttribute('aria-pressed'), 'false');
  assert.equal(h.$('theater').dataset.horror, 'false');
  assert.match(h.doc.title, /ハロウィン参加者年鑑/);
  assert.match(h.$('site-title').textContent, /^夜のとびら/);
});

test('normal and Halloween mode persist independently of visits and restore the correct copy', async () => {
  const h = await harness();
  h.$('story-open').click(); h.$('detail').close(); await h.tick(0);
  const progressBefore = h.storage.get('halloween-yearbook:night-doors:v1');
  h.$('mode-normal').click();
  assert.equal(h.storage.get('halloween-yearbook:display-mode:v1'), 'normal');
  assert.equal(h.storage.get('halloween-yearbook:night-doors:v1'), progressBefore);
  assert.equal(h.$('mode-normal').getAttribute('aria-pressed'), 'true');
  assert.equal(h.$('mode-halloween').getAttribute('aria-pressed'), 'false');
  assert.equal(h.doc.body.dataset.mode, 'normal');
  assert.equal(h.$('horror-toggle').hidden, true);
  assert.match(h.$('site-title').textContent, /^みんなのとびら/);
  assert.match(h.doc.title, /クリエイター年鑑/);
  assert.equal(h.$('edition-text').textContent, '2026 · CREATORS YEARBOOK');
  assert.equal(h.$('invitation-year').textContent, 'CREATORS 2026');
  const normalReload = await harness({ savedMode: h.storage.get('halloween-yearbook:display-mode:v1'), saved: progressBefore });
  assert.equal(normalReload.api.state.displayMode, 'normal');
  assert.equal(normalReload.$('visit-count').textContent, '1');
  assert.equal(normalReload.$('horror-toggle').hidden, true);
  normalReload.$('mode-halloween').click();
  assert.equal(normalReload.storage.get('halloween-yearbook:display-mode:v1'), 'halloween');
  assert.equal(normalReload.$('edition-text').textContent, '2026 · HALLOWEEN YEARBOOK');
  const halloweenReload = await harness({ savedMode: normalReload.storage.get('halloween-yearbook:display-mode:v1') });
  assert.equal(halloweenReload.api.state.displayMode, 'halloween');
  assert.equal(halloweenReload.$('theater').dataset.horror, 'false');
});

test('unknown stored mode falls back safely to Halloween without enabling horror', async () => {
  for (const value of ['horror', '<script>alert(1)</script>', 'NORMAL', '{broken']) {
    const h = await harness({ savedMode: value });
    assert.equal(h.api.state.displayMode, 'halloween');
    assert.equal(h.$('theater').dataset.mode, 'halloween');
    assert.equal(h.$('theater').dataset.horror, 'false');
    assert.equal(h.$('load-error').hidden, true);
  }
});

test('repeated mode switches preserve selected person, year, search, tags and visits', async () => {
  const data = structuredClone(archive); data.years.push({ ...structuredClone(data.years[0]), year: 2025 });
  const h = await harness({ data }); h.api.setYear(2025); await h.api.navigate(3);
  h.$('story-open').click(); h.$('detail').close(); await h.tick(0);
  h.$('list-open').click(); h.$('search').value = '@mama_ca'; h.$('search').dispatch('input');
  h.$('tags').children.find(n => n.textContent === '作品準備中').click();
  const name = h.$('room-title').textContent, image = h.$('artwork-image').src;
  const expectedProgress = JSON.stringify(h.api.state.progress);
  for (let i = 0; i < 8; i++) {
    const mode = i % 2 === 0 ? 'normal' : 'halloween'; h.$(`mode-${mode}`).click();
    assert.equal(h.api.state.currentYear, 2025);
    assert.equal(h.api.state.currentIndex, 3);
    assert.equal(h.$('room-title').textContent, name);
    assert.equal(h.$('artwork-image').src, image);
    assert.equal(h.$('visit-count').textContent, '1');
    assert.equal(JSON.stringify(h.api.state.progress), expectedProgress);
    assert.equal(h.api.state.search, '@mama_ca');
    assert.equal(h.api.state.activeTag, '作品準備中');
    assert.equal(h.$('search').value, '@mama_ca');
    assert.equal(h.$('roster-grid').querySelectorAll('button').length, 1);
    assert.equal(h.$('roster').open, true);
    assert.equal(h.$('edition-text').textContent, `2025 · ${mode === 'normal' ? 'CREATORS' : 'HALLOWEEN'} YEARBOOK`);
  }
});

test('switching modes updates an open pending-profile dialog without re-recording visits', async () => {
  const h = await harness(); await h.api.navigate(1); h.$('story-open').click();
  const pending = h.$('detail-content').querySelector('.pending-copy');
  assert.match(pending.textContent, /ハロウィン作品は準備中/);
  const title = h.$('detail-title'), link = h.$('detail-content').querySelector('a');
  h.$('mode-normal').click();
  assert.equal(h.$('detail').open, true);
  assert.match(pending.textContent, /^作品の掲載は準備中/);
  assert.doesNotMatch(pending.textContent, /ハロウィン/);
  assert.equal(h.$('detail-title'), title);
  assert.equal(h.$('detail-content').querySelector('a'), link);
  assert.equal(h.$('visit-count').textContent, '1');
  h.$('mode-halloween').click();
  assert.match(pending.textContent, /ハロウィン作品は準備中/);
  assert.equal(h.$('visit-count').textContent, '1');
});

test('storage denial never blocks mode changes, horror controls or real-roster navigation', async () => {
  const h = await harness({ storageThrows: true });
  assert.equal(h.$('load-error').hidden, true);
  h.$('mode-normal').click(); assert.equal(h.api.state.displayMode, 'normal');
  await h.api.navigate(4); assert.equal(h.api.state.currentIndex, 4);
  h.$('story-open').click(); assert.equal(h.$('visit-count').textContent, '1');
  assert.match(h.$('detail-content').textContent, /保存できません/);
  h.$('detail').close(); await h.tick(0);
  h.$('mode-halloween').click(); h.$('horror-toggle').click();
  assert.equal(h.$('theater').dataset.horror, 'true');
  h.$('mode-normal').click(); assert.equal(h.$('theater').dataset.horror, 'false');
  assert.equal(h.$('visit-count').textContent, '1');
});

test('horror requires opt-in, toggles off, stays Halloween-only, and never persists', async () => {
  const h = await harness();
  await h.api.navigate(5); h.$('mode-halloween').click();
  assert.equal(h.$('theater').dataset.horror, 'false');
  const beforeHorror = JSON.stringify([...h.storage.entries()]);
  h.$('horror-toggle').click();
  assert.equal(h.$('theater').dataset.horror, 'true');
  assert.equal(h.$('horror-toggle').getAttribute('aria-pressed'), 'true');
  assert.match(h.$('horror-toggle').textContent, /明るい館へ戻る/);
  assert.equal(JSON.stringify([...h.storage.entries()]), beforeHorror, 'horror changes no saved state');
  assert.equal(h.api.state.currentIndex, 5);
  h.$('horror-toggle').click(); assert.equal(h.$('theater').dataset.horror, 'false');
  h.$('horror-toggle').click(); assert.equal(h.$('theater').dataset.horror, 'true');
  const reloaded = await harness({ savedMode: h.storage.get('halloween-yearbook:display-mode:v1'), saved: h.storage.get('halloween-yearbook:night-doors:v1') });
  assert.equal(reloaded.$('theater').dataset.horror, 'false');
  h.$('mode-normal').click();
  assert.equal(h.$('theater').dataset.horror, 'false');
  assert.equal(h.$('horror-toggle').hidden, true);
  h.api.setHorror(true); assert.equal(h.$('theater').dataset.horror, 'false', 'normal mode also rejects direct enabling');
  h.$('mode-halloween').click();
  assert.equal(h.$('horror-toggle').hidden, false);
  assert.equal(h.$('theater').dataset.horror, 'false', 'returning to Halloween does not re-enable horror');
  assert.equal(h.api.state.currentIndex, 5);
});

test('Escape closes an open dialog first, then exits horror on a separate press', async () => {
  const h = await harness();
  h.$('horror-toggle').click(); h.$('story-open').focus(); h.$('story-open').click();
  assert.equal(h.$('detail').open, true);
  assert.equal(h.keydown('Escape'), false, 'app leaves the first Escape to native dialog dismissal');
  await h.tick(0);
  assert.equal(h.$('detail').open, false);
  assert.equal(h.$('theater').dataset.horror, 'true');
  assert.equal(h.doc.activeElement, h.$('story-open'));
  assert.equal(h.keydown('Escape'), true, 'the next Escape exits horror');
  assert.equal(h.$('theater').dataset.horror, 'false');
});

test('mode and horror switches add no callbacks or duplicate navigation and story actions', async () => {
  const h = await harness();
  for (let i = 0; i < 6; i++) {
    h.$('mode-normal').click(); h.$('mode-halloween').click();
    h.$('horror-toggle').click(); h.$('horror-toggle').click();
  }
  for (const id of ['mode-normal', 'mode-halloween', 'horror-toggle', 'next', 'previous', 'story-open', 'artwork-open']) {
    assert.equal(h.$(id).handlers.click.length, 1, `${id} retains one click handler`);
  }
  assert.equal(h.doc.handlers.keydown.length, 1);
  h.$('next').click(); await h.flush(); assert.equal(h.api.state.currentIndex, 1);
  h.$('story-open').click(); assert.equal(h.$('visit-count').textContent, '1');
  h.$('detail-content').querySelector('.secondary').click(); await h.tick(0);
  assert.equal(h.api.state.currentIndex, 2);
  h.$('story-open').click(); assert.equal(h.$('visit-count').textContent, '2');
});

test('a mode switch during an animated turn preserves the latest mode and one navigation', async () => {
  const h = await harness({ reduced: false });
  h.$('next').click(); await h.tick(100); h.$('mode-normal').click();
  assert.equal(h.api.state.busy, true);
  await h.tick(100); assert.equal(h.api.state.currentIndex, 1);
  assert.equal(h.api.state.displayMode, 'normal');
  assert.equal(h.$('theater').dataset.mode, 'normal');
  assert.equal(h.$('invitation-year').textContent, 'CREATORS 2026');
  await h.tick(450); assert.equal(h.api.state.busy, false);
});

test('changing years or reloading in normal mode preserves neutral copy, including empty years', async () => {
  const data = structuredClone(archive);
  data.years.push({ year: 2027, title: '', description: '', plannedSlots: 2, entries: [] });
  const h = await harness({ data, savedMode: 'normal' });
  assert.equal(h.$('edition-text').textContent, '2027 · CREATORS YEARBOOK');
  assert.equal(h.$('horror-toggle').hidden, true);
  h.api.setYear(2026);
  assert.equal(h.$('edition-text').textContent, '2026 · CREATORS YEARBOOK');
  await h.api.navigate(8);
  assert.equal(h.$('invitation-year').textContent, 'CREATORS 2026');
  h.api.load(); await h.succeed(h.requests.at(-1));
  assert.equal(h.api.state.displayMode, 'normal');
  assert.equal(h.$('edition-text').textContent, '2027 · CREATORS YEARBOOK');
  assert.equal(h.$('theater').dataset.horror, 'false');
});

const sealEvent = (h, id) => h.$('theater').dispatch('yearbook:seal-collected', { detail: { id } });
const activeSeals = h => JSON.parse(h.$('theater').dataset.seals || '[]');
const savedSeals = (seals, stamps = {}) => JSON.stringify({ stamps, stars: {}, seals });

test('all three valid light seals persist without adding participant visits or completing the roster', async () => {
  const h = await harness();
  assert.deepEqual(activeSeals(h), []);
  for (const [i, id] of ['light-1', 'light-2', 'light-3'].entries()) {
    sealEvent(h, id);
    assert.deepEqual(activeSeals(h), ['light-1', 'light-2', 'light-3'].slice(0, i + 1));
    const saved = JSON.parse(h.storage.get('halloween-yearbook:night-doors:v1'));
    assert.deepEqual(saved.seals['archive:2026'], activeSeals(h));
    assert.equal(h.$('visit-count').textContent, '0');
    assert.equal(h.$('theater').classList.contains('complete'), false);
    assert.equal(h.$('room-dots').querySelectorAll('.visited').length, 0);
    assert.equal(h.api.state.currentIndex, 0);
  }
  h.$('passport-open').click();
  assert.match(h.$('passport-content').textContent, /光の封印 3 \/ 3/);
  assert.match(h.$('passport-content').textContent, /0 \/ 9人を訪問/);
  const reloaded = await harness({ saved: h.storage.get('halloween-yearbook:night-doors:v1') });
  assert.deepEqual(activeSeals(reloaded), ['light-1', 'light-2', 'light-3']);
  assert.equal(reloaded.$('visit-count').textContent, '0');
});

test('invalid, missing and duplicate seal events leave state and saved writes unchanged', async () => {
  const h = await harness(); sealEvent(h, 'light-2');
  const expected = JSON.stringify(h.api.state.progress), writes = h.storageWrites.length;
  for (const id of ['light-2', 'light-0', 'light-4', 'light-1 ', 'LIGHT-1', '', null, undefined, 1, true, {}, ['light-1'], 'ss_yr', 'future-1', '__proto__']) {
    sealEvent(h, id);
    assert.equal(JSON.stringify(h.api.state.progress), expected);
    assert.deepEqual(activeSeals(h), ['light-2']);
    assert.equal(h.storageWrites.length, writes);
  }
  for (const detail of [null, undefined, {}, 'light-1']) {
    h.$('theater').dispatch('yearbook:seal-collected', { detail });
    assert.equal(JSON.stringify(h.api.state.progress), expected);
    assert.equal(h.storageWrites.length, writes);
  }
});

test('seal events before the initial year loads cannot create undefined-year progress', async () => {
  const h = await harness({ autoLoad: false });
  sealEvent(h, 'light-1');
  assert.equal(h.api.state.currentYear, undefined);
  assert.equal(Object.keys(h.api.state.progress.seals).length, 0);
  assert.equal(h.storageWrites.length, 0);
  await h.succeed(h.requests[0]);
  assert.deepEqual(activeSeals(h), []);
  sealEvent(h, 'light-1'); assert.deepEqual(activeSeals(h), ['light-1']);
  assert.equal(h.api.state.progress.seals['archive:undefined'], undefined);
});

test('seal collection is independent for each year and survives mode changes and navigation', async () => {
  const data = structuredClone(archive); data.years.push({ ...structuredClone(data.years[0]), year: 2025 });
  const h = await harness({ data }); sealEvent(h, 'light-1'); sealEvent(h, 'light-3');
  h.api.setYear(2025); assert.deepEqual(activeSeals(h), []);
  sealEvent(h, 'light-2');
  for (const mode of ['normal', 'halloween', 'normal']) {
    h.$(`mode-${mode}`).click(); await h.api.navigate(4);
    assert.deepEqual(activeSeals(h), ['light-2']);
    assert.equal(h.api.state.currentYear, 2025);
  }
  h.api.setYear(2026); assert.deepEqual(activeSeals(h), ['light-1', 'light-3']);
  h.api.setYear(2025); assert.deepEqual(activeSeals(h), ['light-2']);
  const saved = JSON.parse(h.storage.get('halloween-yearbook:night-doors:v1'));
  assert.deepEqual(saved.seals, { 'archive:2026': ['light-1', 'light-3'], 'archive:2025': ['light-2'] });
});

test('year reset removes only that year’s seals and visits and allows collecting again', async () => {
  const data = structuredClone(archive); data.years.push({ ...structuredClone(data.years[0]), year: 2025 });
  const h = await harness({ data });
  sealEvent(h, 'light-1'); h.$('story-open').click(); h.$('detail').close(); await h.tick(0);
  h.api.setYear(2025); sealEvent(h, 'light-2'); sealEvent(h, 'light-3');
  h.$('story-open').click(); h.$('detail').close(); await h.tick(0);
  h.$('passport-open').click(); h.$('reset').click(); await h.tick(0);
  assert.deepEqual(activeSeals(h), []);
  assert.equal(h.$('visit-count').textContent, '0');
  assert.equal(h.api.state.progress.seals['archive:2025'], undefined);
  const saved = JSON.parse(h.storage.get('halloween-yearbook:night-doors:v1'));
  assert.equal(saved.seals['archive:2025'], undefined);
  assert.deepEqual(saved.seals['archive:2026'], ['light-1']);
  assert.deepEqual(saved.stamps['archive:2026'], ['ss_yr']);
  sealEvent(h, 'light-2'); assert.deepEqual(activeSeals(h), ['light-2']);
  h.api.setYear(2026);
  assert.deepEqual(activeSeals(h), ['light-1']);
  assert.equal(h.$('visit-count').textContent, '1');
});

test('missing and malformed saved seals maps recover safely while preserving ordinary visits', async () => {
  for (const malformed of [undefined, null, [], ['light-1'], '', 'light-1', 17, false]) {
    const h = await harness({ saved: savedSeals(malformed, { 'archive:2026': ['ss_yr'] }) });
    assert.equal(h.$('load-error').hidden, true);
    assert.equal(h.$('visit-count').textContent, '1');
    assert.deepEqual(activeSeals(h), []);
    sealEvent(h, 'light-2');
    assert.deepEqual(activeSeals(h), ['light-2']);
    assert.equal(h.$('visit-count').textContent, '1');
    assert.deepEqual(JSON.parse(h.storage.get('halloween-yearbook:night-doors:v1')).seals, { 'archive:2026': ['light-2'] });
  }
});

test('malformed annual seals, unknown IDs and duplicate saved IDs never inflate seal counts', async () => {
  for (const malformed of [null, 'light-1', 3, true, {}, { 'light-1': true }]) {
    const h = await harness({ saved: savedSeals({ 'archive:2026': malformed }) });
    assert.equal(h.$('load-error').hidden, true);
    assert.deepEqual(activeSeals(h), []);
    sealEvent(h, 'light-1'); assert.deepEqual(activeSeals(h), ['light-1']);
  }
  const h = await harness({ saved: savedSeals({ 'archive:2026': ['light-1', 'light-1', 'light-3', 'unknown', null, 3, {}, ['light-2']] }) });
  assert.deepEqual(activeSeals(h), ['light-1', 'light-3']);
  h.$('passport-open').click(); assert.match(h.$('passport-content').textContent, /光の封印 2 \/ 3/);
  h.$('passport').close(); await h.tick(0);
  sealEvent(h, 'light-2');
  assert.deepEqual(activeSeals(h), ['light-1', 'light-3', 'light-2']);
  assert.deepEqual(JSON.parse(h.storage.get('halloween-yearbook:night-doors:v1')).seals['archive:2026'], ['light-1', 'light-3', 'light-2']);
});

test('blocked storage keeps seal collection and annual reset working for the current session', async () => {
  const h = await harness({ storageThrows: true });
  sealEvent(h, 'light-1'); sealEvent(h, 'light-2'); sealEvent(h, 'light-2');
  assert.equal(h.api.state.storageOK, false);
  assert.deepEqual(activeSeals(h), ['light-1', 'light-2']);
  assert.equal(h.$('load-error').hidden, true);
  h.$('passport-open').click();
  assert.match(h.$('passport-content').textContent, /光の封印 2 \/ 3/);
  assert.match(h.$('passport-content').textContent, /保存できません/);
  h.$('reset').click(); await h.tick(0);
  assert.deepEqual(activeSeals(h), []);
  sealEvent(h, 'light-3'); assert.deepEqual(activeSeals(h), ['light-3']);
  assert.equal(h.storage.size, 0);
});

test('storage write failure preserves loaded seals and records new seals in memory without claiming persistence', async () => {
  const saved = savedSeals({ 'archive:2026': ['light-1'] }, { 'archive:2026': ['ss_yr'] });
  const h = await harness({ saved, storageWriteThrows: true });
  assert.deepEqual(activeSeals(h), ['light-1']);
  assert.equal(h.api.state.storageOK, true, 'reading existing storage succeeded');
  sealEvent(h, 'light-2');
  assert.equal(h.api.state.storageOK, false);
  assert.deepEqual(activeSeals(h), ['light-1', 'light-2']);
  assert.equal(h.storage.get('halloween-yearbook:night-doors:v1'), saved);
  assert.equal(h.$('visit-count').textContent, '1');
  h.$('passport-open').click(); assert.match(h.$('passport-content').textContent, /保存できません/);
});

test('scene motion is initialized once and seal listeners do not multiply on reload or mode changes', async () => {
  const h = await harness();
  assert.equal(h.motionInitializations.length, 1);
  assert.equal(h.motionInitializations[0], h.$('theater'));
  for (let i = 0; i < 3; i++) {
    h.$('mode-normal').click(); h.$('mode-halloween').click();
    h.api.load(); await h.succeed(h.requests.at(-1));
  }
  assert.equal(h.motionInitializations.length, 1);
  assert.equal(h.$('theater').handlers['yearbook:seal-collected'].length, 1);
  const writes = h.storageWrites.length;
  sealEvent(h, 'light-1');
  assert.equal(h.storageWrites.length, writes + 1);
  assert.deepEqual(activeSeals(h), ['light-1']);
});

test('motionPaused makes navigation immediate even when reduced-motion is not requested', async () => {
  const h = await harness({ reduced: false });
  h.$('theater').dataset.motionPaused = 'true';
  h.$('next').click();
  assert.equal(h.api.state.currentIndex, 1, 'no timer is needed to select the next room');
  assert.equal(h.api.state.busy, false);
  assert.equal(h.$('theater').classList.contains('turning-out'), false);
  assert.equal(h.$('theater').classList.contains('turning-in'), false);
  h.$('previous').click(); assert.equal(h.api.state.currentIndex, 0);
  h.$('previous').click(); assert.equal(h.api.state.currentIndex, 8);
  h.$('next').click(); assert.equal(h.api.state.currentIndex, 0);
  await h.tick(1000);
  assert.equal(h.api.state.currentIndex, 0, 'no delayed turn runs after immediate navigation');
  assert.equal(h.api.state.busy, false);
});

test('resuming motion restores the existing outgoing and incoming navigation timing', async () => {
  const h = await harness({ reduced: false });
  h.$('theater').dataset.motionPaused = 'true'; h.$('next').click();
  assert.equal(h.api.state.currentIndex, 1);
  h.$('theater').dataset.motionPaused = 'false'; h.$('next').click();
  assert.equal(h.api.state.currentIndex, 1);
  assert.equal(h.api.state.busy, true);
  await h.tick(199); assert.equal(h.api.state.currentIndex, 1);
  await h.tick(1); assert.equal(h.api.state.currentIndex, 2);
  assert.equal(h.api.state.busy, true);
  await h.tick(449); assert.equal(h.api.state.busy, true);
  await h.tick(1); assert.equal(h.api.state.busy, false);
  assert.equal(h.$('theater').classList.contains('turning-in'), false);
});

test('pausing during an outgoing turn skips the remaining entrance animation', async () => {
  const h = await harness({ reduced: false });
  h.$('next').click(); await h.tick(100);
  h.$('theater').dataset.motionPaused = 'true';
  await h.tick(100);
  assert.equal(h.api.state.currentIndex, 1);
  assert.equal(h.api.state.busy, false);
  assert.equal(h.$('theater').classList.contains('turning-in'), false);
  h.$('next').click(); assert.equal(h.api.state.currentIndex, 2);
  await h.tick(1000); assert.equal(h.api.state.currentIndex, 2);
});


test('opt-in touch view moves decorative viewpoint without navigating and pause exits it', async()=>{
 const h=await harness({reduced:false});h.$('view-toggle').click();assert.equal(h.$('theater').dataset.viewMode,'true');
 h.$('stage').dispatch('pointerdown',{pointerType:'touch',pointerId:2,clientX:100,clientY:100});
 h.$('stage').dispatch('pointermove',{pointerId:2,clientX:180,clientY:140});
 assert.deepEqual(h.viewCalls.at(-1),[.8,.4]);
 h.$('stage').dispatch('pointerup',{pointerId:2,clientX:180,clientY:140});assert.equal(h.api.state.currentIndex,0);assert.deepEqual(h.viewCalls.at(-1),[0,0]);
 h.$('theater').dispatch('yearbook:motion-state',{detail:{paused:true}});assert.equal(h.$('theater').dataset.viewMode,'false');assert.equal(h.$('view-toggle').disabled,true);
 h.$('theater').dispatch('yearbook:motion-state',{detail:{paused:false}});assert.equal(h.$('view-toggle').disabled,false);assert.equal(h.$('theater').dataset.viewMode,'false');
});
test('reduced-motion cannot enter touch view and leaves ordinary navigation available',async()=>{
 const h=await harness({reduced:true});h.$('view-toggle').click();assert.equal(h.$('theater').dataset.viewMode,'false');h.$('next').click();assert.equal(h.api.state.currentIndex,1);
});

test('spatial seal targets follow each annual roster instead of hardcoded people',async()=>{
 const data=structuredClone(archive);data.years.push({year:2027,title:'',description:'',entries:data.years[0].entries.slice(0,2)});data.years.push({year:2028,title:'',description:'',entries:[]});
 const h=await harness({data});assert.deepEqual(JSON.parse(h.$('theater').dataset.sealRooms),[]);
 h.api.setYear(2026);assert.deepEqual(JSON.parse(h.$('theater').dataset.sealRooms),['ss_yr','mama_ca','fond_holly3483']);assert.equal(h.$('theater').dataset.creatorId,'ss_yr');
 await h.api.navigate(6,{immediate:true});assert.equal(h.$('theater').dataset.creatorId,'fond_holly3483');
 h.api.setYear(2027);assert.deepEqual(JSON.parse(h.$('theater').dataset.sealRooms),['ss_yr','ss_yr','koakumako']);
 h.api.setYear(2028);assert.equal(h.$('theater').dataset.creatorId,'');assert.deepEqual(JSON.parse(h.$('theater').dataset.sealRooms),[]);
});
