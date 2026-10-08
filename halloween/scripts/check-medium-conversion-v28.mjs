import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {questions} from '../catalog.js?v=28.1.2';
import {applyCollection} from '../collection.js?v=28.1.2';
import {initialSelections} from '../modes.js?v=28.1.2';
import {buildDirection} from '../direction.js?v=28.1.2';
import {applyPose} from '../poses.js?v=28.1.2';
import {productionPlan} from '../production-plan.js?v=28.1.2';
import {renderInput,renderSelectionMaterial} from '../compiled-production.js?v=28.1.2';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.1.2';
import {isPhotographicMedium,photoReconstruction} from '../photo-design.js?v=28.1.2';
import {cameraContract} from '../angles.js?v=28.1.2';

// This tests reference-conversion instructions, not image interpretation. No
// pixels are submitted: referencePhoto/referenceDrawing describe the intended
// input scenario, not a fabricated record of observing an uploaded image.
const profile={displayName:'変換契約監査',activityEnabled:false},random=()=>.21;
const styles=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values);
const subjects=['参照画像の衣装を生かす','風景を主役にする','モチーフだけで構成する','紋章・アイコンにする'];
const base={...initialSelections(),sceneUnified:true,theme:'眠らない美術館',place:'古い空中都市',
 pose:'振り向く',mood:'静かで美しい',angle:'真横90度',palette:'くすみシアン × 錆 × 象牙',
 design:'通常の一枚絵',type:'文字を一切入れない',line:'セリフなし',size:'A3縦・300dpi目安｜3508×4961｜297:420'};
