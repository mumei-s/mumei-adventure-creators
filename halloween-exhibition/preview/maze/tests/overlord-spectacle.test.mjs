import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {overlordBattleDirector as direct,overlordActionDuration} from '../overlord-battle-director.js';
import {createOverlordStageEffects} from '../overlord-stage-fx.js';
import {createOverlordAttackSwords} from '../overlord-battle-scene.js';

const battle={status:'playing',maxSpirit:30,spirit:30};
const special={type:'shine',started:10,damage:0,retaliation:5,counterSpecial:true};
const at=age=>direct({battle,effect:special,time:10+age});

test('a full-health special changes the hall into a flowing passage, then restores the scene before the next command',()=>{
 const idle=direct({battle,time:5}),charge=at(1.6),cast=at(2.0),end=at(overlordActionDuration(special)+.01);
 assert.equal(idle.environment.rift,0);assert.equal(idle.environment.stream,0);assert.equal(idle.environment.hallVisibility,1);
 assert(charge.environment.rift>.9,'the background transition does not depend on low HP');
 assert(cast.environment.stream>.75);assert(cast.environment.hallVisibility<.25);
 assert.equal(end.environment.rift,0);assert.equal(end.environment.flash,0);assert.equal(end.environment.shock,0);assert.equal(end.environment.hallVisibility,1);
 assert(end.blades.every(blade=>!blade.active),'weapons cannot remain floating after the attack');
});

test('each sequential blade has an expanding impact and the bright impact is short and bounded',()=>{
 const frames=Array.from({length:641},(_,i)=>at(i*.005));
 assert(frames.some(frame=>frame.environment.flash>.4&&frame.environment.shock>.9));
 assert(frames.every(frame=>frame.environment.flash>=0&&frame.environment.flash<=.58));
 for(let i=0;i<5;i++){
  const impacts=frames.map(frame=>frame.blades[i]).filter(blade=>blade.impact>.1);
  assert(impacts.length>5);assert(impacts.at(-1).impactProgress>impacts[0].impactProgress+.6);
 }
 assert(frames.filter(frame=>frame.environment.flash>.1).length*.005<1.1);
});

test('native passage streaks flow across depth, the shock expands, and victory replaces the storm with dawn rays',()=>{
 const fx=createOverlordStageEffects(THREE),boss={x:.45,y:.06,z:.2},target={x:-.4,y:.07,z:1.2};
 try{
  fx.update({time:11.6,boss,target,environment:at(1.6).environment});
  assert(fx.passage.visible&&fx.streams.visible);const before=Array.from(fx.streams.geometry.attributes.position.array);
  fx.update({time:11.7,boss,target,environment:at(1.7).environment});
  const after=Array.from(fx.streams.geometry.attributes.position.array);assert.notDeepEqual(after,before);assert(after.every(Number.isFinite));
  fx.update({time:12,boss,target,environment:{shock:1,shockTravel:.1,flash:.4}});const radius=fx.shockwave.scale.x;
  fx.update({time:12.1,boss,target,environment:{shock:.4,shockTravel:.8,flash:.15}});assert(fx.shockwave.scale.x>radius+1);assert(fx.bloom.visible);
  fx.update({time:15,boss,target,environment:{gold:1,victoryRays:1}});assert(fx.victoryRays.visible);assert(!fx.passage.visible&&!fx.streams.visible&&!fx.shockwave.visible&&!fx.bloom.visible);
 }finally{fx.dispose();}
});

test('motion OFF removes every transient cinematic even when an in-progress effect was supplied',()=>{
 const frame=direct({battle,effect:special,time:12,motion:false});
 for(const name of['rift','stream','flash','shock','shockTravel','victoryRays'])assert.equal(frame.environment[name],0,name);
 const fx=createOverlordStageEffects(THREE);try{
  fx.update({time:12,motion:false,environment:{rift:1,stream:1,flash:.5,shock:1,victoryRays:1}});
  for(const object of[fx.passage,fx.streams,fx.shockwave,fx.bloom,fx.victoryRays])assert.equal(object.visible,false);
 }finally{fx.dispose();}
});

test('recognizable solid swords summon briefly, fly tip-first to the target, then all disappear',()=>{
 const fx=createOverlordAttackSwords(THREE),boss={x:.45,y:.06,z:.2},hero={x:-.4,y:.07,z:1.2},tip=new THREE.Vector3();
 try{
  assert.equal(fx.swords.length,5);assert(fx.swords.every(sword=>!sword.visible));
  const charge=at(1.62);assert(charge.blades.some(blade=>blade.visible&&!blade.active));
  fx.update({blades:charge.blades,boss,hero});assert(fx.swords.some(sword=>sword.visible));
  for(const sword of fx.swords){
   assert(sword.getObjectByName('crimson-sword-blade')?.isMesh);
   assert(sword.getObjectByName('sword-crossguard')?.isMesh);
   assert(sword.getObjectByName('black-sword-grip')?.isMesh);
   const blade=sword.getObjectByName('crimson-sword-blade');blade.geometry.computeBoundingBox();assert(blade.geometry.boundingBox.max.z-blade.geometry.boundingBox.min.z>.03,'a physical blade, not only a line');
  }
  for(let i=0;i<5;i++){
   const frame=Array.from({length:641},(_,j)=>at(j*.005)).find(frame=>frame.blades[i].travel===1&&frame.blades[i].opacity>.9);
   assert(frame,'each sword reaches its own target before it dissolves');fx.update({blades:frame.blades,boss,hero});fx.group.updateMatrixWorld(true);
   tip.set(0,1,0).applyMatrix4(fx.swords[i].matrixWorld);
   assert(tip.distanceTo(new THREE.Vector3(hero.x+(i-2)*.035,hero.y+.46,hero.z))<1e-6,'the blade tip lands on the target');
  }
  fx.update({blades:at(4).blades,boss,hero});assert(fx.swords.every(sword=>!sword.visible),'no idle hovering swords');
  fx.update({blades:charge.blades,boss,hero,motion:false});assert(fx.swords.every(sword=>!sword.visible));
 }finally{fx.dispose();}
});
