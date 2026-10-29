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
function releaseCapture(element,pointerId){
  // Resetting for a dialog, rotation or page suspension must also release the
  // browser's capture, even if no final pointerup arrives on iPhone/iPad.
  try{if(element.hasPointerCapture?.(pointerId)!==false)element.releasePointerCapture?.(pointerId);}catch{}
}
export function bindHeldGameButton(button,{blocked=()=>false,onChange,pointer=true}){
  const pointers=new Set(),keys=new Set();let active=false;
  const update=()=>{const next=pointers.size>0||keys.size>0;if(next===active)return;active=next;button.classList.toggle('active',active);onChange(active);};
  const reset=()=>{const captured=[...pointers];pointers.clear();keys.clear();update();for(const id of captured)releaseCapture(button,id);};
  if(pointer)button.addEventListener('pointerdown',event=>{
    if(blocked()||button.disabled||event.button>0)return;
    if(event.cancelable)event.preventDefault();
    // Preventing selection must not remove keyboard focusability.
    button.focus({preventScroll:true});
    try{button.setPointerCapture(event.pointerId);}catch{return;}
    pointers.add(event.pointerId);update();
  });
  const release=event=>{if(!pointers.delete(event.pointerId))return;update();releaseCapture(button,event.pointerId);};
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
export function directionAtPoint(x,y,width,height,previous=null){
  const dx=x-width/2,dy=y-height/2,r=Math.max(1,Math.min(width,height)/2);
  if(Math.hypot(dx,dy)<r*.16)return null;
  // A small sector hysteresis prevents diagonal finger jitter from fighting turns.
  if(previous==='left'&&dx<0&&Math.abs(dx)*1.22>=Math.abs(dy))return previous;
  if(previous==='right'&&dx>0&&Math.abs(dx)*1.22>=Math.abs(dy))return previous;
  if(previous==='forward'&&dy<0&&Math.abs(dy)*1.22>=Math.abs(dx))return previous;
  if(previous==='back'&&dy>0&&Math.abs(dy)*1.22>=Math.abs(dx))return previous;
  return Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'back':'forward';
}
export function bindDirectionPad(pad,{blocked=()=>false,onChange,mode='fixed'}){
  let pointerId=null,direction=null,anchor=null,dragged=false,pressMode='fixed';
  const listeners=[];
  const listen=(target,type,handler)=>{if(!target?.addEventListener)return;target.addEventListener(type,handler);listeners.push(()=>target.removeEventListener?.(type,handler));};
  const selectedMode=()=>{try{return (typeof mode==='function'?mode():mode)==='slide'?'slide':'fixed';}catch{return 'fixed';}};
  const slideRadius=rect=>Math.max(20,Math.min(36,Math.min(rect.width,rect.height)*.24));
  const setDirection=next=>{if(next===direction)return;direction=next;onChange(direction);};
  const visual=(event,rect)=>{
    const dx=event.clientX-rect.left-rect.width/2,dy=event.clientY-rect.top-rect.height/2,length=Math.hypot(dx,dy)||1,scale=Math.min(1,Math.min(rect.width,rect.height)*.3/length);
    pad.style.setProperty('--pad-x',`${dx*scale}px`);pad.style.setProperty('--pad-y',`${dy*scale}px`);
    const ax=(anchor?.x??event.clientX)-rect.left-rect.width/2,ay=(anchor?.y??event.clientY)-rect.top-rect.height/2,al=Math.hypot(ax,ay)||1,as=Math.min(1,Math.min(rect.width,rect.height)*.3/al);
    pad.style.setProperty('--pad-anchor-x',`${ax*as}px`);pad.style.setProperty('--pad-anchor-y',`${ay*as}px`);pad.dataset.direction=direction||'';
  };
  const update=event=>{
    const rect=pad.getBoundingClientRect();
    if(pressMode==='slide'){
      let dx=event.clientX-anchor.x,dy=event.clientY-anchor.y;const length=Math.hypot(dx,dy),radius=slideRadius(rect),deadZone=Math.max(5,Math.min(9,Math.min(rect.width,rect.height)*.055));
      // Follow an overextended thumb. Reversing direction then needs only a short
      // slide, even after the captured finger has drifted outside the pad.
      if(length>radius){anchor.x=event.clientX-dx/length*radius;anchor.y=event.clientY-dy/length*radius;dx=event.clientX-anchor.x;dy=event.clientY-anchor.y;}
      if(length>=deadZone)dragged=true;
      if(dragged)setDirection(Math.hypot(dx,dy)<deadZone?null:directionAtPoint(dx+radius,dy+radius,radius*2,radius*2,direction));
    }else setDirection(directionAtPoint(event.clientX-rect.left,event.clientY-rect.top,rect.width,rect.height,direction));
    visual(event,rect);
  };
  const refresh=()=>{pad.dataset.padMode=selectedMode();};
  const reset=()=>{
    const captured=pointerId;pointerId=null;anchor=null;dragged=false;direction=null;onChange(null);pad.dataset.padActive='false';
    for(const name of ['--pad-x','--pad-y','--pad-anchor-x','--pad-anchor-y'])pad.style.setProperty(name,'0px');
    pad.dataset.direction='';refresh();if(captured!==null)releaseCapture(pad,captured);
  };
  listen(pad,'pointerdown',event=>{
    if(blocked()||event.button>0||pointerId!==null)return;if(event.cancelable)event.preventDefault();
    const button=event.target.closest?.('button');if(button?.disabled)return;button?.focus({preventScroll:true});
    try{pad.setPointerCapture(event.pointerId);}catch{return;}
    pointerId=event.pointerId;pressMode=selectedMode();pad.dataset.padMode=pressMode;pad.dataset.padActive='true';
    anchor={x:event.clientX,y:event.clientY};dragged=false;
    if(pressMode==='slide'){
      const rect=pad.getBoundingClientRect(),requested=button?.dataset?.move;
      const initial=['forward','back','left','right'].includes(requested)?requested:directionAtPoint(event.clientX-rect.left,event.clientY-rect.top,rect.width,rect.height);
      setDirection(initial);
      // An arrow starts already held in its labelled direction. Preload that
      // vector so normal sideways thumb drift cannot immediately turn the
      // camera. A neutral centre touch keeps the original free-slide origin.
      if(initial){const [dx,dy]={forward:[0,-1],back:[0,1],left:[-1,0],right:[1,0]}[initial],radius=slideRadius(rect);anchor.x-=dx*radius;anchor.y-=dy*radius;}
      visual(event,rect);
    }else update(event);
  });
  listen(pad,'pointermove',event=>{if(event.pointerId!==pointerId)return;if(event.cancelable)event.preventDefault();if(blocked()){reset();return;}update(event);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(pad,type,event=>{if(event.pointerId===pointerId)reset();});
  const lifecycleWindow=pad.ownerDocument?.defaultView||globalThis.window,lifecycleDocument=pad.ownerDocument||lifecycleWindow?.document;
  for(const type of ['blur','pagehide','orientationchange'])listen(lifecycleWindow,type,reset);
  listen(lifecycleDocument,'visibilitychange',()=>{if(lifecycleDocument.hidden)reset();});
  refresh();
  return {reset,refresh,isActive:()=>pointerId!==null,destroy(){reset();for(const remove of listeners)remove();}};
}
