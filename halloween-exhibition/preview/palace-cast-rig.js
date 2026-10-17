/** Optional articulated courtyard art. No game, controls, saves or creator data. */
import {createOwnerRig,drawOwnerPose} from './maze/owner-rig.js?v=20261017-rig2';
import {createCreatureRig} from './maze/creature-rig.js?v=20261017-rig2';

export const COURTYARD_RIGS=Object.freeze(['franken','zombie','werewolf','mummy','witch','ghost']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const MAX_SOURCE_BYTES=32*1024*1024;

/** At most two local art requests run together. Failed art leaves the atlas visible. */
export function createPalaceCastRigs({fetcher,loadImage,onChange=()=>{},timers=globalThis,timeout=8000}={}){
 const records=new Map(),requests=new Set();let disposed=false,sourceBytes=0;
 async function bounded(operation){
  const abort=new AbortController();requests.add(abort);let timer;
  try{return await Promise.race([
   Promise.resolve().then(()=>operation(abort.signal)),
   new Promise((_,reject)=>{const cancel=()=>reject(Error('Courtyard art cancelled'));abort.signal.addEventListener('abort',cancel,{once:true});timer=timers.setTimeout(()=>abort.abort(),timeout);}),
  ]);}finally{timers.clearTimeout(timer);requests.delete(abort);}
 }
 async function load(id){
  let image;
  try{
   const url=new URL(`./maze/assets/rigs/monster-${id}/rig.json`,import.meta.url);
   const manifest=await bounded(async signal=>{const response=await fetcher(url,{signal});if(!response.ok)throw Error('Courtyard rig unavailable');return response.json();});
   if(disposed||!manifest?.views||!manifest.atlases?.main)return false;
   const imageURL=new URL(manifest.atlases.main,url);
   if(imageURL.origin!==url.origin||!imageURL.pathname.startsWith(new URL('./',url).pathname))return false;
   image=await bounded(signal=>Promise.resolve(loadImage(imageURL.href,{signal})).then(value=>{if(disposed||signal.aborted){value?.close?.();return null;}return value;}));
   if(disposed||!image)return false;
   const bytes=image.width*image.height*4;
   if(!Number.isFinite(bytes)||image.width<1||image.height<1||image.width>2048||image.height>2048||sourceBytes+bytes>MAX_SOURCE_BYTES)throw Error('Courtyard art budget exceeded');
   const floating=manifest.archetype==='float'||manifest.archetype==='floating';
   const rig=floating?createCreatureRig({manifest,archetype:'floating',...manifest.motion}):createOwnerRig({manifest,...manifest.motion});
   records.set(id,{manifest,image,rig,time:null,lastPose:null,width:0,height:0});sourceBytes+=bytes;image=null;
   onChange();return true;
  }catch{return false;}finally{image?.close?.();}
 }
 let next=0;
 const worker=async()=>{while(!disposed&&next<COURTYARD_RIGS.length){const id=COURTYARD_RIGS[next++];await load(id);}};
 const ready=Promise.all([worker(),worker()]);
 function poseFor(id,pose,time,width,height){
  const record=records.get(id);if(!record||disposed)return null;
  const {manifest,rig}=record,dt=record.time===null?0:clamp(time-record.time,0,.06);
  if(record.time===time&&record.width===width&&record.height===height)return record.lastPose;
  // Rig positions are CSS pixels. The projection contract makes a planted foot
  // travel exactly with its displayed ground, independent of canvas density.
  const position={x:pose.x,z:pose.y/.38};
  const previous=record.position,travel=previous?Math.hypot(position.x-previous.x,position.z-previous.z):0;
  const heading=travel>1e-6?Math.atan2(position.x-previous.x,position.z-previous.z):record.heading??pose.heading??(pose.flip?-Math.PI/2:Math.PI/2);
  if(record.time===null||record.width!==width||record.height!==height)rig.reset(position,heading);
  const result=rig.update({position,heading,dt,moving:travel>1e-6,motion:true,worldPixelsPerUnit:1,displayHeightPx:pose.size,groundDepthScale:.38,worldStrideLength:Math.max(6,pose.size*.18)});
  record.time=time;record.position=position;record.heading=heading;record.width=width;record.height=height;record.lastPose=result;return result;
 }
 return {ready,
  draw(ctx,id,pose,time,width,height){
   const record=records.get(id),art=poseFor(id,pose,time,width,height);if(!art)return false;
   return drawOwnerPose(ctx,{main:record.image},record.manifest,art,{x:pose.x,y:pose.y,scale:pose.size/(record.manifest.contentHeight||256)});
  },
  status:()=>({loaded:records.size,sourceBytes,disposed,pending:requests.size}),
  destroy(){disposed=true;for(const request of requests)request.abort();requests.clear();for(const record of records.values()){record.rig.destroy();record.image.close?.();}records.clear();sourceBytes=0;},
 };
}
