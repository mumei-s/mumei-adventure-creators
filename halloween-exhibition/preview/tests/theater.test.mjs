import { createDoorPalettePicker } from '../door-palette.js';
import { installGalleryGesture } from '../gallery-gesture.js';
import { initPalaceEntrance } from '../palace-entrance.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';
import { createSlideshowController } from '../slideshow.js';
import { validateArchive, safeURL, normalizeSearch, doorIdFor } from '../data-model.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = await readFile(new URL('../theater.js', import.meta.url), 'utf8');
const archive = JSON.parse(await readFile(new URL('../data/archive.json', import.meta.url)));

const annualEntries = archive.years[0].entries;
const doorCount = annualEntries.length;
const creatorCount = archive.creators.length;
const pageCount = Math.ceil(doorCount / 5);
const pendingEntries = annualEntries.filter(entry => entry.submissionStatus === 'pending');
const pendingCount = pendingEntries.length;
const pendingPeople = new Set(pendingEntries.map(entry => entry.creatorId)).size;
const ownerWorkIndex = annualEntries.findIndex(entry => entry.doorId === 'owner-work-2026');
const creatorDoorIndex = id => annualEntries.findIndex(entry => entry.creatorId === id);

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
  get ownerDocument() { return this.doc; }
  hasAttribute(k) { return Object.hasOwn(this.attrs,k); }
  contains(el) { for(let n=el;n;n=n.parentNode)if(n===this)return true;return false; }
  removeEventListener(type,fn) { this.handlers[type]=(this.handlers[type]||[]).filter(f=>f!==fn); }
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
  append(...children) { for (const c of children) { c.remove(); c.parentNode = this; this.children.push(c); } }
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
    const matches = (el, sel) => sel.startsWith('#') ? el.id === sel.slice(1) : sel.startsWith('.') ? el.classList.contains(sel.slice(1)) : sel === 'dialog[open]' ? el.tagName === 'DIALOG' && el.open : el.tagName === sel.toUpperCase();
    const walk = el => { for (const c of el.children) { if (selectors.some(sel => matches(c, sel.trim()))) out.push(c); walk(c); } };
    walk(this); return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

async function harness({ data = archive, reduced = true, storageThrows = false, storageWriteThrows = false, saved = null, savedMode = null, urlSearch = '', returnState = null, autoLoad = true, strictTimerReceiver = false, entrance = false } = {}) {
  let now = 0, seq = 0; const timers = new Map(), storage = new Map(saved ? [['halloween-yearbook:night-doors:v1', saved]] : []);
  if (savedMode !== null) storage.set('halloween-yearbook:display-mode:v1', savedMode);
  const queue = (fn, delay = 0) => { const id = ++seq; timers.set(id, { at: now + delay, fn }); return id; };
  const doc = { queue, handlers: {}, activeElement: null, createElement(tag) { return new Element(tag, this); }, createTextNode(text) { const el = new Element('#text', this); el.textContent = text; return el; }, addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); } };
  doc.defaultView={matchMedia:()=>({matches:reduced,addEventListener(){},removeEventListener(){}}),addEventListener(){},removeEventListener(){}};
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
  const context = vm.createContext({ createDoorPalettePicker, installGalleryGesture, createSlideshowController, initPalaceEntrance:entrance?(args)=>initPalaceEntrance({...args,timers:{setTimeout:queue,clearTimeout:id=>timers.delete(id)}}):({root,onViewChange})=>{root.dataset.palaceState='gallery';return {enter(){root.dataset.palaceState='gallery';onViewChange({view:'gallery',opening:false});},home(){root.dataset.palaceState='palace';onViewChange({view:'palace',opening:false});},setMode(){root.dataset.palaceState='gallery';onViewChange({view:'gallery',opening:false});}}}, initDisplayMode:()=>({}), document: doc, initVisitorPreferences:options=>{options.onBrightness(75);const section=doc.createElement('section');section.className='visitor-preferences';doc.body.append(section);return {};}, initSceneMotion:root=>{motionInitializations.push(root);const dock=doc.createElement('div');dock.className='scene-controls';root.append(dock);return {setView(x,y){viewCalls.push([x,y]);}};}, validateArchive, safeURL, normalizeSearch, doorIdFor,
    matchMedia: () => ({ matches: reduced }),
    // Native browser timers reject a plain-object receiver (Illegal invocation).
    setTimeout: function(fn, delay) { if (strictTimerReceiver && this != null && this.document !== doc) throw new TypeError('Illegal invocation'); return queue(fn, delay); },
    clearTimeout: function(id) { if (strictTimerReceiver && this != null && this.document !== doc) throw new TypeError('Illegal invocation'); return timers.delete(id); },
    URLSearchParams, location:{search:urlSearch},sessionStorage:{getItem(){return returnState},setItem(k,v){context.savedReturn={key:k,value:v};}},
    Date: class extends Date { static now() { return now; } },
    localStorage: { getItem(k) { if (storageThrows) throw Error('blocked'); return storage.get(k) || null; }, setItem(k, v) { storageWrites.push({key:k,value:v}); if (storageThrows || storageWriteThrows) throw Error('blocked'); storage.set(k, v); } },
    fetch: () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
  });
  vm.runInContext(source.replace(/^import[^\n]+\n/gm, '') + '\nglobalThis.testAPI={countPeople:()=>validStamps().length,seenDoors:viewedDoors,navigate,setYear,load,openStory,renderProgress,setMode, get state(){return {currentYear,currentIndex,busy,storageOK,progress,displayMode,search,activeTag,slideshow:slideshow?.getState()};}};', context);
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
  return { getReturn:()=>context.savedReturn, doc, keydown, $: doc.getElementById, api: context.testAPI, requests, storage, storageWrites, motionInitializations, viewCalls, tick, flush, succeed };
}

test('initial load renders all real article doors and creators', async () => {
  const h = await harness();
  assert.equal(h.$('load-error').hidden, true);
  assert.equal(h.$('room-dots').querySelectorAll('button').length, doorCount);
  assert.equal(h.$('room-dots').querySelectorAll('.future-face').length, 0);
  assert.equal(h.$('total-index').textContent, String(doorCount).padStart(2, '0'));
  assert.equal(h.$('sample-notice').textContent, `参加者${creatorCount}人 · 扉${doorCount}枚`);
  assert.equal(h.$('results').textContent, `扉 ${doorCount} / ${doorCount}枚 · 1〜5枚目を表示 · 参加者${creatorCount}人`);
  assert.match(h.$('creator-name').textContent, /主催者の企画紹介記事/);
  assert.equal(h.$('room-title').textContent, archive.creators[0].name);
  assert.equal(h.$('artwork-image').src, archive.years[0].entries[0].image);
  await h.api.navigate(2);
  const mako = archive.years[0].entries[2];
  assert.equal(mako.creatorId, 'koakumako');
  assert.equal(mako.submissionStatus, 'submitted');
  assert.match(h.$('creator-name').textContent, /本場のHalloweenを見せてあげる/);
  assert.match(h.$('creator-name').textContent, /参加者の展示/);
  assert.equal(h.$('artwork-image').src, mako.image);
  assert.equal(h.$('artwork-image').alt, mako.imageAlt);
  h.$('artwork-open').click();
  assert.match(h.$('detail-content').textContent, /本場のHalloweenを見せてあげる/);
  assert.doesNotMatch(h.$('detail-content').textContent, /ハロウィン作品は準備中|架空の参加者|展示サンプル/);
  assert.ok(h.$('detail-content').querySelectorAll('a').some(link => link.href === 'https://note.com/koakumako/n/na9731433238f'));
  h.$('detail').close(); await h.tick(0);
  await h.api.navigate(3);
  assert.equal(archive.years[0].entries[3].submissionStatus, 'pending');
  assert.match(h.$('creator-name').textContent, /プロフィール画像 · 作品準備中/);
  assert.equal(h.$('artwork-image').src, archive.creators[2].avatar);
  assert.equal(h.$('artwork-image').alt, `${archive.creators[2].name}のnoteプロフィール画像`);
  h.$('artwork-open').click();
  assert.match(h.$('detail-content').textContent, /ハロウィン作品は準備中/);
  assert.doesNotMatch(h.$('detail-content').textContent, /架空の参加者|展示サンプル/);
});