const rows=new Map(styles.map(medium=>[medium,{medium,target:isPhotographicMedium(medium)?'photographic':'drawn_or_constructed',cases:[],representativeHandoffs:[],generatedImageVerification:'未実施'}]));
let cases=0,photoCases=0,drawnCases=0,noPersonCases=0;
try{
 for(const collection of ['halloween','everyday']){
  applyCollection(collection);
  for(const medium of styles)for(const costume of subjects){
   const noPerson=costume!=='参照画像の衣装を生かす',values={...base,medium,costume};
   const variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose);
   const plan=productionPlan(profile,values,variant,collection,random);
   const audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
   const routes={native:renderSelectionMaterial(plan),artwork:composeArtworkStage(plan),repair:composeArtworkRepair(plan)};
   const photographic=isPhotographicMedium(medium),photo=photoReconstruction(medium,{noPerson,values});
   const scenario=photographic?(noPerson?'drawn_scenery_to_photographic_scenery':'drawn_character_to_photographic_character'):(noPerson?'photographic_scenery_to_selected_drawing':'photographic_character_to_selected_drawing');
   assert.equal(plan.noPerson,noPerson);
   assert.equal(plan.values.medium,medium);assert.equal(plan.values.costume,costume);
   for(const key of ['pose','mood','angle','palette','design','type','size'])assert.equal(plan.values[key],values[key],medium+' changed '+key);
   assert.deepEqual(audit.camera.geometry,cameraContract(values,{noPerson}));
   const drawing=audit.required_before_details.drawing_priority;
   if(photographic){
    assert.ok(photo);assert.match(drawing,/実物の立体・材質と連続した撮影像へ再構成/);
    for(const section of photo.sections)for(const [route,text] of Object.entries(routes))assert.ok(text.includes(section.text),medium+' '+route+' lost photo reconstruction '+section.label);
    if(noPerson){
     assert.match(photo.sections[0].text,/景物・物体の外形、配置、固有模様/);
     assert.match(photo.sections[0].text,/描線|輪郭線/);
     assert.match(photo.sections[0].text,/紙面や額縁へ置換しない/);
    }else{
     assert.match(audit.identity,/同じキャラクターと識別できる実物の人物立体/);
     assert.match(audit.identity,/自然な頭蓋・眼球・皮膚・毛髪へ翻訳/);
     assert.match(photo.sections[1].text,/服は裁断・縫い目・繊維・重力で生じる皺へ再構成/);
    }
    photoCases++;
   }else{
    assert.equal(photo,null);
    assert.match(drawing,/最初の一筆から/);
    assert.match(drawing,/この画風の同じ工程で描き直す/);
    assert.match(drawing,/参照の完成した.*そのまま残す基準ではない/);
    if(!noPerson){
     assert.match(audit.identity,/特徴的な並び・年齢感・性別表現の組合せ/);
     assert.match(audit.identity,/写真の顔の立体や細かな寸法まで固定しない/);
    }
    drawnCases++;
   }
   const condition=plan.conditions.find(c=>c.key==='medium');
   assert.ok(condition.known);assert.ok(routes.native.includes(condition.execution.method));
   for(const section of condition.sections)for(const route of ['native','artwork','repair'])assert.ok(routes[route].includes(section.text),medium+' '+route+' lost its individual medium process');
   if(noPerson){
    assert.match(audit.identity,/景物・物体・図案。人物なし/);
    assert.equal(plan.variant.face,'');assert.equal(plan.variant.expression,'');assert.equal(plan.variant.pose,'');
    assert.doesNotMatch(condition.execution.method,/BUILD THE FACE FIRST|REDRAW THE FACE FIRST|PAINT THE FACE FIRST/);
    for(const text of Object.values(routes))assert.doesNotMatch(text,/^顔の向き：|^身体の動き：|^身体の動作：/m);
    noPersonCases++;
   }
   const row=rows.get(medium);
   row.cases.push({collection,subject:costume,scenario,status:'PASS',routeChecks:Object.fromEntries(Object.entries(routes).map(([route,text])=>[route,{individualMediumSections:condition.sections.every(section=>text.includes(section.text)),photographicReconstruction:photo?photo.sections.every(section=>text.includes(section.text)):null}])),assertions:['選択画風・主題・カメラ・ポーズ・配色・形式保持','参照の完成表面を固定せず画風の工程で再構成','個別作画工程がnative/artwork/repairへ伝播',noPerson?'人体の顔・表情・身体配置を非適用':'識別特徴と基礎の人物属性を保持'],evidenceType:'instruction_contract'});
   if(collection==='halloween'&&['参照画像の衣装を生かす','風景を主役にする'].includes(costume))row.representativeHandoffs.push({collection,subject:costume,scenario,selected:{medium,costume,angle:plan.values.angle,palette:plan.values.palette,theme:plan.values.theme,place:plan.values.place},compiledDrawingPriority:drawing,compiledIdentity:audit.identity,individualMediumMethod:condition.execution.method,photographicReconstruction:photo?.sections||null,sourceOfEvidence:'renderInput(plan)、renderSelectionMaterial(plan)、composeArtworkStage(plan)、composeArtworkRepair(plan)の実行値。出力画像ではない。'});
   cases++;
  }
 }
}finally{applyCollection('halloween');}
assert.equal(rows.size,108);assert.equal(cases,864);assert.equal(photoCases,96);assert.equal(drawnCases,768);assert.equal(noPersonCases,648);
const result={checkedOn:'2026-10-08',script:'scripts/check-medium-conversion-v28.mjs',status:'PASS',counts:{styles:rows.size,cases,photoCases,drawnCases,noPersonCases},limits:['参照写真→選択画風と参照イラスト→写真の命令経路を検査。写真・イラストの実ファイルの意味理解や出力ピクセルは検査していない。','PASSは生成画像の作風達成、顔の同一性、人物なしの完成画像や外部審査通過の実証ではない。'],rows:[...rows.values()]};
const output=path.resolve(process.argv[2]||'/workspace/scratch/9058838d9966/audit');
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'medium-conversion-audit-v28.json'),JSON.stringify(result,null,2)+'\n');
console.log('PASS medium conversion: '+cases+' style/mode/subject instruction routes; '+photoCases+' drawing-to-photo, '+drawnCases+' reference-surface-to-selected-drawing, '+noPersonCases+' scenery/motif/icon cases. No input-pixel interpretation or generated-image verification.');
