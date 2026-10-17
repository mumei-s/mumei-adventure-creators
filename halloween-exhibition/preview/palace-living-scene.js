import {withDeadline} from './transition-effects.js?v=20261017-review1';
/** Original illustrated residents, with optional articulated parts and continuous paths.
 * This decorative canvas never receives input, changes navigation or reads storage. */
export const CASTLE_CAST = Object.freeze([
  {id:'franken',side:-1,lane:0,phase:.2,period:18,size:1},
  {id:'zombie',side:1,lane:0,phase:2.8,period:21,size:.94},
  {id:'werewolf',side:-1,lane:1,phase:4.1,period:24,size:.76},
  {id:'mummy',side:1,lane:1,phase:1.4,period:25,size:.72},
  {id:'witch',side:-1,lane:2,phase:3.3,period:28,size:.64},
  {id:'vampire',side:1,lane:2,phase:5.2,period:27,size:.66},
  {id:'ghost',side:1,lane:3,phase:1.7,period:17,size:.64},
  {id:'bat',side:1,lane:4,phase:3.8,period:14,size:.7},
]);
export function castleActorPose(actor,time,width,height,frameCount=4,fps=7){
  const angle=time*Math.PI*2/actor.period+actor.phase;
  const progress=(1+Math.sin(angle))/2;
  const flying=actor.id==='ghost'||actor.id==='bat';
  const depth=actor.lane>=3?.65:1-actor.lane*.12;
  const center=actor.side<0?.115:.885;
  const x=width*(center+actor.side*Math.sin(angle)*.052);
  const y=height*(flying?(actor.id==='bat'?.28:.59)+Math.sin(angle*.8)*.038:.94-actor.lane*.105-progress*.055);
  const angularSpeed=Math.PI*2/actor.period;
  const velocity={x:width*actor.side*Math.cos(angle)*.052*angularSpeed,y:height*(flying?Math.cos(angle*.8)*.8*.038:-Math.cos(angle)*.055/2)*angularSpeed};
  const size=Math.min(115,height*.25,Math.max(38,width*.19))*actor.size*depth;
  const moving=Math.abs(Math.cos(angle))>.12;
  return {x,y,size,velocity,heading:Math.atan2(velocity.x,velocity.y/.78),moving:Math.hypot(velocity.x,velocity.y/.78)>1e-6,flip:Math.cos(angle)*actor.side<0,frame:moving?Math.floor(time*fps+actor.phase)%frameCount:0,depth,progress};
}

/** A species keeps one stable path envelope across its entire pose cycle.
 * Full source-cell extents are conservative, so opaque limbs cannot clip edges. */
export function castleSafeActorPose(actor,time,width,height,layout){
 const pose=castleActorPose(actor,time,width,height,4,layout?.fps||7);
 if(!layout?.frames?.length)return pose;
 // Mirroring swaps left/right extents; reserve the larger on BOTH sides.
 const extent=Math.max(...layout.frames.map(frame=>{
  const drawWidth=pose.size*frame.frame[2]/(frame.contentHeight||frame.frame[3]*.88);
  return drawWidth*Math.max(frame.anchorX??.5,1-(frame.anchorX??.5));
 }));
 const amplitude=Math.min(width*.052,Math.max(0,(width-2*extent-8)/2));
 const originalCenter=width*(actor.side<0?.115:.885);
 const center=Math.max(extent+4+amplitude,Math.min(width-extent-4-amplitude,originalCenter));
 const wave=(pose.x-originalCenter)/(width*.052);
 const velocity={x:pose.velocity.x*amplitude/(width*.052),y:pose.velocity.y};
 return {...pose,x:center+wave*amplitude,velocity,heading:Math.atan2(velocity.x,velocity.y/.78),moving:Math.hypot(velocity.x,velocity.y/.78)>1e-6};
}

