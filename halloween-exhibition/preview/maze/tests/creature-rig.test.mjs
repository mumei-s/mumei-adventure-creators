import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreatureRig,CREATURE_PART_KEYS,solveCreatureChain,CREATURE_ACTION_DURATION} from '../creature-rig.js';

const near=(actual,expected,epsilon=1e-7)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),worldDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function lengths(pose){for(const [key,chain]of Object.entries(pose.chains)){const first=pose.archetype==='quadruped'?pose.limbLengths.upperLeg:pose.archetype==='wing'?pose.limbLengths.upperWing:pose.limbLengths.upperArm,second=pose.archetype==='quadruped'?pose.limbLengths.lowerLeg:pose.archetype==='wing'?pose.limbLengths.outerWing:pose.limbLengths.forearm;const actual=chain.physical||chain,measure=chain.physical?((a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)):distance;near(measure(actual.root,actual.joint),first);near(measure(actual.joint,actual.end),second);assert.ok(key);}}
function visibleParts(pose){for(const layer of pose.layers){assert.ok(Number.isFinite(layer.origin.x)&&Number.isFinite(layer.origin.y)&&Number.isFinite(layer.rotation));assert.ok(layer.height>0);assert.equal(layer.scaleX,1);assert.equal(layer.scaleY,1);assert.equal(layer.alpha,undefined);assert.equal(layer.flip,undefined);}}
function fixture(archetype,extra={}){return createCreatureRig({archetype,...extra});}

test('two-segment reach clamps without resizing independently authored limb pieces',()=>{
 for(const target of[{x:0,y:0},{x:2,y:3},{x:200,y:300}]){const chain=solveCreatureChain({x:0,y:0},target,34,37);near(distance(chain.root,chain.joint),34);near(distance(chain.joint,chain.end),37);}
 assert.throws(()=>solveCreatureChain({x:NaN,y:0},{x:0,y:0},34,37),/Finite/);
});

test('quadruped diagonal trot locks stance feet to world contacts and retains two supporting paws',()=>{
 const rig=fixture('quadruped');let previous=rig.reset(),stanceChecks=0,diagonalSwings=0;
 for(let n=1;n<=720;n++){
  const pose=rig.update({position:{x:n*.007,z:n*.009},dt:1/60,heading:Math.atan2(.007,.009),moving:true});lengths(pose);visibleParts(pose);assert.ok(pose.diagnostics.supportedFeet>=2);
  for(const [key,foot]of Object.entries(pose.feet)){
   assert.ok(foot.lift>=0);if(foot.contact&&previous.feet[key].contact){near(worldDistance(foot.world,previous.feet[key].world),0);stanceChecks++;}
   const end=pose.joints['paw_'+key];near(end.x,(foot.world.x-pose.root.x)*64);near(end.y,(foot.world.z-pose.root.z)*64*.78-foot.lift*64);
  }
  if(!pose.feet.fore_near.contact&&!pose.feet.hind_far.contact)diagonalSwings++;if(!pose.feet.fore_far.contact&&!pose.feet.hind_near.contact)diagonalSwings++;
  previous=pose;
 }
 assert.ok(stanceChecks>200);assert.ok(diagonalSwings>40);rig.destroy();
});

test('quadruped foot trajectories depend on traveled distance across 30/60/120Hz',()=>{
 const results=[30,60,120].map(fps=>{const rig=fixture('quadruped');rig.reset({x:0,z:0},Math.atan2(.4,1));let pose;for(let n=1;n<=fps*4;n++)pose=rig.update({position:{x:n/fps*.4,z:n/fps},dt:1/fps,heading:Math.atan2(.4,1),moving:true});rig.destroy();return pose;});
 for(const pose of results.slice(1)){near(pose.distance,results[0].distance);near(pose.gaitPhase,results[0].gaitPhase);for(const key of Object.keys(pose.feet)){near(worldDistance(pose.feet[key].world,results[0].feet[key].world),0);near(pose.feet[key].lift,results[0].feet[key].lift);assert.equal(pose.feet[key].contact,results[0].feet[key].contact);}}
});

test('quadruped settles lifted paws once and keeps stopped contacts planted',()=>{
 const rig=fixture('quadruped');rig.reset();let pose;for(let n=1;n<=42;n++)pose=rig.update({position:{x:0,z:n*.013},dt:1/60,moving:true});const distanceAtStop=pose.distance;
 for(let n=0;n<60;n++)pose=rig.update({position:{...pose.root},dt:1/60,moving:false});assert.equal(pose.diagnostics.supportedFeet,4);const stopped=pose;
 for(let n=0;n<120;n++){pose=rig.update({position:{...pose.root},dt:1/60,moving:false});near(pose.distance,distanceAtStop);for(const key of Object.keys(pose.feet))near(worldDistance(pose.feet[key].world,stopped.feet[key].world),0);}rig.destroy();
});

test('complete walking cycles retain local paw endpoints after the transient first step',()=>{
 const rig=fixture('quadruped');rig.reset();let first,last;
 for(let n=1;n<=480;n++){const pose=rig.update({position:{x:0,z:n*.01},dt:1/60,heading:0,moving:true});if(n===400)first=pose;if(n===480)last=pose;}
 near(first.gaitPhase,last.gaitPhase);for(const key of Object.keys(first.feet)){near(first.feet[key].world.x-first.root.x,last.feet[key].world.x-last.root.x);near(first.feet[key].world.z-first.root.z,last.feet[key].world.z-last.root.z);near(first.feet[key].lift,last.feet[key].lift);}rig.destroy();
});

