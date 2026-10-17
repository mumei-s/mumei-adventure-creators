/** One owned RAF chain. Restarting discards the suspended interval and stale callbacks. */
export function createFrameLoop({request=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame,shouldRun=()=>true,onFrame,maxDelta=.05}={}){
  let handle=null,generation=0,running=false,last=null;
  function queue(token){handle=request(now=>{
    if(!running||token!==generation)return;
    handle=null;
    if(!shouldRun()){stop();return;}
    const stamp=Number.isFinite(now)?now:last??0;
    const dt=last===null?0:Math.max(0,Math.min(maxDelta,(stamp-last)/1000));last=stamp;
    onFrame(stamp,dt);
    if(running&&token===generation)queue(token);
  });}
  function start(){if(running||!shouldRun())return;running=true;last=null;queue(++generation);}
  function stop(){running=false;generation++;last=null;if(handle!==null)cancel(handle);handle=null;}
  return {start,stop,get running(){return running;}};
}
