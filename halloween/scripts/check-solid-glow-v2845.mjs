import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {questions} from '../catalog.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {applyPose} from '../poses.js?v=28.4.5';
import {compileProduction} from '../compiled-production.js?v=28.4.5';
import {renderCompactChatInput} from '../compact-production.js?v=28.4.5';
import {focusedMedia,renderFocusedChatInput,renderFocusedRepairPrompt,identityPreparationStage,renderIdentityPreparationPrompt,renderIdentityRepairPrompt} from '../focused-production.js?v=28.4.5';
import {optionalIdentityPrompts,stagePrompts} from '../production-workflow.js?v=28.4.5';
import {stylePresets,stylePresetFor,loadStylePresets} from '../style-presets.js?v=28.4.5';
import {deliveryImageFiles} from '../drawing-references.js?v=28.4.5';
import {selectionReferenceManifest,selectionReferenceCounts,individualSelectionReferenceManifest,buildIndividualSelectionReferenceZip} from '../selection-references.js?v=28.4.5';
import {solidGlowStyleDefinitions} from '../solid-glow-style-definitions.js?v=28.4.5';
import {isPhotographicMedium} from '../photo-design.js?v=28.4.5';
import {colorPolicy} from '../color-policy.js?v=28.4.5';
import {readRasterDimensions} from '../image-resources.js?v=28.4.5';
import {assertWorldTransferHandoff} from './world-transfer-handoff-assertions-v2845.mjs';

const root=new URL('../',import.meta.url),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const oldPresets=JSON.parse(fs.readFileSync(new URL('./fixtures/style-presets-baseline-118-v2845.json',import.meta.url)));
assert.equal(oldPresets.length,118);
assert.equal(stylePresets.length,120,'The two new volumetric media are independent additions');
for(let index=0;index<oldPresets.length;index++){
 const expected=oldPresets[index],actual=stylePresets[index];
 for(const key of ['medium','file','name','role'])assert.equal(actual[key],expected[key],'Original preset '+(index+1)+' changed '+key);
 assert.equal(hash(fs.readFileSync(new URL(actual.file,root))),expected.sha256,'An original preset image was replaced');
 assert.deepEqual(stylePresetFor(expected.medium),actual,'An original public lookup changed');
}
const newStyles=[
 {medium:'立体光彩アニメ',name:'style-preset-119.png',file:'assets/style-solid-glow-anime-v28-4-5.png',rendering:'solid-anime',photo:false},
 {medium:'立体光彩リアル',name:'style-preset-120.png',file:'assets/style-solid-glow-real-v28-4-5.png',rendering:'solid-real',photo:true}
];
assert.deepEqual(stylePresets.slice(118).map(({medium,name,file})=>({medium,name,file})),newStyles.map(({medium,name,file})=>({medium,name,file})));
const publicMedia=questions.find(question=>question.key==='medium').groups.flatMap(group=>group.values);
assert.equal(publicMedia.length,120);assert.equal(new Set(publicMedia).size,120);
for(const item of newStyles){
 const definition=solidGlowStyleDefinitions.find(definition=>definition.value===item.medium);
 assert.ok(definition);assert.equal(definition.rendering,item.rendering);assert.equal(definition.file,item.file);
 assert.ok(focusedMedia.includes(item.medium));assert.equal(isPhotographicMedium(item.medium),item.photo);
 for(const key of ['drawing','drawingScenery','personDrawing','lighting','lightingScenery','materials','materialsScenery'])assert.ok(definition[key]?.length>30,item.medium+' lacks '+key);
 assert.ok(definition.sourceNote&&definition.references?.length,'The new rendering needs an explicit provenance and limits');
}
const fetchImpl=async url=>new Response(fs.readFileSync(url),{headers:{'Content-Type':url.pathname.endsWith('.png')?'image/png':'image/jpeg'}});
const loaded=await loadStylePresets(newStyles.map(item=>stylePresetFor(item.medium)),{fetchImpl});
const imageHashes=[];
for(let index=0;index<loaded.length;index++){
 const file=loaded[index].file,expected=fs.readFileSync(new URL(newStyles[index].file,root));
 assert.deepEqual(Buffer.from(await file.arrayBuffer()),expected);assert.equal(file.name,newStyles[index].name);assert.equal(file.type,'image/png');
 const dimensions=await readRasterDimensions(file);assert.ok(dimensions.width>=512&&dimensions.height>=512,'The original style must be readable at full resolution');
 imageHashes.push(hash(expected));
}
assert.notEqual(imageHashes[0],imageHashes[1],'Anime and real cannot reuse one rendering sample');
for(const value of imageHashes)assert.ok(!oldPresets.some(preset=>preset.sha256===value),'A new style cannot reuse an old sample image');

