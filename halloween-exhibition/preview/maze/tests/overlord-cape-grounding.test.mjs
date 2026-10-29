import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createOverlordHairCloth} from '../overlord-hair-cloth.js';
import {createOverlordBoss} from '../overlord-boss.js';

function attachment(){
 const materials=Object.fromEntries(['hair','hairLight','gold','goldLight','gem','red'].map(name=>[name,new THREE.MeshStandardMaterial()]));
 const cloth=createOverlordHairCloth(THREE,{head:new THREE.Bone(),torso:new THREE.Bone(),materials});
 return {...cloth,dispose(){cloth.dispose();Object.values(materials).forEach(m=>m.dispose());}};
}
function capeFloor(model){
 const cape=model.root.getObjectByName('animated-crimson-cape'),point=new THREE.Vector3();model.root.updateMatrixWorld(true);let minimum=Infinity;
 for(let i=0;i<cape.geometry.attributes.position.count;i++){point.fromBufferAttribute(cape.geometry.attributes.position,i).applyMatrix4(cape.matrixWorld);minimum=Math.min(minimum,point.y);}
 return minimum;
}

test('floor correction anchors the collar and progressively shortens only the lower cape, including paused motion',()=>{
 const cloth=attachment();try{
  cloth.update({motion:false});const p=cloth.cape.geometry.attributes.position,uv=cloth.cape.geometry.attributes.uv,start=Array.from(p.array),parent=cloth.torsoGroup.position.clone();
  cloth.update({motion:false,groundLift:.4});
  let collar=0,hem=0,middle=0;for(let i=0;i<p.count;i++){
   const v=1-uv.getY(i),rise=p.getY(i)-start[i*3+1];
   assert.equal(p.getX(i),start[i*3]);assert.equal(p.getZ(i),start[i*3+2]);
   if(v<.149){collar++;assert(Math.abs(rise)<1e-7,'collar remains attached to the seated torso');}
   else if(v>.999){hem++;assert(Math.abs(rise-.4)<2e-7,'hem receives the full grounding correction');}
   else{middle++;assert(rise>=-1e-7&&rise<.400001);}
  }
  assert(collar&&hem&&middle);assert.deepEqual(cloth.torsoGroup.position.toArray(),parent.toArray(),'the whole cape group must not move');
  const grounded=Array.from(p.array);cloth.update({motion:false,groundLift:.4,time:500});assert.deepEqual(Array.from(p.array),grounded,'paused time does not animate or change grounding');
  assert(Array.from(cloth.cape.geometry.attributes.normal.array).every(Number.isFinite));
  cloth.update({motion:false,groundLift:0});assert.deepEqual(Array.from(p.array),start,'standing restores the original cloth');
 }finally{cloth.dispose();}
});

test('omitted and zero grounding preserve the legacy cloth and invalid lift values stay finite',()=>{
 const a=attachment(),b=attachment();try{
  const input={motion:true,time:1.7,strike:.7,wind:.5,defeat:.2};a.update(input);b.update({...input,groundLift:0});
  assert.deepEqual(Array.from(a.cape.geometry.attributes.position.array),Array.from(b.cape.geometry.attributes.position.array));
  assert.deepEqual(Array.from(a.cape.geometry.attributes.normal.array),Array.from(b.cape.geometry.attributes.normal.array));
  for(const groundLift of [NaN,Infinity,-1]){b.update({...input,groundLift});assert.deepEqual(Array.from(a.cape.geometry.attributes.position.array),Array.from(b.cape.geometry.attributes.position.array));}
 }finally{a.dispose();b.dispose();}
});

test('actual generated actor keeps the cape hem at the floor throughout sitting and standing, with and without motion',()=>{
 const model=createOverlordBoss(THREE);try{
  for(const motion of [true,false])for(const [state,elapsed]of [['idle',0],['seated',1],['stand',0],['stand',.25],['stand',.55],['stand',1.1]]){
   model.setState(state,{restart:true});model.update(0,{state,stateElapsed:elapsed,time:.6,motion});
   const floor=capeFloor(model);assert(floor>=-.02&&floor<=.07,`${state}/${elapsed}, motion=${motion}: cape floor ${floor}`);
   const cape=model.root.getObjectByName('animated-crimson-cape'),snapshot=Array.from(cape.geometry.attributes.position.array);
   if(!motion){model.update(.1,{state,stateElapsed:elapsed,time:100,motion:false});assert.deepEqual(Array.from(cape.geometry.attributes.position.array),snapshot);}
   assert(Array.from(cape.geometry.attributes.normal.array).every(Number.isFinite));
  }
 }finally{model.dispose();}
});