test('expanded roster renders all three confirmed submissions with their own art and links', async () => {
  assert.equal(creatorCount, 13);
  assert.equal(doorCount, 14);
  assert.equal(pendingCount, 10);
  assert.equal(annualEntries.filter(entry => entry.submissionStatus === 'introduction').length, 1);
  const submitted = annualEntries.filter(entry => entry.submissionStatus === 'submitted');
  assert.deepEqual(new Set(submitted.map(entry => entry.creatorId)), new Set(['koakumako', 'imota14', 'clever_hare2654']));
  const h = await harness();
  for (const entry of submitted) {
    await h.api.navigate(annualEntries.indexOf(entry));
    assert.equal(h.$('theater').dataset.creatorId, entry.creatorId);
    assert.equal(h.$('artwork-image').src, entry.image);
    assert.ok(h.$('creator-name').textContent.includes(entry.title));
    h.$('artwork-open').click();
    assert.ok(h.$('detail-content').textContent.includes(entry.title));
    const links = h.$('detail-content').querySelectorAll('a').map(link => link.href);
    for (const link of entry.links) assert.ok(links.includes(link.url));
    assert.doesNotMatch(h.$('detail-content').textContent, /ハロウィン作品は準備中/);
    h.$('detail').close(); await h.tick(0);
  }
});

test('previous and next wrap around and selected dots match the room', async () => {
  const h = await harness(); await h.api.navigate(-1); assert.equal(h.api.state.currentIndex, doorCount - 1);
  assert.equal(h.$('room-dots').children[doorCount - 1].getAttribute('aria-current'), 'true');
  await h.api.navigate(doorCount); assert.equal(h.api.state.currentIndex, 0);
});

