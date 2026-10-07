import {compactCreatorProfile} from './creator.js?v=28.0.3';

export const HISTORY_STORAGE_FORMAT=3;
const historyLimit=12,usedLimit=2000;
const recordKeys=['version','collection','creator','profile','values','variant','edition','prompt','date','references','attachmentMode','preparationMs','count','legacy'];
const restoredRecords=new WeakMap();

function encodeBase64(bytes){
 let binary='';for(let offset=0;offset<bytes.length;offset+=16384)binary+=String.fromCharCode(...bytes.subarray(offset,offset+16384));
 return btoa(binary);
}
function decodeBase64(value){const binary=atob(value);return Uint8Array.from(binary,character=>character.charCodeAt(0));}
async function transform(bytes,Stream){
 const writer=new Blob([bytes]).stream().pipeThrough(new Stream('gzip'));
 return new Uint8Array(await new Response(writer).arrayBuffer());
}

// Preserve the exact original plan and stage strings, including old recipes.
// Rebuilding a plan from the current catalog could silently change a history.
export async function compactHistoryRecord(record,{Compression=globalThis.CompressionStream,Decompression=globalThis.DecompressionStream}={}){
 const compact={};for(const key of recordKeys)if(record[key]!==undefined)compact[key]=record[key];
 compact.profile=compactCreatorProfile(record.profile||{});
 if(record.detailArchive){compact.detailArchive=record.detailArchive;return compact;}
 if(!record.production&&!record.stages)return compact;
 const details={production:record.production||null,stages:record.stages||null},json=JSON.stringify(details);
 if(typeof Compression==='function'&&typeof Decompression==='function'){
  try{
   const data=encodeBase64(await transform(new TextEncoder().encode(json),Compression));
   if(data.length<json.length){compact.detailArchive={encoding:'gzip-base64',data};return compact;}
  }catch{} // Storage remains usable when the optional browser codec is absent.
 }
 compact.detailArchive={encoding:'json',data:json};return compact;
}

export async function restoreHistoryRecord(record,{Decompression=globalThis.DecompressionStream}={}){
 if(!record.detailArchive)return record;
 if(restoredRecords.has(record))return restoredRecords.get(record);
 const archive=record.detailArchive;
 let json;if(archive.encoding==='json')json=archive.data;
 else if(archive.encoding==='gzip-base64'&&typeof Decompression==='function')json=new TextDecoder().decode(await transform(decodeBase64(archive.data),Decompression));
 else throw new Error('このブラウザでは履歴の制作詳細を展開できません。');
 const details=JSON.parse(json);
 if(!details||typeof details!=='object'||Array.isArray(details))throw new Error('履歴の制作詳細を確認できません。');
 const restored={...record,production:details.production||null,stages:details.stages||null};
 restoredRecords.set(record,restored);return restored;
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
 // Retry only a genuine quota error. Do not wipe another site's keys or delete
 // the last successful save before a replacement is known to fit.
 const attempts=[[history.length,used.length],[history.length,512],[history.length,128],[6,128],[3,64],[1,3]];
 const tried=new Set();let error=null;
 for(const [historyCount,usedCount] of attempts){
  if(!shouldWrite())return {saved:false,cancelled:true};
  const candidate={storageFormat:HISTORY_STORAGE_FORMAT,history:history.slice(0,historyCount),used:compactUsedRecords(used,Math.min(used.length,usedCount)),count};
  const signature=candidate.history.length+'/'+candidate.used.length;if(tried.has(signature))continue;tried.add(signature);
  try{
   storage.setItem(key,JSON.stringify(candidate));
   return {saved:true,state:candidate,droppedHistory:history.length-candidate.history.length,droppedUsed:used.length-candidate.used.length};
  }catch(cause){error=cause;if(!quotaExceeded(cause))break;}
 }
 return {saved:false,cancelled:false,quota:quotaExceeded(error),error};
}
