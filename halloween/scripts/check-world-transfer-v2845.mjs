import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {questions,visibleQuestions} from '../catalog.js?v=28.4.5';
import {applyCollection} from '../collection.js?v=28.4.5';
import {productionPlan} from '../production-plan.js?v=28.4.5';
import {buildDirection} from '../direction.js?v=28.4.5';
import {applyPose} from '../poses.js?v=28.4.5';
import {compileProduction} from '../compiled-production.js?v=28.4.5';
import {composeStagedMaster,stagePrompts,optionalIdentityPrompts} from '../production-workflow.js?v=28.4.5';
import {stylePresetFor} from '../style-presets.js?v=28.4.5';
import {selectionReferenceManifest,individualSelectionReferenceManifest} from '../selection-references.js?v=28.4.5';
import {angleItems} from '../angles.js?v=28.4.5';
import {worldTransferWorldStage,worldTransferSurfaceStage,worldTransferSceneStage,worldTransferPrompts,renderWorldTransferMaster,usesWorldTransferProduction,worldTransferSourceObservationRequirements,resolveWorldTransferSceneSourceObservations} from '../world-transfer-production.js?v=28.4.5';
import {worldTransferLayoutStage} from '../world-transfer-layout.js?v=28.4.5';
import {designLayoutFor,typographyLayoutFor} from '../layout-preview-specs.js?v=28.4.5';
import {assertWorldTransferHandoff} from './world-transfer-handoff-assertions-v2845.mjs';

