import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.3.0';
import {applyCollection} from '../collection.js?v=28.3.0';
import {initialSelections} from '../modes.js?v=28.3.0';
import {buildDirection} from '../direction.js?v=28.3.0';
import {applyPose} from '../poses.js?v=28.3.0';
import {optionRecipe} from '../option-recipes.js?v=28.3.0';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.3.0';
import {composePrompt} from '../prompt.js?v=28.3.0';
import {renderInput,renderSelectionMaterial} from '../compiled-production.js?v=28.3.0';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.3.0';
import {isPhotographicMedium,photoReconstruction} from '../photo-design.js?v=28.3.0';
import {cameraContract} from '../angles.js?v=28.3.0';
import {colorPolicy} from '../color-policy.js?v=28.3.0';
import {artworkBasis,artworkBasisContract} from '../artwork-basis.js?v=28.3.0';
import {referenceWorldMapping,referenceWorldMediumContract,referenceWorldSceneRecipe} from '../world-bases.js?v=28.3.0';

// Verify the actual handoff contracts, not a generated image. No sample pixels
// or invented interpretation of a reference image is used by these checks.
const media=['宝石光彩アニメ','宝石光彩リアル','花霞の透明アニメ','ミルキーパステルアニメ','夢彩ファンタジーアニメ','宵彩ゴシックアニメ'];
const scenes=['星糸のアトリエ','星空メルヘン','水鏡の幻想空間','花光のガラス庭園','ふわ彩の祝祭室','和雅・花景','夢彩の魔法書庫','宵彩の色硝子堂','街角アニメ日和'];
const palettes=['夜紺 × 翡翠 × 蛍光緑','群青 × 菫 × 星白','モノクローム','金と黒の二色','黒と白と朱の三色'];
const subjects=['参照画像の衣装を生かす','風景を主役にする','モチーフだけで構成する','紋章・アイコンにする'];
const random=()=>.23,profile={displayName:'世界作画の契約検査',activityEnabled:false};
const valuesBase={sceneUnified:true,design:'通常の一枚絵',medium:media[0],theme:scenes[0],
 costume:subjects[0],pose:'膝を抱えて座る',mood:'目を閉じて安らぐ',angle:'真上から・90度',
 palette:palettes[0],type:'文字を一切入れない',line:'セリフなし',
 size:'A4縦・300dpi目安｜2480×3508｜210:297',hair:'髪なし',proportions:'2頭身のちびキャラ'};
const choices=key=>questions.find(question=>question.key===key).groups.flatMap(group=>group.values);
const contains=(text,clause,label)=>assert.ok(text.includes(clause),label+' lost required clause: '+clause);
let cases=0,photoCases=0,sceneryCases=0;

