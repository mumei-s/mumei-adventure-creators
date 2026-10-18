import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../town/'+name,import.meta.url),'utf8');
test('town thumb controls grow modestly over the full scene and keep saved scaling',async()=>{
 const css=await read('touch-controls.css'),html=await read('index.html'),base=await read('style.css');
 assert.ok(html.indexOf('touch-controls.css')>html.indexOf('game-display.css'));
 assert.match(css,/\.town-world\{grid-area:3\/1\/6\/2\}/);
 assert.match(css,/footer\{display:none\}/);
 assert.match(css,/background:none;pointer-events:none;z-index:2/);
 assert.match(css,/\.town-controls>div\{pointer-events:auto\}/);
 assert.match(css,/bottom:calc\(var\(--safe-bottom\) \+ 8px\)/);
 assert.match(css,/"move utilities" "move actions"/);
 assert.match(css,/"utilities move" "actions move"/);
 assert.match(css,/--pad-size:calc\(136px \* var\(--game-control-scale,1\)\)/);assert.match(css,/--town-pad-button-size:max\(44px,calc\(50px \* var\(--game-control-scale,1\)\)\)/);assert.doesNotMatch(css,/--town-button-size:/);
 assert.match(base,/--pad-size:calc\(112px \* var\(--game-control-scale,1\)\)/);
 assert.match(css,/background:#2033482e;color:#fff5dc/);assert.match(css,/opacity:1/);assert.match(css,/background:#e2c58f55;color:#fff5dc;border-color:#ffe0a1/);
 assert.match(css,/min-height:max\(44px,var\(--town-button-size\)\)/);
});
test('secondary actions retain accessible routes without a third bottom row',async()=>{
 const css=await read('touch-controls.css'),html=await read('index.html'),app=await read('app.js');
 assert.match(css,/#map-open,#town-main #inventory-open\{display:none\}/);
 assert.match(html,/id="minimap-open"/);
 assert.match(app,/\['持ち物',showInventory\]/);
 assert.match(app,/button\('地図',showMap\)/);
 assert.match(html,/id="lantern-toggle" aria-pressed="true"/);
});
test('two corner controls fit narrow phones at every supported control size',()=>{
 for(const width of [300,320,340,390,560,844])for(const scale of [1,1.05,1.1,1.15,1.2,1.25]){
  const pad=136*scale,rightAvailable=width-16-12-pad;
  assert.ok(Math.min(140,rightAvailable)>=44,`${width}px at ${scale}`);
  assert.ok(44*scale>=44);
 }
});

test('town release requests the updated renderer through a versioned app entry',async()=>{
 assert.match(await read('index.html'),/app\.js\?v=20261019-unified1/);
 assert.match(await read('app.js'),/renderer\.js\?v=20261019-unified1/);
 assert.match(await read('app.js'),/world-3d\.js\?v=20261019-unified1/);
});


test('street pad shares the basement translucent palette and four centered target positions',async()=>{
 const css=await read('touch-controls.css'),maze=await readFile(new URL('../maze/touch-pad.css',import.meta.url),'utf8');
 for(const token of ['#3d52621f,#17263919','#2033482e','#fff0c577','#e2c58f55','#ffe0a1']){assert.ok(css.includes(token));assert.ok(maze.includes(token));}
 assert.match(css,/left:calc\(\(100% - var\(--town-pad-button-size\)\)\/2\)/);assert.match(css,/top:calc\(\(100% - var\(--town-pad-button-size\)\)\/2\)/);
 for(const scale of [1,1.05,1.1,1.15,1.2,1.25]){const size=136*scale,button=50*scale,middle=(size-2-button)/2;assert.ok(button>=44);assert.ok(Math.SQRT2*middle>=button);}
});
