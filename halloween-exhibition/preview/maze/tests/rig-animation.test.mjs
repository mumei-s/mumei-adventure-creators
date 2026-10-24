import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRigLibrary,headingForFacing,rigBattleActionAge} from '../rig-animation.js';
const flush=async()=>{for(let i=0;i<32;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function clock(){const jobs=new Set();return{setTimeout(fn){jobs.add(fn);return fn;},clearTimeout:fn=>jobs.delete(fn),expire(){for(const fn of[...jobs])fn();},size:()=>jobs.size};}
const manifest=()=>{const parts={head:{rect:[0,0,32,32],pivot:[16,28],contentHeight:32}};return{atlas:'main',contentHeight:256,parts,views:Object.fromEntries(['down','left','right','up'].map(direction=>[direction,{atlas:'main',parts}])),output:{width:256,height:320}};};
const row=(id='owner-lantern-hero')=>({id,approved:true,manifest:manifest(),atlases:{main:'./assets/rigs/test/parts.webp'}});
function fixture({rows=[row()],...options}={}){
 const canvases=[],images=[];let imageLoads=0,metadataLoads=0,changes=0;
 const context={globalAlpha:1,clearRect(){},save(){},restore(){},translate(){},scale(){},rotate(){},drawImage(){}};
 const library=createRigLibrary({makeCanvas:(w,h)=>{const c={width:w,height:h,getContext:()=>({...context})};canvases.push(c);return c;},fetcher:async()=>{metadataLoads++;return{ok:true,json:async()=>({schemaVersion:1,rigs:rows})};},loadImage:async()=>{imageLoads++;const im={width:64,height:64,closed:0,close(){this.closed++;}};images.push(im);return im;},onChange(){changes++;},...options});
 return{library,canvases,images,loads:()=>({images:imageLoads,metadata:metadataLoads,changes})};
}
const move=(library,id='owner',x=0,time=0,options={})=>library.update(id,{position:{x,z:0},dt:1/60,time,moving:x!==0,...options});
async function loadOwner(h){await h.library.ready;assert.equal(move(h.library),null);await flush();return move(h.library);}
test('headings follow shared x/z controls',()=>{assert.equal(headingForFacing('down'),0);assert.equal(headingForFacing('right'),Math.PI/2);assert.equal(headingForFacing('up'),Math.PI);assert.equal(headingForFacing('left'),-Math.PI/2);});
test('fictional town cat uses its own art and stays distinct from the owner companion',async()=>{
 const h=fixture({rows:[row('town-cat'),row('owner-black-cat')]});await h.library.ready;
 await h.library.retry('resident:cat');await h.library.retry('owner-black-cat');
 const town=move(h.library,'resident:cat'),companion=move(h.library,'owner-black-cat');
 assert.equal(town.rigId,'town-cat');assert.equal(companion.rigId,'owner-black-cat');assert.notEqual(town.image,companion.image);
 assert.equal(h.library.get('resident:cat'),town);h.library.destroy();
});
test('arena effect clocks reach release, impact and recovery together with the articulated hand',async()=>{
 const h=fixture();await loadOwner(h);
 const effect={type:'shine',started:10,duration:2.4};
 for(const[age,stage]of[[.2,'charge'],[1,'release'],[1.4,'impact'],[2,'recovery']])assert.equal(h.library.battle('owner:battle',{effect,time:10+age}).rigPose.action.stage,stage);
 for(const[type,duration]of[['attack',.65],['spark',1.6],['attack',1.2]]){
  const action={type,started:20,duration};assert.equal(h.library.battle('owner:battle',{effect:action,time:20+duration+.00001}).rigPose.action.kind,'locomotion');
 }
 assert.ok(Math.abs(rigBattleActionAge('shine',99,2.4)-1.85)<1e-12);h.library.destroy();
});
test('battle idle wings keep articulating after an attack and freeze with reduced motion',async()=>{
 const actor=row('monster:bat');actor.archetype='wing';const h=fixture({rows:[actor]});await h.library.ready;await h.library.retry('monster:bat');
 const first=h.library.battle('monster:bat',{time:0,facing:'left'}),image=first.image;
 const a=first.rigPose.joints.wing_left_tip;
 const next=h.library.battle('monster:bat',{time:.1,facing:'left'});
 assert.notDeepEqual(next.rigPose.joints.wing_left_tip,a);assert.equal(next.image,image);
 const effect={type:'attack',started:1,duration:.55};h.library.battle('monster:bat',{effect,time:1.3});
 const ended=h.library.battle('monster:bat',{effect,time:2}),tip=ended.rigPose.joints.wing_left_tip;
 const later=h.library.battle('monster:bat',{effect,time:2.1});assert.notDeepEqual(later.rigPose.joints.wing_left_tip,tip);assert.equal(later.rigPose.action.kind,'locomotion');
 const frozen=h.library.battle('monster:bat',{time:3,motion:false}).rigPose.joints.wing_left_tip;
 assert.deepEqual(h.library.battle('monster:bat',{time:4,motion:false}).rigPose.joints.wing_left_tip,frozen);h.library.destroy();
});
test('registry preserves the actual scene projection through movement and reduced motion',async()=>{
 const h=fixture();await loadOwner(h);const projection={worldPixelsPerUnit:64,displayHeightPx:76,groundDepthScale:.78};
 let sprite=move(h.library,'owner',.01,1,projection);assert.equal(sprite.rigPose.projection.unitsToPixels,64*256/76);assert.equal(sprite.rigPose.projection.depthScale,.78);
 sprite=move(h.library,'owner',.02,2,{...projection,motion:false});assert.equal(sprite.rigPose.projection.unitsToPixels,64*256/76);assert.equal(sprite.rigPose.feet.left.contact,true);assert.equal(sprite.rigPose.feet.right.contact,true);h.library.destroy();
});
test('metadata is independent from lazy art; one live canvas survives many actual poses',async()=>{
 const h=fixture();await h.library.ready;assert.equal(h.loads().images,0);assert.equal(h.library.status().definitions,1);
 const first=await loadOwner(h);assert(first?.liveRig);assert.equal(h.canvases.length,1);const image=first.image;
 for(let i=1;i<=240;i++){const sprite=move(h.library,'owner',i*.01,i/60);assert.equal(sprite.image,image);assert.equal(sprite.rigId,'owner-lantern-hero');}
 assert.equal(h.loads().images,1);assert.equal(h.canvases.length,1);assert.equal(h.library.get('owner').image,image);h.library.destroy();assert.equal(image.width,0);assert.equal(h.images[0].closed,1);
});
test('missing or malformed optional sidecar leaves original-art fallback available',async()=>{
 for(const fetcher of[async()=>{throw Error('offline');},async()=>({ok:true,json:async()=>({schemaVersion:99})})]){
  const h=fixture({fetcher});assert.equal(await h.library.ready,false);assert.equal(move(h.library),null);assert.equal(h.library.status().active,0);h.library.destroy();
 }
});
test('metadata response-body timeout cannot stall readiness',async()=>{
 const timers=clock(),h=fixture({timers,fetcher:async()=>({ok:true,json:()=>new Promise(()=>{})})});await flush();assert.equal(timers.size(),1);timers.expire();assert.equal(await h.library.ready,false);assert.equal(timers.size(),0);h.library.destroy();
});
test('image failure is bounded and explicit retry can recover without stale pending records',async()=>{
 let failing=true,loads=0;const h=fixture({loadImage:async()=>{loads++;if(failing)throw Error('missing');return{width:64,height:64};}});await h.library.ready;move(h.library);await flush();
 assert.deepEqual(h.library.status().failures,['owner-lantern-hero']);assert.equal(h.library.status().pending,0);for(let i=0;i<5;i++)move(h.library);await flush();assert.equal(loads,1);
 failing=false;await h.library.retry('owner');assert(move(h.library));assert.equal(loads,2);h.library.destroy();
});
test('stalled decode times out and its late success is closed instead of revived',async()=>{
 const timers=clock(),wait=deferred();let closed=0;const h=fixture({timers,loadImage:()=>wait.promise});await h.library.ready;move(h.library);await flush();timers.expire();await flush();
 assert.equal(h.library.status().pending,0);assert.deepEqual(h.library.status().failures,['owner-lantern-hero']);wait.resolve({width:64,height:64,close(){closed++;}});await flush();assert.equal(closed,1);assert.equal(h.library.status().loaded,0);h.library.destroy();
});
test('destroy aborts pending loads and a late image never allocates a canvas',async()=>{
 const wait=deferred();let closed=0;const h=fixture({loadImage:()=>wait.promise});await h.library.ready;move(h.library);await flush();h.library.destroy();wait.resolve({width:64,height:64,close(){closed++;}});await flush();assert.equal(closed,1);assert.equal(h.canvases.length,0);assert.equal(h.library.status().active,0);
});
test('reduced motion freezes identical pose and follows moved position with planted feet',async()=>{
 const h=fixture();await loadOwner(h);const first=move(h.library,'owner',0,1,{motion:false}),again=move(h.library,'owner',0,10,{motion:false});assert.equal(first.poseVersion,again.poseVersion);
 const next=move(h.library,'owner',1,11,{motion:false,facing:'right'});assert.equal(next.rigPose.root.x,1);assert(next.rigPose.feet.left.contact&&next.rigPose.feet.right.contact);assert.equal(next.rigPose.moving,false);h.library.destroy();
});
test('active actors are bounded and explicit map/active pruning releases canvases',async()=>{
 const rows=[row(),...Array.from({length:20},(_,n)=>row('actor-'+n))],h=fixture({rows});await h.library.ready;
 for(const r of rows){move(h.library,r.id,0,0,{mapId:'town'});await flush();move(h.library,r.id,0,0,{mapId:'town'});assert(h.library.status().active<=16);}
 assert.equal(h.library.status().active,16);h.library.prune({activeIds:['actor-19']});assert.equal(h.library.status().active,1);assert.equal(h.canvases.filter(c=>c.width>0).length,1);
 h.library.prune({mapId:'palace'});assert.equal(h.library.status().active,0);assert.equal(h.canvases.filter(c=>c.width>0).length,0);h.library.destroy();
});
test('source pixels stay bounded while pinned and recover after stale actors are pruned',async()=>{
 const h=fixture({rows:[row(),row('second')],maxSourceBytes:64*64*4});await loadOwner(h);move(h.library,'second');await flush();assert.equal(h.library.status().loaded,1);assert.equal(h.library.status().sourceBytes,64*64*4);assert(h.library.status().failures.includes('second'));
 h.library.prune({activeIds:[]});await h.library.retry('second');assert(move(h.library,'second'));assert.equal(h.library.status().sourceBytes,64*64*4);h.library.destroy();
});
test('battle seeks deterministic action age and uses a separate live owner instance',async()=>{
 const h=fixture();const walking=await loadOwner(h),effect={type:'shine',started:0};let a=h.library.battle('owner',{effect,time:.8,facing:'right'});assert(a);assert.notEqual(a.image,walking.image);
 const expected=structuredClone({joints:a.rigPose.joints,action:a.rigPose.action});h.library.battle('owner',{effect,time:1.4});h.library.battle('owner',{effect,time:.1});a=h.library.battle('owner',{effect,time:.8});
 assert.deepEqual({joints:a.rigPose.joints,action:a.rigPose.action},expected);assert.equal(h.library.status().active,2);
 assert.equal(h.library.battle('owner',{effect:{type:'attack',started:0},time:1.3}).rigPose.action.kind,'locomotion');
 const pausedA=h.library.battle('owner',{effect,time:.3,motion:false}),pausedB=h.library.battle('owner',{effect,time:1.1,motion:false});assert.deepEqual(pausedA.rigPose.joints,pausedB.rigPose.joints);h.library.destroy();
});
test('manifest-relative atlas URLs resolve beneath the game and metadata can use external manifest records',async()=>{
 const urls=[],h=fixture({fetcher:async url=>({ok:true,json:async()=>new URL(url).pathname.endsWith('/character-rigs.json')?{schemaVersion:1,rigs:[{id:'owner-lantern-hero',approved:true,manifestURL:'./assets/rigs/owner/manifest.json'}]}:{...manifest(),atlases:{main:'parts.webp'},atlas:'main'}}),loadImage:async url=>{urls.push(url);return{width:64,height:64};}});await loadOwner(h);assert(urls[0].endsWith('/assets/rigs/owner/parts.webp'));h.library.destroy();
});

test('unreviewed artwork stays gated unless explicit owner-only pilot preview is requested',async()=>{
 const unreviewed={...row(),approved:false},h=fixture({rows:[unreviewed]});await h.library.ready;move(h.library);await flush();assert.equal(h.loads().images,0);assert.equal(h.library.get('owner'),null);h.library.destroy();
 const preview=fixture({rows:[unreviewed,{...row('other'),approved:false}],allowUnreviewedPilot:true});assert(await loadOwner(preview));move(preview.library,'other');await flush();assert.equal(preview.library.get('other'),null);preview.library.destroy();
});
test('missing cardinal views use the original sprite fallback and never reuse front for sides/back',async()=>{
 const r=row();r.manifest.views={down:r.manifest.views.down};const h=fixture({rows:[r]});await loadOwner(h);
 for(const facing of['left','right','up']){assert.equal(move(h.library,'owner',0,0,{facing}),null);assert.equal(h.library.get('owner'),null);}
 assert.equal(h.library.battle('owner',{facing:'right'}),null);assert(move(h.library,'owner',0,0,{facing:'down'}));h.library.destroy();
});
test('owner and separate battle instance survive nonowner LRU pressure',async()=>{
 const rows=[row(),...Array.from({length:20},(_,n)=>row('guest-'+n))],h=fixture({rows});await loadOwner(h);const actor=h.library.get('owner').image,battle=h.library.battle('owner',{effect:{type:'attack',started:0},time:.2}).image;
 for(const r of rows.slice(1)){move(h.library,r.id);await flush();move(h.library,r.id);}
 assert.equal(h.library.status().active,16);assert.equal(h.library.get('owner').image,actor);assert.equal(h.library.get('owner:battle').image,battle);h.library.destroy();
});
test('creature action duration maps to the same external battle effect interval',async()=>{
 const h=fixture({rows:[{...row('black-cat'),archetype:'quadruped'}]});await h.library.ready;move(h.library,'black-cat');await flush();assert(move(h.library,'black-cat'));
 const effect={type:'attack',started:0};assert.equal(h.library.battle('black-cat',{effect,time:.9}).rigPose.action.kind,'attack');assert.equal(h.library.battle('black-cat',{effect,time:1.21}).rigPose.action.kind,'locomotion');h.library.destroy();
});


test('rig parent metadata is content-addressed and fetched only once with ordinary caching',async()=>{
 const expected=crypto.createHash('sha256').update(fs.readFileSync(new URL('../data/character-rigs.json',import.meta.url))).digest('hex').slice(0,12),calls=[];
 const h=fixture({fetcher:async(url,options)=>{calls.push({url,cache:options.cache});return{ok:true,json:async()=>({schemaVersion:1,rigs:[row()]})};}});
 await loadOwner(h);for(let frame=0;frame<50;frame++)move(h.library,'owner',frame*.01,frame/60);
 await h.library.retry('owner');assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).searchParams.get('v'),expected);assert.equal(calls[0].cache,'default');assert.equal(h.loads().images,1);h.library.destroy();
});
