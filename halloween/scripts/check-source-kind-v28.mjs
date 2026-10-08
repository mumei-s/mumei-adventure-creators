import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {sourceKinds,sourceKindInstructions,isNonHumanSource,sourceSubjectFor} from '../source-kind.js?v=28.4.0';
import {questions,visibleQuestions,resolveSelections,normalizeCreator,AUTO} from '../catalog.js?v=28.4.0';
import {initialSelections,effectiveSelections,proposalBatch} from '../modes.js?v=28.4.0';
import {selectionConflicts} from '../compatibility.js?v=28.4.0';
import {buildDirection} from '../direction.js?v=28.4.0';
import {applyPose} from '../poses.js?v=28.4.0';
import {stagePrompts} from '../production-workflow.js?v=28.4.0';
import {compactCreatorProfile} from '../creator.js?v=28.4.0';
import {applyCollection} from '../collection.js?v=28.4.0';
import {productionPlan,planInstructions,repairPrompt} from '../production-plan.js?v=28.4.0';
import {composePrompt,needsReference} from '../prompt.js?v=28.4.0';
import {composeArtworkStage,composeArtworkRepair} from '../artwork-stage.js?v=28.4.0';
import {artworkBasisContract,artworkBasisValues} from '../artwork-basis.js?v=28.4.0';
import {renderInput,renderChatInput} from '../compiled-production.js?v=28.4.0';
import {drawingReferenceFor,drawingReferenceInstructions} from '../drawing-references.js?v=28.4.0';
import {stylePresetFor} from '../style-presets.js?v=28.4.0';
import {halloweenModeContract} from '../halloween-mode-contract.js?v=28.4.0';

