import assert from 'node:assert/strict';
import {applyCollection} from '../collection.js?v=28.4.5';
import {questions,resolveSelections} from '../catalog.js?v=28.4.5';
import {initialSelections} from '../modes.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {applyPose} from '../poses.js?v=28.4.5';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.5';
import {composePrompt} from '../prompt.js?v=28.4.5';
import {renderInput,renderSelectionMaterial} from '../compiled-production.js?v=28.4.5';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.5';
import {photoValues,photoReconstruction,photoDesign,isPhotographicMedium} from '../photo-design.js?v=28.4.5';
import {styleFidelity} from '../style-fidelity.js?v=28.4.5';
import {colorPolicy} from '../color-policy.js?v=28.4.5';
import {detailedMedium} from '../medium-recipes.js?v=28.4.5';
import {cameraContract,angleItems} from '../angles.js?v=28.4.5';
import {artworkBasisContract} from '../artwork-basis.js?v=28.4.5';
import {compactReferences,assertCompactHandoff,assertCompactEngineering} from './compact-handoff-assertions-v28.mjs';

// Reference filenames describe the user scenario; no reference pixels or
// image-generation runtime are inspected by this instruction regression.
const random=()=>.23,profile={displayName:'写真変換の検査作者',activityEnabled:false};
const base={sceneUnified:true,theme:'白いスタジオ',design:'通常の一枚絵',costume:'参照画像の衣装を生かす',pose:'椅子に腰掛ける',mood:'正面・首をまっすぐ',angle:'俯瞰・45度',type:'文字を一切入れない',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297'};
const includes=(text,clause,label)=>assert.ok(text.includes(clause),label+' lost: '+clause);
let photographs=0,otherMedia=0,angleCombinations=0,proportionReferences=0;
try{
 for(const collection of ['halloween','everyday']){
  applyCollection(collection);
  const presets=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values).filter(isPhotographicMedium);
  assert.deepEqual([...presets].sort(),[...photoValues].sort(),'Every photographic preset must use the reconstruction path');
  assert.equal(presets.length,15,'The original fourteen photographs plus solid-glow real remain selectable');
  for(const medium of presets)for(const noPerson of [false,true])for(const palette of ['群青 × 月白 × 銀','モノクローム','金と黒の二色']){
   const values=resolveSelections({...initialSelections(),...base,medium,palette,...(noPerson?{costume:'風景を主役にする'}:{})},random);
   const variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose);
   const plan=productionPlan(profile,values,variant,collection,random);
   const recipe=plan.conditions.find(c=>c.key==='medium');
   const photo=photoReconstruction(medium,{noPerson,values}),policy=colorPolicy(values);
   assert.ok(isPhotographicMedium(medium)&&photo,medium+' has no photography reconstruction contract');
   assert.equal(recipe.known,true);assert.equal(detailedMedium(medium,{noPerson,values}).family,'photography');
   const native=renderSelectionMaterial(plan),audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
   assert.doesNotMatch(native,/通常モードと同じ日本の描線・塗り|その同じ特徴を選択画風の線と素材で描き直す/,'Photographs must not receive generic illustration construction instructions');
   const references=[{name:noPerson?'illustrated-landscape-reference.png':'illustrated-character-reference.png',role:'identity'}];
   const prompt=composePrompt({collection,profile,values,variant:plan.variant,references:compactReferences(plan,references),edition:'ILLUSTRATION-TO-PHOTO',preparedPlan:plan});
   const result={edition:'ILLUSTRATION-TO-PHOTO',prompt,production:plan,values};
   const routes={native,audit:renderInput(plan),master:prompt,artwork:composeArtworkStage(plan),artworkRepair:composeArtworkRepair(plan),compactArtworkRepair:composeArtworkRepair(plan,{compact:true}),repair:repairPrompt(result)};
   const actual=assertCompactHandoff(plan,prompt,collection+' / '+medium+' actual photo');
   if(actual)assertCompactEngineering(plan,prompt,photo.sections,medium+' actual photo materials');
   for(const section of photo.sections){
    assert.ok(recipe.sections.some(s=>s.label===section.label&&s.text===section.text),medium+' did not prepend its photograph reconstruction recipe');
    for(const [route,text] of Object.entries(routes).filter(([route])=>!['master','repair'].includes(route)))includes(text,section.text,collection+' / '+medium+' / '+route);
    includes(recipe.execution.method,section.text,medium+' execution method');
   }
   for(const check of photo.checks)assert.ok(recipe.checks.includes(check),medium+' has no reconstruction acceptance '+check);
   const fidelity=styleFidelity(recipe,{noPerson,values}).join('\n');
   for(const section of photo.sections)includes(fidelity,section.text,medium+' style fidelity');
   assert.doesNotMatch(fidelity,/顔だけ写真、背景だけ絵画|細密な作画では瞳の色層/,'Photography must not reuse the anti-photographic drawing default');
   assert.doesNotMatch(recipe.execution.method,/redraw rather than retain a photographic face|Preserve the technique through its line, layering/,'The photographic execution must not reject photographic anatomy or require drawn line layering');
   assert.match(recipe.execution.method,/photograph|photographic|optical|撮影|光学/i);
   assert.match(audit.required_before_details.drawing_priority,/レンズ|撮影|実写/,'The leading drawing priority must construct a photograph');
   assert.doesNotMatch(audit.required_before_details.drawing_priority,/細部の精密さはその描線・色面・画材/,'The leading priority must not force illustration layers on photos');
   includes(native,audit.required_before_details.photo_reconstruction,medium+' early photographic reconstruction');
   if(actual)includes(prompt,references[0].name,medium+' supplied illustration reference');
   assert.equal(audit.camera.geometry.selected,values.angle);assert.equal(audit.camera.geometry.pitch_degrees_from_horizontal,45);
   includes(native,values.pose,medium+' selected physical pose');
   assert.equal(plan.noPerson,noPerson);assert.equal(plan.copy.mode,'none');assert.equal(audit.copy.length,0);
   for(const text of Object.values(routes))assert.doesNotMatch(text,/undefined|NaN/);
   if(noPerson){
    assert.doesNotMatch(photo.sections.map(s=>s.text).join(' '),/頭蓋|眼球|皮膚|毛髪|毛穴|基礎体格|衣服の繊維/,'Scenery photographs must not acquire a human reconstruction');
    for(const text of [native,routes.artwork])assert.doesNotMatch(text,/^顔の向き：|^身体の動き：|^身体の動作：/m);
    assert.match(audit.identity,/人物なし/);
   }else{
    assert.match(photo.sections[0].text,medium==='立体光彩リアル'?/主参照の輪郭・眉目鼻口の特徴の組合せ/:/主参照がイラスト・漫画・アニメでも/);
    assert.match(photo.sections[0].text,/年齢感・性別表現・基礎体格/);
    assert.match(photo.sections[0].text,medium==='立体光彩リアル'?/自然な頭蓋・眼球・鼻・唇・顎・首/:/人間の頭蓋・眼球・鼻・唇・顎・首/);
    const materials=medium==='立体光彩リアル'?photo.sections.find(section=>section.label==='素材と識別色'):photo.sections[1];
    assert.match(materials.text,/毛穴|産毛/);assert.match(materials.text,medium==='立体光彩リアル'?/裁断・繊維・折れ・重力/:/縫い目・繊維・重力/);
    if(medium==='立体光彩リアル'){assert.match(photo.sections.map(section=>section.text).join(' '),/閉眼/);assert.match(materials.text,/存在する髪/);}else assert.match(materials.text,/髪なし・閉眼の明示指定/);
    assert.match(audit.identity,/イラスト|漫画|アニメ/,'Identity must distinguish the illustration reference from the photographed result');
    assert.match(audit.identity,/人物|実写|撮影/);
    const colourSection=medium==='立体光彩リアル'?materials:photo.sections.find(section=>section.label==='同じ撮影空間と識別色');
    if(policy.restricted){includes(colourSection.text,policy.allowed,medium+' permitted photographic palette');assert.match(colourSection.text,/識別色も許可色の明度差へ翻訳/);assert.doesNotMatch(colourSection.text,/髪色を照明の都合で別の色へ変えない/,'Restricted palettes must not preserve source hues as an exception');}
    else{assert.match(colourSection.text,/髪と瞳などの識別に必要な基礎色は保ち/);assert.match(colourSection.text,/髪色を照明の都合で別の色へ変えない/);}
   }
   photographs++;
  }
  // Every selected view, including crops, roll, perspective and both vertical
  // axes, must coexist with the photograph's anatomy/material reconstruction.
  for(const medium of presets)for(const noPerson of [false,true])for(const {value:angle} of angleItems){
   const values=resolveSelections({...initialSelections(),...base,medium,angle,palette:colorPolicy({medium}).mode==='monochrome'?'モノクローム':'群青 × 月白 × 銀',...(noPerson?{costume:'風景を主役にする'}:{})},random);
   const variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose);
   const plan=productionPlan(profile,values,variant,collection,random),photo=photoReconstruction(medium,{noPerson,values});
   const prompt=composePrompt({collection,profile,values,variant:plan.variant,references:compactReferences(plan,noPerson?[]:[{name:'illustrated-character-reference.png',role:'identity'}]),edition:'PHOTO-CAMERA',preparedPlan:plan});
   if(assertCompactHandoff(plan,prompt,medium+' / '+angle+' actual camera'))assertCompactEngineering(plan,prompt,photo.sections,medium+' / '+angle+' actual reconstruction');
   const camera=cameraContract(values,{noPerson});
   const audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
   assert.equal(plan.values.angle,angle,'The photography preset must not replace its selected camera');
   assert.equal(audit.camera.geometry.selected,angle);
   if(Object.hasOwn(camera,'pitch_degrees_from_horizontal'))assert.equal(audit.camera.geometry.pitch_degrees_from_horizontal,camera.pitch_degrees_from_horizontal);
   if(camera.optical_axis)assert.deepEqual(audit.camera.geometry.optical_axis,camera.optical_axis);
   const optics=photoDesign(medium,{noPerson,values});
   if(/魚眼|超広角|望遠/.test(angle)){
    includes(optics.text,angle,medium+' selected optical projection');
    assert.match(optics.text,/写真プリセットの標準レンズより.*投影と遠近を優先/);
    assert.doesNotMatch(optics.text,/\d+mm|標準画角|大判標準レンズ|固定レンズ/,'A selected optical projection must replace the preset focal-length default');
   }
   for(const [route,text] of [['native',renderSelectionMaterial(plan)],['artwork',composeArtworkStage(plan)]]){
    includes(text,optics.text,medium+' / '+angle+' / '+route+' optical projection');
    for(const section of photo.sections)includes(text,section.text,medium+' / '+angle+' / '+route+' reconstruction');
    for(const instruction of camera.instructions)includes(text,instruction,medium+' / '+angle+' / '+route+' camera');
   }
   angleCombinations++;
  }
  // A photography-specific remedy must not override the selected anime, ink,
  // watercolor or material construction in unrelated presets.
  for(const medium of ['現代アニメの一枚絵','水墨画','透明水彩','クレイアート'])for(const noPerson of [false,true]){
   const values=resolveSelections({...initialSelections(),...base,medium,palette:'群青 × 月白 × 銀',...(noPerson?{costume:'風景を主役にする'}:{})},random);
   const variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose);
   const plan=productionPlan(profile,values,variant,collection,random),recipe=plan.conditions.find(c=>c.key==='medium');
   assert.equal(isPhotographicMedium(medium),false);assert.equal(photoReconstruction(medium,{noPerson,values}),null);
   assert.ok(!recipe.sections.some(s=>/イラスト参照から人物へ|イラスト参照から実物へ/.test(s.label)));
   assert.doesNotMatch(styleFidelity(recipe,{noPerson,values}).join('\n'),/実物の被写体を同じカメラで撮影した一つの像/);
   const audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
   assert.ok(!audit.required_before_details.photo_reconstruction,'A non-photo medium gained photo reconstruction');
   otherMedia++;
  }
  // Different drawn proportions identify the same character; photography must
  // translate their anatomy instead of retaining a contradictory head-ratio
  // lock at the beginning of the actual execution and repair instructions.
  for(const medium of presets)for(const name of ['two-head-chibi-character.png','ten-head-elongated-character.png']){
   const values=resolveSelections({...initialSelections(),...base,medium,palette:colorPolicy({medium}).mode==='monochrome'?'モノクローム':'群青 × 月白 × 銀'},random);
   values.sourceKind='illustration-person';
   const variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose);
   const plan=productionPlan(profile,values,variant,collection,random),recipe=plan.conditions.find(c=>c.key==='medium');
   const scope=artworkBasisContract(medium,{values}).sections[0].text;
   assert.match(scope,/識別特徴.*髪型.*年齢感.*性別表現.*基礎体格/);
   if(medium==='立体光彩リアル'){assert.match(scope,/自然な頭蓋・眼球・鼻口へ翻訳/);assert.match(scope,/基礎体格と基本頭身は主参照を保つ/);assert.match(scope,/ちび.*通常頭身へ伸ばさない/);assert.doesNotMatch(scope,/頭と胴や四肢の寸法比をそのまま固定せず/);}
   else assert.match(scope,/頭と胴や四肢の寸法比をそのまま固定せず.*自然な頭蓋・眼球・人体比率へ再構成/);
   const prompt=composePrompt({collection,profile,values,variant:plan.variant,references:compactReferences(plan,[{name,role:'identity'}]),edition:'PROPORTION-TO-PHOTO',preparedPlan:plan});
   const actual=assertCompactHandoff(plan,prompt,medium+' / '+name+' actual photographic proportion translation');
   assert.equal(actual,true,medium+' exaggerated-reference fixture must exercise photographic reconstruction rather than a blocked palette');
   for(const text of [recipe.execution.method,renderSelectionMaterial(plan),renderInput(plan),composeArtworkStage(plan),composeArtworkRepair(plan),composeArtworkRepair(plan,{compact:true})]){
    includes(text,scope,medium+' / '+name+' photographic proportion scope');
    assert.doesNotMatch(text,/基本頭身は主参照を保ち、ちびキャラなど頭身変更を明示した選択だけ/,'Photographic handoff must not lock exaggerated reference anatomy before its natural reconstruction');
   }
   includes(prompt,name,medium+' actual exaggerated-reference handoff');
   proportionReferences++;
  }
  const unchangedDrawingScope='同じ人物の識別特徴の組合せを、選択作画の線・形の整理・誇張・省略へ翻訳する。基本頭身は主参照を保ち、ちびキャラなど頭身変更を明示した選択だけを実行する。参照の写真や別画風の完成面を固定しない。';
  for(const medium of ['現代アニメの一枚絵','ちびキャラ'])assert.equal(artworkBasisContract(medium).sections[0].text,unchangedDrawingScope,'Non-photo and explicit chibi construction must retain its reference-proportion scope');
 }
}finally{applyCollection('halloween');}
assert.equal(photographs,180);assert.equal(otherMedia,16);assert.equal(angleCombinations,15*2*2*angleItems.length);
assert.equal(proportionReferences,60);
console.log('PASS illustration-to-photo instructions: 15 photographic presets × two modes × person/scenery × three palettes = '+photographs+' cases reconstruct illustrated references as optical photographs while retaining identity, selected camera/pose, coverage and color constraints; '+angleCombinations+' combinations retain reconstruction across all '+angleItems.length+' angles; '+proportionReferences+' exaggerated-reference handoffs preserve each medium contract, including the new solid real identity proportions; '+otherMedia+' non-photo cases and explicit chibi keep their own medium. No AI conversion or generated-image adherence was executed or inferred.');
