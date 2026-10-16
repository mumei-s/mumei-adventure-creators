/** Decorative transitions never delay readiness, input, focus, or navigation. */
export function initTransitionEffects({document:doc=globalThis.document,window:win=globalThis.window,motion=()=>true}={}){
  const media=win?.matchMedia?.('(prefers-reduced-motion: reduce)'),animations=new Map(),loads=new WeakMap();
  let destroyed=false,suspended=false;
  const enabled=()=>!destroyed&&!suspended&&!doc?.hidden&&!media?.matches&&motion();
  const stop=()=>{for(const animation of animations.values())animation.cancel?.();animations.clear();};
  const sync=()=>{if(doc?.documentElement?.dataset)doc.documentElement.dataset.transitionPaused=String(!enabled());if(!enabled())stop();};
  function enter(target,{kind='panel'}={}){
    animations.get(target)?.cancel?.();animations.delete(target);
    if(!target||!enabled()||typeof target.animate!=='function')return;
    const frames=kind==='scene'?[{opacity:.72},{opacity:1}]:[{opacity:.72,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}];
    const animation=target.animate(frames,{duration:kind==='scene'?380:240,easing:'cubic-bezier(.2,.7,.2,1)',iterations:1});
    animations.set(target,animation);const remove=()=>{if(animations.get(target)===animation)animations.delete(target);};
    animation.onfinish=remove;animation.oncancel=remove;
  }
  function begin(status,label){
    const token={};if(status){loads.set(status,token);status.hidden=false;status.dataset.loadState='loading';status.textContent=label;status.setAttribute?.('aria-busy','true');}
    return ({error=false,message=''}={})=>{if(!status||loads.get(status)!==token)return;loads.delete(status);status.dataset.loadState=error?'error':'ready';status.setAttribute?.('aria-busy','false');status.hidden=!error;status.textContent=message;};
  }
  const listeners=[[doc,'visibilitychange',sync],[win,'pagehide',()=>{suspended=true;sync();}],[win,'pageshow',()=>{suspended=false;sync();}],[doc,'yearbook:motion-state',sync],[media,'change',sync]];
  for(const [target,event,fn] of listeners)target?.addEventListener?.(event,fn);
  sync();return{enter,begin,sync,destroy(){destroyed=true;stop();for(const [target,event,fn]of listeners)target?.removeEventListener?.(event,fn);}};
}
/** A real deadline, including fetch implementations that fail to settle on abort. */
export function withDeadline(promise,{timeout=12000,timers=globalThis,onTimeout=()=>{},signal}={}){
  return new Promise((resolve,reject)=>{let settled=false,timer=null;const aborted=()=>finish(reject,new Error('Loading cancelled'));
    const finish=(fn,value)=>{if(settled)return;settled=true;timers.clearTimeout(timer);signal?.removeEventListener('abort',aborted);fn(value);};
    Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
    if(signal?.aborted){aborted();return;}
    signal?.addEventListener('abort',aborted,{once:true});
    timer=timers.setTimeout(()=>{try{onTimeout();}catch{}finish(reject,new Error('Loading deadline exceeded'));},timeout);
  });
}
export async function fetchJSON(url,{fetcher=globalThis.fetch,timeout=12000,timers=globalThis}={}){
  const abort=new AbortController();
  return withDeadline((async()=>{const response=await fetcher(url,{cache:'no-store',signal:abort.signal});if(!response.ok)throw new Error('Data could not be loaded');return response.json();})(),{timeout,timers,onTimeout:()=>abort.abort()});
}
