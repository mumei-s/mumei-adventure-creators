import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {OVERLORD_ART_PART_NAMES,OVERLORD_ART_PARTS,sampleOverlordArtPose,drawOverlordArtRig,createOverlordArtRig} from '../overlord-art-rig.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const close=(a,b,tolerance=1e-8)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const image={width:1254,height:1254};

test('neutral queen plants two uncrossed feet and keeps her knees beneath her hips',()=>{
 const resting=sampleOverlordArtPose({state:'idle',time:0});
 for(let time=0;time<=12;time+=.2){const pose=sampleOverlordArtPose({state:'idle',time});
  assert(pose.joints.ankleL.x<pose.joints.ankleR.x);assert(pose.joints.kneeL.x<pose.joints.kneeR.x);
  for(const side of['L','R']){assert.deepEqual(pose.joints['ankle'+side],resting.joints['ankle'+side]);assert(Math.abs(pose.bones['thigh'+side].angle)<.22,'rest must not become a bow-legged crouch');}
 }
});

test('body actions rotate real shoulder/elbow/hip/knee chains, with coincident joint contacts',()=>{
 const idle=sampleOverlordArtPose({state:'idle',time:0});
 for(const state of['walk','attack','special','hit','defeat']){
  const pose=sampleOverlordArtPose({state,time:.31,attackProgress:state==='defeat'?1:.4});
  assert(distance(pose.joints.wristR,idle.joints.wristR)>.015,state+' must articulate an arm');
  assert(Math.abs(pose.bones.forearmR.localAngle-idle.bones.forearmR.localAngle)>.01,state+' must bend the elbow');
  assert(distance(pose.joints.kneeL,idle.joints.kneeL)>.001,state+' must change the leg stance');
  for(const side of['L','R']){
   assert.equal(pose.bones['upperArm'+side].end,pose.bones['forearm'+side].start);
   assert.equal(pose.bones['forearm'+side].end,pose.bones['hand'+side].start);
   assert.equal(pose.bones['thigh'+side].end,pose.bones['shin'+side].start);
   assert.equal(pose.bones['shin'+side].end,pose.bones['foot'+side].start);
  }
 }
});

test('special raises bent arms rather than a wide static T-pose; recovery returns to planted stance',()=>{
 const charge=sampleOverlordArtPose({state:'special',time:0,attackProgress:.23}),recovered=sampleOverlordArtPose({state:'special',time:0,attackProgress:1}),idle=sampleOverlordArtPose({state:'idle',time:0});
 assert(charge.joints.wristL.y<charge.joints.shoulderL.y);assert(charge.joints.wristR.y<charge.joints.shoulderR.y);
 assert(Math.abs(charge.bones.forearmL.localAngle)>1.3);assert(Math.abs(charge.bones.forearmR.localAngle)>1.3);
 assert(charge.joints.handR.x-charge.joints.handL.x<.8);
 close(recovered.joints.wristR.x,idle.joints.wristR.x);close(recovered.joints.wristR.y,idle.joints.wristR.y);
});

test('motion stop is deterministic across all states and clocks without face or body stretch',()=>{
 const rest=sampleOverlordArtPose({motion:false});
 for(const state of['idle','walk','attack','special','hit','defeat']){
  const stopped=sampleOverlordArtPose({state,time:999,stateElapsed:8,attackProgress:.4,motion:false});
  assert.deepEqual(stopped.joints,rest.joints);assert.deepEqual(stopped.layers,rest.layers);
 }
 for(const state of['idle','attack','special','hit'])for(const part of sampleOverlordArtPose({state,time:1,attackProgress:.4}).layers){
  if(part.part==='cape')continue;
  close(part.size[0]/part.size[1],part.source[2]/part.source[3]);
 }
});

