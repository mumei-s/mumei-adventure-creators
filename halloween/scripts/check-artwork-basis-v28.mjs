import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';
import {initialSelections} from '../modes.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {applyPose} from '../poses.js?v=28.4.5';
import {angleItems,cameraContract} from '../angles.js?v=28.4.5';
import {colorPolicy} from '../color-policy.js?v=28.4.5';
import {LUMINOUS_WORLD_MEDIUM,luminousWorldContract} from '../luminous-world.js?v=28.4.5';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.5';
import {composePrompt} from '../prompt.js?v=28.4.5';
import {renderInput,renderSelectionMaterial} from '../compiled-production.js?v=28.4.5';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.5';
import {imageDeliveryRepairPrompt,selectionIntegrationInstructions} from '../output-contract.js?v=28.4.5';
import {compactReferences,assertCompactHandoff,assertCompactEngineering} from './compact-handoff-assertions-v28.mjs';

// This exercises the actual specification and delivery paths. It does not
// synthesize a prompt with AI, generate an image or infer visual success.
const profile={displayName:'作画基準検査',activityEnabled:false};
const random=()=>.23;
const contains=(text,clause,where)=>assert.ok(text.includes(clause),where+' lost: '+clause);
const makeValues=(collection,medium,{angle='斜め前45度',noPerson=false,palette='群青 × 月白 × 銀',costume,proportions}={})=>{
 const theme=questions.find(q=>q.key==='theme').groups.flatMap(g=>g.values)[0];
 const resolved=resolveSelections({...initialSelections(),sceneUnified:true,theme,place:'UNRELATED_LEGACY_PLACE',medium,angle,
  design:'パンク・フライヤー',costume:costume||(noPerson?'風景を主役にする':'参照画像の衣装を生かす'),
  pose:noPerson?'おまかせ':'膝を抱えて座る',mood:noPerson?'毎回大胆に変える':'完全な左横顔90度',
  palette,type:'文字を一切入れない',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297',
  },random);
 return {...resolved,...(proportions?{proportions}:{})};
};
const makePlan=(collection,values)=>productionPlan(profile,values,applyPose(buildDirection([],values.mood,random,collection,values),values.pose),collection,random);
const outputs=(collection,plan)=>{
 const prompt=composePrompt({collection,profile,values:plan.values,variant:plan.variant,references:compactReferences(plan),edition:'ARTWORK-BASIS',preparedPlan:plan});
 const result={edition:'ARTWORK-BASIS',prompt,production:plan,values:plan.values};
 return {native:renderSelectionMaterial(plan),audit:renderInput(plan),master:prompt,artwork:composeArtworkStage(plan),
  embedded:composeArtworkStage(plan,{embedded:true}),artworkRepair:composeArtworkRepair(plan),
  compactRepair:composeArtworkRepair(plan,{compact:true}),repair:repairPrompt(result),deliveryRepair:imageDeliveryRepairPrompt(result)};
};
const audit=plan=>JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
const assertSelectionPreserved=(values,plan,label)=>{
 for(const key of ['medium','angle','pose','mood','costume','theme','place','palette','design','type','size'])
  assert.equal(plan.values[key],values[key],label+' silently changed '+key);
 assert.notEqual(plan.values.place,'UNRELATED_LEGACY_PLACE',label+' restored an unrelated place');
 assert.ok(!plan.conditions.some(c=>c.key==='place'),label+' reintroduced a second scene chooser');
 const structured=audit(plan),camera=cameraContract(values,{noPerson:plan.noPerson});
 assert.deepEqual(structured.camera?.geometry??null,camera,label+' changed camera projection to fit the artwork basis');
 assert.equal(plan.copy.mode,'none',label+' added text for a flyer despite the text-off selection');
 assert.equal(structured.copy.length,0,label+' added an unpermitted manuscript');
 assert.equal(structured.drawing.medium,values.medium,label+' replaced the selected rendering basis');
 assert.equal(plan.conditions.find(c=>c.key==='medium').value,values.medium,label+' changed its selected recipe');
 if(plan.noPerson){
  assert.equal(plan.variant.face,'',label+' adds a face');assert.equal(plan.variant.pose,'',label+' adds a body action');
 }else if(values.costume==='人魚'){
  assert.match(plan.variant.pose,/一本の魚尾|一本の魚|魚尾/,label+' reverts the selected nonhuman body');
 }else contains(plan.variant.pose,values.pose,label+' selected pose');
};

