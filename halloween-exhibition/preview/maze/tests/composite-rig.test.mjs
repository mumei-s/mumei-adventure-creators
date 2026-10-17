import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompositeRig} from '../composite-rig.js';
import {createOwnerRig,OWNER_PART_KEYS} from '../owner-rig.js';
import {createCreatureRig,CREATURE_PART_KEYS} from '../creature-rig.js';

const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<=epsilon,`${a} != ${b}`),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const headings={down:0,right:Math.PI/2,up:Math.PI,left:-Math.PI/2};
function fixture(children,extra={}){
 const parts=Object.fromEntries(OWNER_PART_KEYS.map(key=>[key,{rect:[0,0,16,16],pivot:[8,1],contentHeight:16}]));
 for(const child of children){const kind=child.archetype==='quadruped'?'quadruped':child.archetype==='wing'?'wing':child.archetype==='float'?'float':null;for(const key of kind?CREATURE_PART_KEYS[kind]:OWNER_PART_KEYS)parts[child.key+':'+key]={rect:[16,0,16,16],pivot:[8,1],contentHeight:16};}
 return {contentHeight:256,atlas:'main',views:Object.fromEntries(Object.entries(headings).map(([key,heading])=>[key,{heading,parts}])),children,...extra};
}
const cat=(extra={})=>({key:'marimo-cat',archetype:'quadruped',offsetWorld:[.55,.1],...extra});
const updateProjection={worldPixelsPerUnit:64,displayHeightPx:256,groundDepthScale:.78};
function allSupported(pose){assert.ok(Object.values(pose.feet).some(foot=>foot.contact));for(const child of Object.values(pose.children)){if(Object.keys(child.feet).length)assert.ok(Object.values(child.feet).filter(foot=>foot.contact).length>=(child.archetype==='quadruped'?2:1));}}

test('child formation rotates in world space and projected layer origins respect camera orientation',()=>{
 const rig=createCompositeRig({manifest:fixture([cat({offsetWorld:[.7,.35],offsetRig:[2,-3]})])});
 for(const heading of Object.values(headings)){
  const pose=rig.reset({x:4,z:8},heading),child=pose.children['marimo-cat'],x=Math.cos(heading)*.7+Math.sin(heading)*.35,z=-Math.sin(heading)*.7+Math.cos(heading)*.35;
  near(child.root.x,4+x);near(child.root.z,8+z);near(child.origin.x,x*64+2);near(child.origin.y,z*64*.78-3);assert.equal(child.contactSpace,'world');assert.equal(pose.diagnostics.entityCount,2);
  const layer=pose.layers.find(layer=>layer.part==='marimo-cat:head'),original=child.layers.find(layer=>layer.part==='head');near(layer.origin.x,original.origin.x+child.origin.x);near(layer.origin.y,original.origin.y+child.origin.y);
 }
 const rotated=rig.update({position:{x:4,z:8},heading:0,dt:0,moving:false,...updateProjection,groundYaw:Math.PI/2}),child=rotated.children['marimo-cat'];
 near(child.origin.x,-(child.root.z-rotated.root.z)*64+2);near(child.origin.y,(child.root.x-rotated.root.x)*64*.78-3);rig.destroy();
});

test('entity depth groups preserve their authored limb order and reverse around the parent',()=>{
 const rig=createCompositeRig({manifest:fixture([{key:'behind',archetype:'biped',offsetWorld:[0,-.4]},{key:'ahead',archetype:'biped',offsetWorld:[0,.4]}])});
 for(const [heading,order]of[[0,['behind','main','ahead']],[Math.PI,['ahead','main','behind']]]){
  const pose=rig.reset({x:0,z:0},heading);assert.deepEqual(pose.layerOrder,order);
  for(const child of Object.values(pose.children)){const combined=pose.layers.filter(layer=>layer.part.startsWith(child.key+':'));assert.deepEqual(combined.map(layer=>layer.part),child.layers.map(layer=>child.key+':'+layer.part));for(let i=0;i<combined.length;i++){assert.equal(combined[i].scaleX,1);assert.equal(combined[i].scaleY,1);assert.equal(combined[i].flip,undefined);if(combined[i].boneEnd){near(combined[i].boneEnd.x,child.layers[i].boneEnd.x+child.origin.x);near(combined[i].boneEnd.y,child.layers[i].boneEnd.y+child.origin.y);}}}
 }
 rig.destroy();
});

