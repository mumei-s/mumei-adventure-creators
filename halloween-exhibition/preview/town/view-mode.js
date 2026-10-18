import {withDeadline} from '../transition-effects.js?v=20261016-living1';

const FAILURE_MESSAGES=Object.freeze({
 'webgl-unavailable':'この端末またはブラウザーで3D描画を開始できませんでした。ほかのタブを閉じてから、3Dを再試行してください。',
 'context-lost':'端末の3D描画が中断されました。3Dを再試行すると、同じ場所から再開できます。',
 'assets-unavailable':'3Dの画像を読み込めませんでした。通信を確認して、3Dを再試行してください。',
 'module-unavailable':'3Dの表示データを読み込めませんでした。ページを読み込み直してから、もう一度お試しください。',
 timeout:'3Dの準備が時間内に終わりませんでした。通信を確認して、3Dを再試行してください。',
 'render-failed':'3Dの表示を続けられませんでした。3Dを再試行してください。',
 'load-failed':'3Dを開始できませんでした。3Dを再試行してください。',
});

/** Report a useful reason without exposing stack traces or mistaking a failed load for missing 3D support. */
export function classifyTown3DFailure(error,{phase='load'}={}){
 const message=String(error?.message||error||''),explicit=String(error?.code||'').toLowerCase().replaceAll('_','-');let code;
 if(Object.hasOwn(FAILURE_MESSAGES,explicit))code=explicit;
 else if(phase==='context'||/context.?lost/i.test(message))code='context-lost';
 else if(/webgl|no gpu|gpu allocation|graphics context|gl context/i.test(message))code='webgl-unavailable';
 else if(/resident art|required character|art image|image.*(?:failed|unavailable|timed out|could not)|texture.*(?:failed|unavailable)/i.test(message))code='assets-unavailable';
 else if(/dynamically imported module|dynamic import|module script|loading module|town renderer unavailable|failed to fetch/i.test(message))code='module-unavailable';
 else if(/deadline|timed? out|timeout/i.test(message))code='timeout';
 else code=phase==='render'?'render-failed':'load-failed';
 return Object.freeze({code,message:FAILURE_MESSAGES[code],retryable:true});
}

/** Keep the playable Canvas scene until a current WebGL request is ready. */
export function createTownViewController({load,onChange=()=>{},timeout=20000,timers=globalThis}={}){
 let desired='2d',active='2d',status='idle',view=null,pending=null,generation=0,disposed=false,failure=null;
 const snapshot=()=>({desired,active,status,view,failure,failureReason:failure?.message||''});
 const emit=()=>{if(!disposed)onChange(snapshot());};
 function clearView(){const old=view;view=null;old?.destroy?.();}
 function cancel(){generation++;pending?.abort();pending=null;}
 function fail(request,error,phase='render'){if(disposed||request!==generation)return;cancel();clearView();active='2d';status=desired==='2d'?'idle':'failed';failure=status==='failed'?classifyTown3DFailure(error,{phase}):null;emit();}
 async function setMode(mode,{retry=false}={}){
  if(disposed)return snapshot();desired=mode==='3d'?'3d':'2d';
  if(desired==='2d'){cancel();active='2d';status='idle';failure=null;emit();return snapshot();}
  if(view&&!retry){active='3d';status='ready';failure=null;emit();return snapshot();}
  if(pending&&!retry)return snapshot();
  cancel();clearView();const request=generation,abort=new AbortController();pending=abort;
  active='2d';status='loading';failure=null;emit();let candidate=null,released=false;
  const release=()=>{if(candidate&&!released){released=true;candidate.destroy?.();}};
  const operation=Promise.resolve().then(()=>load({signal:abort.signal,onContextLost:error=>fail(candidate&&view===candidate?generation:request,error,'context')})).then(async next=>{
   candidate=next;
   if(disposed||request!==generation||abort.signal.aborted){release();throw Error('Old town view request');}
   await next.ready;
   if(disposed||request!==generation||abort.signal.aborted){release();throw Error('Old town view request');}
   return next;
  });
  try{
   const next=await withDeadline(operation,{timeout,timers,signal:abort.signal});
   if(disposed||request!==generation){release();return snapshot();}
   pending=null;view=next;active='3d';status='ready';failure=null;emit();
  }catch(error){
   release();
   if(!disposed&&request===generation){pending=null;abort.abort();generation++;active='2d';status='failed';failure=classifyTown3DFailure(error);emit();}
  }
  return snapshot();
 }
 return {snapshot,setMode,reportFailure:error=>fail(generation,error),destroy(){if(disposed)return;disposed=true;cancel();clearView();}};
}
