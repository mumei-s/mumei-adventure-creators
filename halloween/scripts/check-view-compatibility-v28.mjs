import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.3.1';
import {applyCollection} from '../collection.js?v=28.3.1';
import {initialSelections} from '../modes.js?v=28.3.1';
import {angleItems,applyAngle,cameraContract} from '../angles.js?v=28.3.1';
import {poseItems,applyPose} from '../poses.js?v=28.3.1';
import {buildDirection} from '../direction.js?v=28.3.1';
import {angleConstraint,moodConstraint,poseConstraint,angleConstraintValues,poseConstraintValues} from '../view-constraints.js?v=28.3.1';
import {selectionConflicts,selectionWarnings,candidateAvailability,compatibleResolved} from '../compatibility.js?v=28.3.1';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.3.1';
import {renderInput,renderChatInput} from '../compiled-production.js?v=28.3.1';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.3.1';

const moodValues=questions.find(q=>q.key==='mood').groups.flatMap(g=>g.values);
assert.equal(moodValues.length,43);
assert.deepEqual([...angleConstraintValues].sort(),angleItems.map(a=>a.value).sort(),'Every actual angle must have a reviewed structural requirement');
assert.deepEqual([...poseConstraintValues].sort(),poseItems.map(p=>p.value).sort(),'Every actual pose must have a reviewed structural requirement');
for(const mood of moodValues)assert.ok(moodConstraint(mood),'Unreviewed mood: '+mood);
for(const pose of poseItems)assert.ok(poseConstraint(pose.value).orientation,'Missing torso/support classification: '+pose.value);
assert.equal(angleConstraint('自由な角度'),null);
assert.equal(moodConstraint('未登録のローアングルっぽい表情'),null,'Custom prose must not be treated as an understood preset');

// Independent ground truth: only the title's named numerical axis is fixed.
const pitches=new Map([['目線の高さ・正面',0],['少し上から・15度',15],['ハイアングル・30度',30],['俯瞰・45度',45],['急な俯瞰・70度',70],['真上から・90度',90],['少し下から・15度',-15],['ローアングル・30度',-30],['煽り・45度',-45],['超ローアングル・70度',-70],['真下から・90度',-90]]);
const yaws=new Map([['目線の高さ・正面',0],['斜め前45度',45],['真横90度',90],['背面斜め45度',135]]);
const rolls=new Map([['斜めに傾いた画面・15度',15],['大胆な傾斜・30度',30]]);
for(const angle of angleItems){
 const geometry=cameraContract({angle:angle.value});
 assert.equal(geometry.pitch_degrees_from_horizontal,pitches.get(angle.value),'Unspecified elevation became fixed: '+angle.value);
 assert.equal(geometry.azimuth_relative_to_subject_degrees,yaws.get(angle.value),'Unspecified azimuth became fixed: '+angle.value);
 assert.equal(geometry.roll_degrees,rolls.get(angle.value),'Wrong rotation axis: '+angle.value);
}

const base={costume:'参照画像の衣装を生かす',pose:'四つん這いで進む',mood:'ローアングル＋威嚇',angle:'真上から・90度'};
assert.ok(selectionConflicts(base).some(c=>c.code==='opposed-camera-height'),'Reported bug must be a camera conflict, not a silently substituted head pose');
assert.match(selectionConflicts(base)[0].reason,/ローアングル＋威嚇.*真上から・90度.*両立しません/);
assert.equal(candidateAvailability('angle',base.angle,{mood:base.mood,pose:base.pose}).status,'blocked');
assert.equal(candidateAvailability('mood',base.mood,{angle:base.angle,pose:base.pose}).status,'blocked');

const above=['少し上から・15度','ハイアングル・30度','俯瞰・45度','急な俯瞰・70度','真上から・90度','鳥の目・広い俯瞰'];
const below=['少し下から・15度','ローアングル・30度','煽り・45度','超ローアングル・70度','真下から・90度','地面すれすれの視点'];
for(const [moods,wrong,right] of [[['真上からの俯瞰','俯瞰＋目を見開く'],below,above],[['真下からのローアングル','ローアングル＋威嚇'],above,below]])
 for(const mood of moods){
  for(const angle of wrong)assert.ok(selectionConflicts({mood,angle}).some(c=>c.code==='opposed-camera-height'),mood+' vs '+angle);
  for(const angle of right)assert.equal(selectionConflicts({mood,angle}).length,0,mood+' same-side '+angle+' should be compatible');
  assert.ok(selectionConflicts({mood,angle:'目線の高さ・正面'}).some(c=>c.code==='opposed-camera-height'));
 }
for(const key of ['pose','mood'])for(const value of key==='pose'?['振り向く','振り向きながら走る']:['背中から振り向く','背中から振り向く＋ニヤリ']){
 for(const angle of ['目線の高さ・正面','斜め前45度','真横90度'])assert.ok(selectionConflicts({[key]:value,angle}).some(c=>c.code==='opposed-camera-facing'));
 for(const angle of ['背面から見る','背面斜め45度','肩越しの視点'])assert.equal(selectionConflicts({[key]:value,angle}).length,0);
}

