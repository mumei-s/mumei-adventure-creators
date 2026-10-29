/** Visible viewport bridge for Safari chrome, keyboard, rotation and standalone mode.
 * Pinch zoom stays native: do not resize/reflow the page while the user magnifies it.
 */
export function viewportSnapshot(win, previous=null) {
  const layoutWidth=Math.max(1,Number(win.innerWidth)||win.document?.documentElement?.clientWidth||1);
  const layoutHeight=Math.max(1,Number(win.innerHeight)||win.document?.documentElement?.clientHeight||1);
  const visual=win.visualViewport;
  if(visual&&Number.isFinite(visual.scale)&&Math.abs(visual.scale-1)>.02&&previous)return previous;
  const useVisual=visual&&(!Number.isFinite(visual.scale)||Math.abs(visual.scale-1)<=.02)&&visual.width>0&&visual.height>0;
  const width=Math.round(useVisual?visual.width:layoutWidth),height=Math.round(useVisual?visual.height:layoutHeight);
  const left=useVisual?Math.max(0,Math.round(visual.offsetLeft)||0):0,top=useVisual?Math.max(0,Math.round(visual.offsetTop)||0):0;
  return {width,height,left,top,right:Math.max(0,layoutWidth-width-left),bottom:Math.max(0,layoutHeight-height-top),
    landscape:width>=560&&width>height&&height<=580,compact:width>=560&&height<=300,short:width>=560&&height<=480,tiny:width<560&&height<=440};
}
export function initViewport({window:win=globalThis.window,document:doc=globalThis.document,onChange=()=>{},onNativeZoom=()=>{}}={}) {
  if(!win||!doc?.documentElement)return {refresh(){},destroy(){}};
  const root=doc.documentElement;let previous=null,frame=null,destroyed=false,hint=null,wasNativeMagnified=false;
  const restoredTouch=new Map(),controlSelector='.direction-pad,.direction-pad button,.move-pad,.move-pad button,.look-pad,.look-pad button';
  const nativeMagnified=()=>Number(win.visualViewport?.scale)>1.02;
  const nativeTransition=zoomed=>{if(zoomed===wasNativeMagnified)return;wasNativeMagnified=zoomed;if(zoomed)onNativeZoom();};
  const updateNativeZoom=()=>{
    const visual=win.visualViewport,zoomed=nativeMagnified();nativeTransition(zoomed);root.dataset.nativeMagnified=String(zoomed);
    if(zoomed){
      // Canvas gesture bindings own their inline touch-action. Only override the
      // thumb controls here; saving a canvas value during its own transition
      // could restore stale native mode after returning to 1x.
      for(const node of doc.querySelectorAll?.(controlSelector)||[]){
        if(!restoredTouch.has(node))restoredTouch.set(node,[node.style.getPropertyValue('touch-action'),node.style.getPropertyPriority?.('touch-action')||'']);
        node.style.setProperty('touch-action','pan-x pan-y pinch-zoom','important');
      }
      if(!hint&&doc.createElement&&doc.body?.append){
        hint=doc.createElement('div');hint.dataset.nativeZoomHint='true';hint.textContent='画面を戻す：2本指で縮小';
        Object.assign(hint.style,{position:'absolute',zIndex:'2147483646',padding:'6px 10px',border:'1px solid #d8bf89',borderRadius:'14px',background:'#142c38ed',color:'#fff0cc',font:'14px sans-serif',lineHeight:'1.4',pointerEvents:'none',textAlign:'center',whiteSpace:'nowrap',transformOrigin:'top center'});doc.body.append(hint);
      }
      if(hint){const scale=Number(visual.scale)||1;hint.hidden=false;hint.style.left=`${(win.scrollX||0)+(visual.offsetLeft||0)+visual.width/2}px`;hint.style.top=`${(win.scrollY||0)+(visual.offsetTop||0)+10/scale}px`;hint.style.transform=`translateX(-50%) scale(${1/scale})`;}
    }else{
      for(const [node,[value,priority]]of restoredTouch){if(value)node.style.setProperty('touch-action',value,priority);else node.style.removeProperty('touch-action');}restoredTouch.clear();if(hint)hint.hidden=true;
    }
  };
  const passNativeGesture=event=>{
    if(event.pointerType!=='touch')return;
    const zoomed=nativeMagnified();nativeTransition(zoomed);if(!zoomed)return;
    const target=event.target?.closest?event.target:event.target?.parentElement;
    // Canvas bindings track the native finger pair themselves, including the
    // last release after scale returns to 1. Do not intercept that bookkeeping.
    if(target?.closest?.('.direction-pad,.move-pad,.look-pad'))event.stopImmediatePropagation?.();
    // Deliberately no preventDefault: page pinch and panning belong to browser.
  };
  for(const type of ['pointerdown','pointermove','pointerup'])doc.addEventListener?.(type,passNativeGesture,{capture:true,passive:true});
  const update=()=>{frame=null;if(destroyed)return;updateNativeZoom();const next=viewportSnapshot(win,previous);
    if(previous&&JSON.stringify(next)===JSON.stringify(previous))return;
    previous=next;
    for(const key of ['width','height','left','top','right','bottom'])root.style.setProperty(`--app-viewport-${key}`,`${next[key]}px`);
    root.dataset.viewportLandscape=String(next.landscape);root.dataset.viewportCompact=String(next.compact);root.dataset.viewportShort=String(next.short);root.dataset.viewportTiny=String(next.tiny);
    // Resize canvas backing buffers after these CSS values have affected layout.
    onChange(next);
  };
  const schedule=()=>{if(frame===null&&!destroyed)frame=win.requestAnimationFrame(update);};
  for(const type of ['resize','orientationchange','pageshow'])win.addEventListener(type,schedule);
  win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);
  update();
  return {refresh:schedule,destroy(){destroyed=true;if(frame!==null)win.cancelAnimationFrame(frame);for(const type of ['resize','orientationchange','pageshow'])win.removeEventListener(type,schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);for(const type of ['pointerdown','pointermove','pointerup'])doc.removeEventListener?.(type,passNativeGesture,{capture:true});for(const [node,[value,priority]]of restoredTouch){if(value)node.style.setProperty('touch-action',value,priority);else node.style.removeProperty('touch-action');}restoredTouch.clear();hint?.remove();delete root.dataset.nativeMagnified;}};
}
