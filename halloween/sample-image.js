// Dialog previews must start loading even when created before the next paint.
// Retry the same artwork once; never replace a failed sample with other art.
export const PREVIEW_VERSION='28.4.15';

export function previewSource(src,{retry=false}={}){
 if(/^(?:data:|blob:)/i.test(src))return src;
 const [resource,fragment]=src.split('#',2),separator=resource.includes('?')?'&':'?';
 return resource+separator+'atelier-preview='+PREVIEW_VERSION+(retry?'&preview-retry=1':'')+(fragment===undefined?'':'#'+fragment);
}

export function createSampleImage(el,src,{className='sample-image',onState=()=>{},loading='eager',priority='auto',fallbackSrc=src}={}){
 const img=el('img',className);let retried=false;
 // Set scheduling and listeners before src, including for cached responses.
 img.loading=loading;img.fetchPriority=priority;img.decoding='async';img.alt='';
 const state=value=>{img.dataset.previewState=value;onState(value);};
 img.addEventListener('load',()=>state('ready'));
 img.addEventListener('error',()=>{
  if(!retried&&!/^(?:data:|blob:)/i.test(src)){
   retried=true;state('retrying');img.src=previewSource(fallbackSrc,{retry:true});
  }else{img.alt='見本画像を読み込めませんでした';state('failed');}
 });
 state('loading');img.src=previewSource(src);
 return img;
}