export function drawCastleCast(ctx,images,time,width,height,{rigs=null,rigSprites=new Map(),dt=0,motion=true}={}){
    ctx.clearRect(0,0,width,height);
    const liveLayout=sprite=>sprite?{frames:[sprite]}:null;
    const cast=CASTLE_CAST.map(actor=>({actor,pose:castleSafeActorPose(actor,time,width,height,liveLayout(rigSprites.get(actor.id))||images.get(actor.id)?.layout)})).sort((a,b)=>a.pose.y-b.pose.y);
    const rendered=new Set();
    for(const entry of cast){
      const {actor}=entry;let {pose}=entry,live=null;
      const update=(step=dt)=>rigs?.update?.('monster:'+actor.id,{position:{x:pose.x,z:pose.y/.78},heading:pose.heading,moving:motion&&pose.moving,motion,dt:motion?step:0,time,mapId:'palace-entrance',worldPixelsPerUnit:1,displayHeightPx:pose.size,groundDepthScale:.78});
      try{
       live=update();
       if(live?.image&&live.frame){
        const previous=rigSprites.get(actor.id);rigSprites.set(actor.id,live);
        if(!previous||previous.image!==live.image||previous.contentHeight!==live.contentHeight){
         const fitted=castleSafeActorPose(actor,time,width,height,liveLayout(live));
         if(fitted.x!==pose.x){pose=fitted;live=update(0)||live;}
        }
       }else live=null;
      }catch{live=null;}
      const record=images.get(actor.id);if(!live&&!record)continue;
      const layout=record?.layout;
      const frameIndex=(layout?.walkFrames||[0,1,2,3])[motion?pose.frame:0]??layout?.idleFrame??0;
      const source=live||layout.frames[frameIndex]||layout.frames[0],image=live?.image||record.image;
      const [sourceX,sourceY,sourceW,sourceH]=source.frame;
      const drawHeight=pose.size*sourceH/(source.contentHeight||sourceH*.88);
      const drawWidth=drawHeight*sourceW/sourceH;
      ctx.save();ctx.translate(pose.x,pose.y);
      if(actor.id!=='ghost'&&actor.id!=='bat'){
        ctx.fillStyle='rgba(14,9,24,.35)';ctx.beginPath();ctx.ellipse(0,0,pose.size*.23,pose.size*.045,0,0,Math.PI*2);ctx.fill();
      }
      // Real views retain their authored handedness; only legacy art reflects.
      if(!live)ctx.scale(pose.flip!==(layout.faces==='left')?-1:1,1);
      ctx.drawImage(image,sourceX,sourceY,sourceW,sourceH,-drawWidth*(source.anchorX??.5),-drawHeight*(source.anchorY??.94),drawWidth,drawHeight);
      ctx.restore();
      rendered.add(actor.id);
    }
    rigs?.prune?.({activeIds:CASTLE_CAST.map(({id})=>'monster:'+id),mapId:'palace-entrance',time});
    return rendered;
  }

// Kept local so the entrance does not initialize or download the game runtime.
export const CASTLE_ATLAS_BASE = './maze/assets/rpg/animated/';
export async function loadCastleMotionManifest(fetcher=globalThis.fetch,{signal,timers=globalThis,timeout=8000}={}){
 const url=new URL(`${CASTLE_ATLAS_BASE}monster-motion.json?v=20261016-living1`,import.meta.url);
 const request=new AbortController(),cancel=()=>request.abort();
 if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 try{
  const json=await withDeadline((async()=>{
   const response=await fetcher(url,{signal:request.signal});if(!response.ok)throw new Error('Castle motion manifest unavailable');
   return response.json();
  })(),{signal,timers,timeout,onTimeout:cancel});
  const entries=json.monsters||json;
  return Object.fromEntries(CASTLE_CAST.flatMap(({id})=>{
   const entry=entries[id];if(!entry?.runtimeReady||!entry.frames?.length)return [];
   return [[id,{...entry,src:new URL(entry.castleSrc||entry.src,url).href,frames:entry.castleFrames||entry.frames}]];
  }));
 }finally{signal?.removeEventListener('abort',cancel);}
}
/** Optional residents are bounded independently; no late image can restart a
 * hidden/destroyed scene, and decoding failures keep the existing illustration. */
