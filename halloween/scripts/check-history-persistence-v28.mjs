import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHistoryPersistence} from '../history-persistence.js?v=28.3.1';
import {createIndexedHistoryStore} from '../indexed-history.js?v=28.3.1';
import {compactHistoryRecord,restoreHistoryRecord,restoreHistoryCore} from '../history-storage.js?v=28.3.1';
import {resolveSelections} from '../catalog.js?v=28.3.1';
import {productionPlan,repairPrompt} from '../production-plan.js?v=28.3.1';
import {stagePrompts} from '../production-workflow.js?v=28.3.1';
import {composePrompt} from '../prompt.js?v=28.3.1';
import {buildDirection} from '../direction.js?v=28.3.1';

const key='mumeis-halloween-v2',random=()=>.28,profile={displayName:'保存容量の検査',topics:[]};
const values=resolveSelections({sceneUnified:true,design:'新聞の一面',medium:'クリスタルホログラム造形アニメ',theme:'宇宙のHalloween',costume:'ヴィクトリア朝の正装',pose:'片手を差し出す',type:'新聞風・記事と段組み'},random);
const production=productionPlan(profile,values,buildDirection([],values.mood,random,'halloween',values),'halloween',random);
const record={version:'28.3.1',collection:'halloween',profile,values,variant:production.variant,production,stages:stagePrompts(production),edition:'LATEST',references:[],date:'2026-10-08T00:00:00Z',count:12};record.prompt=composePrompt({...record,creator:'',preparedPlan:production});
const state={history:Array.from({length:12},(_,i)=>({...record,edition:i?'OLD-'+i:'LATEST',date:new Date(Date.parse(record.date)-i*1000).toISOString(),count:12-i})),used:Array.from({length:2000},(_,i)=>({signature:'used-'+i,face:'left',pose:'手を上げる',layout:'中央配置'})),count:12};
const original=JSON.stringify(state);
class MemoryDatabase{
 constructor(){this.data=new Map();this.queue=Promise.resolve();this.failRead=false;this.failWrite=false;this.reads=0;}
 async read(k){this.reads++;if(this.failRead)throw new DOMException('denied','SecurityError');return structuredClone(this.data.get(k)||null);}
 update(k,updater,{shouldWrite=()=>true}={}){const action=this.queue.then(()=>{if(this.failWrite)throw new DOMException('quota','QuotaExceededError');if(!shouldWrite())return {saved:false,cancelled:true};const outcome=updater(structuredClone(this.data.get(k)||null));if(outcome.write!==false)this.data.set(k,structuredClone(outcome.state));return {...outcome,saved:outcome.write!==false};});this.queue=action.catch(()=>{});return action;}
}
function localStore(initial={},limit=Infinity){const data=new Map(Object.entries(initial));let writes=0;return {data,get writes(){return writes;},getItem:k=>data.get(k)||null,setItem(k,v){writes++;const size=[...data].reduce((sum,[other,value])=>sum+(other===k?0:value.length*2),v.length*2);if(size>limit)throw new DOMException('quota','QuotaExceededError');data.set(k,v);}};}

