import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {File} from 'node:buffer';
import {selectionReferenceManifest,selectionReferenceRules,buildSelectionReferenceSheet,SELECTION_SHEET_NAME} from '../selection-references.js?v=28.4.3';
import {deliveryImageFiles} from '../drawing-references.js?v=28.4.3';
import {questions,visibleQuestions,resolveSelections,normalizeCreator,AUTO} from '../catalog.js?v=28.4.3';
import {initialSelections,effectiveSelections} from '../modes.js?v=28.4.3';
import {applyCollection} from '../collection.js?v=28.4.3';
import {sourceKinds,sourceSubjectFor} from '../source-kind.js?v=28.4.3';
import {selectionConflicts} from '../compatibility.js?v=28.4.3';
import {buildDirection} from '../direction.js?v=28.4.3';
import {applyPose} from '../poses.js?v=28.4.3';
import {productionPlan} from '../production-plan.js?v=28.4.3';
import {stagePrompts} from '../production-workflow.js?v=28.4.3';
import {composePrompt,needsReference} from '../prompt.js?v=28.4.3';
import {stylePresetFor,loadStylePresets} from '../style-presets.js?v=28.4.3';
import {compactCreatorProfile} from '../creator.js?v=28.4.3';
import {compactHistoryRecord,restoreHistoryRecord,restoreHistoryCore} from '../history-storage.js?v=28.4.3';
import {readRasterDimensions} from '../image-resources.js?v=28.4.3';
import {makeZip} from '../zip.js?v=28.4.3';

const root=new URL('../',import.meta.url),app=fs.readFileSync(new URL('app.js',root),'utf8');
const visibleKeys=['medium','theme','costume','pose','mood','angle','palette','design','type','size'];
const fixture={medium:'発光幻想アニメ',theme:'吸血鬼の晩餐会',costume:'亡霊騎士',pose:'低くしゃがむ',mood:'牙を見せて威嚇',angle:'超ローアングル・70度',palette:'菫 × マンゴー × 白',design:'新聞の一面',type:'HALLOWEENのみ',size:'A4縦・300dpi目安｜2480×3508｜210:297',sceneUnified:true,line:'セリフなし'};
const profile={displayName:'参照シート検査',activityEnabled:false},random=()=>.34;
const plain=value=>JSON.parse(JSON.stringify(value));
function selected(overrides={}){return resolveSelections({...initialSelections(),...fixture,...overrides},random);}

// Inspect image bytes rather than trusting a catalog label or filename. SVG
// fragments must name a real view and survive the browser Image URL unchanged.
const checkedAssets=new Map();
async function inspectAsset(src){
 const url=new URL(src,root),hash=url.hash.slice(1);url.hash='';
 assert.equal(url.protocol,'file:','Selected examples must be local, bundled assets');
 let asset=checkedAssets.get(url.href);
 if(!asset){
  const bytes=fs.readFileSync(url);assert.ok(bytes.length>32,'A registered image must contain actual image bytes: '+src);
  if(url.pathname.endsWith('.svg')){
   const xml=bytes.toString('utf8');assert.match(xml,/<svg\b/);assert.match(xml,/xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/);
   assert.match(xml,/<(?:path|rect|circle|ellipse|polygon|polyline|line|image|use)\b/,'SVG cannot be only a text placeholder: '+src);
   asset={xml};
  }else{
   const dims=await readRasterDimensions(new Blob([bytes]));assert.ok(dims.width>1&&dims.height>1,'Raster example must have meaningful dimensions: '+src);asset={dims};
  }
  checkedAssets.set(url.href,asset);
 }
 if(hash){assert.ok(asset.xml,'Fragments are only supported on the SVG example sheets');const id=decodeURIComponent(hash).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');assert.match(asset.xml,new RegExp('<view\\b[^>]*\\bid=["\\\']'+id+'["\\\'][^>]*\\bviewBox='),'SVG fragment must select a viewBox: '+src);}
 return asset;
}
let catalogSelections=0;
for(const collection of ['halloween','everyday']){
 applyCollection(collection);
 assert.deepEqual(visibleQuestions.map(q=>q.key),visibleKeys,'The delivered sheet follows the ten visible choices, not hidden place/line settings');
 const base=selected(),manifest=selectionReferenceManifest(base);
 assert.equal(manifest.role,'selection-sheet');assert.equal(manifest.name,SELECTION_SHEET_NAME);assert.equal(manifest.items.length,10);
 assert.deepEqual(manifest.items.map(item=>item.key),visibleKeys);
 assert.equal(new Set(manifest.items.map(item=>item.scope)).size,10,'Every kind of example has a different reading scope');
 assert.match(manifest.items.find(i=>i.key==='medium').scope,/描線.*人物.*借りない/);
 assert.match(manifest.items.find(i=>i.key==='pose').scope,/関節.*支持.*カメラ.*借りない/);
 assert.match(manifest.items.find(i=>i.key==='design').scope,/画像枠.*文字枠.*印字しない/);
 assert.match(selectionReferenceRules(manifest).join('\n'),/主参照だけが人物の識別基準/);
 for(const q of visibleQuestions)for(const value of new Set(q.groups.flatMap(group=>group.values))){
  const item=selectionReferenceManifest({...base,[q.key]:value}).items.find(i=>i.key===q.key);
  assert.equal(item.value,value);assert.ok(item.sample,'A selected item needs reference metadata');
  assert.notEqual(item.sample.kind,'custom','Registered choices cannot quietly fall back to a title-only placeholder: '+collection+'/'+q.key+'/'+value);
  if(item.sample.kind==='image')await inspectAsset(item.sample.src);
  else if(item.sample.kind==='auto'){assert.ok(item.sample.srcs.length,'AUTO examples need actual visual candidates');for(const src of item.sample.srcs)await inspectAsset(src);}
  else assert.ok(['reference','size','type'].includes(item.sample.kind),'Unexpected non-image example: '+item.sample.kind);
  catalogSelections++;
 }
}
applyCollection('halloween');

