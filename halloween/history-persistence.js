import {HISTORY_STORAGE_FORMAT,compactHistoryRecord,compactUsedRecords,mergeUsedRecords,quotaExceeded} from './history-storage.js?v=28.1.1';
import {createIndexedHistoryStore} from './indexed-history.js?v=28.1.1';

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
 const latest=stamp(incoming)>stamp(existing)?incoming:existing;
 return {...normalize(latest),history:mergeHistory(existing.history,incoming.history),used:mergeUsedRecords(existing.used,incoming.used),count:Math.max(existing.count||0,incoming.count||0)};
}
export function mergeHistoryStates(existing,incoming){return combine(existing,incoming);}

// IndexedDB is always checked; a localStorage marker itself may fail at quota.
// Old keys remain untouched after migration. No capacity retry removes history.
export function createHistoryPersistence({key,storage=()=>globalThis.localStorage,indexedDB=()=>globalThis.indexedDB,database,now=Date.now,Compression=globalThis.CompressionStream,Decompression=globalThis.DecompressionStream}={}){
 const db=database||createIndexedHistoryStore({indexedDB});
 let lastState=empty();
 const local=()=>typeof storage==='function'?storage():storage;
 function readLocal(){try{const state=JSON.parse(local()?.getItem(key)||'null');return valid(state)?state:null;}catch{return null;}}
 async function load(){
  const fallback=readLocal();let indexed=null,error=null;
  try{indexed=await db.read(key);}catch(cause){error=cause;}
  const hasIndexed=valid(indexed),hasLocal=valid(fallback);
  const state=hasIndexed?hasLocal?combine(indexed,fallback):normalize(indexed):hasLocal?normalize(fallback):null;
  if(state)lastState=state;
  const backend=hasIndexed?'indexeddb':hasLocal?'localstorage':null;
  return {state,backend,error,needsMigration:!!state&&(!hasIndexed||state.storageFormat!==HISTORY_STORAGE_FORMAT||stamp(state)>stamp(indexed))};
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
    lastState=result.state;
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
   local().setItem(key,JSON.stringify(result.state));lastState=result.state;
   return {...result,saved:true,backend:'localstorage',fallback:true};
  }catch(error){return {saved:false,quota:quotaExceeded(error)||quotaExceeded(indexedError),error,indexedError};}
 }
 return {load,save:(state,options)=>write(state,options),clear:(state,options)=>write(state,{...options,clearHistory:true}),close:()=>db.close?.()};
}
