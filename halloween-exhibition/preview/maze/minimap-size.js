export const MINIMAP_SIZE_KEY='halloween-exhibition:minimap-size:v1';
export const MINIMAP_SIZES=Object.freeze(['small','medium','large']);
const labels=Object.freeze({small:'小',medium:'中',large:'大'});
export const normalizeMinimapSize=value=>MINIMAP_SIZES.includes(value)?value:'small';
export const nextMinimapSize=value=>MINIMAP_SIZES[(MINIMAP_SIZES.indexOf(normalizeMinimapSize(value))+1)%MINIMAP_SIZES.length];
export function initMinimapSize({button,root,storage,onChange}={}){
 let size='small';try{size=normalizeMinimapSize(storage?.getItem(MINIMAP_SIZE_KEY));}catch{}
 function render(){root.dataset.minimapSize=size;button.textContent='地図：'+labels[size];button.setAttribute('aria-label',`地図サイズ：${labels[size]}。押すと${labels[nextMinimapSize(size)]}に切り替え`);button.dataset.size=size;}
 button.onclick=()=>{size=nextMinimapSize(size);render();try{storage?.setItem(MINIMAP_SIZE_KEY,size);}catch{}onChange?.(size);};render();return{getSize:()=>size};
}