const profile={displayName:'INPUT ROUTE CHECK',activityEnabled:false},random=()=>.34;
assert.deepEqual(sourceKinds.map(kind=>kind.value),['photo-person','illustration-person','scenery','mark-object']);
assert.equal(sourceKinds.find(kind=>kind.value==='scenery').defaultSubject,'風景を主役にする');
assert.equal(sourceKinds.find(kind=>kind.value==='mark-object').defaultSubject,'モチーフだけで構成する');
for(const kind of [undefined,'unknown','obsolete-kind'])assert.equal(sourceSubjectFor(kind,AUTO),'参照画像の衣装を生かす');
for(const kind of sourceKinds)assert.equal(sourceSubjectFor(kind.value,AUTO),kind.defaultSubject);
const noPersonSubjects=['風景を主役にする','モチーフだけで構成する','紋章・アイコンにする'];
for(const kind of ['unknown',...sourceKinds.map(kind=>kind.value)])for(const costume of noPersonSubjects){
 assert.equal(sourceSubjectFor(kind,costume),costume,'Explicit non-person output takes priority over input kind');
 assert.equal(sourceSubjectFor(kind,AUTO,{selectedCostume:costume}),costume,'A hidden explicit non-person choice survives AUTO mode fields');
 assert.equal(sourceSubjectFor(kind,'海賊',{selectedCostume:costume}),'海賊','An actual output choice takes priority over the hidden fallback');
}
for(const sourceKind of [undefined,'unknown','obsolete-kind'])assert.deepEqual(sourceKindInstructions({sourceKind,medium:'透明水彩'}),[]);
assert.equal(isNonHumanSource({sourceKind:'scenery'}),true);
assert.equal(isNonHumanSource({sourceKind:'mark-object'}),true);
assert.equal(isNonHumanSource({sourceKind:'photo-person'}),false);
assert.equal(isNonHumanSource({sourceKind:'unknown'}),false);
function fixture(collection,sourceKind,medium,costume){
 applyCollection(collection);
 const values=resolveSelections({...initialSelections(),sceneUnified:true,sourceKind,medium,costume,design:'通常の一枚絵',palette:'モノクローム',type:'文字を一切入れない',line:'セリフなし'},random);
 values.sourceKind=sourceKind;values.collection=collection;
 const plan=productionPlan(profile,values,{},collection,random);
 const drawing=drawingReferenceFor(medium),references=[...(drawing?[drawing]:[]),{name:'USER_INPUT.png',role:'identity'}];
 const prompt=composePrompt({profile,values,variant:plan.variant,collection,preparedPlan:plan,references,edition:'INPUT-KIND'});
 return {values,plan,prompt};
}
let cases=0;
for(const collection of ['halloween','everyday'])for(const kind of sourceKinds){
 const allowed=new Set(questions.find(q=>q.key==='costume').groups.flatMap(g=>g.values));
 assert.ok(allowed.has(kind.defaultSubject),collection+' default subject must be an existing option');
 for(const medium of ['宝石光彩アニメ','宝石光彩リアル','透明水彩'])for(const costume of [kind.defaultSubject,'風景を主役にする',...(isNonHumanSource({sourceKind:kind.value})?['海賊']:[])]){
  const {values,plan,prompt}=fixture(collection,kind.value,medium,costume),before=JSON.stringify(values);
  const routes=[prompt,renderChatInput(plan),composeArtworkStage(plan),composeArtworkRepair(plan),composeArtworkRepair(plan,{compact:true}),repairPrompt({prompt,values,production:plan}),planInstructions(plan).join('\n')];
  assert.equal(plan.conditions.length,visibleQuestions.length,'Input classification must not add an eleventh output choice');
  assert.equal(plan.values.medium,medium);assert.equal(plan.values.costume,costume);assert.equal(plan.values.sourceKind,kind.value);
  assert.equal(needsReference(values),true,'A classified input must be supplied as the user main reference');
  for(const clause of sourceKindInstructions(values,{noPerson:plan.noPerson}))for(const route of routes)assert.ok(route.includes(clause),kind.value+' source clause missing');
  for(const clause of drawingReferenceInstructions(medium,{noPerson:plan.noPerson,values}))for(const route of routes.slice(0,6))assert.ok(route.includes(clause),kind.value+' drawing role missing');
  const seasonal=halloweenModeContract(values,{collection,noPerson:plan.noPerson});
  if(collection==='halloween')for(const route of routes){for(const section of seasonal.sections)assert.ok(route.includes(section.text),'Halloween section missing');for(const check of seasonal.checks)assert.ok(route.includes(check),'Halloween actual check missing');}
  else assert.doesNotMatch(prompt,/Halloween版の共通世界|今回の完成品は、通常の一枚絵/);
  if(plan.noPerson)assert.match(sourceKindInstructions(values,{noPerson:true}).join('\n'),/人物.*追加しない|人物.*新しく追加せず/);
  else if(!isNonHumanSource(values)){
   const source=sourceKindInstructions(values,{noPerson:false}).join('\n');
   assert.match(source,/眉・顎・鼻・首.*元々ある髭/);assert.match(source,/主参照にない髭を追加せず/);assert.match(source,/年齢感・性別表現・体格を維持/);
  }
  if(isNonHumanSource(values)&&!plan.noPerson){
   const structured=JSON.parse(renderInput(plan).split('\n\n【全選択の個別レシピ】')[0]);
   assert.doesNotMatch(structured.identity,/主参照は変換前の人物資料|着替えた同じキャラクター/);
   assert.doesNotMatch(structured.required_before_details.wardrobe_selection,/同じ人物を|着替えた同じキャラクター/);
   assert.match(prompt,/人物の顔を識別する資料ではない/);
   assert.match(composeArtworkRepair(plan),/元の景色・マーク・物体から人物の顔を復元せず/);
   assert.match(repairPrompt({prompt,values,production:plan}),/既に成立した独自の主役/);
  }
  assert.equal(JSON.stringify(values),before,'Instruction composition must not alter selections');
  cases++;
 }
}
for(const collection of ['halloween','everyday'])for(const costume of ['参照画像の衣装を生かす','風景を主役にする']){
 const base=fixture(collection,undefined,'透明水彩',costume),unknown=fixture(collection,'unknown','透明水彩',costume);
 assert.deepEqual(base.plan.conditions,unknown.plan.conditions);assert.equal(base.prompt,unknown.prompt);
 assert.equal(composeArtworkStage(base.plan),composeArtworkStage(unknown.plan));
 assert.equal(composeArtworkRepair(base.plan),composeArtworkRepair(unknown.plan));
 assert.equal(needsReference(base.values),needsReference(unknown.values));
}
for(const sourceKind of ['scenery','mark-object'])for(const medium of artworkBasisValues){
 const values={sourceKind,medium,costume:'海賊'},basis=artworkBasisContract(medium,{values}),text=basis.method+' '+basis.checks.join(' ');
  assert.doesNotMatch(text,/主参照の髪型|主参照の目の形|主参照の識別特徴|主参照の特徴|主参照を同じ識別特徴|参照のちび比率|ちび参照|同じ人物の識別特徴の組合せ/);
 assert.match(basis.sections[0].text,/元入力から顔・髪・年齢・性別を復元せず/);
}
for(const sourceKind of ['scenery','mark-object']){
 const {plan,prompt}=fixture('halloween',sourceKind,'クリスタルホログラム造形アニメ','海賊');
 assert.doesNotMatch(plan.conditions.find(condition=>condition.key==='medium').text,/参照の顔立ち・目鼻口・髪型の特徴的な組合せ/);
 assert.doesNotMatch(prompt,/参照の顔立ち・目鼻口・髪型の特徴的な組合せ/);
}