function renderer({failure='',failureAt=1,delay=0}={}){
 const stats={texts:[],draws:[],requests:[],images:[],active:0,maxActive:0,encodes:[],dimensions:[]};
 const ctx={measureText:s=>({width:String(s).length*13}),fillText:(text,x,y)=>stats.texts.push({text,x,y}),fillRect(){},strokeRect(){},drawImage:(image,...coords)=>{if(failure==='draw')throw new Error('mock draw failed');stats.draws.push({src:image.src,coords});}};
 const canvas={get width(){return this._width;},set width(v){this._width=v;stats.dimensions.push(['width',v]);},get height(){return this._height;},set height(v){this._height=v;stats.dimensions.push(['height',v]);},getContext:()=>failure==='context'?null:ctx,toBlob:(callback,type,quality)=>{stats.encodes.push({type,quality,width:canvas.width,height:canvas.height});callback(failure==='encode'?null:new Blob(['SHEET IMAGE BYTES'],{type}));}};
 class ImageClass{
  constructor(){this.naturalWidth=800;this.naturalHeight=600;stats.images.push(this);}
  get src(){return this._src;}
  set src(value){this._src=value;stats.requests.push(value);stats.active++;stats.maxActive=Math.max(stats.maxActive,stats.active);const index=stats.requests.length;
   if(failure==='timeout'&&index===failureAt)return;
   const done=()=>{stats.active--;if(failure==='image'&&index===failureAt)this.onerror?.();else{if(failure==='dimensions'&&index===failureAt)this.naturalWidth=this.naturalHeight=0;this.onload?.();}};
   delay?setTimeout(done,delay):queueMicrotask(done);
  }
 }
 const dependencies={documentImpl:{createElement:tag=>{assert.equal(tag,'canvas');return canvas;}},ImageClass,FileClass:File,imageTimeoutMs:40};
 return {stats,canvas,dependencies};
}
function assertReleased(run){assert.equal(run.canvas.width,1);assert.equal(run.canvas.height,1);for(const image of run.stats.images){assert.equal(image.onload,null);assert.equal(image.onerror,null);}}
const manifest=selectionReferenceManifest(selected()),normal=renderer();
const sheet=await buildSelectionReferenceSheet(manifest,normal.dependencies);
assert.equal(sheet.name,SELECTION_SHEET_NAME);assert.equal(sheet.type,'image/jpeg');assert.ok(sheet.size>0);
assert.equal(normal.stats.draws.length,8);assert.equal(normal.stats.maxActive,1,'Decode each image sequentially to bound memory');
assert.deepEqual(normal.stats.encodes,[{type:'image/jpeg',quality:.91,width:2048,height:3350}]);
for(const draw of normal.stats.draws){const [x,y,width,height]=draw.coords;assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&width>0&&width<=956&&height>0&&height<=410,'Fit each complete example within its own cell');}
assertReleased(normal);
const fragmentManifest=selectionReferenceManifest(selected({design:'ゴシック雑誌の表紙'}));
const fragmentItem=fragmentManifest.items.find(i=>i.key==='design');assert.ok(fragmentItem.sample.src.includes('#'),'This test needs a real sheet fragment');
await inspectAsset(fragmentItem.sample.src);const fragmented=renderer();await buildSelectionReferenceSheet(fragmentManifest,fragmented.dependencies);
assert.ok(fragmented.stats.requests.includes(new URL(fragmentItem.sample.src,root).href),'Native Image keeps #format-* instead of decoding the entire SVG sheet');assertReleased(fragmented);
for(const failure of ['context','image','dimensions','draw','encode','timeout']){
 const run=renderer({failure,failureAt:2});await assert.rejects(buildSelectionReferenceSheet(manifest,run.dependencies));assertReleased(run);
 if(failure==='timeout')assert.equal(run.stats.draws.length,1,'Timeout aborts the failed build rather than creating a silently incomplete reference sheet');
}
const constructorFailure=renderer();constructorFailure.dependencies.FileClass=class{constructor(){throw new Error('mock File failed');}};
await assert.rejects(buildSelectionReferenceSheet(manifest,constructorFailure.dependencies),/mock File failed/);assertReleased(constructorFailure);

