import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {directionFromMovement,followCamera,clampSceneCamera,depthOrder,FURNITURE_FOOTPRINTS,inFurniture,moveAroundFurniture} from '../rpg-model.js';
import {ART_FILES,ART_ANCHORS,ART_BOUNDS,PALACE_TEXTURES,PLAYER_ATLAS,playerFrame,playerPose,createArtLibrary} from '../rpg-art.js';
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
test('all fifteen core and six palace runtime assets exist and loader reports failures explicitly',async()=>{
  assert.equal(Object.keys(ART_FILES).length,15);let bytes=0;
  for(const file of Object.values(ART_FILES)){assert(file.endsWith('.webp'));const b=fs.readFileSync(new URL('../assets/rpg/'+file,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');bytes+=b.length;}
  assert(bytes<2500000);
  for(const file of ['props-atlas.webp',...Object.values(PALACE_TEXTURES)]){const b=fs.readFileSync(new URL('../assets/rpg/palace/'+file,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');bytes+=b.length;}assert(bytes<3500000);
  const success=createArtLibrary({motionData:{},loadImage:async()=>({width:1024,height:1024})});await success.ready;assert.equal(success.version,21);assert.deepEqual(success.failures,[]);
  const failed=createArtLibrary({motionData:{},loadImage:async()=>{throw Error('offline');}});await failed.ready;assert.equal(failed.version,0);assert.equal(failed.failures.length,21);
});
test('library accepts every genre with legacy collection ID and no invented submissions',()=>{
  const app=read('app.js'),html=read('index.html');assert(html.includes('無名S note / Halloween Atelier'));assert(!html.includes('Halloween冒険室'));assert(app.includes('物語の書庫'));assert(app.includes('ジャンルを問わず'));assert(app.includes('記事の掲載状況とは別の一覧'));
  assert(!app.includes('ホラーイラストの記事を、ここに。'));assert(!app.includes('ホラー別室'));
  const a=['イラスト','詩','エッセイ','旅の記録'].map((kind,i)=>({id:String(i),kind,collection:'horror'}));assert.equal(visibleArticles(a).length,4);
  assert.match(read('app.js'),/libraryFromArchive/);assert.match(read('app.js'),/loadMazeStartupData/);assert.match(read('startup-assets.js'),/\.\.\/data\/archive\.json/);
});
test('battle uses original scene, meaningful meters and motion-safe local action effects',()=>{
  const app=read('app.js'),scene=read('battle-scene.js'),css=read('rpg-ui.css');
  assert(app.includes("battleCanvas=element('canvas'"));assert(app.includes("element('meter'"));assert(app.includes('battleEffect={type:action,...battle.lastAction,started:visualTime,'));assert(app.includes('battle.maxEnergy'));assert(app.includes('battle.maxSpirit'));assert(app.includes('battle.maxFocus'));assert(app.includes('commandFor(battle,action).disabled'));  
  assert(scene.includes("if(effect&&age<battleEffectDuration(effect.type,motion))"));assert(scene.includes("effect?.type==='guard'"));assert(scene.includes('monsterSprite(art,battle.id'));assert(!scene.includes('AudioContext'));
  assert(css.includes('min-height:44px'));assert(css.includes('@media(prefers-reduced-motion:reduce)'));assert(css.includes('animation:none!important'));
});
test('maze participates in shared layout preference and coherent cache release',()=>{
  const app=read('app.js'),html=read('index.html'),styles=JSON.parse(read('game-style-sources.json')),bundle=JSON.parse(read('game-script-manifest.json'));const version='20261014-adventure2';
  assert(app.includes("initDisplayMode({controlsParent:visitorSection,page:'maze'})"));assert(app.includes("document.addEventListener('yearbook:layout-change'"));
  assert(app.includes('../display-mode.js?v=20261019-unified1'));assert(styles.includes(`../visitor-preferences.css?v=${version}`));assert(styles.includes('../display-mode.css?v=20261014-adventure2'));assert(app.includes('./adventure-audio.js?v=20261016-ios1'));
  for(const file of ['style','stage-2d'])assert(styles.includes(`./${file}.css?v=${version}`));assert(styles.includes('./rpg-ui.css?v=20261014-adventure2'));
  assert.deepEqual(bundle.styleSources,styles);assert(bundle.entrySources.includes('maze/app.js'));assert(bundle.inputs.some(input=>input.path==='display-mode.js'));assert(bundle.inputs.some(input=>input.path==='maze/stage-2d.js'));
  assert(html.includes(`./game-entry.js?v=20261019-game-fast1-${bundle.output.sha256.slice(0,12)}`));assert(html.includes(`./game-styles.css?v=20261019-game-fast1-${bundle.styles.sha256.slice(0,12)}`));
  const expected={'safe-page-reload':'20261017-reload1','startup-assets':'20261017-startup1','game-display':'20261017-padpos1','viewport':'20261016-ios1','clear-reward':'20261015-clear1','walking-speed':'20261015-clear1','library-catalog':'20261015-clear1','view-model':'20261015-minimap1','game-input':'20261016-ios1','adventure-audio':'20261016-ios1','sound-check':'20261016-ios1'};
  for(const module of ['ending-ui','stage-2d','world','battle-scene','story-model','encounter-model','rpg-art','creator-runtime','creator-ui'])expected[module]='20261016-creator-rpg1';
  for(const module of ['minimap-size','ending-ui','stage-2d','world','battle-scene','story-model','encounter-model','creator-ui'])expected[module]='20261016-battle-visible1';
  for(const module of ['display-mode','context-action','resident-model','patrol-model','optional-encounters','ending-ui','stage-2d','world','battle-scene','story-model','encounter-model','rpg-art','creator-runtime','creator-ui'])expected[module]='20261016-resident1';
  expected['magical-loading']='20261015-journey1';for(const name of ['transition-effects','monster-motion','monster-motion-data','rpg-art','stage-2d','world','battle-scene','encounter-model','optional-encounters','patrol-model','creator-runtime','story-model','ending-ui','resident-model','creator-ui'])expected[name]='20261016-living1';for(const name of ['battle-scene', 'creator-runtime', 'creator-ui', 'ending-ui', 'resident-model', 'rpg-art', 'stage-2d', 'startup-assets', 'world'])expected[name]='20261017-startup1';
  for(const name of ['camera-distance','stage-2d','world'])expected[name]='20261019-scene1';
  for(const name of ['world','battle-scene','game-display','stage-2d','context-action','lighting-model','palace-furnishing-art','furnishing-info'])expected[name]='20261019-interior1';
  expected['context-action']='20261019-interior2';
  for(const name of ["app", "battle-model", "battle-scene", "camera-distance", "character-art", "control-preferences", "control-settings", "controller", "creator-home-architecture", "creator-home-painter", "game-input", "palace-architecture", "palace-forecourt", "palace-painter", "preferences", "reading-journey", "renderer", "save-model", "scene-names", "stage-2d", "story-data", "touch-camera", "town-model", "view-mode", "visitor-model", "world", "world-3d"])expected[name]='20261019-journey1';
  for(const name of ["app", "battle-scene", "character-art", "creator-story", "display-mode", "display-settings", "ending-ui", "monster-motion", "palace-cast-rig", "palace-living-scene", "palace-startup", "renderer", "rpg-art", "stage-2d", "sw", "theater", "world", "world-3d"])expected[name]='20261019-unified1';
  for(const name of ['app.js','stage-2d.js','rpg-model.js','battle-scene.js','world.js','creator-ui.js','creator-runtime.js','encounter-model.js','ending-ui.js'])for(const match of read(name).matchAll(/(?:from\s+|import\()'((?:\.\/|\.\.\/)[^']+\.js[^']*)'/g)){const module=match[1].match(/([^/]+)\.js/)[1];if(match[1].startsWith('./vendor/'))continue;const release=name==='creator-runtime.js'&&['movement-runtime','patrol-model'].includes(module)?'20261017-review1':expected[module]||version;assert(match[1].endsWith('?v='+release),`${name}: ${match[1]}`);}
  assert(html.includes('viewport-fit=cover'));assert(html.includes('apple-touch-icon'));assert(html.includes('apple-mobile-web-app-capable'));assert(!app.includes('serviceWorker.register'));
});

test('camera is bounded at every outer room edge, including a tall phone in the archive',()=>{
 for(const [w,h]of[[400,344],[390,582],[1280,618]]){const scale=Math.max(52,Math.min(86,w/6.2))/72,oy=h*.55;
  for(const target of [{x:36,y:72},{x:1150,y:72},{x:36,y:1044},{x:1150,y:1044}]){const c=clampSceneCamera(target,w,h,scale,oy);assert(c.y-oy/scale>=-54-.001);assert(c.x-w/2/scale>=-54-.001);assert(c.y+(h-oy)/scale<=1134+.001);assert(c.x+w/2/scale<=1206+.001);}
 }
});

test('new enemy crops use actual boot anchors instead of centering a wide cape',()=>{
 for(const id of ['vampire','zombie','franken']){assert(ART_ANCHORS[id].anchorX>0&&ART_ANCHORS[id].anchorX<1);assert(ART_ANCHORS[id].anchorY>.9&&ART_ANCHORS[id].anchorY<=1);assert(ART_BOUNDS[id][2]>0&&ART_BOUNDS[id][3]>0);}
});
