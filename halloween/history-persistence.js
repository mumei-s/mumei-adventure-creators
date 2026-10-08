import {HISTORY_STORAGE_FORMAT,compactHistoryRecord,compactUsedRecords,mergeUsedRecords,quotaExceeded} from './history-storage.js?v=28.2.0';
import {createIndexedHistoryStore} from './indexed-history.js?v=28.2.0';

const empty=()=>({history:[],used:[],count:0,historyEpoch:'legacy',clearedAt:0,savedAt:0});
const valid=state=>!!state&&Array.isArray(state.history)&&Array.isArray(state.used);
const stamp=state=>Number.isFinite(state?.savedAt)?state.savedAt:0;
const cleared=state=>Number.isFinite(state?.clearedAt)?state.clearedAt:0;
const epoch=state=>typeof state?.historyEpoch==='string'?state.historyEpoch:'legacy';
function normalize(state){return {...empty(),...state,history:(state.history||[]).slice(0,12),used:compactUsedRecords(state.used),count:Number.isSafeInteger(state.count)?state.count:0,historyEpoch:epoch(state),clearedAt:cleared(state),savedAt:stamp(state)};}
function mergeHistory(existing,incoming){
 const records=new Map();
 for(const record of [...existing,...incoming])if(record&&typeof record.edition==='string')records.set(record.edition,record);
 return [...records.values()].sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0)||(b.count||0)-(a.count||0)).slice(0,12);
}
function combine(existing,incoming){
 if(!valid(existing))return normalize(incoming);
 if(epoch(existing)!==epoch(incoming))return normalize(cleared(incoming)>cleared(existing)?incoming:existing);
 const latest=stamp(incoming)>=stamp(existing)?incoming:existing;
 const older=latest===incoming?existing:incoming;
 return {...normalize(latest),history:mergeHistory(older.history,latest.history),used:compactUsedRecords(mergeUsedRecords(older.used,latest.used)),count:Math.max(existing.count||0,incoming.count||0)};
}
export function mergeHistoryStates(existing,incoming){return combine(existing,incoming);}

