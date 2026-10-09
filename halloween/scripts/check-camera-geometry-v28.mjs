import assert from 'node:assert/strict';
import {assertCompactHandoff,containsInstruction} from './compact-handoff-assertions-v28.mjs';
import {applyCollection} from '../collection.js?v=28.4.5';
import {questions,resolveSelections} from '../catalog.js?v=28.4.5';
import {initialSelections} from '../modes.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {applyPose} from '../poses.js?v=28.4.5';
import {cameraContract} from '../angles.js?v=28.4.5';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.5';
import {composePrompt} from '../prompt.js?v=28.4.5';
import {renderInput,renderChatInput} from '../compiled-production.js?v=28.4.5';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.5';
import {sceneSourcePlace} from '../scene-presets.js?v=28.4.5';

// The failing user combination must retain a vertical optical axis in the
// native handoff, audit export, artwork stage and both image-repair routes.
const base={sceneUnified:true,theme:'空中都市',design:'パンク・フライヤー',medium:'アメコミのインク画',pose:'膝を抱えて座る',mood:'完全な左横顔90度',angle:'真上から・90度',size:'A4縦・300dpi目安｜2480×3508｜210:297',costume:'参照画像の衣装を生かす',palette:'群青 × 月白 × 銀',type:'デザインに合わせて自動編集',line:'セリフなし'};
const cases=[
 {name:'user flyer/profile/sitting',values:{},pitch:90,axis:[0,0,-1]},
 {name:'top standing/automatic face',values:{pose:'まっすぐ立つ',mood:'毎回大胆に変える'},pitch:90,axis:[0,0,-1],automaticFace:true},
 {name:'top lying',values:{pose:'仰向けに寝る',mood:'毎回大胆に変える'},pitch:90,axis:[0,0,-1],automaticFace:true},
 {name:'bottom floating',values:{angle:'真下から・90度',pose:'浮遊する',mood:'毎回大胆に変える'},pitch:-90,axis:[0,0,1],automaticFace:true},
 {name:'bottom opaque floor occlusion',values:{theme:'白いスタジオ',angle:'真下から・90度',mood:'毎回大胆に変える'},pitch:-90,axis:[0,0,1],automaticFace:true},
 // Side90 fixes azimuth. It does not independently request zero elevation.
 {name:'side sitting',values:{angle:'真横90度'},azimuth:90},
 {name:'top scenery',values:{costume:'風景を主役にする',mood:'毎回大胆に変える',pose:'おまかせ'},pitch:90,axis:[0,0,-1],noPerson:true}
];
const profile={displayName:'カメラ検査用の作者',activityEnabled:false};
const contains=(text,clause,where)=>assert.ok(text.includes(clause),where+' lost camera clause: '+clause);
let examined=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const item of cases){
  const supplied={...initialSelections(),...base,...item.values};
  for(const key of ['theme','design','medium','pose','mood','angle','size']){
   const value=supplied[key];if(value==='おまかせ'||value==='毎回大胆に変える')continue;
   const publicChoice=questions.find(q=>q.key===key).groups.some(g=>g.values.includes(value));
   if(collection==='halloween'&&key==='theme'&&['空中都市','白いスタジオ'].includes(value)){
    // These scenes were removed from the seasonal picker, while this actual
    // old user combination must remain reproducible through saved input.
    assert.equal(publicChoice,false,value+' should not return to the Halloween picker');
    assert.equal(sceneSourcePlace(value),value,value+' lost its legacy place recipe');
    assert.ok(questions.find(q=>q.key==='place').groups.some(g=>g.values.includes(value)));
   }else assert.ok(publicChoice,key+' / '+value+' is unavailable in '+collection);
  }
  const values=resolveSelections(supplied,()=>.23);
  const variant=applyPose(buildDirection([],values.mood,()=>.23,collection,values),values.pose);
  const plan=productionPlan(profile,values,variant,collection,()=>.23);
  const expected=cameraContract(values,{noPerson:!!item.noPerson});
  const structured=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
  const native=renderChatInput(plan),stage=composeArtworkStage(plan),stageRepair=composeArtworkRepair(plan),compactStageRepair=composeArtworkRepair(plan,{compact:true});
  const prompt=composePrompt({collection,profile,values,variant:plan.variant,references:[],edition:'CAMERA-GEOMETRY',preparedPlan:plan});
  const repair=repairPrompt({prompt,production:plan,values});assertCompactHandoff(plan,prompt);
  const geometry=structured.camera?.geometry;
  assert.ok(geometry,item.name+' has no camera.geometry in audit input');
  assert.equal(geometry.selected,values.angle,item.name+' changed its selected angle');
  assert.equal(geometry.pitch_degrees_from_horizontal,item.pitch,item.name+' has a different camera pitch');
  if(item.axis){
   assert.deepEqual(geometry.optical_axis,item.axis,item.name+' has a nonvertical optical axis');
   assert.equal(geometry.horizontal_component,0,item.name+' introduced a horizontal viewing component');
   assert.equal(geometry.vertical,true);
  }
  if(item.azimuth)assert.equal(geometry.azimuth_relative_to_subject_degrees,item.azimuth);
  assert.ok(structured.required_before_details.camera_geometry,item.name+' camera geometry is not required before detail');
  contains(native,structured.required_before_details.camera_geometry,item.name+' native required conditions');
  for(const clause of expected.instructions){
   for(const [where,text] of [['native',native],['artwork stage',stage],['artwork repair',stageRepair],['compact artwork repair',compactStageRepair],['complete repair',repair]])assert.ok(containsInstruction(text,clause),item.name+' / '+collection+' / '+where+' lost camera clause: '+clause);
  }
  assert.match(native,/【固定カメラ：描画前に確定】/);
  assert.ok(native.indexOf('【固定カメラ：描画前に確定】')<native.indexOf('【選択済みの仕様資料：一場面へ統合する】'),item.name+' fixes the camera only after detailed instructions');
  assert.ok(native.includes('【実画像のカメラ照合】'),item.name+' lacks output-image camera acceptance');
  const nativeAcceptance=native.split('【実画像のカメラ照合】')[1].split('【作品内へ印字する確定原稿】')[0];
  const stageAcceptance=stage.split('【画像ができてから確認すること】')[1];
  for(const check of expected.checks){contains(nativeAcceptance,check,item.name+' native image acceptance');contains(stageAcceptance,check,item.name+' artwork acceptance');contains(repair,check,item.name+' repair acceptance');}
  assert.match(nativeAcceptance,/指定を書いた事実だけで角度の達成を判定しない/);
  for(const text of [native,stage,stageRepair,compactStageRepair,prompt,repair])assert.doesNotMatch(text,/undefined|NaN/);
  assert.equal(values.place,values.theme,'A place-only scene must not regain an independent background');
  if(item.axis&&!item.noPerson){
   assert.ok(structured.required_before_details.full_body_composition,item.name+' lost the whole selected pose after angle resolution');
   for(const text of [structured.required_before_details.full_body_composition,stage]){
    assert.doesNotMatch(text,/75.?80|70.?85/,item.name+' vertical framing should not stretch a standing figure to an image-height percentage');
    assert.match(text,/遮蔽|重なり|見える/,item.name+' ignores natural body occlusion in a vertical projection');
   }
  }
  if(item.automaticFace){
   assert.doesNotMatch(plan.variant.face,/完全な[左右]横顔90度|正面0度|首の傾き0度/,'Automatic facial views must not retain a separate horizontal-camera fixed pose');
   assert.match(plan.variant.face,/固定視点|垂直視点|固定したカメラ/);
  }
  if(item.name==='user flyer/profile/sitting'){
   assert.match(structured.camera.face,/完全な左横顔90度/,'The explicit left profile cannot silently disappear');
   assert.match(native,/顔角度はカメラの方向と別/);
   assert.match(native,/衝突を短く伝え/,'An explicit conflicting face must be addressed without tilting the fixed camera');
   assert.match(native,/屋根・街区の上面/,'A top-down city must not retain an eye-level skyline');
   contains(native,values.design,'The flyer format');contains(native,values.medium,'The selected ink technique');contains(native,values.pose,'The selected sitting pose');
  }
  if(item.pitch===-90){
   assert.match(native,/支持面が視線を遮る場合/);
   assert.match(native,/床を透かしたり、座るポーズを浮遊へ変更したり/);
  }
  if(item.noPerson){
   assert.equal(plan.noPerson,true);
   assert.doesNotMatch(native,/^顔の向き：|^身体の動き：/m);
   assert.doesNotMatch(stage,/^顔の向き：|^身体の動作：/m);
   assert.doesNotMatch(expected.instructions.join(' '),/自然な頭・首/);
  }
  examined++;
 }
}
// Do not invent precise degrees for distance/crop choices that carry no angle.
for(const angle of ['顔のクローズアップ','遠景・世界を主役に','魚眼の曲面遠近']){
 const geometry=cameraContract({...base,angle});
 assert.equal(Object.hasOwn(geometry,'pitch_degrees_from_horizontal'),false,angle+' gained unrequested degree precision');
}
applyCollection('halloween');
console.log('PASS camera geometry: '+examined+' mode/pose/scene cases retain fixed optical-axis geometry in native, audit, artwork and repair inputs, top-city projection, vertical whole-pose framing and bottom-floor occlusion; automatic face presets cannot move the camera. Image-model adherence remains unverified.');
