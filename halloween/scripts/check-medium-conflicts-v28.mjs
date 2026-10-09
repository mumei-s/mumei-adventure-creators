import assert from 'node:assert/strict';
import {questions} from '../catalog.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';
import {initialSelections} from '../modes.js?v=28.4.5';
import {angleItems,cameraContract} from '../angles.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {applyPose} from '../poses.js?v=28.4.5';
import {optionRecipe} from '../option-recipes.js?v=28.4.5';
import {artworkBasis,artworkBasisValues} from '../artwork-basis.js?v=28.4.5';
import {mediumExecution} from '../medium-execution.js?v=28.4.5';
import {productionPlan} from '../production-plan.js?v=28.4.5';
import {renderInput,renderSelectionMaterial} from '../compiled-production.js?v=28.4.5';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.5';

// These are instruction-contract tests. They do not claim an image is correct
// or identify the reason an external image service refused a supplied prompt.
const profile={displayName:'作画契約監査',activityEnabled:false},random=()=>.23;
const styles=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values);
assert.equal(styles.length,mediumExecution.size);
assert.deepEqual([...styles].sort(),[...artworkBasisValues].sort());
assert.deepEqual([...styles].sort(),[...mediumExecution.keys()].sort());
const base={...initialSelections(),sceneUnified:true,medium:'クリスタルホログラム造形アニメ',
 theme:'眠らない美術館',place:'古い空中都市',costume:'アンティークの旅装',pose:'振り向く',
 mood:'静かで美しい',angle:'真横から・90度',palette:'くすみシアン × 錆 × 象牙',
 design:'新聞の一面',type:'商品広告・キャッチと特徴3点',line:'セリフなし',
 size:'A3縦・300dpi目安｜3508×4961｜297:420'};
function make(values,collection){
 const input=structuredClone(values);
 const variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose);
 const plan=productionPlan(profile,values,variant,collection,random);
 assert.deepEqual(values,input,'Recipes must not mutate the selected specification');
 return {plan,native:renderSelectionMaterial(plan),stage:composeArtworkStage(plan),repair:composeArtworkRepair(plan,{compact:true}),audit:JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0])};
}
let generalCases=0,opticalCases=0;
try{
 for(const collection of ['halloween','everyday']){
  applyCollection(collection);
  for(const [index,medium] of styles.entries())for(const noPerson of [false,true]){
   const values={...base,medium,angle:angleItems[index%angleItems.length].value,
    costume:noPerson?'風景を主役にする':base.costume,
    pose:noPerson?'おまかせ':base.pose,mood:noPerson?'毎回大胆に変える':base.mood};
   const {plan,native,stage,audit}=make(values,collection),condition=plan.conditions.find(c=>c.key==='medium');
   const recipe=optionRecipe('medium',medium,{values,noPerson,collection,variant:plan.variant});
   assert.ok(recipe.known&&condition.known,medium+' needs an individual recipe');
   for(const key of ['medium','costume','pose','mood','angle','palette','design','type','size'])assert.equal(plan.values[key],values[key],medium+' changed '+key);
   assert.deepEqual(audit.camera.geometry,cameraContract(values,{noPerson}),medium+' changed camera');
   assert.ok(native.includes(condition.execution.method),medium+' lost the native making method');
   for(const section of condition.sections)assert.ok(stage.includes(section.text),medium+' lost the artwork-stage process: '+section.label);
   if(noPerson&&medium!=='発光幻想アニメ'){
    // Before this fix the first four sections were newly prepended source
    // criteria, so the scenery-specific making process disappeared entirely.
    const own=recipe.sections.filter(s=>s.label!=='日本を基準にした個別条件'&&!s.label.startsWith('作画基準／')).slice(0,4);
    assert.ok(own.length>=3,medium+' lacks a dedicated scenery process');
    for(const section of own)assert.ok(condition.execution.method.includes(section.text),medium+' omits scenery process: '+section.label);
    assert.doesNotMatch(condition.execution.method,/BUILD THE FACE FIRST|REDRAW THE FACE FIRST|PAINT THE FACE FIRST/,medium+' gives a positive face directive to scenery');
    assert.equal(plan.noPerson,true);assert.equal(plan.variant.face,'');assert.equal(plan.variant.pose,'');
   }
   for(const source of artworkBasis(medium).references)for(const text of [native,stage]){
    assert.ok(!text.includes(source.url)&&!text.includes(source.title),medium+' copies source metadata into generation');
   }
   generalCases++;
  }
  for(const medium of ['クリスタルホログラム造形アニメ','クリスタル透光アニメ','宝石ホログラムアニメ'])for(const angle of angleItems)for(const noPerson of [false,true]){
   const values={...base,medium,angle:angle.value,costume:noPerson?'風景を主役にする':base.costume,
    pose:noPerson?'おまかせ':base.pose,mood:noPerson?'毎回大胆に変える':base.mood};
   const {plan,native,stage,repair,audit}=make(values,collection),condition=plan.conditions.find(c=>c.key==='medium');
   assert.deepEqual(audit.camera.geometry,cameraContract(values,{noPerson}));
   const text=condition.sections.map(s=>s.text).join(' ')+' '+condition.execution.method;
   assert.doesNotMatch(text,/Preserve the reference identifying facial geometry, feature spacing|参照の顔の輪郭・目鼻口の比率・年齢感を保ち/,'Fine photo measurements may not overrule anime reconstruction');
   assert.doesNotMatch(text,/髪と衣装は動作の進行方向から遅れて弧を描き|静かな姿勢でも視線・指の緊張・微かな髪の動き|近景が迫る短縮遠近、動作に遅れて流れる/,'Style may not add motion or a wide camera');
   if(!noPerson){
    assert.match(text,/被覆|coverage/,'Transparent construction must retain clothing coverage');
    assert.match(text,/覆(?:われた|う).*人体|covered body regions/,'Coverage must include occlusion, not just unchanged clothing outlines');
   }
   if(medium==='クリスタルホログラム造形アニメ'){
    assert.match(text,/厚み.*透明.*結晶|透明.*結晶.*厚み/,'The selected transparent construction must remain');
    assert.match(text,/屈折.*内部反射|internal.*reflection/);
    assert.match(text,/指定カメラ|selected.*camera/i);
    const ownMotion=condition.sections.find(s=>s.label==='飛び出す奥行きと動勢');
    assert.match(ownMotion.text,/場合だけ|場合は/,'Motion must be conditional on selected movement');
    assert.match(ownMotion.text,/投影|視点/);
   }
   for(const check of condition.checks)for(const route of [native,stage,repair])assert.ok(route.includes(check),'Optical acceptance criterion disappeared');
   opticalCases++;
  }
 }
}finally{applyCollection('halloween');}
console.log('PASS medium conflicts: '+generalCases+' all-'+styles.length+' style/mode/subject cases keep the individual scenery method, source isolation and selected axes; '+opticalCases+' optical camera/subject cases retain transparent construction without fixed facial measurements, imposed motion or reduced clothing occlusion. No generation or refusal-cause inference.');
