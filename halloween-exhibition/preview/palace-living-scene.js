/** Original illustrated residents, with independent pose frames and continuous paths.
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
  const size=Math.min(115,height*.25,Math.max(38,width*.19))*actor.size*depth;
  const moving=Math.abs(Math.cos(angle))>.12;
  return {x,y,size,flip:Math.cos(angle)*actor.side<0,frame:moving?Math.floor(time*fps+actor.phase)%frameCount:0,depth,progress};
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
 return {...pose,x:center+wave*amplitude};
}

export function drawCastleCast(ctx,images,time,width,height){
    ctx.clearRect(0,0,width,height);
    const cast=CASTLE_CAST.map(actor=>({actor,pose:castleSafeActorPose(actor,time,width,height,images.get(actor.id)?.layout)})).sort((a,b)=>a.pose.y-b.pose.y);
    for(const {actor,pose} of cast){
      const record=images.get(actor.id);if(!record)continue;
      const {image,layout}=record;
      const frameIndex=(layout.walkFrames||[0,1,2,3])[pose.frame]??layout.idleFrame??0;
      const source=layout.frames[frameIndex]||layout.frames[0];
      const [sourceX,sourceY,sourceW,sourceH]=source.frame;
      const drawHeight=pose.size*sourceH/(source.contentHeight||sourceH*.88);
      const drawWidth=drawHeight*sourceW/sourceH;
      ctx.save();ctx.translate(pose.x,pose.y);
      if(actor.id!=='ghost'&&actor.id!=='bat'){
        ctx.fillStyle='rgba(14,9,24,.35)';ctx.beginPath();ctx.ellipse(0,0,pose.size*.23,pose.size*.045,0,0,Math.PI*2);ctx.fill();
      }
      ctx.scale(pose.flip!==(layout.faces==='left')?-1:1,1);
      ctx.drawImage(image,sourceX,sourceY,sourceW,sourceH,-drawWidth*(source.anchorX??.5),-drawHeight*(source.anchorY??.94),drawWidth,drawHeight);
      ctx.restore();
    }
  }

// Kept local so the entrance does not initialize or download the game runtime.
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
  const images=new Map(),replaced=[];let frame=0,last=0,time=0,width=1,height=1,disposed=false;
  const active=()=>images.size>0&&!disposed&&!doc.hidden&&!root.hidden&&!palace.hidden&&root.dataset.motionPaused!=='true'&&doc.body.dataset.ambientPaused!=='true'&&!media.matches&&root.dataset.palaceState==='palace'&&!doc.querySelector('dialog[open]');
  function draw(){drawCastleCast(ctx,images,time,width,height);}
  function resize(){const rect=palace.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);const dpr=Math.min(win.devicePixelRatio||1,1.5,Math.sqrt(1200000/(width*height)));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  function tick(stamp){frame=0;if(!active())return;if(!last)last=stamp;if(stamp-last>=30){time+=Math.min((stamp-last)/1000,.06);last=stamp;draw();}frame=win.requestAnimationFrame(tick);}
  function stop(){win.cancelAnimationFrame(frame);frame=0;last=0;}
  function sync(){if(!active()){win.cancelAnimationFrame(frame);frame=0;last=0;draw();}else if(!frame){last=0;frame=win.requestAnimationFrame(tick);}}
  const load=loadImage||((src)=>new Promise((resolve,reject)=>{const image=new win.Image();image.onload=()=>resolve(image);image.onerror=reject;image.decoding='async';image.fetchPriority='low';image.src=src;}));
  const manifest=atlases?Promise.resolve(atlases):loadCastleMotionManifest(win.fetch.bind(win)).catch(()=>({}));
  const ready=manifest.then(atlases=>Promise.all(CASTLE_CAST.map(async actor=>{
    const layout=atlases[actor.id];if(!layout)return false;
    try{const image=await load(new URL(layout.src,import.meta.url).href);if(disposed)return false;images.set(actor.id,{image,layout});
      // Remove the old polygon wolf/static rocking cutouts only after real artwork arrives.
      palace.dataset.livingScene='partial';const old=palace.querySelector(`.palace-path-walkers .path-${actor.id}`);if(old){replaced.push([old,old.hidden]);old.hidden=true;}
      if(actor.id==='ghost')palace.dataset.livingGhost='ready';if(actor.id==='bat')palace.dataset.livingBat='ready';draw();sync();return true;
    }catch{return false;}
  }))).then(results=>{if(!disposed)palace.dataset.livingScene=results.every(Boolean)?'ready':results.some(Boolean)?'partial':'fallback';return results;});
  const observer=new win.MutationObserver(sync);observer.observe(root,{attributes:true,attributeFilter:['data-motion-paused','data-palace-state','hidden']});observer.observe(doc.body,{attributes:true,attributeFilter:['data-ambient-paused']});doc.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
  const resizeObserver=new win.ResizeObserver(resize);resizeObserver.observe(palace);
  doc.addEventListener('visibilitychange',sync);media.addEventListener?.('change',sync);win.addEventListener('pagehide',stop);win.addEventListener('pageshow',sync);
  resize();sync();
  return {ready,draw,destroy(){disposed=true;win.cancelAnimationFrame(frame);observer.disconnect();resizeObserver.disconnect();doc.removeEventListener('visibilitychange',sync);media.removeEventListener?.('change',sync);win.removeEventListener('pagehide',stop);win.removeEventListener('pageshow',sync);canvas.remove();atmosphere.remove();stylesheet.remove();for(const [element,hidden]of replaced)element.hidden=hidden;delete palace.dataset.livingScene;delete palace.dataset.livingGhost;delete palace.dataset.livingBat;}};
}
