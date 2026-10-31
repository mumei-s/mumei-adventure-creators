// One current-scene image only. Never block the town, text or return controls.
export function prepareIllustration(definition,{ImageClass=globalThis.Image}={}){
 if(!definition||typeof ImageClass!=='function')return null;
 const image=new ImageClass();let state='loading',notify=()=>{};
 image.alt=definition.alt;image.width=definition.width||1080;image.height=definition.height||1249;
 image.decoding='async';image.loading='eager';image.fetchPriority='low';
 const changed=value=>{state=value;notify(state);};
 image.onload=()=>{changed('loaded');try{void image.decode?.().catch(()=>{});}catch{}};
 image.onerror=()=>changed('error');
 image.src=definition.src;
 return {
  mount(placeholder,onState){notify=onState;image.fetchPriority='high';placeholder.replaceWith(image);notify(state);},
  retry(){changed('loading');image.removeAttribute('src');image.src=definition.src;},
  status:()=>state
 };
}
