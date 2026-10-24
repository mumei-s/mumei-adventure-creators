import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CASTLE_CAST,castleSafeActorPose,drawCastleCast,initPalaceLivingScene} from '../palace-living-scene.js';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(await read('maze/assets/rpg/animated/monster-motion.json'));
const rigIds=new Set(['franken','zombie','werewolf','mummy','witch','ghost']);
const flush=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};

function fixture({loaded=true,reduced=false}={}){
 const draws=[],events=new Map(),mediaEvents=new Map(),observers=[],pending=new Map();let next=0,createdImages=0,fetches=0,onChange,rigReady;
 const ctx={globalAlpha:1,clearRect(){draws.push('clear');},save(){},restore(){},translate(){},scale(){},rotate(){},beginPath(){},ellipse(){},fill(){},setTransform(){},drawImage(){draws.push('atlas');}};
 const el=()=>({dataset:{},style:{},children:[],append(...items){this.children.push(...items);},setAttribute(){},remove(){},getContext:()=>ctx});
 const stills=new Map(),images=new Map();
 for(const {id}of CASTLE_CAST){const listeners=new Map(),image={dataset:{castleAtlas:id,contentHeight:String(manifest[id].castleFrames[0].contentHeight),faces:manifest[id].faces},src:new URL('../maze/assets/rpg/animated/'+manifest[id].castleSrc,import.meta.url).href,complete:loaded,naturalWidth:loaded?256:0,width:256,height:256,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),finish(ok=true){this.complete=true;this.naturalWidth=ok?256:0;listeners.get(ok?'load':'error')?.();}};const still=el();still.dataset.castleResident=id;still.hidden=false;still.querySelector=()=>image;stills.set(id,still);images.set(id,image);}
 const palace=el();palace.getBoundingClientRect=()=>({width:390,height:520});palace.querySelectorAll=()=>[...stills.values()];palace.querySelector=selector=>[...stills].find(([id])=>selector.endsWith('.path-'+id))?.[1]||null;
 const media={matches:reduced,addEventListener:(name,fn)=>mediaEvents.set(name,fn),removeEventListener:name=>mediaEvents.delete(name)};
 const win={Image:class{constructor(){createdImages++;throw Error('HTML still must be reused');}},fetch(){fetches++;throw Error('Embedded layouts need no thumbnail metadata');},devicePixelRatio:1,requestAnimationFrame:fn=>{pending.set(++next,fn);return next;},cancelAnimationFrame:id=>pending.delete(id),matchMedia:()=>media,MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}},addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
 const doc={defaultView:win,head:el(),body:el(),createElement:el,hidden:false,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
 const root={ownerDocument:doc,dataset:{palaceState:'palace'},querySelector:()=>palace};
 const available=new Set(),paintable=new Set();const library={ready:new Promise(resolve=>rigReady=resolve),status:()=>({loaded:available.size}),has:id=>available.has(id),draw(_ctx,id,_pose,time){draws.push({id,time,stillHidden:stills.get(id).hidden});return paintable.has(id);},destroy(){available.clear();}};
 const api=initPalaceLivingScene(root,{makeRigs(options){onChange=options.onChange;return library;}});
 return{api,root,doc,stills,images,draws,pending,events,media,mediaEvents,observers,available,paintable,finishRigs(){rigReady();},reveal(id,{paint=true}={}){available.add(id);if(paint)paintable.add(id);onChange(id);},counts:()=>({createdImages,fetches}),advance(stamp){const [id,fn]=pending.entries().next().value;pending.delete(id);fn(stamp);}};
}

