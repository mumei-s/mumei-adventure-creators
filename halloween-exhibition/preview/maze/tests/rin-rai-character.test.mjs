import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {compileCharacterRoster,placeCreatorNPCs,creatorPose,layoutProblem} from '../creator-runtime.js';
import {createOwnerRig} from '../owner-rig.js';
import {placeTownVisitors,sampleTownVisitors} from '../../town/visitor-model.js';
import {isTownWalkable} from '../../town/story-data.js';
import {raiFallbackPoses,RAI_FALLBACK} from '../../scripts/build-rin-rai-atlas.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const archive=read('../../data/archive.json'),manifest=read('../data/creator-characters.json');
const rig=read('../assets/rigs/rin-rai-lion/rig.json');
const id='rin-rai-lion',creatorId='airoumu_rin';
const character=manifest.characters.find(item=>item.id===id);
const roster=()=>compileCharacterRoster(archive,manifest,2026);

test('Rai is the submitted boy lion identity with the real article and reviewed current avatar',()=>{
 assert.equal(character.creatorId,creatorId);assert.equal(character.label,'ライちゃん');
 assert.deepEqual(character.entityIds,[id]);assert.equal(character.articleURL,'https://note.com/airoumu_rin/n/n7179d2f821e8');
 assert.equal(character.source.articleURL,character.articleURL);assert.equal(character.source.kind,'article-art');
 const review=manifest.referenceReviews[creatorId];assert.equal(review.decision,'profile-avatar-match');
 assert.equal(review.avatarReference.imageURL,archive.creators.find(c=>c.id===creatorId).avatar);
 assert.equal(review.avatarVisuallyInspected,true);assert.equal(review.reviewed,true);
 assert.match(rig.provenance.identity,/boy lion cub/);assert.match(rig.provenance.identity,/female Inori variation is not used/);
 assert.equal(roster().npcs.filter(c=>c.creatorId===creatorId).length,1);
 const hidden=structuredClone(archive);hidden.years.find(y=>y.year===2026).entries.find(e=>e.creatorId===creatorId).visible=false;
 assert.equal(compileCharacterRoster(hidden,manifest,2026).npcs.some(c=>c.id===id),false);
});

test('Rai has a measured transparent 16-frame fallback and separately articulated painterly rig',()=>{
 assert.equal(layoutProblem(character.asset),null);assert.deepEqual(character.asset.layout.directions,['down','left','right','up']);
 assert.equal(character.asset.layout.frames.flat().length,16);
 const bytes=fs.readFileSync(new URL('../'+character.asset.src,import.meta.url));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),character.asset.sha256);
 assert.equal(rig.provenance.method,'built-in-imagegen');assert.equal(rig.provenance.selectedPartCount,52);
 assert.equal(rig.animationReviewed,true);assert.equal(rig.review.passed,true);
 assert.equal(rig.continuousTurnComplete,false);assert.equal(rig.attackArtComplete,false);
 const registry=read('../data/character-rigs.json');assert.equal(registry.rigs.find(r=>r.id===id).approved,true);
 const rects=[];
 for(const direction of ['down','right','up','left']){
  const view=rig.views[direction];assert(view);
  for(const part of ['head','bodiceTorso','pelvisFrontSkirt','leftUpperArm','leftForearmHand','rightUpperArm','rightForearmHand','leftUpperLeg','leftLowerLegBoot','rightUpperLeg','rightLowerLegBoot','backHair','lionTail']){
   const data=view.parts[part];assert(data,direction+' '+part);assert(data.sourceComponent);rects.push(data.rect.join(','));
   assert(data.rect[0]>=0&&data.rect[1]>=0&&data.rect[0]+data.rect[2]<=1024&&data.rect[1]+data.rect[3]<=1024);
  }
  assert(view.appendages.some(a=>a.part==='lionTail'&&a.amplitude>0));
 }
 assert.equal(new Set(rects).size,52,'directional limbs must use actual distinct source cells');
 assert.equal(rig.review.liveCanvasClippingFrames,0);assert.equal(rig.review.unsupportedFrames,0);
});

