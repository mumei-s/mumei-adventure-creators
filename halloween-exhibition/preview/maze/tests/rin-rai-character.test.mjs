import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {compileCharacterRoster,placeCreatorNPCs,creatorPose,layoutProblem} from '../creator-runtime.js';
import {createOwnerRig} from '../owner-rig.js';
import {placeTownVisitors,sampleTownVisitors} from '../../town/visitor-model.js';
import {isTownWalkable} from '../../town/story-data.js';
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
