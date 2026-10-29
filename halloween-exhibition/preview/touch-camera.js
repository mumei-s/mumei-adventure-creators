export const TOUCH_ZOOM_MIN=.65;
export const TOUCH_ZOOM_MAX=1.4;
export function normalizeTouchZoom(value,{min=TOUCH_ZOOM_MIN,max=TOUCH_ZOOM_MAX}={}){return typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):1;}

// Scene-local two-finger zoom. The first finger retains the normal tap/look
// behavior until a second scene finger arrives. HUD buttons never enter the pair.
export function bindPinchZoom(surface,{blocked=()=>false,getZoom=()=>1,onChange,onStart=()=>{},onEnd=()=>{},min=TOUCH_ZOOM_MIN,max=TOUCH_ZOOM_MAX}={}){
  const pointers=new Map(),nativePointers=new Set(),consumedEvents=new WeakSet(),listeners=[];
  const lifecycleWindow=surface.ownerDocument?.defaultView||globalThis.window,lifecycleDocument=surface.ownerDocument||lifecycleWindow?.document;
  let active=false,pair=null,startSpan=1,startZoom=1,starting=false,destroyed=false,nativeMode=false;
  const previousTouchAction=surface.style?.getPropertyValue?.('touch-action')||'';
  surface.style?.setProperty('touch-action','none');if(surface.dataset)surface.dataset.gameCamera='true';
  const listen=(target,type,handler,options)=>{if(!target?.addEventListener)return;target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener?.(type,handler,options));};
  const release=id=>{try{if(surface.hasPointerCapture?.(id)!==false)surface.releasePointerCapture?.(id);}catch{}};
  const consume=event=>{consumedEvents.add(event);if(event.cancelable)event.preventDefault();if(event.stopImmediatePropagation)event.stopImmediatePropagation();else event.stopPropagation?.();};
  const reset=()=>{
    // Existing app clearInput() may reset every binding from onStart(). It must
    // clear the old single-finger tap/look without erasing this incoming pair.
    if(starting)return;
    const captured=[...pointers.keys()],wasActive=active;pointers.clear();active=false;pair=null;
    if(surface.dataset)surface.dataset.pinchActive='false';for(const id of captured)release(id);if(wasActive)onEnd();
  };
  const magnified=()=>Number(lifecycleWindow?.visualViewport?.scale)>1.02;
  const syncNative=()=>{
    const next=magnified()||nativePointers.size>0;if(next===nativeMode)return;
    nativeMode=next;
    surface.style?.setProperty('touch-action',next?'pan-x pan-y pinch-zoom':'none');
    if(surface.dataset)surface.dataset.nativeZoom=String(next);
    if(next)reset();
  };
  // The page can be magnified from its HUD while the canvas owns game pinch.
  // Hand that next gesture back to the browser, without preventing its default
  // or letting the remaining finger turn into a camera drag on the way to 1x.
  const nativeEvent=(event,ending=false)=>{
    syncNative();if(!nativeMode&&!nativePointers.has(event.pointerId))return false;
    if(event.type==='pointerdown')nativePointers.add(event.pointerId);
    if(ending)nativePointers.delete(event.pointerId);
    consumedEvents.add(event);event.stopImmediatePropagation?.();syncNative();return true;
  };
  const span=()=>{if(!pair)return 0;const a=pointers.get(pair[0]),b=pointers.get(pair[1]);return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;};
  const begin=()=>{
    pair=[...pointers.keys()].slice(0,2);startSpan=span();startZoom=normalizeTouchZoom(getZoom(),{min,max});active=true;starting=true;
    if(surface.dataset)surface.dataset.pinchActive='true';
    try{onStart();}catch{starting=false;reset();return;}
    // onStart clears a previous single-finger capture. Reacquire both pointers
    // only after that cleanup has completed, including its capture-loss events.
    try{for(const id of pointers.keys())surface.setPointerCapture?.(id);}catch{starting=false;reset();return;}
    starting=false;
  };
  const update=()=>{
    if(!pair)return;const distance=span();
    // Coincident fingers establish a baseline only after separating, avoiding a
    // jump to maximum magnification from a near-zero initial distance.
    if(startSpan<12){if(distance>=12){startSpan=distance;startZoom=normalizeTouchZoom(getZoom(),{min,max});}return;}
    onChange?.(normalizeTouchZoom(startZoom*distance/startSpan,{min,max}));
  };
  const sourceAllowed=event=>{
    if(event.target!==surface&&!surface.contains?.(event.target))return false;
    return !event.target?.closest?.('button,a,input,textarea,select,[contenteditable],.move-pad,.direction-pad,.look-pad,.nearby');
  };
  listen(surface,'pointerdown',event=>{
    if(destroyed||event.pointerType!=='touch'||event.button>0||!sourceAllowed(event))return;
    if(nativeEvent(event))return;
    if(blocked()){reset();return;}
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(active){try{surface.setPointerCapture?.(event.pointerId);}catch{}consume(event);return;}
    if(pointers.size===2){begin();consume(event);}
  },{capture:true,passive:false});
  listen(surface,'pointermove',event=>{
    if(event.pointerType==='touch'&&nativeEvent(event))return;
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(!active)return;
    consume(event);if(blocked()){reset();return;}update();
  },{capture:true,passive:false});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(surface,type,event=>{
    if(event.pointerType==='touch'&&nativeEvent(event,true))return;
    if(starting||!pointers.has(event.pointerId))return;
    // A queued loss from the old one-finger handler can arrive after the same
    // scene surface has reacquired the pointer for the pinch.
    if(type==='lostpointercapture'&&surface.hasPointerCapture?.(event.pointerId))return;
    if(active)consume(event);
    if(type!=='pointerup'){reset();return;}
    pointers.delete(event.pointerId);if(pair?.includes(event.pointerId))pair=null;if(active)release(event.pointerId);
    // Suppress the remaining finger through its release; it cannot become a tap
    // or camera drag after the pinch has ended.
    if(!pointers.size)reset();
  },{capture:true,passive:false});
  const resetLifecycle=()=>{reset();nativePointers.clear();syncNative();};
  for(const type of ['blur','pagehide','orientationchange'])listen(lifecycleWindow,type,resetLifecycle);
  listen(lifecycleDocument,'visibilitychange',()=>{if(lifecycleDocument.hidden)resetLifecycle();});
  listen(lifecycleWindow?.visualViewport,'resize',syncNative,{passive:true});listen(lifecycleWindow?.visualViewport,'scroll',syncNative,{passive:true});syncNative();
  return {
    reset,isActive:()=>active,
    consumesPointer:eventOrId=>typeof eventOrId==='object'&&eventOrId!==null?consumedEvents.has(eventOrId)||active&&pointers.has(eventOrId.pointerId):active&&pointers.has(eventOrId),
    destroy(){reset();nativePointers.clear();destroyed=true;for(const remove of listeners)remove();if(surface.dataset){delete surface.dataset.gameCamera;delete surface.dataset.pinchActive;delete surface.dataset.nativeZoom;}if(previousTouchAction)surface.style?.setProperty('touch-action',previousTouchAction);else surface.style?.removeProperty?.('touch-action');}
  };
}