test('swipe advances once and suppresses following synthetic artwork click', async () => {
  const h = await harness(); const stage = h.$('stage');
  stage.dispatch('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 200 });
  for(const fn of h.doc.handlers.pointerup||[])fn({ pointerType:'touch', pointerId: 1, clientX: 80, clientY: 210 });
  await h.flush(); assert.equal(h.api.state.currentIndex, 1);
  h.$('artwork-open').click(); assert.equal(h.$('detail').open, false);
  await h.tick(501); h.$('artwork-open').click(); assert.equal(h.$('detail').open, true);
});

test('vertical gestures do not change rooms and cancelled touches do nothing', async () => {
  const h = await harness(); const stage = h.$('stage');
  stage.dispatch('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100 });
  for(const fn of h.doc.handlers.pointerup||[])fn({ pointerType:'touch', pointerId: 1, clientX: 110, clientY: 250 });
  assert.equal(h.api.state.currentIndex, 0);
  stage.dispatch('pointerdown', { pointerType: 'touch', pointerId: 2, clientX: 200, clientY: 100 });
  for(const fn of h.doc.handlers.pointercancel||[])fn({pointerType:'touch',pointerId:2}); for(const fn of h.doc.handlers.pointerup||[])fn({ pointerType:'touch', pointerId: 2, clientX: 0, clientY: 100 });
  assert.equal(h.api.state.currentIndex, 0);
});

test('opening the same story twice remains deduplicated and collection changes preserve stored records', async()=>{
 const data=structuredClone(archive);data.years.push({...structuredClone(data.years[0]),year:2025});const h=await harness({data});
 for(let i=0;i<2;i++){h.$('artwork-open').click();h.$('detail').close();await h.tick(0);}assert.equal(h.api.countPeople(),1);
 h.api.setYear(2025);assert.equal(h.api.countPeople(),0);h.$('artwork-open').click();h.$('detail').close();await h.tick(0);h.api.setYear(2026);assert.equal(h.api.countPeople(),1);
 assert.equal(h.$('passport-open'),undefined);assert.equal(h.$('reset'),undefined);assert.equal(h.$('visit-count'),undefined);
});

test('storage denial keeps article access usable without history controls', async () => {
  const h = await harness({ storageThrows: true }); h.$('artwork-open').click();
  assert.equal(h.api.state.storageOK, false); assert.equal(String(h.api.countPeople()), '1');
  assert.ok(h.$('detail-content').querySelectorAll('a').length>0);
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
  assert.match(h.$('results').textContent, new RegExp(`^扉 0 / ${doorCount}枚`));
});

test('an empty newest year can switch to a populated year with navigation fully enabled', async () => {
  const data = structuredClone(archive); data.years.push({ year: 2027, title: '', description: '', entries: [] });
  const h = await harness({ data }); assert.equal(h.$('stage').hidden, true);
  h.api.setYear(2026); assert.equal(h.$('stage').hidden, false);
  for (const id of ['previous','next','artwork-open','artwork-open']) assert.equal(h.$(id).disabled, false, `${id} must be enabled`);
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

test('all real profiles remain deduplicated with no history panel or destructive reset UI',async()=>{
 const h=await harness();for(const creator of archive.creators){await h.api.navigate(creatorDoorIndex(creator.id));h.$('artwork-open').click();h.$('detail').close();await h.tick(0);}
 assert.equal(h.api.countPeople(),creatorCount);assert.equal(h.api.seenDoors().length,creatorCount);assert.equal(h.$('passport'),undefined);assert.equal(h.$('reset'),undefined);
 const before=JSON.stringify(h.api.state.progress);h.api.setMode('normal');h.api.setMode('halloween');assert.equal(JSON.stringify(h.api.state.progress).includes('owner-work-2026'),false);assert.ok(before.includes('ss_yr'));
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
  assert.equal(String(h.api.countPeople()), '0');
  assert.equal(h.$('theater').classList.contains('complete'), false);
  assert.equal(h.$('theater').style['--journey-progress'], '0');
  assert.equal(h.$('room-dots').querySelectorAll('.visited').length, 0);
  assert.equal(h.$('room-dots').querySelectorAll('button').length, doorCount);
  assert.equal(h.api.seenDoors().length, 0);
});

test('ss-yr migrates to ss_yr and only the real owner visit survives legacy progress', async () => {
  const h = await harness({ saved: savedProgress(['ss-yr', ...legacyFictionalIDs]) });
  assert.equal(String(h.api.countPeople()), '1');
  assert.equal(h.$('theater').classList.contains('complete'), false);
  assert.deepEqual(h.$('room-dots').querySelectorAll('.visited').map(n => n.dataset.creatorId), ['ss_yr']);
  assert.equal(h.$('theater').style['--journey-progress'], String(1 / creatorCount));
  h.$('artwork-open').click(); h.$('detail').close(); await h.tick(0);
  assert.equal(String(h.api.countPeople()), '1', 'opening the migrated owner does not add another visit');
  assert.equal(h.api.seenDoors().length, 1);
  const reloaded = await harness({ saved: h.storage.get('halloween-yearbook:night-doors:v1') });
  assert.equal(String(reloaded.api.countPeople()), '1', 'saved migration is idempotent across reloads');
});

test('migration does not double-count an already-current owner or touch another year', async () => {
  const data = structuredClone(archive);
  data.years.push({ ...structuredClone(data.years[0]), year: 2025 });
  const h = await harness({ data, saved: savedProgress(['ss-yr', 'ss_yr', ...legacyFictionalIDs], { 'archive:2025': ['koakumako'] }) });
  assert.equal(String(h.api.countPeople()), '1');
  h.api.setYear(2025); assert.equal(String(h.api.countPeople()), '1');
  assert.deepEqual(h.$('room-dots').querySelectorAll('.visited').map(n => n.dataset.creatorId), ['koakumako']);
  h.api.setYear(2026); assert.equal(String(h.api.countPeople()), '1');
});

test('duplicate persisted IDs do not inflate progress or produce premature completion', async () => {
  const h = await harness({ saved: savedProgress(Array(creatorCount).fill('ss_yr')) });
  assert.equal(String(h.api.countPeople()), '1');
  assert.equal(h.$('theater').classList.contains('complete'), false);
  assert.equal(h.api.seenDoors().length, 1);
});

test('completion is exactly the full unique real roster, ignoring stale and planned IDs', async () => {
  const realIDs = archive.creators.map(c => c.id);
  const stale = ['future-1', 'future-2', 'pending-1', 'pending-2', ...legacyFictionalIDs];
  const h = await harness({ saved: savedProgress([...stale, ...realIDs.slice(0, -1), realIDs[0]]) });
  assert.equal(String(h.api.countPeople()), String(creatorCount - 1));
  assert.equal(h.$('theater').classList.contains('complete'), false);
  await h.api.navigate(creatorDoorIndex(realIDs.at(-1))); h.$('artwork-open').click(); h.$('detail').close(); await h.tick(0);
  assert.equal(String(h.api.countPeople()), String(creatorCount));
  assert.equal(h.$('theater').style['--journey-progress'], '1');
  assert.equal(h.$('theater').classList.contains('complete'), true);
  // Legacy stamps migrate only to original legacy doors; an explicit newer article stays unvisited.
  const migrated=annualEntries.filter(e=>realIDs.slice(0,-1).includes(e.creatorId)&&!e.doorId).length;
  assert.equal(h.$('room-dots').querySelectorAll('.visited').length, migrated+1);
  assert.ok(h.$('room-dots').querySelectorAll('.future-face').every(n => !n.classList.contains('visited')));
  assert.doesNotMatch(h.$('toast').textContent, new RegExp(`${creatorCount}人との出会い`));
  assert.equal(h.$('room-dots').querySelectorAll('button').length, doorCount);
});

test('removed future slots are absent from every interface', async () => {
  const h = await harness(); h.$('list-open').click();
  assert.equal(h.$('roster-grid').querySelectorAll('button').length, 5);
  const markers = [...h.$('room-dots').querySelectorAll('.future-face'), ...h.$('roster-grid').querySelectorAll('.future-card')];
  assert.equal(markers.length, 0);
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
  assert.equal(String(h.api.countPeople()), '0');
  h.$('roster').close(); await h.tick(0);
  assert.equal(h.$('room-dots').querySelectorAll('button').length, doorCount);
});

test('all real profile links have safe URLs and safe new-tab attributes', async () => {
  const h = await harness();
  for (let i = 0; i < archive.creators.length; i++) {
    await h.api.navigate(creatorDoorIndex(archive.creators[i].id)); h.$('artwork-open').click();
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
  data.years[0].entries[2].links = [
    { title: attack, url: 'https://note.com/koakumako?q="<tag>&ref=test' },
    { title: 'unsafe script', url: 'javascript:alert(1)' },
    { title: 'unsafe data', url: 'data:text/html,<script>alert(1)</script>' },
    { title: 'unsafe relative', url: '//evil.example/test' }
  ];
  const h = await harness({ data }); await h.api.navigate(2); h.$('artwork-open').click();
  assert.equal(h.$('room-title').textContent, attack);
  assert.equal(h.$('room-title').children.length, 0);
  assert.equal(h.$('detail-title').textContent, attack);
  assert.equal(h.$('detail-title').children.length, 0);
  const links = h.$('detail-content').querySelectorAll('a').filter(a=>!a.classList.contains('magazine-link'));
  assert.equal(links.length, 2);
  assert.ok(links[0].textContent.startsWith(attack));
  assert.equal(links[0].href, safeURL(data.years[0].entries[2].links[0].url));
  assert.equal(links[0].querySelectorAll('img').length, 0);
  assert.equal(links[0].querySelectorAll('script').length, 0);
  assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML\s*\(/);
});

test('portrait errors use initials with a profile label, never decorative fake artwork', async () => {
  const h = await harness(); await h.api.navigate(2);
  const originalSource = h.$('artwork-image').src;
  h.$('artwork-image').dispatch('error');
  assert.equal(h.$('artwork-image').hidden, true);
  assert.equal(h.$('artwork-fallback').hidden, false);
  assert.equal(h.$('artwork-image').src, originalSource, 'an error must not load a decorative illustration');
  assert.match(h.$('artwork-fallback').textContent, /プロフィール画像/);
  assert.ok(h.$('artwork-fallback').textContent.startsWith(Array.from(archive.creators[1].name).slice(0, 2).join('')));
  assert.equal(h.doc.querySelector('.artwork-mat').style.backgroundImage, 'none');
  h.$('artwork-open').click();
  const portrait = h.$('detail-content').querySelector('img'); portrait.dispatch('error');
  assert.equal(h.$('detail-content').querySelectorAll('img').length, 0);
  assert.equal(h.$('detail-content').querySelector('.profile-fallback').textContent, Array.from(archive.creators[1].name).slice(0, 2).join(''));
  h.$('detail').close(); await h.tick(0);
  await h.api.navigate(3);
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
    const data = structuredClone(archive); data.creators[2].avatar = url;
    assert.equal(data.years[0].entries[3].submissionStatus, 'pending');
    const h = await harness({ data }); await h.api.navigate(3);
    assert.equal(h.$('artwork-image').hidden, true);
    assert.equal(h.$('artwork-fallback').hidden, false);
    assert.match(h.$('artwork-fallback').textContent, /プロフィール画像/);
    assert.equal(h.doc.querySelector('.artwork-mat').style.backgroundImage, 'none');
    h.$('artwork-open').click();
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
  assert.equal(h.$('roster-grid').querySelectorAll('button').length, 5);
  assert.equal(h.$('roster-grid').querySelectorAll('.future-card').length, 0);
  assert.equal(h.$('results').textContent, `扉 ${pendingCount} / ${doorCount}枚 · 1〜5枚目を表示 · 参加者${pendingPeople}人`);
});

test('future slots do not change year-picker counts and an empty year stays incomplete', async () => {
  const data = structuredClone(archive);
  data.years.push({ year: 2027, title: '', description: '', plannedSlots: 2, entries: [] });
  const h = await harness({ data });
  assert.equal(String(h.api.countPeople()), '0');
  assert.equal(h.$('theater').classList.contains('complete'), false);
  assert.equal(h.$('room-dots').querySelectorAll('button').length, 0);
  assert.equal(h.$('room-dots').querySelectorAll('.future-face').length, 0);
  h.$('year-open').click();
  assert.match(h.$('year-list').children[0].textContent, /2027.*0枚の扉/);
  assert.match(h.$('year-list').children[1].textContent, new RegExp(`2026.*${doorCount}枚の扉`));
});

test('Halloween-only entrance is a separate maze link, never an inline horror mode', async () => {
 const h=await harness();
 assert.equal(h.$('horror-entrance').tagName,'A');
 assert.equal(h.$('horror-entrance').getAttribute('href'),'./maze/?return=theatre');
 assert.equal(h.$('horror-entrance').hidden,false);
 assert.equal(h.$('horror-toggle'),undefined);
 h.$('mode-normal').click();
 assert.equal(h.$('horror-entrance').hidden,true);
 assert.equal(h.$('year-open').hidden,true);
 h.$('mode-halloween').click();
 assert.equal(h.$('horror-entrance').hidden,false);
 assert.equal(h.$('year-open').hidden,false);
});

test('normal mode binds evergreen content, not Halloween article image or links', async()=>{
 const h=await harness();h.$('mode-normal').click();
 assert.equal(h.$('artwork-image').src,archive.creators[0].avatar);
 assert.equal(h.$('edition-text').textContent,'CREATORS’ YEARBOOK · 通年');
 assert.equal(h.$('invitation-year').textContent,'CREATORS’ COLLECTION');
 h.$('artwork-open').click();
 assert.match(h.$('detail-content').textContent,/作品の掲載は準備中/);
 assert.doesNotMatch(h.$('detail-content').textContent,/ハロウィン企画|招待状/);
 assert.equal(h.$('detail-content').querySelectorAll('a').length,1);
 assert.equal(h.$('detail-content').querySelector('a').href,archive.creators[0].profileURL);
 h.$('detail').close();h.$('mode-halloween').click();
 assert.equal(h.$('artwork-image').src,archive.years[0].entries[0].image);
});

test('normal visits are evergreen and separate from annual Halloween visits',async()=>{
 const h=await harness();h.$('artwork-open').click();h.$('detail').close();
 h.$('mode-normal').click();assert.equal(String(h.api.countPeople()),'0');
 h.$('artwork-open').click();h.$('detail').close();
 assert.equal(h.api.state.progress.stamps.evergreen.length,1);
 h.api.setYear(2025);assert.equal(String(h.api.countPeople()),'1');
 h.api.setYear(2026);h.$('mode-halloween').click();assert.equal(String(h.api.countPeople()),'1');
});

test('explicit maze return restores Halloween, year, creator and search over saved normal mode',async()=>{
 const h=await harness({savedMode:'normal',urlSearch:'?mode=halloween',returnState:JSON.stringify({year:2026,creatorId:'mama_ca',search:'@mama_ca',activeTag:'作品準備中'})});
 assert.equal(h.api.state.displayMode,'halloween');assert.equal(h.api.state.currentYear,2026);
 assert.equal(h.api.state.currentIndex,creatorDoorIndex('mama_ca'));assert.equal(h.api.state.search,'@mama_ca');
 assert.equal(h.$('roster-grid').querySelectorAll('button').length,1);
 assert.equal(h.$('horror-entrance').hidden,false);
});

test('malformed or stale maze return state safely falls back to real current records',async()=>{
 for(const state of ['{broken','null',JSON.stringify({year:1900,creatorId:'fake',search:4})]){
 const h=await harness({urlSearch:'?mode=halloween',returnState:state});
 assert.equal(h.$('load-error').hidden,true);assert.equal(h.api.state.currentYear,2026);
 assert.equal(h.api.state.currentIndex,0);
 }
});

test('storage denial still permits mode switches, navigation, and separate-room entrance',async()=>{
 const h=await harness({storageThrows:true});h.$('mode-normal').click();
 await h.api.navigate(4);assert.equal(h.api.state.currentIndex,4);
 h.$('artwork-open').click();assert.equal(h.api.state.storageOK,false);
 h.$('detail').close();h.$('mode-halloween').click();
 assert.equal(h.$('horror-entrance').hidden,false);
});

test('mode switch cancels obsolete animation and retains current creator',async()=>{
 const h=await harness({reduced:false});h.$('next').click();await h.tick(100);
 h.$('mode-normal').click();await h.flush();
 assert.equal(h.api.state.currentIndex,0);assert.equal(h.api.state.busy,false);
 assert.equal(h.$('artwork-image').src,archive.creators[0].avatar);
});

test('evergreen collection persists across new empty Halloween years',async()=>{
 const data=structuredClone(archive);data.years.push({year:2027,title:'',description:'',entries:[]});
 const h=await harness({data,savedMode:'normal'});
 assert.equal(h.$('total-index').textContent,String(creatorCount).padStart(2,'0'));
 assert.equal(h.$('edition-text').textContent,'CREATORS’ YEARBOOK · 通年');
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
    assert.equal(String(h.api.countPeople()), '0');
    assert.equal(h.$('theater').classList.contains('complete'), false);
    assert.equal(h.$('room-dots').querySelectorAll('.visited').length, 0);
    assert.equal(h.api.state.currentIndex, 0);
  }
  const reloaded = await harness({ saved: h.storage.get('halloween-yearbook:night-doors:v1') });
  assert.deepEqual(activeSeals(reloaded), ['light-1', 'light-2', 'light-3']);
  assert.equal(String(reloaded.api.countPeople()), '0');
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
    assert.deepEqual(activeSeals(h), mode==='normal'?[]:['light-2']);
    assert.equal(h.api.state.currentYear, 2025);
  }
  h.$('mode-halloween').click();h.api.setYear(2026); assert.deepEqual(activeSeals(h), ['light-1', 'light-3']);
  h.api.setYear(2025); assert.deepEqual(activeSeals(h), ['light-2']);
  const saved = JSON.parse(h.storage.get('halloween-yearbook:night-doors:v1'));
  assert.deepEqual(saved.seals, { 'archive:2026': ['light-1', 'light-3'], 'archive:2025': ['light-2'] });
});

test('mode and year changes never purge existing seals or article-door records',async()=>{
 const data=structuredClone(archive);data.years.push({...structuredClone(data.years[0]),year:2025});const h=await harness({data});
 h.$('artwork-open').click();h.$('detail').close();await h.tick(0);h.$('theater').dispatch('yearbook:seal-collected',{detail:{id:'light-1'}});
 const original=JSON.stringify(h.api.state.progress);h.api.setYear(2025);h.api.setMode('normal');h.api.setMode('halloween');h.api.setYear(2026);
 assert.equal(h.api.countPeople(),1);assert.deepEqual([...h.api.state.progress.seals['archive:2026']],['light-1']);assert.equal(h.$('reset'),undefined);assert.ok(original.includes('legacy-archive-2026-ss_yr'));
});

test('missing and malformed saved seals maps recover safely while preserving ordinary visits', async () => {
  for (const malformed of [undefined, null, [], ['light-1'], '', 'light-1', 17, false]) {
    const h = await harness({ saved: savedSeals(malformed, { 'archive:2026': ['ss_yr'] }) });
    assert.equal(h.$('load-error').hidden, true);
    assert.equal(String(h.api.countPeople()), '1');
    assert.deepEqual(activeSeals(h), []);
    sealEvent(h, 'light-2');
    assert.deepEqual(activeSeals(h), ['light-2']);
    assert.equal(String(h.api.countPeople()), '1');
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
  assert.deepEqual(activeSeals(h), ['light-1', 'light-3']); await h.tick(0);
  sealEvent(h, 'light-2');
  assert.deepEqual(activeSeals(h), ['light-1', 'light-3', 'light-2']);
  assert.deepEqual(JSON.parse(h.storage.get('halloween-yearbook:night-doors:v1')).seals['archive:2026'], ['light-1', 'light-3', 'light-2']);
});

test('blocked storage keeps seal collection and local records usable without history UI',async()=>{
 const h=await harness({storageThrows:true});h.$('theater').dispatch('yearbook:seal-collected',{detail:{id:'light-1'}});h.$('artwork-open').click();
 assert.equal(h.api.state.storageOK,false);assert.equal(h.api.countPeople(),1);assert.deepEqual([...h.api.state.progress.seals['archive:2026']],['light-1']);assert.equal(h.$('passport-open'),undefined);
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
  assert.equal(String(h.api.countPeople()), '1');
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
  h.$('previous').click(); assert.equal(h.api.state.currentIndex, doorCount - 1);
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


test('confusing view and duplicate CTA are absent; ordinary swipe still navigates',async()=>{
 const h=await harness({reduced:true});assert.equal(h.$('view-toggle'),undefined);assert.equal(h.$('story-open'),undefined);
 h.$('stage').dispatch('pointerdown',{pointerType:'touch',pointerId:2,clientX:180,clientY:100});
 for(const fn of h.doc.handlers.pointerup||[])fn({pointerType:'touch',pointerId:2,clientX:60,clientY:110});
 assert.equal(h.api.state.currentIndex,1);assert.equal(h.viewCalls.length,0);
});

test('spatial seal targets follow each annual roster instead of hardcoded people',async()=>{
 const data=structuredClone(archive);data.years.push({year:2027,title:'',description:'',entries:data.years[0].entries.slice(0,2)});data.years.push({year:2028,title:'',description:'',entries:[]});
 const h=await harness({data});assert.deepEqual(JSON.parse(h.$('theater').dataset.sealRooms),[]);
 h.api.setYear(2026);assert.deepEqual(JSON.parse(h.$('theater').dataset.sealRooms),[0, 1, 2].map(i => annualEntries[Math.floor(i * doorCount / 3)].creatorId));assert.equal(h.$('theater').dataset.creatorId,'ss_yr');
 await h.api.navigate(creatorDoorIndex('fond_holly3483'),{immediate:true});assert.equal(h.$('theater').dataset.creatorId,'fond_holly3483');
 h.api.setYear(2027);assert.deepEqual(JSON.parse(h.$('theater').dataset.sealRooms),['ss_yr','ss_yr','ss_yr']);
 h.api.setYear(2028);assert.equal(h.$('theater').dataset.creatorId,'');assert.deepEqual(JSON.parse(h.$('theater').dataset.sealRooms),[]);
});


test('normal roster jumps to the selected creator despite derived evergreen records',async()=>{
 const h=await harness({savedMode:'normal'});h.$('list-open').click();
 h.$('roster-grid').querySelectorAll('button')[2].click();await h.tick(0);
 assert.equal(h.api.state.currentIndex,2);assert.equal(h.$('room-title').textContent,archive.creators[2].name);
});

test('normal real submissions bind only to their creator and remain independent of Halloween',async()=>{
 const data=structuredClone(archive);data.evergreenEntries=[{creatorId:'koakumako',title:'Evergreen test entry',submissionStatus:'published',message:'Normal-only fixture',links:[{title:'Normal test link',url:'https://example.com/normal'}]}];
 const h=await harness({data,savedMode:'normal'});await h.api.navigate(1);h.$('artwork-open').click();
 assert.match(h.$('detail-content').textContent,/Normal-only fixture/);
 h.$('detail').close();h.$('mode-halloween').click();h.$('artwork-open').click();
 assert.doesNotMatch(h.$('detail-content').textContent,/Normal-only fixture|Normal test link/);
});

test('switching from an empty Halloween year to normal restores visible usable profiles',async()=>{
 const data=structuredClone(archive);data.years.push({year:2027,title:'',description:'',entries:[]});
 const h=await harness({data});assert.equal(h.$('stage').hidden,true);
 h.$('mode-normal').click();assert.equal(h.$('stage').hidden,false);assert.equal(h.$('artwork-open').disabled,false);
 h.$('mode-halloween').click();assert.equal(h.$('stage').hidden,true);assert.equal(h.$('total-index').textContent,'00');
});

test('hidden exhibition work becomes a verified profile without leaking article material',async()=>{
 const data=structuredClone(archive);data.years[0].entries[0].visible=false;
 const h=await harness({data});assert.equal(h.$('total-index').textContent,String(doorCount).padStart(2,'0'));
 assert.equal(h.$('room-title').textContent,data.creators[0].name);
 assert.equal(h.$('artwork-image').src,data.creators[0].avatar);
 h.$('artwork-open').click();const text=h.$('detail-content').textContent;
 assert.doesNotMatch(text,/ハロウィン企画への招待状|主催者の企画紹介記事/);
 assert.equal(h.$('detail-content').querySelectorAll('a').filter(a=>!a.classList.contains('magazine-link')).length,1);
 assert.equal(h.$('detail-content').querySelector('a').href,data.creators[0].profileURL);
});
test('numeric order is stable and normal mode keeps the same creator across collections',async()=>{
 const data=structuredClone(archive);data.years[0].entries[creatorDoorIndex('naemotion')].order=-1;
 const h=await harness({data});assert.equal(h.$('room-title').textContent,data.creators[4].name);
 h.$('mode-normal').click();assert.equal(h.$('room-title').textContent,data.creators[4].name);
 h.$('mode-halloween').click();assert.equal(h.api.state.currentIndex,0);
});
test('multiple published links remain accessible and individually hidden links stay absent',async()=>{
 const data=structuredClone(archive);data.years[0].entries[1].links=[{title:'Second',url:'https://example.com/2',order:2},{title:'Hidden secret title',url:'https://example.com/hidden',visible:false},{title:'First',url:'https://example.com/1',order:1}];
 const h=await harness({data});await h.api.navigate(1);h.$('artwork-open').click();
 const links=h.$('detail-content').querySelectorAll('a').filter(a=>!a.classList.contains('magazine-link'));assert.equal(links.length,3);
 assert.equal(links[0].href,'https://example.com/1');assert.equal(links[1].href,'https://example.com/2');
 assert.doesNotMatch(h.$('detail-content').textContent,/Hidden secret title/);
});


test('requested exact Halloween title is visible, with a neutral normal-mode title', async () => {
 const h=await harness();
 assert.equal(h.doc.title,'無名S note / 🎃Halloween Atelier / 魔法の入口🚪');
 assert.match(h.$('site-title').textContent,/無名S note🎃Halloween Atelier魔法の入口🚪/);
 h.$('mode-normal').click();
 assert.doesNotMatch(h.$('site-title').textContent,/Halloween|ハロウィン|🎃|魔法/);
 assert.doesNotMatch(h.doc.title,/Halloween|ハロウィン|🎃/);
 assert.equal(h.$('roulette-open').hidden,true);
});

test('ordinary submitted title is displayed on stage, in detail, and in roster', async()=>{
 const data=structuredClone(archive);
 data.evergreenEntries=[{creatorId:'ss_yr',title:'日々の文章と、小さな発見',submissionStatus:'published',links:[{title:'本文を読む',url:'https://note.com/ss_yr/n/n123456789abc'}]}];
 const h=await harness({data,savedMode:'normal'});
 assert.match(h.$('creator-name').textContent,/日々の文章と、小さな発見/);
 h.$('artwork-open').click();assert.match(h.$('detail-content').textContent,/日々の文章と、小さな発見/);
 h.$('detail').close();h.$('list-open').click();assert.match(h.$('roster-grid').children[0].textContent,/日々の文章と、小さな発見/);
 assert.doesNotMatch(h.$('detail-content').textContent,/ハロウィン企画への招待状/);
});

test('reduced-motion roulette chooses a real different door without recording or opening a tab', async()=>{
 const h=await harness();
 h.$('roulette-open').click();await h.flush();
 assert.ok(h.api.state.currentIndex>0&&h.api.state.currentIndex<archive.years[0].entries.length);
 assert.equal(h.$('room-title').textContent,archive.creators.find(c=>c.id===archive.years[0].entries[h.api.state.currentIndex].creatorId).name);
 assert.equal(h.$('roulette-reel').hidden,true);assert.equal(h.$('detail').open,false);assert.equal(String(h.api.countPeople()),'0');
 assert.equal(h.$('theater').classList.contains('turning-in'),false);
 h.$('artwork-open').click();assert.match(h.$('detail-content').textContent,/プロフィール/);
 assert.ok(h.$('detail-content').querySelectorAll('a').filter(a=>!a.classList.contains('magazine-link')).every(a=>archive.creators.some(c=>c.profileURL===a.href)||archive.years[0].entries.some(e=>e.links?.some(l=>l.url===a.href))));
});

test('animated roulette resolves to an existing creator and does not leave controls busy', async()=>{
 const h=await harness({reduced:false});h.$('roulette-open').click();
 assert.equal(h.$('roulette-reel').hidden,false);assert.equal(h.$('roulette-open').getAttribute('aria-pressed'),'true');
 await h.tick(4000);assert.ok(h.api.state.currentIndex>0);assert.equal(h.api.state.busy,false);
 assert.equal(h.$('roulette-reel').hidden,true);assert.equal(h.$('roulette-open').getAttribute('aria-pressed'),'false');
 h.$('next').click();await h.tick(700);assert.equal(h.api.state.busy,false);
});

test('roulette cancellation and newer navigation win over every delayed roll', async()=>{
 const h=await harness({reduced:false});h.$('roulette-open').click();await h.tick(200);
 h.$('roulette-open').click();await h.tick(4000);assert.equal(h.api.state.currentIndex,0);
 h.$('roulette-open').click();await h.tick(200);h.$('next').click();await h.tick(4000);
 assert.equal(h.api.state.currentIndex,1);assert.equal(h.$('roulette-reel').hidden,true);
});

test('mode changes, dialog opening, and pause cancel the roulette instead of a later surprise jump', async()=>{
 for(const action of ['normal','dialog','pause']){
  const h=await harness({reduced:false});h.$('roulette-open').click();await h.tick(200);
  if(action==='normal')h.$('mode-normal').click();
  if(action==='dialog')h.$('list-open').click();
  if(action==='pause')h.$('theater').dispatch('yearbook:motion-state',{detail:{paused:true}});
  await h.tick(4000);assert.equal(h.api.state.currentIndex,0,action);assert.equal(h.$('roulette-reel').hidden,true,action);
 }
});

test('roulette is disabled while loading and for an empty active collection', async()=>{
 const data=structuredClone(archive);data.years.push({year:2027,title:'',description:'',entries:[]});
 const h=await harness({data,autoLoad:false});assert.equal(h.$('roulette-open').disabled,true);
 await h.succeed(h.requests[0]);assert.equal(h.$('roulette-open').disabled,true);
 h.api.setYear(2026);assert.equal(h.$('roulette-open').disabled,false);
 h.api.load();assert.equal(h.$('roulette-open').disabled,true);
});

test('roulette excludes creators without a safe public destination and never invents one', async()=>{
 const data=structuredClone(archive);
 for(const c of data.creators)c.profileURL='javascript:alert(1)';
 for(const e of data.years[0].entries)e.links=[];
 const h=await harness({data});assert.equal(h.$('roulette-open').disabled,true);
 assert.equal(h.api.state.currentIndex,0);
});


test('slideshow starts OFF and never moves without an explicit toggle',async()=>{
 const h=await harness({reduced:false});assert.equal(h.$('slideshow-toggle').getAttribute('aria-pressed'),'false');
 await h.tick(60000);assert.equal(h.api.state.currentIndex,0);assert.equal(h.api.state.slideshow.enabled,false);
 h.$('slideshow-toggle').click();await h.tick(4999);assert.equal(h.api.state.currentIndex,0);
 await h.tick(201);assert.equal(h.api.state.currentIndex,1);await h.tick(450);assert.equal(h.api.state.busy,false);
 h.$('slideshow-toggle').click();await h.tick(60000);assert.equal(h.api.state.currentIndex,1);
});

test('slideshow interval control uses every integer from 1 to 10 seconds and persists only the speed',async()=>{
 const h=await harness({reduced:false});h.$('slideshow-speed').value='5';h.$('slideshow-speed').dispatch('change');
 assert.equal(h.api.state.slideshow.intervalSeconds,5);
 assert.deepEqual(JSON.parse(h.storage.get('halloween-exhibition:preview:slideshow:v1')),{intervalSeconds:5});
 h.$('slideshow-toggle').click();await h.tick(4999);assert.equal(h.api.state.currentIndex,0);await h.tick(201);assert.equal(h.api.state.currentIndex,1);
 h.$('slideshow-speed').value='1';h.$('slideshow-speed').dispatch('change');assert.equal(h.api.state.slideshow.intervalSeconds,1);h.$('slideshow-speed').value='11';h.$('slideshow-speed').dispatch('change');assert.equal(h.api.state.slideshow.intervalSeconds,1);
});

test('dialogs hold slideshow and closing starts a complete fresh interval',async()=>{
 const h=await harness({reduced:false});h.$('slideshow-toggle').click();await h.tick(3000);h.$('list-open').click();
 await h.tick(30000);assert.equal(h.api.state.currentIndex,0);assert.ok(h.api.state.slideshow.blockers.includes('dialog'));
 h.$('roster').close();await h.tick(0);await h.tick(4999);assert.equal(h.api.state.currentIndex,0);
 await h.tick(201);assert.equal(h.api.state.currentIndex,1);
});

test('manual navigation resets slideshow timing and wins over an in-flight automatic transition',async()=>{
 const h=await harness({reduced:false});h.$('slideshow-toggle').click();await h.tick(5100);
 h.$('room-dots').children[4].click();await h.tick(700);
 assert.equal(h.api.state.currentIndex,4);assert.equal(h.api.state.busy,false);
 await h.tick(4300);assert.equal(h.api.state.currentIndex,4);
 await h.tick(300);assert.equal(h.api.state.currentIndex,5);
});

test('hidden tab cancels an unfinished automatic entrance without a stuck shutter',async()=>{
 const h=await harness({reduced:false});h.$('slideshow-toggle').click();await h.tick(5100);
 h.doc.hidden=true;for(const fn of h.doc.handlers.visibilitychange||[])fn();await h.tick(50000);
 assert.equal(h.api.state.currentIndex,0);assert.equal(h.api.state.busy,false);assert.equal(h.$('theater').classList.contains('turning-out'),false);
 h.doc.hidden=false;for(const fn of h.doc.handlers.visibilitychange||[])fn();await h.tick(5200);assert.equal(h.api.state.currentIndex,1);
});

test('reduced-motion and explicit ambience pause block automatic movement but leave manual controls',async()=>{
 const reduced=await harness();reduced.$('slideshow-toggle').click();await reduced.tick(60000);assert.equal(reduced.api.state.currentIndex,0);
 reduced.$('next').click();assert.equal(reduced.api.state.currentIndex,1);
 const h=await harness({reduced:false});h.$('slideshow-toggle').click();h.$('theater').dispatch('yearbook:motion-state',{detail:{paused:true}});await h.tick(60000);assert.equal(h.api.state.currentIndex,0);
 h.$('theater').dispatch('yearbook:motion-state',{detail:{paused:false}});await h.tick(5200);assert.equal(h.api.state.currentIndex,1);
});

test('normal mode retains only genuine local door records without exposing history controls',async()=>{
 const h=await harness({savedMode:'normal'});assert.equal(h.api.seenDoors().length,0);assert.equal(h.$('passport'),undefined);
 await h.api.navigate(3);h.$('artwork-open').click();h.$('detail').close();await h.tick(0);assert.equal(h.api.seenDoors().length,1);assert.equal(h.api.countPeople(),1);
 assert.equal(h.api.state.progress.doorStamps.evergreen[0],'legacy-evergreen-mama_ca');assert.equal(h.$('visit-count'),undefined);assert.equal(h.$('passport-open'),undefined);
});

test('slideshow ON, speed changes and OFF preserve the native browser timer receiver',async()=>{
 const h=await harness({reduced:false,strictTimerReceiver:true});
 assert.doesNotThrow(()=>h.$('slideshow-toggle').click());
 assert.equal(h.$('slideshow-toggle').getAttribute('aria-pressed'),'true');
 for(const seconds of [1,5,10]){
  h.$('slideshow-speed').value=String(seconds);
  assert.doesNotThrow(()=>h.$('slideshow-speed').dispatch('change'));
  const before=h.api.state.currentIndex;
  await h.tick(seconds*1000+650);
  assert.equal(h.api.state.currentIndex,(before+1)%doorCount);
 }
 assert.doesNotThrow(()=>h.$('slideshow-toggle').click());
 assert.equal(h.$('slideshow-toggle').getAttribute('aria-pressed'),'false');
 const last=h.api.state.currentIndex;await h.tick(60000);assert.equal(h.api.state.currentIndex,last);
});

test('roster pagination exposes every distinct door and deduplicates creator counts',async()=>{
 const h=await harness();h.$('list-open').click();
 const creators=[],doors=[];
 for(let page=0;page<pageCount;page++){
  const cards=h.$('roster-grid').querySelectorAll('button');
  assert.equal(cards.length,Math.min(5,doorCount-page*5));
  assert.equal(h.$('roster-previous').disabled,page===0);
  assert.equal(h.$('roster-next').disabled,page===pageCount-1);
  assert.equal(h.$('roster-page-status').textContent,`${page+1} / ${pageCount} ページ`);
  assert.equal(h.$('results').textContent,`扉 ${doorCount} / ${doorCount}枚 · ${page*5+1}〜${Math.min((page+1)*5,doorCount)}枚目を表示 · 参加者${creatorCount}人`);
  creators.push(...cards.map(card=>card.dataset.creatorId));doors.push(...cards.map(card=>card.dataset.doorId));
  if(page<pageCount-1){h.$('roster-next').click();assert.equal(h.doc.activeElement,h.$('roster-page-status'));}
 }
 assert.equal(new Set(doors).size,doorCount);
 assert.deepEqual(new Set(creators),new Set(archive.creators.map(c=>c.id)));
 assert.deepEqual(new Set(doors),new Set(h.$('room-dots').children.map(dot=>dot.dataset.doorId)));
 h.$('roster-next').click();assert.equal(h.$('roster-grid').querySelectorAll('button').length,doorCount%5||5);
 h.$('roster-previous').click();assert.equal(h.$('roster-grid').querySelectorAll('button').length,5);
});
test('filtered pending roster paginates all pending doors; search and tag changes reset pagination',async()=>{
 const h=await harness();h.$('list-open').click();h.$('roster-next').click();
 h.$('tags').children.find(n=>n.textContent==='作品準備中').click();assert.equal(h.$('roster-page-status').textContent,'1 / 2 ページ');
 assert.equal(h.$('roster-grid').querySelectorAll('button').length,5);h.$('roster-next').click();
 assert.equal(h.$('roster-grid').querySelectorAll('button').length,pendingCount-5);assert.equal(h.$('results').textContent,`扉 ${pendingCount} / ${doorCount}枚 · 6〜${pendingCount}枚目を表示 · 参加者${pendingPeople}人`);
 h.$('search').value='ミナト';h.$('search').dispatch('input');assert.equal(h.$('roster-page-status').textContent,'1 / 1 ページ');
 assert.equal(h.$('roster-grid').querySelectorAll('button').length,1);assert.equal(h.$('roster-next').disabled,true);assert.equal(h.$('roster-previous').disabled,true);
 h.$('search').value='存在しない作品';h.$('search').dispatch('input');assert.equal(h.$('roster-page-status').textContent,'0 / 0 ページ');
 assert.equal(h.$('roster-grid').querySelectorAll('button').length,0);assert.equal(h.$('roster-next').disabled,true);
});
test('roster retains page on creator/detail return and resets for mode or year changes',async()=>{
 const data=structuredClone(archive);data.years.push({year:2025,title:'',description:'',entries:data.years[0].entries.slice(0,2)});
 const h=await harness({data});h.$('list-open').click();h.$('roster-next').click();
 const selected=h.$('roster-grid').querySelectorAll('button')[0].dataset.creatorId;
 h.$('roster-grid').querySelectorAll('button')[0].click();await h.tick(0);assert.equal(h.$('theater').dataset.creatorId,selected);
 h.$('artwork-open').click();h.$('detail').close();await h.tick(0);h.$('list-open').click();assert.equal(h.$('roster-page-status').textContent,`2 / ${pageCount} ページ`);
 h.api.setMode('normal');assert.equal(h.$('roster-page-status').textContent,`1 / ${Math.ceil(creatorCount/5)} ページ`);
 h.$('roster-next').click();h.api.setMode('halloween');assert.equal(h.$('roster-page-status').textContent,`1 / ${pageCount} ページ`);
 h.$('roster-next').click();h.api.setYear(2025);assert.equal(h.$('roster-page-status').textContent,'1 / 1 ページ');assert.equal(h.$('roster-grid').querySelectorAll('button').length,2);
});
test('restored roster page is clamped against the current filtered real roster',async()=>{
 const h=await harness({urlSearch:'?mode=halloween',returnState:JSON.stringify({year:2026,creatorId:'ss_yr',search:'',activeTag:'',rosterPage:999})});
 assert.equal(h.$('roster-page-status').textContent,`${pageCount} / ${pageCount} ページ`);assert.equal(h.$('roster-grid').querySelectorAll('button').length,doorCount % 5 || 5);
});

test('owner personal door survives first-page selection, detail return, and exact session return',async()=>{
 const h=await harness();h.$('list-open').click();
 const card=h.$('roster-grid').children.find(b=>b.dataset.doorId==='owner-work-2026');assert.ok(card);assert.match(card.textContent,/主催者の個人作品.*作品準備中/);
 card.click();await h.tick(0);assert.equal(h.$('theater').dataset.doorId,'owner-work-2026');assert.equal(h.$('theater').dataset.creatorId,'ss_yr');
 assert.equal(h.$('artwork-image').src,archive.creators[0].avatar);assert.match(h.$('artwork-image').alt,/プロフィール画像/);
 h.$('artwork-open').click();assert.doesNotMatch(h.$('detail-content').textContent,/ハロウィン企画への招待状/);
 assert.deepEqual(h.$('detail-content').querySelectorAll('a').filter(a=>!a.classList.contains('magazine-link')).map(a=>a.href),[archive.creators[0].profileURL]);
 h.$('detail').close();await h.tick(0);h.$('list-open').click();assert.equal(h.$('roster-page-status').textContent,`1 / ${pageCount} ページ`);
 h.$('roster').close();await h.tick(0);h.$('horror-entrance').click();const state=JSON.parse(h.getReturn().value);
 assert.equal(state.doorId,'owner-work-2026');assert.equal(state.rosterPage,0);
 const restored=await harness({urlSearch:'?mode=halloween',returnState:JSON.stringify(state)});assert.equal(restored.$('theater').dataset.doorId,'owner-work-2026');assert.equal(restored.$('roster-page-status').textContent,`1 / ${pageCount} ページ`);
 const legacy=await harness({urlSearch:'?mode=halloween',returnState:JSON.stringify({year:2026,creatorId:'ss_yr'})});assert.equal(legacy.$('theater').dataset.doorId,'legacy-archive-2026-ss_yr');
});
test('creator history migrates only the original owner door; new work is never automatically viewed',async()=>{
 const h=await harness({saved:savedProgress(['ss_yr'])});
 const dots=h.$('room-dots').children;assert.equal(dots[0].classList.contains('visited'),true);assert.equal(dots[ownerWorkIndex].classList.contains('visited'),false);
 await h.api.navigate(ownerWorkIndex);h.$('artwork-open').click();h.$('detail').close();await h.tick(0);
 assert.equal(String(h.api.countPeople()),'1');
 const data=structuredClone(archive);data.years[0].entries=data.years[0].entries.filter(e=>e.role!=='host');
 const removed=await harness({data,saved:savedProgress(['ss_yr'])});assert.equal(removed.$('room-dots').children.find(b=>b.dataset.doorId==='owner-work-2026').classList.contains('visited'),false);
});
test('viewing the new owner door first does not mark the host announcement as viewed',async()=>{
 const h=await harness();await h.api.navigate(ownerWorkIndex);h.$('artwork-open').click();h.$('detail').close();await h.tick(0);
 assert.equal(h.$('room-dots').children[0].classList.contains('visited'),false);assert.equal(h.$('room-dots').children[ownerWorkIndex].classList.contains('visited'),true);
 await h.api.navigate(0);h.$('artwork-open').click();assert.equal(String(h.api.countPeople()),'1');
 assert.deepEqual([...h.api.state.progress.doorStamps['archive:2026']],['owner-work-2026','legacy-archive-2026-ss_yr']);
});
test('roulette selects both same-creator doors independently and never counts a view',async()=>{
 const data=structuredClone(archive);data.years[0].entries=[data.years[0].entries[0],data.years[0].entries.find(entry => entry.doorId === 'owner-work-2026')];
 const h=await harness({data});h.$('roulette-open').click();await h.flush();assert.equal(h.$('theater').dataset.doorId,'owner-work-2026');
 h.$('roulette-open').click();await h.flush();assert.equal(h.$('theater').dataset.doorId,'legacy-archive-2026-ss_yr');assert.equal(String(h.api.countPeople()),'0');
});
test('automatic slideshow selects both same-creator doors independently',async()=>{
 const data=structuredClone(archive);data.years[0].entries=[data.years[0].entries[0],data.years[0].entries.find(entry => entry.doorId === 'owner-work-2026')];
 const h=await harness({data,reduced:false});h.$('slideshow-speed').value='5';h.$('slideshow-speed').dispatch('change');h.$('slideshow-toggle').click();
 await h.tick(5700);assert.equal(h.$('theater').dataset.doorId,'owner-work-2026');await h.tick(5700);assert.equal(h.$('theater').dataset.doorId,'legacy-archive-2026-ss_yr');assert.equal(String(h.api.countPeople()),'0');
});
test('multiple ordinary articles each retain their own door, title, image and URL',async()=>{
 const data=structuredClone(archive);data.evergreenEntries=[{doorId:'ordinary-a',creatorId:'ss_yr',submissionStatus:'submitted',title:'普通の作品 A',image:'https://example.com/a.png',links:[{title:'A',url:'https://note.com/ss_yr/n/aaa'}]},{doorId:'ordinary-b',creatorId:'ss_yr',submissionStatus:'submitted',title:'普通の作品 B',image:'https://example.com/b.png',links:[{title:'B',url:'https://note.com/ss_yr/n/bbb'}]}];
 const ordinaryDoorCount=creatorCount+data.evergreenEntries.length-1;
 const h=await harness({data,savedMode:'normal'});assert.equal(h.$('total-index').textContent,String(ordinaryDoorCount).padStart(2,'0'));assert.equal(h.$('sample-notice').textContent,`参加者${creatorCount}人 · 扉${ordinaryDoorCount}枚`);
 for(const index of [0,1]){await h.api.navigate(index);const entry=data.evergreenEntries[index];assert.equal(h.$('theater').dataset.doorId,entry.doorId);assert.equal(h.$('artwork-image').src,entry.image);h.$('artwork-open').click();assert.match(h.$('detail-content').textContent,new RegExp(entry.title));assert.ok(h.$('detail-content').querySelectorAll('a').some(a=>a.href===entry.links[0].url));assert.doesNotMatch(h.$('detail-content').textContent,/ハロウィン企画への招待状|作品準備中/);h.$('detail').close();await h.tick(0);}
 h.api.setMode('halloween');assert.equal(h.$('theater').dataset.doorId,'legacy-archive-2026-ss_yr');assert.equal(String(h.api.countPeople()),'0');
});

test('real palace adapter keeps TOP article-free until gate activation and retains the selected door on return',async()=>{
 const h=await harness({entrance:true});assert.equal(h.$('theater').dataset.palaceState,'palace');assert.equal(h.$('article-theater').hidden,true);assert.equal(h.$('article-theater').inert,true);assert.equal(h.$('palace-entrance').hidden,false);
 for(const id of ['passport','passport-open','visit-count','reset'])assert.equal(h.$(id),undefined);
 assert.equal(h.keydown('ArrowRight'),false);assert.equal(h.api.state.currentIndex,0);assert.equal(h.$('article-theater').hidden,true);
 h.$('palace-gate').click();assert.equal(h.$('article-theater').hidden,false);assert.equal(h.$('theater').dataset.palaceState,'gallery');
 await h.api.navigate(ownerWorkIndex);h.$('palace-return').click();assert.equal(h.$('article-theater').hidden,true);assert.equal(h.$('theater').dataset.doorId,'owner-work-2026');assert.equal(h.doc.activeElement,h.$('palace-gate'));
 h.$('palace-gate').click();assert.equal(h.$('theater').dataset.doorId,'owner-work-2026');assert.equal(h.$('total-index').textContent,String(doorCount).padStart(2,'0'));
});
test('real gate opening cannot auto-advance the hidden theater and a new home action cancels an opening',async()=>{
 const h=await harness({entrance:true,reduced:false});h.$('slideshow-speed').value='5';h.$('slideshow-speed').dispatch('change');h.$('slideshow-toggle').click();await h.tick(20000);assert.equal(h.api.state.currentIndex,0);
 h.$('palace-gate').click();await h.tick(300);assert.equal(h.$('article-theater').hidden,true);assert.equal(h.$('theater').dataset.palaceState,'opening');
 h.$('mode-normal').click();assert.equal(h.$('article-theater').hidden,false);h.$('mode-halloween').click();await h.tick(1000);assert.equal(h.$('article-theater').hidden,true);assert.equal(h.$('theater').dataset.palaceState,'palace');
 h.$('palace-gate').click();await h.tick(600);assert.equal(h.$('theater').dataset.palaceState,'walking');assert.equal(h.$('article-theater').hidden,true);await h.tick(550);assert.equal(h.$('article-theater').hidden,false);await h.tick(5700);assert.equal(h.api.state.currentIndex,1);
});
test('normal mode bypasses the Halloween palace and exact maze return opens the existing personal-work door',async()=>{
 const normal=await harness({entrance:true,savedMode:'normal'});assert.equal(normal.$('palace-entrance').hidden,true);assert.equal(normal.$('article-theater').hidden,false);assert.equal(normal.$('palace-return').hidden,true);assert.equal(normal.$('horror-entrance').hidden,true);
 const restored=await harness({entrance:true,urlSearch:'?mode=halloween',returnState:JSON.stringify({year:2026,creatorId:'ss_yr',doorId:'owner-work-2026',rosterPage:1})});assert.equal(restored.$('article-theater').hidden,false);assert.equal(restored.$('theater').dataset.doorId,'owner-work-2026');assert.equal(restored.$('roster-page-status').textContent,`2 / ${pageCount} ページ`);
});
test('selecting the second owner door from the TOP roster reveals that exact article theater door',async()=>{
 const h=await harness({entrance:true});h.$('list-open').click();h.$('roster-grid').children.find(b=>b.dataset.doorId==='owner-work-2026').click();await h.tick(0);
 assert.equal(h.$('article-theater').hidden,false);assert.equal(h.$('theater').dataset.doorId,'owner-work-2026');assert.equal(h.$('palace-entrance').hidden,true);
});


test('host announcement has its own invitation treatment, not the personal-work door',async()=>{
 const h=await harness();assert.equal(h.$('theater').dataset.entryKind,'introduction');
 assert.equal(h.$('host-avatar').parentNode.className,'stage-caption');
 assert.equal(h.$('host-avatar').hidden,false);
 await h.api.navigate(ownerWorkIndex);assert.equal(h.$('theater').dataset.entryKind,'article');assert.equal(h.$('host-avatar').hidden,true);
});
test('2026 Halloween details retain individual links and add a separate shared magazine',async()=>{
 const h=await harness();await h.api.navigate(creatorDoorIndex('koakumako'));h.api.openStory();
 const links=h.$('detail-content').querySelectorAll('a');
 assert.ok(links.some(a=>a.href==='https://note.com/koakumako/n/na9731433238f'));
 const magazine=links.find(a=>a.classList.contains('magazine-link'));assert.equal(magazine.href,'https://note.com/ss_yr/m/m642b82518aeb');assert.equal(magazine.rel,'noopener noreferrer');
 h.$('detail').close();await h.tick(0);h.api.setMode('normal');h.api.openStory();assert.equal(h.$('detail-content').querySelector('.magazine-link'),null);
});


test('75 percent main artwork brightness is the unaltered original-color baseline',async()=>{
 const h=await harness();assert.equal(h.$('theater').style['--art-brightness'],'1');assert.equal(h.$('theater').style['--visitor-brightness'],'0.75');
});


test('slideshow controls live only in Settings; creator ordinal eyebrow is absent',async()=>{
 const h=await harness();const playback=h.doc.querySelector('.gallery-playback');assert.equal(playback.parentNode.className,'visitor-preferences');assert.equal(h.$('slideshow-status').parentNode,playback);
 assert.equal(h.doc.querySelector('.stage-footer').querySelector('#slideshow-toggle'),null);
 await h.api.navigate(2);assert.equal(h.$('room-kicker').textContent,'');assert.ok(h.$('room-title').textContent);
});
test('door palette changes on redisplay, but details and same-mode settings leave it stable',async()=>{
 const h=await harness();const initial=h.$('theater').style['--door-color'];await h.api.navigate(2);const second=h.$('theater').style['--door-color'];assert.notEqual(initial,second);
 h.api.openStory();assert.equal(h.$('theater').style['--door-color'],second);h.$('detail').close();await h.tick(0);h.api.setMode('halloween');assert.equal(h.$('theater').style['--door-color'],second);
 await h.api.navigate(0);assert.notEqual(h.$('theater').style['--door-color'],initial);assert.equal(h.$('theater').style['--art-brightness'],'1');
});

test('submitted articles reveal visible doors before detail, suppressing repeated taps',async()=>{
 const h=await harness({reduced:false});await h.api.navigate(2,{immediate:true});
 assert.equal(h.$('theater').dataset.portrait,'false');assert.equal(h.$('theater').classList.contains('door-reveal'),true);
 h.$('artwork-open').click();h.$('artwork-open').click();assert.equal(h.$('detail').open,false);assert.equal(h.$('theater').classList.contains('story-opening'),true);
 await h.tick(899);assert.equal(h.$('detail').open,false);await h.tick(1);assert.equal(h.$('detail').open,true);
 assert.match(h.$('detail-content').textContent,/本場のHalloween/);assert.equal(h.$('theater').classList.contains('story-opening'),false);
});
test('new navigation or another dialog cancels stale story-opening completion',async()=>{
 for(const interrupt of ['navigation','roster','mode','home']){
  const h=await harness({reduced:false});await h.api.navigate(2,{immediate:true});h.$('artwork-open').click();
  if(interrupt==='navigation')await h.api.navigate(3,{immediate:true});
  if(interrupt==='roster')h.$('list-open').click();
  if(interrupt==='mode')h.api.setMode('normal');
  if(interrupt==='home')h.$('palace-return').click();
  await h.tick(1200);assert.equal(h.$('detail').open,false,interrupt);
 }
});
test('pending, normal, reduced and paused articles open without an animation delay',async()=>{
 for(const mode of ['pending','normal','reduced','paused']){
  const h=await harness({reduced:mode==='reduced'});await h.api.navigate(mode==='pending'?3:2,{immediate:true});
  if(mode==='normal')h.api.setMode('normal');if(mode==='paused')h.$('theater').dataset.motionPaused='true';
  h.$('artwork-open').click();assert.equal(h.$('detail').open,true,mode);
 }
});
test('host magazine occupies a distinct lower tier only for the introduction',async()=>{
 const h=await harness();assert.equal(h.$('host-magazine').hidden,false);assert.equal(h.$('host-magazine').getAttribute('href'),'https://note.com/ss_yr/m/m642b82518aeb');
 h.api.openStory();assert.equal(h.$('detail').dataset.entryKind,'introduction');h.$('detail').close();await h.tick(0);
 await h.api.navigate(1);assert.equal(h.$('host-magazine').hidden,true);h.api.setMode('normal');assert.equal(h.$('host-magazine').hidden,true);
});