const random=()=>.34,profile={displayName:'SOLID GLOW QA',activityEnabled:false};
const base={sceneUnified:true,sourceKind:'photo-person',medium:'立体光彩アニメ',theme:'都会の仮装パレード',place:'ネオンの繁華街',costume:'ミイラ',pose:'ゆっくり歩く',mood:'少しだけ不気味',angle:'魚眼の曲面遠近',palette:'翡翠 × 銅 × 濃紺',design:'通常の一枚絵',type:'文字を一切入れない',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297'};
const make=(overrides={},collection='halloween')=>{
 applyCollection(collection);const values={...base,...overrides},variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose),plan=productionPlan(profile,values,variant,collection,random),manifest=selectionReferenceManifest(values);
 plan.referenceManifest=[stylePresetFor(values.medium),{name:'creator-reference.jpg',role:'identity',sourceKind:values.sourceKind},{name:manifest.name,role:'selection-sheet',items:manifest.items}];
 return {plan,manifest};
};
const flat2DInstructions=/同じ2Dの形と色面へ|この2D人物を|極細の有色輪郭・広い不透明な平面色|簡潔な鼻口の記号|2～3つの明確なセル影|写真顔・プラスチックCG|REBUILD THE FACE IN THE SELECTED 2D METHOD/;
let cases=0;
function checkInputBranch(plan,text){
 assert.doesNotMatch(text,/undefined|NaN|prepared-identity\.png|人物翻訳用入力/);
 for(const condition of plan.conditions)assert.ok(text.includes(condition.name+'＝'+condition.value),'A fixed selection disappeared: '+condition.key);
 assert.match(text,/制作の土台・編集の基準/);assert.ok(text.includes(stylePresetFor(plan.values.medium).name));
 assert.match(text,/画像生成|画像作成/);assert.match(text,/実画像.*未達を合格としない/);
 if(plan.noPerson){
  assert.match(text,/人物なし/);assert.match(text,/顔・人体・手足・人型や擬人化を追加しない/);
  assert.doesNotMatch(text,/人物を今回の本人へ差し替|本人の識別特徴だけ|この本人の輪郭|同じ人物として保ち|顔と身体の(?:2D)?色面/,'No-person instructions cannot also request a person replacement');
  assert.doesNotMatch(text,/顔の向き：|表情：|身体配置・支持・動作：/);
 }else if(['scenery','mark-object'].includes(plan.values.sourceKind)){
  assert.match(text,/識別(?:資料|基準).*(?:ない|なし)/);assert.match(text,/独自の主役/);
  assert.doesNotMatch(text,/人物を今回の本人へ差し替|本人の識別特徴だけ|この本人の輪郭|同じ人物として保ち|本人の特徴を(?:持つ|保った)/,'A non-person source cannot identify an existing person');
 }else{
  assert.match(text,/本人|同じ人物/);assert.match(text,/輪郭|眉目鼻口/);assert.match(text,/年齢感/);assert.match(text,/性別表現/);assert.match(text,/体格/);assert.match(text,/頭身/);
  assert.match(text,/閉眼は閉じたまま、髪なしは髪なし/);assert.match(text,/ない髭を足さない|ない髭.*追加しない/);
  assert.match(text,/原画の人物.*(?:借りず|借りない|除外)/);
 }
 const palette=colorPolicy(plan.values);assert.ok(text.includes(palette.allowed));assert.ok(text.includes('最明部は'+palette.bright));assert.ok(text.includes('最暗部は'+palette.dark));
 assert.match(text,palette.restricted?/全領域の識別色・光・反射・文字も許可色の濃淡へ変換/:/自然な髪・瞳などの識別色を保持/);
 for(const slot of plan.copy.slots)assert.ok(text.includes(slot.role+'：'+JSON.stringify(slot.text)));
 if(plan.collection==='halloween'){assert.match(text,/Halloween版/);assert.match(text,/10月31日/);}else assert.match(text,/Halloweenを自動追加しない/);
 cases++;
}
function checkSolid(plan){
 const before=JSON.stringify(plan),master=compileProduction(plan),text=renderFocusedChatInput(plan,plan.referenceManifest);
 assert.equal(JSON.stringify(plan),before);assert.equal(renderCompactChatInput(plan,plan.referenceManifest),text);assertWorldTransferHandoff(plan,master,'solid glow automatic route');
 checkInputBranch(plan,text);assert.doesNotMatch(text,flat2DInstructions,'The new volumetric style cannot inherit a flat-2D or photographic-face prohibition');
 assert.match(text,/立体|3D/);assert.match(text,/反射/);assert.match(text,/深い影|深暗部/);
 if(plan.variant.light?.includes('今回の主光方向：')){const direction=plan.variant.light.split('今回の主光方向：')[1].split('。')[0];assert.ok(text.includes('今回の光源方向：'+direction),'The selected light direction cannot change');assert.match(text,/原画の内部色光と局所反射の密度を同じ可視面へ維持/);assert.match(text,/新しい物理的な光源や道具を追加する理由にしない/);assert.doesNotMatch(text,/別の照明や発光物を追加しない|平面の技法ではこの明暗方向/,'A flat-medium lighting rule cannot suppress volumetric internal colour and reflections');}
 if(!plan.noPerson){
  assert.match(text,/顔.*(?:首|身体)|顔・.*衣服/,'Light must reach the subject rather than just the background');
  assert.match(text,/脚|足/,'Full visible-body reflection cannot stop at face and hands');
  if(plan.values.medium==='立体光彩リアル'){assert.match(text,/自然な.*(?:頭蓋|顔|眼球)|自然.*顔立ち/);assert.match(text,/皮膚|肌/);assert.match(text,/連続.*(?:階調|陰影)|(?:階調|陰影).*連続/);}
  else {assert.match(text,/toon|トゥーン|3Dアニメ/);assert.match(text,/整理した.*(?:顔|形)|アニメ.*(?:形|造形)|トゥーンの顔と身体/);}
 }
 assert.equal(identityPreparationStage(plan),null);assert.equal(renderIdentityPreparationPrompt(plan),null);assert.equal(renderIdentityRepairPrompt(plan),null);assert.equal(optionalIdentityPrompts(plan),null);assert.equal(stagePrompts(plan).kind,'world-transfer');assert.equal(stagePrompts(plan).userPreparationRequired,false);
 return text;
}
for(const item of newStyles){
 for(const collection of ['halloween','everyday'])for(const sourceKind of ['photo-person','illustration-person','unknown','scenery','mark-object'])for(const noPerson of [false,true]){
  const {plan}=make({medium:item.medium,sourceKind,...(noPerson?{costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える'}:{})},collection);checkSolid(plan);
 }
 for(const palette of ['翡翠 × 銅 × 濃紺','墨一色','赤と黒だけ','金と黒の2色だけ','青・白のみ']){
  const {plan}=make({medium:item.medium,palette,appearance:'髪なし・閉眼',headRatio:'3頭身のちび',verticalFovDegrees:144});const text=checkSolid(plan);
  assert.match(text,/3頭身のちび/);assert.match(text,/通常頭身へ伸ばさ(?:ない|ず)|頭身を.*(?:保|変えない)|基本頭身.*保/);assert.match(text,/垂直画角144°/);
 }
}
// The original flat media receive the same input-branch correction, while
// their 2D surface and optional identity-translation contracts remain intact.
for(const medium of ['発光幻想アニメ','薄膜光彩アニメ','白域幾何・宇宙彩アニメ','艶彩幻想アニメ'])for(const sourceKind of ['photo-person','scenery','mark-object'])for(const noPerson of [false,true]){
 const {plan}=make({medium,sourceKind,...(noPerson?{costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える'}:{})}),text=compileProduction(plan);checkInputBranch(plan,text);
 assert.equal(Boolean(identityPreparationStage(plan)),!noPerson&&sourceKind==='photo-person');
 assert.equal(renderFocusedRepairPrompt(plan),null,'The new volumetric repair cannot change the original flat-media routes');
 if(plan.variant.light?.includes('今回の主光方向：')){assert.match(text,/別の照明や発光物を追加しない/);assert.match(text,/平面の技法ではこの明暗方向/);assert.doesNotMatch(text,/原画の内部色光と局所反射の密度を同じ可視面へ維持/);}
}

let repairCases=0;
for(const item of newStyles)for(const sourceKind of ['photo-person','scenery','mark-object'])for(const noPerson of [false,true])for(const type of ['文字を一切入れない','HALLOWEENのみ']){
 const {plan}=make({medium:item.medium,sourceKind,type,design:'新聞の一面',appearance:'髪なし・閉眼',headRatio:'3頭身のちび',...(noPerson?{costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える'}:{})});
 assert.ok(!plan.issues.some(issue=>issue.severity==='error'));
 const before=JSON.stringify(plan),repair=renderFocusedRepairPrompt(plan,plan.referenceManifest,{artworkName:'failed-complete.png'}),wrapper=repairPrompt({production:plan,values:plan.values,prompt:compileProduction(plan),edition:'SOLID-REPAIR'});
 assert.equal(JSON.stringify(plan),before);assert.equal(wrapper,renderFocusedRepairPrompt(plan),'The real repair handler must dispatch the independent volumetric editor');
 assert.match(repair,/不足箇所だけを編集/);assert.match(repair,/「failed-complete\.png」.*原寸原画.*の2画像だけ/);assert.ok(repair.includes(item.name));
 assert.match(repair,/元の人物写真・元イラスト・見本シート・個別条件見本は再添付しない/);assert.match(repair,/元の主参照は会話側/);assert.match(repair,/合格している.*保ったまま不足部分だけを修正/);assert.match(repair,/初回の人物差替や場面全体の作り直しを繰り返さない/);
 assert.doesNotMatch(wrapper,/元の制作仕様|【描いてほしい完成品】|【通常制作：完成画像を1回で生成】|prepared-identity\.png|selection-references\.jpg|creator-reference\.jpg/,'The editor cannot append the original one-call payload or ask for source/sheet inputs again');
 for(const condition of plan.conditions)assert.ok(repair.includes(condition.name+'＝'+condition.value));for(const slot of plan.copy.slots)assert.ok(repair.includes(slot.role+'：'+JSON.stringify(slot.text)));
 assert.match(repair,/3頭身のちび/);assert.match(repair,/魚眼では画面中央/);assert.match(repair,/新聞の図版.*主図版1点だけ/);assert.match(repair,/未実行の編集や未達条件を完成と報告しない/);
 if(plan.variant.light?.includes('今回の主光方向：')){const direction=plan.variant.light.split('今回の主光方向：')[1].split('。')[0];assert.ok(repair.includes('保持する光源方向：'+direction));assert.match(repair,/原画の内部色光と局所反射の密度を同じ可視面へ維持/);assert.match(repair,/新しい物理的な光源や道具を追加する理由にしない/);assert.doesNotMatch(repair,/別の照明や発光物を追加しない|平面の技法ではこの明暗方向/);}
 assert.doesNotMatch(repair,flat2DInstructions);assert.doesNotMatch(repair,/人物を今回の本人へ差し替|主参照から使うのは今回の本人の識別特徴だけ/);
 if(noPerson){assert.match(repair,/人物・顔・人体・手足・人型や擬人化を追加しない/);assert.doesNotMatch(repair,/同じ本人の識別特徴|本人の特徴を(?:持つ|保った)|指定動作と表情：/);}
 else if(['scenery','mark-object'].includes(sourceKind)){assert.match(repair,/生成済みの独自の主役/);assert.doesNotMatch(repair,/同じ本人の識別特徴|本人の特徴を(?:持つ|保った)/);}
 else assert.match(repair,/同じ本人の識別特徴・年齢感・性別表現・体格・基本頭身/);
 repairCases++;
}
const blocked=make().plan;blocked.issues.push({severity:'error',reason:'QA限定の明示条件が衝突。'});assert.match(renderFocusedRepairPrompt(blocked),/^【選択の不成立：画像生成を停止】/);assert.match(repairPrompt({production:blocked,values:blocked.values}),/QA限定の明示条件が衝突/);

let canvasImages=[];
class TestImage{set src(value){this._src=value;this.width=this.naturalWidth=512;this.height=this.naturalHeight=512;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}}
const dependencies={FileClass:File,fetchImpl,ImageClass:TestImage,documentImpl:{createElement(tag){assert.equal(tag,'canvas');const images=[];return {width:0,height:0,getContext(){return {measureText:value=>({width:String(value).length*12}),fillText(){},fillRect(){},strokeRect(){},drawImage(image){images.push(image.src);canvasImages.push(image.src);}};},toBlob(callback,type){callback(new Blob([JSON.stringify(images)],{type}));}};}}};
for(let index=0;index<newStyles.length;index++){
 const item=newStyles[index],{plan,manifest}=make({medium:item.medium}),style=loaded[index],identity={name:'creator-reference.jpg',role:'identity',file:new File(['EXACT ORIGINAL IDENTITY '+index],'original-person.jpg',{type:'image/jpeg'})},sheet=new File(['CONTROLLED CONDITION SHEET'],manifest.name,{type:'image/jpeg'});
 const normal=deliveryImageFiles({values:plan.values,localDrawingRefs:[style],localRefs:[identity],references:[{name:identity.name,role:'identity'}],localSelectionReference:{file:sheet}});
 assert.deepEqual(normal.map(file=>file.name),[item.name,identity.name,manifest.name],'Normal production sends original style, original identity and one scoped sheet');
 assert.deepEqual(Buffer.from(await normal[0].arrayBuffer()),fs.readFileSync(new URL(item.file,root)));assert.equal(await normal[1].text(),await identity.file.text());assert.equal(await normal[2].text(),await sheet.text());
 assert.deepEqual(selectionReferenceCounts(manifest),{selected:10,sheet:7,separateStyle:1});assert.ok(!manifest.items.some(item=>['medium','size','type'].includes(item.key)));
 const ordinary=checkSolid(plan);assert.ok(ordinary.includes(manifest.name));assert.match(ordinary,/各セルの担当条件だけ/);
 const kit=await buildIndividualSelectionReferenceZip({manifest,identityReferences:[identity],styleReferences:[style],composeIndividualPrompt:kit=>compileProduction({...plan,referenceManifest:kit.references})},dependencies);
 const individuals=individualSelectionReferenceManifest(manifest);
 assert.deepEqual(kit.files.map(file=>file.name),[item.name,identity.name,...individuals.map(ref=>ref.name)],'All applicable individual examples keep the same original-style-first order');
 assert.deepEqual(kit.manifest.references.map(ref=>ref.role),['style-preset','identity',...individuals.map(()=> 'selection-condition')]);
 assert.equal(kit.manifest.counts.selected,10);assert.equal(kit.manifest.counts.individual,7);assert.equal(kit.manifest.counts.attached,9);
 assert.equal(kit.manifest.execution.status,'not-executed');assert.equal(kit.manifest.execution.qualityStatus,'not-accepted');assert.equal(kit.manifest.execution.canUseObservedSingleCall,false);
 assert.doesNotMatch(kit.prompt,/selection-references\.jpg/);assert.match(kit.prompt,/合計9枚/);assert.match(kit.prompt,/役割別シートは含まれない/);assert.match(kit.prompt,/全10選択/);
 for(const ref of kit.manifest.references){assert.ok(kit.prompt.includes(ref.name));if(ref.role==='selection-condition'){assert.ok(kit.prompt.includes(ref.scope));assert.ok(kit.prompt.includes(ref.value));}}
 assert.deepEqual(Buffer.from(await kit.files[0].arrayBuffer()),fs.readFileSync(new URL(item.file,root)));assert.equal(await kit.files[1].text(),await identity.file.text());
 assert.match(kit.prompt,/他の利用先.*一律の上限.*当てはめず/);assert.match(kit.prompt,/同じ選択の完成画像で照合/);
}
assert.ok(canvasImages.length,'Individual SVG condition views must actually be dispatched to the controlled renderer');
applyCollection('halloween');
console.log('PASS solid glow: immutable original 118 preset mappings/images; two distinct new original PNGs, '+cases+' real resolved person/no-person/non-person/palette cases, natural real versus toon-3D rendering, closed-eye/hairless/chibi identity, '+repairCases+' independent two-image repairs preserving all conditions and allowed copy, original-style-first three-file and actual individual-ZIP handoffs with exact bytes and scopes. Canvas is controlled; generated appearance remains unaccepted.');