function inspect(supplied,collection){
 const values=resolveSelections({...initialSelections(),...valuesBase,...supplied},random);
 // These optional reference facts are contract inputs, not catalog choices.
 // resolveSelections intentionally samples the public catalog keys only.
 values.hair=supplied.hair??valuesBase.hair;
 values.proportions=supplied.proportions??valuesBase.proportions;
 const variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose);
 const plan=productionPlan(profile,values,variant,collection,random);
 const audit=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
 const prompt=composePrompt({profile,values,variant:plan.variant,collection,preparedPlan:plan,
  references:plan.noPerson?[]:[{name:'character-reference.png',role:'identity'}],edition:'REFERENCE-WORLD'});
 const routes={native:renderSelectionMaterial(plan),prompt,artwork:composeArtworkStage(plan),
  embedded:composeArtworkStage(plan,{embedded:true}),artworkRepair:composeArtworkRepair(plan),
  repair:repairPrompt({prompt,production:plan,values})};
 const label=collection+' / '+values.medium+' / '+values.theme+' / '+values.costume+' / '+values.palette;
 const medium=plan.conditions.find(condition=>condition.key==='medium');
 const scene=plan.conditions.find(condition=>condition.key==='theme');
 assert.equal(medium.known,true,label+' has no authored medium prescription');
 assert.equal(scene.known,true,label+' has no authored world prescription');
 assert.ok(medium.sections.length>=4,label+' collapsed its drawing process into a generic sentence');
 assert.ok(scene.sections.length>=3,label+' collapsed its world into an atmospheric adjective');
 for(const key of ['medium','theme','costume','pose','mood','angle','palette','design','type','size','hair','proportions']){
  assert.equal(plan.values[key],values[key],label+' changed selected '+key);
 }
 assert.deepEqual(audit.camera.geometry,cameraContract(values,{noPerson:plan.noPerson}),label+' changed the camera');
 for(const [route,text] of Object.entries(routes)){
  assert.doesNotMatch(text,/undefined|NaN/,label+' / '+route+' has unresolved output');
  contains(text,values.medium,label+' / '+route);
  contains(text,colorPolicy(values).allowed,label+' / '+route+' palette');
  for(const section of medium.sections)contains(text,section.text,label+' / '+route+' / '+section.label);
  if(route!=='artworkRepair')for(const section of scene.sections)contains(text,section.text,label+' / '+route+' / '+section.label);
  for(const instruction of cameraContract(values,{noPerson:plan.noPerson}).instructions)contains(text,instruction,label+' / '+route);
 }
 contains(routes.native,medium.execution.method,label+' native execution');
 for(const check of medium.checks)contains(routes.artworkRepair,check,label+' repair acceptance');
 for(const check of scene.checks)contains(routes.repair,check,label+' scene repair acceptance');
 const photo=photoReconstruction(values.medium,{noPerson:plan.noPerson,values});
 if(values.medium==='宝石光彩リアル'){
  assert.equal(isPhotographicMedium(values.medium),true,label+' failed to enter the photographic route');
  assert.equal(optionRecipe('medium',values.medium,{values,noPerson:plan.noPerson}).family,'photography',label+' lost the photographic family used by compatibility');
  assert.ok(photo,label+' has no photographic reconstruction');
  assert.match(audit.required_before_details.drawing_priority,/実物の立体|実物の.*材質|撮影像/);
  for(const section of photo.sections)for(const [route,text] of Object.entries(routes))contains(text,section.text,label+' / '+route+' photo reconstruction');
  photoCases++;
 }else{
  assert.equal(isPhotographicMedium(values.medium),false,label+' entered the photo route');
  assert.equal(photo,null,label+' received photography instructions');
  assert.match(audit.required_before_details.drawing_priority,/最初の一筆から/);
  const drawing=medium.sections.map(section=>section.text).join(' ');
  assert.match(drawing,/2D|アニメ/,label+' lost anime drawing');
  assert.match(drawing,/描線|線画|色線/,label+' lost drawn outlines');
  if(!plan.noPerson){
   assert.match(drawing,/顔/,label+' left the face outside the style');
   assert.ok(/全域|主題.*背景|身体|全身/.test(drawing),label+' left the body outside the style');
   assert.match(medium.execution.method,/face, hair, body, clothing and background/,label+' applies the medium only to the background');
  }
 }
 if(plan.noPerson){
  assert.equal(plan.variant.face,'');assert.equal(plan.variant.expression,'');assert.equal(plan.variant.pose,'');
  assert.match(audit.identity,/人物なし/);
  assert.doesNotMatch(medium.execution.method,/BUILD THE FACE FIRST|REDRAW THE FACE FIRST|PAINT THE FACE FIRST/);
  assert.doesNotMatch(medium.sections.map(section=>section.label).join(' / '),/顔の造形|顔の線と色面|見える瞳|存在する髪/);
  if(media.includes(values.medium)){
   const basis=artworkBasisContract(values.medium,{noPerson:true,values});
   assert.ok(!/顔の輪郭と上眼瞼|描いた眼瞼|自然な実写の顔立ち|見える肌の全域|閉じた瞼へ虹彩/.test(basis.method),label+' scenery basis still constructs human features');
  }
  for(const text of Object.values(routes))assert.doesNotMatch(text,/^顔の向き：|^身体の動き：|^身体の動作：/m);
  sceneryCases++;
 }else{
  assert.match(plan.variant.expression,/目を閉じ|閉眼|つむ/);
  for(const route of ['native','prompt','artwork','embedded','repair']){
   contains(routes[route],plan.variant.expression,label+' / '+route+' closed eyes');
   contains(routes[route],plan.variant.pose,label+' / '+route+' selected support/pose');
  }
  assert.match(audit.identity,/識別|同じキャラクター/);
  if(media.includes(values.medium)){
   const contract=referenceWorldMediumContract(values.medium,{values,variant:plan.variant});
   const features=contract.sections.find(section=>section.label.endsWith('見える表情と髪の条件'));
   assert.ok(features,label+' has no visibility-aware feature contract');
   assert.ok(/閉眼.*保ち.*開いた目を描かない/.test(features.text),label+' may open the selected closed eyes');
   assert.ok(/髪なし.*保ち.*髪を追加しない/.test(features.text),label+' may add hair to a hairless reference');
   contains(contract.preservation,values.proportions,label+' selected chibi proportions');
   for(const route of ['native','prompt','artwork','embedded','artworkRepair','repair']){
    contains(routes[route],features.text,label+' / '+route+' visible feature rules');
    contains(routes[route],contract.preservation,label+' / '+route+' identity/coverage/proportions');
   }
   if(values.medium.startsWith('宝石光彩')){
    const surface=contract.sections.find(section=>section.label.endsWith('焦点にも届く鋭い光'));
    assert.ok(surface,label+' lost the visible-surface light contract');
    assert.ok(/顔・耳・首・肩・腕・手・脚・足/.test(surface.text),label+' restricts light to face and hands');
    assert.ok(/各素材|材質別/.test(surface.text),label+' applies the same sparkle to every material');
    assert.ok(/被覆.*変更せず|露出を増やさない/.test(surface.text),label+' exposes covered body parts to add light');
    for(const text of Object.values(routes))contains(text,surface.text,label+' visible skin/clothing/environment light');
   }else{
    assert.ok(!contract.sections.some(section=>section.label.endsWith('焦点にも届く鋭い光')),label+' inherited the separate jewel-skin requirement');
   }
  }
 }
 if(media.includes(values.medium)){
  const contract=referenceWorldMediumContract(values.medium,{values,noPerson:plan.noPerson,variant:plan.variant});
  contains(contract.palette,colorPolicy(values).allowed,label+' variable palette');
  assert.ok(/見本の配色を固定しない/.test(contract.palette),label+' fixes the sample palette');
  if(colorPolicy(values).restricted)assert.ok(/限定色の外の白や虹色を追加しない/.test(contract.palette),label+' requires a foreign highlight or rainbow colour');
  const avoid=artworkBasis(values.medium).avoid.join(' ');
  assert.ok(/作例の人物.*衣装.*移植/.test(avoid),label+' does not prohibit importing sample people/clothes');
 }
 for(const text of Object.values(routes))for(const example of referenceWorldMapping)assert.ok(!text.includes(example.filename),label+' supplied a UI sample as a generation reference');
 cases++;
 return {plan,audit,routes,medium,scene};
}