// Old keys and unrelated feature data occupy the origin; no marker can fit.
const storage=localStore({[key]:original,'mumeis-halloween-v1':'KEEP_LEGACY','other-feature':'KEEP_OTHER_FEATURE'},10),database=new MemoryDatabase();
const persistence=createHistoryPersistence({key,storage,database,now:()=>100});
const loaded=await persistence.load();assert.equal(loaded.backend,'localstorage');assert.equal(loaded.needsMigration,true);
const migrated=await persistence.save(loaded.state);assert.equal(migrated.saved,true);assert.equal(migrated.backend,'indexeddb');assert.equal(migrated.state.history.length,12);assert.equal(migrated.state.used.length,2000);assert.equal(storage.writes,0,'Database success needs no localStorage marker');
assert.equal(storage.data.get(key),original);assert.equal(storage.data.get('mumeis-halloween-v1'),'KEEP_LEGACY');assert.equal(storage.data.get('other-feature'),'KEEP_OTHER_FEATURE');
const packedBytes=JSON.stringify(migrated.state).length*2;assert.ok(packedBytes<original.length*2*.8,'Prompt/variant compaction bytes '+packedBytes+'/'+(original.length*2)+' core '+migrated.state.history[0].coreArchive.encoding+' details '+migrated.state.history[0].detailArchive.encoding);
for(const compact of migrated.state.history){const restored=await restoreHistoryRecord(compact);assert.equal(restored.prompt,record.prompt);assert.deepEqual(restored.variant,record.variant);assert.deepEqual(restored.production,production);assert.deepEqual(restored.stages,record.stages);assert.equal(repairPrompt(restored),repairPrompt(record));}
assert.deepEqual(migrated.state.used.map(r=>r.signature),state.used.map(r=>r.signature));assert.deepEqual(migrated.state.used.slice(-3),state.used.slice(-3));
const reopened=createHistoryPersistence({key,storage,database});const afterReload=await reopened.load();assert.equal(afterReload.backend,'indexeddb');assert.equal(afterReload.state.history[0].edition,'LATEST');assert.ok(database.reads>=2,'Reload checks IndexedDB without a localStorage flag');
assert.equal(reopened.cacheInfo().localParsed,false,'The archived database state does not retain a second fully expanded legacy state');
database.failRead=true;reopened.invalidate();const temporaryFallback=await reopened.load();assert.equal(temporaryFallback.backend,'localstorage');assert.equal((await restoreHistoryRecord(temporaryFallback.state.history[0])).prompt,record.prompt,'Releasing legacy objects still permits a later exact fallback from the original key');database.failRead=false;

// After migrating eleven existing records, a new twelfth prompt survives a
// fresh page instance together with every old record, including old recipes.
const eleven={...state,history:state.history.slice(1)},oldEleven=JSON.stringify(eleven),reloadStorage=localStore({[key]:oldEleven},10),reloadDB=new MemoryDatabase(),firstPage=createHistoryPersistence({key,storage:reloadStorage,database:reloadDB});
await firstPage.save((await firstPage.load()).state);
const newRecord={...record,edition:'NEW-AFTER-MIGRATION',date:'2026-10-08T03:00:00Z',count:13,prompt:record.prompt+'\n新しい本文🙂を、そのまま保持。'};
const newSave=await firstPage.save({...eleven,history:[newRecord,...eleven.history],count:13});assert.equal(newSave.saved,true);
const nextPage=createHistoryPersistence({key,storage:reloadStorage,database:reloadDB}),reloaded=(await nextPage.load()).state;assert.equal(reloaded.history.length,12);assert.ok(eleven.history.every(old=>reloaded.history.some(r=>r.edition===old.edition)));assert.equal((await restoreHistoryRecord(reloaded.history.find(r=>r.edition===newRecord.edition))).prompt,newRecord.prompt);assert.equal(reloadStorage.getItem(key),oldEleven);

// A denied database still gets a full, smaller atomic localStorage fallback.
const fallbackStorage=localStore({[key]:original,'other-feature':'KEEP'},packedBytes*1.2),denied=new MemoryDatabase();denied.failRead=denied.failWrite=true;
const fallback=createHistoryPersistence({key,storage:fallbackStorage,database:denied});await fallback.load();const fallbackSaved=await fallback.save(state);assert.equal(fallbackSaved.saved,true);assert.equal(fallbackSaved.backend,'localstorage');assert.equal(fallbackSaved.state.history.length,12);assert.equal(fallbackSaved.state.used.length,2000);assert.equal(fallbackStorage.data.get('other-feature'),'KEEP');assert.equal((await restoreHistoryRecord(JSON.parse(fallbackStorage.data.get(key)).history[0])).prompt,record.prompt);
assert.ok(fallbackSaved.state.used.slice(0,-3).every(record=>Object.keys(record).length===1),'Merging a legacy local copy cannot restore 1,997 obsolete direction metadata payloads');
assert.deepEqual(fallbackSaved.state.used.slice(-3),state.used.slice(-3),'Fallback keeps recent direction comparison metadata and all repeat-avoidance signatures');
const impossibleStorage=localStore({[key]:original},10),impossible=createHistoryPersistence({key,storage:impossibleStorage,database:denied});const failed=await impossible.save(state);assert.equal(failed.saved,false);assert.equal(failed.quota,true);assert.equal(impossibleStorage.data.get(key),original,'Two failed stores must leave the previous successful save untouched');assert.equal(impossibleStorage.writes,1,'No retry removes older histories or signatures');

