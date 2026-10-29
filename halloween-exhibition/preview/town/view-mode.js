import {afterViewPaint} from '../view-paint.js?v=20261024-viewpoints1';
import {withDeadline} from '../transition-effects.js?v=20261016-living1';

const FAILURE_MESSAGES=Object.freeze({
 'webgl-unavailable':'この端末またはブラウザーで選んだ視点の描画を開始できませんでした。視点を再試行できます。',
 'context-lost':'選んだ視点の描画が中断されました。再試行すると同じ場所から再開できます。',
 'assets-unavailable':'選んだ視点の住民画像を準備できませんでした。見下ろしで続けるか、再試行できます。',
 'assets-timeout':'選んだ視点の画像準備が時間切れになりました。見下ろしで続けるか、再試行できます。',
 'assets-invalid':'選んだ視点の住民画像を確認できませんでした。見下ろしで続けるか、再試行できます。',
 'module-unavailable':'選んだ視点の表示データを読み込めませんでした。ページを読み込み直してから、もう一度お試しください。',
 timeout:'選んだ視点の準備が時間内に終わりませんでした。通信を確認して、視点を再試行してください。',
 'render-failed':'選んだ視点の表示を続けられませんでした。視点を再試行してください。',
 'load-failed':'視点を開始できませんでした。視点を再試行してください。',
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
 return Object.freeze({code,message:FAILURE_MESSAGES[code],retryable:code!=='module-unavailable',requiresReload:code==='module-unavailable'});
}

/** Keep the playable Canvas scene until a current WebGL request is ready. */
export function createTownViewController({load,onChange=()=>{},timeout=35000,timers=globalThis,beforeLoad=afterViewPaint}={}){
 let desired='2d',active='2d',status='idle',view=null,pending=null,generation=0,disposed=false,failure=null,attempt=0;
 const snapshot=()=>({desired,active,status,view,failure,attempt,failureReason:failure?.message||''});
 const emit=()=>{if(!disposed)onChange(snapshot());};
 function clearView(){const old=view;view=null;old?.destroy?.();}
 function cancel(){generation++;pending?.abort();pending=null;}
 function fail(request,error,phase='render'){if(disposed||request!==generation)return;cancel();clearView();active='2d';status=desired==='2d'?'idle':'failed';failure=status==='failed'?classifyTown3DFailure(error,{phase}):null;emit();}
 async function setMode(mode,{retry=false,suspend=false}={}){
  if(disposed)return snapshot();
  // History suspension hides the renderer without changing the user's choice
  // or erasing a failure that requires an explicit retry on return.
  if(suspend){cancel();active='2d';if(status!=='failed')status='idle';emit();return snapshot();}
  const next=mode==='3d'?'3d':'2d';
  if(next==='3d'&&desired==='3d'&&status==='failed'&&!retry)return snapshot();
  desired=next;
  if(desired==='2d'){cancel();active='2d';status='idle';failure=null;emit();return snapshot();}
  if(view&&!retry){active='3d';status='ready';failure=null;emit();return snapshot();}
  if(pending&&!retry){emit();return snapshot();}
  cancel();clearView();const request=generation,abort=new AbortController();pending=abort;
  active='2d';status='loading';failure=null;attempt++;emit();let candidate=null,released=false;
  const release=()=>{if(candidate&&!released){released=true;candidate.destroy?.();}};
  const operation=Promise.resolve().then(()=>beforeLoad(abort.signal)).then(()=>{
   if(disposed||request!==generation||abort.signal.aborted)throw Error('Old town view request');
   return load({signal:abort.signal,onContextLost:error=>fail(candidate&&view===candidate?generation:request,error,'context')});
  }).then(async next=>{
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
