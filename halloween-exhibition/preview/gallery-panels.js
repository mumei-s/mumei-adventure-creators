/** Decorative headers only. Native dialog ownership, content and focus stay put. */
const instances=new WeakMap();
export const GALLERY_PANEL_SELECTOR='dialog#roster,dialog#detail,dialog#years,dialog.visitor-settings-dialog,dialog.pwa-guide';
export function initGalleryPanels({doc=globalThis.document,win=globalThis.window}={}){
 if(!doc?.getElementById?.('theater')||!doc.body)return ()=>{};
 if(instances.has(doc))return instances.get(doc);
 const installed=new Map();let disposed=false,suspended=false;
 const make=className=>{const el=doc.createElement('span');el.className=className;return el;};
 function decorate(panel){
  if(installed.has(panel))return;
  const existing=panel.querySelector('.gallery-panel-art');
  if(existing){panel.classList.add('gallery-panel');installed.set(panel,existing);return;}
  const art=make('gallery-panel-art');art.setAttribute('aria-hidden','true');
  for(const name of ['wash','book','familiar','talisman'])art.append(make(`gallery-panel-${name}`));
  const dust=make('gallery-panel-dust');
  for(let i=0;i<7;i++){const spark=make('gallery-panel-spark');spark.style.setProperty('--spark',String(i));dust.append(spark);}
  art.append(dust);
  const close=panel.querySelector('.close,.safe-dialog-back');
  panel.insertBefore(art,close?close.nextSibling:panel.firstChild);
  panel.classList.add('gallery-panel');installed.set(panel,art);
 }
 function scan(node){
  if(disposed||!node)return;
  if(node.matches?.(GALLERY_PANEL_SELECTOR))decorate(node);
  for(const panel of node.querySelectorAll?.(GALLERY_PANEL_SELECTOR)||[])decorate(panel);
 }
 const sync=()=>{doc.body.dataset.galleryPanelsPaused=String(suspended||Boolean(doc.hidden));};
 const observer=typeof win?.MutationObserver==='function'?new win.MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes||[])scan(node);
  // Repeated removals must not retain detached panels or their artwork.
  for(const [panel]of installed)if(!panel.isConnected)installed.delete(panel);
 }):null;
 scan(doc);observer?.observe(doc.body,{childList:true,subtree:true});sync();
 const pagehide=event=>{if(event.persisted){suspended=true;sync();}else dispose();};
 const pageshow=()=>{suspended=false;sync();};
 function dispose(){
  if(disposed)return;disposed=true;observer?.disconnect();
  doc.removeEventListener('visibilitychange',sync);win?.removeEventListener('pagehide',pagehide);win?.removeEventListener('pageshow',pageshow);
  for(const [panel,art]of installed){art.remove();panel.classList.remove('gallery-panel');}
  installed.clear();instances.delete(doc);delete doc.body.dataset.galleryPanelsPaused;
 }
 doc.addEventListener('visibilitychange',sync);win?.addEventListener('pagehide',pagehide);win?.addEventListener('pageshow',pageshow);
 instances.set(doc,dispose);return dispose;
}
if(globalThis.document?.getElementById?.('theater'))initGalleryPanels();
