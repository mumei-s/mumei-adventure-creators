import assert from 'node:assert/strict';
import {angleItems,applyAngle,cameraContract} from '../angles.js?v=28.4.6';
import {angleConstraint,viewSelectionIssues} from '../view-constraints.js?v=28.4.6';
import {poseItems,poseDefaultFraming,applyPose} from '../poses.js?v=28.4.6';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.6';
import {buildDirection} from '../direction.js?v=28.4.6';
import {compileProduction,renderInput,renderChatInput} from '../compiled-production.js?v=28.4.6';
import {renderCompactChatInput} from '../compact-production.js?v=28.4.6';
import {renderFocusedChatInput,renderFocusedRepairPrompt,identityPreparationStage} from '../focused-production.js?v=28.4.6';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.6';
import {composePrompt} from '../prompt.js?v=28.4.6';
import {stagePrompts} from '../production-workflow.js?v=28.4.6';
import {stylePresetFor} from '../style-presets.js?v=28.4.6';
import {containsInstruction,sentenceClauses} from './compact-handoff-assertions-v28.mjs';

// Actual failure: fish-eye + walking lost the pose's full range, then told the
// image call not to change that unspecified range into a full view. This checks
// delivered payloads, not merely a newly introduced helper's return value.
const lenses=['魚眼の曲面遠近','望遠・奥行きを圧縮'];
const wholePoses=['ゆっくり歩く','まっすぐ立つ','膝を抱えて座る','仰向けに寝る','浮遊する'];
const upperPoses=['頬に手を添える','口元に指を添える','髪を耳にかける','帽子のつばに手を添える','両手でハートを作る'];
const profile={displayName:'画角検査',activityEnabled:false},random=()=>.34;
const base={sceneUnified:true,medium:'立体光彩アニメ',theme:'吸血鬼の晩餐会',place:'古城の大広間',design:'通常の一枚絵',costume:'ミイラ',pose:'ゆっくり歩く',mood:'毎回大胆に変える',angle:'魚眼の曲面遠近',palette:'翡翠 × 銅 × 濃紺',type:'文字を一切入れない',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297',sourceKind:'photo-person'};
const make=(overrides={},collection='halloween')=>{
 const values={...base,...overrides},variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose),plan=productionPlan(profile,values,variant,collection,random);
 plan.referenceManifest=[...[stylePresetFor(values.medium)].filter(Boolean),{name:'person-reference.jpg',role:'identity'}];
 assert.ok(!plan.issues.some(issue=>issue.severity==='error'),'The tested framing combination is physically compatible');
 return plan;
};
const contains=(text,clause,name)=>assert.ok(containsInstruction(text,clause),name+' lost actual instruction: '+clause);
const axisFields={pitch:'pitch_degrees_from_horizontal',yaw:'azimuth_relative_to_subject_degrees',roll:'roll_degrees'};
let deliveries=0,protectedRanges=0;
for(const item of angleItems){
 const geometry=cameraContract({...base,angle:item.value}),axes=angleConstraint(item.value).axes;
 for(const [axis,field] of Object.entries(axisFields)){
  assert.equal(geometry[field],axes[axis],item.value+' changed the physical camera axis');
  assert.equal(Object.hasOwn(geometry,field),axes[axis]!==undefined,item.value+' added an unselected numeric axis');
 }
 if(!lenses.includes(item.value)){
  assert.equal(geometry.framing,item.distance,item.value+' changed its previously selected crop/range');
  assert.doesNotMatch(geometry.framing_instruction,/画角の範囲は選択ポーズ/,item.value+' should own its existing range');
  protectedRanges++;
 }
}
assert.equal(protectedRanges,34);

