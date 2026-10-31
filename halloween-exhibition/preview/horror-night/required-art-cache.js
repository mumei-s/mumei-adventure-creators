import {createCharacterAssets} from '../maze/creator-runtime.js?v=20261017-startup1';
// This derived story uses its own complete cast cache. Keep the shared town's
// required owner/cat atlases, but do not start its unused nearest-visitor warmup.
export function createRequiredArtCache(base=createCharacterAssets()){
 let required=null;
 return {...base,
  setPinned(sources){if(!required)required=new Set(sources);base.setPinned([...required]);},
  request(asset,options){return required?.has(asset.src)?base.request(asset,options):Promise.resolve(null);}
 };
}
