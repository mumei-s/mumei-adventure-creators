import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {File} from 'node:buffer';
import {selectionReferenceManifest,selectionReferenceRules,selectionReferenceConditions,selectionReferenceCounts,selectionSheetItems,individualSelectionReferenceManifest,buildIndividualSelectionReferences,buildIndividualSelectionReferenceZip,buildSelectionReferenceSheet,SELECTION_SHEET_NAME} from '../selection-references.js?v=28.4.6';
import {sampleFor} from '../examples.js?v=28.4.6';
import {deliveryImageFiles} from '../drawing-references.js?v=28.4.6';
import {questions,visibleQuestions,resolveSelections,normalizeCreator,AUTO} from '../catalog.js?v=28.4.6';
import {initialSelections,effectiveSelections} from '../modes.js?v=28.4.6';
import {applyCollection} from '../collection.js?v=28.4.6';
import {sourceKinds,sourceSubjectFor} from '../source-kind.js?v=28.4.6';
import {selectionConflicts} from '../compatibility.js?v=28.4.6';
import {buildDirection} from '../direction.js?v=28.4.6';
import {applyPose} from '../poses.js?v=28.4.6';
import {productionPlan} from '../production-plan.js?v=28.4.6';
import {stagePrompts,optionalIdentityPrompts} from '../production-workflow.js?v=28.4.6';
import {composePrompt,needsReference} from '../prompt.js?v=28.4.6';
import {stylePresetFor,loadStylePresets} from '../style-presets.js?v=28.4.6';
import {compactCreatorProfile} from '../creator.js?v=28.4.6';
import {recomposeHistoryDelivery} from '../delivery-history-migration.js?v=28.4.6';
import {compactHistoryRecord,restoreHistoryRecord,restoreHistoryCore} from '../history-storage.js?v=28.4.6';
import {readRasterDimensions} from '../image-resources.js?v=28.4.6';
import {makeZip} from '../zip.js?v=28.4.6';
import {attachmentConditionPolicy,selectionAttachmentPolicy} from '../attachment-policy.js?v=28.4.6';

const root=new URL('../',import.meta.url),app=fs.readFileSync(new URL('app.js',root),'utf8');
const visibleKeys=['medium','theme','costume','pose','mood','angle','palette','design','type','size'];
const fixture={medium:'透明水彩',theme:'吸血鬼の晩餐会',costume:'亡霊騎士',pose:'低くしゃがむ',mood:'牙を見せて威嚇',angle:'超ローアングル・70度',palette:'菫 × マンゴー × 白',design:'新聞の一面',type:'HALLOWEENのみ',size:'A4縦・300dpi目安｜2480×3508｜210:297',sceneUnified:true,line:'セリフなし'};
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
 assert.equal(manifest.schemaVersion,2);assert.equal(manifest.role,'selection-sheet');assert.equal(manifest.name,SELECTION_SHEET_NAME);assert.equal(manifest.items.length,8);
 assert.deepEqual(manifest.conditions.map(item=>item.key),visibleKeys);
 assert.deepEqual(manifest.items.map(item=>item.key),visibleKeys.filter(key=>!['medium','size'].includes(key)));
 assert.deepEqual(manifest.counts,{selected:10,sheet:8,separateStyle:1});
 assert.equal(new Set(manifest.conditions.map(item=>item.scope)).size,10,'Every kind of example has a different reading scope');
 assert.match(manifest.mediumReference.scope,/描線.*人物.*借りない/);assert.equal(manifest.mediumReference.inSheet,false);
 assert.match(manifest.items.find(i=>i.key==='pose').scope,/関節.*支持.*カメラ.*借りない/);
 assert.match(manifest.items.find(i=>i.key==='design').scope,/画像枠.*文字枠.*印字しない/);
 assert.match(selectionReferenceRules(manifest).join('\n'),/主参照だけが人物の識別基準/);
 for(const q of visibleQuestions)for(const value of new Set(q.groups.flatMap(group=>group.values))){
  const picked=selectionReferenceManifest({...base,[q.key]:value}),condition=picked.conditions.find(i=>i.key===q.key);assert.equal(condition.value,value);
  if(q.key==='medium'){const master=stylePresetFor(value);assert.ok(master,'Every registered medium needs a separate original');assert.equal(picked.mediumReference.file,master.file);await inspectAsset('./'+master.file);catalogSelections++;continue;}
  if(!condition.deliverVisual){assert.ok(!picked.items.some(i=>i.key===q.key),'Redundant or non-applicable diagrams must not enter the image input');catalogSelections++;continue;}
  const item=picked.items.find(i=>i.key===q.key);
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
const sampleCalls=[];selectionReferenceManifest(selected(),{sample:(key,value)=>{sampleCalls.push(key);return sampleFor(key,value);}});assert.ok(!sampleCalls.includes('medium'),'Do not load or reduce a duplicate style master into the sheet');
const sheet=await buildSelectionReferenceSheet(manifest,normal.dependencies);
assert.equal(sheet.name,SELECTION_SHEET_NAME);assert.equal(sheet.type,'image/jpeg');assert.ok(sheet.size>0);
assert.equal(normal.stats.draws.length,manifest.items.filter(item=>item.sample.kind==='image').length);assert.equal(normal.stats.maxActive,1,'Decode each image sequentially to bound memory');
assert.deepEqual(normal.stats.encodes,[{type:'image/jpeg',quality:.91,width:3072,height:2010}]);
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
 applyCollection(collection);const run=renderer(),m=selectionReferenceManifest(selected({type}),{sample:(key,value)=>key==='type'?{kind:'type'}:sampleFor(key,value)});await buildSelectionReferenceSheet(m,run.dependencies);
 if(type==='文字を一切入れない'){assert.ok(!m.items.some(item=>item.key==='type'));assertReleased(run);continue;}
 const index=m.items.findIndex(item=>item.key==='type'),x=index%3*1024,y=Math.floor(index/3)*670;
 const typeBody=run.stats.texts.filter(t=>t.x>=x&&t.x<x+1024&&t.y>=y+100&&t.y<y+530).map(t=>t.text);
 assert.deepEqual(typeBody,type.startsWith('HALLOWEEN')?['HALLOWEEN']:[],collection+'/'+type+' must not invent names, article text, or substitute a different literal');assertReleased(run);
}
applyCollection('halloween');

