import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createOverlordBoss} from '../overlord-boss.js';

test('the native hair leaves the actual eyes, nose and mouth visible from the frontal game direction',()=>{
 const actor=createOverlordBoss(THREE);try{
  actor.update(0,{motion:false});actor.root.updateMatrixWorld(true);actor.skeleton.update();
  const hair=actor.root.getObjectByName('sculpted-golden-hair-and-crown'),ray=new THREE.Raycaster();
  // These are source-mesh facial landmarks in the fitted rest coordinates.
  // Compare real ray distances, so an opaque scalp/curl crossing a feature
  // fails even when its material or geometry implementation changes.
  for(const [name,x,y]of[['left eye',.035,2.045],['right eye',-.035,2.045],['nose',0,2.022],['mouth',0,1.992]]){
   ray.set(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1));
   const surface=ray.intersectObject(actor.human)[0],cover=ray.intersectObject(hair,true)[0];
   assert(surface&&surface.face.materialIndex===2,name+' must sample the existing high-resolution facial surface');
   assert(!cover||cover.distance>surface.distance+.0001,name+' must not be hidden by a scalp or hair attachment');
  }
 }finally{actor.dispose();}
});

test('the full native actor retains its mobile geometry budget and opaque depth-tested hair',()=>{
 const actor=createOverlordBoss(THREE);try{
  const hair=actor.root.getObjectByName('sculpted-golden-hair-and-crown');let meshes=0,triangles=0;
  actor.root.traverse(object=>{if(!object.isMesh)return;meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;});
  assert(meshes<100,'hair volume cannot turn each strand into a separate draw');
  assert(triangles<100000,'the full actor, cape, crown and five swords remain inside the mobile budget');
  hair.traverse(object=>{if(!object.isMesh)return;assert(!object.material.transparent,'hair cannot require alpha sorting');assert(object.material.depthTest);});
 }finally{actor.dispose();}
});
