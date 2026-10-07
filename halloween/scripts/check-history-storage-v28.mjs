import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolveSelections} from '../catalog.js?v=28.0.1';
import {applyCollection} from '../collection.js?v=28.0.1';
import {buildDirection} from '../direction.js?v=28.0.1';
import {applyPose} from '../poses.js?v=28.0.1';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.0.1';
import {stagePrompts} from '../production-workflow.js?v=28.0.1';
import {composePrompt} from '../prompt.js?v=28.0.1';
import {renderChatInput} from '../compiled-production.js?v=28.0.1';
import {renderEditorialLayout} from '../editorial-layout.js?v=28.0.1';
import {compactHistoryRecord,restoreHistoryRecord,compactUsedRecords,mergeUsedRecords,saveHistoryState} from '../history-storage.js?v=28.0.1';

const random=()=>.28,profile={displayName:'履歴検証🙂',topics:[],activityEnabled:false};
applyCollection('halloween');
const values=resolveSelections({sceneUnified:true,design:'新聞の一面',medium:'クリスタルホログラム造形アニメ',theme:'宇宙のHalloween',costume:'ヴィクトリア朝の正装',pose:'片手を差し出す',type:'新聞風・記事と段組み'},random);
const baseVariant=applyPose(buildDirection([],values.mood,random,'halloween',values),values.pose),production=productionPlan(profile,values,baseVariant,'halloween',random),stages=stagePrompts(production);
assert.ok(stages,'Exercise the heavy optional editorial stages as well as production');
const record={version:28,collection:'halloween',creator:'test',profile,values,variant:production.variant,edition:'LATEST',references:[{name:'reference-01.png',role:'identity',width:1024,height:1536}],attachmentMode:'bundle',date:'2026-10-08T00:00:00Z',production,stages,count:12};
record.prompt=composePrompt({...record,references:record.references,preparedPlan:production});
const used=Array.from({length:2000},(_,index)=>({signature:'used-'+index,family:'left',face:baseVariant.face,expression:baseVariant.expression,distance:baseVariant.distance,pose:baseVariant.pose,layout:baseVariant.layout}));
const state={history:Array.from({length:12},(_,index)=>({...record,edition:index===0?'LATEST':'OLDER-'+index})),used,count:12},original=JSON.stringify(state);
function storageWithLimit(limit=Infinity,prior=''){const data=new Map([['history',prior],['unrelated','KEEP_OTHER_TOOL_DATA']]);let calls=0;return {data,get calls(){return calls;},getItem:key=>data.get(key),setItem(key,value){calls++;assert.equal(key,'history','Recovery must not edit another tool’s storage');if(value.length*2>limit)throw new DOMException('quota','QuotaExceededError');data.set(key,value);}};}