assert.match(selectionIntegrationInstructions.join(' '),/作画基準/,'The handoff must explain the selected artwork basis to ChatGPT');
assert.equal(LUMINOUS_WORLD_MEDIUM,'発光幻想アニメ');

let otherMedia=0,luminousCases=0,nonhumanCases=0,automaticOrCustom=0,visibleDetailCases=0;
try{
 // No recipe should acquire the luminous-world pipeline merely because the
 // scene is Halloween, a photo reference was supplied or the label changed.
 for(const collection of ['halloween','everyday']){
  applyCollection(collection);
  const media=questions.find(q=>q.key==='medium').groups.flatMap(g=>g.values);
  assert.equal(new Set(media).size,media.length,'Artwork basis choices must remain distinct');
  for(const [index,medium] of media.entries())for(const noPerson of [false,true]){
   const values=makeValues(collection,medium,{noPerson,angle:angleItems[index%angleItems.length].value});
   const plan=makePlan(collection,values),native=renderSelectionMaterial(plan),label=[collection,medium,noPerson?'scenery':'person'].join(' / ');
   assertSelectionPreserved(values,plan,label);
   const contract=luminousWorldContract(values,{noPerson,variant:plan.variant});
   if(![LUMINOUS_WORLD_MEDIUM,'発光幻想リアル'].includes(medium)){
    assert.equal(contract,null,label+' inherited the luminous-world contract');
    assert.ok(!plan.conditions.find(c=>c.key==='medium').sections.some(s=>/発光幻想世界の|発光世界の6|発光世界の四|発光世界の4/.test(s.label)),label+' inherited the dedicated luminous recipe');
   }else assert.ok(contract,label+' lost its dedicated recipe');
   contains(native,plan.conditions.find(c=>c.key==='medium').execution.method,label+' selected drawing process');
   if(medium.startsWith('実写風')){
    assert.ok(audit(plan).required_before_details.photo_reconstruction,label+' lost illustration-to-photograph reconstruction');
    assert.match(native,/イラスト.*(?:描線|セル)|描線.*撮影像/,label+' treats an illustration as immutable photo material');
   }
   if(medium==='ちびキャラ'&&!noPerson){
    assert.match(plan.conditions.find(c=>c.key==='medium').execution.method,/two-to-three|低い頭身|2.?3頭身/,label+' lost the chosen chibi proportions');
    assert.match(native,/比率整理・誇張・省略|頭身.*(?:整理|短)|頭部を大きく/,label+' silently normalizes the selected chibi');
   }
   otherMedia++;
  }
 }
 // Every camera family must constrain the four depth layers; limited color,
 // natural support and a nonhuman subject cannot be overridden for spectacle.
 for(const collection of ['halloween','everyday']){
  applyCollection(collection);
  for(const angle of angleItems)for(const noPerson of [false,true])for(const palette of ['群青 × 月白 × 銀','モノクローム','金と黒の二色']){
   const values=makeValues(collection,LUMINOUS_WORLD_MEDIUM,{angle:angle.value,noPerson,palette});
   const plan=makePlan(collection,values),routes=outputs(collection,plan),contract=luminousWorldContract(values,{noPerson,variant:plan.variant});
   const label=[collection,angle.value,noPerson?'scenery':'person',palette].join(' / ');
   if(assertCompactHandoff(plan,routes.master,label+' actual master'))assertCompactEngineering(plan,routes.master,contract.sections,label+' actual luminous making');
   assertSelectionPreserved(values,plan,label);
   assert.ok(contract.sections.length>=5,label+' lost the supplied drawing stages');
   assert.ok(contract.checks.length>=4,label+' lost the observable image acceptance conditions');
   const condition=plan.conditions.find(c=>c.key==='medium');
   for(const section of contract.sections){
    assert.ok(condition.sections.some(s=>s.text.includes(section.text)),label+' omitted luminous recipe '+section.label);
    for(const name of ['native','audit','artwork','embedded','artworkRepair'])contains(routes[name],section.text,label+' / '+name+' / '+section.label);
   }
   for(const check of contract.checks)
    for(const [name,text] of Object.entries(routes).filter(([name])=>!['master','repair','deliveryRepair'].includes(name)))contains(text,check,label+' / '+name+' acceptance');
   contains(condition.execution.method,contract.method,label+' dedicated rendering method');
   contains(plan.variant.light,contract.lighting.slice(contract.lighting.indexOf('の位置と向きを先に決め')),label+' scene lighting');
   contains(plan.variant.depth,contract.depth,label+' camera-constrained depth');
   const materialText=contract.sections.map(s=>s.text).join(' ');
   assert.match(materialText,/透明.*(?:色層|塗り)|(?:色層|塗り).*透明/,label+' drops transparent painted layers');
   assert.match(materialText,/反射/,label+' drops reflected light');
   assert.match(materialText,/発光/,label+' drops localized light emission');
   assert.match(materialText,/材質|素材/,label+' replaces real material structure with glow');
   assert.match(materialText,/小さ|極小|鋭/,label+' replaces restrained highlights with global bloom');
   assert.match(contract.preservation+' '+contract.depth,/カメラ|アングル/,label+' cannot preserve the selected camera');
   assert.match(contract.preservation,/舞台|場面|シーン/,label+' cannot preserve the selected scene');
   const color=colorPolicy(values);
   if(color.restricted){
    assert.match(contract.palette,/許可|限定|選択/,label+' removes explicit palette restrictions');
    contains(materialText,color.dark,label+' deep allowed shadow');
    contains(materialText,color.bright,label+' brightest allowed highlight');
    assert.doesNotMatch(materialText,/シアン・菫・マゼンタ・淡金|シアン・菫・桃・淡金|虹色の(?:光|帯|層)を(?:描|加|使)/,label+' adds unpermitted spectral hues');
   }
   if(noPerson){
    assert.doesNotMatch(materialText,/顔の外形・眼瞼・鼻口を|眼瞼.*虹彩.*描|髪.*束.*描|人体を.*(?:描|作)|手足を追加する/,label+' imposes human drawing stages on scenery');
    for(const text of [routes.native,routes.artwork])assert.doesNotMatch(text,/^顔の向き：|^身体の動き：|^身体の動作：/m,label+' adds a human pose in delivery');
   }else{
    assert.match(contract.preservation,/ちび.*頭身|頭身.*ちび/,label+' normalizes a chibi reference merely to fit luminous anatomy');
    assert.match(contract.preservation,/ポーズ|姿勢/,label+' cannot preserve chosen support and pose');
   }
   for(const text of Object.values(routes))assert.doesNotMatch(text,/undefined|NaN|\{(?:surface|focal|bright|dark|interference)\}/,label+' contains unresolved production placeholders');
   luminousCases++;
  }
  for(const angle of ['真上から・90度','真下から・90度','顔のクローズアップ','全身・周囲も見せる'])for(const palette of ['モノクローム','金と黒の二色']){
   const values=makeValues(collection,LUMINOUS_WORLD_MEDIUM,{angle,palette,costume:'人魚',proportions:'2頭身・頭と胴の比率1:1'});
   const plan=makePlan(collection,values),contract=luminousWorldContract(values,{variant:plan.variant}),routes=outputs(collection,plan);
   assertSelectionPreserved(values,plan,collection+' / luminous mermaid / '+angle);
   contains(contract.preservation,values.proportions,'An explicitly supplied body proportion');
   for(const name of ['native','master','artwork','embedded','artworkRepair','repair','deliveryRepair'])contains(routes[name],values.proportions,name+' explicitly supplied proportion');
   nonhumanCases++;
  }
  for(const angle of ['場面に合わせたアングル','水面の高さで左斜め20度・膝まで'])for(const noPerson of [false,true]){
   const values=makeValues(collection,LUMINOUS_WORLD_MEDIUM,{angle,noPerson,palette:'モノクローム'});
   const plan=makePlan(collection,values),contract=luminousWorldContract(values,{noPerson,variant:plan.variant}),routes=outputs(collection,plan);
   assertSelectionPreserved(values,plan,collection+' / automatic or custom camera / '+angle);
   contains(contract.depth,values.angle,'The resolved automatic/custom selected camera');
   if(angle==='場面に合わせたアングル')assert.ok(angleItems.some(item=>item.value===values.angle),'AUTO camera must become a real compatible angle');
   else assert.equal(values.angle,angle,'A custom explicit camera must retain its literal requirement');
   if(assertCompactHandoff(plan,routes.master,'automatic/custom actual master'))assertCompactEngineering(plan,routes.master,contract.sections,'automatic/custom actual luminous making');
   for(const check of contract.checks)for(const [name,text] of Object.entries(routes).filter(([name])=>!['master','repair','deliveryRepair'].includes(name)))contains(text,check,name+' automatic/custom camera luminous acceptance');
   if(!['真上から・90度','真下から・90度'].includes(values.angle))assert.doesNotMatch(contract.depth,/光軸は垂直のまま/,'A nonvertical resolved camera must not inherit a fixed vertical axis');
   automaticOrCustom++;
  }
  // The supplied iris/hair layer applies only to existing, visible details.
  // Closed eyes and hairless references cannot be undone to add highlights.
  for(const closedEyes of [false,true])for(const noHair of [false,true]){
   const values={...makeValues(collection,LUMINOUS_WORLD_MEDIUM,{angle:'顔のクローズアップ',palette:'モノクローム'}),
    mood:closedEyes?'目を閉じて安らぐ':'正面＋満面の笑顔',...(noHair?{hair:'スキンヘッド'}:{})};
   const plan=makePlan(collection,values),contract=luminousWorldContract(values,{variant:plan.variant}),routes=outputs(collection,plan);
   const visible=contract.sections.find(s=>s.label==='見える瞳・髪・肌の光層');
   assert.ok(visible,'Person-only visible detail stage must exist');
   if(closedEyes){
    assert.match(visible.text,/閉眼を保ち/,'The iris stage must respect closed eyes');
    assert.doesNotMatch(visible.text,/開いて実際に見える目だけに/,'The closed-eye stage must not also order an open iris');
   }else assert.match(visible.text,/開いて実際に見える目だけに/,'The iris stage must be limited to visible open eyes');
   if(noHair){
    assert.match(visible.text,/髪なしの指定を保ち/,'The hair stage must respect a hairless reference');
    assert.doesNotMatch(visible.text,/髪は大・中・小の束を組み/,'The hairless stage must not create hair for luminous layers');
   }
   for(const name of ['native','audit','artwork','embedded','artworkRepair'])contains(routes[name],visible.text,name+' selected eye/hair applicability');
   if(assertCompactHandoff(plan,routes.master,'visible detail actual master'))assertCompactEngineering(plan,routes.master,[visible],'actual selected eye/hair applicability');
   visibleDetailCases++;
  }
 }
}finally{applyCollection('halloween');}
console.log('PASS artwork basis: '+otherMedia+' all-media mode/subject cases, '+luminousCases+' all-camera/person/scenery/palette luminous-world handoffs, '+nonhumanCases+' explicit-proportion mermaid cases, '+automaticOrCustom+' automatic/custom-camera cases and '+visibleDetailCases+' eye/hair applicability cases. Selected camera, pose, scene, restricted colors, text-off and rendering basis survive native, artwork and repair delivery. AI synthesis and image-model adherence remain unverified.');
