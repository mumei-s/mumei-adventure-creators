import {withDeadline} from '../transition-effects.js?v=20261016-living1';

/** Keep the playable Canvas scene until a current WebGL request is ready. */
export function createTownViewController({load,onChange=()=>{},timeout=20000,timers=globalThis}={}){
 let desired='2d',active='2d',status='idle',view=null,pending=null,generation=0,disposed=false;
 const snapshot=()=>({desired,active,status,view});
 const emit=()=>{if(!disposed)onChange(snapshot());};
 function clearView(){const old=view;view=null;old?.destroy?.();}
 function cancel(){generation++;pending?.abort();pending=null;}
 function fail(request){if(disposed||request!==generation)return;cancel();clearView();active='2d';status='failed';emit();}
 async function setMode(mode,{retry=false}={}){
  if(disposed)return snapshot();desired=mode==='3d'?'3d':'2d';
  if(desired==='2d'){cancel();active='2d';status='idle';emit();return snapshot();}
  if(view&&!retry){active='3d';status='ready';emit();return snapshot();}
  if(pending&&!retry)return snapshot();
  cancel();clearView();const request=generation,abort=new AbortController();pending=abort;
  active='2d';status='loading';emit();let candidate=null,released=false;
  const release=()=>{if(candidate&&!released){released=true;candidate.destroy?.();}};
  const operation=Promise.resolve().then(()=>load({signal:abort.signal,onContextLost:()=>fail(candidate&&view===candidate?generation:request)})).then(async next=>{
   candidate=next;
   if(disposed||request!==generation||abort.signal.aborted){release();throw Error('Old town view request');}
   await next.ready;
   if(disposed||request!==generation||abort.signal.aborted){release();throw Error('Old town view request');}
   return next;
  });
  try{
   const next=await withDeadline(operation,{timeout,timers,signal:abort.signal});
   if(disposed||request!==generation){release();return snapshot();}
   pending=null;view=next;active='3d';status='ready';emit();
  }catch{
   release();
   if(!disposed&&request===generation){pending=null;abort.abort();generation++;active='2d';status='failed';emit();}
  }
  return snapshot();
 }
 return {snapshot,setMode,reportFailure:()=>fail(generation),destroy(){if(disposed)return;disposed=true;cancel();clearView();}};
}