// Faces/head rotations do not own a camera axis. Visibility limits are soft.
for(const mood of ['正面・首をまっすぐ','完全な左横顔90度','完全な右横顔90度','顔を上に向ける','顔を下に向ける','歯を見せて大笑い'])
 for(const angle of angleItems)assert.equal(selectionConflicts({mood,angle:angle.value,pose:'四つん這いで進む'}).length,0,'Head/expression incorrectly became a camera conflict: '+mood+' / '+angle.value);
const visibleTop={mood:'正面・首をまっすぐ',pose:'仰向けに寝る',angle:'真上から・90度'};
assert.equal(selectionWarnings(visibleTop).length,0,'A naturally upward-facing supine face is compatible with top90');
const topProne={...visibleTop,pose:'四つん這いで進む'};
assert.equal(candidateAvailability('pose',topProne.pose,visibleTop).status,'warning');
assert.ok(selectionWarnings(topProne).some(c=>c.code==='face-from-steep-overhead'));
for(const pose of ['まっすぐ立つ','四つん這いで進む','浮遊する','両足でジャンプ'])assert.ok(!selectionWarnings({pose,angle:'真下から・90度'}).some(c=>c.code==='support-occludes-bottom-view'),'Floor contact is not proof of obstruction: '+pose);
const supported=poseItems.filter(p=>poseConstraint(p.value).bodyOnSupport);
assert.equal(supported.length,15);
for(const {value:pose} of supported){
 const values={pose,angle:'真下から・90度'};
 assert.equal(selectionConflicts(values).length,0,'A context-dependent support obstruction is not a universal impossibility');
 assert.ok(selectionWarnings(values).some(c=>c.code==='support-occludes-bottom-view'));
 assert.equal(candidateAvailability('pose',pose,{angle:values.angle}).status,'warning');
}
assert.ok(selectionWarnings({pose:'傘を差す',angle:'真上から・90度'}).some(c=>c.code==='umbrella-occludes-overhead'));
assert.ok(selectionWarnings({mood:'歯を見せて大笑い',angle:'目元の超接写'}).some(c=>c.code==='expression-outside-eye-crop'));
assert.ok(selectionWarnings({mood:'涙を浮かべる',angle:'手元・動作の接写'}).some(c=>c.code==='face-outside-crop'));
assert.equal(selectionWarnings({mood:'ローアングルっぽく睨む',angle:'真横90度'})[0].code,'custom-mood-review');

// A rejected choice cannot slip through by selecting the same tuple in a
// different order. Keep the preceding accepted values, as the actual UI does.
const orders=[['mood','pose','angle'],['mood','angle','pose'],['pose','mood','angle'],['pose','angle','mood'],['angle','mood','pose'],['angle','pose','mood']];
for(const tuple of [base,{...base,mood:'俯瞰＋目を見開く',angle:'ローアングル・30度'},{...base,mood:'背中から振り向く',pose:'まっすぐ立つ',angle:'斜め前45度'}])
 for(const order of orders){
  const accepted={costume:tuple.costume};let rejected=0;
  for(const key of order){const candidate=candidateAvailability(key,tuple[key],accepted);if(candidate.enabled)accepted[key]=tuple[key];else rejected++;}
  assert.ok(rejected>0,'Conflict bypassed by selection order '+order.join(' → '));
  assert.equal(selectionConflicts(accepted).length,0,'Rejection must retain the last valid selection');
 }

// Exhaustive selection matrix: every error is reflected in both involved
// picker directions; a warning by itself stays selectable and has a reason.
let combinations=0,blocked=0,warned=0;
for(const {value:angle} of angleItems)for(const mood of moodValues)for(const {value:pose} of poseItems){
 const values={angle,mood,pose,costume:base.costume},conflicts=selectionConflicts(values),warnings=selectionWarnings(values);
 for(const key of ['angle','mood','pose']){
  const availability=candidateAvailability(key,values[key],values),errors=conflicts.filter(c=>c.keys.includes(key)),notes=warnings.filter(c=>c.keys.includes(key));
  assert.equal(availability.enabled,errors.length===0);
  assert.equal(availability.status,errors.length?'blocked':notes.length?'warning':'compatible');
  if(errors.length)assert.ok(availability.reason);
  for(const note of availability.warnings)assert.ok(note.reason&&note.code);
 }
 blocked+=!!conflicts.length;warned+=!conflicts.length&&!!warnings.length;combinations++;
}
assert.equal(combinations,111456);
assert.ok(blocked>0&&warned>0&&blocked+warned<combinations,'The matrix must distinguish compatible, warning and blocked');

