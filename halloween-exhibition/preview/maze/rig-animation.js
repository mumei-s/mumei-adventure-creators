import {createOwnerRig,createLiveComposer,OWNER_ATTACK_DURATION} from './owner-rig.js?v=20261017-rig2';
import {createCreatureRig,CREATURE_ACTION_DURATION} from './creature-rig.js?v=20261017-rig2';
import {createCompositeRig} from './composite-rig.js?v=20261017-rig2';
import {createMascotRig} from './mascot-rig.js?v=20261017-rig2';
import {withDeadline} from '../transition-effects.js';

const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DEFAULT_SIDE='owner-lantern-hero';
export function headingForFacing(facing='down'){return ({down:0,'down-right':Math.PI/4,right:Math.PI/2,'up-right':Math.PI*.75,up:Math.PI,'up-left':-Math.PI*.75,left:-Math.PI/2,'down-left':-Math.PI/4})[facing]??0;}
const defaultCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function defaultLoadImage(url,{signal}={}){return new Promise((resolve,reject)=>{const im=new Image();let done=false;const finish=error=>{if(done)return;done=true;im.onload=im.onerror=null;signal?.removeEventListener('abort',cancel);if(error){im.removeAttribute?.('src');reject(error);}else resolve(im);};const cancel=()=>finish(Error('Rig image cancelled'));im.onload=()=>finish();im.onerror=()=>finish(Error('Rig image unavailable'));if(signal?.aborted){cancel();return;}signal?.addEventListener('abort',cancel,{once:true});im.src=url;});}
const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,100}$/.test(id);
const parseRows=data=>Array.isArray(data?.rigs)?data.rigs:Object.entries(data?.rigs||data?.characters||{}).map(([id,row])=>({...row,id:row.id||id}));
const cleanHeading=(value,facing)=>Number.isFinite(value)?value:headingForFacing(facing);
const instanceDefinition=id=>{const base=id==='owner'||id==='owner:battle'?DEFAULT_SIDE:id.endsWith(':battle')?id.slice(0,-7):id;return base==='resident:cat'?'town-cat':base;};
const isOwner=id=>instanceDefinition(id)===DEFAULT_SIDE;
function supportsHeading(manifest,heading){
 const x=Math.sin(heading),z=Math.cos(heading),direction=Math.abs(x)>Math.abs(z)?x>0?'right':'left':z>=0?'down':'up';
 const views=Object.keys(manifest.views||{});return views.length?views.includes(direction)||(direction==='down'&&views.includes('down-threequarter')):(manifest.direction||'down-threequarter')===direction||(direction==='down'&&(manifest.direction||'down-threequarter')==='down-threequarter');
}
// Synchronize the articulated hand with the arena's charge, projectile, impact
// and recovery clock. The town supplies shorter effect durations than palace.
export function rigBattleActionAge(kind,age,duration,actionDuration=OWNER_ATTACK_DURATION){
 const t=clamp(age/duration,0,1),magic=['shine','spark','light'].includes(kind);
 const keys=magic?[[0,0],[.5/2.4,.45],[.86/2.4,1],[1.28/2.4,1.25],[1.86/2.4,1.43],[1,1.85]]:[[0,0],[.15,1],[.25,1.25],[.65/1.2,1.43],[1,1.85]];
 for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,b]=[keys[i-1],keys[i]],f=(t-a[0])/(b[0]-a[0]);return(a[1]+(b[1]-a[1])*f)/1.85*actionDuration;}
 return actionDuration;
}

/** Lazy, optional articulated-art registry. Original creator data is read by its
 * existing loader; this sidecar cannot add creators, articles, progress or NPCs.
 * update/get/battle return a stable live Canvas sprite, or null while absent.
 */