for(const collection of ['halloween','everyday'])for(const angle of lenses)for(const pose of [...wholePoses,...upperPoses])for(const medium of ['立体光彩アニメ','立体光彩リアル','薄膜光彩アニメ','アメコミのインク画']){
 const plan=make({angle,pose,medium},collection),g=cameraContract(plan.values),whole=wholePoses.includes(pose),scope=poseDefaultFraming(pose);
 assert.equal(g.whole,whole,angle+' / '+pose+' lost its established pose range');
 assert.ok(g.framing.startsWith(scope.distance),angle+' / '+pose+' must inherit the pose range before naming projection');
 assert.equal(applyAngle(plan.values,applyPose({layout:'',signature:'',motif:''},pose)).distance,g.framing+'。構図は選択ポーズと同じ一場面に適用し、画材や描線は選択作風を保つ。');
 const prompt=composePrompt({collection,profile,values:plan.values,variant:plan.variant,references:plan.referenceManifest,edition:'LENS-POSE-FRAMING',preparedPlan:plan});
 const routes={compact:renderCompactChatInput(plan,plan.referenceManifest),native:renderChatInput(plan),master:compileProduction(plan),prompt,artwork:composeArtworkStage(plan),artworkRepair:composeArtworkRepair(plan),compactArtworkRepair:composeArtworkRepair(plan,{compact:true}),repair:repairPrompt({prompt,production:plan,values:plan.values})};
 const focused=renderFocusedChatInput(plan,plan.referenceManifest),focusedRepair=renderFocusedRepairPrompt(plan,plan.referenceManifest);
 if(focused)routes.focused=focused;if(focusedRepair)routes.focusedRepair=focusedRepair;
 const identity=identityPreparationStage(plan,plan.referenceManifest);if(identity)routes.identityFinalApi=identity.finalPrompt;
 const stages=stagePrompts(plan,plan.referenceManifest,{includeIdentityPreparation:true});if(stages?.final)routes.stageFinalApi=stages.final;
 const audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
 assert.equal(audit.camera.geometry.whole,whole);assert.equal(audit.required_before_details.frame,g.framing_instruction);
 assert.equal(Boolean(audit.required_before_details.full_body_composition),whole);
 for(const [route,text] of Object.entries(routes)){
  for(const clause of sentenceClauses(g.framing_instruction))contains(text,clause,collection+' / '+angle+' / '+pose+' / '+medium+' / '+route);
  assert.doesNotMatch(text,/undefined|NaN/);
  if(whole)assert.doesNotMatch(g.framing_instruction,/主題の範囲を別の接写や全身へ変更しない/,'An unspecified lens range cannot prohibit the existing whole pose');
  if(pose==='ゆっくり歩く'){
   if(['artworkRepair','compactArtworkRepair'].includes(route)){
    contains(text,'支持脚と遊脚',route+' walking support');
    contains(text,'足裏の荷重移動と腕の逆位相',route+' walking weight and counter-swing');
   }else{
    contains(text,'前足の踵から足裏へ移る荷重',route+' walking support');
    contains(text,'後ろ足のつま先の支持',route+' rear walking support');
   }
  }
  deliveries++;
 }
}

// An explicit crop remains stronger than a whole-pose default, including when
// a walking pose has real support points outside the selected crop.
for(const item of angleItems.filter(item=>angleConstraint(item.value).kind==='crop')){
 const plan=make({angle:item.value}),g=cameraContract(plan.values),audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
 assert.equal(g.whole,false);assert.equal(g.framing,item.distance);assert.match(g.framing_instruction,/接写の指定を全身へ引き直さない/);assert.ok(!audit.required_before_details.full_body_composition);
 assert.ok(viewSelectionIssues(plan.values).some(issue=>issue.code==='pose-outside-crop'),'The outside-crop pose limitation must remain visible');
 for(const text of [renderCompactChatInput(plan),composeArtworkStage(plan),repairPrompt({prompt:compileProduction(plan),production:plan,values:plan.values})])contains(text,'接写の指定を全身へ引き直さない',item.value+' crop protection');
}

for(const angle of lenses){
 const plan=make({angle,costume:'風景を主役にする',pose:'おまかせ',mood:'おまかせ'}),g=cameraContract(plan.values,{noPerson:true}),item=angleItems.find(item=>item.value===angle);
 assert.equal(g.whole,false);assert.equal(g.framing,item.distance);assert.doesNotMatch(g.framing_instruction,/頭から足先|選択ポーズの姿勢全体と支持点|画角の範囲は選択ポーズ/);
 for(const text of [renderCompactChatInput(plan),renderFocusedRepairPrompt(plan),composeArtworkStage(plan)])assert.doesNotMatch(text,/画角の範囲は選択ポーズ|頭から足先まで入る全身/,'Scenery must not inherit a human crop');
 assert.equal(poseDefaultFraming('ゆっくり歩く',{noPerson:true}),null);
}
// Extraction preserves applyPose's original range for every existing pose.
for(const pose of poseItems){
 const variant=applyPose({layout:'',signature:'',motif:''},pose.value);
 assert.equal(variant.distance,poseDefaultFraming(pose.value).distance);
}
assert.equal(poseDefaultFraming('おまかせ'),null);
console.log('PASS lens/pose framing: '+deliveries+' actual compact/native/artwork/repair/API payloads retain established walking/full-pose or upper-body ranges for fish-eye and telephoto only; all 36 numeric axes, 34 other ranges, five explicit crops and no-person framing remain protected. This verifies instructions, not generated image compliance.');