test('Rai walks safely in both town and maze and pauses at an actual stable pose',()=>{
 const r=roster(),maze=placeCreatorNPCs(r.npcs,manifest.slotAssignments),town=placeTownVisitors(r);
 assert.deepEqual(maze.omitted,[]);assert.deepEqual(town.omitted,[]);
 const m=maze.placed.find(c=>c.id===id),t=town.visitors.find(c=>c.id===id);assert(m&&t);
 assert.equal(m.slotId,'east-south');assert(t.route.distance>0);
 let moving=false;for(let time=0;time<40;time+=.2){
  const pose=sampleTownVisitors([t],{state:{mapId:t.mapId},time,motion:true})[0];
  assert(isTownWalkable(t.mapId,pose.x,pose.z,.23));if(pose.walking)moving=true;
 }
 assert(moving);assert.deepEqual(creatorPose(m,90,false,{}),creatorPose(m,0,false,{}));
});

test('Rai limb animation has independent knees and elbows and never loses both supporting feet',()=>{
 for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const instance=createOwnerRig({manifest:rig,...rig.motion});let previous,changedKnee=false,changedElbow=false;
  for(let frame=0;frame<180;frame++){
   const distance=Math.max(0,Math.min(frame-10,130))*.8/60;
   const pose=instance.update({position:{x:Math.sin(heading)*distance,z:Math.cos(heading)*distance},heading,dt:1/60,moving:frame>10&&frame<140,worldPixelsPerUnit:48,displayHeightPx:78,groundDepthScale:.78});
   assert(pose.feet.left.contact||pose.feet.right.contact);assert(pose.diagnostics.leftFootReach<1e-7&&pose.diagnostics.rightFootReach<1e-7);
   assert.equal(pose.artwork.usingFallbackView,false);
   if(previous){
    changedKnee ||= Math.hypot(pose.joints.leftKnee.x-previous.joints.leftKnee.x,pose.joints.leftKnee.y-previous.joints.leftKnee.y)>.1;
    changedElbow ||= Math.hypot(pose.joints.leftElbow.x-previous.joints.leftElbow.x,pose.joints.leftElbow.y-previous.joints.leftElbow.y)>.01;
    for(const side of['left','right'])if(pose.feet[side].contact&&previous.feet[side].contact)assert.deepEqual(pose.feet[side].world,previous.feet[side].world);
   }
   previous=pose;
  }
  assert(changedKnee);assert(changedElbow);instance.destroy();
 }
});

test('Rai mane overlaps the collar by lowering only the head attachment seven rig pixels',()=>{
 assert.equal(rig.review.headAttachmentCorrection.offsetRigPixels,7);
 for(const [direction,view]of Object.entries(rig.views)){
  const head=view.parts.head;
  assert(Math.abs((head.contentHeight-head.pivot[1])*rig.rig.headHeight/head.contentHeight-7)<1e-9,direction+' head attachment');
  assert.equal(head.pivot[0],head.rect[2]/2,direction+' horizontal alignment');
 }
 assert.equal(rig.contentHeight,265);assert.equal(rig.rig.headHeight,153);
 assert.deepEqual(rig.output,{width:320,height:384,anchorX:.5,anchorY:.84,scale:1});
 const geometry=({width,height,contentHeight,output,rig,footSoleOffset,motion,restHands,views})=>({width,height,contentHeight,output,rig,footSoleOffset,motion,restHands,views:Object.fromEntries(Object.entries(views).map(([key,view])=>[key,{...view,parts:Object.fromEntries(Object.entries(view.parts).map(([name,part])=>[name,name==='head'?{...part,pivot:[part.pivot[0],0]}:part]))}]))});
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(geometry(rig))).digest('hex'),'ae523045a7f366cc39adf6fe7541d2b1723b8ab1ae4aa2aae92cecaf7a3f3cc5','all non-head attachment geometry and painted source cells remain unchanged');
 const registry=read('../data/character-rigs.json');assert.equal(registry.rigs.find(row=>row.id===id).manifestURL,'./assets/rigs/rin-rai-lion/rig.json?v=20261024-neck1');
});

test('Rai fallback retains its original frame poses, body size and ground anchors',()=>{
 const before=structuredClone(rig);for(const view of Object.values(before.views))view.parts.head.pivot[1]=view.parts.head.contentHeight;
 for(const direction of RAI_FALLBACK.directions){
  const poses=raiFallbackPoses(rig,direction);assert.equal(poses.length,4);assert.deepEqual(poses,raiFallbackPoses(before,direction));
 }
 for(const cell of character.asset.layout.frames.flat()){
  assert.equal(cell.contentHeight,219.95);assert.equal(cell.anchorX,.5);assert.equal(cell.anchorY,238/256);
  const [x,y,w,h]=cell.frame,[left,top,right,bottom]=cell.runtimeAlphaBounds;
  assert(left>x&&top>y&&right<x+w&&bottom<y+h,'every rebaked frame has unclipped alpha margins');
 }
});