export function createRigLibrary({loadImage=defaultLoadImage,fetcher=globalThis.fetch,makeCanvas=defaultCanvas,onChange=()=>{},sidecar='./data/character-rigs.json?v=f663ba448899',timeout=8000,metadataTimeout=5000,timers=globalThis,maxActive=16,maxSourceBytes=64*1024*1024,staleSeconds=12,allowUnreviewedPilot=false}={}){
 if(!Number.isInteger(maxActive)||maxActive<1||maxActive>16||!Number.isFinite(maxSourceBytes)||maxSourceBytes<1||maxSourceBytes>64*1024*1024)throw new TypeError('Invalid rig cache budget');
 const definitions=new Map(),loaded=new Map(),pending=new Map(),failures=new Map(),instances=new Map(),jobs=new Set();let destroyed=false,metadataReady=false,serial=0,logicalTime=0,revision=0;
 const notify=()=>{if(!destroyed){revision++;try{onChange(status());}catch{}}};
 const sourceBytes=()=>[...loaded.values()].reduce((n,a)=>n+a.bytes,0);
 const releaseImage=image=>{try{image?.close?.();}catch{}};
 function disposeInstance(key){const value=instances.get(key);if(!value)return;value.rig.destroy();value.composer.destroy();instances.delete(key);}
 function trimDefinitions(){
  const pinned=new Set([...instances.values()].map(i=>i.definitionId));
  for(const [id,record]of[...loaded].sort((a,b)=>a[1].used-b[1].used)){
   if(sourceBytes()<=maxSourceBytes)break;if(pinned.has(id))continue;
   for(const image of new Set(Object.values(record.images)))releaseImage(image);loaded.delete(id);
  }
 }
 function prune({activeIds,mapId,time=logicalTime}={}){
  const active=activeIds?new Set(activeIds.map(id=>id==='owner'?DEFAULT_SIDE:id)):null;
  for(const [key,value]of instances)if((active&&!active.has(key))||(mapId!==undefined&&value.mapId!==undefined&&value.mapId!==mapId)||(Number.isFinite(time)&&time-value.seenTime>staleSeconds))disposeInstance(key);
  trimDefinitions();return instances.size;
 }
 function checkPath(path,base=import.meta.url){
  if(typeof path!=='string'||!path||path.length>1000)throw Error('Invalid rig asset path');
  const url=new URL(path,base),home=new URL('./',import.meta.url);
  if(url.origin!==home.origin||url.username||url.password||!url.pathname.startsWith(home.pathname))throw Error('Rig assets must stay local to the game');
  return url.href;
 }
 async function json(url,signal,limit=timeout,onTimeout=()=>{}){
  return withDeadline((async()=>{const response=await fetcher(url,{signal,cache:'default'});if(!response?.ok)throw Error('Rig data unavailable');return response.json();})(),{timeout:limit,signal,timers,onTimeout});
 }
 const abort=new AbortController();jobs.add(abort);
 const ready=(async()=>{try{
  const data=await json(checkPath(sidecar),abort.signal,metadataTimeout,()=>abort.abort());
  if(destroyed)return false;if(data?.schemaVersion!==1)throw Error('Unknown rig sidecar');
  for(const row of parseRows(data))if(safeId(row.id)&&row.enabled!==false&&row.status!=='rejected')definitions.set(row.id,row);
  metadataReady=true;notify();return true;
 }catch{if(!destroyed){metadataReady=true;notify();}return false;}finally{jobs.delete(abort);}})();
 async function ensure(id){
  if(destroyed||loaded.has(id)||pending.has(id)||failures.has(id)||!metadataReady||!definitions.has(id))return;
  const entry=definitions.get(id),request=new AbortController();jobs.add(request);
  if(entry.approved!==true&&entry.review?.passed!==true&&!(allowUnreviewedPilot&&id===DEFAULT_SIDE)){jobs.delete(request);return;}
  const task=Promise.resolve().then(async()=>{let images={};try{
   const base=entry.manifestURL?checkPath(entry.manifestURL):import.meta.url;
   const manifest=structuredClone(entry.manifest||await json(base,request.signal,timeout,()=>request.abort()));
   if(!manifest||typeof manifest!=='object'||!(manifest.parts||manifest.views))throw Error('Rig parts unavailable');
   const paths={...manifest.atlases,...entry.atlases};
   const viewPaths=Object.values(manifest.views||{}).map(view=>view.atlas).filter(Boolean);
   for(const key of[manifest.atlas,...viewPaths].filter(Boolean))if(!paths[key])paths[key]=key;
   if(!Object.keys(paths).length&&entry.src)paths.main=entry.src;
   if(!Object.keys(paths).length)throw Error('Rig atlas unavailable');
   if(!manifest.atlas&&!manifest.views)manifest.atlas=Object.keys(paths)[0];
   await Promise.all(Object.entries(paths).map(async([key,path])=>{
    const operation=Promise.resolve().then(()=>loadImage(checkPath(path,base),{signal:request.signal,timeout})).then(image=>{if(destroyed||request.signal.aborted){releaseImage(image);return null;}return image;});
    const image=await withDeadline(operation,{timeout,timers,signal:request.signal,onTimeout:()=>request.abort()});
    if(!image||destroyed||request.signal.aborted)return;images[key]=image;
   }));
   if(destroyed||request.signal.aborted)return;
   const unique=[...new Set(Object.values(images))],bytes=unique.reduce((n,image)=>n+Number(image?.width||0)*Number(image?.height||0)*4,0);
   if(!bytes||unique.some(image=>!Number.isFinite(image.width)||!Number.isFinite(image.height)||image.width<1||image.height<1||image.width>4096||image.height>4096)||bytes>maxSourceBytes)throw Error('Rig source budget exceeded');
   loaded.set(id,{entry,manifest,images,bytes,used:++serial});trimDefinitions();
   if(!loaded.has(id)){images={};throw Error('Rig source budget exceeded');}
   if(sourceBytes()>maxSourceBytes){loaded.delete(id);throw Error('Rig source budget exceeded');}
   images={};notify();
  }catch(error){request.abort();if(!destroyed){failures.set(id,String(error.message||error));notify();}}
  finally{for(const image of new Set(Object.values(images)))releaseImage(image);pending.delete(id);jobs.delete(request);}
  });pending.set(id,task);return task;
 }
 function getInstance(id){
  const key=id==='owner'?DEFAULT_SIDE:id,definitionId=instanceDefinition(id),source=loaded.get(definitionId);
  if(!source){void ensure(definitionId);return null;}
  let instance=instances.get(key);
  if(!instance){
   while(instances.size>=maxActive){const oldest=[...instances].filter(([key])=>!isOwner(key)).sort((a,b)=>a[1].used-b[1].used)[0];if(!oldest)return null;disposeInstance(oldest[0]);}
   const manifest=source.manifest,arch=source.entry.archetype||manifest.archetype||'biped',options={manifest,...manifest.motion};
   const creature=['quadruped','flying','floating','wing','float'].includes(arch),rig=manifest.children?.length?createCompositeRig(options):['bread','flower'].includes(arch)?createMascotRig({...options,archetype:arch}):creature?createCreatureRig({...options,archetype:arch==='wing'?'flying':arch==='float'?'floating':arch}):createOwnerRig(options);
   const size=manifest.output||{},width=Math.min(512,Math.max(64,size.width||256)),height=Math.min(512,Math.max(64,size.height||320));
   const composer=createLiveComposer({makeCanvas,atlas:source.images,manifest,width,height,scale:size.scale||1,anchorX:size.anchorX??.5,anchorY:size.anchorY??.94,contentHeight:manifest.contentHeight||256});
   instance={definitionId,manifest,rig,composer,actionDuration:creature?CREATURE_ACTION_DURATION:OWNER_ATTACK_DURATION,used:++serial,seenTime:logicalTime,lastSignature:null,sprite:null,eligible:false};instances.set(key,instance);
  }
  instance.used=++serial;source.used=serial;return instance;
 }
 function renderInstance(instance,pose){
  instance.composer.render(pose);
  const sprite=instance.composer.sprite();sprite.liveRig=true;sprite.rigId=instance.definitionId;sprite.rigContentHeight=instance.manifest.contentHeight||256;sprite.animationAssetComplete=instance.manifest?.animationReviewed===true&&instance.manifest?.continuousTurnComplete===true&&instance.manifest?.attackArtComplete===true;
  sprite.rigPose=pose;instance.sprite=sprite;return sprite;
 }
 function update(id,options={}){
  if(destroyed||!safeId(id))return null;const position=options.position||{x:0,z:0};
  if(!Number.isFinite(position.x)||!Number.isFinite(position.z))return null;
  if(Number.isFinite(options.time))logicalTime=Math.max(logicalTime,options.time);
  prune();const instance=getInstance(id);if(!instance)return null;instance.seenTime=logicalTime;if(options.mapId!==undefined)instance.mapId=options.mapId;
  const heading=cleanHeading(options.heading,options.facing),motion=options.motion!==false;
  instance.eligible=supportsHeading(instance.manifest,heading-(options.groundYaw||0));if(!instance.eligible)return null;
  const projection=Object.fromEntries(['worldPixelsPerUnit','displayHeightPx','groundDepthScale','worldStrideLength','groundYaw'].filter(key=>options[key]!==undefined).map(key=>[key,options[key]]));
  const signature=JSON.stringify([position.x,position.z,heading,motion,projection]);let pose;
  if(!motion){if(signature===instance.lastSignature&&instance.sprite)return instance.sprite;instance.rig.update({position,heading,dt:0,moving:false,...projection});pose=instance.rig.reset(position,heading);}
  else pose=instance.rig.update({position,heading,dt:clamp(Number.isFinite(options.dt)?options.dt:0,0,.1),moving:options.moving===true,motion:true,...projection});
  instance.lastSignature=signature;return renderInstance(instance,pose);
 }
 function get(id){if(destroyed||!safeId(id))return null;const key=id==='owner'?DEFAULT_SIDE:id,value=instances.get(key);return value?.eligible?value.sprite:null;}
 function battle(id,{effect=null,time=0,motion=true,facing='right',heading}={}){
  if(destroyed||!safeId(id))return null;const key=id.endsWith(':battle')?id:id+':battle',instance=getInstance(key);if(!instance)return null;
  instance.seenTime=logicalTime;const yaw=cleanHeading(heading,facing),kind=effect?.type||effect?.action||'idle',started=effect?.started??effect?.at??time,age=Math.max(0,(Number.isFinite(time)?time:0)-(Number.isFinite(started)?started:0)),duration=Number.isFinite(effect?.duration)&&effect.duration>0?effect.duration:['shine','spark','light'].includes(kind)?2.4:1.2;
  instance.eligible=supportsHeading(instance.manifest,yaw);if(!instance.eligible)return null;
  const attacking=['attack','shine','spark','light'].includes(kind)&&age<duration,elapsed=attacking?rigBattleActionAge(kind,age,duration,instance.actionDuration):instance.actionDuration;
  let pose;
  if(attacking)pose=typeof instance.rig.seekAction==='function'?instance.rig.seekAction(elapsed,{position:{x:0,z:0},heading:yaw,motion}):instance.rig.reset({x:0,z:0},yaw);
  else{
   if(instance.battleClock===undefined||instance.battleAttacking||time<instance.battleClock||instance.battleYaw!==yaw)instance.rig.seekAction?.(instance.actionDuration,{position:{x:0,z:0},heading:yaw,motion});
   const dt=motion&&Number.isFinite(instance.battleClock)?clamp(time-instance.battleClock,0,.1):0;
   pose=instance.rig.update({position:{x:0,z:0},heading:yaw,dt,moving:false,motion});
  }
  instance.battleClock=time;instance.battleAttacking=attacking;instance.battleYaw=yaw;
  return renderInstance(instance,pose);
 }
 function status(){return{metadataReady,definitions:definitions.size,loaded:loaded.size,pending:pending.size,failures:[...failures.keys()],active:instances.size,sourceBytes:sourceBytes(),maxActive,maxSourceBytes,revision,destroyed};}
 return{ready,update,get,battle,prune,status,retry(id){const key=instanceDefinition(id);failures.delete(key);return ensure(key);},
 destroy(){if(destroyed)return;destroyed=true;for(const request of jobs)request.abort();jobs.clear();for(const key of[...instances.keys()])disposeInstance(key);for(const record of loaded.values())for(const image of new Set(Object.values(record.images)))releaseImage(image);loaded.clear();definitions.clear();pending.clear();failures.clear();}};
}