// Execute the actual input picker and selection preparation with small DOM stubs.
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function node(tag='div'){
 return {tag,children:[],dataset:{},listeners:{},attributes:{},textContent:'',hidden:false,classList:{add(){},remove(){}},focus(){},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=[...children];},addEventListener(event,handler){this.listeners[event]=handler;},setAttribute(key,value){this.attributes[key]=value;},querySelectorAll(tag){return this.children.filter(child=>child.tag===tag);}};
}
const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
const context={sourceKinds,sourceSubjectFor,sourceKind:'unknown',selections:{...initialSelections()},mode:'detail',modeSnapshots:{detail:{costume:'魔女・魔法使い'},simple:{costume:'海賊'}},collectionSnapshots:{everyday:{selections:{costume:'海賊'},modeSnapshots:{detail:{costume:'海賊'}},proposals:[{}],selectedProposal:{}}},proposals:[{}],selectedProposal:{},$,el:node,renderChoices(){},makeProposals(){},tell(){},localStorage:{setItem(){}},AUTO:'おまかせ',questions,resolveSelections,rng:random,document:{body:{dataset:{}},querySelectorAll:()=>[]},modeKeys:{detail:[],simple:[],auto:[]},modeCopy:{detail:'detail',simple:'simple',auto:'auto'}};
vm.createContext(context);
vm.runInContext(app.slice(app.indexOf('function renderSourceKinds()'),app.indexOf('async function persist(')),context);
context.renderSourceKinds();assert.equal($('source-kind-options').children.length,4);
const sceneryButton=$('source-kind-options').children.find(button=>button.dataset.sourceKind==='scenery');sceneryButton.listeners.click();
assert.equal(context.sourceKind,'scenery');assert.equal(context.selections.costume,'風景を主役にする');
for(const snapshot of Object.values(context.modeSnapshots))assert.equal(snapshot.costume,'風景を主役にする');
assert.equal(context.collectionSnapshots.everyday.selections.costume,'風景を主役にする');
assert.equal(context.collectionSnapshots.everyday.selectedProposal,null);assert.equal(context.proposals.length,0);assert.equal(context.selectedProposal,null);
vm.runInContext(app.slice(app.indexOf('function setMode('),app.indexOf('function makeProposals(')),context);
context.setMode('simple');assert.equal(context.selections.costume,'風景を主役にする');
const shuffleOpening="$('shuffle').addEventListener('click',()=>{",shuffleStart=app.indexOf(shuffleOpening);
const shuffle=app.slice(shuffleStart+shuffleOpening.length,app.indexOf("$('generate').addEventListener",shuffleStart)).trim().replace(/\}\);$/,'');
const size=context.selections.size;vm.runInContext('(function(){'+shuffle+'})()',context);assert.equal(context.selections.size,size);assert.equal(context.selections.costume,'風景を主役にする');
const start=app.indexOf('const inputKind=lockedValues?'),end=app.indexOf('const conflicts=selectionConflicts(values);',start),prepare=app.slice(start,end);
for(const lockedKind of ['photo-person','scenery',undefined]){
 context.lockedValues={...initialSelections(),...(lockedKind?{sourceKind:lockedKind}:{})};context.input={...context.lockedValues};context.collection='everyday';context.sourceKind='mark-object';context.saved={history:[]};
 const values=vm.runInContext('(function(){'+prepare+'return values;})()',context);
 assert.equal(values.sourceKind,lockedKind||'unknown','Regeneration must preserve its saved input kind, including legacy unknown');
}

// Unknown defaults remain character work in every app entry; explicit scenery,
// motifs and marks remain non-person work even when modes hide that field.
applyCollection('halloween');
Object.assign(context,{collection:'halloween',saved:{history:[]},initialSelections,proposalBatch,sampleNode:()=>node(),renderBoard(){},formError(message){throw new Error(message);}});
vm.runInContext(app.slice(app.indexOf('function makeProposals('),app.indexOf('\nsetCollection(',app.indexOf('function makeProposals('))),context);
for(const costume of [AUTO,...noPersonSubjects]){
 const expected=costume===AUTO?'参照画像の衣装を生かす':costume;
 context.sourceKind='unknown';context.mode='detail';context.selections={...initialSelections(),costume};context.modeSnapshots={};context.proposals=[];
 context.setMode('simple');assert.equal(context.selections.costume,expected,'Switching to a fresh mode must preserve the subject');
 context.selections={...initialSelections(),costume};
 vm.runInContext('(function(){'+shuffle+'})()',context);
 assert.equal(context.selections.costume,expected,'Shuffle must not select an unintended non-person subject');
 context.selections={...initialSelections(),costume};context.proposals=[];
 context.makeProposals();assert.equal(context.proposals.length,3);
 for(const proposal of context.proposals)assert.equal(proposal.costume,expected,'Every proposed combination keeps the intended subject');
}

