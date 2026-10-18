import test from 'node:test';
import assert from 'node:assert/strict';
import {createStageRenderer} from '../stage-2d.js';
import {initialState} from '../maze-model.js';
import {ALL_MONSTERS,monsterPose} from '../encounter-model.js';
import {createActorPatrol} from '../patrol-model.js';
import {monsterSprite} from '../monster-motion.js';
import {MONSTER_MOTION_DATA} from '../monster-motion-data.js';

const flags={unlocked:true,horrorAccepted:true};
function stage(){
 let canvases=0;
 function makeCanvas(width,height){
  canvases++;const monsters=[],gradient={addColorStop(){}};let lastTranslate;
  const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:20}),translate(x,y){lastTranslate={x,y};},drawImage(image,...frame){if(image.monsterId)monsters.push({id:image.monsterId,...lastTranslate,frame:frame.slice(0,4)});}},{get:(target,key)=>key in target?target[key]:()=>{},set(target,key,value){target[key]=value;return true;}});
  return {width,height,monsters,getContext:()=>context};
 }
 const images=Object.fromEntries(Object.entries(MONSTER_MOTION_DATA).map(([id,layout])=>[id,{width:layout.width,height:layout.height,monsterId:id}]));
 const art={images,monsterLayouts:MONSTER_MOTION_DATA,version:1},renderer=createStageRenderer({makeCanvas,art}),canvas=makeCanvas(390,620);
 return {renderer,canvas,art,allocations:()=>canvases};
}
function realTravelStart(id){const route=createActorPatrol({id},{role:'monster'});return route.duration*2+.7-route.offset;}

test('an idle hero does not throttle visible monster travel below the actual 30/60/120Hz frame loop',()=>{
 const start=realTravelStart('pumpkin'),state={...initialState(),...flags};
 for(const hz of [30,60,120]){
  const h=stage(),positions=[],allocated=h.allocations();
  for(let n=0;n<=hz;n++){
   const time=start+n/hz;
   assert.equal(h.renderer.render({canvas:h.canvas,state,motion:true,encounters:true,time,dt:1/hz}),true,`${hz}Hz frame ${n} draws its continuous patrol position`);
   const point=h.canvas.monsters.filter(actor=>actor.id==='pumpkin').at(-1),expected=monsterPose(ALL_MONSTERS.find(monster=>monster.id==='pumpkin'),time,true,state);
   assert.ok(Math.abs(point.x-expected.x*72)<1e-9);assert.ok(Math.abs(point.y-expected.z*72)<1e-9);positions.push(point);
  }
  for(let n=1;n<positions.length;n++){
   const distance=Math.hypot(positions[n].x-positions[n-1].x,positions[n].y-positions[n-1].y);
   assert.ok(distance>0,'moving patrol has no held render frames');assert.ok(distance<=.2*72/hz+1e-8,'no catch-up jump after a held frame');
  }
  assert.equal(h.allocations(),allocated,'cached architecture and shade canvases are reused at every frame');
  assert.equal(h.renderer.render({canvas:h.canvas,state,motion:true,encounters:true,time:start+1,dt:0}),false,'an identical clock does not draw twice');
 }
});

test('the actual rendered atlas crop follows travelled distance in both directions, independently of the clock',()=>{
 const h=stage(),state={...initialState(),...flags},monster=ALL_MONSTERS.find(monster=>monster.id==='pumpkin'),start=realTravelStart(monster.id);
 for(let n=0;n<80;n++){
  const time=start+n/60,patrol=monsterPose(monster,time,true,state),expected=monsterSprite(h.art,monster.id,{time:999,motion:true,patrol});
  h.renderer.render({canvas:h.canvas,state,motion:true,encounters:true,time,dt:1/60});
  assert.deepEqual(h.canvas.monsters.filter(actor=>actor.id===monster.id).at(-1).frame,expected.frame);
 }
 for(const id of Object.keys(MONSTER_MOTION_DATA))for(const facing of ['left','right']){
  const patrol={distance:.123,walking:true,facing,turning:false,phase:0};
  const a=monsterSprite(h.art,id,{time:1,motion:true,patrol}),b=monsterSprite(h.art,id,{time:1000,motion:true,patrol});
  assert.equal(a.frameIndex,b.frameIndex,id+' has no wall-clock walking steps at the same physical pose');assert.equal(a.flip,b.flip);
 }
});

test('the distance gait keeps each approved 5–6fps cruise cadence and slows with actual travel',()=>{
 const h=stage();
 for(const [id,layout] of Object.entries(MONSTER_MOTION_DATA)){
  function count(speed){let previous,changes=0;for(let n=0;n<=120;n++){const sprite=monsterSprite(h.art,id,{time:n/120,motion:true,patrol:{distance:.013+speed*n/120,walking:true,facing:'right'}});if(previous!==undefined&&sprite.frameIndex!==previous)changes++;previous=sprite.frameIndex;}return changes;}
  assert.equal(count(.2),layout.fps,id+' preserves its authored cruising cadence');assert.ok(count(.1)<count(.2),id+' cannot keep running its walking cycle while braking');
 }
});

test('reduced motion stays static, reuses identical scene output and never allocates another sprite image',()=>{
 const h=stage(),state={...initialState(),...flags};
 assert.equal(h.renderer.render({canvas:h.canvas,state,motion:false,encounters:true,time:0}),true);
 const count=h.canvas.monsters.length,allocated=h.allocations();
 for(const time of [1,10,999])assert.equal(h.renderer.render({canvas:h.canvas,state,motion:false,encounters:true,time}),false);
 assert.equal(h.canvas.monsters.length,count);assert.equal(h.allocations(),allocated);
 for(const id of Object.keys(MONSTER_MOTION_DATA)){
  const first=monsterSprite(h.art,id,{time:0,motion:false,patrol:{distance:0,walking:true,facing:'right'}}),later=monsterSprite(h.art,id,{time:999,motion:false,patrol:{distance:999,walking:true,facing:'right'}});
  assert.equal(first.frameIndex,0);assert.equal(later.frameIndex,0);assert.equal(first.image,later.image);assert.equal(first.image,h.art.images[id]);
 }
});
