/** Presentation preference shared only within the public exhibition preview. */
export const DISPLAY_MODE_KEY = 'halloween-exhibition:preview:layout:v1';
export const DISPLAY_MODES = Object.freeze(['auto', 'phone', 'tablet', 'desktop']);
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
  let mode = readDisplayMode(storage), saved = true, last = '';
  function getState() { return {mode, layout:resolveDisplayMode(mode,getWidth()), saved}; }
  function refresh(force=false) {
    const state=getState(), signature=JSON.stringify(state);
    if(force || signature!==last) { last=signature;onChange(state); }
    return state;
  }
  function setMode(value) {
    if(!DISPLAY_MODES.includes(value))return false;
    mode=value;saved=true;
    try { if(!storage)throw Error('Storage unavailable');storage.setItem(DISPLAY_MODE_KEY,JSON.stringify({mode})); }
    catch { saved=false; }
    refresh();return true;
  }
  function reload() { mode=readDisplayMode(storage);saved=true;return refresh(); }
  refresh();
  return {getState,setMode,refresh,reload};
}

let instance=0;
/** Explicit layout choice, not physical-device detection, browser spoofing or zoom. */
export function initDisplayMode({controlsParent,page='gallery'} = {}) {
  if(!controlsParent || !isPreviewPath(globalThis.location?.pathname))return null;
  const existing=controlsParent.querySelector?.('.display-preferences');
  if(existing)return null;
  let storage;try{storage=globalThis.localStorage;}catch{}
  const id=`display-mode-${++instance}`;
  const section=document.createElement('section');section.className='display-preferences';section.setAttribute('aria-label','表示サイズ');
  const label=document.createElement('label');label.htmlFor=id;label.textContent='表示サイズ';
  const select=document.createElement('select');select.id=id;select.setAttribute('aria-describedby',`${id}-help ${id}-status`);
  for(const value of DISPLAY_MODES){const option=document.createElement('option');option.value=value;option.textContent=value==='auto'?'自動（画面幅に合わせる）':DISPLAY_LABELS[value];select.append(option);}
  const help=document.createElement('p');help.id=`${id}-help`;help.className='display-mode-help';
  help.textContent='好みのレイアウトを選べます。端末の種類や文字の拡大率は変えません。小さい画面では、どの表示も操作できるよう折り返します。設定はこの展示・別室・記事編集ツールだけで共有します。';
  const status=document.createElement('p');status.id=`${id}-status`;status.className='display-mode-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  section.append(label,select,help,status);controlsParent.append(section);
  document.body.dataset.layoutPage=['gallery','maze','admin'].includes(page)?page:'gallery';
  const controller=createDisplayModeController({storage,getWidth:()=>window.innerWidth,onChange(state){
    document.body.dataset.layoutMode=state.mode;document.body.dataset.layout=state.layout;
    select.value=state.mode;
    status.textContent=`${state.mode==='auto'?'自動：':''}${DISPLAY_LABELS[state.layout]}レイアウト${state.saved?'':'（この画面だけに適用・保存できませんでした）'}`;
    document.dispatchEvent(new CustomEvent('yearbook:layout-change',{detail:{mode:state.mode,layout:state.layout}}));
  }});
  const change=()=>controller.setMode(select.value),resize=()=>controller.refresh();
  const synced=event=>{if(event.key===DISPLAY_MODE_KEY && (!event.storageArea || event.storageArea===storage))controller.reload();};
  const restored=event=>{if(event.persisted)controller.reload();};
  select.addEventListener('change',change);window.addEventListener('resize',resize);window.addEventListener('storage',synced);window.addEventListener('pageshow',restored);
  return {...controller,destroy(){select.removeEventListener('change',change);window.removeEventListener('resize',resize);window.removeEventListener('storage',synced);window.removeEventListener('pageshow',restored);section.remove();}};
}
