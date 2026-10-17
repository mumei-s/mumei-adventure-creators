/** Lifecycle of decorative CSS only. The art remains visible if JavaScript fails. */
export function initAdventureAtmosphere({document:doc=globalThis.document,window:win=globalThis.window}={}){
 let suspended=false;
 const sync=()=>{if(doc?.documentElement?.dataset)doc.documentElement.dataset.atmospherePaused=String(suspended||!!doc.hidden);};
 const hide=()=>{suspended=true;sync();},show=()=>{suspended=false;sync();};
 doc?.addEventListener?.('visibilitychange',sync);win?.addEventListener?.('pagehide',hide);win?.addEventListener?.('pageshow',show);sync();
 return {destroy(){doc?.removeEventListener?.('visibilitychange',sync);win?.removeEventListener?.('pagehide',hide);win?.removeEventListener?.('pageshow',show);}};
}
if(typeof document!=='undefined'&&typeof window!=='undefined')initAdventureAtmosphere();