function domNode(text=''){return {value:'',textContent:text,hidden:false,disabled:false,open:false,offsetWidth:0,dataset:{},children:[],classList:{add(){},remove(){}},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},addEventListener(){},scrollIntoView(){}};}
const generateSource=app.slice(app.indexOf('async function generate('),app.indexOf('\nfunction shareFiles(',app.indexOf('async function generate(')));
const fetchImpl=async url=>new Response(fs.readFileSync(url),{headers:{'Content-Type':String(url).endsWith('.png')?'image/png':'image/jpeg'}});
async function actualGeneration({attachmentMode='bundle',medium=fixture.medium,type='HALLOWEENのみ',failure=''}={}){
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,domNode());return nodes.get(id);};
 const selections=selected({type,medium}),character=new File(['ORIGINAL IDENTITY BYTES'],'character.png',{type:'image/png'}),run=renderer({failure});
 let shown=null,persisted=0;
 const saved={history:[],used:[],count:0};
 const context=vm.createContext({sourceKinds,sourceSubjectFor,sourceKind:'photo-person',mode:'detail',selections,selectedProposal:null,attachmentMode,refs:[{file:character,name:character.name,role:'identity',width:600,height:800}],historyReady:Promise.resolve(),draftReady:Promise.resolve(),creating:false,adding:false,resettingReferences:false,referenceGeneration:0,draftProfileRevision:0,inputRevision:0,performance,requestAnimationFrame:callback=>callback(),$,normalizeCreator,artworkProfile:()=>profile,syncSaved:async()=>{},questions,AUTO,effectiveSelections,resolveSelections,rng:random,saved,collection:'halloween',selectionConflicts,needsReference,formError:message=>{$('form-error').textContent=message;},buildDirection,applyPose,uid:()=>('SHEET-ROUTE-'+type),stylePresetFor,loadStylePresets:refs=>loadStylePresets(refs,{fetchImpl,FileClass:File}),selectionReferenceManifest,selectionReferenceCounts,buildSelectionReferenceSheet:m=>buildSelectionReferenceSheet(m,run.dependencies),productionPlan,composePrompt,APP_VERSION:'28.4.3',stagePrompts,compactCreatorProfile,persist:async()=>{persisted++;},renderHistory(){},renderBoard(){},showResult:async r=>{shown=r;},effects:{celebrate(){}},File,lockedValues:null});
 vm.runInContext(generateSource,context);
 try{return {result:await vm.runInContext('generate(lockedValues)',context),saved,run,character,nodes,shown,persisted,context};}
 catch(error){error.testState={saved,run,nodes,shown,persisted,context};throw error;}
}
await assert.rejects(actualGeneration({medium:'薄膜光彩アニメ',type:'広告チラシ風・情報をたっぷり'}),error=>{assert.match(error.message,/新聞の一面.*広告チラシ/);assert.equal(error.testState.saved.history.length,0);assert.equal(error.testState.persisted,0);assert.equal(error.testState.shown,null);assert.equal(error.testState.run.stats.draws.length,0,'A rejected combination cannot prepare or attach partial sample images');return true;});
const generated=await actualGeneration(),result=generated.result;
const focusedGenerated=[];for(const medium of ['発光幻想アニメ','薄膜光彩アニメ','白域幾何・宇宙彩アニメ','艶彩幻想アニメ']){const check=await actualGeneration({medium,type:'文字を一切入れない'}),files=deliveryImageFiles(check.result,{FileClass:File});assert.equal(files.length,3,medium+' must deliver identity, original style and scoped-condition sheet');assert.deepEqual(files.map(file=>file.name),[check.result.drawingReferences[0].name,check.result.references[0].name,SELECTION_SHEET_NAME]);assert.equal(check.result.selectionReference.conditions.length,10);assert.equal(selectionReferenceCounts(check.result.selectionReference).sheet,7);assert.match(check.result.prompt,/通常制作：完成画像を1回で生成/);assert.doesNotMatch(check.result.prompt,/prepared-identity\.png|人物翻訳用入力|2段階で実行/);for(const file of files)assert.ok(check.result.prompt.includes(file.name),medium+' prompt must name every actually delivered image');assert.deepEqual(Buffer.from(await files[1].arrayBuffer()),Buffer.from(await check.character.arrayBuffer()));assert.deepEqual(Buffer.from(await files[0].arrayBuffer()),fs.readFileSync(new URL(check.result.drawingReferences[0].file,root)));focusedGenerated.push(check);assertReleased(check.run);}
assert.strictEqual(generated.shown,result);assert.equal(generated.persisted,1);assert.equal(result.selectionReference.items.length,8);assert.equal(result.selectionReference.conditions.length,10);assert.deepEqual(plain(result.selectionReference.counts),{selected:10,sheet:8,separateStyle:1});assert.equal(result.localSelectionReference.file.name,SELECTION_SHEET_NAME);
assert.deepEqual(plain(result.selectionReference.conditions.map(i=>i.value)),visibleKeys.map(k=>result.values[k]));
assert.equal(result.production.referenceManifest.filter(ref=>ref.role==='selection-sheet').length,1);
assert.deepEqual(plain(result.production.copy.slots).map(slot=>slot.text),['HALLOWEEN']);
for(const item of result.selectionReference.conditions)assert.ok(result.prompt.includes(item.value),'The generated concise handoff retains selected '+item.key);
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
await shareContext.shareAll();assert.deepEqual(plain(shared.files.map(f=>f.name)),[...delivered.map(f=>f.name),'prompt.txt']);for(let i=0;i<delivered.length;i++)assert.deepEqual(Buffer.from(await shared.files[i].arrayBuffer()),Buffer.from(await delivered[i].arrayBuffer()),'Native sharing keeps every identity, style and sheet byte unchanged');assert.ok(shared.text.length<180);assert.match(shared.text,/prompt\.txt/);assert.match(shared.text,/画像作成機能/);assert.ok(!shared.text.includes(result.prompt));const sharedPrompt=shared.files.at(-1);assert.equal(sharedPrompt.name,'prompt.txt');assert.equal(sharedPrompt.type,'text/plain');assert.equal(await sharedPrompt.text(),result.prompt);
vm.runInContext(app.slice(app.indexOf('async function downloadKit()'),app.indexOf('\nfunction renderHistory(')),shareContext);await shareContext.downloadKit();
const zipBytes=Buffer.from(await zip.arrayBuffer()),zipEntries=[];let offset=0;
while(zipBytes.readUInt32LE(offset)===0x04034b50){const length=zipBytes.readUInt32LE(offset+18),nameLength=zipBytes.readUInt16LE(offset+26),extra=zipBytes.readUInt16LE(offset+28),name=zipBytes.subarray(offset+30,offset+30+nameLength).toString('utf8'),start=offset+30+nameLength+extra;zipEntries.push({name,data:zipBytes.subarray(start,start+length)});offset=start+length;}
assert.deepEqual(zipEntries.map(entry=>entry.name),['prompt.txt','使い方.txt','selected-conditions.txt',...delivered.map(f=>f.name)]);
assert.equal(zipEntries.find(entry=>entry.name==='prompt.txt').data.toString('utf8'),result.prompt);
assert.equal(zipEntries.find(entry=>entry.name===result.references[0].name).data.toString('utf8'),await generated.character.text());
for(const item of result.selectionReference.conditions)assert.ok(zipEntries.find(e=>e.name==='selected-conditions.txt').data.toString('utf8').includes(item.value));

