import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {COURTYARD_RIGS,createPalaceCastRigs} from '../palace-cast-rig.js';

const manifests=new Map(await Promise.all(COURTYARD_RIGS.map(async id=>[id,JSON.parse(await readFile(new URL(`../maze/assets/rigs/monster-${id}/rig.json`,import.meta.url),'utf8'))])));
const flush=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const actorId=url=>new URL(url).pathname.match(/\/monster-([^/]+)\//)?.[1];
const imageFor=(id,width=manifests.get(id).width,height=manifests.get(id).height)=>({id,width,height,closed:0,close(){this.closed++;}});
function clock(){const jobs=new Set();return{setTimeout(fn){jobs.add(fn);return fn;},clearTimeout:fn=>jobs.delete(fn),expire(){for(const fn of [...jobs])fn();},size:()=>jobs.size};}
function fixture(options={}){
 const images=[],metadata=[],art=[],changes=[];
 const library=createPalaceCastRigs({fetcher:async url=>{const id=actorId(url);metadata.push(String(url));return{ok:true,json:async()=>structuredClone(manifests.get(id))};},loadImage:async url=>{const id=actorId(url),image=imageFor(id);art.push(url);images.push(image);return image;},onChange(){changes.push(library.status());},...options});
 return{library,images,metadata,art,changes};
}
// Capture actual per-part Canvas transforms, independent of the outer path's position.
function context(){
 let matrix=[1,0,0,1,0,0];const stack=[],draws=[];
 const multiply=([a,b,c,d,e,f])=>{const [A,B,C,D,E,F]=matrix;matrix=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F];};
 return{draws,globalAlpha:1,save(){stack.push([matrix.slice(),this.globalAlpha]);},restore(){[matrix,this.globalAlpha]=stack.pop();},translate(x,y){multiply([1,0,0,1,x,y]);},scale(x,y){multiply([x,0,0,y,0,0]);},rotate(angle){const c=Math.cos(angle),s=Math.sin(angle);multiply([c,s,-s,c,0,0]);},drawImage(image,...args){draws.push({id:image.id,rect:args.slice(0,4),matrix:matrix.slice(),alpha:this.globalAlpha});}};
}
function render(library,id,time,{flip=false,x=80+time*6,y=360,size=95}={}){
 const ctx=context();assert.equal(library.draw(ctx,id,{x,y,size,flip},time,390,520),true,id);
 return ctx.draws.map(draw=>({...draw,matrix:draw.matrix.map((value,index)=>index===4?value-x:index===5?value-y:value)}));
}

test('all six existing residents use their authored body parts at adjacent display frames',async()=>{
 const h=fixture();await h.library.ready;
 assert.equal(h.library.status().loaded,6);assert.equal(h.metadata.length,6);assert.equal(h.art.length,6);
 assert.ok(h.metadata.every(url=>url.endsWith('/rig.json')));assert.ok(h.art.every(url=>url.endsWith('/parts.webp')));
 for(const id of COURTYARD_RIGS){
  // Warm the distance-driven gait using the same 60 Hz progression as the palace.
  for(let frame=0;frame<30;frame++)render(h.library,id,frame/60);
  const a=render(h.library,id,30/60),b=render(h.library,id,31/60);
  assert.ok(a.length>=10,`${id}: individual parts are drawn`);assert.equal(a.length,b.length);
  const parts=manifests.get(id).views.right.parts;
  for(const partName of id==='ghost'?['forearm_near','trail_tip']:['leftForearmHand','rightLowerLegBoot']){
   const rect=parts[partName].rect;
   const before=a.find(draw=>JSON.stringify(draw.rect)===JSON.stringify(rect));
   const after=b.find(draw=>JSON.stringify(draw.rect)===JSON.stringify(rect));
   assert.ok(before&&after,`${id}: ${partName} uses its authored cell`);
   assert.notDeepEqual(after.matrix,before.matrix,`${id}: ${partName} moves between 60 Hz frames`);
   assert.ok(after.matrix.every(Number.isFinite),`${id}: ${partName} has finite transforms`);
  }
 }
 assert.equal(h.art.length,6,'drawing never reloads source images');
 h.library.destroy();assert.ok(h.images.every(image=>image.closed===1));
});

test('repainting paused time reuses the exact body pose and resumed time continues it',async()=>{
 const h=fixture();await h.library.ready;
 for(const id of COURTYARD_RIGS){
  for(let frame=0;frame<=30;frame++)render(h.library,id,frame/60);
  const before=render(h.library,id,.5);
  for(let repaint=0;repaint<8;repaint++)assert.deepEqual(render(h.library,id,.5),before,id);
  assert.notDeepEqual(render(h.library,id,.5+1/60),before,id);
 }
 h.library.destroy();
});