test('Canvas draws sixteen separately cropped parts with the same seekable pose',()=>{
 const calls=[],c={save(){},restore(){},translate(x,y){calls.push(['translate',x,y]);},rotate(angle){calls.push(['rotate',angle]);},drawImage(...args){calls.push(['image',...args]);}};
 const pose=sampleOverlordArtPose({state:'attack',attackProgress:.43,time:1});
 assert.equal(drawOverlordArtRig(c,image,{x:180,y:450,height:400,pose}),true);
 const images=calls.filter(call=>call[0]==='image');assert.equal(images.length,16);
 for(const call of images){assert(call[4]<=315&&call[5]<=315,'never substitute one full painting');assert(call.slice(2).every(Number.isFinite));}
 const translations=calls.filter(call=>call[0]==='translate');
 close(translations[0][1],180+pose.layers[0].x*400);close(translations[0][2],450+(pose.layers[0].y-1)*400);
 assert.equal(drawOverlordArtRig(c,null),false);
});

test('native articulated planes share one texture, follow source crop axes, and match Canvas joints',()=>{
 const rig=createOverlordArtRig(THREE,{image,height:3.05});
 try{
  assert.equal(rig.meshes.size,16);assert.equal(new Set([...rig.meshes.values()].map(mesh=>mesh.material)).size,1);
  assert.equal(rig.texture.image,image);assert.equal(rig.material.depthTest,true);assert.equal(rig.material.depthWrite,false);assert.equal(rig.material.toneMapped,false);
  for(const state of['idle','attack','special','hit']){const pose=rig.update({state,time:1,attackProgress:.43});
   for(const layer of pose.layers){const mesh=rig.meshes.get(layer.part);close(mesh.position.x,layer.x);close(mesh.position.y,1-layer.y);close(mesh.rotation.z,-layer.rotation);
    assert(mesh.name.includes(layer.part));assert.equal(mesh.frustumCulled,false);
    const uv=mesh.geometry.attributes.uv,[u,v,w,h]=OVERLORD_ART_PARTS[layer.part].source;
    for(let i=0;i<uv.count;i++){assert(uv.getX(i)>=u-1e-6&&uv.getX(i)<=u+w+1e-6);assert(uv.getY(i)>=1-v-h-1e-6&&uv.getY(i)<=1-v+1e-6);}
   }
  }
 }finally{rig.dispose();}
});

test('native queen faces the camera after parent yaw and scale, instead of vanishing edge-on',()=>{
 const rig=createOverlordArtRig(THREE,{image}),parent=new THREE.Group(),camera=new THREE.PerspectiveCamera();parent.add(rig.group);parent.scale.setScalar(1.4);camera.position.set(1,2,8);camera.lookAt(0,1,0);
 try{for(const yaw of[0,.8,Math.PI/2,Math.PI,-1.7]){parent.rotation.y=yaw;parent.updateMatrixWorld(true);rig.update({camera,state:'special',attackProgress:.3,time:1});parent.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const normal=new THREE.Vector3(0,0,1).applyQuaternion(rig.group.getWorldQuaternion(new THREE.Quaternion()));
  const facing=new THREE.Vector3(0,0,1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
  assert(normal.dot(facing)>.999999);close(rig.group.scale.x,3.05);
 }}finally{rig.dispose();}
});

test('invalid/late atlas cannot hide an installed body and resources dispose once',()=>{
 const rig=createOverlordArtRig(THREE,{image});let textures=0,materials=0,geometries=0;
 rig.texture.addEventListener('dispose',()=>textures++);rig.material.addEventListener('dispose',()=>materials++);
 for(const mesh of rig.meshes.values())mesh.geometry.addEventListener('dispose',()=>geometries++);
 assert.equal(rig.setImage(null),false);assert.equal(rig.group.visible,true);assert.equal(rig.texture.image,image);
 rig.dispose();rig.dispose();assert.equal(textures,1);assert.equal(materials,1);assert.equal(geometries,OVERLORD_ART_PART_NAMES.length);
 assert.equal(rig.setImage({width:256,height:256}),false);
});
