import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const css=await read('compact-gallery-header.css');
const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
const rules=[...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([,selector,body])=>({selector:selector.trim(),body}));
const rule=selector=>rules.find(item=>item.selector===selector)?.body||'';
const base=':root body #theater.theater>.masthead';

test('the first painted header works without layout, mode, or :has initialization',()=>{
 assert.doesNotMatch(clean,/\[data-layout(?:=|\])|:has\(/);
 assert.match(rule(base),/display:flex;flex-direction:column/);
 assert.match(rule(base+' #site-title>strong'),/font:600 clamp\(20px,5\.3vw,30px\)\/1\.08[^;]+!important/);
 assert.match(rule(base+' #site-title>strong'),/white-space:nowrap/);
 assert.doesNotMatch(clean,/zoom:|transform:scale|text-size-adjust|user-scalable|data-layout-page=maze/);
});

test('six visible controls receive dedicated cells and no toolbar scroll container',()=>{
 assert.match(rule(base+' .palace-toolbar'),/grid-template-columns:minmax\(62px,1\.2fr\) minmax\(28px,\.65fr\) minmax\(34px,\.7fr\) minmax\(56px,1\.4fr\) 44px 40px/);
 assert.doesNotMatch(clean,/overflow(?:-x)?:\s*(?:auto|scroll)/);
 for(const [id,column]of[['mode-halloween',1],['mode-normal',2],['year-open',3],['list-open',4]])assert.match(rule(base+' #'+id),new RegExp('grid-column:'+column+';grid-row:1'));
 assert.match(rule(base+' .header-actions>#atelier-install-panel'),/grid-column:5;grid-row:1/);
 assert.match(rule(base+' .palace-toolbar .visitor-settings-trigger'),/grid-column:6;grid-row:1/);
 assert.match(clean,/header-actions,\s*[^{}]+toolbar-primary,\s*[^{}]+header-navigation,\s*[^{}]+mode-switch\{display:contents\}/);
 assert.match(rule(base+' .palace-toolbar button'),/min-height:44px/);
 assert.match(rule(base+' #atelier-install-open'),/display:none!important/,'legacy duplicate cannot become an extra grid item');
});

test('294 through 480px widths have bounded tracks, complete link labels and a compact header budget',()=>{
 // Static geometry contracts; these do not claim browser font/layout validation.
 for(const width of[294,320,344,360,390,430,480]){
  const content=width-16,minimum=[62,28,34,56,44,40].reduce((sum,n)=>sum+n,0)+5*2;
  assert.ok(minimum<=content,`${width}: all six controls fit without a scrolling ancestor`);
  const titleFont=Math.max(20,Math.min(26,width*.053)),title=titleFont*1.08+13.2+1;
  const header=6+title+44+34+34+3*3;
  if(width<=360)assert.ok(header<165,`${width}: header budget ${header}`);
  const card=(content-4)/2,creativeText=card-12-4-10-2;
  assert.ok(creativeText>=8*10*.65,'longest English word stays horizontal');
  const routeCard=(content-48-68-8-4)/2,routeInner=routeCard-10;
  assert.ok(Math.ceil(8*11/routeInner)*11*1.2+6<=34,'complete underground route fits within two short lines');
 }
 assert.match(clean,/@media\(max-width:480px\)[\s\S]*font-size:clamp\(20px,5\.3vw,26px\)!important/);
 assert.match(clean,/--header-control-font:clamp\(12px,3\.4vw,14px\)/);
});

test('both destination bands stay horizontal slim cards and selected large profiles cannot force overflow',()=>{
 assert.match(rule(base+' .palace-world-links'),/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(rule(base+' .palace-world-links>a'),/min-height:34px/);
 assert.match(rule(base+'>.creative-world-links>a'),/min-height:34px/);
 assert.match(rule(base+'>.creative-world-links strong'),/overflow-wrap:normal;word-break:normal/);
 assert.doesNotMatch(clean,/max-width:128px|overflow-wrap:anywhere/);
 assert.match(clean,/header-actions :is\(#year-open,\.visitor-settings-trigger\)\{[\s\S]*?width:100%;min-width:0;max-width:100%/);
});

test('counting information is retained while recovery and loading remain in their correct views',async()=>{
 const counter=await read('castle-visit-counter.js');assert.ok(counter.includes('同じブラウザは1日1回'));assert.ok(counter.includes('実人数ではありません'));
 assert.match(rule('#entrance-runtime-retry'),/position:relative;inset:auto;transform:none/);
 assert.doesNotMatch(rule('#entrance-runtime-retry'),/position:fixed|top:50%/);
 assert.match(rule(':root body #theater.theater .archive-loading'),/display:none/);
 assert.match(rule(':root body #theater.theater[data-palace-state=gallery][data-archive-state=loading] .archive-loading'),/display:grid/);
 assert.match(rule(':root body #theater.theater[data-runtime-recovery=true] .archive-loading'),/display:none/);
 assert.match(rule('.theater:not([data-palace-state=gallery])>.world-backdrop'),/display:none/);
 assert.match(rule('#article-theater[hidden]'),/display:none!important/);
});

test('compact overrides follow preset styles and current bundled CSS has a release URL',async()=>{
 const sources=JSON.parse(await read('gallery-style-sources.json'));
 assert.ok(sources.findIndex(path=>path.includes('compact-gallery-header.css'))>sources.findIndex(path=>path.includes('presentation-profiles.css')));
 assert.match(await read('index.html'),/gallery-styles\.css\?v=20261019-fast2(?:-[a-f0-9]{12})?(?:["'\s]|$)/);
 assert.doesNotMatch(await read('maze/index.html'),/compact-gallery-header/);
});
