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
  timer=timers.setTimeout(failed,timeout);
  if(image.complete)image.naturalWidth?loaded():failed();
 });
}
export function initPalaceStartup(root) {
 const doc=root.ownerDocument, image=doc.getElementById('palace-image'), header=root.querySelector('.masthead');
 const syncHeight=()=>{const phone=root.getBoundingClientRect().width<=760;const source=image?.parentElement?.querySelector('source');if(source)source.media=phone?'all':'not all';if(header)root.style.setProperty('--palace-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);};
 syncHeight();
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(syncHeight);if(header)observer.observe(header);observer.observe(root);}
 const gateTexture=new Image();gateTexture.src=root.getBoundingClientRect().width<=760?'./assets/palace/gate-phone.webp':'./assets/palace/gate-desktop.webp';
 return Promise.all([settlePalaceImage(image),settlePalaceImage(gateTexture)]).then(results=>{
  const fallback=results.includes('fallback');root.dataset.palaceReady=fallback?'fallback':'ready';
  const status=doc.getElementById('palace-load-status');
  if(status){status.textContent='';status.hidden=true;} // A ready embedded castle is a valid display, not a persistent warning.
  // Optional illustrated residents start after the actual castle settles.
  // Their network/decoding failure must never hold the entrance button hostage.
  void import('./palace-living-scene.js?v=20261018-street1').then(({initPalaceLivingScene})=>initPalaceLivingScene(root)).catch(()=>{});
  return results;
 });
}
