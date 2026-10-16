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
export function initViewport({window:win=globalThis.window,document:doc=globalThis.document,onChange=()=>{}}={}) {
  if(!win||!doc?.documentElement)return {refresh(){},destroy(){}};
  const root=doc.documentElement;let previous=null,frame=null,destroyed=false;
  const update=()=>{frame=null;if(destroyed)return;const next=viewportSnapshot(win,previous);
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
  return {refresh:schedule,destroy(){destroyed=true;if(frame!==null)win.cancelAnimationFrame(frame);for(const type of ['resize','orientationchange','pageshow'])win.removeEventListener(type,schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);}};
}
