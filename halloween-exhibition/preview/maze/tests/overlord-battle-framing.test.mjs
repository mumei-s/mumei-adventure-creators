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

test('camera sees the face from its front three-quarter side instead of the old eighty-degree profile',async()=>{
 const {overlordBattleLayout}=await import('../overlord-battle-scene.js');
 for(const aspect of[.45,.7,1,1.2,2.4]){
  const layout=overlordBattleLayout(aspect),facing=new THREE.Vector3(layout.hero.x-layout.boss.x,0,layout.hero.z-layout.boss.z).normalize();
  const eyeDirection=layout.cameraDirection.clone();eyeDirection.y=0;eyeDirection.normalize();
  assert.ok(facing.dot(eyeDirection)>.83,`face edge-on at aspect ${aspect}`);
  assert.ok(layout.swordSpread>=.65&&layout.swordSpread<=1);
  assert.ok(layout.heroHeight<=.9,'the foreground companion stays small enough to show its whole body');
 }
});

test('tight projected actor geometry fills the shot without the empty corners of a rotated world box',async()=>{
 const {fitOverlordBattlePoints}=await import('../overlord-battle-scene.js');
 // A tall actor and a diagonal fan: the unoccupied box corners are not scenery.
 const points=[0,0,0,0,2.8,0,-.25,.2,.12,.25,.2,.12,-.3,2.3,.08,.3,2.3,.08,-1.1,1.7,-.7,1.1,1.7,.7];
 const bounds=new THREE.Box3().setFromArray(points),tight=new THREE.PerspectiveCamera(31,1.2,.08,45),wide=new THREE.PerspectiveCamera(31,1.2,.08,45);
 const a=fitOverlordBattlePoints(tight,points,1.2),b=fitOverlordBattleCamera(wide,bounds,1.2);
 assert.ok(a<b,'the invented world-box corners must not shrink the actor');
 const point=new THREE.Vector3();for(let i=0;i<points.length;i+=3){point.fromArray(points,i).project(tight);assert(Math.abs(point.x)<=.880001);assert(Math.abs(point.y)<=.880001);}
 const foot=new THREE.Vector3(0,0,0).project(tight),head=new THREE.Vector3(0,2.8,0).project(tight);
 assert.ok(Math.abs(head.y-foot.y)/2>.68,'the actor stays dominant in the frame');
});


test('actual queen stays dominant while the full companion fits and decorative sword tips cannot pull the camera away',async()=>{
 const {createOverlordBoss}=await import('../overlord-boss.js');
 const {overlordBattleActorGeometry,overlordBattleActorPoints,overlordBattleLayout,fitOverlordBattlePoints}=await import('../overlord-battle-scene.js');
 const actor=createOverlordBoss(THREE),geometry=overlordBattleActorGeometry(actor),point=new THREE.Vector3();
 // Only the solid actor controls the shot. Very large weapon flourishes may crop.
 actor.swords.forEach(sword=>sword.scale.multiplyScalar(10));
 assert.deepEqual(overlordBattleActorGeometry(actor).positions,geometry.positions);
 for(const aspect of[.6,.85,1.2,1.8,2.4]){
  const layout=overlordBattleLayout(aspect),framed=overlordBattleActorPoints(geometry,layout,actor.group.scale),bodyCount=framed.offset;
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),layout.cameraDirection).normalize(),up=new THREE.Vector3().crossVectors(layout.cameraDirection,right).normalize();
  for(const x of[layout.hero.x,layout.hero.x+.18])for(const u of[0,1])for(const v of[0,1]){
   point.set(x,layout.hero.y,layout.hero.z).addScaledVector(right,(u-.5)*layout.heroHeight*.68).addScaledVector(up,v*layout.heroHeight);
   framed.points[framed.offset++]=point.x;framed.points[framed.offset++]=point.y;framed.points[framed.offset++]=point.z;
  }
  const camera=new THREE.PerspectiveCamera(31,aspect,.08,45);fitOverlordBattlePoints(camera,framed.points.subarray(0,framed.offset),aspect,{margin:.92});
  let lower=Infinity,upper=-Infinity;
  for(let i=0;i<framed.offset;i+=3){
   point.fromArray(framed.points,i).project(camera);assert(Math.abs(point.x)<=.920001&&Math.abs(point.y)<=.920001,`body or companion clipped at aspect${aspect}`);
   if(i<bodyCount){lower=Math.min(lower,point.y);upper=Math.max(upper,point.y);}
  }
  assert((upper-lower)/2>.70,`queen shrank below70%of stage at aspect${aspect}`);
 }
 actor.dispose();
});


test('skinned actor framing samples the current bone pose rather than its wide modelling pose',async()=>{
 const {overlordBattleActorGeometry}=await import('../overlord-battle-scene.js');
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,4,0,0,4,.1,0],3));
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0],4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
 const group=new THREE.Group(),bone=new THREE.Bone(),material=new THREE.MeshBasicMaterial(),mesh=new THREE.SkinnedMesh(geometry,material);mesh.add(bone);group.add(mesh);mesh.bind(new THREE.Skeleton([bone]));
 bone.rotation.z=Math.PI/2;group.updateMatrixWorld(true);
 const positions=overlordBattleActorGeometry({group,swords:[]}).positions;assert(Math.abs(positions[3])<1e-6);assert(Math.abs(positions[4]-4)<1e-6);
 geometry.dispose();material.dispose();
});


test('small battle canvases retain real facial pixels without exceeding the drawing-buffer budget',async()=>{
 const {overlordBattlePixelRatio}=await import('../overlord-battle-scene.js');
 assert.equal(overlordBattlePixelRatio(350,300,3),2);assert.equal(overlordBattlePixelRatio(1100,440,3),1.5);
 for(const [w,h]of[[350,300],[600,1100],[1100,740],[2400,1400]])for(const dpr of[1,1.5,2,3]){const ratio=overlordBattlePixelRatio(w,h,dpr);assert(ratio<=dpr);assert(w*h*ratio*ratio<=1200000.0001);}
});
