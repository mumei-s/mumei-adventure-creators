import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.4.2';
import {applyCollection} from '../collection.js?v=28.4.2';
import {initialSelections} from '../modes.js?v=28.4.2';
import {buildDirection} from '../direction.js?v=28.4.2';
import {applyPose} from '../poses.js?v=28.4.2';
import {angleItems,cameraContract} from '../angles.js?v=28.4.2';
import {colorPolicy} from '../color-policy.js?v=28.4.2';
import {artworkBasisValues,artworkBasis,artworkBasisContract,withArtworkBasis} from '../artwork-basis.js?v=28.4.2';
import {optionRecipe} from '../option-recipes.js?v=28.4.2';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.2';
import {renderInput,renderSelectionMaterial} from '../compiled-production.js?v=28.4.2';
import {composePrompt} from '../prompt.js?v=28.4.2';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.2';
import {imageDeliveryRepairPrompt} from '../output-contract.js?v=28.4.2';
import {selectionConflicts,candidateAvailability,compatibleResolved} from '../compatibility.js?v=28.4.2';

// Reference links document authored criteria in the picker. They are not
// external images, artists to imitate, image-call attachments or style inputs.
// Link metadata is checked here; no live crawl or image generation is performed.
const contains=(text,clause,label)=>assert.ok(text.includes(clause),label+' lost: '+clause);
const profile={displayName:'作画資料の検査',activityEnabled:false};
const random=()=>.23;
const selectedKeys=['medium','theme','place','costume','mood','angle','pose','palette','design','type','size'];
const analyzedWorldValues=new Set(['宝石光彩アニメ','宝石光彩リアル','花霞の透明アニメ','ミルキーパステルアニメ','夢彩ファンタジーアニメ','宵彩ゴシックアニメ']);
const knownValues=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values);
assert.equal(knownValues.length,115,'All existing and added public artwork choices must remain represented');
assert.equal(artworkBasisValues.length,115,'Every public artwork choice needs one documented or analyzed basis');
assert.equal(new Set(artworkBasisValues).size,115,'Artwork bases must not overwrite duplicate entries');
assert.deepEqual([...artworkBasisValues].sort(),[...knownValues].sort(),'Source coverage must match the public catalogue exactly');
assert.equal(artworkBasis('未登録の自由作風'),null,'Custom input must not inherit the last known source');
assert.equal(artworkBasisContract('未登録の自由作風'),null);

const entries=artworkBasisValues.map(value=>artworkBasis(value));
assert.equal(entries.filter(entry=>analyzedWorldValues.has(entry.value)).length,6,'Only the six added, analyzed world styles may omit documentation URLs');
assert.equal(entries.filter(entry=>!analyzedWorldValues.has(entry.value)).length,109,'The original 108 plus the new real luminous documented bases must remain represented');
const uniqueChecks=new Map();
for(const entry of entries){
 assert.equal(entry.value,artworkBasisValues.find(value=>value===entry.value));
 assert.ok(['documented','synthesis'].includes(entry.status),entry.value+' must distinguish documented technique from a synthesized style');
 const analyzedWorld=analyzedWorldValues.has(entry.value);
 for(const [field,minimum] of [['basis',3],['checks',2],['avoid',1],['references',analyzedWorld?0:1]]){
  assert.ok(Array.isArray(entry[field])&&entry[field].length>=minimum,entry.value+' lacks '+field);
  if(field!=='references')for(const text of entry[field])assert.ok(typeof text==='string'&&text.trim(),entry.value+' has an empty '+field+' clause');
 }
 if(analyzedWorld){
  assert.equal(entry.status,'synthesis',entry.value+' must identify the analyzed world basis as synthesis');
  assert.equal(entry.references.length,0,entry.value+' must not invent documentation URLs for user-provided example analysis');
  assert.ok(entry.basis.some(text=>/ユーザー.*作例.*(?:整理|分析)/.test(text)&&/合成作画基準/.test(text)),entry.value+' must disclose its user-example analysis origin');
 }
 for(const reference of entry.references){
  assert.ok(typeof reference.title==='string'&&reference.title.trim(),entry.value+' has an unnamed reference');
  const url=new URL(reference.url);
  assert.equal(url.protocol,'https:',entry.value+' source URL must use HTTPS');
  assert.ok(url.hostname.includes('.'),entry.value+' source must have a real hostname');
  assert.ok(['work','technique'].includes(reference.kind),entry.value+' source must label work versus technique');
  assert.ok(typeof reference.note==='string'&&reference.note.trim(),entry.value+' must state what its source documents');
 }
 for(const check of entry.checks){
  const owners=uniqueChecks.get(check)||new Set();owners.add(entry.value);uniqueChecks.set(check,owners);
 }
 // Repeated wrapping must not amplify the same criteria in composed recipes.
 const wrapped=withArtworkBasis({known:true,sections:[],checks:[]},entry.value,{});
 const again=withArtworkBasis(wrapped,entry.value,{});
 assert.deepEqual(again,wrapped,entry.value+' repeats source criteria after wrapping twice');
}