// Type-picker samples are illustrations, not approved manuscripts. Restrict
// copy in this sheet to the literal selected HALLOWEEN, or unnamed empty boxes.
for(const collection of ['halloween','everyday'])for(const type of ['HALLOWEENのみ','HALLOWEEN＋クリエイター名','文字を一切入れない','新聞風・記事と段組み','クリエイター名だけ']){
 applyCollection(collection);const run=renderer();await buildSelectionReferenceSheet(selectionReferenceManifest(selected({type})),run.dependencies);
 const typeBody=run.stats.texts.filter(t=>t.x>=0&&t.x<1024&&t.y>=4*670+100&&t.y<4*670+530).map(t=>t.text);
 assert.deepEqual(typeBody,type.startsWith('HALLOWEEN')?['HALLOWEEN']:[],collection+'/'+type+' must not invent names, article text, or substitute a different literal');assertReleased(run);
}
applyCollection('halloween');

function domNode(text=''){return {value:'',textContent:text,hidden:false,disabled:false,open:false,offsetWidth:0,dataset:{},children:[],classList:{add(){},remove(){}},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},addEventListener(){},scrollIntoView(){}};}
const generateSource=app.slice(app.indexOf('async function generate('),app.indexOf('\nfunction shareFiles(',app.indexOf('async function generate(')));
const fetchImpl=async url=>new Response(fs.readFileSync(url),{headers:{'Content-Type':String(url).endsWith('.png')?'image/png':'image/jpeg'}});
async function actualGeneration({attachmentMode='bundle',type='HALLOWEENのみ',failure=''}={}){
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,domNode());return nodes.get(id);};
 const selections=selected({type}),character=new File(['ORIGINAL IDENTITY BYTES'],'character.png',{type:'image/png'}),run=renderer({failure});
 let shown=null,persisted=0;
 const saved={history:[],used:[],count:0};
 const context=vm.createContext({sourceKinds,sourceSubjectFor,sourceKind:'photo-person',mode:'detail',selections,selectedProposal:null,attachmentMode,refs:[{file:character,name:character.name,role:'identity',width:600,height:800}],historyReady:Promise.resolve(),draftReady:Promise.resolve(),creating:false,adding:false,resettingReferences:false,referenceGeneration:0,draftProfileRevision:0,inputRevision:0,performance,requestAnimationFrame:callback=>callback(),$,normalizeCreator,artworkProfile:()=>profile,syncSaved:async()=>{},questions,AUTO,effectiveSelections,resolveSelections,rng:random,saved,collection:'halloween',selectionConflicts,needsReference,formError:message=>{$('form-error').textContent=message;},buildDirection,applyPose,uid:()=>('SHEET-ROUTE-'+type),stylePresetFor,loadStylePresets:refs=>loadStylePresets(refs,{fetchImpl,FileClass:File}),selectionReferenceManifest,buildSelectionReferenceSheet:m=>buildSelectionReferenceSheet(m,run.dependencies),productionPlan,composePrompt,APP_VERSION:'28.4.3',stagePrompts,compactCreatorProfile,persist:async()=>{persisted++;},renderHistory(){},renderBoard(){},showResult:async r=>{shown=r;},effects:{celebrate(){}},File,lockedValues:null});
 vm.runInContext(generateSource,context);
 try{return {result:await vm.runInContext('generate(lockedValues)',context),saved,run,character,nodes,shown,persisted,context};}
 catch(error){error.testState={saved,run,nodes,shown,persisted,context};throw error;}
}
const generated=await actualGeneration(),result=generated.result;
assert.strictEqual(generated.shown,result);assert.equal(generated.persisted,1);assert.equal(result.selectionReference.items.length,10);assert.equal(result.localSelectionReference.file.name,SELECTION_SHEET_NAME);
assert.deepEqual(result.selectionReference.items.map(i=>i.value),visibleKeys.map(k=>result.values[k]));
assert.equal(result.production.referenceManifest.filter(ref=>ref.role==='selection-sheet').length,1);
assert.deepEqual(plain(result.production.copy.slots).map(slot=>slot.text),['HALLOWEEN']);
for(const item of result.selectionReference.items)assert.ok(result.prompt.includes(item.value),'The generated concise handoff retains selected '+item.key);
for(const ref of [...result.references,...result.drawingReferences,result.selectionReference])assert.ok(result.prompt.includes(ref.name),'Handoff names every attached role: '+ref.name);
assert.match(result.prompt,/主参照/);assert.match(result.prompt,/選択見本シート/);assert.match(result.prompt,/描画.*資料|画風.*見本|原寸見本/);
const delivered=deliveryImageFiles(result,{FileClass:File});
assert.deepEqual(delivered.map(file=>file.name),[result.references[0].name,result.drawingReferences[0].name,SELECTION_SHEET_NAME],'Delivery order: unchanged primary identity, separate original style, one selected-condition sheet; no duplicates');
assert.equal(await delivered[0].text(),await generated.character.text());assert.strictEqual(delivered[1],result.localDrawingRefs[0].file);assert.strictEqual(delivered[2],result.localSelectionReference.file);
assertReleased(generated.run);
const direct=await actualGeneration({attachmentMode:'chatgpt',type:'文字を一切入れない'});
assert.deepEqual(plain(direct.result.production.copy.slots),[]);assert.equal(direct.result.references[0].role,'identity');assert.equal(direct.result.localRefs.length,0);
assert.deepEqual(deliveryImageFiles(direct.result,{FileClass:File}).map(f=>f.name),[direct.result.drawingReferences[0].name,SELECTION_SHEET_NAME],'Direct identity attachment still delivers both tool-supplied reference images');
for(const failure of ['image','timeout'])await assert.rejects(actualGeneration({failure}),error=>{
 const failed=error.testState;assert.ok(failed);assert.equal(failed.persisted,0);assert.equal(failed.saved.history.length,0);assert.equal(failed.saved.count,0);assert.equal(failed.shown,null);assert.equal(failed.context.creating,false);assert.equal(failed.nodes.get('generate').disabled,false);assert.equal(failed.nodes.get('generation-status').hidden,true);assertReleased(failed.run);return /選択見本/.test(error.message);
},'A failed reference preparation must not save or present an incomplete production');

