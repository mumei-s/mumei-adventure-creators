import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createOverlordStageEffects,overlordBladeTrajectory} from '../overlord-stage-fx.js';
import {overlordBattleDirector} from '../overlord-battle-director.js';

const source={x:.45,y:1.5,z:.1},target={x:-.4,y:.53,z:1.2};
const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-10;

test('five curved blade flights preserve exact arrival and a smooth finite tangent',()=>{
 const out={},middle=[];
 for(let index=0;index<5;index++){
  const input={source,target,index,special:true};
  assert.equal(overlordBladeTrajectory({...input,progress:0},out),out);assert(near(out,source));
  assert(near(overlordBladeTrajectory({...input,progress:1},out),target));
  const point=overlordBladeTrajectory({...input,progress:.5});middle.push(point);
  assert(point.y>(source.y+target.y)*.5+.1,'a flight has a real depth arc');
  for(let p=0;p<=1;p+=.01){
   const a=overlordBladeTrajectory({...input,progress:p}),b=overlordBladeTrajectory({...input,progress:p+.00001});
   assert(Object.values(a).every(Number.isFinite));
   const travel=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z).normalize(),tangent=new THREE.Vector3(a.dx,a.dy,a.dz).normalize();
   assert(travel.dot(tangent)>.9999,'orientation follows travel rather than the fixed source-target line');
  }
 }
 assert(new Set(middle.map(p=>p.x.toFixed(4)+':'+p.z.toFixed(4))).size===5,'five blades use distinct lateral paths');
 assert(Object.values(overlordBladeTrajectory({source:{x:NaN},target:{y:Infinity},progress:NaN})).every(Number.isFinite));
});

test('native curtains flow at separate depths and transient impacts remain absent with motion OFF',()=>{
 const fx=createOverlordStageEffects(THREE);
 try{
  const args={environment:{rift:1,eclipse:1,shock:1,shockTravel:.3},boss:source,target};
  fx.update({...args,time:2});assert.equal(fx.curtains.length,2);assert(fx.curtains.every(mesh=>mesh.visible));assert(fx.fractures.visible);
  const before=fx.curtains.map(mesh=>[...mesh.geometry.attributes.position.array]);
  fx.update({...args,time:2.3});const after=fx.curtains.map(mesh=>[...mesh.geometry.attributes.position.array]);
  assert.notDeepEqual(after,before);assert(after.flat().every(Number.isFinite));
  assert(after[0].some((v,i)=>i%3===2&&Math.abs(v-source.z)>3),'surfaces span depth, not one flat background');
  fx.update({...args,time:2.3,motion:false});
  for(const object of [...fx.curtains,fx.fractures,fx.shockwave,fx.bloom])assert(!object.visible);
 }finally{fx.dispose();}
});

test('ground impacts land on the actual struck actor and action camera returns before input resumes',()=>{
 const battle={status:'playing',spirit:26,maxSpirit:30},effect={type:'shine',started:10,damage:4,retaliation:5,counterSpecial:true};
 const fx=createOverlordStageEffects(THREE),boss={x:.45,y:.06,z:.2},hero={x:-.4,y:.07,z:1.2};
 try{
  const playerHit=overlordBattleDirector({battle,effect,time:10.65});assert.equal(playerHit.environment.impactTarget,'boss');
  fx.update({time:10.65,environment:playerHit.environment,boss,target:hero});assert.equal(fx.shockwave.position.x,boss.x);assert.equal(fx.shockwave.position.z,boss.z);
  const counterHit=overlordBattleDirector({battle,effect,time:12.28});assert.equal(counterHit.environment.impactTarget,'hero');
  fx.update({time:12.28,environment:counterHit.environment,boss,target:hero});assert.equal(fx.shockwave.position.x,hero.x);assert.equal(fx.shockwave.position.z,hero.z);
  const frames=Array.from({length:641},(_,i)=>overlordBattleDirector({battle,effect,time:10+i*.005}));
  assert(frames.some(f=>Math.abs(f.camera.orbit)>.03));assert(frames.every(f=>Math.abs(f.camera.orbit)<.06));assert(frames.every(f=>f.camera.push<.08));
  const end=overlordBattleDirector({battle,effect,time:13.21});assert.equal(end.camera.pullback,0);assert.equal(end.camera.push,Math.sin(13.21*.23)*.004);assert(Math.abs(end.camera.orbit)<=.014);
 }finally{fx.dispose();}
});
