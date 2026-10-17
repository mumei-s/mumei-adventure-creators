/** Explicit page refresh. Never clears storage, bypasses caches, or starts a boot loop. */
export function createSafeReload({save=()=>true,beforeReload=()=>{},reload=()=>globalThis.location.reload(),onState=()=>{}}={}){
 let busy=false;
 return {get busy(){return busy},async run(){
  if(busy)return false;
  busy=true;onState({busy:true,message:'記録を保存しています…'});
  try{
   const result=await save();
   if(result!==true&&result?.ok!==true)throw new Error(result?.notice||'保存できませんでした。今の画面を残しています。');
   await beforeReload();
   onState({busy:true,message:'再読み込みしています…'});
   await reload();
   return true;
  }catch(error){busy=false;onState({busy:false,message:error?.message||'再読み込みできませんでした。今の画面を残しています。'});return false;}
 }};
}
export function createReloadControl(options={}){
 const doc=options.document||document,element=doc.createElement('section'),button=doc.createElement('button'),status=doc.createElement('p');
 element.className='page-reload-control';button.type='button';button.textContent='再読み込み';button.style.minHeight='44px';button.style.minWidth='44px';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.hidden=true;
 const controller=createSafeReload({...options,onState(state){button.disabled=state.busy;status.textContent=state.message;status.hidden=false;options.onState?.(state);}});
 button.addEventListener('click',()=>{void controller.run()});element.append(button,status);
 return {element,button,status,controller};
}