// IndexedDB is always checked; a localStorage marker itself may fail at quota.
// Old keys remain untouched after migration. No capacity retry removes history.
export function createHistoryPersistence({key,storage=()=>globalThis.localStorage,indexedDB=()=>globalThis.indexedDB,database,now=Date.now,Compression=globalThis.CompressionStream,Decompression=globalThis.DecompressionStream,eventTarget=globalThis.window,documentTarget=globalThis.document,channelFactory=typeof globalThis.window!=='undefined'&&typeof globalThis.BroadcastChannel==='function'?name=>new globalThis.BroadcastChannel(name):null}={}){
 const db=database||createIndexedHistoryStore({indexedDB});
 let lastState=empty(),cached=null,pending=null,dirty=true,revision=0,closed=false,localRaw,localParsed;
 let channel=null;try{channel=channelFactory?.('atelier-history:'+key)||null;}catch{}
 const local=()=>typeof storage==='function'?storage():storage;
 function readLocal({force=false}={}){try{const raw=local()?.getItem(key)||'null';if(!force&&raw===localRaw)return localParsed;const state=JSON.parse(raw);localRaw=raw;localParsed=valid(state)?state:null;return localParsed;}catch{return null;}}
 function invalidate(){dirty=true;revision++;}
 const onStorage=event=>{if(event.key===key||event.key===null){localRaw=undefined;localParsed=undefined;invalidate();}};
 const onVisible=()=>{if(!documentTarget?.hidden)invalidate();};
 const onPageShow=event=>{if(event.persisted)invalidate();};
 const onMessage=event=>{if(event.data?.key===key)invalidate();};
 channel?.addEventListener?.('message',onMessage);
 eventTarget?.addEventListener?.('storage',onStorage);
 eventTarget?.addEventListener?.('pageshow',onPageShow);
 documentTarget?.addEventListener?.('visibilitychange',onVisible);
 function remember(result){lastState=result.state||lastState;cached=result;dirty=!!result.error;}
 function announce(result){if(!result.saved)return;try{channel?.postMessage({key,savedAt:stamp(result.state),historyEpoch:epoch(result.state)});}catch{}}
 async function load({fresh=false}={}){
  if(closed)throw new Error('履歴の読み込みを終了しています。');
  if(fresh)invalidate();
  // Without change notifications, read before every request. The transaction
  // still merges the latest state when writing, including clear tombstones.
  if(channel&&!dirty&&cached)return {...cached,cached:true};
  if(pending)return pending;
  const startedRevision=revision;
  const task=(async()=>{
  let fallback=readLocal(),indexed=null,error=null;
  try{indexed=await db.read(key);}catch(cause){error=cause;}
  // A successful database read releases the parsed legacy copy. If the
  // database later becomes unavailable, its untouched key can still be read.
  if(!valid(indexed)&&!fallback&&localRaw&&localRaw!=='null')fallback=readLocal({force:true});
  const hasIndexed=valid(indexed),hasLocal=valid(fallback);
  const state=hasIndexed?hasLocal?combine(indexed,fallback):normalize(indexed):hasLocal?combine(lastState,fallback):cached?.state||null;
  if(hasIndexed)localParsed=null;
  const backend=hasIndexed?'indexeddb':hasLocal?'localstorage':null;
  const result={state,backend,error,needsMigration:!!state&&(!hasIndexed||state.storageFormat!==HISTORY_STORAGE_FORMAT||stamp(state)>stamp(indexed))};
  // A notification received during this read means its snapshot may already
  // be old. Return it, but require the next request to read again.
  if(startedRevision===revision)remember(result);
  return result;
  })();
  pending=task;
  try{return await task;}finally{if(pending===task)pending=null;}
 }
 async function prepare(state){
  return {...normalize(state),storageFormat:HISTORY_STORAGE_FORMAT,history:await Promise.all((state.history||[]).slice(0,12).map(record=>compactHistoryRecord(record,{Compression,Decompression,archiveCore:true})))};
 }
 async function write(state,{shouldWrite=()=>true,clearHistory=false}={}){
  const input=await prepare(state);
  if(!shouldWrite())return {saved:false,cancelled:true};
  let indexedError=null;
  const update=existing=>{
   if(!clearHistory&&valid(existing)&&epoch(existing)!==epoch(input)&&cleared(input)<=cleared(existing))return {state:normalize(existing),write:false,conflict:true};
   let candidate=clearHistory?{...combine(existing,input),history:[],historyEpoch:'clear-'+now()+'-'+Math.random().toString(36).slice(2),clearedAt:Math.max(now(),cleared(existing)+1,cleared(input)+1)}:combine(existing,input);
   candidate={...candidate,storageFormat:HISTORY_STORAGE_FORMAT,savedAt:Math.max(now(),stamp(existing)+1,stamp(input)+1)};
   return {state:candidate,write:true};
  };
  try{
   const result=await db.update(key,update,{shouldWrite});
   if(result.saved||result.conflict){
    revision++;localParsed=null;remember({state:result.state,backend:'indexeddb',error:null,needsMigration:false});announce(result);
    // Only an explicitly confirmed clear replaces the old local copy. Its
    // empty-state tombstone prevents resurrection if IndexedDB later blocks.
    if(result.saved&&clearHistory)try{local().setItem(key,JSON.stringify(result.state));}catch{}
    return {...result,backend:'indexeddb'};
   }
   if(result.cancelled)return result;
  }catch(error){indexedError=error;}
  if(!shouldWrite())return {saved:false,cancelled:true};
  // Fallback writes all twelve records and all signatures atomically. It does
  // not delete an old key, another feature's data or the last successful save.
  try{
   const existing=readLocal(),result=update(combine(existing||empty(),lastState));
   if(!result.write)return {...result,saved:false,backend:'localstorage'};
   local().setItem(key,JSON.stringify(result.state));localRaw=undefined;localParsed=undefined;
   const committed={...result,saved:true,backend:'localstorage',fallback:true};revision++;remember({state:result.state,backend:'localstorage',error:indexedError,needsMigration:true});announce(committed);
   return committed;
  }catch(error){return {saved:false,quota:quotaExceeded(error)||quotaExceeded(indexedError),error,indexedError};}
 }
 function close(){closed=true;invalidate();cached=null;localRaw=localParsed=undefined;channel?.removeEventListener?.('message',onMessage);channel?.close?.();eventTarget?.removeEventListener?.('storage',onStorage);eventTarget?.removeEventListener?.('pageshow',onPageShow);documentTarget?.removeEventListener?.('visibilitychange',onVisible);db.close?.();}
 return {load,invalidate,cacheInfo:()=>({snapshot:!!cached,pending:!!pending,localParsed:!!localParsed,notifications:!!channel}),save:(state,options)=>write(state,options),clear:(state,options)=>write(state,{...options,clearHistory:true}),close};
}
