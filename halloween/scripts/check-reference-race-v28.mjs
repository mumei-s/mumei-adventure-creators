import {selectionReferenceManifest,selectionReferenceCounts} from '../selection-references.js?v=28.4.6';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {File} from 'node:buffer';
import {questions,AUTO,normalizeCreator,resolveSelections} from '../catalog.js?v=28.4.6';
import {initialSelections,effectiveSelections} from '../modes.js?v=28.4.6';
import {sourceSubjectFor} from '../source-kind.js?v=28.4.6';
import {selectionConflicts,candidateAvailability} from '../compatibility.js?v=28.4.6';
import {buildDirection} from '../direction.js?v=28.4.6';
import {applyPose} from '../poses.js?v=28.4.6';
import {productionPlan} from '../production-plan.js?v=28.4.6';
import {stagePrompts} from '../production-workflow.js?v=28.4.6';
import {composePrompt,needsReference} from '../prompt.js?v=28.4.6';
import {stylePresetFor} from '../style-presets.js?v=28.4.6';
import {deliveryImageFiles} from '../drawing-references.js?v=28.4.6';
import {compactCreatorProfile} from '../creator.js?v=28.4.6';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function actual(start,next){const a=app.indexOf(start),b=app.indexOf(next,a);assert.ok(a>=0&&b>a,'Actual app source exists: '+start);return app.slice(a,b);}
const code=[
 actual('function clearPreparedResult(){','\ntry{'),
 actual('const cropEditor=createCropEditor(','\nfunction randomizeItem('),
 actual('function choose(v){','\nfunction summarizeName('),
 actual('async function addFiles(files){','\nfunction formError('),
 actual('function formError(s,focus){','\nfunction shareFiles('),
 actual('function setAttachmentMode(next){','\ndocument.querySelectorAll(')
].join('\n');

function node(tag='div',className='',textContent=''){
 return {tag,className,textContent,children:[],dataset:{},attributes:{},listeners:{},value:'',hidden:false,disabled:false,offsetWidth:0,
  classList:{add(){},remove(){}},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=[...children];},
  setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this[name];},addEventListener(event,handler){this.listeners[event]=handler;},focus(){},close(){this.open=false;}};
}
function fixture({count=2}={}){
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const refs=Array.from({length:count},(_,i)=>({draftId:'ref-'+i,file:new File(['ORIGINAL CHARACTER '+i],'character-'+i+'.png',{type:'image/png',lastModified:10+i}),name:'character-'+i+'.png',role:i?'support':'identity',width:200+i,height:300+i,url:'blob:original-'+i}));
 const selections={...initialSelections(),medium:'発光幻想アニメ',theme:'宇宙のHalloween',costume:'参照画像の衣装を生かす',pose:'片手を差し出す',palette:'モノクローム',design:'通常の一枚絵',type:'文字を一切入れない',line:'セリフなし'};
 let styleWait=null,context,edition=0,previews=0;
 const stats={shown:[],persisted:0,celebrations:0,revoked:[]};
 const invalidate=()=>context.clearPreparedResult();
 context=vm.createContext({$,el:node,File,performance,refs,selections,mode:'detail',selectedProposal:null,sourceKind:'illustration-person',collection:'halloween',attachmentMode:'bundle',
  creating:false,adding:false,resettingReferences:false,referenceGeneration:0,inputRevision:0,draftProfileRevision:0,resultRequest:0,resultObjectURLs:[],disposeLayoutPreview(){},currentResult:null,
  historyReady:Promise.resolve(),draftReady:Promise.resolve(),saved:{history:[],used:[],count:0},requestAnimationFrame:callback=>callback(),
  normalizeCreator,artworkProfile:()=>({displayName:'競合検証',topics:[],activityEnabled:false}),syncSaved:async()=>{},questions,AUTO,effectiveSelections,sourceSubjectFor,resolveSelections,rng:()=>.23,
  selectionConflicts,candidateAvailability,needsReference,buildDirection,applyPose,uid:()=> 'RACE-'+(++edition),stylePresetFor,
  loadStylePresets:references=>new Promise(resolve=>{styleWait={references,resolve};}),selectionReferenceManifest,buildSelectionReferenceSheet:async manifest=>new File(['TEST SHEET: '+manifest.items.map(item=>item.key+'='+item.value).join(',')],manifest.name,{type:'image/jpeg'}),productionPlan,composePrompt,APP_VERSION:app.match(/const APP_VERSION='([^']+)'/)[1],stagePrompts,compactCreatorProfile,
  persist:async()=>{stats.persisted++;},renderHistory(){},renderBoard:invalidate,renderChoices:invalidate,syncActivity(){},tell(){},effects:{celebrate(){stats.celebrations++;}},
  showResult:async result=>{stats.shown.push(result);context.currentResult=result;},
  URL:{revokeObjectURL:url=>stats.revoked.push(url)},normalizeImageFile:file=>file,
  prepareReferenceView:async file=>({previewFile:file,url:'blob:new-'+(++previews),width:30,height:40}),persistDraftReferences:async()=>({saved:true}),
  createCropEditor:options=>{context.applyCrop=options.onApply;return {open:async()=>{}};},
  activeQuestion:questions.find(q=>q.key==='medium'),document:{querySelectorAll:()=>[],querySelector:()=>node()},
  displayValue:(question,value)=>value
 });
 context.selectionReferenceCounts=selectionReferenceCounts;
 vm.runInContext(code,context);$('creator').value='ss_yr';context.renderRefs();
 return {context,$,stats,async start(){styleWait=null;const pending=context.generate();for(let i=0;i<50&&!styleWait;i++)await Promise.resolve();assert.ok(styleWait,'Generation reached the deliberately delayed style-image load');return {pending,release(){const wait=styleWait;wait.resolve(wait.references.map(ref=>({...ref,file:new File(['PRESET '+ref.medium],ref.name,{type:'image/png'})})));}};}};
}

