/** Presentation preference shared only within the public exhibition preview. */
export const DISPLAY_MODE_KEY = 'halloween-exhibition:preview:layout:v1';
export const DISPLAY_MODES = Object.freeze(['auto', 'phone', 'tablet', 'desktop']);
export const DISPLAY_PROFILES=Object.freeze({
 phone:Object.freeze({font:16,meta:14,target:48,icon:40,header:56,contentMax:520,galleryChrome:440,title:26}),
 tablet:Object.freeze({font:18,meta:16,target:52,icon:48,header:60,contentMax:1000,galleryChrome:400,title:32}),
 desktop:Object.freeze({font:14,meta:12,target:44,icon:32,header:52,contentMax:1440,galleryChrome:360,title:36}),
});
export const DISPLAY_LABELS = Object.freeze({auto:'自動',phone:'スマホ',tablet:'タブレット',desktop:'PC'});
export const normalizeDisplayMode = value => DISPLAY_MODES.includes(value) ? value : 'auto';
export function resolveDisplayMode(mode, width) {
  const choice = normalizeDisplayMode(mode);
  if (choice !== 'auto') return choice;
  const size = Number.isFinite(width) && width > 0 ? width : 320;
  return size <= 680 ? 'phone' : size <= 1100 ? 'tablet' : 'desktop';
}
export const isPreviewPath = path => typeof path === 'string' && /\/halloween-exhibition\/preview\/(?:[^?#]*)$/.test(path);
export function readDisplayMode(storage) {
  try { return normalizeDisplayMode(JSON.parse(storage?.getItem(DISPLAY_MODE_KEY) || 'null')?.mode); }
  catch { return 'auto'; }
}
export function createDisplayModeController({storage, getWidth = () => 320, onChange = () => {}} = {}) {
  let mode = readDisplayMode(storage), saved = !!storage, last = '', pendingMode=null;
  try { storage?.getItem(DISPLAY_MODE_KEY); } catch { saved=false; }
  function getState() { return {mode, layout:resolveDisplayMode(mode,getWidth()), saved}; }
  function refresh(force=false) {
    const state=getState(), signature=JSON.stringify(state);
    if(force || signature!==last) { last=signature;onChange(state); }
    return state;
  }
  function setMode(value) {
    if(!DISPLAY_MODES.includes(value))return false;
    mode=value;saved=true;
    try { if(!storage)throw Error('Storage unavailable');storage.setItem(DISPLAY_MODE_KEY,JSON.stringify({mode}));pendingMode=null; }
    catch { saved=false;pendingMode=mode; }
    refresh();return true;
  }
  function reload() { mode=pendingMode??readDisplayMode(storage);saved=pendingMode===null&&!!storage;try{storage?.getItem(DISPLAY_MODE_KEY);}catch{saved=false;}return refresh(); }
  function sync(value,persisted=true){if(!DISPLAY_MODES.includes(value))return false;mode=value;saved=persisted;pendingMode=persisted?null:value;refresh();return true;}
  refresh();
  return {getState,setMode,refresh,reload,sync};
}

export function migrateDisplayMode(value,storage){
  if(!DISPLAY_MODES.includes(value))return false;
  try{if(!storage||storage.getItem(DISPLAY_MODE_KEY)!==null)return false;storage.setItem(DISPLAY_MODE_KEY,JSON.stringify({mode:value}));return true;}catch{return false;}
}
export function applyDisplayProfile(body,state){
  const layout=DISPLAY_PROFILES[state.layout]?state.layout:resolveDisplayMode(state.mode,320),profile=DISPLAY_PROFILES[layout];
  body.dataset.layoutMode=normalizeDisplayMode(state.mode);body.dataset.layout=layout;
  for(const [token,value]of Object.entries({font:profile.font,meta:profile.meta,target:profile.target,icon:profile.icon,'header-height':profile.header,'content-max':profile.contentMax,'gallery-chrome':profile.galleryChrome,title:profile.title}))body.style?.setProperty('--profile-'+token,value+'px');
  return profile;
}
let instance=0;
/** Applies a shared saved preset even when the settings dialog is closed. */
export function initDisplayMode({controlsParent,page='gallery',onChange=()=>{}} = {}) {
  if(!isPreviewPath(globalThis.location?.pathname))return null;
  const existing=controlsParent?.querySelector?.('.display-preferences');if(existing)return null;
  let storage;try{storage=globalThis.localStorage;}catch{}
  const id=`display-mode-${++instance}`;let section=null,select=null,status=null;
  if(controlsParent){
    section=document.createElement('section');section.className='display-preferences';section.setAttribute('aria-label','表示サイズ');
    const label=document.createElement('label');label.htmlFor=id;label.textContent='表示サイズ';
    select=document.createElement('select');select.id=id;select.setAttribute('aria-describedby',`${id}-help ${id}-status`);
    for(const value of DISPLAY_MODES){const option=document.createElement('option');option.value=value;option.textContent=value==='auto'?'自動（画面幅に合わせる）':DISPLAY_LABELS[value];select.append(option);}
    const help=document.createElement('p');help.id=`${id}-help`;help.className='display-mode-help';help.textContent='スマホ・タブレット・PCで、画面の幅、文字、操作ボタンの大きさが切り替わります。展示場・地下・街で同じ設定を使います。小さな画面にも収まります。';
    status=document.createElement('p');status.id=`${id}-status`;status.className='display-mode-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    section.append(label,select,help,status);controlsParent.append(section);
  }
  document.body.dataset.layoutPage=['gallery','maze','town','admin'].includes(page)?page:'gallery';
  const controller=createDisplayModeController({storage,getWidth:()=>window.innerWidth,onChange(state){
    applyDisplayProfile(document.body,state);if(select)select.value=state.mode;
    if(status)status.textContent=`${state.mode==='auto'?'自動：':''}${DISPLAY_LABELS[state.layout]}レイアウト${state.saved?'':'（この画面だけに適用・保存できませんでした）'}`;
    document.dispatchEvent(new CustomEvent('yearbook:layout-change',{detail:{mode:state.mode,layout:state.layout,saved:state.saved,source:id}}));onChange(state);
  }});
  const change=()=>controller.setMode(select.value),resize=()=>controller.refresh();
  const synced=event=>{if((event.key===DISPLAY_MODE_KEY||event.key===null)&&(!event.storageArea||event.storageArea===storage))controller.reload();};
  const restored=event=>{if(event.persisted)controller.reload();};
  const shared=event=>{const state=event.detail;if(state?.source!==id&&DISPLAY_MODES.includes(state?.mode)&&state.mode!==controller.getState().mode)controller.sync(state.mode,state.saved!==false);};
  select?.addEventListener('change',change);window.addEventListener('resize',resize);window.addEventListener('storage',synced);window.addEventListener('pageshow',restored);document.addEventListener?.('yearbook:layout-change',shared);
  return {...controller,destroy(){select?.removeEventListener('change',change);window.removeEventListener('resize',resize);window.removeEventListener('storage',synced);window.removeEventListener('pageshow',restored);document.removeEventListener?.('yearbook:layout-change',shared);section?.remove();}};
}
