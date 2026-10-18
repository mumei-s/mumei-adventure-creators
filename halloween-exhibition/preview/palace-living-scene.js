/** Original illustrated residents, with articulated poses and continuous paths.
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
export function castleActorPose(actor,time,width,height){
  const angle=time*Math.PI*2/actor.period+actor.phase;
  const progress=(1+Math.sin(angle))/2;
  const flying=actor.id==='ghost'||actor.id==='bat';
  const depth=actor.lane>=3?.65:1-actor.lane*.12;
  const center=actor.side<0?.115:.885;
  const x=width*(center+actor.side*Math.sin(angle)*.052);
  const y=height*(flying?(actor.id==='bat'?.28:.59)+Math.sin(angle*.8)*.038:.94-actor.lane*.105-progress*.055);
  const size=Math.min(115,height*.25,Math.max(38,width*.19))*actor.size*depth;
  const vx=width*actor.side*Math.cos(angle)*.052;
  const vy=height*(flying?Math.cos(angle*.8)*.8*.038:-Math.cos(angle)*.0275);
  return {x,y,size,heading:Math.atan2(vx,vy/.38),flip:Math.cos(angle)*actor.side<0,depth,progress};
}

/** A species keeps one stable path envelope across its entire pose cycle.
 * Full source-cell extents are conservative, so opaque limbs cannot clip edges. */
export function castleSafeActorPose(actor,time,width,height,layout){
 const pose=castleActorPose(actor,time,width,height);
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
 return {...pose,x:center+wave*amplitude};
}

