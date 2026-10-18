import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../town/'+name,import.meta.url),'utf8');
test('town thumb controls float over the full scene without changing pad geometry',async()=>{
 const css=await read('touch-controls.css'),html=await read('index.html'),base=await read('style.css');
 assert.ok(html.indexOf('touch-controls.css')>html.indexOf('game-display.css'));
 assert.match(css,/\.town-world\{grid-area:3\/1\/6\/2\}/);
 assert.match(css,/footer\{display:none\}/);
 assert.match(css,/background:none;pointer-events:none;z-index:2/);
 assert.match(css,/\.town-controls>div\{pointer-events:auto\}/);
 assert.match(css,/bottom:calc\(var\(--safe-bottom\) \+ 8px\)/);
 assert.match(css,/"move utilities" "move actions"/);
 assert.match(css,/"utilities move" "actions move"/);
 assert.doesNotMatch(css,/--pad-size:|--town-button-size:|\.direction-pad button\{[^}]*opacity:/);
 assert.match(base,/--pad-size:calc\(112px \* var\(--game-control-scale,1\)\)/);
 assert.match(css,/background:#16303d2e;color:#fff3d7/);
 assert.match(css,/min-height:max\(44px,var\(--town-button-size\)\)/);
});
test('secondary actions retain accessible routes without a third bottom row',async()=>{
 const css=await read('touch-controls.css'),html=await read('index.html'),app=await read('app.js');
 assert.match(css,/#map-open,#town-main #inventory-open\{display:none\}/);
 assert.match(html,/id="minimap-open"/);
 assert.match(app,/\['持ち物',showInventory\]/);
 assert.match(app,/\['街の地図',showMap\]/);
 assert.match(html,/id="lantern-toggle" aria-pressed="true"/);
});
test('two corner controls fit narrow phones at every supported control size',()=>{
 for(const width of [300,320,340,390,560,844])for(const scale of [1,1.05,1.1,1.15,1.2,1.25]){
  const pad=112*scale,rightAvailable=width-16-12-pad;
  assert.ok(Math.min(140,rightAvailable)>=44,`${width}px at ${scale}`);
  assert.ok(44*scale>=44);
 }
});

test('town release requests the updated renderer through a versioned app entry',async()=>{
 assert.match(await read('index.html'),/app\.js\?v=20261019-scene1/);
 assert.match(await read('app.js'),/renderer\.js\?v=20261019-scene1/);
 assert.match(await read('app.js'),/world-3d\.js\?v=20261019-scene1/);
});
