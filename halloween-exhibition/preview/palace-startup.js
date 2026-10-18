/** Wait for the actual painted castle, not just archive JSON. The embedded preview
 * remains visible if the full image fails, and the gate never stays locked forever. */
export function settlePalaceImage(image, {timeout=8000, timers=globalThis}={}) {
 return new Promise(resolve=>{
  if(!image){resolve('fallback');return;}
  let done=false, timer;
  const finish=value=>{if(done)return;done=true;timers.clearTimeout(timer);image.removeEventListener?.('load',loaded);image.removeEventListener?.('error',failed);resolve(value);};
  const loaded=()=>{if(!image.naturalWidth){finish('fallback');return;}if(typeof image.decode==='function')image.decode().then(()=>finish('ready'),()=>finish('ready'));else finish('ready');};
  const failed=()=>{image.style&&(image.style.visibility='hidden');finish('fallback');};
  image.addEventListener?.('load',loaded);image.addEventListener?.('error',failed);
  // A slow image may still finish later. Never permanently hide it on a deadline.
  timer=timers.setTimeout(()=>finish('fallback'),timeout);
  if(image.complete)image.naturalWidth?loaded():failed();
 });
}
/** Choose the painting by the visible scene, including a tall, wide viewport. */
export function palaceSceneFormat(width,height) {
 return Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0&&width/height<=1.1?'portrait':'landscape';
}
export function initPalaceStartup(root) {
 const doc=root.ownerDocument, image=doc.getElementById('palace-image'), header=root.querySelector('.masthead');
 const palace=doc.getElementById('palace-entrance');
 const syncHeight=()=>{
  if(header)root.style.setProperty('--palace-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
  const rect=palace?.getBoundingClientRect();if(!rect?.width||!rect?.height)return;
  const format=palaceSceneFormat(rect.width,rect.height);root.dataset.palaceFormat=format;
  const source=image?.parentElement?.querySelector('source'),media=format==='portrait'?'all':'not all';
  if(source&&source.media!==media)source.media=media;
 };
 syncHeight();
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(syncHeight);if(header)observer.observe(header);observer.observe(root);if(palace)observer.observe(palace);}
 const gateTexture=new Image();gateTexture.src=root.dataset.palaceFormat==='portrait'?'./assets/palace/gate-phone.webp':'./assets/palace/gate-desktop.webp';
 return Promise.all([settlePalaceImage(image),settlePalaceImage(gateTexture)]).then(results=>{
  const fallback=results.includes('fallback');root.dataset.palaceReady=fallback?'fallback':'ready';
  const status=doc.getElementById('palace-load-status');
  if(status){status.textContent='';status.hidden=true;} // A ready embedded castle is a valid display, not a persistent warning.
  // Optional illustrated residents start after the actual castle settles.
  // Their network/decoding failure must never hold the entrance button hostage.
  void import('./palace-living-scene.js?v=20261019-unified1').then(({initPalaceLivingScene})=>initPalaceLivingScene(root)).catch(()=>{});
  return results;
 });
}
