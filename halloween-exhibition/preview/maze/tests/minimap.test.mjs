import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mapHeading} from '../view-model.js';
const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
test('north-up minimap reports all four 2D directions and continuous 3D rotation',()=>{
 for(const [facing,angle] of [['up',0],['right',Math.PI/2],['down',Math.PI],['left',-Math.PI/2]])assert.equal(mapHeading('2d',42,facing),angle);
 for(const yaw of [-2,0.5,3])assert.equal(mapHeading('3d',yaw,'down'),-yaw);
});
test('persistent minimap is a keyboard button that opens the existing map dialog',()=>{
 const html=read('index.html'),app=read('app.js'),css=read('adventure-controls.css');
 assert.match(html,/<button type="button" id="minimap-open" class="minimap"[^>]*aria-haspopup="dialog"/);
 assert.match(html,/北 ↑/);assert.match(app,/\$\('minimap-open'\).onclick=\(\)=>\{if\(catalog\)showMap\(\);\}/);
 assert.ok(css.includes('grid-area:4/1;align-self:start;justify-self:end'));
 assert.ok(css.includes('display:flex!important;flex-direction:column;pointer-events:auto'));
 assert.ok(!css.includes(':is(.vignette,.minimap,#crosshair)'));
 assert.ok(app.includes('c.rotate(mapHeading(view,state.yaw,facing))'));
 assert.ok(app.includes("updateMinimap();updateHUD()"));
 const minimap=app.slice(app.indexOf('function updateMinimap(){'),app.indexOf('function drawMap('));
 assert.ok(minimap.includes("const canvas=$('mini'),markers=mapMarkers()"));
 assert.ok(minimap.includes('minimapChanges.changed('));
 assert.ok(minimap.includes('mapHeading(view,state.yaw,facing),markers]'));
 assert.ok(minimap.includes('drawMap(canvas,false,false,markers)'));
 assert.match(html,/← 探索に戻る/);
});
test('gate labels distinguish locked, available key, and unlocked; archive action is explicit',()=>{
 const stage=read('stage-2d.js'),app=read('app.js');
 assert.ok(!stage.includes('OPEN · 浮遊書庫'));
 for(const s of ['解錠済み｜浮遊書庫','解錠できる｜浮遊書庫','鍵が必要｜浮遊書庫'])assert.ok(stage.includes(s));
 assert.ok(app.includes("state.hasKey?'解錠する':'鍵が必要'"));
 assert.ok(app.includes("'書庫に入る'"));
});