test('ground child contacts are independent world plants across walking, stopping and standing turns',()=>{
 const rig=createCompositeRig({manifest:fixture([cat()])});let pose=rig.update({position:{x:0,z:0},heading:0,dt:0,...updateProjection}),checked=0;
 for(let i=1;i<=420;i++){
  const previous=pose,position=i<=180?{x:0,z:i*.008}:previous.root,heading=i<=240?0:Math.PI/2;
  pose=rig.update({position,heading,dt:1/60,moving:i<=180,...updateProjection});allSupported(pose);const child=pose.children['marimo-cat'];
  for(const[key,foot]of Object.entries(child.feet)){const before=previous.children['marimo-cat'].feet[key];if(before.contact&&foot.contact&&before.mode==='stance'&&foot.mode==='stance'){near(distance(before.world,foot.world),0);checked++;}}
  near(child.heading,pose.heading);assert.ok(child.layers.length>15);
 }
 assert.ok(checked>500);assert.ok(pose.children['marimo-cat'].distance>1.5);assert.equal(pose.diagnostics.entityCount,2);rig.destroy();
});

test('Marimo carried cat keeps a local support plane and animates ears/tail without walking the parent distance',()=>{
 const rig=createCompositeRig({manifest:fixture([cat({mode:'carried',anchor:'neck',offsetWorld:[0,0],offsetRig:[0,-145]})])});let pose=rig.update({position:{x:0,z:0},heading:0,dt:0,...updateProjection}),first=pose.children['marimo-cat'],tailChanges=0;
 for(let i=1;i<=240;i++){
  pose=rig.update({position:{x:0,z:i*.01},heading:0,dt:1/60,moving:true,...updateProjection});const child=pose.children['marimo-cat'];assert.deepEqual(child.root,{x:0,z:0});near(child.distance,0);assert.equal(child.moving,false);assert.equal(child.contactSpace,'parent');assert.deepEqual(child.worldRoot,pose.root);near(child.origin.x,pose.joints.neck.x);near(child.origin.y,pose.joints.neck.y-145);
  for(const[key,foot]of Object.entries(child.feet)){assert.equal(foot.contact,true);near(distance(foot.world,first.feet[key].world),0);}assert.deepEqual(child.joints.head,first.joints.head);if(Math.hypot(child.joints.tail_tip.x-first.joints.tail_tip.x,child.joints.tail_tip.y-first.joints.tail_tip.y)>1)tailChanges++;
 }
 assert.ok(pose.distance>2);assert.ok(tailChanges>100);rig.destroy();
});

test('three upright hedgehogs use three separate leg solvers and retain the specified entity count',()=>{
 const rig=createCompositeRig({manifest:fixture([{key:'tantan-avatar-hedgehog-green-cap',archetype:'biped',offsetWorld:[-.45,.15]},{key:'tantan-avatar-hedgehog-pacifier',archetype:'upright',offsetWorld:[.45,.15]}])});let pose=rig.update({position:{x:0,z:0},heading:0,...updateProjection});
 for(let i=1;i<=240;i++){pose=rig.update({position:{x:i*.004,z:i*.008},heading:Math.atan2(.004,.008),dt:1/60,moving:true,...updateProjection});allSupported(pose);for(const child of Object.values(pose.children)){assert.notEqual(child.feet,pose.feet);assert.ok(child.layers.some(layer=>layer.part==='leftUpperLeg'));near(child.limbLengths.thigh,44);}}
 assert.equal(pose.diagnostics.entityCount,3);assert.equal(Object.keys(pose.children).length,2);assert.ok(pose.layers.some(layer=>layer.part==='tantan-avatar-hedgehog-pacifier:rightLowerLegBoot'));rig.destroy();
});

test('flying and floating children keep their own joint loops without a whole-body scale or bob',()=>{
 for(const[kind,period,joint]of[['wing',.8,'wing_left_tip'],['float',2.4,'trail_tip']]){
  const rig=createCompositeRig({manifest:fixture([{key:'mama-avatar-creature',archetype:kind,offsetWorld:[.4,-.1]}])}),first=rig.reset(),child=first.children['mama-avatar-creature'];let changed=0,pose;
  for(let i=1;i<=Math.round(period*120);i++){pose=rig.update({position:{x:0,z:0},heading:0,dt:1/120,moving:false});const next=pose.children['mama-avatar-creature'];near(next.origin.x,child.origin.x);near(next.origin.y,child.origin.y);assert.deepEqual(next.joints.head,child.joints.head);if(Math.hypot(next.joints[joint].x-child.joints[joint].x,next.joints[joint].y-child.joints[joint].y)>1)changed++;for(const layer of next.layers){assert.equal(layer.scaleX,1);assert.equal(layer.scaleY,1);}}
  const last=pose.children['mama-avatar-creature'];near(last.joints[joint].x,child.joints[joint].x);near(last.joints[joint].y,child.joints[joint].y);assert.ok(changed>30);rig.destroy();
 }
});