export function drawCastleCast(ctx,images,time,width,height,rigs=null){
    ctx.clearRect(0,0,width,height);
    const cast=CASTLE_CAST.map(actor=>({actor,pose:castleSafeActorPose(actor,time,width,height,images.get(actor.id)?.layout)})).sort((a,b)=>a.pose.y-b.pose.y);
    for(const {actor,pose} of cast){
      const record=images.get(actor.id);if(!record&&!rigs?.has?.(actor.id))continue;
      ctx.save();ctx.translate(pose.x,pose.y);
      if(actor.id!=='ghost'&&actor.id!=='bat'){
        ctx.fillStyle='rgba(14,9,24,.35)';ctx.beginPath();ctx.ellipse(0,0,pose.size*.23,pose.size*.045,0,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
      if(rigs?.draw(ctx,actor.id,pose,time,width,height))continue;
      if(!record)continue;
      // Keep one authored silhouette while its articulated parts load. Swapping
      // whole-body atlas cells at 5–7 fps caused the visible stop-motion effect.
      const {image,layout}=record,source=layout.frames[layout.idleFrame??0]||layout.frames[0];
      const [sourceX,sourceY,sourceW,sourceH]=source.frame;
      const drawHeight=pose.size*sourceH/(source.contentHeight||sourceH*.88);
      const drawWidth=drawHeight*sourceW/sourceH;
      ctx.save();ctx.translate(pose.x,pose.y);
      ctx.scale(pose.flip!==(layout.faces==='left')?-1:1,1);
      ctx.drawImage(image,sourceX,sourceY,sourceW,sourceH,-drawWidth*(source.anchorX??.5),-drawHeight*(source.anchorY??.94),drawWidth,drawHeight);
      ctx.restore();
    }
  }

// The small original atlases remain the immediate and failure-safe display.
export const CASTLE_ATLAS_BASE = './maze/assets/rpg/animated/';
export async function loadCastleMotionManifest(fetcher=globalThis.fetch){
 const url=new URL(`${CASTLE_ATLAS_BASE}monster-motion.json?v=20261016-living1`,import.meta.url);
 const response=await fetcher(url);if(!response.ok)throw new Error('Castle motion manifest unavailable');
 const json=await response.json(),entries=json.monsters||json;
 return Object.fromEntries(CASTLE_CAST.flatMap(({id})=>{
  const entry=entries[id];if(!entry?.runtimeReady||!entry.frames?.length)return [];
  return [[id,{...entry,src:new URL(entry.castleSrc||entry.src,url).href,frames:entry.castleFrames||entry.frames}]];
 }));
}
export function initPalaceLivingScene(root,{atlases=null,loadImage}={}){
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
  const images=new Map(),replaced=new Map();let frame=0,last=null,time=0,width=1,height=1,disposed=false,rigs=null,pageHidden=false;
  const active=()=>(images.size>0||rigs?.status().loaded>0)&&!disposed&&!pageHidden&&!doc.hidden&&!root.hidden&&!palace.hidden&&root.dataset.motionPaused!=='true'&&doc.body.dataset.ambientPaused!=='true'&&!media.matches&&root.dataset.palaceState==='palace'&&!doc.querySelector('dialog[open]');
  function residentReady(id){
    const old=palace.querySelector(`.palace-path-walkers .path-${id}`);if(old){if(!replaced.has(old))replaced.set(old,old.hidden);old.hidden=true;}
    if(id==='ghost')palace.dataset.livingGhost='ready';if(id==='bat')palace.dataset.livingBat='ready';
    const count=CASTLE_CAST.filter(actor=>images.has(actor.id)||rigs?.has?.(actor.id)).length;
    palace.dataset.livingScene=count===CASTLE_CAST.length?'ready':'partial';draw();sync();
  }
  function draw(){drawCastleCast(ctx,images,time,width,height,rigs);}
  function resize(){const rect=palace.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);const dpr=Math.min(win.devicePixelRatio||1,1.5,Math.sqrt(1200000/(width*height)));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  function tick(stamp){frame=0;if(!active())return;const dt=last===null?0:Math.max(0,Math.min((stamp-last)/1000,.06));last=stamp;time+=dt;draw();frame=win.requestAnimationFrame(tick);}
  function stop(){win.cancelAnimationFrame(frame);frame=0;last=null;}
  function pageHide(){pageHidden=true;stop();}
  function pageShow(){pageHidden=false;sync();}
  function sync(){if(!active()){stop();draw();}else if(!frame){last=null;frame=win.requestAnimationFrame(tick);}}
  const load=loadImage||((src,{signal}={})=>new Promise((resolve,reject)=>{const image=new win.Image();const cancel=()=>finish(Error('Courtyard image cancelled'));const finish=error=>{image.onload=image.onerror=null;signal?.removeEventListener('abort',cancel);if(error){image.removeAttribute?.('src');reject(error);}else resolve(image);};image.onload=()=>finish();image.onerror=()=>finish(Error('Courtyard image unavailable'));image.decoding='async';image.fetchPriority='low';if(signal?.aborted){cancel();return;}signal?.addEventListener('abort',cancel,{once:true});image.src=src;}));
  const manifest=atlases?Promise.resolve(atlases):loadCastleMotionManifest(win.fetch.bind(win)).catch(()=>({}));
  const ready=manifest.then(atlases=>Promise.all(CASTLE_CAST.map(async actor=>{
    const layout=atlases[actor.id];if(!layout)return false;
    try{const image=await load(new URL(layout.src,import.meta.url).href);if(disposed)return false;images.set(actor.id,{image,layout});
      // Remove the old polygon wolf/static rocking cutouts only after real artwork arrives.
      residentReady(actor.id);return true;
    }catch{return false;}
  }))).then(results=>{if(!disposed){const count=CASTLE_CAST.filter(actor=>images.has(actor.id)||rigs?.has?.(actor.id)).length;palace.dataset.livingScene=count===CASTLE_CAST.length?'ready':count?'partial':'fallback';}return results;});
  // Reuse only the articulated drawing helpers and already approved body parts.
  // Keep game initialization and the registry for other characters out of TOP.
  const continuousReady=(async()=>{
   if(disposed||typeof win.fetch!=='function')return;
   // Start in parallel with legacy thumbnails; neither their manifest nor a
   // stalled thumbnail may hold back a ready articulated resident.
   try{const {createPalaceCastRigs}=await import('./palace-cast-rig.js?v=20261019-unified1');if(disposed)return;
    rigs=createPalaceCastRigs({fetcher:win.fetch.bind(win),loadImage:load,onChange(id){if(!disposed)residentReady(id);}});await rigs.ready;
   }catch{ /* The original local atlases remain available. */ }
  })();
  const observer=new win.MutationObserver(sync);observer.observe(root,{attributes:true,attributeFilter:['data-motion-paused','data-palace-state','hidden']});observer.observe(doc.body,{attributes:true,attributeFilter:['data-ambient-paused']});doc.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
  const resizeObserver=new win.ResizeObserver(resize);resizeObserver.observe(palace);
  doc.addEventListener('visibilitychange',sync);media.addEventListener?.('change',sync);win.addEventListener('pagehide',pageHide);win.addEventListener('pageshow',pageShow);
  resize();sync();
  return {ready,continuousReady,draw,destroy(){disposed=true;win.cancelAnimationFrame(frame);rigs?.destroy();observer.disconnect();resizeObserver.disconnect();doc.removeEventListener('visibilitychange',sync);media.removeEventListener?.('change',sync);win.removeEventListener('pagehide',pageHide);win.removeEventListener('pageshow',pageShow);canvas.remove();atmosphere.remove();stylesheet.remove();for(const [element,hidden]of replaced)element.hidden=hidden;delete palace.dataset.livingScene;delete palace.dataset.livingGhost;delete palace.dataset.livingBat;}};
}
