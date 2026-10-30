import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {performance} from 'node:perf_hooks';
import fs from 'node:fs';
import vm from 'node:vm';
import {applyCollection} from '../collection.js';
import {initialSelections} from '../modes.js';
import {questions,resolveSelections} from '../catalog.js';
import {buildDirection} from '../direction.js';
import {productionPlan} from '../production-plan.js';
import {composePrompt} from '../prompt.js';
import {deliveryImageFiles} from '../drawing-references.js';
import {compactHistoryRecord,restoreHistoryRecord} from '../history-storage.js';
import {recomposeHistoryDelivery} from '../delivery-history-migration.js';
import {stylePresetFor} from '../style-presets.js';
import {prepareGenerationDelivery,inspectDelivery,inspectDeliveryFiles,scopeGenerationStages,qualityRequestForArchive,qualityAssistEnabled,setQualityAssistEnabled} from '../generation-quality-delivery.js';

// These Files are synthetic transport fixtures, not images judged by an AI.
// Exercise the existing compiler, delivery builder and history codec together.
const random=()=>.24;
function fixture({name='利用者A',id='A',collection='halloween',scenery=false,type='文字を一切入れない',line='セリフなし'}={}){
 applyCollection(collection);
 const values=resolveSelections({...initialSelections(),medium:'発光幻想アニメ',theme:scenery?'山岳と湖のパノラマ':'宇宙のHalloween',place:scenery?'山岳と湖畔':'宇宙ステーションの回廊',costume:scenery?'風景を主役にする':'参照画像の衣装を生かす',design:scenery?'自然・都市の風景画':'通常の一枚絵',palette:'群青 × 月白 × 銀',type,line},random);
 values.sourceKind=scenery?'unknown':'illustration-person';
 values.sceneUnified=true;
 const profile={displayName:name,biography:'',topics:[],activityEnabled:false},edition='QA-'+id;
 const localRefs=scenery?[]:[{id:'user-'+id,draftId:'user-'+id,name:'person-'+id+'.png',role:'identity',file:new File(['PRIVATE SYNTHETIC '+id],'person-'+id+'.png',{type:'image/png'})}];
 const references=localRefs.map(ref=>({id:ref.id,name:'reference-'+id+'.png',role:ref.role}));
 const drawingReferences=scenery?[]:[{id:'style-common',name:'style-other-person.png',role:'style-preset'}];
 const localDrawingRefs=drawingReferences.map(ref=>({...ref,file:new File(['STYLE OTHER PERSON'],ref.name,{type:'image/png'})}));
 const production=productionPlan(profile,values,buildDirection([],values.mood,random,collection,values),collection,random);
 production.referenceManifest=[...references,...drawingReferences];
 const variant=production.variant,prompt=composePrompt({collection,profile,values,variant,edition,references:production.referenceManifest,preparedPlan:production});
 const raw={edition,collection,profile,values,variant,production,prompt,references,drawingReferences,localRefs,localDrawingRefs,attachmentMode:'bundle',isFresh:true};
 return {raw,result:prepareGenerationDelivery(raw,{enabled:true})};
}
const codes=inspection=>inspection.findings.map(finding=>finding.code);
const has=(inspection,code)=>assert(codes(inspection).includes(code),JSON.stringify({expected:code,inspection}));
const noErrors=(inspection,label)=>{assert.equal(inspection.status,'checked',label+': '+JSON.stringify(inspection));assert(!inspection.findings.some(finding=>finding.severity==='error'),label+': '+JSON.stringify(inspection.findings));};
const appSource=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const shareStart=appSource.indexOf('function shareFiles(r){'),shareEnd=appSource.indexOf('function canShareFiles(',shareStart);
assert(shareStart>=0&&shareEnd>shareStart,'Exercise the actual app delivery handlers');
const deliveryContext=vm.createContext({File,deliveryImageFiles,inspectDelivery,inspectDeliveryFiles,scopeGenerationStages,tell(){}});
vm.runInContext(appSource.slice(shareStart,shareEnd),deliveryContext);
const shared=result=>deliveryContext.shareFiles(result);

