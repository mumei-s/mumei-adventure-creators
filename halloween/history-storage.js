import {compactCreatorProfile} from './creator.js?v=28.4.1';

export const HISTORY_STORAGE_FORMAT=4;
const historyLimit=12,usedLimit=2000;
const recordKeys=['version','collection','creator','profile','values','variant','edition','prompt','date','references','drawingReferences','attachmentMode','preparationMs','count','legacy'];
const restoredRecords=new Map(),restoringRecords=new WeakMap();
let restoreEpoch=0;
export const RESTORED_HISTORY_CACHE_LIMIT=2;
export function clearRestoredHistoryCache(){restoreEpoch++;restoredRecords.clear();}
export function restoredHistoryCacheInfo(){return {records:restoredRecords.size,limit:RESTORED_HISTORY_CACHE_LIMIT};}
const variantSummaryKeys=['signature','family','face','expression','distance','pose','poseChoice','layout'];

function encodeBase64(bytes){
 let binary='';for(let offset=0;offset<bytes.length;offset+=16384)binary+=String.fromCharCode(...bytes.subarray(offset,offset+16384));
 return btoa(binary);
}
function decodeBase64(value){const binary=atob(value);return Uint8Array.from(binary,character=>character.charCodeAt(0));}
async function transform(bytes,Stream){
 const writer=new Blob([bytes]).stream().pipeThrough(new Stream('gzip'));
 return new Uint8Array(await new Response(writer).arrayBuffer());
}
async function archiveJSON(value,Compression,Decompression){
 const json=JSON.stringify(value);
 if(typeof Compression==='function'&&typeof Decompression==='function')try{
  const bytes=await transform(new TextEncoder().encode(json),Compression),data=encodeBase64(bytes);
  if(data.length<json.length&&new TextDecoder().decode(await transform(bytes,Decompression))===json)return {encoding:'gzip-base64',data};
 }catch{}
 return {encoding:'json',data:json};
}
async function readArchive(archive,Decompression){
 let json;if(archive.encoding==='json')json=archive.data;
 else if(archive.encoding==='gzip-base64'&&typeof Decompression==='function')json=new TextDecoder().decode(await transform(decodeBase64(archive.data),Decompression));
 else throw new Error('このブラウザでは履歴の制作詳細を展開できません。');
 const value=JSON.parse(json);
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('履歴の制作詳細を確認できません。');
 return value;
}

// Preserve the exact original plan and stage strings, including old recipes.
// Rebuilding a plan from the current catalog could silently change a history.
export async function compactHistoryRecord(record,{Compression=globalThis.CompressionStream,Decompression=globalThis.DecompressionStream,archiveCore=false}={}){
 const compact={};for(const key of recordKeys)if(record[key]!==undefined)compact[key]=record[key];
 compact.profile=compactCreatorProfile(record.profile||{});
 if(record.coreArchive)compact.coreArchive=record.coreArchive;
 else if(archiveCore){
  compact.coreArchive=await archiveJSON({prompt:record.prompt,variant:record.variant},Compression,Decompression);
  delete compact.prompt;
  compact.variant=Object.fromEntries(variantSummaryKeys.filter(key=>record.variant?.[key]!==undefined).map(key=>[key,record.variant[key]]));
 }
 if(record.detailArchive){compact.detailArchive=record.detailArchive;return compact;}
 if(!record.production&&!record.stages)return compact;
 compact.detailArchive=await archiveJSON({production:record.production||null,stages:record.stages||null},Compression,Decompression);return compact;
}

export async function restoreHistoryCore(record,{Decompression=globalThis.DecompressionStream}={}){
 if(!record.coreArchive)return record;
 const core=await readArchive(record.coreArchive,Decompression);
 if(typeof core.prompt!=='string'||!core.variant||typeof core.variant!=='object')throw new Error('保存された制作指示を確認できません。');
 return {...record,...core};
}
export async function restoreHistoryRecord(record,{Decompression=globalThis.DecompressionStream}={}){
 if(!record.detailArchive&&!record.coreArchive)return record;
 if(restoredRecords.has(record)){const cached=restoredRecords.get(record);restoredRecords.delete(record);restoredRecords.set(record,cached);return cached;}
 if(restoringRecords.has(record))return restoringRecords.get(record);
 const epoch=restoreEpoch,pending=(async()=>{
  const core=await restoreHistoryCore(record,{Decompression});
  const details=record.detailArchive?await readArchive(record.detailArchive,Decompression):{};
  const restored={...record,...core,...(record.detailArchive?{production:details.production||null,stages:details.stages||null}:{})};
  if(epoch===restoreEpoch){restoredRecords.set(record,restored);while(restoredRecords.size>RESTORED_HISTORY_CACHE_LIMIT)restoredRecords.delete(restoredRecords.keys().next().value);}
  return restored;
 })();
 restoringRecords.set(record,pending);
 try{return await pending;}finally{restoringRecords.delete(record);}
}

// All signatures continue to prevent repeats. Only the last three directions
// need face/gesture/layout metadata for the next direction's comparison.
export function compactUsedRecords(records,limit=usedLimit){
 if(limit<=0)return [];
 const valid=(records||[]).filter(record=>record&&typeof record.signature==='string').slice(-limit);
 return valid.map((record,index)=>index<valid.length-3?{signature:record.signature}:{...record});
}
export function mergeUsedRecords(existing,incoming){
 const merged=new Map();for(const record of [...existing,...incoming])if(record&&typeof record.signature==='string')merged.set(record.signature,{...merged.get(record.signature),...record});
 return [...merged.values()].slice(-usedLimit);
}
export function quotaExceeded(error){return error?.name==='QuotaExceededError'||error?.code===22||error?.code===1014;}

export async function saveHistoryState(storage,key,state,{shouldWrite=()=>true,Compression=globalThis.CompressionStream,Decompression=globalThis.DecompressionStream}={}){
 const history=await Promise.all((state.history||[]).slice(0,historyLimit).map(record=>compactHistoryRecord(record,{Compression,Decompression})));
 const used=compactUsedRecords(state.used),count=Number.isSafeInteger(state.count)?state.count:0;
 if(!shouldWrite())return {saved:false,cancelled:true};
 const candidate={storageFormat:HISTORY_STORAGE_FORMAT,history,used,count};
 try{storage.setItem(key,JSON.stringify(candidate));return {saved:true,state:candidate,droppedHistory:0,droppedUsed:0};}
 catch(error){return {saved:false,cancelled:false,quota:quotaExceeded(error),error};}
}
