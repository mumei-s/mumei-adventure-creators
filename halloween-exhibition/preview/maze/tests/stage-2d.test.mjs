import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stageCamera,EXIT} from '../stage-2d.js';
import {initialState,blocked,CELL} from '../maze-model.js';
const css=fs.readFileSync(new URL('../adventure-controls.css',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('2D has its own full-width gameplay grid, not a small square minimap',()=>{
  assert(css.includes('grid-template-rows:52px 44px 34px minmax(0,1fr) 144px 24px'));
  assert(css.includes('grid-area:4/1'));assert(css.includes('width:100%!important;height:100%!important'));
  assert(css.includes('aspect-ratio:auto!important'));assert(css.includes('transform:none!important'));
  for(const [w,h]of[[400,606],[390,844]]){const stageHeight=h-52-44-34-144-24;assert(stageHeight>=308);assert(stageHeight/h>.50);assert(w*stageHeight/(w*h)>.50);}
});
test('close-up player is centered and tiles remain large on both target phones',()=>{
  for(const [w,h]of[[400,308],[390,546],[1280,618]]){const c=stageCamera(initialState(),w,h);assert(c.tile>=52);assert(c.tile<=86);assert.equal(c.originX,w/2);assert.equal(c.originY,h*.55);assert.equal(c.x,initialState().x/CELL*72);}
});
test('2D camera target has no autonomous movement, rotation or shaking',()=>{
  const a=stageCamera(initialState(),400,344),b=stageCamera({...initialState(),yaw:2,pitch:1,time:999},400,344);assert.deepEqual(a,b);
  assert.equal(stageCamera({...initialState(),x:36},400,344).x-a.x,72);
  const source=fs.readFileSync(new URL('../stage-2d.js',import.meta.url),'utf8');assert(!source.includes('Math.random'));assert(!source.includes('setInterval'));assert(!source.includes('AudioContext'));
});
test('touch controls occupy a separate dock, including compact settings and exits',()=>{
  assert(css.includes('grid-area:5/1'));assert(css.includes('justify-self:center'));
  assert(css.includes('width:112px;height:112px')); assert(css.includes('min-height:44px!important'));
  assert(html.includes('id="menu-open" aria-haspopup="dialog"'));assert(app.includes('function showExploreMenu()'));
  for(const label of ['記事一覧','迷宮全体の地図','明るさ・音楽','モンスターと遊ぶ','迷宮の入口へ','Halloweenの名鑑へ戻る'])assert(app.includes(label));
  assert(!blocked(EXIT.x*CELL,EXIT.z*CELL,{}));assert(app.includes('function showExit()'));assert(app.includes("back.href='../?mode=halloween'"));
});
test('renderer is separate from overview map and invalidates on resize/mode change',()=>{
  assert(app.includes("stageRenderer.render({canvas:$('fallback')"));assert(app.includes("drawMap($('mini'))"));
  assert(app.includes('stageRenderer?.invalidate()'));assert(app.includes('motion:motion&&!reducedMotion.matches'));
  assert(html.includes('href="./stage-2d.css?v=20261014-adventure2"'));assert(css.includes(':is(.vignette,#crosshair)'));
});