const a=fixture(),b=fixture({name:'利用者B',id:'B'});
for(const {raw,result}of [a,b]){
 noErrors(result.qualityInspection,'normal preparation');
 const files=shared(result);noErrors(inspectDelivery(result,{files}),'normal share includes prompt.txt');
 noErrors(await inspectDeliveryFiles(result,files),'actual outgoing prompt File');
 noErrors(await deliveryContext.ensureQualityFiles(result,files),'actual app async file verification handler');
 assert.equal(await files.at(-1).text(),result.prompt,'The actual prompt File contains the same text copied by this request');
 assert.equal(await files[0].text(),await raw.localRefs[0].file.text(),'User source bytes are unchanged');
 assert.equal(result.qualityInspection.imageStatus,'uninspected');
 assert.notEqual(result.prompt,raw.prompt,'The generation ID/scope is actually applied');
 assert.equal(raw.localRefs[0].file,result.localRefs[0].file,'Quality preparation retains immutable File objects');
 assert.equal(prepareGenerationDelivery(result,{enabled:true}).prompt,result.prompt,'Reopening a delivery does not duplicate the quality text');
}
assert.notEqual(a.result.qualityRequest,b.result.qualityRequest);
assert(!b.result.prompt.includes('reference-A.png'));
assert(!a.result.prompt.includes('reference-B.png'));
assert.equal(a.result.qualityRequest.author.name,'利用者A');
assert.equal(b.result.qualityRequest.author.name,'利用者B');

const sourcePrompt=a.result.prompt;
has(inspectDelivery({...a.result,values:{...a.result.values,medium:'水墨画'}}),'stale-selections');
assert.throws(()=>shared({...a.result,values:{...a.result.values,medium:'水墨画'}}),/今回の選択/,'Actual outgoing share handler rejects a stale selection snapshot');
has(inspectDelivery({...a.result,prompt:a.result.prompt.split(a.result.values.medium).join('REMOVED_SELECTED_STYLE')}),'missing-selection');
has(inspectDelivery(a.result,{copyPrompt:a.result.prompt+'EXTRA'}),'delivery-text');
has(inspectDelivery(a.result,{filePrompt:a.result.prompt+'EXTRA'}),'delivery-text');
const files=shared(a.result);
const corruptPromptFiles=files.map(file=>file.name==='prompt.txt'?new File(['OTHER SET\n'+a.result.prompt],'prompt.txt',{type:'text/plain'}):file);
has(await inspectDeliveryFiles(a.result,corruptPromptFiles),'delivery-text');
await assert.rejects(deliveryContext.ensureQualityFiles(a.result,corruptPromptFiles),/一致しません/,'Actual app guard rejects altered prompt.txt bytes');
has(await inspectDeliveryFiles(a.result,files.filter(file=>file.name!=='prompt.txt')),'missing-prompt-file');
const unreadable=files.map(file=>file.name==='prompt.txt'?{name:'prompt.txt',type:'text/plain',text:async()=>{throw Error('unreadable');}}:file);
assert.equal((await inspectDeliveryFiles(a.result,unreadable)).status,'error','Unreadable outgoing bytes remain uninspected');
has(inspectDelivery(a.result,{files:files.filter(file=>file.name!=='reference-A.png')}),'missing-file');
has(inspectDelivery(a.result,{files:[...files,new File(['WRONG'],'from-another-set.png',{type:'image/png'})]}),'unexpected-file');
const reversedPlan={...a.result.production,referenceManifest:a.result.production.referenceManifest.map(ref=>ref.id==='style-common'?{...ref,role:'identity'}:ref)};
has(inspectDelivery({...a.result,production:reversedPlan}),'reference-assignment');
assert.throws(()=>deliveryImageFiles({...a.result,localRefs:a.result.localRefs.map(ref=>({...ref,id:'missing-id',draftId:'missing-id'}))},{FileClass:File}),/対応を確認/);
assert.throws(()=>deliveryImageFiles({...a.result,localRefs:a.result.localRefs.map(ref=>({...ref,role:'avoid'}))},{FileClass:File}),/対応を確認/);
assert.equal(a.result.prompt,sourcePrompt,'Fault injection must not mutate the prepared result');

