import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../compact-gallery-header.css',import.meta.url),'utf8');
const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const rule=selector=>rules.filter(match=>match[1].trim().split(',').map(value=>value.trim()).includes(selector)).map(match=>match[2]).join(';');

test('the first HTML frame has the gallery layout without waiting for the theater module graph',()=>{
 assert.match(html,/<body data-layout-page="gallery">/);
 const base=':root body #theater.theater>.masthead';
 const header=rule(base);assert.match(header,/display:flex/);assert.match(header,/flex-direction:column/);
 const nav=rule(base+' .palace-world-links');assert.match(nav,/position:static/);assert.match(nav,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(nav,/max-width:none/);
 for(const child of ['.brand','.palace-toolbar','.creative-world-links','#castle-exit-panel'])assert.match(rule(base+'>'+child),/width:100%/);
 const title=rule(base+' #site-title>strong');assert.match(title,/clamp\(20px,5\.3vw,30px\)/);assert.match(title,/white-space:nowrap/);
 const links=rule(base+'>.creative-world-links strong');assert.match(links,/overflow-wrap:normal/);assert.match(links,/word-break:normal/);
 assert.doesNotMatch(base,/\[data-layout(?:=|\])|\[data-mode|:has\(/,'the essential first-frame rules need no runtime attributes');
});
test('all static source images have first-frame broken-image protection independent of modules',()=>{
 const images=[...html.matchAll(/<img\b(?=[^>]*\bsrc=)[^>]*>/g)];assert.ok(images.length>5);
 for(const [tag]of images){assert.match(tag,/visibility:hidden/);assert.match(tag,/onload="[^"]*naturalWidth/);assert.match(tag,/onerror="[^"]*visibility='hidden'/);}
 assert.match(html,/<script id="gallery-script" type="module" src="\.\/gallery-entry\.js\?v=20261019-fast2(?:-[a-f0-9]{12})?"[^>]*fetchpriority="high"/);
 assert.doesNotMatch(html,/<script[^>]+src="\.\/(?:theater|palace-startup|pwa|gallery-panels)\.js/);
});
function harness(initial=''){
 let state=initial,watch,timer,disconnected=false,cleared=false;
 const attributes={};const root={getAttribute(){return state;},setAttribute(name,value){attributes[name]=value;},removeAttribute(name){delete attributes[name];}},panel={hidden:true},status={hidden:false};
 const context={window:{},document:{getElementById(id){return {'theater':root,'entrance-runtime-retry':panel,'palace-load-status':status}[id];}},
  MutationObserver:class{constructor(fn){watch=fn;}observe(){}disconnect(){disconnected=true;}},
  setTimeout(fn){timer=fn;return 1;},clearTimeout(){cleared=true;}};
 vm.runInNewContext(html.match(/<script id="entrance-runtime-guard">([\s\S]*?)<\/script>/)[1],context);
 return {panel,status,attributes,timeout(){timer();},ready(){state='ready';watch();},get disconnected(){return disconnected;},get cleared(){return cleared;}};
}
test('a stalled or failed module graph ends in a usable retry state rather than permanent preparation text',()=>{
 const h=harness();h.timeout();assert.equal(h.status.hidden,true);assert.equal(h.panel.hidden,false);
 assert.equal(h.attributes['data-runtime-recovery'],'true');
 h.ready();assert.equal(h.panel.hidden,true);assert.equal(h.disconnected,true);assert.equal(h.cleared,true);assert.equal(h.attributes['data-runtime-recovery'],undefined);
});
test('a theater that initializes normally never shows the recovery panel',()=>{
 const h=harness('ready');assert.equal(h.panel.hidden,true);assert.equal(h.disconnected,true);assert.equal(h.cleared,true);
});
