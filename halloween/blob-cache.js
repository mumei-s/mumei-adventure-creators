// Keep originals byte-for-byte. Eviction drops only this cache's references;
// Files already owned by an active result remain valid.
export const ORIGINAL_CACHE_LIMITS=Object.freeze({maxEntries:6,maxBytes:12*1024*1024});
export function createBlobCache({maxEntries=ORIGINAL_CACHE_LIMITS.maxEntries,maxBytes=ORIGINAL_CACHE_LIMITS.maxBytes}={}){
 const ready=new Map(),pending=new Map();let bytes=0;
 function trim(){while(ready.size>maxEntries||bytes>maxBytes){const key=ready.keys().next().value;bytes-=ready.get(key).size;ready.delete(key);}}
 function get(key,load){
  if(ready.has(key)){const blob=ready.get(key);ready.delete(key);ready.set(key,blob);return Promise.resolve(blob);}
  if(pending.has(key))return pending.get(key);
  const request=Promise.resolve().then(load).then(blob=>{if(blob.size<=maxBytes&&maxEntries>0){ready.set(key,blob);bytes+=blob.size;trim();}return blob;}).finally(()=>pending.delete(key));
  pending.set(key,request);return request;
 }
 return {get,info:()=>({entries:ready.size,bytes,pending:pending.size,maxEntries,maxBytes})};
}
