import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {overlordAimYaw,overlordSpecialArc,fitOverlordBattleCamera} from '../overlord-battle-scene.js';
const source={x:1.3,y:0,z:-.5},target={x:-1.7,y:.02,z:1.5};

test('the boss local forward axis and launched swords aim at the actual hero in both approach positions',()=>{
 for(const z of[-1.2,-.5])for(const x of[-1.7,-1.1]){
  const from={...source,z},to={...target,x},yaw=overlordAimYaw(from,to);
  const forward=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
  const desired=new THREE.Vector3(to.x-from.x,0,to.z-from.z).normalize();
  assert.ok(forward.dot(desired)>1-1e-12);
 }
});

test('red special cuts travel from the boss toward the hero only within the resolved counter window',()=>{
 const sample=(progress,options={})=>overlordSpecialArc({index:2,progress,source,target,counter:true,...options});
 const near=sample(.3),far=sample(.7),distance=p=>Math.hypot(p.x-target.x,p.z-target.z);
 assert.equal(near.visible,true);assert.equal(far.visible,true);assert.ok(distance(far)<distance(near));
 assert.equal(sample(.1).visible,false);assert.equal(sample(1).visible,false);
 assert.equal(sample(.5,{motion:false}).visible,false);assert.equal(sample(.5,{counter:false}).visible,false);
 assert.ok(Math.abs(near.yaw-overlordAimYaw(source,target))<1e-12);
});

test('portrait, landscape and desktop framing keep the entire stage inside a twelve-percent camera margin',()=>{
 // Includes the measured throne crest, five-sword envelope and full hero sprite.
 const bounds=new THREE.Box3(new THREE.Vector3(-3.1,-.4,-3),new THREE.Vector3(3.45,4.635,2.8));
 const point=new THREE.Vector3();let previousDistance=Infinity;
 for(const aspect of[.35,.5,.75,1,1.5,2.5,3.4]){
  const camera=new THREE.PerspectiveCamera(36,aspect,.1,35),distance=fitOverlordBattleCamera(camera,bounds,aspect);
  assert.ok(distance<=previousDistance+1e-10);previousDistance=distance;
  for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z]){
   point.set(x,y,z).project(camera);
   assert.ok(Math.abs(point.x)<=.88+1e-10,`horizontal clip at aspect ${aspect}`);
   assert.ok(Math.abs(point.y)<=.88+1e-10,`vertical clip at aspect ${aspect}`);
   assert.ok(point.z>-1&&point.z<1,`depth clip at aspect ${aspect}`);
  }
 }
});