test('first HTML uses only approved static atlas crops, protected before external CSS',async()=>{
 const html=await read('index.html'),critical=html.match(/<style id="palace-cast-critical">([\s\S]*?)<\/style>/)?.[1];assert.ok(critical);
 assert.match(critical,/palace-still\{[^}]*width:64px;height:64px/);assert.match(critical,/palace-still-crop\{[^}]*overflow:hidden/);assert.match(critical,/palace-still-crop img\{[^}]*width:200%;height:200%/);
 assert.doesNotMatch(html,/<div class="palace-ghost|<div class="palace-bats|<span class="path-walker|<svg viewBox="0 0 80 130"/);
 assert.equal((html.match(/data-castle-resident=/g)||[]).length,8);
 for(const {id}of CASTLE_CAST){const image=html.match(new RegExp(`<img data-castle-atlas="${id}"[^>]+>`))?.[0];assert.ok(image,id);assert.ok(image.includes('/'+manifest[id].castleSrc+'"'),id);assert.ok(image.includes(`data-content-height="${manifest[id].castleFrames[0].contentHeight}"`));assert.match(image,/fetchpriority="low"/);}
 const css=await read('palace-living-scene.css');assert.doesNotMatch(css,/data-living-scene=ready.*palace-path-walkers/);
});

test('approved DOM stills stay still until a successful per-species articulated paint',async()=>{
 const h=fixture();await h.api.ready;assert.deepEqual(h.counts(),{createdImages:0,fetches:0});assert.equal(h.pending.size,0);assert.ok([...h.stills.values()].every(still=>!still.hidden));assert.ok(!h.draws.includes('atlas'));
 h.reveal('franken',{paint:false});assert.equal(h.stills.get('franken').hidden,false,'metadata/availability alone cannot erase the still');
 h.paintable.add('franken');h.api.draw();assert.equal(h.stills.get('franken').hidden,true);const first=h.draws.find(row=>row.id==='franken'&&row.stillHidden===false);assert.ok(first,'the replacement is painted before the still is hidden');
 assert.equal(h.stills.get('zombie').hidden,false);assert.equal(h.stills.get('bat').hidden,false);assert.equal(h.stills.get('vampire').hidden,false);
 for(const id of rigIds)h.reveal(id);h.finishRigs();await h.api.continuousReady;
 assert.ok([...rigIds].every(id=>h.stills.get(id).hidden));for(const id of ['bat','vampire'])assert.equal(h.stills.get(id).hidden,false);
 h.paintable.delete('franken');h.api.draw();assert.equal(h.stills.get('franken').hidden,false,'a failed paint restores the approved still');
 h.api.destroy();assert.ok([...h.stills.values()].every(still=>!still.hidden));assert.equal(h.pending.size,0);
});

test('in-flight HTML images are reused and late failures do not hide stills or block rigs',async()=>{
 const h=fixture({loaded:false});h.reveal('ghost');assert.equal(h.stills.get('ghost').hidden,true);
 for(const [id,image]of h.images)image.finish(id!=='zombie');await h.api.ready;assert.deepEqual(h.counts(),{createdImages:0,fetches:0});assert.equal(h.stills.get('zombie').hidden,false);assert.equal(h.stills.get('bat').hidden,false);
 h.finishRigs();await h.api.continuousReady;h.api.destroy();
 const cancelled=fixture({loaded:false});cancelled.api.destroy();await cancelled.api.ready;for(const image of cancelled.images.values())image.finish();assert.equal(cancelled.pending.size,0);assert.ok([...cancelled.stills.values()].every(still=>!still.hidden));cancelled.finishRigs();await cancelled.api.continuousReady;
});

test('failure, reduced motion, motion off and background lifecycle retain bounded still displays',async()=>{
 const failed=fixture();await failed.api.ready;failed.finishRigs();await failed.api.continuousReady;assert.equal(failed.pending.size,0);assert.ok([...failed.stills.values()].every(still=>!still.hidden));failed.api.destroy();
 const h=fixture({reduced:true});await h.api.ready;h.reveal('franken');assert.equal(h.pending.size,0);assert.equal(h.stills.get('bat').hidden,false);
 h.media.matches=false;h.mediaEvents.get('change')();assert.equal(h.pending.size,1);
 h.root.dataset.motionPaused='true';h.observers[0]();assert.equal(h.pending.size,0);h.root.dataset.motionPaused='false';h.observers[0]();assert.equal(h.pending.size,1);
 h.doc.hidden=true;h.events.get('visibilitychange')();assert.equal(h.pending.size,0);h.doc.hidden=false;h.events.get('visibilitychange')();assert.equal(h.pending.size,1);
 h.events.get('pagehide')();assert.equal(h.pending.size,0);h.reveal('zombie');assert.equal(h.pending.size,0);h.events.get('pageshow')();assert.equal(h.pending.size,1);
 h.api.destroy();h.finishRigs();await h.api.continuousReady;assert.equal(h.pending.size,0);
});

test('a late articulated resident starts at its own still position rather than jumping ahead',()=>{
 const ctx={clearRect(){},save(){},restore(){},translate(){},beginPath(){},ellipse(){},fill(){}},seen=[],startedAt=new Map(),staticIds=new Set(['franken','zombie']),layouts=new Map(['franken','zombie'].map(id=>[id,{...manifest[id],frames:manifest[id].castleFrames}]));let zombie=false;
 const rigs={has:id=>id==='franken'||zombie&&id==='zombie',draw(_ctx,id,pose,time){seen.push({id,pose,time});return true;}};
 drawCastleCast(ctx,new Map(),0,390,520,rigs,{staticIds,layouts,startedAt});zombie=true;drawCastleCast(ctx,new Map(),7,390,520,rigs,{staticIds,layouts,startedAt});
 const first=seen.find(row=>row.id==='zombie'),expected=castleSafeActorPose(CASTLE_CAST.find(actor=>actor.id==='zombie'),0,390,520,layouts.get('zombie'));assert.equal(first.time,0);assert.deepEqual(first.pose,expected);
 drawCastleCast(ctx,new Map(),7+1/60,390,520,rigs,{staticIds,layouts,startedAt});assert.ok(seen.at(-1).time>=0);
});