// Missing, throwing and unusable codecs preserve exact JSON in the database.
for(const codecs of [{Compression:null,Decompression:null},{Compression:class{constructor(){throw new Error('codec disabled');}},Decompression:DecompressionStream},{Compression:CompressionStream,Decompression:class{constructor(){throw new Error('decode disabled');}}}]){
 const db=new MemoryDatabase(),repo=createHistoryPersistence({key,storage:impossibleStorage,database:db,...codecs}),saved=await repo.save(state);assert.equal(saved.saved,true);assert.equal(saved.state.history.length,12);assert.equal(saved.state.history[0].coreArchive.encoding,'json');assert.deepEqual((await restoreHistoryRecord(saved.state.history[0],{Decompression:null})).production,production);assert.equal((await restoreHistoryRecord(saved.state.history[0],{Decompression:null})).prompt,record.prompt);
}
const coreOnly=await compactHistoryRecord(record,{archiveCore:true}),badDetails={...coreOnly,detailArchive:{encoding:'gzip-base64',data:'BROKEN'}};await assert.rejects(()=>restoreHistoryRecord(badDetails));assert.equal((await restoreHistoryCore(badDetails)).prompt,record.prompt,'A damaged optional plan does not hide a valid prompt');

// Independent tabs merge inside the same update transaction; clearing advances
// a history epoch, so an old tab cannot restore cleared entries on its next save.
const shared=new MemoryDatabase(),quiet=localStore(),tabA=createHistoryPersistence({key,storage:quiet,database:shared,now:()=>200}),tabB=createHistoryPersistence({key,storage:quiet,database:shared,now:()=>200});
const make=(edition,date)=>({history:[{...record,edition,date}],used:[{signature:edition}],count:13});
await Promise.all([tabA.save(make('TAB-A','2026-10-08T01:00:00Z')),tabB.save(make('TAB-B','2026-10-08T02:00:00Z'))]);
let sharedState=await shared.read(key);assert.deepEqual(sharedState.history.map(r=>r.edition),['TAB-B','TAB-A']);assert.equal(sharedState.used.length,2);
const oldSnapshot=(await tabB.load()).state,cleared=await tabA.clear((await tabA.load()).state);assert.equal(cleared.saved,true);assert.equal(cleared.state.history.length,0);assert.equal(cleared.state.used.length,2,'Explicit history clear keeps repeat avoidance records');assert.equal(cleared.state.count,13);
assert.equal(JSON.parse(quiet.getItem(key)).history.length,0,'Confirmed clear writes a small legacy-store tombstone when possible');
const late=await tabB.save(oldSnapshot);assert.equal(late.saved,false);assert.equal(late.conflict,true);assert.equal((await shared.read(key)).history.length,0);
quiet.setItem(key,original);const clearReload=await tabA.load();assert.equal(clearReload.state.history.length,0,'A committed empty database is authoritative over the old localStorage copy');
shared.failRead=true;tabA.invalidate();assert.equal((await tabA.load()).state.history.length,0,'A temporary DB failure cannot roll a live tab back to an already cleared legacy key');shared.failRead=false;
const cancelled=await tabA.save(state,{shouldWrite:()=>false});assert.equal(cancelled.cancelled,true);assert.equal((await shared.read(key)).history.length,0);