// Exercise real app share and ZIP handlers, not only deliveryImageFiles().
let shared,zip;
const shareContext=vm.createContext({currentResult:result,File,deliveryImageFiles,navigator:{share:async payload=>{shared=payload;}},canShareFiles:()=>true,$:id=>generated.nodes.get(id)||domNode(),showShareFallback(){throw new Error('Unexpected share fallback');},needsReference,TextEncoder,Uint8Array,makeZip,creatorDisplayLabel:()=>profile.displayName,download:blob=>{zip=blob;},tell(){}});
vm.runInContext(app.slice(app.indexOf('function shareFiles('),app.indexOf('\nfunction canShareFiles(')),shareContext);
vm.runInContext(app.slice(app.indexOf('async function shareAll()'),app.indexOf('\nfunction showShareFallback(')),shareContext);
await shareContext.shareAll();assert.deepEqual(plain(shared.files.map(f=>f.name)),delivered.map(f=>f.name));assert.equal(shared.text,result.prompt);
vm.runInContext(app.slice(app.indexOf('async function downloadKit()'),app.indexOf('\nfunction renderHistory(')),shareContext);await shareContext.downloadKit();
const zipBytes=Buffer.from(await zip.arrayBuffer()),zipEntries=[];let offset=0;
while(zipBytes.readUInt32LE(offset)===0x04034b50){const length=zipBytes.readUInt32LE(offset+18),nameLength=zipBytes.readUInt16LE(offset+26),extra=zipBytes.readUInt16LE(offset+28),name=zipBytes.subarray(offset+30,offset+30+nameLength).toString('utf8'),start=offset+30+nameLength+extra;zipEntries.push({name,data:zipBytes.subarray(start,start+length)});offset=start+length;}
assert.deepEqual(zipEntries.map(entry=>entry.name),['prompt.txt','使い方.txt','selected-conditions.txt',...delivered.map(f=>f.name)]);
assert.equal(zipEntries.find(entry=>entry.name==='prompt.txt').data.toString('utf8'),result.prompt);
assert.equal(zipEntries.find(entry=>entry.name===result.references[0].name).data.toString('utf8'),await generated.character.text());
for(const item of result.selectionReference.items)assert.ok(zipEntries.find(e=>e.name==='selected-conditions.txt').data.toString('utf8').includes(item.value));