test('one attack request reaches each solver once and seekAction is deterministic for unordered ages',()=>{
 const manifest=fixture([cat({mode:'carried',offsetRig:[0,-145]})]),rig=createCompositeRig({manifest});rig.reset();assert.equal(rig.requestAttack(),true);assert.equal(rig.requestAttack(),false);const playing=rig.update({dt:.1});assert.equal(playing.action.kind,'attack');assert.equal(playing.children['marimo-cat'].action.kind,'attack');
 for(const age of[1,.1,.7,.3,2.1]){const actual=rig.seekAction(age,{position:{x:3,z:5},heading:Math.PI/2,motion:true}),fresh=createCompositeRig({manifest}),expected=fresh.seekAction(age,{position:{x:3,z:5},heading:Math.PI/2,motion:true});assert.deepEqual(actual.layers,expected.layers);assert.deepEqual(actual.children['marimo-cat'].feet,expected.children['marimo-cat'].feet);assert.deepEqual(actual.action,expected.action);fresh.destroy();}
 rig.destroy();
});

test('pause preserves the exact composite snapshot while live children advance the public version',()=>{
 const rig=createCompositeRig({manifest:fixture([{key:'bat',archetype:'wing',offsetWorld:[0,0]}])});const first=rig.update({position:{x:2,z:3},heading:0,dt:1/60,...updateProjection});
 for(let i=0;i<20;i++)assert.equal(rig.update({position:{x:99,z:99},heading:Math.PI,dt:.1,paused:true,attack:true}),first);
 const next=rig.update({position:{x:2,z:3},dt:1/60});assert.ok(next.version>first.version);assert.ok(next.entityVersions.bat>first.entityVersions.bat);assert.notDeepEqual(next.children.bat.layers,first.children.bat.layers);assert.equal(rig.snapshot(),next);
 const reduced=rig.update({position:{x:2,z:3},dt:1/60,motion:false}),again=rig.update({position:{x:2,z:3},dt:1/60,motion:false});assert.deepEqual(reduced.children.bat.layers,again.children.bat.layers);rig.destroy();
});

test('child view and rig calibration stay separate from main-view skeleton overrides',()=>{
 const manifest=fixture([{key:'small',archetype:'biped',rig:{thigh:24,shin:26},views:{right:{rig:{shoulderHalfWidth:3,hipHalfWidth:3}}}}]);manifest.views.right.rig={thigh:55,shin:58};const rig=createCompositeRig({manifest});const pose=rig.reset({x:0,z:0},Math.PI/2);assert.equal(pose.limbLengths.thigh,55);assert.equal(pose.children.small.limbLengths.thigh,24);assert.equal(pose.children.small.limbLengths.shin,26);assert.equal(pose.children.small.view,'right');assert.equal(pose.artwork.children.small.usingFallbackView,false);rig.destroy();
});

test('76px and86px child bipeds solve their own proportions in the parent projection contract',()=>{
 for(const height of[76,86]){
  const rig=createCompositeRig({manifest:fixture([{key:'small',archetype:'biped',offsetWorld:[.2,.1],rig:{thigh:24,shin:26,hipHeight:45,hipHalfWidth:5}}])});let pose;
  for(let i=0;i<=180;i++){pose=rig.update({position:{x:0,z:i*.009},heading:0,dt:i?1/60:0,moving:i>0,worldPixelsPerUnit:64,displayHeightPx:height,groundDepthScale:.78});const child=pose.children.small,u=64*256/height;near(child.projection.unitsToPixels,u);near(child.origin.x,.2*u);near(child.origin.y,.1*u*.78);for(const[key,foot]of Object.entries(child.feet)){const end=child.joints[key+'Ankle'];near(end.x,(foot.world.x-child.root.x)*u,1e-6);near(end.y,(foot.world.z-child.root.z)*u*.78-foot.lift*u,1e-6);}}
  assert.ok(pose.children.small.projection.strideLength<pose.projection.strideLength);rig.destroy();
 }
});