try{
 applyCollection('everyday');
 for(const medium of media)assert.ok(choices('medium').includes(medium),'Everyday picker lost '+medium);
 for(const scene of scenes)assert.ok(choices('theme').includes(scene),'Everyday picker lost '+scene);
 // Every world/media pair is tested with two different selected palettes and
 // three restricted palettes, plus each public non-human subject choice.
 for(const medium of media)for(const theme of scenes){
  for(const palette of palettes)inspect({medium,theme,palette},'everyday');
  for(const costume of subjects.slice(1))inspect({medium,theme,costume,pose:'おまかせ',mood:'毎回大胆に変える'},'everyday');
  const primary=optionRecipe('theme',theme,{collection:'everyday',values:{...valuesBase,medium,theme},noPerson:false});
  const changed=optionRecipe('theme',theme,{collection:'everyday',values:{...valuesBase,medium,theme,costume:'竜人',pose:'四つん這いで進む'},noPerson:false});
  const world=referenceWorldSceneRecipe(theme,{values:{...valuesBase,medium,theme}});
  assert.deepEqual(primary.sections.slice(0,3),changed.sections.slice(0,3),theme+' bound the world core to a person, clothing or body pose');
  assert.deepEqual(primary.sections.slice(0,3),world.sections.slice(0,3),theme+' lost its authored environment core');
  assert.deepEqual(primary.checks,changed.checks,theme+' bound world acceptance to a person, clothing or body pose');
 }
 assert.equal(referenceWorldMapping.length,9,'The nine independent reference genres are incomplete');
 assert.deepEqual(new Set(referenceWorldMapping.map(item=>item.scene)),new Set(scenes),'The nine genres lost their individual environments');
 for(const item of referenceWorldMapping){
  assert.equal(item.mediumRole,'classification-only',item.filename+' made a reference classification into a drawing instruction');
  assert.equal(item.forceMedium,false,item.filename+' can overwrite the independently selected medium');
  assert.ok(!item.medium.startsWith('宝石光彩'),item.filename+' was incorrectly bound to a separate jewel medium');
  assert.ok(choices('medium').includes(item.medium),item.filename+' has no selectable independent medium');
  const {medium}=inspect({medium:item.medium,theme:item.scene},'everyday');
  assert.ok(!medium.sections.some(section=>section.label.endsWith('焦点にも届く鋭い光')),item.filename+' inherited the jewel-skin requirement');
 }
 applyCollection('halloween');
 for(const medium of media)assert.ok(choices('medium').includes(medium),'Halloween picker lost '+medium);
 for(const scene of scenes)assert.ok(!choices('theme').includes(scene),scene+' improperly replaced a seasonal Halloween scene');
 for(const medium of media)for(const costume of [subjects[0],subjects[1]])inspect({medium,theme:'宇宙のHalloween',costume,
  ...(costume===subjects[1]?{pose:'おまかせ',mood:'毎回大胆に変える'}:{})},'halloween');
}finally{applyCollection('halloween');}

assert.equal(cases,453);
assert.equal(photoCases,74);
assert.equal(sceneryCases,168);
console.log('PASS reference worlds: '+cases+' selected medium/world/subject/palette cases retain authored recipes through native, master prompt, artwork and repair; '+photoCases+' real-photo routes and '+sceneryCases+' no-person cases. Checks cover selected camera, pose and closed eyes, variable/restricted palettes and worlds independent of costume/pose. Reference-pixel identity and generated-image appearance remain unverified.');