// Persist enough metadata to rebuild the same sheet after page reload, while
// keeping File/image blobs out of the bounded history store.
const compact=await compactHistoryRecord(result,{archiveCore:true}),roundTrip=JSON.parse(JSON.stringify(compact));
assert.deepEqual(roundTrip.selectionReference,plain(result.selectionReference));assert.ok(!roundTrip.localSelectionReference&&!roundTrip.localRefs&&!roundTrip.localDrawingRefs&&!roundTrip.referenceBoardFile);
const restored=await restoreHistoryRecord(roundTrip);assert.deepEqual(restored.selectionReference,plain(result.selectionReference));assert.equal(restored.prompt,result.prompt);assert.deepEqual(restored.production.referenceManifest,plain(result.production.referenceManifest));
const reloaded=renderer(),reloadSheet=await buildSelectionReferenceSheet(restored.selectionReference,reloaded.dependencies);assert.equal(reloadSheet.name,SELECTION_SHEET_NAME);assert.deepEqual(reloaded.stats.requests,generated.run.stats.requests);assertReleased(reloaded);

// Older histories retain every original selection while their regenerated
// attachment removes the duplicate medium. No migration rewrites their values.
const legacy={schemaVersion:1,name:manifest.name,role:manifest.role,items:manifest.conditions.map(condition=>({...condition,sample:sampleFor(condition.key,condition.value)}))},legacyBefore=JSON.stringify(legacy),legacyRender=renderer();
assert.deepEqual(selectionReferenceConditions(legacy).map(item=>item.value),manifest.conditions.map(item=>item.value));assert.deepEqual(selectionReferenceCounts(legacy),{selected:10,sheet:8,separateStyle:1});assert.deepEqual(selectionSheetItems(legacy).map(item=>item.key),manifest.items.map(item=>item.key));
await buildSelectionReferenceSheet(legacy,legacyRender.dependencies);assert.deepEqual(legacyRender.stats.requests,normal.stats.requests);assert.equal(JSON.stringify(legacy),legacyBefore);assertReleased(legacyRender);
const customMedium=selectionReferenceManifest(selected({medium:'手入力の画風'}));assert.deepEqual(customMedium.counts,{selected:10,sheet:8,separateStyle:0});assert.equal(customMedium.mediumReference.delivery,'text-only');assert.equal(customMedium.conditions[0].value,'手入力の画風');

