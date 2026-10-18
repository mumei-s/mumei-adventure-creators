/** Wait for the actual painted castle, not just archive JSON. The embedded preview
 * remains visible if the full image fails, and the gate never stays locked forever. */
const startups=new WeakMap();
export function settlePalaceImage(image, {timeout=8000, timers=globalThis,onReady=()=>{}}={}) {
 return new Promise(resolve=>{
  if(!image){resolve('fallback');return;}
  let done=false, timer,painted=false;
  const remove=()=>{image.removeEventListener?.('load',loaded);image.removeEventListener?.('error',failed);};
  const finish=(value,keepLateLoad=false)=>{if(!keepLateLoad)remove();if(done)return;done=true;timers.clearTimeout(timer);resolve(value);};
  const reveal=()=>{if(image.style)image.style.visibility='visible';if(!painted){painted=true;onReady();}finish('ready');};
  const loaded=()=>{if(!image.naturalWidth){failed();return;}
   // The browser already has pixels after load. Decode is an optional readiness
   // hint; synchronous throws, rejection and a stalled decoder cannot lock TOP.
   try{if(typeof image.decode==='function')Promise.resolve(image.decode()).then(reveal,reveal);else reveal();}catch{reveal();}
  };
  const failed=()=>{if(image.style)image.style.visibility='hidden';finish('fallback');};
  if(image.style)image.style.visibility='hidden';
  image.addEventListener?.('load',loaded);image.addEventListener?.('error',failed);
  // Keep only the image's own event hooks after a deadline so late pixels can
  // upgrade the embedded preview. There is no repeating timer or extra request.
  timer=timers.setTimeout(()=>finish('fallback',true),timeout);
  if(image.complete&&(image.naturalWidth||image.currentSrc||image.src||image.getAttribute?.('src')))image.naturalWidth?loaded():failed();
 });
}
/** Decorative assets are optional: an absent file never paints a broken icon. */
export function guardPalaceDecorations(root){
 const images=[...(root?.querySelectorAll?.('img')||[])].filter(image=>!['artwork-image','host-avatar'].includes(image.id));
 const loaded=event=>{const image=event.target;if(images.includes(image)&&image.naturalWidth&&image.style)image.style.visibility='visible';};
 const failed=event=>{const image=event.target;if(images.includes(image)&&image.style)image.style.visibility='hidden';};
 for(const image of images)if(image.style)image.style.visibility=image.complete&&image.naturalWidth?'visible':'hidden';
 root.addEventListener?.('load',loaded,true);root.addEventListener?.('error',failed,true);
 return()=>{root.removeEventListener?.('load',loaded,true);root.removeEventListener?.('error',failed,true);};
}
/** Choose the painting by the visible scene, including a tall, wide viewport. */
export function palaceSceneFormat(width,height) {
 return Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0&&width/height<=1.1?'portrait':'landscape';
}
/** Large animated residents are an enhancement after the whole entrance works. */
export function schedulePalaceResidents(root,{ready,timers=globalThis,loadResidents}={}){
 const doc=root.ownerDocument,win=doc?.defaultView||globalThis,connection=win.navigator?.connection;
 if(connection?.saveData||['slow-2g','2g'].includes(connection?.effectiveType))return;
 let settled=false,timer=null,idle=null,observer,started=false,finished=false,attempts=0,pageHidden=false;
 const usable=()=>settled&&!pageHidden&&!doc?.hidden&&root.dataset.theaterReady==='ready'&&root.dataset.archiveState==='ready'&&(!root.dataset.palaceState||root.dataset.palaceState==='palace');
 const cancel=()=>{if(timer!==null)timers.clearTimeout(timer);timer=null;if(idle!==null)win.cancelIdleCallback?.(idle);idle=null;};
 const cleanup=()=>{cancel();observer?.disconnect();doc?.removeEventListener?.('visibilitychange',resume);win.removeEventListener?.('pageshow',resume);win.removeEventListener?.('pagehide',hide);};
 const check=()=>{
  if(finished)return;
  if(!usable()){cancel();return;}
  if(started||timer!==null||idle!==null||attempts>=2)return;
  timer=timers.setTimeout(()=>{
   timer=null;
   const begin=()=>{idle=null;if(started||finished||!usable())return;started=true;attempts++;
    void Promise.resolve().then(()=>loadResidents?loadResidents():import('./palace-living-scene.js?v=20261019-unified1'))
     .then(({initPalaceLivingScene})=>initPalaceLivingScene(root))
     .then(()=>{finished=true;cleanup();})
     .catch(()=>{started=false;check();});
   };
   if(typeof win.requestIdleCallback==='function')idle=win.requestIdleCallback(begin,{timeout:2000});else begin();
  },6000);
 };
 // A hidden deadline is deferred, and returning gives a failed optional import
 // one bounded retry cycle. Never spin on a broken connection in the background.
 function resume(){pageHidden=false;if(!doc?.hidden)attempts=0;check();}
 function hide(){pageHidden=true;cancel();}
 const Observer=win.MutationObserver;
 if(typeof Observer==='function'){observer=new Observer(check);observer.observe(root,{attributes:true,attributeFilter:['data-theater-ready','data-archive-state','data-palace-state']});}
 doc?.addEventListener?.('visibilitychange',resume);win.addEventListener?.('pageshow',resume);win.addEventListener?.('pagehide',hide);
 void Promise.resolve(ready).then(()=>{settled=true;check();});
 return()=>{finished=true;cleanup();};
}
export function initPalaceStartup(root,{timers=globalThis,ImageClass,loadResidents}={}) {
 if(!root)return Promise.resolve(['fallback','fallback']);
 if(startups.has(root))return startups.get(root);
 const doc=root.ownerDocument, image=doc.getElementById('palace-image'), header=root.querySelector('.masthead');
 const palace=doc.getElementById('palace-entrance');
 guardPalaceDecorations(root);
 // Embedded castle pixels are already usable. This status must not wait for
 // archive/settings/module initialization elsewhere in the application.
 root.dataset.palaceReady='fallback';
 const status=doc.getElementById('palace-load-status');if(status){status.textContent='';status.hidden=true;}
 const syncHeight=()=>{
  if(header)root.style.setProperty('--palace-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
  const rect=palace?.getBoundingClientRect();if(!rect?.width||!rect?.height)return;
  const format=palaceSceneFormat(rect.width,rect.height);root.dataset.palaceFormat=format;
  const source=image?.parentElement?.querySelector('source'),media=format==='portrait'?'all':'not all';
  if(source&&source.media!==media)source.media=media;
 };
 syncHeight();
 const Observer=doc.defaultView?.ResizeObserver||globalThis.ResizeObserver;
 if(typeof Observer==='function'){try{const observer=new Observer(syncHeight);if(header)observer.observe(header);observer.observe(root);if(palace)observer.observe(palace);}catch{/* Artwork still works when observation is unavailable. */}}
 let gateTexture;
 try{const Picture=ImageClass||doc.defaultView?.Image||globalThis.Image;gateTexture=new Picture();}catch{}
 const painted={castle:false,gate:false},markReady=kind=>{painted[kind]=true;root.dataset.palaceReady=painted.castle&&painted.gate?'ready':'fallback';};
 const castleReady=settlePalaceImage(image,{timers,onReady:()=>markReady('castle')}),gateReady=settlePalaceImage(gateTexture,{timers,onReady:()=>markReady('gate')});
 if(gateTexture)gateTexture.src=new URL(root.dataset.palaceFormat==='portrait'?'./assets/palace/gate-phone.webp':'./assets/palace/gate-desktop.webp',import.meta.url).href;
 const ready=Promise.all([castleReady,gateReady]);
 schedulePalaceResidents(root,{ready,timers,loadResidents});
 startups.set(root,ready);return ready;
}
// This module can boot independently of theater.js's larger dependency graph.
// A second call by the theater reuses the same guards and pending readiness.
if(typeof document!=='undefined'){
 const root=document.getElementById('theater');
 if(root)void initPalaceStartup(root).catch(()=>{
  root.dataset.palaceReady='fallback';const status=document.getElementById('palace-load-status');if(status){status.textContent='';status.hidden=true;}
 });
}