let checked=0,noPersonCases=0,restrictedCases=0;
try{
 for(const collection of ['halloween','everyday']){
  applyCollection(collection);
  const theme=questions.find(q=>q.key==='theme').groups.flatMap(g=>g.values)[0];
  for(const [index,medium] of knownValues.entries())for(const noPerson of [false,true])for(const palette of ['群青 × 月白 × 銀','モノクローム']){
   const input={...initialSelections(),sceneUnified:true,theme,place:'OLD_UNRELATED_SCENE',medium,
    design:'通常の一枚絵',costume:noPerson?'風景を主役にする':'参照画像の衣装を生かす',
    mood:noPerson?'毎回大胆に変える':'完全な左横顔90度',pose:noPerson?'おまかせ':'膝を抱えて座る',
    angle:angleItems[index%angleItems.length].value,palette,type:'文字を一切入れない',line:'セリフなし',
    size:'正方形アイコン｜2048×2048｜1:1'};
   const values=resolveSelections(input,random),variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose);
   const plan=productionPlan(profile,values,variant,collection,random),basis=artworkBasisContract(medium,{noPerson,values});
   const recipe=optionRecipe('medium',medium,{noPerson,values,variant:plan.variant,collection});
   const selected=plan.conditions.find(c=>c.key==='medium'),structured=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
   const prompt=composePrompt({collection,profile,values,variant:plan.variant,references:[],edition:'ARTWORK-REFERENCE',preparedPlan:plan});
   const result={edition:'ARTWORK-REFERENCE',prompt,production:plan,values};
   const routes={native:renderSelectionMaterial(plan),master:prompt,artwork:composeArtworkStage(plan),
    embedded:composeArtworkStage(plan,{embedded:true}),artworkRepair:composeArtworkRepair(plan),
    compactRepair:composeArtworkRepair(plan,{compact:true}),repair:repairPrompt(result),deliveryRepair:imageDeliveryRepairPrompt(result)};
   const label=[collection,medium,noPerson?'scenery':'person',palette].join(' / ');
   for(const key of selectedKeys)assert.equal(plan.values[key],values[key],label+' changes '+key+' to match source artwork');
   assert.equal(selected.value,medium,label+' uses another source basis');
   assert.equal(structured.drawing.medium,medium,label+' replaces the selected medium');
   assert.notEqual(values.place,'OLD_UNRELATED_SCENE',label+' adopts an unrelated reference place');
   assert.equal(plan.copy.mode,'none',label+' adds source text or signatures');
   assert.deepEqual(structured.camera.geometry,cameraContract(values,{noPerson}),label+' changes camera to match an example work');
   for(const clause of basis.sections){
    assert.ok(recipe.sections.some(section=>section.text.includes(clause.text)),label+' central recipe loses '+clause.label);
    assert.ok(selected.sections.some(section=>section.text.includes(clause.text)),label+' plan loses '+clause.label);
    for(const route of ['native','master','artwork','embedded','artworkRepair','repair','deliveryRepair'])contains(routes[route],clause.text,label+' / '+route+' / '+clause.label);
   }
   contains(selected.execution.method,basis.method,label+' image-call drawing method');
   for(const check of basis.checks){
    assert.ok(recipe.checks.includes(check),label+' central recipe loses observable source check');
    assert.ok(selected.checks.includes(check),label+' plan loses observable source check');
    for(const [route,text] of Object.entries(routes))contains(text,check,label+' / '+route+' source acceptance');
   }
   for(const [check,owners] of uniqueChecks){
    if(owners.size!==1||owners.has(medium))continue;
    assert.ok(!selected.checks.includes('作画基準の照合：'+check),label+' inherits checks from '+[...owners][0]);
   }
   // This assertion uses the actual handoff, not an independently filtered
   // fixture. Metadata titles and URLs must remain outside generation routes.
   for(const [route,text] of Object.entries(routes)){
    assert.doesNotMatch(text,/https?:\/\//,label+' / '+route+' sends documentation URLs to generation');
    for(const reference of artworkBasis(medium).references){
     assert.ok(!text.includes(reference.title),label+' / '+route+' sends an artist/work/source title to generation');
     assert.ok(!text.includes(reference.url),label+' / '+route+' sends a documentation link to generation');
    }
    assert.doesNotMatch(text,/undefined|NaN/,label+' / '+route+' has unresolved source metadata');
   }
   if(noPerson){
    assert.match(basis.sections[0].text,/人物.*(?:非適用|追加しない)|非適用.*人物/,label+' loses the no-person source guard');
    assert.equal(plan.noPerson,true);assert.equal(plan.variant.face,'');assert.equal(plan.variant.pose,'');
    assert.doesNotMatch(routes.native,/^顔の向き：|^身体の動き：/m,label+' source adds a human pose');
    assert.doesNotMatch(routes.artwork,/^顔の向き：|^身体の動作：/m,label+' source adds a human-stage instruction');
    noPersonCases++;
   }
   const color=colorPolicy(values);
   if(color.restricted){
    contains(structured.required_before_details.palette,color.allowed,label+' final allowed color rule');
    contains(routes.artwork,color.allowed,label+' artwork allowed colors');
    contains(routes.compactRepair,color.allowed,label+' compact repair allowed colors');
    restrictedCases++;
   }
   checked++;
  }
 }
}finally{applyCollection('halloween');}
console.log('PASS artwork references: all 115 distinct bases have technique/check/avoid metadata and documented/synthesis status, 109 retain documentation links and six synthesized world bases record reference analysis; '+checked+' mode/subject/palette handoffs preserve selected source criteria, '+noPersonCases+' no-person guards and '+restrictedCases+' restricted color cases. Source URLs and artist/work titles stay out of native, artwork and repair routes. Source availability and image-model adherence are not inferred by this test.');