test('bat wings articulate two distinct fixed-length segments while body and head stay anchored',()=>{
 const rig=fixture('wing'),first=rig.reset();let movedElbow=0,movedTip=0;
 for(let n=1;n<=240;n++){const pose=rig.update({dt:1/120});lengths(pose);visibleParts(pose);assert.deepEqual(pose.joints.chest,first.joints.chest);assert.deepEqual(pose.joints.head,first.joints.head);if(distance(pose.joints.wing_left_elbow,first.joints.wing_left_elbow)>1)movedElbow++;if(distance(pose.joints.wing_left_tip,first.joints.wing_left_tip)>1)movedTip++;}
 assert.ok(movedElbow>100&&movedTip>100);const reset=rig.reset();let loop;for(let n=1;n<=96;n++)loop=rig.update({dt:1/120});for(const key of['wing_left_root','wing_left_elbow','wing_left_tip','wing_right_elbow','wing_right_tip'])near(distance(reset.joints[key],loop.joints[key]),0);rig.destroy();
});

test('ghost animates cloth joints and arms independently without whole-body bob or scale',()=>{
 const rig=fixture('float'),first=rig.reset();let hemChanged=0,armChanged=0;
 for(let n=1;n<=288;n++){const pose=rig.update({dt:1/120});lengths(pose);visibleParts(pose);assert.deepEqual(pose.joints.torso,first.joints.torso);assert.deepEqual(pose.joints.neck,first.joints.neck);assert.deepEqual(pose.joints.head,first.joints.head);if(distance(pose.joints.trail_tip,first.joints.trail_tip)>1)hemChanged++;if(distance(pose.joints.wrist_near,first.joints.wrist_near)>1)armChanged++;if(n===288)near(distance(pose.joints.trail_tip,first.joints.trail_tip),0);}
 assert.ok(hemChanged>100&&armChanged>100);rig.destroy();
});

test('held accessories attach to the declared wrist, head or tail during idle, walk and action',()=>{
 for(const [kind,parent]of[['quadruped','head'],['wing','tail_base'],['float','wrist_near']]){
  const rig=fixture(kind,{manifest:{attachments:[{part:'held_prop',parent,height:37,offset:[0,0]}]}});rig.reset();assert.equal(rig.requestAttack(),true);assert.equal(rig.requestAttack(),false);
  for(let n=1;n<=160;n++){const pose=rig.update({position:{x:0,z:kind==='quadruped'?n*.004:0},dt:1/120,moving:kind==='quadruped'}),part=pose.layers.find(layer=>layer.part==='held_prop');near(distance(part.origin,pose.joints[parent]),0);near(distance(pose.attachments.held_prop.grip,pose.joints[parent]),0);lengths(pose);}
  assert.equal(rig.snapshot().action.kind,'locomotion');const sought=rig.seekAction(CREATURE_ACTION_DURATION*.5,{motion:false});assert.equal(sought.action.kind,'attack');rig.destroy();
 }
});

test('pause freezes snapshot/version/root and reduced motion freezes wing and cloth cycles',()=>{
 for(const kind of['quadruped','wing','float']){
  const rig=fixture(kind);rig.reset();const before=rig.update({dt:1/60});for(let n=0;n<20;n++)assert.equal(rig.update({position:{x:50,z:50},dt:.1,heading:Math.PI,paused:true}),before);
  assert.deepEqual(rig.snapshot().root,{x:0,z:0});const resumed=rig.update({dt:1/60});assert.ok(resumed.version>before.version);near(resumed.time,before.time+1/60);
  const reduced=rig.update({motion:false,dt:1/60}),again=rig.update({motion:false,dt:1/60});near(reduced.time,again.time);assert.deepEqual(reduced.layers,again.layers);rig.destroy();
 }
});

test('supplied directional views are selected without mirrored scales or fabricated completed artwork',()=>{
 for(const archetype of['cat-quadruped','flying-bat','ghost-floating']){
  const rig=fixture(archetype,{manifest:{views:{down:{heading:0,parts:{}},up:{heading:Math.PI,parts:{}}}}});let pose;
  for(let n=0;n<=240;n++){pose=rig.update({heading:n/240*Math.PI*2,dt:1/60});visibleParts(pose);assert.equal(pose.artwork.artworkComplete,false);assert.ok(pose.artwork.missingParts.length);assert.ok(['down','up'].includes(pose.view));}
  assert.deepEqual([...new Set(pose.layers.map(layer=>layer.part))].sort(),[...CREATURE_PART_KEYS[pose.archetype]].sort());rig.destroy();assert.equal(rig.snapshot(),null);assert.equal(rig.requestAttack(),false);assert.throws(()=>rig.update({}),/disposed/);assert.throws(()=>rig.reset(),/disposed/);
 }
});

test('teleporting reseeds all four contacts rather than stretching them across the map',()=>{
 const rig=fixture('quadruped');rig.reset();const pose=rig.update({position:{x:30,z:40},dt:1/60});assert.equal(pose.diagnostics.supportedFeet,4);for(const foot of Object.values(pose.feet))assert.ok(worldDistance(foot.world,pose.root)<.5);lengths(pose);rig.destroy();
});