const storage=storageWithLimit(),saved=await saveHistoryState(storage,'history',state),encoded=storage.data.get('history');
assert.equal(saved.saved,true);assert.equal(saved.state.history.length,12);assert.equal(saved.state.used.length,2000);assert.equal(saved.state.count,12);
assert.equal(saved.state.history[0].detailArchive.encoding,'gzip-base64');assert.ok(!saved.state.history[0].production&&!saved.state.history[0].stages);
assert.equal(saved.state.history[0].prompt,record.prompt,'The original copy/export prompt remains available without decompression');
assert.ok(encoded.length<original.length*.65,'The actual heavy fixture must materially shrink');
assert.equal(JSON.stringify(state),original,'Compaction must not mutate the live result or input state');
const restored=await restoreHistoryRecord(JSON.parse(encoded).history[0]);
assert.deepEqual(restored.production,record.production);assert.deepEqual(restored.stages,record.stages);assert.equal(restored.prompt,record.prompt);
assert.equal(repairPrompt(restored),repairPrompt(record),'Repair copy must retain the original requirements');
assert.equal(renderChatInput(restored.production),renderChatInput(production),'Restored image input must retain original making instructions');
const layoutImage={dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aWQAAAAASUVORK5CYII=',artworkWidth:1,artworkHeight:1};
assert.deepEqual(renderEditorialLayout(restored.production,layoutImage),renderEditorialLayout(production,layoutImage),'Native layout must retain original copy and geometry');
assert.ok(saved.state.used.slice(0,-3).every(item=>Object.keys(item).length===1));
assert.deepEqual(saved.state.used.slice(-3),used.slice(-3),'The next direction needs the three most recent gestures in full');
assert.ok(saved.state.used.every((item,index)=>item.signature===used[index].signature));
assert.equal(compactUsedRecords(used,0).length,0);
assert.equal(mergeUsedRecords(used.slice(-3),[{signature:'used-1999'}]).at(-1).face,used.at(-1).face,'Cross-tab signature-only records must not erase live recent direction detail');

// Reproduce the same quota exception with a real generated payload: reserve
// the rest of an origin’s capacity for unrelated data, leaving this budget.
const quotaStorage=storageWithLimit(Math.floor((encoded.length+original.length)/2)*2);
assert.throws(()=>quotaStorage.setItem('history',original),error=>error.name==='QuotaExceededError');
const recovered=await saveHistoryState(quotaStorage,'history',state);
assert.equal(recovered.saved,true);assert.equal(recovered.state.history.length,12);assert.equal(recovered.state.used.length,2000);
assert.equal(quotaStorage.data.get('unrelated'),'KEEP_OTHER_TOOL_DATA');
const oneState={...saved.state,history:[saved.state.history[0]],used:used.slice(-3)},oneBytes=JSON.stringify(oneState).length*2;
const tight=storageWithLimit(Math.floor(oneBytes*1.8)),trimmed=await saveHistoryState(tight,'history',state);
assert.equal(trimmed.saved,true);assert.ok(trimmed.state.history.length<12);assert.equal(trimmed.state.history[0].edition,'LATEST');assert.equal(trimmed.state.history[0].prompt,record.prompt);assert.equal(trimmed.state.count,12);assert.ok(tight.calls>1&&tight.calls<=6);
const impossible=storageWithLimit(10,'LAST_SUCCESSFUL_SAVE'),failed=await saveHistoryState(impossible,'history',state);
assert.equal(failed.saved,false);assert.equal(failed.quota,true);assert.equal(impossible.data.get('history'),'LAST_SUCCESSFUL_SAVE','Never delete the previous save to make room');
let blockedCalls=0;const blocked=await saveHistoryState({setItem(){blockedCalls++;throw new DOMException('denied','SecurityError');}},'history',state);
assert.equal(blocked.saved,false);assert.equal(blockedCalls,1,'Permission failures must not erase or trim history through quota retries');

const fallback=await compactHistoryRecord(record,{Compression:null,Decompression:null});
assert.equal(fallback.detailArchive.encoding,'json');assert.deepEqual((await restoreHistoryRecord(fallback,{Decompression:null})).production,production);
const corrupt={...fallback,detailArchive:{encoding:'gzip-base64',data:'CORRUPT'}};
await assert.rejects(()=>restoreHistoryRecord(corrupt));assert.equal(corrupt.prompt,record.prompt);
const preserved=await compactHistoryRecord(corrupt,{Compression:null,Decompression:null});assert.deepEqual(preserved.detailArchive,corrupt.detailArchive,'A codec failure must not destroy a saved archive');

// Exercise the actual app save wrapper and lazy-result guard. A delayed older
// save/click must not overwrite a newer creation or reopen the wrong result.
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),persistSource=app.slice(app.indexOf('async function persist(){'),app.indexOf('\nfunction syncSaved()',app.indexOf('async function persist(){')));
const raceStorage=storageWithLimit(),context=vm.createContext({historyWriteRevision:0,saved:state,migrateHistory:true,localStorage:raceStorage,STORAGE:'history',saveHistoryState,tell(){}});
vm.runInContext(persistSource,context);
const first=vm.runInContext('persist()',context);context.saved={history:[{...record,edition:'NEWER',count:13}],used:used.slice(-3),count:13};const second=vm.runInContext('persist()',context);
await Promise.all([first,second]);assert.equal(JSON.parse(raceStorage.data.get('history')).history[0].edition,'NEWER');assert.equal(context.saved.count,13);
const resultSource=app.slice(app.indexOf('async function showResult(r){'),app.indexOf(' if(r.localRefs?.length)',app.indexOf('async function showResult(r){')));
const pending=new Map();const resultContext=vm.createContext({resultRequest:0,shown:'',restoreHistoryRecord:r=>new Promise(resolve=>pending.set(r.edition,resolve)),tell(){}});resultContext.clearPreparedResult=()=>resultContext.resultRequest++;
vm.runInContext(resultSource+'shown=r.edition;\n}',resultContext);
const older=vm.runInContext("showResult({edition:'A'})",resultContext),newer=vm.runInContext("showResult({edition:'B'})",resultContext);
pending.get('B')({edition:'B'});await newer;pending.get('A')({edition:'A'});await older;assert.equal(resultContext.shown,'B');
const stale=vm.runInContext("showResult({edition:'C'})",resultContext);resultContext.clearPreparedResult();pending.get('C')({edition:'C'});await stale;assert.equal(resultContext.shown,'B','Changing selection cancels a late historical result');

console.log(JSON.stringify({result:'PASS history storage: exact prompt/plan/stages/layout/repair; older-format compaction; full 12 histories and 2000 signatures; quota recovery; tight-budget latest-history retention; atomic failure; no-codec fallback; stale save and click guards',estimatedUtf16BytesBefore:original.length*2,estimatedUtf16BytesAfter:encoded.length*2,reductionPercent:Math.round((1-encoded.length/original.length)*100),tightBudgetHistoriesRetained:trimmed.state.history.length}));