// Explicit color choices remain reviewable conflicts. Only automatic choices
// may be replaced, so a material restriction never silently recolors a choice.
const materialColorCases=[
 {medium:'鉛筆デッサン',invalid:['ネオンピンク × シアン','セピア'],valid:['墨一色','モノクローム'],reason:/無彩色|有彩色/},
 {medium:'木炭画',invalid:['ネオンピンク × シアン','金と黒の二色'],valid:['墨一色','モノクローム'],reason:/無彩色|有彩色/},
 {medium:'サイアノタイプ',invalid:['モノクローム','金と黒の二色'],valid:['群青 × 月白 × 銀','参照画像の色を生かす'],reason:/プルシアンブルー.*紙の白/}
];
let materialColorChecks=0;
try{
 for(const collection of ['halloween','everyday']){
  applyCollection(collection);
  const concrete=resolveSelections({...initialSelections(),sceneUnified:true,medium:'実写風スタジオ写真',costume:'参照画像の衣装を生かす',mood:'正面・首をまっすぐ',pose:'膝を抱えて座る',palette:'群青 × 月白 × 銀'},random);
  for(const item of materialColorCases){
   for(const palette of item.invalid){
    const explicit={...concrete,medium:item.medium,palette},before=structuredClone(explicit);
    const resolved=resolveSelections(explicit,()=>0);
    assert.deepEqual(explicit,before,'Conflict resolution must not mutate explicit input');
    assert.equal(resolved.medium,item.medium,'An explicit material must not change to accommodate color');
    assert.equal(resolved.palette,palette,'An explicit palette must not be silently recolored');
    const conflict=selectionConflicts(resolved).find(c=>c.keys.includes('medium')&&c.keys.includes('palette'));
    assert.ok(conflict,collection+' / '+item.medium+' / '+palette+' must remain a reviewable conflict');
    assert.match(conflict.reason,item.reason,'The conflict must explain the physical color restriction');
    for(const [key,value,selection] of [['palette',palette,{medium:item.medium}],['medium',item.medium,{palette}]]){
     const availability=candidateAvailability(key,value,selection);
     assert.equal(availability.enabled,false,'Either selection order must show the conflict');
     assert.match(availability.reason,item.reason,'The disabled candidate needs its reason');
    }
    materialColorChecks++;
   }
   for(const palette of item.valid){
    assert.equal(candidateAvailability('palette',palette,{medium:item.medium}).enabled,true,'A compatible material palette remains selectable');
    assert.ok(!selectionConflicts({medium:item.medium,palette}).length,'A compatible material palette must not be rejected');
    materialColorChecks++;
   }
   const automaticPalette=resolveSelections({...concrete,medium:item.medium,palette:'おまかせ'},()=>0);
   assert.equal(automaticPalette.medium,item.medium,'An automatic palette cannot replace the explicitly selected material');
   assert.deepEqual(selectionConflicts(automaticPalette),[],'Automatic palette resolution must respect the material restriction');
   assert.equal(candidateAvailability('palette',automaticPalette.palette,{medium:item.medium}).enabled,true);
   materialColorChecks++;

   // Force an incompatible initial automatic draw to exercise the repair
   // path itself rather than relying on a lucky compatible random draw.
   const selectedPalette=item.invalid[0],drawn={...concrete,medium:item.medium,palette:selectedPalette};
   const input={...drawn,medium:'おまかせ'},beforeDrawn=structuredClone(drawn),beforeInput=structuredClone(input);
   const corrected=compatibleResolved(drawn,input,questions,()=>0);
   assert.deepEqual(drawn,beforeDrawn);assert.deepEqual(input,beforeInput);
   assert.equal(corrected.palette,selectedPalette,'Automatic medium correction must preserve the explicit palette');
   assert.notEqual(corrected.medium,item.medium,'An incompatible automatic material draw must be replaced');
   assert.deepEqual(selectionConflicts(corrected),[],'Automatic material correction must remove the color conflict');
   materialColorChecks++;
  }
 }
}finally{applyCollection('halloween');}
console.log('PASS '+materialColorChecks+' graphite/charcoal/cyanotype color compatibility cases: explicit conflicts retain both values and an explanatory reason in either selection order; compatible palettes remain selectable; automatic palette or material choices resolve without conflicts.');