// Test the actual IndexedDB adapter event timing and failed transaction atomicity.
function indexedFactory({mode='normal'}={}){
 const data=new Map(),stats={closed:0,putSuccess:false};
 const db={objectStoreNames:{contains:()=>true},close(){stats.closed++;},transaction(store,access){assert.equal(store,'states');let staged=null,aborted=false;const tx={error:null,abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());},objectStore(){return {get(k){const req={result:structuredClone(data.get(k))};setTimeout(()=>{req.onsuccess?.();setTimeout(()=>{if(aborted)return;if(mode==='abort-after-put'&&staged){tx.error=new DOMException('quota','QuotaExceededError');tx.onabort?.();return;}if(staged)data.set(staged.key,staged.value);tx.oncomplete?.();},0);},0);return req;},put(value,k){staged={key:k,value:structuredClone(value)};const req={};queueMicrotask(()=>{stats.putSuccess=true;req.onsuccess?.();});return req;}};}};return tx;}};
 return {data,stats,open(){const req={result:db};if(mode==='timeout')return req;if(mode==='blocked'){setTimeout(()=>req.onblocked?.(),0);setTimeout(()=>req.onsuccess?.(),10);}else setTimeout(()=>req.onsuccess?.(),0);return req;}};
}
const factory=indexedFactory(),adapter=createIndexedHistoryStore({indexedDB:factory,timeoutMs:100});const pending=adapter.update(key,()=>({state:{history:['A']},write:true}));assert.equal(factory.data.size,0);const committed=await pending;assert.equal(committed.saved,true);assert.deepEqual(await adapter.read(key),{history:['A']});
const aborting=indexedFactory({mode:'abort-after-put'}),abortedAdapter=createIndexedHistoryStore({indexedDB:aborting,timeoutMs:100});await assert.rejects(()=>abortedAdapter.update(key,()=>({state:{history:['FAIL']},write:true})),e=>e.name==='QuotaExceededError');assert.equal(aborting.stats.putSuccess,true);assert.equal(aborting.data.size,0,'Request success alone must not report a committed save');
for(const mode of ['blocked','timeout']){const f=indexedFactory({mode}),driver=createIndexedHistoryStore({indexedDB:f,timeoutMs:20});await assert.rejects(()=>driver.read(key));if(mode==='blocked'){await new Promise(resolve=>setTimeout(resolve,15));assert.equal(f.stats.closed,1,'A late blocked-open success closes the abandoned connection');}}
let allowed=true;const conditional=indexedFactory(),conditionalAdapter=createIndexedHistoryStore({indexedDB:conditional,timeoutMs:100}),staleWrite=conditionalAdapter.update(key,()=>({state:{history:['STALE']},write:true}),{shouldWrite:()=>allowed});allowed=false;assert.equal((await staleWrite).cancelled,true);assert.equal(conditional.data.size,0);

// Startup and generation wait for the asynchronous history load; migration of
// old records uses the same save wrapper, and clear is an explicit operation.
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.match(app,/async function generate\(lockedValues=null\)\{\s*await historyReady;/);assert.match(app,/await syncSaved\(\);const input=/);assert.match(app,/historyReady=initializeHistory\(\)/);assert.match(app,/persist\(\{clearHistory:true\}\)/);
const initSource=app.slice(app.indexOf('async function initializeHistory(){'),app.indexOf('\nasync function syncSaved()',app.indexOf('async function initializeHistory(){')));
const initContext=vm.createContext({saved:{history:[],used:[],count:0},migrateHistory:false,historyPersistence:{load:async()=>({state:migrated.state,needsMigration:true})},normalizeSavedHistory:x=>x,mergeHistoryStates:(a,b)=>b,renderHistory(){},persist:async()=>{initContext.migrated=true;},migrated:false});vm.runInContext(initSource,initContext);await vm.runInContext('initializeHistory()',initContext);assert.equal(initContext.saved.history.length,12);assert.equal(initContext.migrated,true);
console.log(JSON.stringify({result:'PASS IndexedDB/history persistence: full 12 histories/2000 signatures, exact prompt/variant/plan/stages/repair, legacy keys preserved, full local fallback, no-codec fallback, cross-tab atomic merge, clear epoch, quota and commit failure, bounded blocked/open timeout, startup awaits read',beforeUtf16Bytes:original.length*2,afterUtf16Bytes:packedBytes,reductionPercent:Math.round((1-packedBytes/(original.length*2))*100)}));
