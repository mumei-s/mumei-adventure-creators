// Protect only the noneditable game surface. Native action-button click handlers
// remain untouched; article dialogs and settings live outside this surface.
export const GAME_SURFACE='button,a,canvas,.place,.minimap,.move-pad,.look-pad,.nearby,footer';
export const EDITABLE_SURFACE='input,textarea,select,[contenteditable]:not([contenteditable="false"])';
export function protectGameSurface(root){
  const prevent=event=>{
    const target=event.target?.closest?event.target:event.target?.parentElement;
    if(!target||target.closest(EDITABLE_SURFACE))return;
    const surface=target.closest(GAME_SURFACE);
    if(surface&&root.contains(surface)&&event.cancelable)event.preventDefault();
  };
  for(const type of ['selectstart','dragstart','contextmenu'])root.addEventListener(type,prevent);
}

// Held movement is separate from native click actions such as the lantern.
// Track each pointer independently so releasing one finger cannot strand another.
export function bindHeldGameButton(button,{blocked=()=>false,onChange}){
  const pointers=new Set(),keys=new Set();let active=false;
  const update=()=>{const next=pointers.size>0||keys.size>0;if(next===active)return;active=next;button.classList.toggle('active',active);onChange(active);};
  const reset=()=>{pointers.clear();keys.clear();update();};
  button.addEventListener('pointerdown',event=>{
    if(blocked()||button.disabled||event.button>0)return;
    if(event.cancelable)event.preventDefault();
    // Preventing selection must not remove keyboard focusability.
    button.focus({preventScroll:true});
    try{button.setPointerCapture(event.pointerId);}catch{return;}
    pointers.add(event.pointerId);update();
  });
  const release=event=>{pointers.delete(event.pointerId);update();};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
  button.addEventListener('keydown',event=>{
    if(![' ','Enter'].includes(event.key)||blocked()||button.disabled)return;
    event.preventDefault();keys.add(event.key);update();
  });
  button.addEventListener('keyup',event=>{if(keys.delete(event.key)){event.preventDefault();update();}});
  // Keyup can go to a different element after Tab; never retain a keyboard hold.
  button.addEventListener('blur',()=>{keys.clear();update();});
  return {reset};
}
