import test from 'node:test';
import assert from 'node:assert/strict';
import {createMascotRig} from '../mascot-rig.js';
const directions={down:0,right:Math.PI/2,up:Math.PI,left:-Math.PI/2};
const manifest=archetype=>({archetype,contentHeight:128,views:Object.fromEntries(Object.entries(directions).map(([key,heading])=>[key,{heading,parts:{}}])),rig:{bodyHeight:100,bodyCenter:[0,-58],legLength:80,footSpacing:12,appendageRoot:[29,-40],appendageBase:21,appendageTip:17}});
test('bread retains exactly one independent two-bone appendage and fixed body',()=>{
 const rig=createMascotRig({manifest:manifest('bread')});let start;
 for(let i=0;i<240;i++){
  const p=rig.update({position:{x:i/30,z:0},heading:Math.PI/2,dt:1/60,moving:true});
  assert.deepEqual(p.anatomy,{feet:0,appendages:1});assert.deepEqual(p.feet,{});
  assert.deepEqual(p.layers.map(l=>l.part),['appendageBase','appendageTip','body']);
  if(!start)start=p.body;assert.deepEqual(p.body,start);
  for(const [a,b,length] of [['appendageRoot','appendageJoint',21],['appendageJoint','appendageTip',17]])assert.ok(Math.abs(Math.hypot(p.joints[a].x-p.joints[b].x,p.joints[a].y-p.joints[b].y)-length)<1e-10);
 }
});
test('flower uses true alternating planted tiny feet without body bob or invented limbs',()=>{
 const rig=createMascotRig({manifest:manifest('flower')});let previous,start;const swing=new Set();
 for(let i=0;i<420;i++){
  const moving=i<180||i>=240,position={x:(Math.min(i,180)+Math.max(0,i-240))*2/60,z:0};
  const p=rig.update({position,heading:Math.PI/2,dt:1/60,moving,worldPixelsPerUnit:64,displayHeightPx:76,groundDepthScale:.78});
  assert.deepEqual(p.anatomy,{feet:2,appendages:0});assert.ok(p.feet.left.contact||p.feet.right.contact);
  assert.deepEqual(p.layers.map(l=>l.part),['rightFoot','leftFoot','body','petalRing','face','book','die']);
  if(!start)start=p.body;assert.deepEqual(p.body,start);
  for(const side of ['left','right']){
   const a=previous?.feet[side],b=p.feet[side];if(!b.contact)swing.add(side);
   if(a?.contact&&b.contact&&a.mode==='stance'&&b.mode==='stance')assert.deepEqual(a.world,b.world);
   assert.ok(p.diagnostics[side+'FootReach']<1e-8);
  }
  previous=p;
 }
 assert.equal(swing.size,2);
});
test('mascots select authored views, retain book/die identity and pause/dispose safely',()=>{
 for(const archetype of ['bread','flower']){
  const rig=createMascotRig({manifest:manifest(archetype)});
  for(const [key,heading] of Object.entries(directions))assert.equal(rig.reset({x:0,z:0},heading).view,key);
  const pose=rig.snapshot();assert.equal(rig.update({paused:true}),pose);
  const action=rig.seekAction(1.2,{heading:0});assert.equal(action.action.kind,'attack');
  if(archetype==='flower'){assert.ok(action.joints.book.x<action.joints.die.x);assert.equal(action.layers.filter(l=>l.part==='book').length,1);}
  rig.destroy();assert.equal(rig.snapshot(),null);assert.throws(()=>rig.update({}));
 }
});