async function consistent(result){
 assert.equal(result.localRefs.length,result.references.length);
 for(let i=0;i<result.localRefs.length;i++){
  const ref=result.localRefs[i],meta=result.references[i];
  assert.equal(meta.name,'reference-'+String(i+1).padStart(2,'0')+'-'+ref.name,'Transfer filename is derived from the same reference snapshot');
  for(const key of ['role','width','height'])assert.equal(meta[key],ref[key],'Prompt metadata and actual file snapshot agree: '+key);
  assert.ok(result.prompt.includes(meta.name),'Prompt names the exact transferred reference');
 }
 const sent=deliveryImageFiles(result),focused=['発光幻想アニメ','薄膜光彩アニメ','白域幾何・宇宙彩アニメ','艶彩幻想アニメ'].includes(result.values.medium),offset=focused?result.localDrawingRefs.length:0,sheetCount=selectionReferenceCounts(result.selectionReference).sheet;
 assert.equal(sent.length,result.localDrawingRefs.length+result.localRefs.length+(sheetCount?1:0));
 if(sheetCount){assert.equal(sent.at(-1).name,'selection-references.jpg');assert.equal(await sent.at(-1).text(),await result.localSelectionReference.file.text());}
 else{assert.equal(result.localSelectionReference,null,'A focused delivery must not create an empty reference sheet');assert.ok(!sent.some(file=>file.name==='selection-references.jpg'),'An empty selection sheet is not attached');assert.equal(selectionReferenceCounts(result.selectionReference).selected,10,'Omitting a duplicate image must retain all ten selected conditions');}
 for(let i=0;i<result.localRefs.length;i++){
  assert.equal(sent[offset+i].name,result.references[i].name);
  assert.equal(await sent[offset+i].text(),await result.localRefs[i].file.text(),'Transfer preserves the snapshot file bytes');
 }
}

