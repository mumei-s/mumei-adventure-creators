/** Bounded image waits: no stale handlers or forever-loading animation. */
export function loadArtworkImage(image, source, {onState=()=>{}, timeout=10000, timers=globalThis}={}) {
 let active=true, timer;
 const cleanup=()=>{timers.clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);};
 const finish=state=>{if(!active)return;active=false;cleanup();onState(state);};
 const loaded=()=>finish(image.naturalWidth?'ready':'error');
 const failed=()=>finish('error');
 onState('loading');
 image.addEventListener('load',loaded);image.addEventListener('error',failed);
 timer=timers.setTimeout(failed,timeout);
 image.src=source;
 if(image.complete)loaded();
 return ()=>{active=false;cleanup();};
}
