import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {directionFromMovement,followCamera,clampSceneCamera,depthOrder,FURNITURE_FOOTPRINTS,inFurniture,moveAroundFurniture} from '../rpg-model.js';
import {ART_FILES,ART_ANCHORS,PLAYER_ATLAS,playerFrame,playerPose,createArtLibrary} from '../rpg-art.js';
import {initialState,FEATURES,visibleArticles} from '../maze-model.js';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('four directional idle and four-frame walking poses stay within the normalized atlas',()=>{
  assert.deepEqual(PLAYER_ATLAS.directions,['down','left','right','up']);
  for(const [row,direction] of PLAYER_ATLAS.directions.entries()){
    assert.equal(playerFrame(direction,false,99).column,0);
    for(let column=0;column<4;column++){const p=playerFrame(direction,true,(column+.1)*Math.PI/2);assert.equal(p.row,row);assert.equal(p.column,column);assert.deepEqual(p.frame,[column*256,row*256,256,256]);}
  }
  assert.equal(playerFrame('invalid',true,-Math.PI).row,0);
  assert.equal(playerPose({images:{}},'down',true,0),null);
  assert.equal(directionFromMovement(1,0),'right');assert.equal(directionFromMovement(-1,0),'left');assert.equal(directionFromMovement(0,1),'down');assert.equal(directionFromMovement(0,-1),'up');assert.equal(directionFromMovement(0,0,'left'),'left');
});
test('smooth camera follows without overshoot; reduced motion and teleport snap directly',()=>{
  const origin={x:0,y:0},target={x:40,y:30};let next=followCamera(origin,target,.016);
  assert(next.x>0&&next.x<40&&next.y>0&&next.y<30);assert.deepEqual(origin,{x:0,y:0});
  for(let n=0;n<60;n++)next=followCamera(next,target,.016);
  assert(Math.abs(next.x-target.x)<.00001);assert.deepEqual(followCamera(next,target,.016,true),target);
  assert.deepEqual(followCamera(origin,{x:300,y:0},.016),{x:300,y:0});assert.deepEqual(followCamera(null,target,0),target);
  assert.deepEqual(followCamera(origin,target,-1),origin);
});
test('foreground occlusion sorts by ground contact, preserving equal-depth order',()=>{
  const objects=[{id:'wall',depth:80},{id:'hero',depth:75},{id:'pumpkin',depth:75}];
  assert.deepEqual(depthOrder(objects).map(x=>x.id),['hero','pumpkin','wall']);assert.equal(objects[0].id,'wall');
  const source=read('stage-2d.js');assert(source.includes('depthOrder(objects)'));assert(source.includes('artVersion!==art.version'));assert(source.includes('sc.clip()'));
});
test('solid shelf feet prevent crossing while keeping interaction routes open',()=>{
  for(const f of FURNITURE_FOOTPRINTS){assert(inFurniture(f.x,f.z));let s={...initialState(),x:f.x,z:f.z+2};for(let n=0;n<20;n++){s=moveAroundFurniture(s,0,-.1);assert(!inFurniture(s.x,s.z));}assert(s.z>=f.z+1);}
  // Half-unit graph exercises the actual movement model, including player radius.
  function reachable(target,flags={}){const start={...initialState(),...flags},q=[start],seen=new Set([`${start.x},${start.z}`]);for(let i=0;i<q.length;i++){const s=q[i];if(Math.hypot(s.x-target.x*4,s.z-target.z*4)<.51)return true;for(const [dx,dz]of[[.5,0],[-.5,0],[0,.5],[0,-.5]]){const n=moveAroundFurniture(s,dx,dz),k=`${n.x},${n.z}`;if(!seen.has(k)){seen.add(k);q.push(n);}}}return false;}
  assert(reachable(FEATURES.key));assert(reachable(FEATURES.article));assert(reachable(FEATURES.horrorArt,{horrorAccepted:true}));assert(!reachable(FEATURES.vault));assert(reachable(FEATURES.vault,{unlocked:true}));
});
test('all twelve original runtime assets exist and loader reports failures explicitly',async()=>{
  assert.equal(Object.keys(ART_FILES).length,12);let bytes=0;
  for(const file of Object.values(ART_FILES)){assert(file.endsWith('.webp'));const b=fs.readFileSync(new URL('../assets/rpg/'+file,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');bytes+=b.length;}
  assert(bytes<1500000);
  const success=createArtLibrary({loadImage:async()=>({width:1024,height:1024})});await success.ready;assert.equal(success.version,12);assert.deepEqual(success.failures,[]);
  const failed=createArtLibrary({loadImage:async()=>{throw Error('offline');}});await failed.ready;assert.equal(failed.version,0);assert.equal(failed.failures.length,12);
});
test('library accepts every genre with legacy collection ID and no invented submissions',()=>{
  const app=read('app.js'),html=read('index.html');assert(html.includes('Halloween冒険室'));assert(app.includes('物語の書庫'));assert(app.includes('ジャンルを問わず'));assert(app.includes('記事の掲載状況とは別の一覧'));
  assert(!app.includes('ホラーイラストの記事を、ここに。'));assert(!app.includes('ホラー別室'));
  const a=['イラスト','詩','エッセイ','旅の記録'].map((kind,i)=>({id:String(i),kind,collection:'horror'}));assert.equal(visibleArticles(a).length,4);
  assert.deepEqual(JSON.parse(read('data/catalog.json')).articles,[]);
});
test('battle uses original scene, meaningful meters and motion-safe local action effects',()=>{
  const app=read('app.js'),scene=read('battle-scene.js'),css=read('rpg-ui.css');
  assert(app.includes("battleCanvas=element('canvas'"));assert(app.includes("element('meter'"));assert(app.includes('battleEffect={type:action,damage,retaliation:prankFor(battle).damage,started:visualTime}')); 
  assert(scene.includes("if(effect&&motion&&age<1.2)"));assert(scene.includes("effect?.type==='guard'"));assert(scene.includes('art.images[battle.id]'));assert(!scene.includes('AudioContext'));
  assert(css.includes('min-height:44px'));assert(css.includes('@media(prefers-reduced-motion:reduce)'));assert(css.includes('animation:none!important'));
});
test('maze participates in shared layout preference and coherent cache release',()=>{
  const app=read('app.js'),html=read('index.html');const version='20261014-layout1';
  assert(app.includes("initDisplayMode({controlsParent:visitorSection,page:'maze'})"));assert(app.includes("document.addEventListener('yearbook:layout-change'"));
  for(const name of ['visitor-preferences','display-mode']){assert(app.includes(`../${name}.js?v=${version}`));assert(html.includes(`../${name}.css?v=${version}`));}
  for(const file of ['style','stage-2d','rpg-ui'])assert(html.includes(`./${file}.css?v=${version}`));assert(html.includes(`./app.js?v=${version}`));
  for(const name of ['app.js','stage-2d.js','rpg-model.js','battle-scene.js'])for(const match of read(name).matchAll(/(?:from\s+|import\()'((?:\.\/|\.\.\/)[^']+\.js[^']*)'/g))assert(match[1].endsWith('?v='+version),`${name}: ${match[1]}`);
  assert(html.includes('viewport-fit=cover'));assert(html.includes('apple-touch-icon'));assert(html.includes('apple-mobile-web-app-capable'));assert(!app.includes('serviceWorker.register'));
});

test('camera is bounded at every outer room edge, including a tall phone in the archive',()=>{
 for(const [w,h]of[[400,344],[390,582],[1280,618]]){const scale=Math.max(52,Math.min(86,w/6.2))/72,oy=h*.55;
  for(const target of [{x:36,y:72},{x:1150,y:72},{x:36,y:1044},{x:1150,y:1044}]){const c=clampSceneCamera(target,w,h,scale,oy);assert(c.y-oy/scale>=-54-.001);assert(c.x-w/2/scale>=-54-.001);assert(c.y+(h-oy)/scale<=1134+.001);assert(c.x+w/2/scale<=1206+.001);}
 }
});

test('new enemy crops use actual boot anchors instead of centering a wide cape',()=>{
 assert.equal(ART_ANCHORS.vampire.anchorX,(285-102)/381);assert.equal(ART_ANCHORS.zombie.anchorX,(284-106)/330);assert.equal(ART_ANCHORS.vampire.anchorY,1);
});
