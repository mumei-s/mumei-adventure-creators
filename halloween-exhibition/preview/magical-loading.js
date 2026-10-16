/** Bounded image waits: no stale handlers or forever-loading animation. */
export function loadArtworkImage(image, source, {onState=()=>{}, timeout=10000, timers=globalThis}={}) {
 let active=true, timer, decoding=false;
 const cleanup=()=>{timers.clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);};
 const finish=state=>{if(!active)return;active=false;cleanup();onState(state);};
 const loaded=()=>{
  if(!active||decoding)return;
  if(!image.naturalWidth){finish('error');return;}
  if(typeof image.decode!=='function'){finish('ready');return;}
  // A loaded file may still be decoding. Keep the read interval blocked until
  // pixels can be painted; cancelled/older decode promises cannot commit.
  decoding=true;
  Promise.resolve().then(()=>image.decode()).then(()=>finish('ready'),()=>finish('error'));
 };
 const failed=()=>finish('error');
 onState('loading');
 image.addEventListener('load',loaded);image.addEventListener('error',failed);
 timer=timers.setTimeout(failed,timeout);
 image.src=source;
 if(image.complete)loaded();
 return ()=>{active=false;cleanup();};
}
