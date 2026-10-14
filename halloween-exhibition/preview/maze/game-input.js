// Protect only the noneditable game surface. Native action-button click handlers
// remain untouched; article dialogs and settings live outside this surface.
export const GAME_SURFACE='button,a,canvas,.place,.minimap,.move-pad,.look-pad,.nearby,footer,.encounter-help,#pad-mode-hint';
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
export function bindHeldGameButton(button,{blocked=()=>false,onChange,pointer=true}){
  const pointers=new Set(),keys=new Set();let active=false;
  const update=()=>{const next=pointers.size>0||keys.size>0;if(next===active)return;active=next;button.classList.toggle('active',active);onChange(active);};
  const reset=()=>{pointers.clear();keys.clear();update();};
  if(pointer)button.addEventListener('pointerdown',event=>{
    if(blocked()||button.disabled||event.button>0)return;
    if(event.cancelable)event.preventDefault();
    // Preventing selection must not remove keyboard focusability.
    button.focus({preventScroll:true});
    try{button.setPointerCapture(event.pointerId);}catch{return;}
    pointers.add(event.pointerId);update();
  });
  const release=event=>{pointers.delete(event.pointerId);update();};
  if(pointer)for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
  button.addEventListener('keydown',event=>{
    if(![' ','Enter'].includes(event.key)||blocked()||button.disabled)return;
    event.preventDefault();keys.add(event.key);update();
  });
  button.addEventListener('keyup',event=>{if(keys.delete(event.key)){event.preventDefault();update();}});
  // Keyup can go to a different element after Tab; never retain a keyboard hold.
  button.addEventListener('blur',()=>{keys.clear();update();});
  return {reset};
}

// One continuous drag may change direction without lifting the finger.
export function directionAtPoint(x,y,width,height){
  const dx=x-width/2,dy=y-height/2,r=Math.max(1,Math.min(width,height)/2);
  if(Math.hypot(dx,dy)<r*.24)return null;
  return Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'back':'forward';
}
export function bindDirectionPad(pad,{blocked=()=>false,onChange}){
  let pointerId=null,direction=null;
  const update=event=>{const rect=pad.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    const next=directionAtPoint(x,y,rect.width,rect.height);if(next!==direction){direction=next;onChange(direction);}
    const dx=x-rect.width/2,dy=y-rect.height/2,length=Math.hypot(dx,dy)||1,scale=Math.min(1,rect.width*.24/length);
    pad.style.setProperty('--pad-x',`${dx*scale}px`);pad.style.setProperty('--pad-y',`${dy*scale}px`);pad.dataset.direction=direction||'';
  };
  const reset=()=>{pointerId=null;direction=null;onChange(null);pad.style.setProperty('--pad-x','0px');pad.style.setProperty('--pad-y','0px');pad.dataset.direction='';};
  pad.addEventListener('pointerdown',event=>{if(blocked()||event.button>0||pointerId!==null)return;if(event.cancelable)event.preventDefault();
    event.target.closest?.('button')?.focus({preventScroll:true});try{pad.setPointerCapture(event.pointerId);}catch{return;}pointerId=event.pointerId;update(event);
  });
  pad.addEventListener('pointermove',event=>{if(event.pointerId!==pointerId)return;if(event.cancelable)event.preventDefault();if(blocked()){reset();return;}update(event);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,event=>{if(event.pointerId===pointerId)reset();});
  return {reset};
}