test('76px and86px quadruped children plant paws in the same camera-ground projection as the parent',()=>{
 for(const height of[76,86])for(const yaw of[0,Math.PI/3]){
  const rig=createCompositeRig({manifest:fixture([cat({offsetWorld:[.25,.15],rig:{upperLeg:22,lowerLeg:24,hipHeight:31}})])});let pose=rig.update({position:{x:0,z:0},heading:0,dt:0,worldPixelsPerUnit:64,displayHeightPx:height,groundDepthScale:.78,groundYaw:yaw});
  for(let i=1;i<=240;i++){
   pose=rig.update({position:{x:0,z:i*.008},heading:0,dt:1/60,moving:true,worldPixelsPerUnit:64,displayHeightPx:height,groundDepthScale:.78,groundYaw:yaw});const child=pose.children['marimo-cat'],u=64*256/height;near(child.projection.unitsToPixels,u);near(child.projection.groundYaw,yaw);allSupported(pose);
   for(const[key,foot]of Object.entries(child.feet)){const dx=foot.world.x-child.root.x,dz=foot.world.z-child.root.z,end=child.joints['paw_'+key];near(end.x,(dx*Math.cos(yaw)-dz*Math.sin(yaw))*u,1e-6);near(end.y,(dx*Math.sin(yaw)+dz*Math.cos(yaw))*u*.78-foot.lift*u,1e-6);}
  }
  rig.destroy();
 }
});

test('missing child directions remain explicit instead of inheriting invented main artwork',()=>{
 const manifest=fixture([cat()]);for(const direction of['right','up','left'])manifest.views[direction].parts=Object.fromEntries(Object.entries(manifest.views[direction].parts).filter(([key])=>!key.startsWith('marimo-cat:')));
 const rig=createCompositeRig({manifest}),pose=rig.reset({x:0,z:0},Math.PI);assert.equal(pose.view,'up');assert.equal(pose.children['marimo-cat'].view,'down');assert.equal(pose.artwork.usingFallbackView,true);assert.deepEqual(pose.artwork.unsupportedChildren,['marimo-cat']);assert.equal(pose.artwork.continuousTurnComplete,false);rig.destroy();
});

test('construction failures and destroy release every created solver without retained snapshots',()=>{
 let owners=0,creatures=0;const ownerFactory=options=>{const rig=createOwnerRig(options),destroy=rig.destroy;rig.destroy=()=>{owners++;destroy();};return rig;},creatureFactory=options=>{const rig=createCreatureRig(options),destroy=rig.destroy;rig.destroy=()=>{creatures++;destroy();};return rig;};
 const rig=createCompositeRig({manifest:fixture([cat(),{key:'friend',archetype:'biped'}]),ownerFactory,creatureFactory});rig.reset();rig.destroy();rig.destroy();assert.equal(owners,2);assert.equal(creatures,1);assert.equal(rig.snapshot(),null);assert.equal(rig.requestAttack(),false);assert.throws(()=>rig.update(),/disposed/);assert.throws(()=>rig.reset(),/disposed/);assert.throws(()=>rig.seekAction(0),/disposed/);
 assert.throws(()=>createCompositeRig({manifest:fixture([cat(),{key:'broken',archetype:'biped',rig:{thigh:-1}}]),ownerFactory,creatureFactory}),/Invalid/);assert.equal(owners,3);assert.equal(creatures,2);
});

test('invalid child identities, offsets, modes and archetypes fail before rendering',()=>{
 for(const children of[[{key:'unsafe:head'}],[{key:'same'},{key:'same'}],[{key:'main'}],[cat({offsetWorld:[NaN,0]})],[cat({offsetRig:[0]})],[cat({mode:'stretch'})],[cat({archetype:'blob'})]])assert.throws(()=>createCompositeRig({manifest:fixture(children)}),TypeError);
 assert.throws(()=>createCompositeRig({manifest:{children:{}}}),TypeError);assert.throws(()=>createCompositeRig({manifest:fixture(Array.from({length:8},(_,i)=>({key:'child'+i})))}),/at most/);
 const rig=createCompositeRig({manifest:fixture([cat({mode:'carried',anchor:'missing-joint'})])});assert.throws(()=>rig.reset(),/Unknown carried anchor/);rig.destroy();
});
