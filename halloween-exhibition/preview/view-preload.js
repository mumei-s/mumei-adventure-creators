// Resource hints only: no import evaluation, WebGL construction, byte cache or
// readiness promise. Call after the real hero/cat gate, only for the chosen view.
const issuedByDocument=new WeakMap();
const noop=()=>{};

export function selectedViewDependencyURLs(worldURL,{baseURL=globalThis.document?.baseURI,moduleURL=import.meta.url}={}){
 if(!worldURL)return[];
 const sourceWorld=new URL(worldURL,baseURL);
 // The game builder substitutes the same hashed URL used by dynamic import.
 const world=new URL(globalThis.__ATELIER_GAME_WORLD_URL__||sourceWorld.href,sourceWorld);
 return[world.href,new URL('./maze/vendor/three.module.js',moduleURL).href,new URL('./maze/vendor/three.core.min.js',moduleURL).href];
}

export function preloadSelectedView({requires3D=false,worldURL,signal,doc=globalThis.document}={}){
 if(!requires3D||signal?.aborted||!doc?.head)return noop;
 let urls,probe;
 try{
  urls=selectedViewDependencyURLs(worldURL,{baseURL:doc.baseURI});
  if(!urls.length)return noop;
  probe=doc.createElement('link');
  if(!probe.relList?.supports?.('modulepreload'))return noop;
 }catch{return noop;}
 let issued=issuedByDocument.get(doc);
 if(!issued){issued=new Map();issuedByDocument.set(doc,issued);}
 const existing=new Map([...doc.querySelectorAll('link[rel~="modulepreload"]')].map(link=>[link.href,link]));
 const owned=[];
 let active=true;
 const release=()=>{
  if(!active)return;active=false;signal?.removeEventListener('abort',release);
  for(const record of owned){
   record.users--;
   if(!record.users&&record.owned){record.link?.remove();record.link=null;}
  }
 };
 signal?.addEventListener('abort',release,{once:true});
 for(const href of new Set(urls)){
  if(!active||signal?.aborted){release();break;}
  let record=issued.get(href);
  if(!record){
   const prior=existing.get(href),link=prior||probe||doc.createElement('link');probe=null;
   record={link,owned:!prior,users:0};issued.set(href,record);
   if(!prior){
    link.rel='modulepreload';link.href=href;link.crossOrigin='anonymous';
    link.setAttribute('fetchpriority','low');
    doc.head.append(link);
   }
  }
  record.users++;owned.push(record);
 }
 // Removing a hint cannot reliably cancel its network request. Remember issued
 // URLs for this document's lifetime, even after release, so rapid view changes
 // never add a second request hint. The browser module map owns the actual bytes.
 return release;
}
