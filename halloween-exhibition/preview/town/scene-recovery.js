/** Pause a failed scene without closing its dialogue/battle or replacing its save. */
export function createTownSceneRecovery({document:doc=globalThis.document,onPause=()=>{},onRetry=()=>{},onExit=()=>{},onError=error=>console.warn('Town frame interrupted',error)}={}){
 let blocked=false,dialog=null,retry=null,returnFocus=null;
 function show(){
  if(!dialog){
   dialog=doc.createElement('dialog');dialog.id='town-recovery';dialog.setAttribute('aria-labelledby','town-recovery-title');dialog.setAttribute('aria-describedby','town-recovery-message');
   const title=doc.createElement('h2');title.id='town-recovery-title';title.textContent='街の表示を一時停止しました';
   const message=doc.createElement('p');message.id='town-recovery-message';message.textContent='描画を続けられませんでした。現在地と進行はこの画面に保持しています。もう一度表示を試せます。';
   retry=doc.createElement('button');retry.type='button';retry.textContent='同じ場所から表示を再試行';retry.onclick=resume;
   const exit=doc.createElement('a');exit.className='button-link';exit.href='../?return=palace';exit.textContent='城へ戻る';exit.onclick=onExit;
   dialog.append(title,message,retry,exit);dialog.addEventListener('cancel',event=>event.preventDefault());doc.body.append(dialog);
  }
  if(!dialog.open)dialog.showModal();retry.disabled=false;try{retry.focus({preventScroll:true});}catch{}
 }
 function report(error){
  if(blocked)return;blocked=true;returnFocus=doc.activeElement;
  // Failure reporting is not allowed to hide the recovery action. Audio,
  // focus and diagnostic callbacks may themselves be unavailable.
  try{onPause();}catch(pauseError){try{onError(pauseError);}catch{}}
  try{onError(error);}catch{}show();
 }
 function resume(){
  if(!blocked)return;retry.disabled=true;blocked=false;dialog.close();
  try{returnFocus?.focus?.({preventScroll:true});}catch{}
  // The caller schedules one owned RAF chain. Never spin or retry here when
  // the next frame fails; that failure requires another explicit button press.
  try{onRetry();}catch(error){report(error);}
 }
 return {report,retry:resume,get blocked(){return blocked;}};
}
