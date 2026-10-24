import {withDeadline} from '../transition-effects.js?v=20261016-living1';

// The published entry bundle carries the matching catalog and character manifest.
// Source/module development still works, and only a missing snapshot needs HTTP.
export async function loadMazeStartupData({snapshot=globalThis.__HALLOWEEN_MAZE_BOOT__,signal,fetcher=globalThis.fetch}={}){
 const read=(key,url)=>snapshot?.[key]&&typeof snapshot[key]==='object'&&!Array.isArray(snapshot[key])?Promise.resolve(snapshot[key]):fetchStartupJSON(url,{signal,fetcher});
 return Promise.all([read('archive','../data/archive.json'),read('catalog','./data/catalog.json'),read('characters','./data/creator-characters.json?v=182ab7a3ff04')]);
}

// Static game data may use the HTTP cache. Retry only the failed request, with
// a fresh network request on the second attempt; never cache an incomplete roster ourselves.
export async function fetchStartupJSON(url,{fetcher=globalThis.fetch,timeout=8000,attempts=2,timers=globalThis,signal,cache='default',onRetry=()=>{}}={}){
 let failure;
 for(let attempt=0;attempt<attempts;attempt++){
  if(signal?.aborted)throw Error('Loading cancelled');
  const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});
  try{return await withDeadline((async()=>{const response=await fetcher(url,{cache:attempt?'reload':cache,signal:abort.signal});if(!response.ok){const error=Error('Game data could not be loaded');error.status=response.status;throw error;}return response.json();})(),{timeout,timers,signal,onTimeout:cancel});}
  catch(error){failure=error;if(signal?.aborted||error.status>=400&&error.status<500&&![408,429].includes(error.status))throw error;if(attempt+1<attempts)onRetry();}
  finally{abort.abort();signal?.removeEventListener('abort',cancel);}
 }
 throw failure;
}

// Keep successfully decoded characters. Retry just missing approved assets, and
// retain the readiness gate: an empty/substitute hero never counts as playable.
export async function loadRequiredCharacters(assets,definitions,{signal,attempts=2,timeout=12000,timers=globalThis,onRetry=()=>{}}={}){
 const result=Array(definitions.length).fill(null);
 for(let attempt=0;attempt<attempts;attempt++){
  if(signal?.aborted)throw Error('Loading cancelled');
  const missing=definitions.map((asset,index)=>({asset,index})).filter(({index})=>!result[index]);
  if(attempt){assets.retry(missing.map(({asset})=>asset.src));onRetry();}
  const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});
  try{await withDeadline(Promise.all(missing.map(async({asset,index})=>{result[index]=await assets.request(asset,{signal:abort.signal,priority:'high'});})),{timeout,timers,signal,onTimeout:cancel});}
  catch(error){if(signal?.aborted||attempt+1>=attempts)throw error;}
  finally{abort.abort();signal?.removeEventListener('abort',cancel);}
  if(result.every(Boolean))return result;
 }
 throw Error('Required character image could not be loaded');
}
