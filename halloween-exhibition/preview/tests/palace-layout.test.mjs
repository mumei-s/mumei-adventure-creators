import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const html=await read('index.html'),css=await read('palace-entrance.css'),js=await read('theater.js');
test('TOP has a distinct palace scene and an initially hidden inert article theater',()=>{
 const palace=html.slice(html.indexOf('<section id="palace-entrance"'),html.indexOf('<div id="article-theater"'));
 assert.match(html,/<div id="article-theater"[^>]*hidden inert>/);assert.match(palace,/<button id="palace-gate"[^>]*type="button"[^>]*aria-controls="article-theater"/);
 assert.doesNotMatch(palace,/artwork-image|creator-name|room-dots|slideshow-toggle|note\.com|article-link/);
 assert.match(html,/id="palace-return"/);assert.match(css,/\.article-theater\[hidden\][^}]*display:none!important/);
});
test('viewing history controls and counter are removed without clearing user storage',()=>{
 for(const id of ['passport','passport-open','visit-count','reset'])assert.ok(!html.includes(`id="${id}"`));
 assert.doesNotMatch(js,/showPassport|\$\('passport|\$\('visit-count|\$\('reset|localStorage\.clear|removeItem/);
 assert.match(js,/progress\.doorStamps/);assert.match(js,/legacyDoorIndex/);
});
test('title, capsule controls, round year and far-right settings stay in responsive flow',()=>{
 assert.match(html,/宮殿の地下に進む/);assert.match(html,/href="\.\/maze\/\?return=theatre"/);
 assert.match(css,/visitor-settings-trigger\{order:100;margin-left:auto/);assert.match(css,/#year-open\{[^}]*border-radius:50%/);
 assert.match(css,/\.list-open\{border-radius:99px/);assert.match(css,/\.horror-entrance\{[^}]*position:static[^}]*border-radius:99px/);
 assert.match(css,/@container gallery-shell \(max-width:760px\)/);assert.match(css,/container-name:gallery-shell/);
 assert.doesNotMatch(css,/min-height:800px|zoom:|scroll-behavior:smooth/);
});
test('the palace starts with approved still characters and safely animated props',()=>{
 for(const name of ['palace-still','palace-floating-lights','palace-sparkles'])assert.ok(html.includes(name));
 for(const name of ['palace-lantern-float','palace-sparkle-drift'])assert.ok(css.includes('@keyframes '+name));
 assert.doesNotMatch(html,/<div class="palace-ghost|<div class="palace-bats|<span class="path-walker/);
 assert.equal((html.match(/data-castle-resident=/g)||[]).length,8);
 assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/data-motion-paused=true/);assert.match(css,/pointer-events:none/);
 assert.doesNotMatch(css,/@keyframes[^}]*flash|strobe/i);assert.match(js,/setBlocked\('palace'/);
});
test('palace scene and gate share one cover-scaled artwork coordinate system',()=>{
 assert.match(css,/palace-composition\{[^}]*width:max\(100cqw,calc\(100cqh \* 1\.777\)\)/);
 assert.match(css,/palace-gate-wrap\{[^}]*left:var\(--gate-x\);top:var\(--gate-y\);width:var\(--gate-w\);height:var\(--gate-h\)/);
 assert.match(css,/\.palace-art\{[^}]*brightness\(var\(--visitor-brightness,1\)\)/);
 for(const [w,h,ratio] of [[400,401,.75],[333,414,.75],[1180,563,1.777]]){
  const artW=Math.max(w,h*ratio),artH=Math.max(h,w/ratio);assert.ok(artW>=w&&artH>=h);
  const phone=w<=760,x=phone?.337:.378,y=phone?.388:.304,gw=phone?.324:.242,gh=phone?.333:.439;
  const gate={left:(w-artW)/2+x*artW,top:(h-artH)/2+y*artH,width:gw*artW,height:gh*artH};
  assert.ok(gate.left>=0&&gate.left+gate.width<=w);assert.ok(gate.top>=0&&gate.top+gate.height<=h);assert.ok(gate.width>=44&&gate.height>=44);
 }
});

test("floating wall is removed and approved noninteractive stills occupy the path",()=>{assert.doesNotMatch(html,/eerie-parapet|palace-eerie-corner/);for(const name of ['path-franken','path-zombie','path-werewolf'])assert.ok(html.includes(name));assert.match(css,/palace-path-walkers\{[^}]*pointer-events:none/);});

test("gate captions render above noninteractive creature layers",async()=>{const css=await readFile(new URL("../palace-entrance.css",import.meta.url),"utf8");assert.equal((css.match(/\.palace-gate-wrap\{z-index:10\}/g)||[]).length,2);});
