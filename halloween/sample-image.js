// Dialog previews must start loading even when created before the next paint.
// Retry the same artwork once; never replace a failed sample with other art.
const previewDisposers=new WeakMap();
export function disposeSampleImages(root){for(const image of root?.querySelectorAll?.('img')||[])previewDisposers.get(image)?.();}

export const PREVIEW_VERSION='28.4.18';

export function previewSource(src,{retry=false}={}){
 if(/^(?:data:|blob:)/i.test(src))return src;
 const [resource,fragment]=src.split('#',2),separator=resource.includes('?')?'&':'?';
 return resource+separator+'atelier-preview='+PREVIEW_VERSION+(retry?'&preview-retry=1':'')+(fragment===undefined?'':'#'+fragment);
}

export function createSampleImage(el,src,{className='sample-image',onState=()=>{},loading='eager',priority='auto',fallbackSrc=src,timeoutMs=12000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const img=el('img',className),local=/^(?:data:|blob:)/i.test(src);let attempt=0,timer,disposed=false;
 // Retry the lightweight preview before resorting to its exact original.
 const sources=local?[src]:[previewSource(src),previewSource(src,{retry:true}),...(fallbackSrc!==src?[previewSource(fallbackSrc,{retry:true})]:[])];
 img.loading=loading;img.fetchPriority=priority;img.decoding='async';img.alt='';
 const state=value=>{img.dataset.previewState=value;onState(value);};
 const stop=()=>{clearTimer(timer);timer=undefined;};
 const dispose=()=>{if(disposed)return;disposed=true;stop();img.removeAttribute?.('src');state('cancelled');};
 previewDisposers.set(img,dispose);
 const failed=()=>{
  if(disposed)return;
  if(img.isConnected===false){dispose();return;}
  stop();
  if(attempt+1<sources.length){attempt++;request();}
  else{img.alt='見本画像を読み込めませんでした';state('failed');}
 };
 const request=()=>{
  state(attempt?'retrying':'loading');
  // Lazy cards can remain offscreen indefinitely. Visible dialog cards are eager.
  if(loading==='eager'&&!local){timer=setTimer(()=>{if(img.isConnected===false){dispose();return;}if(attempt+1>=sources.length){disposed=true;stop();img.removeAttribute?.('src');img.alt='見本画像を読み込めませんでした';state('failed');return;}failed();},timeoutMs);timer?.unref?.();}
  img.src=sources[attempt];
 };
 img.addEventListener('load',()=>{if(disposed)return;stop();img.alt='';state('ready');});
 img.addEventListener('error',failed);
 request();
 return img;
}