export function loadPalaceActorImage(src,{ImageClass=globalThis.Image,signal,timers=globalThis,timeout=10000}={}){
 return new Promise((resolve,reject)=>{
  const image=new ImageClass();let settled=false,timer=null;
  const finish=(error)=>{if(settled)return;settled=true;timers.clearTimeout(timer);signal?.removeEventListener('abort',cancel);image.onload=image.onerror=null;if(error){image.removeAttribute?.('src');reject(error);}else resolve(image);};
  const cancel=()=>finish(new Error('Castle artwork cancelled'));
  image.onload=()=>{if(!image.naturalWidth){finish(new Error('Castle artwork unavailable'));return;}if(typeof image.decode==='function')Promise.resolve().then(()=>image.decode()).then(()=>finish(),error=>finish(error));else finish();};
  image.onerror=()=>finish(new Error('Castle artwork unavailable'));
  image.decoding='async';image.fetchPriority='low';
  if(signal?.aborted){cancel();return;}
  signal?.addEventListener('abort',cancel,{once:true});
  timer=timers.setTimeout(()=>finish(new Error('Castle artwork deadline exceeded')),timeout);
  image.src=src;
 });
}
export function initPalaceLivingScene(root,{atlases=null,loadImage,loadRigLibrary=()=>import('./maze/rig-animation.js?v=20261017-rig2')}={}){
  const palace=root?.querySelector?.('#palace-entrance');
  if(!palace||palace.dataset.livingScene)return null;
  const doc=root.ownerDocument,win=doc.defaultView;
  if(!win?.requestAnimationFrame)return null;
  palace.dataset.livingScene='loading';
  const stylesheet=doc.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('./palace-living-scene.css?v=20261016-living1',import.meta.url).href;doc.head.append(stylesheet);
  const canvas=doc.createElement('canvas');canvas.className='palace-living-cast';canvas.setAttribute('aria-hidden','true');palace.append(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx){canvas.remove();stylesheet.remove();delete palace.dataset.livingScene;return null;}
  const atmosphere=doc.createElement('div');atmosphere.className='palace-living-air';atmosphere.setAttribute('aria-hidden','true');
  for(const className of ['palace-light-shaft','palace-ground-mist','palace-threshold-light']){const layer=doc.createElement('i');layer.className=className;atmosphere.append(layer);}palace.append(atmosphere);
  const media=win.matchMedia('(prefers-reduced-motion: reduce)');
  const images=new Map(),rigSprites=new Map(),replaced=new Map();
  const timers=win.setTimeout?{setTimeout:(fn,delay)=>win.setTimeout(fn,delay),clearTimeout:id=>win.clearTimeout(id)}:globalThis;
  let frame=0,last=0,time=0,width=1,height=1,disposed=false,suspended=false,generation=0;
  let assetsJob=null,assetsAbort=null,assetsGeneration=0,assetsLoaded=false,rigs=null,rigJob=null,rigAbort=null,rigGeneration=0;
  let resolveReady;const ready=new Promise(resolve=>{resolveReady=resolve;});
  const visible=()=>!disposed&&!suspended&&!doc.hidden&&doc.body.dataset.pageHidden!=='true'&&!root.hidden&&!palace.hidden&&root.dataset.palaceState==='palace'&&!doc.querySelector('dialog[open]');
  const moving=()=>visible()&&root.dataset.motionPaused!=='true'&&doc.body.dataset.ambientPaused!=='true'&&!media.matches;
  const active=()=>moving()&&(images.size>0||rigSprites.size>0);
  function markArtwork(id){
   const old=palace.querySelector(`.palace-path-walkers .path-${id}`);
   if(old){if(!replaced.has(old))replaced.set(old,{hidden:old.hidden,id});old.hidden=true;}
  }
  function statusArtwork(){
   const count=CASTLE_CAST.filter(({id})=>images.has(id)||rigSprites.has(id)).length;
   palace.dataset.livingScene=count===CASTLE_CAST.length?'ready':count?'partial':assetsLoaded?'fallback':'loading';
   for(const id of ['ghost','bat']){const key=id==='ghost'?'livingGhost':'livingBat';if(images.has(id)||rigSprites.has(id))palace.dataset[key]='ready';else delete palace.dataset[key];}
  }
  function draw(dt=0){
   if(!visible()){ctx.clearRect(0,0,width,height);return;}
   const rendered=drawCastleCast(ctx,images,time,width,height,{rigs,rigSprites,dt,motion:moving()});
   for(const [element,record]of replaced)if(!rendered.has(record.id))element.hidden=record.hidden;
   for(const id of rendered)markArtwork(id);statusArtwork();
  }
  function resize(){const rect=palace.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);const dpr=Math.min(win.devicePixelRatio||1,1.5,Math.sqrt(1200000/(width*height)));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  function tick(stamp,token){if(token!==generation)return;frame=0;if(!active())return;if(!last)last=stamp;if(stamp-last>=30){const dt=Math.min((stamp-last)/1000,.06);time+=dt;last=stamp;draw(dt);}frame=win.requestAnimationFrame(stamp=>tick(stamp,token));}
  function stop(){generation++;win.cancelAnimationFrame(frame);frame=0;last=0;}
  function sync(){
   if(visible()){startAssets();startRigs();draw();}
   if(!active()){stop();}else if(!frame){last=0;const token=generation;frame=win.requestAnimationFrame(stamp=>tick(stamp,token));}
  }
  function startAssets(){
   if(!visible()||assetsLoaded||assetsJob)return;
   const request=new AbortController(),token=++assetsGeneration;assetsAbort=request;
   assetsJob=(async()=>{
    let layouts;
    try{layouts=atlases||await loadCastleMotionManifest(win.fetch.bind(win),{signal:request.signal,timers});}catch{layouts={};}
    if(disposed||request.signal.aborted||token!==assetsGeneration)return [];
    const results=await Promise.all(CASTLE_CAST.map(async actor=>{
     if(images.has(actor.id))return true;const layout=layouts[actor.id];if(!layout)return false;
     try{
      const src=new URL(layout.src,import.meta.url).href;
      const operation=Promise.resolve(loadImage?loadImage(src,{signal:request.signal}):loadPalaceActorImage(src,{ImageClass:win.Image,signal:request.signal,timers})).then(image=>{
       if(disposed||request.signal.aborted||token!==assetsGeneration){image?.close?.();return null;}return image;
      });
      const image=await withDeadline(operation,{signal:request.signal,timers,timeout:10000});
      if(!image)return false;
      if(disposed||request.signal.aborted||token!==assetsGeneration){image?.close?.();return false;}
      images.set(actor.id,{image,layout});if(visible()){draw();sync();}return true;
     }catch{return false;}
    }));
    if(disposed||request.signal.aborted||token!==assetsGeneration)return results;
    assetsLoaded=true;statusArtwork();resolveReady(results);return results;
   })().finally(()=>{if(token===assetsGeneration){assetsJob=null;assetsAbort=null;}});
  }
  function startRigs(){
   if(!visible()||!loadRigLibrary||rigs||rigJob)return;
   const token=++rigGeneration,request=new AbortController();rigAbort=request;
   rigJob=withDeadline(Promise.resolve().then(loadRigLibrary),{signal:request.signal,timers,timeout:8000}).then(module=>{
    if(disposed||token!==rigGeneration||!visible()||!module?.createRigLibrary)return null;
    const instance=module.createRigLibrary({maxActive:16,maxSourceBytes:64*1024*1024,timers,
     fetcher:typeof win.fetch==='function'?win.fetch.bind(win):globalThis.fetch,
     loadImage:(src,{signal}={})=>loadPalaceActorImage(src,{ImageClass:win.Image,signal,timers}),
     makeCanvas:(w,h)=>{const c=doc.createElement('canvas');c.width=w;c.height=h;return c;},
     onChange:()=>{if(token===rigGeneration&&visible())sync();},
    });
    if(disposed||token!==rigGeneration){instance.destroy();return null;}
    rigs=instance;
    return Promise.resolve(instance.ready).then(()=>{if(token===rigGeneration&&visible())sync();return instance;});
   }).catch(()=>{if(token===rigGeneration){rigs?.destroy();rigs=null;rigSprites.clear();}return null;}).finally(()=>{if(token===rigGeneration){rigJob=null;rigAbort=null;}});
  }
  function cancelLoads(){assetsGeneration++;assetsAbort?.abort();assetsAbort=null;assetsJob=null;rigGeneration++;rigAbort?.abort();rigAbort=null;rigs?.destroy();rigs=null;rigJob=null;rigSprites.clear();}
  const observer=new win.MutationObserver(sync);observer.observe(root,{attributes:true,attributeFilter:['data-motion-paused','data-palace-state','hidden']});observer.observe(doc.body,{attributes:true,attributeFilter:['data-ambient-paused','data-page-hidden']});doc.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
  const resizeObserver=new win.ResizeObserver(resize);resizeObserver.observe(palace);
  const hide=()=>{suspended=true;stop();cancelLoads();},show=()=>{suspended=false;resize();sync();};
  doc.addEventListener('visibilitychange',sync);media.addEventListener?.('change',sync);win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);
  resize();sync();
  return {ready,draw,get rigsReady(){return rigJob||Promise.resolve(rigs);},status:()=>({disposed,suspended,time,running:Boolean(frame),images:images.size,liveActors:rigSprites.size,rigs:rigs?.status?.()||null}),destroy(){if(disposed)return;disposed=true;cancelLoads();resolveReady([]);stop();observer.disconnect();resizeObserver.disconnect();doc.removeEventListener('visibilitychange',sync);media.removeEventListener?.('change',sync);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);canvas.remove();atmosphere.remove();stylesheet.remove();for(const [element,record]of replaced)element.hidden=record.hidden;for(const record of images.values())record.image?.close?.();images.clear();delete palace.dataset.livingScene;delete palace.dataset.livingGhost;delete palace.dataset.livingBat;}};
}
