import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script id="gallery-style-bootstrap">([\s\S]*?)<\/script>/)[1];
function harness(){
 const timers=new Map(), events={}, added=[], classes=new Set(['gallery-style-pending']);
 const message={textContent:''}, panel={hidden:false};let nextTimer=0, sentinel='';
 const primary={href:'https://example.test/preview/gallery-styles.css?v=current',sheet:null,after(link){added.push(link);}};
 const document={documentElement:{classList:{remove(value){classes.delete(value);}}},
  getElementById(id){return {'gallery-stylesheet':primary,'gallery-style-message':message,'gallery-style-status':panel}[id];},
  querySelector(){return added.find(link=>!link.removed);},
  createElement(){return {dataset:{},sheet:null,remove(){this.removed=true;}};},
  addEventListener(type,fn){events[type]=fn;}};
 const context={document,window:{getComputedStyle:()=>({getPropertyValue:()=>sentinel})},URL,location:{href:'https://example.test/preview/'},Date,
  setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 vm.runInNewContext(script,context);
 return {primary,added,message,panel,classes,window:context.window,
  timeout(){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();},
  dom(){events.DOMContentLoaded();},partial(){primary.sheet={cssRules:[{}]};context.window.atelierStyleLoaded(primary);},ready(link=primary){sentinel='20261019-header2';link.sheet={cssRules:[{}]};context.window.atelierStyleLoaded(link);}};
}
test('critical protection precedes external CSS and covers both display modes',()=>{
 assert.ok(html.indexOf('id="gallery-style-critical"')<html.indexOf('id="gallery-stylesheet"'));
 assert.match(html,/<html[^>]+class="gallery-style-pending"/);
 assert.match(html,/html\.gallery-style-pending body>\:not\(#gallery-style-status\)/);
 assert.ok(html.indexOf('id="gallery-style-status"')<html.indexOf('<main'));
 assert.match(html,/id="mode-normal"/);
});
test('valid CSS reveals the gallery',()=>{
 const h=harness();h.ready();assert.equal(h.classes.has('gallery-style-pending'),false);assert.equal(h.panel.hidden,true);
});
test('failed or empty CSS keeps markup hidden and retries with a fresh URL',()=>{
 for(const empty of [false,true]){
  const h=harness();if(empty){h.primary.sheet={cssRules:[]};h.window.atelierStyleLoaded(h.primary);}else h.window.atelierStyleFailed(h.primary);
  assert.equal(h.classes.has('gallery-style-pending'),true);assert.equal(h.added.length,1);
  assert.ok(new URL(h.added[0].href).searchParams.has('style-retry'));
  h.ready(h.added[0]);assert.equal(h.classes.has('gallery-style-pending'),false);
 }
});
test('stalled requests recover, then show a retry panel instead of raw markup',()=>{
 const h=harness();h.timeout();assert.equal(h.added.length,1);h.timeout();h.dom();
 assert.equal(h.classes.has('gallery-style-pending'),true);assert.match(h.message.textContent,/もう一度開く/);
 h.window.atelierStyleRetry();assert.equal(h.added[0].removed,true);h.ready(h.added[1]);
 assert.equal(h.classes.has('gallery-style-pending'),false);
});
test('late original success stays visible after a recovery request fails',()=>{
 const h=harness();h.window.atelierStyleFailed(h.primary);h.ready();h.added[0].onerror();
 assert.equal(h.classes.has('gallery-style-pending'),false);
});
test('old request errors do not interrupt an active recovery',()=>{
 const h=harness();h.window.atelierStyleFailed(h.primary);h.window.atelierStyleFailed(h.primary);
 assert.doesNotMatch(h.message.textContent,/読み込めません/);h.ready(h.added[0]);
 assert.equal(h.classes.has('gallery-style-pending'),false);
});

test('partial or stale CSS never reveals the raw header before the final sentinel',()=>{
 const h=harness();h.partial();assert.equal(h.classes.has('gallery-style-pending'),true);
 assert.equal(h.added.length,1);h.timeout();h.dom();assert.match(h.message.textContent,/もう一度開く/);
 h.ready(h.added[0]);assert.equal(h.classes.has('gallery-style-pending'),false);
});
test('initial header has generated protection without a layout marker or script',async()=>{
 const css=(await readFile(new URL('../compact-gallery-header.css',import.meta.url),'utf8')).trim();
 assert.equal(html.match(/<style id="gallery-header-critical">\n([\s\S]*?)\n<\/style>/)[1],css);
 assert.doesNotMatch(css,/body\[data-layout-page=gallery\]/);
 assert.match(css,/:root body #theater\.theater>\.masthead/);
 assert.doesNotMatch(css,/--atelier-styles-ready/);
});
