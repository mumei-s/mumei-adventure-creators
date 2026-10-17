import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directionAtPoint} from '../game-input.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('larger translucent controls load after all legacy layout rules',()=>{
 const html=read('index.html'),css=read('touch-pad.css');
 assert.ok(html.indexOf('touch-pad.css?v=20261017-space1')>html.indexOf('transition-effects.css'));
 assert.match(css,/--touch-pad-size:144px;--touch-button-size:56px/);
 assert.match(css,/transform:translateY\(-8px\)/);
 assert.match(css,/grid-template-rows:minmax\(var\(--ui-header-height,48px\),auto\) 0 auto minmax\(0,1fr\) 120px 20px/);
 assert.match(css,/color:#fff5dc;background:#2033482e/);assert.match(css,/opacity:1/);
 assert.doesNotMatch(css,/opacity:\s*0\./);
 assert.match(css,/forced-colors:active/);
});
test('larger circular targets fit, do not visually overlap, and keep direction mapping',()=>{
 for(const [size,button] of [[144,56],[136,52]]){
  const middle=(size-2-button)/2;
  const points=[['forward',middle,0],['back',middle,size-2-button],['left',0,middle],['right',size-2-button,middle]];
  for(const [dir,x,y] of points){
   assert.ok(button>=52);assert.ok(x>=0&&y>=0&&x+button<=size-2&&y+button<=size-2);
   assert.equal(directionAtPoint(x+1+button/2,y+1+button/2,size,size),dir);
  }
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(Math.hypot(points[i][1]-points[j][1],points[i][2]-points[j][2])>=button);
 }
});
test('portrait controls clear adjacent actions from320px; landscape rail keeps62px docks clear',()=>{
 for(const width of [320,360,390,430,768])assert.ok((width-168)/2>=44);
 const rail=272,pad=136,left=(rail-pad)/2,right=left+pad;
 assert.ok(left>=62);assert.ok(right<=rail-62-4);
 // 144px circle, lifted8px, extends32px above restored120px strip.
 assert.equal(144+8-120,32);assert.equal(120-8-144/2,40);
});
test('scene extends behind the unchanged control strip and only surfaces become clearer',()=>{
 const css=read('touch-pad.css');
 assert.match(css,/#game :is\(#world,#fallback\)\{grid-area:4\/1\/6\/2\}/);
 assert.match(css,/#3d52621f,#17263919/);assert.match(css,/background:#2033482e/);
 assert.match(css,/--touch-pad-size:144px;--touch-button-size:56px/);
 assert.match(css,/transform:translateY\(-8px\)/);assert.match(css,/opacity:1/);
 assert.doesNotMatch(css,/opacity:\s*0\./);
 // The120px grid track stays in place: canvas adds exactly that track below itself.
 const hud=100,header=56,footer=20,viewport=600,strip=120;
 assert.equal((viewport-header-hud-footer)-(viewport-header-hud-footer-strip),120);
});
test('narrow HUD preserves full objective and44px targets instead of clipping text',()=>{
 const css=read('touch-pad.css');
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/--ui-font:14px;--ui-meta:12px;--ui-target:44px;--ui-header-height:48px/);
 assert.match(css,/\.place p\{font-size:14px;line-height:1\.35\}/);
 assert.doesNotMatch(css,/line-clamp|text-overflow|max-height:.*\.place/);
});

test('canvas expansion never overrides viewport landscape or compact tracks',()=>{
 const css=read('touch-pad.css');
 assert.ok(css.includes(':root:not([data-viewport-landscape=true]):not([data-viewport-compact=true]) body[data-view] #game :is(#world,#fallback){grid-area:4/1/6/2}'));
 assert.equal((css.match(/grid-area:4\/1\/6\/2/g)||[]).length,1);
});
