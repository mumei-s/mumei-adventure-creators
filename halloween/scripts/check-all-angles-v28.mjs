import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.3.1';
import {questions,resolveSelections} from '../catalog.js?v=28.3.1';
import {initialSelections} from '../modes.js?v=28.3.1';
import {buildDirection,shotPlans} from '../direction.js?v=28.3.1';
import {applyPose} from '../poses.js?v=28.3.1';
import {angleItems,applyAngle,cameraContract} from '../angles.js?v=28.3.1';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.3.1';
import {renderInput,renderChatInput} from '../compiled-production.js?v=28.3.1';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.3.1';
import {optionRecipe} from '../option-recipes.js?v=28.3.1';
import {angleConstraint} from '../view-constraints.js?v=28.3.1';

// A fixed angle must survive every delivery route, including nonvertical and
// cropped views. These tests examine the actual handoff, not rendered images.
const profile={displayName:'全アングル検査',activityEnabled:false};
const subjects=[
 {name:'person',costume:'参照画像の衣装を生かす'},
 {name:'mermaid',costume:'人魚'},
 {name:'scenery',costume:'風景を主役にする',noPerson:true}
];
const media=['アメコミのインク画','実写風スタジオ写真'];
const poses=['膝を抱えて座る','仰向けに寝る','振り向く','本を読む','まっすぐ立つ','浮遊する'];
const closeView=/クローズアップ|超接写|接写/;
const cameraWords=/頭上から顔を見下ろす|顔を下から|下方のカメラを|背中から撮影|顔向き指定があればカメラを調整/;
const contains=(text,clause,where)=>assert.ok(text.includes(clause),where+' dropped: '+clause);
const valuesFor=(collection,angle,subject,medium,pose,mood='毎回大胆に変える')=>{
 const theme=questions.find(q=>q.key==='theme').groups.flatMap(g=>g.values)[0];
 return resolveSelections({...initialSelections(),sceneUnified:true,theme,place:'STALE_INDEPENDENT_PLACE',
  angle:angle.value,design:'パンク・フライヤー',medium,pose:subject.noPerson?'おまかせ':pose,mood,
  costume:subject.costume,palette:'群青 × 月白 × 銀',type:'イベント告知・見どころと案内',line:'セリフなし',
  size:'A4縦・300dpi目安｜2480×3508｜210:297'},()=>.23);
};
let deliveries=0,automaticFaces=0,explicitFaces=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const [angleIndex,angle] of angleItems.entries()){
  for(const subject of subjects)for(const medium of media){
   const pose=poses[angleIndex%poses.length],values=valuesFor(collection,angle,subject,medium,pose);
   const direction=applyPose(buildDirection([],values.mood,()=>.61,collection,values),values.pose);
   const plan=productionPlan(profile,values,direction,collection,()=>.23);
   const audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
   const geometry=cameraContract(values,{noPerson:!!subject.noPerson});
   const native=renderChatInput(plan),stage=composeArtworkStage(plan),stageRepair=composeArtworkRepair(plan),
    compactRepair=composeArtworkRepair(plan,{compact:true}),repair=repairPrompt({prompt:native,production:plan,values});
   const name=[collection,angle.value,subject.name,medium].join(' / ');
   for(const key of ['angle','medium','costume','design','theme','palette','type'])
    assert.equal(plan.values[key],values[key],name+' changed '+key);
   assert.ok(!plan.conditions.some(c=>c.key==='place'),name+' restored a separately selected background');
   assert.notEqual(values.place,'STALE_INDEPENDENT_PLACE',name+' kept an unrelated legacy place');
   assert.equal(audit.camera.geometry.selected,angle.value,name+' lost the camera owner');
   assert.deepEqual(audit.camera.geometry,geometry,name+' differs between plan and audit geometry');
   assert.equal(plan.conditions.find(c=>c.key==='angle').value,angle.value,name+' dropped the selected angle');
   assert.equal(plan.conditions.find(c=>c.key==='medium').value,medium,name+' dropped the selected medium');
   assert.equal(plan.conditions.find(c=>c.key==='type').value,values.type,name+' dropped advertising copy');
   // Fix only the axis the title actually specifies: elevation, azimuth and
   // screen rotation are independent. Preview row defaults are not constraints.
   const axes=angleConstraint(angle.value).axes;
   for(const [axis,field] of [['pitch','pitch_degrees_from_horizontal'],['yaw','azimuth_relative_to_subject_degrees'],['roll','roll_degrees']]){
    assert.equal(geometry[field],axes[axis],name+' changed or invented the '+axis+' constraint');
    assert.equal(Object.hasOwn(geometry,field),axes[axis]!==undefined,name+' lost axis ownership for '+axis);
   }
   if(Math.abs(angle.pitch)===90){
    assert.deepEqual(geometry.optical_axis,angle.pitch===90?[0,0,-1]:[0,0,1],name+' tilted the vertical optical axis');
    assert.equal(geometry.horizontal_component,0,name+' introduced a horizontal optical component');
   }
   for(const instruction of geometry.instructions)
    for(const [route,text] of [['native',native],['artwork',stage],['artwork repair',stageRepair],['compact repair',compactRepair],['whole repair',repair]])
     contains(text,instruction,name+' / '+route);
   for(const text of [native,stage,stageRepair,compactRepair,repair])assert.doesNotMatch(text,/undefined|NaN/,name+' contains unresolved values');
   assert.ok(native.indexOf('【固定カメラ：描画前に確定】')<native.indexOf('【選択済みの仕様資料：一場面へ統合する】'),name+' fixes camera after competing detail');
   contains(audit.required_before_details.frame,geometry.framing_instruction,name+' final framing');
   contains(stage,geometry.framing_instruction,name+' artwork framing');
   for(const check of geometry.checks){contains(native,check,name+' native image acceptance');contains(stage,check,name+' artwork image acceptance');}
   if(closeView.test(angle.distance)){
    assert.ok(!audit.required_before_details.full_body_composition,name+' forces a close view into a full-body shot');
    assert.match(geometry.framing_instruction,/接写の指定を全身へ引き直さない/,name+' lacks crop preservation');
   }
   if(geometry.whole)assert.doesNotMatch(geometry.framing_instruction,/75.?80|70.?85/,name+' imposes standing-image height ratios');
   if(subject.noPerson){
    assert.equal(plan.noPerson,true,name+' reintroduced a person');
    assert.equal(plan.variant.face,'',name+' reintroduced a face');
    assert.equal(plan.variant.pose,'',name+' reintroduced a body pose');
    assert.doesNotMatch(native,/^顔の向き：|^身体の動き：/m,name+' sends person instructions');
    assert.doesNotMatch(stage,/^顔の向き：|^身体の動作：/m,name+' sends person-stage instructions');
   }else{
    assert.equal(plan.values.pose,pose,name+' changed the selected action');
    contains(native,pose,name+' native action');
    contains(stage,pose,name+' artwork action');
    assert.doesNotMatch(plan.variant.face,cameraWords,name+' auto face adds a different camera');
    const poseSpecification=plan.conditions.find(c=>c.key==='pose').sections.map(s=>s.text).join(' ');
    assert.doesNotMatch(plan.variant.pose,/顔向き指定があればカメラを調整/,name+' pose moves the fixed camera');
    assert.doesNotMatch(poseSpecification,/必要ならカメラの位置|顔角度の指定にはカメラ位置で合わせ|首の無理な捻りはカメラで避ける|顔角度をカメラで合わせ/,name+' pose recipe moves the fixed camera');
    if(subject.name==='mermaid'&&angle.value==='全身・周囲も見せる'){
     assert.match(plan.variant.distance,/尾びれ/,name+' loses the selected nonhuman anatomy');
     assert.doesNotMatch(plan.variant.distance,/足先|靴先/,name+' adds human feet to a mermaid');
     assert.doesNotMatch(geometry.framing,/足先|靴先/,name+' audit framing adds human feet to a mermaid');
    }
   }
   if(medium.startsWith('実写'))assert.ok(audit.required_before_details.photo_reconstruction,name+' loses illustration-to-photo reconstruction');
   deliveries++;
  }
  // Every legacy auto facial/camera family can reach every selected angle.
  for(const shot of shotPlans){
   const values=valuesFor(collection,angle,subjects[0],media[0],'膝を抱えて座る');
   const resolved=applyAngle(values,applyPose({...shot},values.pose));
   assert.doesNotMatch(resolved.face,cameraWords,collection+' / '+angle.value+' / '+shot.family+' retains a second auto camera');
   assert.match(resolved.camera,new RegExp(angle.value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),angle.value+' was replaced by '+shot.family);
   assert.equal(resolved.angleChoice,angle.value);
   automaticFaces++;
  }
  // A user-selected left/right profile must survive angle reconciliation.
  for(const mood of ['完全な左横顔90度','完全な右横顔90度']){
   const values=valuesFor(collection,angle,subjects[0],media[0],'膝を抱えて座る',mood);
   const plan=productionPlan(profile,values,applyPose(buildDirection([],mood,()=>.61,collection,values),values.pose),collection,()=>.23);
   assert.equal(plan.values.mood,mood,collection+' / '+angle.value+' discarded an explicit face choice');
   contains(plan.variant.face,mood,collection+' / '+angle.value+' explicit profile');
   contains(renderChatInput(plan),mood,collection+' / '+angle.value+' explicit profile handoff');
   explicitFaces++;
  }
 }
}
// Pose recipes previously moved the camera to make faces visible. Reconcile
// those verbs for every fixed angle, while retaining camera choice in auto.
let poseRecipes=0;
for(const pose of ['振り向く','横向きに座る','振り向きながら走る']){
 for(const angle of angleItems){
  const recipe=optionRecipe('pose',pose,{values:{angle:angle.value,costume:'参照画像の衣装を生かす'},variant:{},noPerson:false});
  const text=recipe.sections.map(s=>s.text).join(' ');
  assert.doesNotMatch(text,/必要ならカメラの位置|顔角度の指定にはカメラ位置で合わせ|首の無理な捻りはカメラで避ける|顔角度をカメラで合わせ/,pose+' / '+angle.value+' moves a fixed camera');
  assert.match(text,/両立しない.*衝突/,pose+' / '+angle.value+' silently discards a conflicting face or action');
  poseRecipes++;
 }
 const auto=optionRecipe('pose',pose,{values:{angle:'場面に合わせたアングル',costume:'参照画像の衣装を生かす'},variant:{},noPerson:false});
 assert.match(auto.sections.map(s=>s.text).join(' '),/必要ならカメラの位置/,pose+' unnecessarily locks automatic camera selection');
}
applyCollection('halloween');
console.log('PASS all 36 angles: '+deliveries+' mode/subject/ink/photo handoffs, '+automaticFaces+' automatic facial-view reconciliations, '+explicitFaces+' explicit profile choices and '+poseRecipes+' fixed-camera pose recipes. Numeric axes, roll, crop, pose, single scene, nonhuman anatomy and advertising selections survive. Image-model adherence remains unverified.');
