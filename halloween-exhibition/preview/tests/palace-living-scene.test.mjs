import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CASTLE_CAST,castleActorPose} from '../palace-living-scene.js';
test('castle population has eight distinct illustrated species',()=>{
 assert.equal(new Set(CASTLE_CAST.map(actor=>actor.id)).size,8);
 assert.ok(CASTLE_CAST.some(actor=>actor.id==='mummy'));
 assert.ok(CASTLE_CAST.some(actor=>actor.id==='werewolf'));
});
test('resident paths advance continuously without quantizing the whole-body artwork',()=>{
 for(const actor of CASTLE_CAST){
  for(let frame=0;frame<600;frame++){
   const a=castleActorPose(actor,frame/60,390,520),b=castleActorPose(actor,(frame+1)/60,390,520);
   assert.ok(Math.abs(a.x-b.x)<1,actor.id);assert.ok(Math.abs(a.y-b.y)<1,actor.id);
   assert.ok(Number.isFinite(a.heading),actor.id);
  }
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
 assert.doesNotMatch(js,/stamp-last>=30/);assert.match(js,/1200000/);
 assert.match(css,/pointer-events:none/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(js,/localStorage|location\.|addEventListener\('click'/);
});

test('waiting artwork keeps one authored silhouette and moves on every display frame',async()=>{
 const {drawCastleCast}=await import('../palace-living-scene.js');
 const crops=[],positions=[],scales=[];
 const ctx={clearRect(){},save(){},restore(){},translate(x,y){positions.push([x,y]);},scale(x,y){scales.push([x,y]);},beginPath(){},ellipse(){},fill(){},drawImage(...args){crops.push(args.slice(1));}};
 const images=new Map([['franken',{image:{},layout:{frames:[0,1,2,3].map(i=>({frame:[i%2*256,Math.floor(i/2)*256,256,256],contentHeight:220,anchorX:.5,anchorY:.9375}))}}]]);
 for(const time of [0,1/60,2/60,.16,.32,.48])drawCastleCast(ctx,images,time,390,520);
 assert.equal(new Set(crops.map(c=>`${c[0]},${c[1]}`)).size,1,'never swaps full-body cells at the legacy atlas rate');
 for(const crop of crops){assert.equal(crop[2],256);assert.equal(crop[3],256);assert.ok(crop[4]<0&&crop[5]<0);assert.equal(crop[6],crop[7]);}
 assert.equal(positions.length,12);assert.equal(scales.length,6);
 for(let index=2;index<positions.length;index+=2)assert.notDeepEqual(positions[index],positions[index-2]);
});

test('ready articulated residents render even when their legacy atlas is unavailable',async()=>{
 const {drawCastleCast}=await import('../palace-living-scene.js');
 const drawn=[];const ctx={clearRect(){},save(){},restore(){},translate(){},beginPath(){},ellipse(){},fill(){}};
 const rigs={has:id=>id==='franken',draw(_ctx,id,pose,time){drawn.push({id,pose,time});return true;}};
 for(const time of [0,1/60,2/60])drawCastleCast(ctx,new Map(),time,390,520,rigs);
 assert.equal(drawn.length,3);assert.ok(drawn.every(({id})=>id==='franken'));
 assert.notEqual(drawn[0].pose.x,drawn[1].pose.x);assert.notEqual(drawn[1].pose.x,drawn[2].pose.x);
});

test('articulated loading and its animation lifecycle do not wait for the legacy manifest',async()=>{
 const {initPalaceLivingScene}=await import('../palace-living-scene.js');
 const ctx={globalAlpha:1,clearRect(){},save(){},restore(){},translate(){},scale(){},rotate(){},beginPath(){},ellipse(){},fill(){},drawImage(){},setTransform(){}};
 const observers=[],events=new Map(),pending=new Map();let next=1,parts=0;
 const el=()=>({dataset:{},children:[],append(...items){this.children.push(...items);},setAttribute(){},remove(){},getContext:()=>ctx});
 const palace=el(),old=el();palace.getBoundingClientRect=()=>({width:390,height:520});palace.querySelector=selector=>selector.endsWith('.path-franken')?old:null;
 const media={matches:false,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
 const win={devicePixelRatio:1,requestAnimationFrame:fn=>{const id=next++;pending.set(id,fn);return id;},cancelAnimationFrame:id=>pending.delete(id),matchMedia:()=>media,
  MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}},addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),
  async fetch(url){
   if(String(url).includes('monster-motion.json'))return new Promise(()=>{});
   return {ok:true,json:async()=>JSON.parse(await readFile(new URL(url),'utf8'))};
  }};
 const doc={defaultView:win,body:el(),head:el(),createElement:el,hidden:false,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
 const root={ownerDocument:doc,dataset:{palaceState:'palace'},querySelector:()=>palace};
 const api=initPalaceLivingScene(root,{loadImage:async()=>{parts++;return {width:1024,height:1024};}});
 try{
  await api.continuousReady;
  assert.equal(parts,6,'all six articulated residents load while thumbnail metadata remains stalled');
  assert.equal(old.hidden,true);assert.equal(palace.dataset.livingScene,'partial');assert.equal(pending.size,1);
  for(const [state,event] of [['hidden','visibilitychange'],['paused',null],['pagehide','pagehide']]){
   if(state==='hidden')doc.hidden=true;else if(state==='paused')root.dataset.motionPaused='true';
   if(event)events.get(event)();else observers[0]();assert.equal(pending.size,0,state);
   if(state==='hidden'){doc.hidden=false;events.get(event)();}else if(state==='paused'){root.dataset.motionPaused='false';observers[0]();}else events.get('pageshow')();
   assert.equal(pending.size,1,`${state} resumes one loop`);
  }
  media.matches=true;events.get('change')();assert.equal(pending.size,0);
 }finally{api.destroy();}
 assert.equal(pending.size,0);assert.equal(old.hidden,undefined);
});

test('loading, paused, hidden and destroyed lifecycles do not leave a running animation',async()=>{
 const {initPalaceLivingScene}=await import('../palace-living-scene.js');
 const ctx={clearRect(){},save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},fill(){},drawImage(){},setTransform(){}};
 const observers=[],events=new Map(),mediaEvents=new Map(),pending=new Map();let next=1,draws=0;
 ctx.clearRect=()=>{draws++;};
 const el=()=>({dataset:{},style:{},children:[],append(...a){this.children.push(...a);},setAttribute(){},remove(){},getContext:()=>ctx});
 const palace=el(),old=el();palace.getBoundingClientRect=()=>({width:390,height:520});palace.querySelector=()=>old;
 const media={matches:false,addEventListener:(n,f)=>mediaEvents.set(n,f),removeEventListener:n=>mediaEvents.delete(n)};
 const win={Image:class{},devicePixelRatio:2,requestAnimationFrame:f=>{const id=next++;pending.set(id,f);return id;},cancelAnimationFrame:id=>pending.delete(id),matchMedia:()=>media,MutationObserver:class{constructor(f){observers.push(f)}observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const doc={defaultView:win,body:el(),head:el(),createElement:el,hidden:false,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const root={ownerDocument:doc,dataset:{palaceState:'palace'},querySelector:()=>palace};
 const api=initPalaceLivingScene(root,{atlases:{franken:{src:'./fake.webp',frames:[0,1,2,3].map(i=>({frame:[i%2*256,Math.floor(i/2)*256,256,256],anchorX:.5,anchorY:.94,contentHeight:220}))}},loadImage:async()=>({width:512,height:512})});
 await api.ready;
 const advance=stamp=>{const [id,tick]=pending.entries().next().value;pending.delete(id);tick(stamp);};
 for(const hz of [60,120]){const before=draws;for(let i=0;i<12;i++)advance(1000+i*1000/hz);assert.equal(draws-before,12,`${hz}Hz draws on every presented frame`);}
 assert.equal(palace.dataset.livingScene,'partial');assert.equal(old.hidden,true);assert.equal(pending.size,1);
 root.dataset.motionPaused='true';observers[0]();assert.equal(pending.size,0);
 root.dataset.motionPaused='false';observers[0]();assert.equal(pending.size,1);
 media.matches=true;mediaEvents.get('change')();assert.equal(pending.size,0);
 media.matches=false;mediaEvents.get('change')();assert.equal(pending.size,1);
 doc.hidden=true;events.get('visibilitychange')();assert.equal(pending.size,0);
 doc.hidden=false;events.get('visibilitychange')();assert.equal(pending.size,1);
 advance(60000);assert.equal(pending.size,1,'resuming has one loop and no catch-up work');
 events.get('pagehide')();assert.equal(pending.size,0);observers[0]();assert.equal(pending.size,0,'late asset refresh cannot restart a hidden page');events.get('pageshow')();assert.equal(pending.size,1);
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