// All ten exact selections stay in the audit. Only examples that add relevant
// visual information are attached; absent people/words cannot leak through an
// unrelated example. Design-auto manuscript inherits its resolved copy instead
// of a generic typography sample that might imply a different role count.
for(const costume of ['亡霊騎士','参照画像の衣装を生かす','風景を主役にする','紋章・アイコンにする'])for(const type of ['HALLOWEENのみ','文字を一切入れない','デザインに合わせて自動編集'])for(const palette of ['菫 × マンゴー × 白','参照画像の色を生かす']){
 const values=selected({costume,type,palette}),before=JSON.stringify(values),calls=[],m=selectionReferenceManifest(values,{sample:(key,value)=>{calls.push(key);return sampleFor(key,value);}}),expected=m.conditions.filter(condition=>attachmentConditionPolicy(condition.key,values).deliverVisual).map(condition=>condition.key);
 assert.equal(m.conditions.length,10);assert.deepEqual(m.items.map(item=>item.key),expected);assert.deepEqual(calls,expected);
 assert.equal(m.attachmentPolicy.qualityStatus,'requires-generated-image-comparison');assert.equal(m.attachmentPolicy.conditionVisualCount,m.items.length);
 assert.deepEqual(selectionAttachmentPolicy(m.conditions).omittedKeys,m.attachmentPolicy.omittedKeys);
 assert.deepEqual(individualSelectionReferenceManifest(m).map(item=>item.key),expected);
 assert.ok(!calls.some(key=>['medium','size'].includes(key)));
 if(type!=='HALLOWEENのみ')assert.ok(!calls.includes('type'));
 if(costume==='参照画像の衣装を生かす')assert.ok(!calls.includes('costume'));
 if(palette==='参照画像の色を生かす')assert.ok(!calls.includes('palette'));
 if(/風景|紋章/.test(costume)){assert.ok(!calls.includes('pose')&&!calls.includes('mood'));assert.equal(m.conditions.find(c=>c.key==='pose').applicable,false);assert.equal(m.conditions.find(c=>c.key==='mood').applicable,false);}
 const old={schemaVersion:1,name:m.name,role:m.role,items:m.conditions.map(condition=>({...condition,sample:sampleFor(condition.key,condition.value)}))};assert.deepEqual(selectionSheetItems(old).map(item=>item.key),expected,'Legacy reconstruction must remove the same redundant/person-only visuals');
 assert.equal(JSON.stringify(values),before,'Attachment policy never rewrites selected conditions');
}