const media=['立体光彩アニメ','立体光彩リアル'],random=()=>.34,profile={displayName:'WORLD QA',activityEnabled:false};
const base={sceneUnified:true,sourceKind:'photo-person',theme:'都会の仮装パレード',place:'ネオンの繁華街',costume:'ミイラ',pose:'ゆっくり歩く',mood:'少しだけ不気味',angle:'魚眼の曲面遠近',palette:'翡翠 × 銅 × 濃紺',design:'通常の一枚絵',type:'文字を一切入れない',line:'セリフなし',size:'A4縦・300dpi目安｜2480×3508｜210:297',appearance:'髪なし・閉眼',headRatio:'3頭身のちび'};
function make(overrides={},collection='halloween',route='sheet'){
 applyCollection(collection);const values={...base,medium:media[0],...overrides},variant=applyPose(buildDirection([],values.mood,random,collection,values),values.pose),plan=productionPlan(profile,values,variant,collection,random),manifest=selectionReferenceManifest(plan.values);
 plan.referenceManifest=[stylePresetFor(plan.values.medium),{role:'identity',name:'original-source.jpg',sourceKind:values.sourceKind},...(route==='sheet'?[{role:'selection-sheet',name:manifest.name,items:manifest.items}]:individualSelectionReferenceManifest(manifest))];return plan;
}
let routes=0,blocked=0,layouts=0;
function check(plan){
 const before=JSON.stringify(plan),workflow=worldTransferPrompts(plan),master=compileProduction(plan),errors=plan.issues.filter(issue=>issue.severity==='error');
 assert.equal(JSON.stringify(plan),before,'Stage construction must not mutate selection, manuscript or source roles');
 if(errors.length){assert.equal(workflow,null);assert.equal(stagePrompts(plan),null);assert.match(master,/^【選択の不成立：画像生成を停止】/);for(const error of errors)assert.ok(master.includes(error.reason));blocked++;return null;}
 assertWorldTransferHandoff(plan,master);assert.equal(composeStagedMaster(plan,[],{verbose:true}),master,'Advanced mode must use the same automatic route');
 const cached=stagePrompts(plan);assert.equal(stagePrompts(plan),cached);assert.deepEqual(cached,workflow);assert.equal(optionalIdentityPrompts(plan),null);assert.equal(usesWorldTransferProduction(plan),true);
 assert.ok(workflow.stages.every(stage=>stage.references.length<=4),'Each actual scene group is generated image plus at most three applicable examples');
 const final=workflow.stages.at(-1);assert.equal(final.key,workflow.finalStage);
 for(const stage of workflow.stages)for(const key of stage.conditionKeys)assert.ok(plan.conditions.some(condition=>condition.key===key));
 for(const owner of Object.entries(workflow.conditionOwners))for(const stageName of owner[1])assert.ok(workflow.stages.find(stage=>stage.key===stageName).conditionKeys.includes(owner[0]),'The condition owner must actually execute its condition');
 const world=workflow.stages[0];assert.equal(world.prompt.includes('衣装「ミイラ」'),false,'Final costume must not alter the original-world identity editing step');assert.equal(world.prompt.includes('配色：'),false);
 if(!plan.noPerson&&!['scenery','mark-object'].includes(plan.values.sourceKind)){assert.match(world.prompt,/自然に生える角・耳や固有の印を保つ/);assert.match(world.prompt,/着脱可能な仮装の角・動物耳のカチューシャ/);}
 for(const scene of workflow.stages.filter(stage=>stage.kind==='scene-edit')){
  if(!plan.noPerson&&scene.conditionKeys.includes('costume')){assert.match(scene.prompt,/仮の画風原画から残った衣服・装身具・飾りは、選択衣装の構造と被覆へ置き換える/);assert.match(scene.prompt,/今回の衣装で指定した形・素材・飾りと、生来の角・耳・固有の印/);if(plan.values.costume==='参照画像の衣装を生かす'){if(['scenery','mark-object'].includes(plan.values.sourceKind)){assert.match(scene.prompt,/入力に着用人物の衣装はない/);assert.match(scene.prompt,/固有形・色・紋様・構造・材質.*翻案/);assert.doesNotMatch(scene.prompt,/主参照の襟・袖・丈|元の主参照の衣装構造/);}else assert.match(scene.prompt,/元の主参照の衣装構造.*仮原画の衣装を参照衣装と取り違えない/);}}
  else assert.doesNotMatch(scene.prompt,/仮の画風原画から残った衣服・装身具・飾り/,'No-person and environment-only calls cannot replace or invent a costume');
 }
 if(workflow.route==='individual'){
  const scenes=workflow.stages.filter(stage=>stage.kind==='scene-edit');assert.deepEqual(scenes.map(stage=>stage.key),['scene-character','scene-environment']);
  assert.deepEqual(scenes[0].references.filter(ref=>!ref.generated).map(ref=>ref.key),['costume','pose','mood'].filter(key=>plan.referenceManifest.some(ref=>ref.key===key)));
  assert.deepEqual(scenes[1].references.filter(ref=>!ref.generated).map(ref=>ref.key),['theme','angle','palette'].filter(key=>plan.referenceManifest.some(ref=>ref.key===key)));assert.equal(scenes[1].references[0].role,'scene-result');
  assert.ok(!scenes[0].conditionKeys.includes('angle'));assert.ok(!scenes[1].conditionKeys.includes('pose'));
 }else{
  const scene=workflow.stages.find(stage=>stage.key==='scene');assert.equal(scene.references.length,2);assert.deepEqual(scene.references[1].readKeys,['theme','costume','pose','mood','angle','palette']);
 }
 if(final.kind==='layout'){assert.deepEqual(final.conditionKeys,['design','type','size']);layouts++;}else{assert.ok(final.conditionKeys.includes('design')&&final.conditionKeys.includes('type'));assert.match(final.prompt,/文字・数字・署名なし|文字・枠・副図版を追加しない/);}
 routes++;return workflow;
}
for(const medium of media)for(const route of ['sheet','individual'])for(const collection of ['halloween','everyday'])for(const sourceKind of ['photo-person','illustration-person','unknown','scenery','mark-object'])for(const noPerson of [false,true])check(make({medium,sourceKind,...(noPerson?{costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える'}:{})},collection,route));
for(const medium of media)for(const angle of angleItems.map(item=>item.value))check(make({medium,angle}));
for(const medium of media)for(const design of questions.find(question=>question.key==='design').groups.flatMap(group=>group.values))for(const type of ['HALLOWEENのみ','文字を一切入れない'])check(make({medium,design,type},'halloween','individual'));
for(const medium of media)for(const type of questions.find(question=>question.key==='type').groups.flatMap(group=>group.values))check(make({medium,design:type==='広告チラシ風・情報をたっぷり'?'広告ビジュアル':'新聞の一面',type},'halloween','individual'));
for(const medium of media)for(const palette of ['翡翠 × 銅 × 濃紺','墨一色','赤と黒だけ','金と黒の2色だけ','青・白のみ'])check(make({medium,palette,design:'新聞の一面',type:'HALLOWEENのみ',verticalFovDegrees:144}));
for(const medium of media)for(const route of ['sheet','individual'])check(make({medium,costume:'参照画像の衣装を生かす'},'halloween',route));

let observationCases=0;
for(const medium of media)for(const route of ['sheet','individual'])for(const sourceKind of ['photo-person','illustration-person','scenery','mark-object']){
 const plan=make({medium,sourceKind,costume:'参照画像の衣装を生かす',palette:'参照画像の色を生かす',place:'参照風景を舞台にする'},'halloween',route),workflow=check(plan),requirements=worldTransferSourceObservationRequirements(plan),before=JSON.stringify(workflow);
 assert.deepEqual(requirements.map(requirement=>requirement.sourceField),['costume','palette','place']);assert.ok(requirements.every(requirement=>requirement.sourceRole==='identity'&&requirement.actualImageRequired&&requirement.readBeforeWorld));
 const master=compileProduction(plan);assert.ok(master.indexOf('【最初の画像制作前：選択された参照情報の確認】')<master.indexOf('【内部制作1：world】'));assert.match(master,/利用者へ手作業のメモ作成を求めない/);assert.match(master,/具体的な文章へ確定/);assert.match(master,/担当する場面編集の画像入力本文だけへ追記/);assert.match(master,/最初の制作を停止/);
 const notes=requirements.map(requirement=>({...requirement,confirmed:true,actualImageReviewed:true,text:requirement.sourceField==='costume'?(sourceKind==='scenery'||sourceKind==='mark-object'?'可視の三本の斜線と丸い外形を服の留め具と織りへ翻案する。':'可視の高い襟・長袖・二つのボタン、膝丈の厚い布。'):requirement.sourceField==='palette'?'紺の大きな面、翡翠の副色、銅の小さな差し色。':'左の低い壁、奥の建物、手前の平らな支持面。'}));
 for(const requirement of workflow.sourceObservationRequirements){assert.ok(requirement.stageKeys.length);for(const key of requirement.stageKeys)assert.ok(workflow.stages.find(stage=>stage.key===key).sourceObservationRequirements.some(item=>item.sourceField===requirement.sourceField));}
 for(const scene of workflow.stages.filter(stage=>stage.kind==='scene-edit')){
  assert.equal(scene.readyForImageInput,scene.sourceObservationRequirements.length===0);
  const required=scene.sourceObservationRequirements;
  if(!required.length){assert.equal(resolveWorldTransferSceneSourceObservations(scene,notes),scene);continue;}
  assert.equal(resolveWorldTransferSceneSourceObservations(scene,[]).blocked,true);assert.deepEqual(resolveWorldTransferSceneSourceObservations(scene,[]).references,[]);
  for(const overrides of [{confirmed:false},{actualImageReviewed:false},{sourceRole:'style-preset'},{value:'別の選択'},{text:' '},{sourceField:'wrong'}]){const invalid=notes.map(note=>({...note,...(note.sourceField===required[0].sourceField?overrides:{})}));assert.equal(resolveWorldTransferSceneSourceObservations(scene,invalid).blocked,true,'Only actually reviewed and exact matching observations can fill a required role');}
  const bound=resolveWorldTransferSceneSourceObservations(scene,[...notes,{key:'wrong',sourceField:'wrong',value:'wrong',confirmed:true,actualImageReviewed:true,sourceRole:'identity',text:'SURPLUS OBSERVATION'}]);assert.equal(bound.blocked,false);assert.equal(bound.readyForImageInput,true);assert.deepEqual(bound.references,scene.references);assert.ok(!bound.references.some(ref=>ref.role==='identity'));assert.doesNotMatch(bound.prompt,/SURPLUS OBSERVATION/);assert.match(bound.prompt,/観察文を作品内へ印字しない/);
  for(const note of notes)assert.equal(bound.prompt.includes(note.text),required.some(requirement=>requirement.sourceField===note.sourceField),'Only the assigned observation belongs in a given scene call');
  const keys=scene.conditionKeys.filter(key=>['theme','costume','pose','mood','angle','palette','place'].includes(key)),direct=worldTransferSceneStage(plan,plan.referenceManifest,{key:scene.key,keys,sourceObservations:notes});assert.equal(direct.readyForImageInput,true);assert.ok(!direct.references.some(ref=>ref.role==='identity'));
 }
 assert.equal(JSON.stringify(workflow),before,'Observation binding cannot mutate the stored plan or cached workflow');observationCases++;
}
for(const medium of media)for(const route of ['sheet','individual']){const plan=make({medium,costume:'風景を主役にする',pose:'おまかせ',mood:'毎回大胆に変える',palette:'参照画像の色を生かす',place:'参照風景を舞台にする'},'halloween',route),workflow=check(plan);assert.deepEqual(workflow.sourceObservationRequirements.map(requirement=>requirement.sourceField),['palette','place']);assert.ok(!workflow.stages.some(stage=>stage.sourceObservationRequirements?.some(requirement=>requirement.key==='costume')));observationCases++;}
let legacyCases=0;
for(const medium of media)for(const route of ['sheet','individual']){
 const legacy=make({medium,sceneUnified:false}),manifest=selectionReferenceManifest(legacy.values,{questions:[...visibleQuestions,questions.find(question=>question.key==='place')]}),refs=[stylePresetFor(medium),{role:'identity',name:'original-source.jpg'},...(route==='sheet'?[manifest]:individualSelectionReferenceManifest(manifest))];legacy.referenceManifest=refs;
 const workflow=worldTransferPrompts(legacy),master=compileProduction(legacy);assertWorldTransferHandoff(legacy,master);assert.equal(workflow.conditionOwners.place[0],workflow.stages.filter(stage=>stage.kind==='scene-edit').at(-1).key);
 const scenes=workflow.stages.filter(stage=>stage.kind==='scene-edit');assert.ok(scenes.at(-1).conditionKeys.includes('place'));assert.ok(scenes.at(-1).prompt.includes('舞台・場所＝'+legacy.values.place));
 if(route==='sheet'){assert.match(scenes[0].prompt,/選択衣装・場面・ポーズ・表情・投影・配色を描き直す/);assert.doesNotMatch(scenes[0].prompt,/次の担当回へ渡す/);}else{assert.equal(scenes.at(-1).references.length,5);assert.match(master,/担当見本4枚以内/);}legacyCases++;
}

const page=make({design:'新聞の一面',type:'HALLOWEENのみ'}),sheet=page.referenceManifest.find(ref=>ref.role==='selection-sheet'),duplicates=individualSelectionReferenceManifest(selectionReferenceManifest(page.values));
const layout=worldTransferLayoutStage(page,{sceneName:'confirmed-scene.png',refs:[...page.referenceManifest,...duplicates]});assert.deepEqual(layout.references.map(ref=>ref.role),['scene-result','selection-sheet'],'One consolidated image excludes its individual duplicates');assert.deepEqual(layout.references[1].usedKeys,['design','type']);assert.ok(layout.references[1].items.every(item=>['design','type'].includes(item.key)));assert.equal(layout.sceneName,'confirmed-scene.png');assert.equal(layout.requiresInspection,true);
assert.equal(layout.layout.manuscriptCount,page.copy.slots.length+page.copy.generatedSlots.length);assert.match(layout.prompt,/新聞の主図版は1点だけ/);assert.match(layout.prompt,/小風景図・下段3図・複製肖像を追加しない/);
const individual=worldTransferLayoutStage(page,{sceneName:'confirmed-scene.png',refs:duplicates});assert.deepEqual(individual.references.map(ref=>ref.key||ref.role),['scene-result','design','type'].filter(key=>key==='scene-result'||duplicates.some(ref=>ref.key===key)));
const expected=designLayoutFor(page.values.design);assert.deepEqual(layout.layout.informationFrames,expected.frames);for(const frame of expected.frames)assert.ok(layout.prompt.includes('x'+frame.x+'%・y'+frame.y+'%・幅'+frame.w+'%・高さ'+frame.h+'%'));
const auto=make({design:'新聞の一面',type:'デザインに合わせて自動編集'}),autoLayout=worldTransferLayoutStage(auto,{refs:auto.referenceManifest});assert.equal(autoLayout.layout.manuscriptCount,auto.copy.slots.length+auto.copy.generatedSlots.length);for(const slot of auto.copy.slots)assert.ok(autoLayout.prompt.includes(JSON.stringify(slot.text)));assert.match(autoLayout.prompt,/自動文字の数量は下記の許可役割の個数だけ/);assert.doesNotMatch(autoLayout.prompt,/作者本人の実際の発言を創作/);
const editable=structuredClone(auto);editable.copy.slots=[];editable.copy.generatedSlots=[{role:'主見出し',maxCharacters:20,priority:0},{role:'紹介文',maxCharacters:90,priority:2}];const editableLayout=worldTransferLayoutStage(editable,{refs:editable.referenceManifest});assert.equal(editableLayout.layout.manuscriptCount,2);assert.match(editableLayout.prompt,/完成文字列を先に確定する/);assert.match(editableLayout.prompt,/作品世界内の出来事・主題・場所・目的/);assert.match(editableLayout.prompt,/許可編集／主見出し／20字以内／階層0/);assert.match(editableLayout.prompt,/許可編集／紹介文／90字以内／階層2/);
for(const direction of ['横書き','縦書き','斜め']){const type=questions.find(question=>question.key==='type').groups.flatMap(group=>group.values).find(value=>typographyLayoutFor(value)?.direction.includes(direction));assert.ok(type);const plan=make({design:'新聞の一面',type}),stage=worldTransferLayoutStage(plan,{refs:plan.referenceManifest});assert.match(stage.prompt,/カメラや主図版の投影を回転・変形しない/);assert.ok(stage.prompt.includes(typographyLayoutFor(type).direction));}
const none=make(),noneNewspaper=make({design:'新聞の一面'});assert.equal(worldTransferLayoutStage(none,{refs:none.referenceManifest}),null);assert.ok(worldTransferLayoutStage(noneNewspaper,{refs:noneNewspaper.referenceManifest}));
const stale=structuredClone(page.referenceManifest);stale.find(ref=>ref.role==='selection-sheet').items.find(item=>item.key==='design').value='通常の一枚絵';const stopped=worldTransferPrompts(page,stale);assert.equal(stopped.blocked,true);assert.equal(stopped.stages.length,0);assert.match(renderWorldTransferMaster(page,stale),/^【選択の不成立：画像生成を停止】/);const staleLayout=worldTransferLayoutStage(page,{refs:stale});assert.equal(staleLayout.blocked,true);assert.deepEqual(staleLayout.references,[]);
const error=make();error.issues.push({severity:'error',reason:'WORLD QA明示矛盾'});for(const constructor of [worldTransferWorldStage,worldTransferSurfaceStage,worldTransferSceneStage,worldTransferPrompts])assert.equal(constructor(error),null);assert.deepEqual(worldTransferLayoutStage(error).references,[]);assert.match(compileProduction(error),/WORLD QA明示矛盾/);
for(const medium of ['発光幻想アニメ','薄膜光彩アニメ','白域幾何・宇宙彩アニメ','艶彩幻想アニメ']){const old=make({medium});assert.equal(usesWorldTransferProduction(old),false);assert.equal(worldTransferPrompts(old),null);assert.match(compileProduction(old),/通常制作：完成画像を1回で生成/);assert.doesNotMatch(compileProduction(old),/【内部制作/);assert.ok(optionalIdentityPrompts(old)?.identity);}

// Exercise the actual app result handler; DOM presentation is controlled,
// while the production and workflow payloads above are real implementations.
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),nodes=new Map(),node=(text='')=>({textContent:text,children:[],dataset:{},hidden:false,open:false,append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},addEventListener(){},scrollIntoView(){},setAttribute(){}}),get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
const context=vm.createContext({resultRequest:0,inputRevision:0,currentResult:null,resultObjectURLs:[],disposeLayoutPreview(){},recomposeHistoryDelivery:value=>value,optionalIdentityPrompts,restoreHistoryRecord:value=>value,restoreHistoryCore:value=>value,selectionReferenceCounts:()=>({selected:10,sheet:7}),loadStylePresets:async()=>[],buildSelectionReferenceSheet:async()=>null,clearPreparedResult(){},tell:message=>{throw new Error(message);},URL:{createObjectURL:()=> 'blob:world-qa'},$:get,APP_VERSION:'28.4.5',needsReference:()=>true,AUTO:'おまかせ',sourceKinds:[],creatorDisplayLabel:()=>profile.displayName,el:(tag,className,text)=>node(text),appendRecipeEvidence(){},document:{createTextNode:node,body:{dataset:{motion:'off'}}},editorialReferencesFor:()=>[],createLayoutPanel:()=>{throw new Error('Internal pipeline cannot open manual SVG panel');},canShareFiles:()=>false,deliveryImageFiles:()=>[],shareFiles:()=>[],download(){}});
vm.runInContext(app.slice(app.indexOf('async function showResult('),app.indexOf('\nasync function copyPrompt(')),context);
await context.showResult({version:'28.4.5',isFresh:true,edition:'WORLD-UI',profile,values:page.values,variant:page.variant,production:page,prompt:compileProduction(page),stages:stagePrompts(page),localRefs:[],localDrawingRefs:[],references:[],drawingReferences:[]});
assert.ok(!get('result-summary').children.some(child=>child.id==='staged-workflow'),'Automatic internal workflow cannot become manual prepare/layout buttons');assert.ok(get('result-summary').children.some(child=>child.textContent?.includes('中間画像の保存や再添付は不要')));assert.equal(get('prompt-output').value,compileProduction(page));
applyCollection('halloween');console.log('PASS world transfer: '+routes+' resolved automatic sheet/individual routes, '+layouts+' required layouts, '+blocked+' blocked choices, '+observationCases+' source-observation gate fixtures and '+legacyCases+' independent-place routes; original identity only first call, ordinary calls at most four images and legacy custom calls at most five, concrete condition owners, exact camera/framing/copy, contained full scene, strict no-copy, stale/explicit/observation stops, cache immutability, old four single-call routes and actual internal UI handler. Generated appearance remains unaccepted.');