// Persist enough metadata to rebuild the same sheet after page reload, while
// keeping File/image blobs out of the bounded history store.
const compact=await compactHistoryRecord(result,{archiveCore:true}),roundTrip=JSON.parse(JSON.stringify(compact));
assert.deepEqual(roundTrip.selectionReference,plain(result.selectionReference));assert.ok(!roundTrip.localSelectionReference&&!roundTrip.localRefs&&!roundTrip.localDrawingRefs&&!roundTrip.referenceBoardFile);
const restored=await restoreHistoryRecord(roundTrip);assert.deepEqual(restored.selectionReference,plain(result.selectionReference));assert.equal(restored.prompt,result.prompt);assert.deepEqual(restored.production.referenceManifest,plain(result.production.referenceManifest));
const reloaded=renderer(),reloadSheet=await buildSelectionReferenceSheet(restored.selectionReference,reloaded.dependencies);assert.equal(reloadSheet.name,SELECTION_SHEET_NAME);assert.deepEqual(reloaded.stats.requests,generated.run.stats.requests);assertReleased(reloaded);

// Reload the compacted record through the real result handler. Only DOM,
// object-URL presentation and layout preview plumbing are mocked here.
const historyNodes=new Map(),historyNode=id=>{if(!historyNodes.has(id))historyNodes.set(id,domNode());return historyNodes.get(id);},historyRender=renderer(),objectFiles=[];
const historyContext=vm.createContext({resultRequest:0,inputRevision:0,currentResult:null,resultObjectURLs:[],disposeLayoutPreview(){},restoreHistoryRecord,restoreHistoryCore,loadStylePresets:refs=>loadStylePresets(refs,{fetchImpl,FileClass:File}),buildSelectionReferenceSheet:m=>buildSelectionReferenceSheet(m,historyRender.dependencies),clearPreparedResult(){},tell:message=>{throw new Error(message);},URL:{createObjectURL:file=>{objectFiles.push(file);return 'blob:mock-'+objectFiles.length;}},$:historyNode,APP_VERSION:'28.4.3',needsReference,AUTO,sourceKinds,creatorDisplayLabel:()=>profile.displayName,el:(tag,className,text)=>domNode(text),appendRecipeEvidence(){},document:{createTextNode:domNode,body:{dataset:{motion:'off'}}},editorialReferencesFor:()=>[],createLayoutPanel:()=>({element:domNode(),dispose(){}}),canShareFiles:()=>true,deliveryImageFiles,shareFiles:r=>deliveryImageFiles(r,{FileClass:File}),download(){}});
vm.runInContext(app.slice(app.indexOf('async function showResult('),app.indexOf('\nasync function copyPrompt(')),historyContext);
await historyContext.showResult(roundTrip);
assert.equal(historyContext.currentResult.localSelectionReference.file.name,SELECTION_SHEET_NAME,'Opening saved history rebuilds its selected-condition attachment automatically');
assert.equal(historyContext.currentResult.localDrawingRefs[0].file.name,result.drawingReferences[0].name);
assert.deepEqual(objectFiles.map(file=>file.name),[result.drawingReferences[0].name,SELECTION_SHEET_NAME]);
assert.equal(historyNode('prompt-output').value,result.prompt);assert.equal(historyNode('result').hidden,false);assert.equal(historyNode('result-refs').children.length,2);assertReleased(historyRender);
applyCollection('halloween');
console.log('PASS selected reference sheet: '+catalogSelections+' registered collection choices / '+checkedAssets.size+' real assets; ten scoped roles, SVG fragment views, bounded sequential decode, release and timeout failures, explicit manuscript only; actual generate/share/ZIP and identity→style→sheet delivery, intact originals, reloadable history metadata. Image quality and browser layout are not evaluated by mocked canvas.');