// Optional per-condition exports retain raster bytes and render a selected SVG
// view at its natural resolution. Their roles never supply character identity.
const individualsMeta=individualSelectionReferenceManifest(manifest),individualRender=renderer(),individuals=await buildIndividualSelectionReferences(manifest,{...individualRender.dependencies,fetchImpl});
assert.equal(individuals.length,8);assert.equal(new Set(individuals.map(item=>item.name)).size,8);assert.deepEqual(individuals.map(item=>item.key),manifest.items.map(item=>item.key));assert.deepEqual(individualsMeta.map(item=>item.selectionIndex),[2,3,4,5,6,7,8,9]);
for(const individual of individuals){
 assert.equal(individual.role,'selection-condition');assert.equal(individual.file.name,individual.name);assert.ok(individual.width>0&&individual.height>0);assert.ok(!individual.name.startsWith('style-preset-')&&!individual.name.startsWith('reference-'));
 if(individual.sourceKind==='original-raster')assert.deepEqual(Buffer.from(await individual.file.arrayBuffer()),fs.readFileSync(new URL(individual.source,root)),'The original condition raster must not be resized or re-encoded');
 if(individual.sourceKind==='native-svg-view')assert.ok(individualRender.stats.requests.includes(new URL(individual.source,root).href),'Retain the exact selected fragment when exporting an SVG');
}
assert.ok(individualRender.stats.encodes.every(encode=>encode.type==='image/png'),'SVG and condition diagrams are independently exported as PNG');assert.equal(individualRender.stats.maxActive,1);assertReleased(individualRender);
for(const failure of ['context','dimensions','draw','encode','timeout']){const run=renderer({failure});await assert.rejects(buildIndividualSelectionReferences(manifest,{...run.dependencies,fetchImpl}));assertReleased(run);}
await assert.rejects(buildIndividualSelectionReferences(manifest,{...renderer().dependencies,fetchImpl:async()=>new Response('bad',{status:404})}),/選択見本/);
const originalProduction=JSON.stringify(result.production),rawRender=renderer();
const comparison=await buildIndividualSelectionReferenceZip({manifest:result.selectionReference,identityReferences:[{...result.references[0],file:delivered[0]}],styleReferences:[{...result.drawingReferences[0],file:delivered[1]}],composeIndividualPrompt:kit=>composePrompt({collection:'halloween',profile,values:result.values,variant:result.variant,references:kit.references,edition:result.edition,preparedPlan:{...result.production,referenceManifest:kit.references}})},{...rawRender.dependencies,fetchImpl});
assert.equal(comparison.manifest.conditions.length,10);assert.deepEqual(comparison.manifest.counts,{selected:10,individual:8,attached:10,identity:1,separateStyle:1});assert.deepEqual(comparison.manifest.references.map(item=>item.role),['identity',result.drawingReferences[0].role,...Array(8).fill('selection-condition')]);
assert.deepEqual(comparison.files.slice(0,2),delivered.slice(0,2));assert.ok(!comparison.prompt.includes(SELECTION_SHEET_NAME));for(const ref of comparison.manifest.references)assert.ok(comparison.prompt.includes(ref.name));assert.ok(comparison.prompt.includes('主参照'));assert.match(comparison.manifest.acceptance,/今回の検証に使った image_gen.*参照5枚.*一括添付は実行できなかった/);assert.match(comparison.manifest.acceptance,/他の利用先へ一律の上限として当てはめず/);assert.equal(comparison.manifest.execution.status,'not-executed');assert.equal(comparison.manifest.execution.canUseObservedSingleCall,false);assert.equal(JSON.stringify(result.production),originalProduction,'The comparison route must not mutate the saved production');assertReleased(rawRender);
const comparisonBytes=Buffer.from(await comparison.blob.arrayBuffer()),comparisonEntries=[];let comparisonAt=0;
while(comparisonBytes.readUInt32LE(comparisonAt)===0x04034b50){const length=comparisonBytes.readUInt32LE(comparisonAt+18),nameLength=comparisonBytes.readUInt16LE(comparisonAt+26),extra=comparisonBytes.readUInt16LE(comparisonAt+28),name=comparisonBytes.subarray(comparisonAt+30,comparisonAt+30+nameLength).toString('utf8'),start=comparisonAt+30+nameLength+extra;comparisonEntries.push({name,data:comparisonBytes.subarray(start,start+length)});comparisonAt=start+length;}
assert.deepEqual(comparisonEntries.map(entry=>entry.name),['prompt.txt','references.json','selected-conditions.txt',...comparison.manifest.references.map(ref=>ref.name)]);assert.equal(comparisonEntries.find(entry=>entry.name===delivered[0].name).data.toString('utf8'),await generated.character.text());assert.deepEqual(JSON.parse(comparisonEntries.find(entry=>entry.name==='references.json').data.toString('utf8')),plain(comparison.manifest));assert.ok(!comparisonEntries.some(entry=>entry.name===SELECTION_SHEET_NAME));
for(const composeIndividualPrompt of [()=>result.prompt,()=>'',()=>comparison.files[0].name])await assert.rejects(buildIndividualSelectionReferenceZip({manifest,composeIndividualPrompt},{...renderer().dependencies,fetchImpl}),/原稿.*添付/);
await assert.rejects(buildIndividualSelectionReferenceZip({manifest},{...renderer().dependencies,fetchImpl}),/個別添付/);