// Run the actual generate() function through its attachment checks, metadata,
// production prompt, save and result path; only browser/storage plumbing is stubbed.
const generateSource=app.slice(app.indexOf('async function generate('),app.indexOf('\nfunction shareFiles(',app.indexOf('async function generate(')));
async function generated({sourceKind='unknown',costume=AUTO,mode='detail',attachmentMode='chatgpt',lockedValues=null}={}){
 const generationNodes=new Map(),get=id=>{if(!generationNodes.has(id))generationNodes.set(id,node());return generationNodes.get(id);};get('creator').value='';
 const selections={...initialSelections(),medium:'透明水彩',design:'通常の一枚絵',palette:'モノクローム',type:'文字を一切入れない',costume};
 const route=vm.createContext({sourceKinds,sourceSubjectFor,sourceKind,mode,selections,selectedProposal:mode==='auto'?{...selections}:null,attachmentMode,refs:[],historyReady:Promise.resolve(),draftReady:Promise.resolve(),creating:false,adding:false,resettingReferences:false,referenceGeneration:0,draftProfileRevision:0,performance,requestAnimationFrame:callback=>callback(),$:get,normalizeCreator,artworkProfile:()=>profile,syncSaved:async()=>{},questions,AUTO,effectiveSelections,resolveSelections,rng:random,saved:{history:[],used:[],count:0},collection:'halloween',selectionConflicts,needsReference,formError(message){get('form-error').textContent=message;},buildDirection,applyPose,uid:()=>('SOURCE-ROUTE'),stylePresetFor,loadStylePresets:async references=>{assert.equal(references.length,1,'A known style prepares one assistant-provided preset independently of character attachment mode');const ref=references[0],preset=stylePresetFor(ref.medium);assert.deepEqual(ref,preset);const bytes=fs.readFileSync(new URL('../'+preset.file,import.meta.url));return [{...preset,file:new File([bytes],preset.name,{type:preset.file.endsWith('.png')?'image/png':'image/jpeg'})}];},productionPlan,composePrompt,APP_VERSION:'28.4.0',stagePrompts,compactCreatorProfile,persist:async()=>{},renderHistory(){},renderBoard(){},showResult:async()=>{},effects:{celebrate(){}},lockedValues});
 vm.runInContext(generateSource,route);
 return vm.runInContext('generate(lockedValues)',route);
}
for(const mode of ['detail','simple','auto']){
 const result=await generated({mode});assert.equal(result.values.costume,'参照画像の衣装を生かす',mode+' default uses the attached character');
 assert.equal(result.values.sourceKind,'unknown');assert.equal(result.production.noPerson,false);
 for(const costume of noPersonSubjects){const result=await generated({mode,costume});assert.equal(result.values.costume,costume,mode+' preserves explicit non-person output');assert.equal(result.production.noPerson,true);}
}
const direct=await generated({sourceKind:'illustration-person',attachmentMode:'chatgpt'});
assert.equal(direct.values.sourceKind,'illustration-person');assert.equal(direct.references.length,1);assert.equal(direct.references[0].role,'identity');assert.ok(direct.references[0].name);assert.equal(direct.localRefs.length,0);assert.equal(direct.production.noPerson,false);
assert.equal(direct.drawingReferences.length,1);assert.equal(direct.drawingReferences[0].role,'style-preset');assert.equal(direct.drawingReferences[0].medium,direct.values.medium);assert.equal(direct.localDrawingRefs.length,1);assert.equal(direct.localDrawingRefs[0].file.name,direct.drawingReferences[0].name);assert.ok(direct.prompt.includes(direct.drawingReferences[0].name),'Direct attachment mode must name the separate preset in its prompt');
await assert.rejects(generated({sourceKind:'illustration-person',attachmentMode:'bundle'}),/主参照/,'Tool-attachment delivery still requires the uploaded main reference');
for(const sourceKind of ['scenery','mark-object']){
 const result=await generated({sourceKind});assert.equal(result.values.costume,sourceKinds.find(kind=>kind.value===sourceKind).defaultSubject);assert.equal(result.production.noPerson,true);
}
const legacy=await generated({sourceKind:'mark-object',costume:'風景を主役にする',lockedValues:{...initialSelections(),medium:'透明水彩',design:'通常の一枚絵',palette:'モノクローム',type:'文字を一切入れない',costume:'海賊'}});
assert.equal(legacy.values.sourceKind,'unknown');assert.equal(legacy.values.costume,'海賊','Locked legacy work keeps its concrete character choice');
applyCollection('halloween');
console.log('PASS source input routes: '+cases+' collection/style/subject cases; all generation/repair contracts; unknown character defaults and explicit non-person output across real generate/modes/shuffle/proposals; ChatGPT direct identity placeholder and bundle main-reference validation; saved-kind regeneration.');
