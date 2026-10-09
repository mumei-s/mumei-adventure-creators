import assert from 'node:assert/strict';
import {questions,resolveSelections,AUTO} from '../catalog.js?v=28.4.2';
import {initialSelections,effectiveSelections,propose,proposalBatch,modeKeys} from '../modes.js?v=28.4.2';
import {applyCollection} from '../collection.js?v=28.4.2';
import {automaticSelection,automaticCandidates,selectionFingerprint} from '../random-selections.js?v=28.4.2';
import {selectionConflicts,compatibleResolved} from '../compatibility.js?v=28.4.2';
import {angleConstraint,moodConstraint} from '../view-constraints.js?v=28.4.2';
import {buildDirection} from '../direction.js?v=28.4.2';
import {applyPose} from '../poses.js?v=28.4.2';
import {productionPlan} from '../production-plan.js?v=28.4.2';
import {renderInput,renderChatInput} from '../compiled-production.js?v=28.4.2';

const rngFor=seed=>{let state=seed;return ()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);};
const keys=questions.map(q=>q.key),signature=values=>selectionFingerprint(values,keys);
const checkFixed=(input,resolved)=>{
 for(const q of questions)if(!automaticSelection(input[q.key])&&!(input.sceneUnified&&q.key==='place'))assert.equal(resolved[q.key],input[q.key],'AUTO changed fixed '+q.key);
};
let resolutions=0,batches=0,deliveries=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 assert.equal(automaticCandidates(questions.find(q=>q.key==='angle')).length,36,'AUTO camera must have actual random candidates');
 assert.ok(automaticCandidates(questions.find(q=>q.key==='mood')).length>20,'AUTO expression must not be one sentinel');
 for(const mode of ['detail','simple','auto']){
  const fixed={...initialSelections(),medium:'鉛筆デッサン',theme:collection==='halloween'?'幽霊たちのお茶会':'静かな読書の時間',design:'通常の一枚絵',type:'文字を一切入れない',size:'正方形アイコン｜2048×2048｜1:1',costume:'参照画像の衣装を生かす',pose:'振り向く',mood:'毎回大胆に変える',angle:'場面に合わせたアングル',palette:AUTO};
  const input=effectiveSelections(mode,fixed),snapshot=structuredClone(input),recent=[];
  for(let seed=1;seed<=200;seed++){
   const resolved=resolveSelections(input,rngFor(seed),{recent:recent.slice(-3)});
   checkFixed(input,resolved);assert.deepEqual(input,snapshot,'Resolution mutated the draft');
   assert.deepEqual(selectionConflicts(resolved),[],collection+' / '+mode+' / seed '+seed+' has an AUTO conflict');
   assert.ok(angleConstraint(resolved.angle),'AUTO camera was never made concrete');
   assert.ok(moodConstraint(resolved.mood),'Unknown resolved expression');
   assert.ok(!recent.slice(-3).some(previous=>signature(previous)===signature(resolved)),'Recent full tuple repeated');
   if(resolved.pose==='振り向く')assert.ok(!['front','side'].includes(angleConstraint(resolved.angle).cameraFacing),'Rear pose and side/front camera mixed');
   if(seed<=5){
    const variant=applyPose(buildDirection([],resolved.mood,rngFor(seed),collection,resolved),resolved.pose);
    const plan=productionPlan({displayName:'自動選択検査',activityEnabled:false},resolved,variant,collection,rngFor(seed));
    const audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
    const native=renderChatInput(plan);
    assert.equal(audit.camera.geometry.selected,resolved.angle,'Actual handoff lost the resolved AUTO camera');
    assert.ok(native.includes(resolved.angle));assert.ok(native.includes(resolved.pose));
    if(resolved.pose==='振り向く')assert.equal(audit.required_before_details.body_projection,undefined,'Side projection still reached a rear-facing pose');
    deliveries++;
   }
   recent.push(resolved);resolutions++;
  }
  // Even a deterministic injected RNG must draw distinct candidates from the
  // remaining compatible pool, rather than repeatedly retrying the same draw.
  const first=proposalBatch(input,()=>.2),second=proposalBatch(input,()=>.2,{recent:first.proposals});
  assert.equal(first.proposals.length,3);assert.equal(second.proposals.length,3);
  assert.deepEqual(first.issues,[]);assert.deepEqual(second.issues,[]);
  assert.equal(new Set([...first.proposals,...second.proposals].map(signature)).size,6);
  for(const proposal of [...first.proposals,...second.proposals]){checkFixed(input,proposal);assert.deepEqual(selectionConflicts(proposal),[]);}
  batches+=2;
 }

 // A single pinned field cannot be traded away to repair an automatic field.
 for(const palette of ['墨一色','深紅 × 黒 × 古金'])for(let seed=1;seed<=40;seed++){
  const resolved=resolveSelections({...initialSelections(),palette,sceneUnified:true},rngFor(seed));
  assert.equal(resolved.palette,palette);assert.deepEqual(selectionConflicts(resolved),[]);resolutions++;
 }
 for(let seed=1;seed<=40;seed++){
  const resolved=resolveSelections({...initialSelections(),costume:'人魚',mood:AUTO,angle:AUTO,pose:AUTO,sceneUnified:true},rngFor(seed));
  assert.equal(resolved.costume,'人魚');assert.deepEqual(selectionConflicts(resolved),[]);resolutions++;
 }
 const impossible={...initialSelections(),medium:'鉛筆デッサン',palette:'深紅 × 黒 × 古金',mood:'ローアングル＋威嚇',angle:'真上から・90度',pose:'四つん這いで進む'};
 const original=structuredClone(impossible),resolved=resolveSelections(impossible,()=>.2);
 checkFixed(impossible,resolved);assert.deepEqual(impossible,original);
 assert.ok(selectionConflicts(resolved).some(c=>c.keys.includes('palette')));
 assert.ok(selectionConflicts(resolved).some(c=>c.code==='opposed-camera-height'));
 const batch=proposalBatch(impossible,()=>.2);
 assert.equal(batch.proposals.length,0);assert.ok(batch.issues.every(issue=>issue.reason));
 assert.ok(batch.issues.some(issue=>issue.values.angle==='真上から・90度'),'Rejected fixed selections lost the original reason/values');
}