// Execute the published app's optional handler as well as the API. It must
// compile a separate plan, preserve the record, and unlock its button after
// either a successful ZIP or a real asset/decode failure.
const individualStart=app.indexOf('async function downloadIndividualKit('),individualEnd=app.indexOf('\nlet historyUndo',individualStart),individualHandler=app.slice(individualStart,individualEnd);
assert.ok(individualStart>=0&&individualEnd>individualStart);
async function actualIndividualKit({record=result,failure='',fetchFailure=false}={}){
 const button=domNode('各項目を個別画像で保存'),run=renderer({failure}),messages=[];let savedZip=null,savedName=null,kit=null,callbackCalls=0;
 const context=vm.createContext({currentResult:record,File,structuredClone,$:id=>{assert.equal(id,'download-individual-kit');return button;},composePrompt,buildIndividualSelectionReferenceZip:async options=>{
  assert.equal(button.disabled,true);assert.equal(button.textContent,'各項目の画像を準備中…');callbackCalls++;
  kit=await buildIndividualSelectionReferenceZip(options,{...run.dependencies,fetchImpl:fetchFailure?async()=>new Response('bad',{status:404}):fetchImpl});return kit;
 },download:(blob,name)=>{savedZip=blob;savedName=name;},tell:message=>messages.push(message)});
 vm.runInContext(individualHandler,context);await context.downloadIndividualKit();return {button,run,messages,savedZip,savedName,kit,callbackCalls};
}
const handlerProductionBefore=JSON.stringify(result.production),handlerPromptBefore=result.prompt,handlerRefsBefore=result.localRefs.map(ref=>ref.file),handlerStyleBefore=result.localDrawingRefs.map(ref=>ref.file),actualIndividual=await actualIndividualKit();
assert.equal(actualIndividual.callbackCalls,1);assert.equal(actualIndividual.savedName,'Artwork-individual-'+result.edition+'.zip');assert.equal(actualIndividual.kit.manifest.counts.attached,10);assert.deepEqual(actualIndividual.kit.manifest.references.map(ref=>ref.name),comparison.manifest.references.map(ref=>ref.name));assert.equal(actualIndividual.button.disabled,false);assert.equal(actualIndividual.button.textContent,'全有効見本の個別セットを保存');assert.match(actualIndividual.messages.at(-1),/10枚/);assertReleased(actualIndividual.run);
assert.equal(JSON.stringify(result.production),handlerProductionBefore);assert.equal(result.prompt,handlerPromptBefore);assert.deepEqual(result.localRefs.map(ref=>ref.file),handlerRefsBefore);assert.deepEqual(result.localDrawingRefs.map(ref=>ref.file),handlerStyleBefore);
const actualIndividualBytes=Buffer.from(await actualIndividual.savedZip.arrayBuffer()),actualIndividualEntries=[];let actualIndividualAt=0;
while(actualIndividualBytes.readUInt32LE(actualIndividualAt)===0x04034b50){const length=actualIndividualBytes.readUInt32LE(actualIndividualAt+18),nameLength=actualIndividualBytes.readUInt16LE(actualIndividualAt+26),extra=actualIndividualBytes.readUInt16LE(actualIndividualAt+28),name=actualIndividualBytes.subarray(actualIndividualAt+30,actualIndividualAt+30+nameLength).toString('utf8'),start=actualIndividualAt+30+nameLength+extra;actualIndividualEntries.push({name,data:actualIndividualBytes.subarray(start,start+length)});actualIndividualAt=start+length;}
assert.deepEqual(actualIndividualEntries.map(entry=>entry.name),['prompt.txt','references.json','selected-conditions.txt',...actualIndividual.kit.manifest.references.map(ref=>ref.name)]);assert.equal(actualIndividualEntries.filter(entry=>/\.(?:png|jpg|jpeg)$/.test(entry.name)).length,10);assert.ok(!actualIndividualEntries.some(entry=>entry.name===SELECTION_SHEET_NAME));
assert.deepEqual(actualIndividualEntries.find(entry=>entry.name===result.references[0].name).data,Buffer.from(await generated.character.arrayBuffer()));assert.deepEqual(actualIndividualEntries.find(entry=>entry.name===result.drawingReferences[0].name).data,Buffer.from(await result.localDrawingRefs[0].file.arrayBuffer()));
assert.equal(actualIndividual.kit.files[0].name,result.references[0].name);assert.equal(actualIndividual.kit.files[1].name,result.drawingReferences[0].name);
const actualIndividualPrompt=actualIndividualEntries.find(entry=>entry.name==='prompt.txt').data.toString('utf8');for(const ref of actualIndividual.kit.manifest.references)assert.ok(actualIndividualPrompt.includes(ref.name));for(const condition of result.selectionReference.conditions)assert.ok(actualIndividualPrompt.includes(condition.value));assert.ok(!actualIndividualPrompt.includes(SELECTION_SHEET_NAME));
for(const options of [{failure:'image'},{failure:'timeout'},{fetchFailure:true}]){const failed=await actualIndividualKit(options);assert.equal(failed.callbackCalls,1);assert.equal(failed.savedZip,null);assert.equal(failed.button.disabled,false);assert.equal(failed.button.textContent,'全有効見本の個別セットを保存');assert.match(failed.messages.at(-1),/選択見本/);assert.equal(JSON.stringify(result.production),handlerProductionBefore);if(!options.fetchFailure)assertReleased(failed.run);}
const missingIndividual=await actualIndividualKit({record:null});assert.equal(missingIndividual.callbackCalls,0);assert.equal(missingIndividual.savedZip,null);assert.equal(missingIndividual.button.disabled,false);