const cases=[
 ['late image attachment',async ({context})=>{await context.addFiles([new File(['LATE FILE'],'late.png',{type:'image/png'})]);}],
 ['remove main reference',async ({context,$})=>{$('references').children[0].children[1].listeners.click();assert.equal(context.refs[0].role,'identity');}],
 ['swap main and supporting roles',async ({context,$})=>{const selector=$('references').children[1].children.find(child=>child.tag==='select');selector.value='identity';selector.listeners.change();assert.equal(context.refs[1].role,'identity');}],
 ['crop main reference',async ({context})=>{await context.applyCrop(context.refs[0],{file:new File(['CROPPED BYTES'],'character-0-crop.png',{type:'image/png'}),crop:{zoom:2}});assert.equal(context.refs[0].width,30);}],
 ['change selected medium',async ({context})=>{context.choose('透明水彩');assert.equal(context.selections.medium,'透明水彩');}],
 ['change attachment mode',async ({context})=>{context.setAttachmentMode('chatgpt');assert.equal(context.attachmentMode,'chatgpt');}]
];
for(const [label,mutate]of cases){
 const f=fixture(),before=f.context.inputRevision,{pending,release}=await f.start();
 await mutate(f);assert.ok(f.context.inputRevision>before,'Actual UI edit invalidates generation: '+label);release();
 await assert.rejects(pending,/準備中に画像や選択が変更/,'Reject the obsolete preparation: '+label);
 assert.equal(f.stats.shown.length,0,'An obsolete result is never displayed: '+label);
 assert.equal(f.stats.persisted,0,'An obsolete pre-save result is never persisted: '+label);
 assert.equal(f.context.saved.history.length,0,'No obsolete history entry: '+label);
 assert.equal(f.context.saved.used.length,0,'Cancelled preparations do not consume variation history: '+label);
 assert.equal(f.context.saved.count,0,'Cancelled preparations do not increment the issue count: '+label);
 assert.equal(f.stats.celebrations,0);assert.equal(f.context.creating,false);assert.equal(f.$('generate').disabled,false);
}

// Deliberately bypass the normal edit notification to verify the second line
// of defense: the mutable live reference cannot alter an existing snapshot.
const isolated=fixture(),original=isolated.context.refs.map(ref=>({...ref})),snapshotRun=await isolated.start();
Object.assign(isolated.context.refs[0],{file:new File(['UNNOTIFIED CROP'],'changed.png',{type:'image/png'}),name:'changed.png',role:'support',width:30,height:40});
isolated.context.refs[1].role='identity';snapshotRun.release();const snapshotResult=await snapshotRun.pending;
await consistent(snapshotResult);
for(let i=0;i<original.length;i++){
 assert.notEqual(snapshotResult.localRefs[i],isolated.context.refs[i],'Result owns a reference record snapshot');
 assert.equal(snapshotResult.localRefs[i].file,original[i].file,'Snapshot retains the original immutable File');
 assert.equal(snapshotResult.localRefs[i].role,original[i].role);
}
assert.equal(isolated.stats.shown.length,1);assert.equal(isolated.stats.persisted,1);

// Adding an image after a completed prompt clears only the prepared result;
// the user's selected conditions survive and the next preparation uses all
// current references plus the separate, assistant-provided style preset.
const later=fixture({count:1}),firstRun=await later.start();firstRun.release();const firstResult=await firstRun.pending;await consistent(firstResult);
assert.ok(firstResult.referenceBoardFile);assert.equal(await firstResult.referenceBoardFile.text(),await firstResult.localRefs[0].file.text());
const selectionBefore={...later.context.selections};await later.context.addFiles([new File(['NEW SUPPORT'],'new-support.png',{type:'image/png'})]);
assert.equal(later.context.currentResult,null);assert.deepEqual({...later.context.selections},selectionBefore,'Late attachment preserves all explicit drawing selections');
const nextRun=await later.start();nextRun.release();const nextResult=await nextRun.pending;await consistent(nextResult);
assert.equal(nextResult.localRefs.length,2);assert.equal(nextResult.localDrawingRefs.length,1);assert.equal(nextResult.values.medium,selectionBefore.medium);
assert.equal(await nextResult.localRefs[1].file.text(),'NEW SUPPORT');assert.equal(later.stats.shown.length,2);assert.equal(later.context.saved.history.length,2);
console.log('PASS reference races: six actual edit handlers during a delayed style-image load cancel display, history, count and variation writes; immutable metadata/file/role snapshots; exact transfer bytes; late attachment preserves choices and prepares current references with a separate preset.');