// If the first AUTO field has no possible repair, another AUTO axis must still
// be tried. This used to return an unresolved conflict immediately.
const solved=compatibleResolved({mood:'ローアングル＋威嚇',angle:'真上から・90度'},{mood:AUTO,angle:AUTO},[{key:'mood',autoValues:['ローアングル＋威嚇']},{key:'angle',autoValues:['真上から・90度','ローアングル・30度']}],()=>0);
assert.equal(solved.mood,'ローアングル＋威嚇');assert.equal(solved.angle,'ローアングル・30度');assert.deepEqual(selectionConflicts(solved),[]);

// Fully fixed choices may be used again to vary the actual rendering. A batch
// of proposals must disclose the finite pool instead of duplicating cards.
applyCollection('everyday');
const fixed=resolveSelections({...initialSelections(),sceneUnified:true},()=>.2);
const repeated=resolveSelections(fixed,()=>.2,{recent:[fixed]});
assert.equal(signature(repeated),signature(fixed));checkFixed(fixed,repeated);
const one=proposalBatch(fixed,()=>.2);
assert.equal(one.proposals.length,1);assert.ok(one.issues.some(issue=>issue.code==='auto-candidates-exhausted'));
assert.match(one.issues[0].reason,/固定した項目.*候補が不足/);
const onlyReadingPose={...fixed,theme:'静かな読書の時間',costume:'参照画像の衣装を生かす',pose:AUTO,angle:'俯瞰・45度',mood:'静かで美しい'};
const reading=propose(onlyReadingPose,()=>.2);
assert.equal(reading.pose,'本を読む');
const limited=proposalBatch(onlyReadingPose,()=>.2);
assert.equal(limited.proposals.length,1);assert.ok(limited.issues.some(issue=>issue.code==='auto-candidates-exhausted'));
assert.equal(limited.proposals[0].theme,onlyReadingPose.theme);
const reusedReading=resolveSelections(onlyReadingPose,()=>.2,{recent:[reading]});
assert.equal(reusedReading.pose,'本を読む');assert.ok(reusedReading.automaticResolution.reused);
assert.deepEqual(selectionConflicts(reusedReading),[],'Finite automatic choices may still produce a valid image with a different direction');
const reusedPlan=productionPlan({displayName:'候補再利用検査',activityEnabled:false},reusedReading,applyPose(buildDirection([],reusedReading.mood,()=>.2,'everyday',reusedReading),reusedReading.pose),'everyday',()=>.2);
assert.ok(reusedPlan.issues.some(issue=>issue.code==='auto-candidates-exhausted'));
assert.ok(renderChatInput(reusedPlan).includes(reusedReading.automaticResolution.reason),'The finite-pool reason must remain in the actual generation material');

// Real group pools stay random across seeds while respecting each collection's
// ordinary-only AUTO policy; explicit fantasy remains an available fixed choice.
for(const collection of ['halloween','everyday']){
 applyCollection(collection);const angles=new Set(),moods=new Set(),random=rngFor(918273);
 for(let seed=1;seed<=300;seed++){
  const resolved=resolveSelections({...initialSelections(),costume:'参照画像の衣装を生かす',sceneUnified:true},random);angles.add(resolved.angle);moods.add(resolved.mood);
 }
 assert.ok(angles.size>=25,collection+' AUTO camera distribution is stuck');
 assert.ok(moods.size>=20,collection+' AUTO expression distribution is stuck');
 if(collection==='everyday')assert.ok(!moods.has('ローアングル＋威嚇')&&!moods.has('牙を見せて威嚇'),'Ordinary AUTO added an opt-in monster expression');
}
applyCollection('halloween');
console.log('PASS fresh AUTO selections: '+resolutions+' resolutions across 3 modes / 2 collections, '+batches+' deterministic-RNG proposal batches, '+deliveries+' actual camera handoffs; fixed choices preserved, compatible pool sampling, recent tuples avoided, finite/incompatible combinations retain reasons. No images generated.');
