import {loadOverlordImage} from './overlord-materials.js?v=20261030-art1';
import {OVERLORD_ARTICULATED_PREVIEW} from './overlord-articulated-preview.js?v=20261030-body1';

export const OVERLORD_ART_ATLAS_URL=new URL('./assets/overlord/queen-articulated-atlas-v1.webp',import.meta.url).href;
const valid=image=>(image?.naturalWidth||image?.width)>0&&(image?.naturalHeight||image?.height)>0;

/** One lazy shared atlas. Embedded parts work offline, retaining the newest
 * detail even when the preview finishes decoding after the network image. */
export function createOverlordArtSource({loadImage=loadOverlordImage,url=OVERLORD_ART_ATLAS_URL,preview=OVERLORD_ARTICULATED_PREVIEW}={}){
 let current=null,version=0,started=false,full=false,settled=0,done=false,resolveReady;
 const listeners=new Set(),ready=new Promise(resolve=>{resolveReady=resolve;});
 const finish=value=>{if(!done){done=true;resolveReady(value);}};
 function install(image,detailed){
  if(!valid(image)||(!detailed&&full))return false;
  if(detailed)full=true;if(image===current)return true;
  current=image;version++;finish(image);
  for(const listener of listeners)try{listener(image,version);}catch{}
  return true;
 }
 function request(src,detailed){
  void Promise.resolve().then(()=>loadImage(src)).then(image=>install(image,detailed)).catch(()=>{}).finally(()=>{if(++settled===2&&!current)finish(null);});
 }
 return {
  start(){if(!started){started=true;request(preview,false);request(url,true);}return ready;},
  subscribe(listener){listeners.add(listener);if(current)listener(current,version);return()=>listeners.delete(listener);},
  get image(){return current;},get version(){return version;},get detailed(){return full;}
 };
}
export const overlordArtSource=createOverlordArtSource();
export function getOverlordArtAtlas(){void overlordArtSource.start();return overlordArtSource.image;}
