/** Let the loading message reach a real browser paint before synchronous WebGL work.
 * No timer or artificial delay: the second animation frame follows a paint opportunity.
 */
export function afterViewPaint(signal,{requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}={}){
 return new Promise((resolve,reject)=>{
  let frame=null,settled=false;
  const finish=error=>{if(settled)return;settled=true;if(frame!==null)cancelFrame?.(frame);signal?.removeEventListener('abort',abort);error?reject(error):resolve();};
  const abort=()=>finish(new Error('View preparation cancelled'));
  if(signal?.aborted){abort();return;}
  signal?.addEventListener('abort',abort,{once:true});
  if(typeof requestFrame!=='function'){finish();return;}
  frame=requestFrame(()=>{if(signal?.aborted){abort();return;}frame=requestFrame(()=>finish());});
 });
}
