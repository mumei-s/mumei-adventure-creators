import {createCharacterAssets,characterSprite} from '../maze/creator-runtime.js?v=20261017-startup1';
import {manuscriptCast,castPositions} from './cast.js?v=20261031-cast-1';
// Bounded runtime bitmap copies only; original approved atlases remain untouched.
async function loadCastImage(url,asset,{signal}={}){
 const image=await new Promise((resolve,reject)=>{const im=new Image();let timer;const finish=error=>{clearTimeout(timer);im.onload=im.onerror=null;signal?.removeEventListener('abort',cancel);error?reject(error):resolve(im);};const cancel=()=>{im.src='';finish(Error('Cast loading cancelled'));};if(signal?.aborted)return cancel();signal?.addEventListener('abort',cancel,{once:true});timer=setTimeout(()=>finish(Error('Cast loading timeout')),10000);im.onload=()=>finish();im.onerror=()=>finish(Error('Cast image unavailable'));im.decoding='async';im.src=url;});
 if(image.width!==asset.width||image.height!==asset.height)throw Error('Cast atlas dimensions changed');
 const scale=Math.min(1,512/Math.max(image.width,image.height)),width=Math.round(image.width*scale),height=Math.round(image.height*scale);
 if(typeof createImageBitmap==='function')try{return await createImageBitmap(image,{resizeWidth:width,resizeHeight:height,resizeQuality:'high'});}catch{}
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');if(!c)throw Error('Cast bitmap unavailable');c.drawImage(image,0,0,width,height);return canvas;
}
export function createStoryCast(visitors,{signal}={}){
 const cast=manuscriptCast(visitors),assets=createCharacterAssets({loadImage:loadCastImage,maxResident:cast.length,maxBytes:24*1024*1024,concurrent:2});
 assets.setPinned(cast.map(v=>v.asset.src));
 const ready=Promise.all(cast.map(v=>assets.request(v.asset,{signal}))).then(images=>{if(images.some(im=>!im))throw Error('本文の登場人物を全員表示できませんでした。本文からお読みください。');});
 let placed=[];
 return {ready,enter(stage,walkable){placed=castPositions(cast,stage,walkable);},actors(){return placed.map(v=>({...v,sprite:characterSprite(v.asset,assets.get(v.asset.src),'down',false,0)}));},destroy(){assets.dispose();},count:cast.length};
}