const scenery=fixture({name:'景観作者',id:'SCENERY',collection:'everyday',scenery:true});
noErrors(scenery.result.qualityInspection,'existing no-reference scenery path');
noErrors(inspectDelivery(scenery.result,{files:shared(scenery.result)}),'scenery share without a primary reference');
assert.equal(scenery.result.qualityRequest.noPerson,true);
assert.equal(scenery.result.qualityRequest.referenceRequired,false);
assert.equal(scenery.result.qualityRequest.references.length,0);

const exact='「夜🦇」 e\u0301 ＆ S\\N／𠮷';
const typography=fixture({id:'TEXT',type:'セリフのみ',line:exact});
noErrors(typography.result.qualityInspection,'exact special-character copy');
assert(typography.result.qualityRequest.text.slots.some(slot=>slot.text===exact),'The renderer must preserve the user’s exact manuscript');
has(inspectDelivery({...typography.result,prompt:typography.result.prompt.split(JSON.stringify(exact)).join(JSON.stringify('別の文字列')).split(exact).join('別の文字列')}),'exact-text');
assert.equal(await shared(typography.result).at(-1).text(),typography.result.prompt);

// A normal archive does not retain image bytes or a second copy of the prompt.
const archived=await compactHistoryRecord({...a.result,stages:{final:a.result.prompt}},{archiveCore:true});
assert.equal(archived.localRefs,undefined);assert.equal(archived.localDrawingRefs,undefined);
const reopened=await restoreHistoryRecord(JSON.parse(JSON.stringify(archived)));
assert.equal(reopened.prompt,a.result.prompt);
assert.equal(reopened.qualityRequest.outputPrompt,a.result.prompt);
assert.deepEqual(reopened.qualityRequest.selections,a.result.values);
const archiveRequest=qualityRequestForArchive(a.result.qualityRequest);
assert.equal(archiveRequest.outputPrompt,undefined);
assert.equal(a.result.qualityRequest.outputPrompt,a.result.prompt,'Archive preparation cannot mutate a live request');
assert.equal(prepareGenerationDelivery(reopened,{enabled:true}).prompt,a.result.prompt);
const archivedReferences=JSON.stringify(reopened.references);
let historyDelivery=recomposeHistoryDelivery(reopened,{version:'QA-current'});
historyDelivery={...historyDelivery,localDrawingRefs:historyDelivery.drawingReferences.map(ref=>({...ref,file:new File(['HISTORY STYLE FIXTURE'],ref.name,{type:'image/png'})})),localSelectionReference:{...historyDelivery.selectionReference,file:new File(['HISTORY SHEET FIXTURE'],historyDelivery.selectionReference.name,{type:'image/jpeg'})}};
historyDelivery=prepareGenerationDelivery(historyDelivery,{enabled:true});
noErrors(historyDelivery.qualityInspection,'history preparation with unavailable user originals');
has(historyDelivery.qualityInspection,'pending-reference');
noErrors(await inspectDeliveryFiles(historyDelivery,shared(historyDelivery)),'history can share current style/prompt with an explicit reattachment notice');
assert(historyDelivery.qualityRequest.references.find(ref=>ref.id==='user-A').pending);
assert.equal(JSON.stringify(reopened.references),archivedReferences,'History export must not rewrite saved reference roles or metadata');
assert.equal(historyDelivery.localRefs,undefined,'History must not borrow images from another current draft');

// The optional individual-image path has its own reference manifest. Its
// new request cannot change the main sheet delivery or reuse the old manifest.
const mainManifest=JSON.stringify(a.result.production.referenceManifest),mainRequest=a.result.qualityRequest;
const individualRef={id:'individual-pose',name:'selection-pose.png',role:'selection-condition'};
const individualProduction=structuredClone(a.result.production);individualProduction.referenceManifest=[...individualProduction.referenceManifest,individualRef];
const individualPrompt=composePrompt({collection:a.result.collection,profile:a.result.profile,values:a.result.values,variant:a.result.variant,edition:a.result.edition,references:individualProduction.referenceManifest,preparedPlan:individualProduction});
const individual=prepareGenerationDelivery({...a.result,prompt:individualPrompt,production:individualProduction,qualityRequest:null},{enabled:true});
noErrors(individual.qualityInspection,'individual manifest generation');
assert(individual.qualityRequest.references.some(ref=>ref.id==='individual-pose'));
assert(!mainRequest.references.some(ref=>ref.id==='individual-pose'));
assert.equal(JSON.stringify(a.result.production.referenceManifest),mainManifest);
assert.equal(a.result.qualityRequest,mainRequest);assert.equal(a.result.prompt,sourcePrompt);