// Reload the compacted record through the real result handler. Only DOM,
// object-URL presentation and layout preview plumbing are mocked here.
const historyNodes=new Map(),historyNode=id=>{if(!historyNodes.has(id))historyNodes.set(id,domNode());return historyNodes.get(id);},historyRender=renderer(),objectFiles=[];
const historyContext=vm.createContext({resultRequest:0,inputRevision:0,currentResult:null,resultObjectURLs:[],disposeLayoutPreview(){},recomposeHistoryDelivery,optionalIdentityPrompts,restoreHistoryRecord,restoreHistoryCore,selectionReferenceCounts,loadStylePresets:refs=>loadStylePresets(refs,{fetchImpl,FileClass:File}),buildSelectionReferenceSheet:m=>buildSelectionReferenceSheet(m,historyRender.dependencies),clearPreparedResult(){},tell:message=>{throw new Error(message);},URL:{createObjectURL:file=>{objectFiles.push(file);return 'blob:mock-'+objectFiles.length;}},$:historyNode,APP_VERSION:'28.4.3',needsReference,AUTO,sourceKinds,creatorDisplayLabel:()=>profile.displayName,el:(tag,className,text)=>domNode(text),appendRecipeEvidence(){},document:{createTextNode:domNode,body:{dataset:{motion:'off'}}},editorialReferencesFor:()=>[],createLayoutPanel:()=>({element:domNode(),dispose(){}}),canShareFiles:()=>true,deliveryImageFiles,shareFiles:r=>deliveryImageFiles(r,{FileClass:File}),download(){}});
vm.runInContext(app.slice(app.indexOf('async function showResult('),app.indexOf('\nasync function copyPrompt(')),historyContext);
await historyContext.showResult(roundTrip);
assert.equal(historyContext.currentResult.localSelectionReference.file.name,SELECTION_SHEET_NAME,'Opening saved history rebuilds its selected-condition attachment automatically');
assert.equal(historyContext.currentResult.localDrawingRefs[0].file.name,result.drawingReferences[0].name);
assert.deepEqual(objectFiles.map(file=>file.name),[result.drawingReferences[0].name,SELECTION_SHEET_NAME]);
assert.equal(historyNode('prompt-output').value,result.prompt);assert.equal(historyNode('result').hidden,false);assert.equal(historyNode('result-refs').children.length,2);assertReleased(historyRender);
for(const generatedFocused of focusedGenerated){
 await historyContext.showResult(generatedFocused.result);
 const displayed=historyContext.currentResult;assert.equal(displayed.prompt,generatedFocused.result.prompt);assert.equal(historyNode('result-refs').children.length,3);assert.ok(displayed.optionalStages?.identity&&displayed.optionalStages?.identityRepair&&displayed.optionalStages?.final,'Optional recovery remains available for a real generated focused record');
 const workflow=historyNode('result-summary').children.find(node=>node.id==='staged-workflow');assert.ok(workflow);assert.equal(workflow.open,false,'Advanced identity translation must not be the normal expanded user flow');assert.match(workflow.children[0].textContent,/補助工程（任意）/);
 let copied='';const copyContext=vm.createContext({currentResult:displayed,navigator:{clipboard:{writeText:async value=>{copied=value;}}},tell(){},needsReference,download(){throw new Error('Unexpected clipboard failure');}});vm.runInContext(app.slice(app.indexOf('async function copyStage('),app.indexOf('\nasync function shareAll(')),copyContext);await copyContext.copyStage('final');assert.equal(copied,displayed.optionalStages.final,'Optional final copy must take priority over a normal editorial final with the same key');assert.match(copied,/prepared-identity\.png/);assert.ok(!copied.includes(displayed.references[0].name),'Optional prepared final cannot reintroduce the original source image');
}


