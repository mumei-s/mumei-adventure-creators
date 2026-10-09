import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.4.3';
import {applyCollection} from '../collection.js?v=28.4.3';
import {initialSelections} from '../modes.js?v=28.4.3';
import {buildDirection,shotCameraConstraints} from '../direction.js?v=28.4.3';
import {applyPose} from '../poses.js?v=28.4.3';
import {angleItems} from '../angles.js?v=28.4.3';
import {productionPlan} from '../production-plan.js?v=28.4.3';
import {renderInput,renderChatInput} from '../compiled-production.js?v=28.4.3';

const profile={displayName:'検査作者',biography:'写真とイラストで創作する',topics:['創作']};
const parsed=plan=>JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
const fixture=collection=>{
 applyCollection(collection);
 const theme=questions.find(q=>q.key==='theme').groups.flatMap(g=>g.values)[0];
 return {...resolveSelections({...initialSelections(),sceneUnified:true,theme,
  medium:'アメコミのインク画',design:'パンク・フライヤー',costume:'参照画像の衣装を生かす',
  pose:'まっすぐ立つ',mood:'毎回大胆に変える',angle:'目線の高さ・正面',palette:'群青 × 月白 × 銀',
  type:'文字を一切入れない',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297'},()=>.23),
  mood:'毎回大胆に変える'};
};
const make=(values,used,collection,random=()=>0)=>{
 const raw=buildDirection(used,values.mood,random,collection,values);
 const plan=productionPlan(profile,values,applyPose(raw,values.pose),collection,()=>.23);
 const actual=plan.variant,audit=parsed(plan),material=renderChatInput(plan);
 assert.equal(actual.directionSignature,raw.directionSignature,'The final direction lost its semantic history key');
 assert.ok(actual.light.includes(actual.directionVariation.lightDirection),'The random light direction was overwritten');
 assert.ok(material.includes(actual.directionVariation.lightDirection),'The concrete random light direction did not reach the generation material');
 for(const key of ['medium','theme','design','costume','pose','angle','mood','palette','type'])assert.equal(plan.values[key],values[key],'Random direction silently changed '+key);
 return {raw,plan,actual,audit,material};
};
const remember=variant=>({signature:variant.signature,directionSignature:variant.directionSignature,
 directionVariation:variant.directionVariation,automaticCamera:variant.automaticCamera,
 family:variant.family,face:variant.face,expression:variant.expression,distance:variant.distance,
 pose:variant.pose,layout:variant.layout,camera:variant.camera,randomization:variant.randomization});

let deliveries=0;
for(const collection of ['halloween','everyday']){
 const base=fixture(collection);
 // Legacy direct callers retain AUTO camera semantics even after catalog AUTO
 // selections now resolve to concrete, compatible public options.
 const rear={...base,pose:'振り向く',angle:'場面に合わせたアングル'},rearUsed=[];
 for(const random of [()=>.23,()=>0,()=>.99]){
  const {actual,audit,material}=make(rear,rearUsed,collection,random);
  assert.equal(actual.automaticCamera.cameraFacing,'rear');
  assert.doesNotMatch(actual.camera,/真横|正面に水平/);
  assert.equal(audit.camera.torso_yaw_degrees,undefined,'AUTO camera forced side-on torso over a rear-facing pose');
  assert.equal(audit.required_before_details.body_projection,undefined);
  assert.match(audit.camera.body,/背中|振り返/);
  assert.doesNotMatch(material,/胴体・肩・骨盤・膝の向きはカメラに対して真横90度/);
  rearUsed.push(remember(actual));deliveries++;
 }
 // A constant RNG must traverse unused effective candidates, even when pose
 // and angle override most of the original camera families.
 const fixed={...base,pose:'仰向けに寝る',angle:'真上から・90度'},used=[];
 for(let n=0;n<12;n++){
  const {actual,audit}=make(fixed,used,collection);
  assert.ok(!used.slice(-3).some(record=>record.expression===actual.expression),'AUTO repeated a recent expression after fixed-angle reconciliation');
  assert.ok(!used.some(record=>record.directionSignature===actual.directionSignature),'An unused effective direction was skipped under constant RNG');
  assert.equal(audit.camera.geometry.selected,fixed.angle);
  assert.equal(audit.camera.geometry.pitch_degrees_from_horizontal,90);
  used.push(remember(actual));deliveries++;
 }
 // Rebuild from the last three full records plus older signature-only entries,
 // as persisted history does. A used signature before the recent window must
 // not trap the sampler in repeated retries.
 const compact=used.map((record,index)=>index<used.length-3?{signature:record.signature}:record);
 const next=make(fixed,compact,collection);
 assert.ok(!used.some(record=>record.directionSignature===next.actual.directionSignature));deliveries++;
 // Explicit expression stays fixed. Six genuinely different light directions
 // are available; after a full cycle the sampler reuses older directions with
 // an honest reason, and still avoids the immediately preceding directions.
 const explicit={...fixed,mood:'目を閉じて安らぐ'},explicitUsed=[],lights=new Set();
 for(let n=0;n<10;n++){
  const {actual}=make(explicit,explicitUsed,collection);
  assert.equal(actual.expression,explicit.mood);
  assert.ok(!explicitUsed.slice(-3).some(record=>record.directionSignature===actual.directionSignature));
  lights.add(actual.light);
  if(actual.randomization.reused)assert.match(actual.randomization.reason,/一巡.*直近.*以前の候補/);
  explicitUsed.push(remember(actual));deliveries++;
 }
 assert.ok(lights.size>1,'Only a signature changed; the final light instruction stayed identical');
 assert.ok(explicitUsed.some(record=>record.randomization.reused),'A finite pool was treated as infinite');
 assert.equal(new Set(explicitUsed.map(record=>record.signature)).size,explicitUsed.length,'Legacy caller retry guards would reject finite-pool reuse');
 // Every explicit angle survives direction sampling; a new lighting choice
 // cannot alter that camera, the body action, or the chosen medium.
 for(const angle of angleItems){
  const {audit}=make({...base,angle:angle.value,mood:'真剣な無表情'},[],collection,()=>.61);
  assert.equal(audit.camera.geometry.selected,angle.value);deliveries++;
 }
 for(const costume of ['風景を主役にする','モチーフだけで構成する','紋章・アイコンにする']){
  const scenery={...base,costume,pose:'おまかせ',mood:'静かで美しい'},records=[];
  for(let n=0;n<3;n++){
   const {actual,plan}=make(scenery,records,collection);
   assert.equal(plan.noPerson,true);assert.equal(actual.face,'');assert.equal(actual.expression,'');assert.equal(actual.pose,'');
   records.push(remember(actual));deliveries++;
  }
 }
 // A selected facial projection owns the head, not the camera. Keep the rear
 // camera required by the pose, and disclose the natural-head/visibility check.
 for(const mood of ['正面・首をまっすぐ','完全な左横顔90度','完全な右横顔90度']){
  const {actual,audit}=make({...rear,mood},[],collection,()=>.23);
  assert.equal(actual.automaticCamera.cameraFacing,'rear');
  assert.ok(actual.face.includes(mood==='正面・首をまっすぐ'?'正面0度':mood));
  assert.equal(audit.camera.torso_yaw_degrees,undefined);
  assert.match(actual.directionWarnings.join(' '),/胸郭と首.*見える範囲/);deliveries++;
 }
 for(const mood of ['俯瞰＋目を見開く','ローアングル＋威嚇']){
  const {actual,audit}=make({...rear,mood},[],collection,()=>.23);
  assert.equal(actual.automaticCamera.cameraFacing,'rear');
  assert.equal(actual.automaticCamera.cameraSide,mood==='俯瞰＋目を見開く'?'above':'below');
  assert.equal(audit.camera.torso_yaw_degrees,undefined);deliveries++;
 }
 // A legacy AUTO body cannot secretly choose a back-turning default under a
 // fixed front or side camera.
 for(const angle of ['目線の高さ・正面','真横90度'])for(const random of [()=>0,()=>.4,()=>.99]){
  const raw=buildDirection([],base.mood,random,collection,{...base,angle,pose:'おまかせ'});
  assert.doesNotMatch(raw.pose,/背中/);
 }
}
assert.deepEqual(shotCameraConstraints.overhead.pitchRange,[70,85]);
assert.equal(shotCameraConstraints['crouch-low'].axes.pitch,-35,'AUTO camera geometry was rounded to a nearby public preset');
assert.equal(shotCameraConstraints['dynamic-run'].axes,undefined,'Facial right-60 degrees became a torso camera yaw');
console.log('PASS random effective directions: '+deliveries+' final production/compiled/material deliveries across both collections; AUTO rear camera, constant RNG, nonrecent expressions, all 36 angles, explicit mood preservation, compact history, finite honest reuse and no-person subjects. No images generated.');