const disabled=prepareGenerationDelivery(a.raw,{enabled:false});
assert.equal(disabled.prompt,a.raw.prompt);assert.equal(disabled.qualityRequest,null);
assert.equal(disabled.localRefs,a.raw.localRefs);assert.equal(disabled.qualityInspection.imageStatus,'uninspected');
const exceptional=prepareGenerationDelivery({...a.raw,prompt:null},{enabled:true});
assert.equal(exceptional.qualityInspection.status,'error');assert.equal(exceptional.prompt,null);
assert.equal(exceptional.localRefs,a.raw.localRefs,'Inspector failure preserves source files');
const storage=new Map(),memory={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
assert(qualityAssistEnabled(memory));assert(setQualityAssistEnabled(false,memory));assert.equal(qualityAssistEnabled(memory),false);
assert(setQualityAssistEnabled(true,memory));assert(qualityAssistEnabled(memory));
const deniedStorage={getItem(){throw new Error('privacy');},setItem(){throw new Error('privacy');}};
assert.equal(qualityAssistEnabled(deniedStorage),true);assert.equal(setQualityAssistEnabled(false,deniedStorage),false);

// Preserve normal prompt preparation across the complete existing medium
// catalogue, rather than only passing a hand-written quality-module fixture.
let validStyleCases=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 for(const medium of questions.find(question=>question.key==='medium').groups.flatMap(group=>group.values)){
  const values=resolveSelections({...initialSelections(),medium,costume:'参照画像の衣装を生かす',type:'文字を一切入れない',line:'セリフなし',design:'通常の一枚絵',sceneUnified:true},random);values.sourceKind='illustration-person';
  const profile={displayName:'MATRIX USER',activityEnabled:false},variant=buildDirection([],values.mood,random,collection,values),production=productionPlan(profile,values,variant,collection,random);
  if(production.issues.some(issue=>issue.severity==='error'))continue;
  const style=stylePresetFor(medium),references=[{id:'matrix-main',name:'matrix-user.png',role:'identity'},...(style?[style]:[])];production.referenceManifest=references;
  const prompt=composePrompt({collection,profile,values,variant:production.variant,references,edition:'MATRIX',preparedPlan:production});
  const prepared=prepareGenerationDelivery({isFresh:true,edition:'MATRIX',collection,profile,values,variant:production.variant,production,prompt,attachmentMode:'bundle',references:[references[0]]},{enabled:true});
  noErrors(prepared.qualityInspection,collection+' / '+medium);validStyleCases++;
 }
}
assert(validStyleCases>=200,'The normal case matrix must actually exercise both catalogues');

const timings=[];for(let index=0;index<15;index++){const start=performance.now();prepareGenerationDelivery(a.raw,{enabled:true});timings.push(performance.now()-start);}timings.sort((left,right)=>left-right);
console.log(JSON.stringify({result:'PASS quality delivery integration',cases:'real compiler + actual app File handlers, A/B separation, no-person/no-reference, deliberate selection/text/file/role/ID failures, exact Unicode, history codec/pending reattachment, independent individual manifest, disable and exception preservation',validStyleCases,normalFindings:a.result.qualityInspection.findings,sceneryFindings:scenery.result.qualityInspection.findings,medianPrepareQualityMs:Math.round(timings[7]*1000)/1000,imageContentJudgment:'not executed',realDevice:'not executed'}));

// Optional helper stages carry the same request policy without changing the original plan.
const scopedStages=scopeGenerationStages(a.result,{repair:'髪型・識別色・固有の印と明示された非人間の形は保持し',internal:true});
assert.match(scopedStages.repair,/今回の制作ID/);assert.match(scopedStages.repair,/髪型・髪色の固定は今回明示した場合だけ/);assert.equal(scopedStages.internal,true);assert.equal(scopeGenerationStages(disabled,{repair:'original'}).repair,'original');