test('two loaders bound concurrent art work and every remaining resident eventually loads',async()=>{
 const pending=new Map(),images=[];let active=0,peak=0;
 const h=fixture({loadImage(url,{signal}){const id=actorId(url),job=deferred();active++;peak=Math.max(peak,active);pending.set(id,{...job,signal});return job.promise.finally(()=>active--);}});
 await flush();assert.equal(pending.size,2);assert.equal(h.library.status().pending,2);
 let completed=0;
 while(completed<COURTYARD_RIGS.length){
  const [id,job]=pending.entries().next().value;pending.delete(id);assert.equal(job.signal.aborted,false);
  const image=imageFor(id);images.push(image);job.resolve(image);completed++;await flush();
  assert.ok(active<=2);assert.ok(h.library.status().pending<=2);
 }
 await h.library.ready;assert.equal(peak,2);assert.equal(h.library.status().loaded,6);assert.equal(h.library.status().pending,0);
 h.library.destroy();assert.ok(images.every(image=>image.closed===1));
});

test('decoded art never exceeds 32 MiB and rejected images are promptly released',async()=>{
 const images=[],observed=[];
 const h=fixture({loadImage:async url=>{const image=imageFor(actorId(url),2048,2048);images.push(image);return image;},onChange(){observed.push(h.library.status().sourceBytes);}});
 await h.library.ready;
 assert.equal(h.library.status().loaded,2);assert.equal(h.library.status().sourceBytes,32*1024*1024);
 assert.ok(observed.every(bytes=>bytes<=32*1024*1024));assert.equal(images.filter(image=>image.closed===1).length,4);
 for(const id of COURTYARD_RIGS.slice(2))assert.equal(h.library.draw(context(),id,{x:80,y:360,size:95,flip:false},0,390,520),false,'unavailable rig leaves atlas fallback possible');
 h.library.destroy();assert.ok(images.every(image=>image.closed===1));assert.equal(h.library.status().sourceBytes,0);
});

test('stalled metadata bodies time out without holding ready or starting image work',async()=>{
 const timers=clock(),signals=[];let loads=0;
 const h=fixture({timers,fetcher:async(url,{signal})=>{signals.push(signal);return{ok:true,json:()=>new Promise(()=>{})};},loadImage:async()=>{loads++;return imageFor('franken');}});
 for(let batch=0;batch<3;batch++){await flush();assert.equal(timers.size(),2);timers.expire();}
 await h.library.ready;assert.equal(signals.length,6);assert.ok(signals.every(signal=>signal.aborted));assert.equal(loads,0);
 assert.equal(h.library.status().loaded,0);assert.equal(h.library.status().pending,0);assert.equal(timers.size(),0);h.library.destroy();
});

test('stalled image timeouts cannot revive residents when decoding finishes late',async()=>{
 const timers=clock(),waiting=[],images=[];
 const h=fixture({timers,loadImage(url,{signal}){const job=deferred();waiting.push({...job,signal,id:actorId(url)});return job.promise;}});
 for(let batch=0;batch<3;batch++){await flush();assert.equal(waiting.length,(batch+1)*2);timers.expire();}
 await h.library.ready;assert.equal(h.library.status().loaded,0);assert.equal(h.library.status().pending,0);assert.equal(timers.size(),0);
 for(const job of waiting){assert.equal(job.signal.aborted,true);const image=imageFor(job.id);images.push(image);job.resolve(image);}
 await flush();assert.ok(images.every(image=>image.closed===1));assert.equal(h.library.status().loaded,0);assert.equal(h.changes.length,0);h.library.destroy();
});

for(const stage of ['metadata','image'])test(`destroy cancels ${stage} work and closes late images without callbacks`,async()=>{
 const timers=clock(),waiting=[],images=[];
 const h=fixture({timers,...(stage==='metadata'?{fetcher:(url,{signal})=>{const job=deferred();waiting.push({...job,signal,id:actorId(url)});return job.promise;}}:{loadImage:(url,{signal})=>{const job=deferred();waiting.push({...job,signal,id:actorId(url)});return job.promise;}})});
 await flush();assert.equal(waiting.length,2);h.library.destroy();
 await h.library.ready;assert.ok(waiting.every(job=>job.signal.aborted));assert.equal(timers.size(),0);
 for(const job of waiting){if(stage==='metadata')job.resolve({ok:true,json:async()=>manifests.get(job.id)});else{const image=imageFor(job.id);images.push(image);job.resolve(image);}}
 await flush();assert.equal(h.library.status().disposed,true);assert.equal(h.library.status().loaded,0);assert.equal(h.library.status().pending,0);assert.equal(h.changes.length,0);
 assert.ok(images.every(image=>image.closed===1));assert.equal(h.library.draw(context(),'franken',{x:80,y:360,size:95,flip:false},0,390,520),false);
});