// AUTO may change only AUTO fields, including the camera sentinel. Fully
// explicit conflicts remain visible, and do not block unrelated AUTO fixes.
for(const mode of ['halloween','everyday']){
 applyCollection(mode);
 const resolved=resolveSelections({...initialSelections(),...base},()=>.23);
 for(const key of ['mood','pose','angle'])assert.equal(resolved[key],base[key]);
 assert.ok(selectionConflicts(resolved).some(c=>c.code==='opposed-camera-height'));
 const autoMood=resolveSelections({...initialSelections(),pose:'四つん這いで進む',angle:base.angle,mood:'おまかせ'},()=>.83);
 assert.equal(autoMood.angle,base.angle);assert.equal(autoMood.pose,base.pose);assert.equal(selectionConflicts(autoMood).length,0);
 const autoAngle=resolveSelections({...initialSelections(),mood:base.mood,pose:base.pose,angle:'おまかせ'},()=>.23);
 assert.equal(autoAngle.mood,base.mood);assert.equal(autoAngle.pose,base.pose);assert.equal(selectionConflicts(autoAngle).length,0);
}
const repaired=compatibleResolved({...base,medium:'鉛筆デッサン',palette:'赤 × 黒 × 金'}, {...base,medium:'鉛筆デッサン',palette:'おまかせ'},questions,()=>.1);
assert.equal(repaired.mood,base.mood);assert.equal(repaired.angle,base.angle);assert.ok(selectionConflicts(repaired).some(c=>c.code==='opposed-camera-height'));
assert.ok(!selectionConflicts(repaired).some(c=>c.keys.includes('palette')),'An explicit view conflict must not prevent an independent AUTO palette correction');
const customCameraQuestions=[{key:'angle',autoValues:['真上から・90度','ローアングル・30度']}];
assert.equal(compatibleResolved(base,{...base,angle:'場面に合わせたアングル'},customCameraQuestions,()=>0).angle,'ローアングル・30度');

// A crop, lens or roll leaves camera axes open. Preserve the preset's camera
// side without converting it to a head pose in every actual output route.
applyCollection('halloween');
const profile={displayName:'視点検査',activityEnabled:false};
let handoffs=0;
for(const mood of ['俯瞰＋目を見開く','ローアングル＋威嚇','背中から振り向く＋ニヤリ'])
 for(const angle of angleItems.filter(a=>!angleConstraint(a.value).cameraSide&&!angleConstraint(a.value).cameraFacing)){
  const values=resolveSelections({...initialSelections(),mood,pose:'四つん這いで進む',angle:angle.value,medium:'アメコミのインク画'},()=>.23);
  const variant=applyAngle(values,applyPose(buildDirection([],mood,()=>.23,'halloween',values),values.pose));
  const plan=productionPlan(profile,values,variant,'halloween',()=>.23),geometry=cameraContract(values);
  const expected=moodConstraint(mood).cameraSide||moodConstraint(mood).cameraFacing;
  assert.equal(geometry.required_camera_side||geometry.required_camera_facing,expected);
  assert.ok(variant.face.includes(mood)||variant.face.includes('背中側'));
  assert.ok(variant.camera.includes('視点指定「'+mood+'」'));
  const condition=plan.conditions.find(c=>c.key==='mood');
  assert.ok(condition.sections.some(s=>s.label==='顔の回転と見える面'),'Original view recipe was discarded: '+mood+' / '+angle.value);
  for(const text of [renderInput(plan),renderChatInput(plan),composeArtworkStage(plan),composeArtworkRepair(plan),composeArtworkRepair(plan,{compact:true}),repairPrompt({production:plan,values,prompt:renderChatInput(plan)})]){
   assert.ok(text.includes('視点指定「'+mood+'」'),'Missing camera preset in output: '+mood+' / '+angle.value);
   assert.ok(!text.includes('旧レシピに含まれたカメラの高さは追加せず'));
  }
  handoffs++;
 }
const invalidValues=resolveSelections({...initialSelections(),...base},()=>.23);
const invalidPlan=productionPlan(profile,invalidValues,applyPose(buildDirection([],base.mood,()=>.23,'halloween',invalidValues),base.pose),'halloween',()=>.23);
assert.ok(invalidPlan.issues.some(c=>c.code==='opposed-camera-height'));
for(const text of [renderInput(invalidPlan),renderChatInput(invalidPlan),composeArtworkStage(invalidPlan),composeArtworkRepair(invalidPlan),composeArtworkRepair(invalidPlan,{compact:true})])assert.ok(text.includes('選択の不成立：'),'Legacy direct callers must disclose incompatible explicit selections');
applyCollection('halloween');
console.log('PASS all 43 moods / 72 poses / 36 angles; '+combinations+' selection combinations ('+blocked+' blocked, '+warned+' warning); all 6 selection orders; AUTO-only correction; '+handoffs+' preset-preserving handoff cases; unsupported direct inputs disclose conflicts. No images generated.');
