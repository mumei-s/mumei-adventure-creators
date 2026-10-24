import {loadArtImage} from '../maze/rpg-art.js?v=20261019-unified1';
import {withDeadline} from '../transition-effects.js?v=20261016-living1';
export const TOWN_SCENE_IMAGE_TIMEOUT=14000;
/** One page owns decoded scene images; changing renderers does not refetch them. */
export function createTownSceneImages({loadImage=loadArtImage,timeout=TOWN_SCENE_IMAGE_TIMEOUT,timers=globalThis}={}){
 const images=new Map();
 function load(src,options={}){
  const url=new URL(src);url.searchParams.delete('retry');url.searchParams.delete('scene-retry');const key=url.href;
  if(images.has(key))return images.get(key);
  // A consumer's cancellation must not cancel another renderer's shared request.
  // Bound the shared work independently; keep version queries in its identity.
  const priority=url.pathname.endsWith('/residents-atlas.webp')?'high':options.priority||'low';
  const pending=withDeadline(Promise.resolve().then(()=>loadImage(src,{timeout,timers,priority})).then(image=>{if(url.pathname.endsWith('/residents-atlas.webp')&&(!(image?.width>=1280)||!(image?.height>=640)))throw Object.assign(new Error('Town resident image dimensions are invalid'),{code:'assets-invalid'});return image;}),{timeout,timers});
  images.set(key,pending);
  pending.catch(()=>{if(images.get(key)===pending)images.delete(key);});
  return pending;
 }
 return {load,clear(){images.clear();},size:()=>images.size};
}
