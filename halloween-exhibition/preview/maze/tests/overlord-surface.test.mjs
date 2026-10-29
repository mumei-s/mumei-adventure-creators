import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {decodeOverlordQueen} from '../overlord-queen-data.js';
import {createOverlordBoss} from '../overlord-boss.js';

test('UV-island seams share a continuous surface normal on the reconstructed jaw and legs',()=>{
 const d=decodeOverlordQueen();
 // Coincident original vertices whose exported normals diverged by 24–43
 // degrees. Their independent UVs must remain while lighting stays continuous.
 for(const [a,b] of [[5913,5916],[5911,7742],[5987,6038],[1685,1698],[1935,6745],[2504,3012]]){
  assert.deepEqual(Array.from(d.positions.slice(a*3,a*3+3)),Array.from(d.positions.slice(b*3,b*3+3)));
  const na=new THREE.Vector3().fromArray(d.normals,a*3),nb=new THREE.Vector3().fromArray(d.normals,b*3);
  assert(na.angleTo(nb)<.0001,'coincident surface vertices cannot retain a lighting seam');
 }
});

test('reconstructed surfaces keep their cast shadow without faceted normal-map and self-shadow artifacts',()=>{
 const boss=createOverlordBoss(THREE),normal=new THREE.Texture();
 try{
  boss.setTextures({generatedNormal:normal});
  assert.equal(boss.human.castShadow,true);
  assert.equal(boss.human.receiveShadow,false);
  for(const name of ['generatedBase','generatedFront','generatedFace','generatedRearHead']){
   assert.equal(boss.materials[name].normalMap,normal);
   assert.deepEqual(boss.materials[name].normalScale.toArray(),[0,0]);
  }
 }finally{boss.dispose();normal.dispose();}
});