const blockedHistoryValues={...result.values,type:'広告チラシ風・情報をたっぷり'},blockedHistoryPlan=productionPlan(result.profile,blockedHistoryValues,result.variant,'halloween',random);blockedHistoryPlan.issues=[];const blockedHistory={...result,isFresh:false,values:blockedHistoryValues,production:blockedHistoryPlan,stages:null,prompt:'OLD INVALID PROMPT'},blockedHistoryBefore=JSON.stringify(blockedHistory),historyRequestsBefore=historyRender.stats.requests.length,blockedMessages=[];historyContext.tell=message=>blockedMessages.push(message);historyContext.clearPreparedResult=()=>{historyContext.currentResult=null;historyNode('result-summary').replaceChildren();};await historyContext.showResult(blockedHistory);assert.equal(historyContext.currentResult,null,'A rejected old history cannot keep an active deliverable or stage-copy source');assert.equal(historyRender.stats.requests.length,historyRequestsBefore,'Stop before loading a rejected record attachment');assert.equal(historyNode('form-error').hidden,false);assert.match(historyNode('form-error').textContent,/新聞の一面.*広告チラシ/);assert.match(blockedMessages.at(-1),/新聞の一面/);assert.equal(JSON.stringify(blockedHistory),blockedHistoryBefore,'Rejected old archive stays intact');
applyCollection('halloween');
console.log('PASS selected reference sheet: '+catalogSelections+' registered collection choices / '+checkedAssets.size+' real assets; ten conditions with scoped applicable visuals and no redundant size/no-copy diagrams with no duplicate medium, SVG fragment views, bounded sequential decode, release and timeout failures, explicit manuscript only; actual generate/share/ZIP identity→style→sheet delivery, legacy history reconstruction, optional individual-image comparison ZIP and actual app handler with intact original files, separately compiled roles, unchanged production and failure-button recovery. Image quality and browser layout are not evaluated by mocked canvas.');

