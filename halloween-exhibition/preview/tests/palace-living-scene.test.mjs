import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CASTLE_CAST,castleActorPose,castleSafeActorPose,drawCastleCast,initPalaceLivingScene} from '../palace-living-scene.js';
test('castle population has eight distinct illustrated species',()=>{
 assert.equal(new Set(CASTLE_CAST.map(actor=>actor.id)).size,8);
 assert.ok(CASTLE_CAST.some(actor=>actor.id==='mummy'));
 assert.ok(CASTLE_CAST.some(actor=>actor.id==='werewolf'));
});
test('walking advances through four real poses independently of continuous travel',()=>{
 for(const actor of CASTLE_CAST){
  const frames=new Set();for(let i=0;i<600;i++)frames.add(castleActorPose(actor,i/30,390,520).frame);
  assert.equal(frames.size,4,actor.id);
  const a=castleActorPose(actor,5,390,520),b=castleActorPose(actor,5+1/30,390,520);
  assert.ok(Math.abs(a.x-b.x)<1);assert.ok(Math.abs(a.y-b.y)<1);
 }
});
test('residents stay at courtyard sides and out of the gate/caption touch region',()=>{
 for(const [w,h] of [[320,280],[390,580],[844,240],[1440,700]])for(const actor of CASTLE_CAST)for(let t=0;t<60;t+=.25){
  const p=castleActorPose(actor,t,w,h);assert.ok(p.x>0&&p.x<w);assert.ok(p.y>0&&p.y<h);
  assert.ok(p.x<w*.24||p.x>w*.76);assert.ok(Number.isFinite(p.size)&&p.size>0);
 }
});
test('canvas remains decorative and motion lifecycle is bounded',async()=>{
 const js=await readFile(new URL('../palace-living-scene.js',import.meta.url),'utf8');
 const css=await readFile(new URL('../palace-living-scene.css',import.meta.url),'utf8');
 assert.match(js,/setAttribute\('aria-hidden','true'\)/);
 assert.match(js,/root.dataset.palaceState==='palace'/);
 assert.match(js,/!doc.hidden/);assert.match(js,/!media.matches/);
 assert.match(js,/stamp-last>=30/);assert.match(js,/1200000/);
 assert.match(css,/pointer-events:none/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(js,/localStorage|location\.|addEventListener\('click'/);
});

test('frame sampler uses different atlas source cells, stable foot anchors and side mirroring',async()=>{
 const {drawCastleCast}=await import('../palace-living-scene.js');
 const crops=[],positions=[],scales=[];
 const ctx={clearRect(){},save(){},restore(){},translate(x,y){positions.push([x,y]);},scale(x,y){scales.push([x,y]);},beginPath(){},ellipse(){},fill(){},drawImage(...args){crops.push(args.slice(1));}};
 const images=new Map([['franken',{image:{},layout:{frames:[0,1,2,3].map(i=>({frame:[i%2*256,Math.floor(i/2)*256,256,256],contentHeight:220,anchorX:.5,anchorY:.9375}))}}]]);
 for(const time of [0,.16,.32,.48])drawCastleCast(ctx,images,time,390,520);
 assert.equal(new Set(crops.map(c=>`${c[0]},${c[1]}`)).size,4);
 for(const crop of crops){assert.equal(crop[2],256);assert.equal(crop[3],256);assert.ok(crop[4]<0&&crop[5]<0);assert.equal(crop[6],crop[7]);}
 assert.equal(positions.length,4);assert.equal(scales.length,4);
});

test('loading, paused, hidden and destroyed lifecycles do not leave a running animation',async()=>{
 const {initPalaceLivingScene}=await import('../palace-living-scene.js');
 const ctx={clearRect(){},save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},fill(){},drawImage(){},setTransform(){}};
 const observers=[],events=new Map(),mediaEvents=new Map(),pending=new Map();let next=1;
 const el=()=>({dataset:{},style:{},children:[],append(...a){this.children.push(...a);},setAttribute(){},remove(){},getContext:()=>ctx});
 const palace=el(),old=el();palace.getBoundingClientRect=()=>({width:390,height:520});palace.querySelector=()=>old;
 const media={matches:false,addEventListener:(n,f)=>mediaEvents.set(n,f),removeEventListener:n=>mediaEvents.delete(n)};
 const win={Image:class{},devicePixelRatio:2,requestAnimationFrame:f=>{const id=next++;pending.set(id,f);return id;},cancelAnimationFrame:id=>pending.delete(id),matchMedia:()=>media,MutationObserver:class{constructor(f){observers.push(f)}observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const doc={defaultView:win,body:el(),head:el(),createElement:el,hidden:false,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const root={ownerDocument:doc,dataset:{palaceState:'palace'},querySelector:()=>palace};
 const api=initPalaceLivingScene(root,{atlases:{franken:{src:'./fake.webp',frames:[0,1,2,3].map(i=>({frame:[i%2*256,Math.floor(i/2)*256,256,256],anchorX:.5,anchorY:.94,contentHeight:220}))}},loadImage:async()=>({width:512,height:512})});
 await api.ready;assert.equal(palace.dataset.livingScene,'partial');assert.equal(old.hidden,true);assert.equal(pending.size,1);
 root.dataset.motionPaused='true';observers[0]();assert.equal(pending.size,0);
 root.dataset.motionPaused='false';observers[0]();assert.equal(pending.size,1);
 media.matches=true;mediaEvents.get('change')();assert.equal(pending.size,0);
 media.matches=false;mediaEvents.get('change')();assert.equal(pending.size,1);
 doc.hidden=true;events.get('visibilitychange')();assert.equal(pending.size,0);
 doc.hidden=false;events.get('visibilitychange')();assert.equal(pending.size,1);
 const queuedBeforeSuspend=[...pending.values()][0];events.get('pagehide')();assert.equal(pending.size,0);observers[0]();assert.equal(pending.size,0,'observers cannot resume a suspended page');events.get('pageshow')();assert.equal(pending.size,1);queuedBeforeSuspend(100000);assert.equal(pending.size,1,'late old frame cannot multiply the restored loop');events.get('pageshow')();assert.equal(pending.size,1,'page restoration cannot multiply the loop');
 api.destroy();assert.equal(pending.size,0);assert.equal(palace.dataset.livingScene,undefined);
 // A lone flying resident must never erase the three ground-character fallbacks.
 const atlasFrames=[0,1,2,3].map(i=>({frame:[i%2*128,Math.floor(i/2)*128,128,128],anchorX:.5,anchorY:.94,contentHeight:115}));
 for(const allowed of [[],['bat'],CASTLE_CAST.map(a=>a.id).filter(id=>id!=='zombie'),CASTLE_CAST.map(a=>a.id)]){
  const fallbacks={franken:el(),zombie:el(),werewolf:el()};
  palace.querySelector=selector=>Object.entries(fallbacks).find(([id])=>selector===`.palace-path-walkers .path-${id}`)?.[1]||null;
  const atlases=Object.fromEntries(CASTLE_CAST.map(({id})=>[id,{src:`./${id}.webp`,frames:atlasFrames}]));
  const partial=initPalaceLivingScene(root,{atlases,loadImage:async src=>{if(!allowed.some(id=>src.endsWith(`/${id}.webp`)))throw new Error('asset failed');return {width:256,height:256};}});
  await partial.ready;assert.equal(palace.dataset.livingScene,allowed.length===8?'ready':allowed.length?'partial':'fallback');
  for(const [id,fallback]of Object.entries(fallbacks))assert.equal(Boolean(fallback.hidden),allowed.includes(id),id);
  assert.equal(pending.size,allowed.length?1:0);partial.destroy();for(const fallback of Object.values(fallbacks))assert.equal(Boolean(fallback.hidden),false);
 }
});

test('entrance fetches only approved small derivatives from the shared local manifest',async()=>{
 const {loadCastleMotionManifest}=await import('../palace-living-scene.js');
 const frames=[0,1,2,3].map(i=>({frame:[i%2*128,Math.floor(i/2)*128,128,128],anchorX:.5,anchorY:.95,contentHeight:116}));
 let fetched;
 const entries=await loadCastleMotionManifest(async url=>{fetched=url.href;return {ok:true,json:async()=>({franken:{runtimeReady:true,src:'franken-walk.webp',castleSrc:'franken-castle.webp',frames:[],castleFrames:frames},zombie:{runtimeReady:false,src:'zombie-walk.webp',frames}})};});
 // A complete full-size frame contract is required before any derivative is used.
 assert.deepEqual(entries,{});
 const approved=await loadCastleMotionManifest(async()=>({ok:true,json:async()=>({monsters:{franken:{runtimeReady:true,src:'franken-walk.webp',castleSrc:'franken-castle.webp',frames,castleFrames:frames}}})}));
 assert.ok(fetched.endsWith('/maze/assets/rpg/animated/monster-motion.json?v=20261016-living1'));
 assert.ok(approved.franken.src.endsWith('/maze/assets/rpg/animated/franken-castle.webp'));assert.equal(approved.franken.frames,frames);
 await assert.rejects(loadCastleMotionManifest(async()=>({ok:false})),/unavailable/);
});

test('native-left and native-right artwork both face their direction of travel',async()=>{
 const {drawCastleCast}=await import('../palace-living-scene.js');
 const scales=[];const ctx={clearRect(){},save(){},restore(){},translate(){},scale(x){scales.push(x);},beginPath(){},ellipse(){},fill(){},drawImage(){}};
 const frames=[0,1,2,3].map(i=>({frame:[i%2*128,Math.floor(i/2)*128,128,128],anchorX:.5,anchorY:.95,contentHeight:116}));
 for(const time of [0,10]){
  const pose=castleActorPose(CASTLE_CAST[0],time,390,520);
  for(const faces of ['left','right']){
   drawCastleCast(ctx,new Map([['franken',{image:{},layout:{faces,frames}}]]),time,390,520);
   const reflected=scales.at(-1)<0;
   const drawnFacingLeft=(faces==='left')!==reflected;
   assert.equal(drawnFacingLeft,pose.flip);
  }
 }
});

test('every full pose-cell silhouette stays inside both edges with stable continuous paths',async()=>{
 const {castleSafeActorPose}=await import('../palace-living-scene.js');
 const manifest=JSON.parse(await readFile(new URL('../maze/assets/rpg/animated/monster-motion.json',import.meta.url),'utf8'));
 for(const [w,h]of [[320,400],[390,580],[844,240],[1440,700]])for(const actor of CASTLE_CAST){
  const layout={...manifest[actor.id],frames:manifest[actor.id].castleFrames};
  for(let time=0;time<60;time+=.1){
   const pose=castleSafeActorPose(actor,time,w,h,layout);
   for(const frame of layout.frames){
    const drawWidth=pose.size*frame.frame[2]/frame.contentHeight;
    const extent=drawWidth*Math.max(frame.anchorX,1-frame.anchorX);
    assert.ok(pose.x-extent>=3.99,`${actor.id} left ${w}`);
    assert.ok(pose.x+extent<=w-3.99,`${actor.id} right ${w}`);
   }
   const next=castleSafeActorPose(actor,time+1/30,w,h,layout);
   assert.ok(Math.abs(next.x-pose.x)<w*.002,actor.id);
  }
 }
});

test('optional resident manifest has a real deadline even when fetch ignores abort',async()=>{
 const {loadCastleMotionManifest}=await import('../palace-living-scene.js');const tasks=new Map();let id=0,signal;
 const timers={setTimeout:fn=>{tasks.set(++id,fn);return id;},clearTimeout:id=>tasks.delete(id)};
 const wait=loadCastleMotionManifest(async(_url,options)=>{signal=options.signal;return new Promise(()=>{});},{timers});
 const rejected=assert.rejects(wait,/deadline/);[...tasks.values()][0]();await rejected;
 assert.equal(signal.aborted,true);assert.equal(tasks.size,0);
});
test('resident image failure, stalled decode and cancellation clear all handlers and deadlines',async()=>{
 const {loadPalaceActorImage}=await import('../palace-living-scene.js');
 for(const mode of ['decode','abort','error']){
  const tasks=new Map();let image,id=0;const abort=new AbortController();
  class ImageClass{constructor(){image=this;this.naturalWidth=800;}decode(){return new Promise(()=>{});}removeAttribute(){this.removed=true;}}
  const timers={setTimeout:fn=>{tasks.set(++id,fn);return id;},clearTimeout:id=>tasks.delete(id)};
  const wait=loadPalaceActorImage('./resident.webp',{ImageClass,timers,signal:abort.signal});const rejected=assert.rejects(wait,/cancelled|deadline|unavailable/);
  if(mode==='decode'){image.onload();await Promise.resolve();[...tasks.values()][0]();}
  if(mode==='abort')abort.abort();if(mode==='error')image.onerror();await rejected;
  assert.equal(tasks.size,0);assert.equal(image.onload,null);assert.equal(image.onerror,null);assert.equal(image.removed,true);
 }
});

test('rig heading and travel come from the derivative of the actual clamped world path',()=>{
 const layout={frames:[{frame:[0,0,320,320],contentHeight:190,anchorX:.5,anchorY:.94}]};
 for(const actor of CASTLE_CAST)for(const [w,h]of[[320,400],[1440,700]])for(const time of[0,.37,2.1,6.7]){
  const pose=castleSafeActorPose(actor,time,w,h,layout),before=castleSafeActorPose(actor,time-1e-4,w,h,layout),after=castleSafeActorPose(actor,time+1e-4,w,h,layout);
  const vx=(after.x-before.x)/2e-4,vz=(after.y-before.y)/2e-4/.78;
  assert.ok(Math.abs(pose.velocity.x-vx)<1e-6,actor.id+' screen x derivative');
  assert.ok(Math.abs(pose.velocity.y/.78-vz)<1e-6,actor.id+' ground z derivative');
  assert.ok(Math.abs(Math.sin(pose.heading-Math.atan2(vx,vz)))<1e-6,actor.id+' heading');
 }
 const actor=CASTLE_CAST[0],turn=(Math.PI/2-actor.phase)*actor.period/(Math.PI*2);
 assert.equal(castleActorPose(actor,turn,390,520).moving,false,'a stopped turnaround does not walk in place');
});

test('real articulated canvases use actual world positions, remain unmirrored and retain legacy fallback',()=>{
 const updates=[],draws=[],mirrors=[],prunes=[],live={width:320,height:320},old={width:256,height:256};
 let at=[0,0],mirror=1;const stack=[];
 const ctx={clearRect(){},save(){stack.push([at,mirror]);},restore(){[at,mirror]=stack.pop();},translate(x,y){at=[at[0]+x,at[1]+y];},scale(x){mirror*=x;mirrors.push(x);},beginPath(){},ellipse(){},fill(){},drawImage(image,...args){draws.push({image,args,at,mirror});}};
 const sprite={image:live,frame:[0,0,320,320],contentHeight:190,anchorX:.5,anchorY:.94,poseVersion:1};
 const rigs={update(id,options){updates.push({id,options});return id==='monster:franken'?sprite:null;},prune(options){prunes.push(options);}};
 const images=new Map([['zombie',{image:old,layout:{frames:[{frame:[0,0,256,256],contentHeight:220,anchorX:.5,anchorY:.94}]}}]]),rigSprites=new Map();
 for(const time of[1,1.04])drawCastleCast(ctx,images,time,390,520,{rigs,rigSprites,dt:.04,motion:true});
 const frames=draws.filter(d=>d.image===live);assert.equal(frames.length,2);assert.ok(frames.every(d=>d.mirror===1));assert.ok(draws.some(d=>d.image===old));assert.equal(rigSprites.get('franken').image,live);
 for(const frame of frames){const update=updates.filter(u=>u.id==='monster:franken'&&Math.abs(u.options.position.x-frame.at[0])<1e-6&&Math.abs(u.options.position.z*.78-frame.at[1])<1e-6).at(-1);assert.ok(update);assert.equal(update.options.worldPixelsPerUnit,1);assert.equal(update.options.groundDepthScale,.78);assert.ok(update.options.displayHeightPx>0);assert.equal(update.options.moving,true);}
 assert.ok(Math.abs(updates.filter(u=>u.id==='monster:franken').reduce((sum,u)=>sum+u.options.dt,0)-.08)<1e-9,'first canvas fitting never advances a rig clock twice');
 assert.deepEqual(prunes[0].activeIds,CASTLE_CAST.map(a=>'monster:'+a.id));
 updates.length=0;drawCastleCast(ctx,images,1.04,390,520,{rigs,rigSprites,dt:1,motion:false});assert.ok(updates.every(u=>u.options.motion===false&&u.options.moving===false&&u.options.dt===0));
});

function livingFixture({visible=true,timers=null}={}){
 const observers=[],events=new Map(),mediaEvents=new Map(),pending=new Map(),draws=[];let next=1;
 const ctx={clearRect(){},save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},fill(){},drawImage(image){draws.push(image);},setTransform(){}};
 const el=()=>({dataset:{},style:{},children:[],hidden:false,append(...a){this.children.push(...a);},setAttribute(){},remove(){this.removed=true;},getContext:()=>ctx});
 const palace=el(),fallbacks=Object.fromEntries(CASTLE_CAST.map(({id})=>[id,el()]));palace.getBoundingClientRect=()=>({width:390,height:520});palace.querySelector=selector=>Object.entries(fallbacks).find(([id])=>selector===`.palace-path-walkers .path-${id}`)?.[1]||null;
 const media={matches:false,addEventListener:(n,f)=>mediaEvents.set(n,f),removeEventListener:n=>mediaEvents.delete(n)};
 const win={Image:class{},devicePixelRatio:1,requestAnimationFrame:f=>{const id=next++;pending.set(id,f);return id;},cancelAnimationFrame:id=>pending.delete(id),matchMedia:()=>media,MutationObserver:class{constructor(f){observers.push(f);}observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n),setTimeout:timers?.setTimeout||globalThis.setTimeout,clearTimeout:timers?.clearTimeout||globalThis.clearTimeout};
 const doc={defaultView:win,body:el(),head:el(),createElement:el,hidden:false,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const root={ownerDocument:doc,hidden:false,dataset:{palaceState:visible?'palace':'gallery'},querySelector:()=>palace};
 const step=stamp=>{const [id,fn]=pending.entries().next().value;pending.delete(id);fn(stamp);};
 return {root,palace,doc,win,media,mediaEvents,events,observers,pending,fallbacks,draws,step};
}
const flushLiving=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fakeRigModule(records){return{createRigLibrary(options){const sprite={image:{width:256,height:320},frame:[0,0,256,320],contentHeight:250,anchorX:.5,anchorY:.94,poseVersion:0},record={options,updates:[],destroyed:0,sprite};records.push(record);return{ready:Promise.resolve(true),update(id,options){record.updates.push({id,...options});if(id!=='monster:franken')return null;sprite.poseVersion++;return sprite;},prune(){},status:()=>({active:1,sourceBytes:4*1024*1024}),destroy(){record.destroyed++;}};}};}

test('entrance rigs load only while visible and freeze neutral on pause without hidden clocks',async()=>{
 const f=livingFixture({visible:false}),records=[];let imports=0,oldLoads=0;
 const api=initPalaceLivingScene(f.root,{atlases:{zombie:{src:'./zombie.webp',frames:[{frame:[0,0,128,128],contentHeight:116}]}},loadImage:async()=>{oldLoads++;return{};},loadRigLibrary:async()=>{imports++;return fakeRigModule(records);}});
 await flushLiving();assert.equal(imports,0);assert.equal(oldLoads,0);assert.equal(f.pending.size,0);
 f.root.dataset.palaceState='palace';f.observers[0]();await api.ready;await api.rigsReady;await flushLiving();
 assert.equal(imports,1);assert.equal(oldLoads,1);assert.equal(records[0].options.maxActive,16);assert.equal(records[0].options.maxSourceBytes,64*1024*1024);assert.equal(f.fallbacks.franken.hidden,true);assert.equal(f.fallbacks.zombie.hidden,true);assert.equal(f.fallbacks.werewolf.hidden,false);assert.equal(f.pending.size,1);
 f.step(100);f.step(140);assert.equal(api.status().time,.04);assert.ok(records[0].updates.some(u=>u.dt===.04&&u.moving));
 f.root.dataset.motionPaused='true';f.observers[0]();assert.equal(f.pending.size,0);assert.equal(api.status().time,.04);assert.ok(records[0].updates.slice(-8).every(u=>u.motion===false&&u.moving===false&&u.dt===0));
 const pausedImage=records[0].sprite.image;api.draw();assert.equal(records[0].sprite.image,pausedImage);
 f.root.dataset.motionPaused='false';f.media.matches=true;f.mediaEvents.get('change')();assert.equal(f.pending.size,0);assert.equal(api.status().time,.04);
 const updateCount=records[0].updates.length;f.doc.hidden=true;f.events.get('visibilitychange')();api.draw();assert.equal(records[0].updates.length,updateCount);assert.equal(f.pending.size,0);
 f.doc.hidden=false;f.media.matches=false;f.events.get('visibilitychange')();assert.equal(f.pending.size,1);assert.equal(api.status().time,.04);
 const oldFrame=[...f.pending.values()][0];f.events.get('pagehide')();assert.equal(records[0].destroyed,1);assert.equal(f.pending.size,0);f.observers[0]();assert.equal(f.pending.size,0);
 f.events.get('pageshow')();await api.rigsReady;await flushLiving();assert.equal(imports,2);assert.equal(records.length,2);assert.equal(f.pending.size,1);oldFrame(100000);assert.equal(f.pending.size,1,'a stale pre-BFCache frame cannot start another loop');assert.equal(api.status().time,.04);
 api.destroy();api.destroy();assert.equal(records[1].destroyed,1);assert.equal(f.pending.size,0);assert.equal(f.fallbacks.franken.hidden,false);assert.equal(f.fallbacks.zombie.hidden,false);
});

test('stale rig imports and abort-ignoring images cannot populate a suspended or destroyed entrance',async()=>{
 const f=livingFixture(),records=[];let finishImport,finishImage,imageSignal;
 const image={closed:0,close(){this.closed++;}};
 const api=initPalaceLivingScene(f.root,{atlases:{franken:{src:'./franken.webp',frames:[{frame:[0,0,128,128],contentHeight:116}]}},loadImage:(_src,{signal})=>{imageSignal=signal;return new Promise(resolve=>{finishImage=resolve;});},loadRigLibrary:()=>new Promise(resolve=>{finishImport=resolve;})});
 await flushLiving();const pendingRig=api.rigsReady;f.events.get('pagehide')();assert.equal(imageSignal.aborted,true);finishImage(image);finishImport(fakeRigModule(records));await pendingRig;await flushLiving();assert.equal(records.length,0);assert.equal(image.closed,1);assert.equal(api.status().images,0);assert.equal(f.fallbacks.franken.hidden,false);assert.equal(f.pending.size,0);
 api.destroy();assert.deepEqual(await api.ready,[]);assert.equal(f.pending.size,0);
});

test('stalled optional rig module has a deadline and preserves the existing fallback',async()=>{
 const tasks=new Map();let next=0;const timers={setTimeout:fn=>{const id=++next;tasks.set(id,fn);return id;},clearTimeout:id=>tasks.delete(id)};
 const f=livingFixture({timers}),api=initPalaceLivingScene(f.root,{atlases:{},loadRigLibrary:()=>new Promise(()=>{})});
 await api.ready;assert.equal(tasks.size,1);const ready=api.rigsReady;[...tasks.values()][0]();assert.equal(await ready,null);assert.equal(tasks.size,0);assert.equal(f.fallbacks.franken.hidden,false);assert.equal(f.palace.dataset.livingScene,'fallback');assert.equal(f.pending.size,0);api.destroy();
});
