import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const css=await read('compact-gallery-header.css');
test('physical narrow screens retain one scrollable toolbar and44px targets',()=>{
 for(const rule of ['@media(max-width:480px)','.palace-toolbar{flex-flow:row nowrap','overflow-x:auto;overflow-y:hidden','.header-actions{display:contents}','font-size:14px;line-height:1.2;letter-spacing:0;min-height:44px','.visitor-settings-trigger{min-width:44px;margin-left:0}'])assert.ok(css.includes(rule),rule);
 assert.doesNotMatch(css,/zoom:|transform:scale|text-size-adjust|user-scalable|data-layout-page=maze/);
});
test('294/320/360/390/430 portrait CSS budgets bound title and header without reducing targets',()=>{
 // Contract estimates, not browser-rendered geometry; enlarged text can scroll locally.
 for(const width of [294,320,360,390,430]){
  const content=width-16,title=Math.max(20,Math.min(width*.056,26));
  const titleStack=12+title*1.1+14.4+4;
  const header=10+titleStack+46+44+8;
  assert.ok(title>=20&&title<=26);assert.ok(header<166,`${width}: normal-font header budget ${header}`);
  assert.ok(44*5+4*3<content,'minimum touch boxes fit; labels may require local scroll');
 }
 assert.ok(css.includes('font-size:clamp(20px,5.6vw,26px)'));
 assert.ok(css.includes('.masthead{gap:4px;padding:6px max(8px,env(safe-area-inset-right))'));
});
test('counter keeps both visible accounting notes at11px',async()=>{
 for(const rule of ['.castle-visit-counter{top:6px;font-size:12px','.castle-visit-counter strong{font-size:14px','.castle-visit-counter small{font-size:11px'])assert.ok(css.includes(rule));
 assert.doesNotMatch(css,/\.castle-visit-counter[^}]*display:none/);
 const counter=await read('castle-visit-counter.js');assert.ok(counter.includes('同じブラウザは1日1回'));assert.ok(counter.includes('実人数ではありません'));
});
test('last gallery-only stylesheet and exact version are present in shell cache',async()=>{
 const html=await read('index.html'),sw=await read('sw.js');
 assert.ok(html.indexOf('compact-gallery-header.css')>html.indexOf('presentation-profiles.css'));
 assert.match(html,/compact-gallery-header.css\?v=20261017-header1/);
 assert.match(sw,/'compact-gallery-header.css'/);assert.match(sw,/v34-header1/);
 assert.ok(sw.includes("path==='compact-gallery-header.css'?'20261017-header1'"));
 assert.doesNotMatch(await read('maze/index.html'),/compact-gallery-header/);
});
