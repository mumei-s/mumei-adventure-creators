import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createTownCharacterArt} from '../character-art.js';
import {createCharacterAssets,characterSprite,compileCompanions} from '../../maze/creator-runtime.js';
import {initialTownState} from '../town-model.js';
import {TOWN_START_MAP,getTownMap} from '../story-data.js';
import {CREATOR_HOMES,CREATOR_QUARTER_ID} from '../creator-homes.js';
const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('../../maze/data/creator-characters.json',import.meta.url)));
const fetcher=async url=>url.includes('creator-characters')?manifest:archive;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const nearCNA=characters=>({...initialTownState(),position:{...characters.visitors().find(visitor=>visitor.creatorId==='grand_daisy8632').center}});
const oppositeFacing={up:'down',down:'up',left:'right',right:'left'};

test('turning the eye camera reverses the viewed NPC atlas side without changing its world travel or heading',async()=>{
 const updates=[],assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})});
 const characters=createTownCharacterArt({assets,fetcher,makeRigs:()=>({update(id,options){updates.push({id,options});return null;},get:()=>null,battle:()=>null,destroy(){}})});await characters.ready;
 const state=nearCNA(characters);characters.visitorActors({state,time:0,clock:0,motion:false});for(let i=0;i<8;i++)await flush();
 const north=characters.visitorActors({state,time:0,clock:0,motion:false,view3D:true,cameraYaw:0});assert(north.length);
 const south=characters.visitorActors({state,time:0,clock:0,motion:false,view3D:true,cameraYaw:Math.PI});
 for(const actor of south){
  const previous=north.find(other=>other.id===actor.id);assert(previous);
  assert.deepEqual([actor.x,actor.z,actor.yaw,actor.facing],[previous.x,previous.z,previous.yaw,previous.facing]);
  const expected=characterSprite(actor.asset,actor.sprite.image,oppositeFacing[actor.facing],false,actor.phase);
  assert.deepEqual(actor.sprite.frame,expected.frame,'180-degree camera turn shows the other authored atlas side');
  const update=updates.findLast(row=>row.options.position.id===actor.id);assert(update);assert.equal(update.options.groundYaw,Math.PI);assert.equal(update.options.heading,actor.yaw);
 }
 const overhead=characters.visitorActors({state,time:0,clock:0,motion:false,view3D:false,cameraYaw:Math.PI});
 for(const actor of overhead)assert.deepEqual(actor.sprite.frame,north.find(other=>other.id===actor.id).sprite.frame,'north-up views ignore a stale eye-camera yaw');
 characters.destroy();
});

test('eye-camera projection selects the companion side and forwards ground yaw to live rigs without recropping them',async()=>{
 const updates=[],assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})});let live=null;
 const characters=createTownCharacterArt({assets,fetcher,makeRigs:()=>({update(id,options){updates.push({id,options});return live;},get:()=>null,battle:()=>null,destroy(){}})});await characters.ready;
 const state=initialTownState(),north=characters.companionActors({state,motion:false,view3D:true,cameraYaw:0})[0],south=characters.companionActors({state,motion:false,view3D:true,cameraYaw:Math.PI})[0];
 assert.deepEqual([south.x,south.z,south.facing],[north.x,north.z,north.facing]);
 const cat=compileCompanions(manifest).find(character=>character.id==='owner-black-cat'),expected=characterSprite(cat.asset,south.sprite.image,oppositeFacing[south.facing],false,south.phase);
 assert.deepEqual(south.sprite.frame,expected.frame);
 assert.equal(updates.at(-1).options.groundYaw,Math.PI);assert.equal(updates.at(-1).options.facing,south.facing);
 live={image:{width:256,height:512},frame:[0,0,256,512],poseVersion:7};
 const posed=characters.companionActors({state,motion:false,view3D:true,cameraYaw:-Math.PI/2})[0];
 assert.equal(posed.sprite,live,'an articulated result is already projected and is never treated as an atlas');
 characters.destroy();
});
test('optional rig degradation is announced once while approved owner and cat art remain intact',async()=>{
 const states=[];let changed;const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})});
 const characters=createTownCharacterArt({assets,fetcher,onState:value=>states.push(value),makeRigs:options=>{changed=options.onChange;return{update:()=>null,get:()=>null,battle:()=>null,destroy(){}};}});await characters.ready;
 const owner=characters.art.images.playerAtlas;changed({failures:['koakumako-base-devil']});changed({failures:['koakumako-base-devil']});changed({failures:[]});changed({failures:['owner-lantern-hero']});
 assert.equal(states.filter(value=>value==='rig-failed').length,1);assert.equal(characters.art.images.playerAtlas,owner);assert.equal(characters.companionActors({state:initialTownState()}).length,1);characters.destroy();
});
test('the bundled canonical roster starts the real owner and cat without metadata requests or optional rigs',async()=>{
 const oldArchive=globalThis.__ATELIER_ARCHIVE__,oldManifest=globalThis.__ATELIER_CHARACTER_MANIFEST__,oldFetch=globalThis.fetch;
 const requests=[],optional=[],gates=[];let characters;
 try{
  globalThis.__ATELIER_ARCHIVE__=archive;globalThis.__ATELIER_CHARACTER_MANIFEST__=manifest;globalThis.fetch=async()=>{throw Error('Bundled metadata must not fetch');};
  const assets=createCharacterAssets({loadImage:(_url,asset,options)=>{requests.push({src:asset.src,priority:options.priority});return new Promise(resolve=>gates.push(()=>resolve({width:asset.width,height:asset.height})));}});
  characters=createTownCharacterArt({assets,deferEnhancements:true,makeRigs:()=>{optional.push('rigs');return{update:()=>null,get:()=>null,battle:()=>null,destroy(){optional.push('destroy');}};}});
  await flush();assert.equal(requests.length,2);assert(requests.every(request=>request.priority==='high'));assert(requests.some(request=>request.src.includes('owner-lantern')));assert(requests.some(request=>request.src.includes('owner-black-cat')));assert.deepEqual(optional,[]);
  assert.equal(characters.art.images.playerAtlas,undefined);for(const complete of gates)complete();await characters.ready;
  assert(characters.art.images.playerAtlas);assert.equal(new Set(characters.visitors().map(visitor=>visitor.creatorId )).size,17);assert.equal(characters.companionActors({state:initialTownState()}).length,1);assert.deepEqual(optional,[]);
  characters.startEnhancements();characters.startEnhancements();assert.deepEqual(optional,['rigs']);characters.destroy();characters.startEnhancements();assert.deepEqual(optional,['rigs','destroy']);characters=null;
 }finally{characters?.destroy();globalThis.fetch=oldFetch;if(oldArchive===undefined)delete globalThis.__ATELIER_ARCHIVE__;else globalThis.__ATELIER_ARCHIVE__=oldArchive;if(oldManifest===undefined)delete globalThis.__ATELIER_CHARACTER_MANIFEST__;else globalThis.__ATELIER_CHARACTER_MANIFEST__=oldManifest;}
});
test('source-mode metadata uses the HTTP cache and a missing required owner never becomes playable',async()=>{
 const calls=[],assets={setPinned(){},retry(){},request:async()=>null,dispose(){},status:()=>({})},characters=createTownCharacterArt({assets,deferEnhancements:true,fetcher:async(url,options)=>{calls.push({url,options});return fetcher(url);}});
 await assert.rejects(characters.ready,/Required character/);assert.equal(calls.length,2);assert(calls.every(call=>call.options.cache===undefined));assert.equal(characters.art.images.playerAtlas,undefined);characters.destroy();
});
test('the clear castle forecourt queues no distant guests, and approaching CNA loads the complete group',async()=>{
 const requested=[],assets=createCharacterAssets({loadImage:async(_url,asset)=>{requested.push(asset.src);return {width:Math.min(1024,asset.width),height:Math.min(1024,asset.height)};}}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;
 for(let i=0;i<8;i++)await flush();
 assert.deepEqual(characters.visitorActors({state:initialTownState(),time:0,clock:0}),[]);assert.equal(requested.length,2,'only the protagonist and companion are required in the empty forecourt');
 const state=nearCNA(characters);characters.visitorActors({state,time:1,clock:1});for(let i=0;i<8;i++)await flush();const actors=characters.visitorActors({state,time:1,clock:1});
 assert.equal(actors.filter(actor=>actor.creatorId==='grand_daisy8632').length,3);for(const visitor of characters.visitors().filter(visitor=>visitor.creatorId==='grand_daisy8632'))assert.ok(requested.includes(visitor.asset.src));
 assert.equal(characters.status().rejectedRequests,0);characters.destroy();
});
test('resuming indoors or far from the entrance preloads only participants around the saved location',async()=>{
 for(const initialState of [{...initialTownState(),mapId:'inn',position:{x:9.5,z:12.5}},{...initialTownState(),position:{x:56.5,z:43.5}}]){
  const requested=[],assets=createCharacterAssets({loadImage:async(_url,asset)=>{requested.push(asset.src);return {width:Math.min(1024,asset.width),height:Math.min(1024,asset.height)};}}),characters=createTownCharacterArt({fetcher,assets,initialState});await characters.ready;
  for(let i=0;i<8;i++)await flush();
  assert.ok(requested.every(src=>!src.includes('cna-')),initialState.mapId+' queues unrelated entrance guests');
  if(initialState.mapId==='inn')assert.equal(requested.length,2);
  else assert.ok(characters.visitorActors({state:initialState,time:0,clock:0}).length>0);
  characters.destroy();
 }
});
test('town retains every approved creator group and CNA has only real profile links while articles remain pending',async()=>{
 const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;
 const visitors=characters.visitors(),creators=new Set(visitors.map(visitor=>visitor.creatorId));assert.equal(creators.size,17);
 const cna=visitors.filter(visitor=>visitor.creatorId==='grand_daisy8632'&&visitor.mapId===TOWN_START_MAP);assert.equal(cna.length,3);for(const visitor of cna){assert.equal(visitor.participationRole,'profile-guest');assert.equal(visitor.articleURL,null);assert.deepEqual(visitor.articleLinks,[]);assert.equal(visitor.profileURL,'https://note.com/grand_daisy8632');}
 assert(visitors.some(visitor=>visitor.interactive===false));for(const visitor of visitors.filter(visitor=>visitor.participationRole!=='profile-guest'))assert(visitor.articleLinks.some(link=>link.url===visitor.articleURL));characters.destroy();
});
test('walking all visitor districts loads only whole nearby groups with hero/cat pinned inside8atlases/32MiB',async()=>{
 let closed=0;const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:Math.min(1024,asset.width),height:Math.min(1024,asset.height),close(){closed++;}})}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;
 const districts=[...new Map(characters.visitors().map(visitor=>[visitor.groupId,visitor])).values()];let time=0,seen=new Set();
 for(const visitor of districts){const state={...initialTownState(),mapId:visitor.mapId,position:{x:visitor.center.x,z:visitor.center.z+1.5}};characters.visitorActors({state,time:time+=1,motion:false});for(let i=0;i<8;i++)await flush();const actors=characters.visitorActors({state,time,motion:false});
  const status=characters.status();assert(status.loaded<=8);assert(status.decodedBytes<=32*1024*1024);assert.equal(status.rejectedRequests,0);for(const actor of actors){seen.add(actor.creatorId);assert(actor.sprite);const group=characters.visitors().filter(peer=>peer.groupId===actor.groupId);assert.equal(actors.filter(peer=>peer.groupId===actor.groupId).length,group.length);}
 }
 assert.equal(seen.size,17);assert(closed>0);characters.destroy();assert.equal(characters.status().loaded,0);
});
test('CNA visitors do not appear as a partial group during independent atlas decodes',async()=>{
 const cache=new Map(),pending=new Map(),assets={setPinned(){},status:()=>({}),dispose(){},get:src=>cache.get(src),request(asset){if(asset.src.includes('owner-')){const image={width:asset.width,height:asset.height};cache.set(asset.src,image);return Promise.resolve(image);}if(!pending.has(asset.src)){let resolve;const promise=new Promise(done=>resolve=done);pending.set(asset.src,{asset,resolve,promise});}return pending.get(asset.src).promise;}};
 const characters=createTownCharacterArt({fetcher,assets});await characters.ready;const cna=characters.visitors().filter(visitor=>visitor.creatorId==='grand_daisy8632'&&visitor.mapId===TOWN_START_MAP),state=nearCNA(characters);
 assert.equal(characters.visitorActors({state,time:0,motion:false}).filter(actor=>actor.creatorId==='grand_daisy8632').length,0);
 const first=cna[0].asset;cache.set(first.src,{width:first.width,height:first.height});assert.equal(characters.visitorActors({state,time:.1,motion:false}).filter(actor=>actor.creatorId==='grand_daisy8632').length,0);
 for(const visitor of cna){cache.set(visitor.asset.src,{width:visitor.asset.width,height:visitor.asset.height});pending.get(visitor.asset.src)?.resolve(cache.get(visitor.asset.src));}
 assert.equal(characters.visitorActors({state,time:.2,motion:false}).filter(actor=>actor.creatorId==='grand_daisy8632').length,3);characters.destroy();
});

test('pausing the world clock freezes actual visitor positions instead of returning everybody home',async()=>{
 const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;const state=nearCNA(characters);
 characters.visitorActors({state,time:0,clock:0,motion:true});for(let i=0;i<8;i++)await flush();let before;
 for(let time=.1;time<20;time+=.1){const actors=characters.visitorActors({state,time,clock:time,motion:true});if(actors.some(actor=>actor.walking)){before={time,actors};break;}}
 assert(before);const paused=characters.visitorActors({state,time:before.time,clock:100,motion:false});for(const actor of paused){const previous=before.actors.find(item=>item.id===actor.id);assert(previous);assert.equal(actor.x,previous.x);assert.equal(actor.z,previous.z);assert.equal(actor.walking,false);assert.equal(actor.sprite.frameIndex,actor.asset.layout.idleColumn);}characters.destroy();
});

test('the owner cat waits on its real trail and does not walk its feet when its position has not moved',async()=>{
 const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;const state=initialTownState();const first=characters.companionActors({state,walking:false});assert.equal(first[0].walking,false);const second=characters.companionActors({state,walking:true});assert.equal(second[0].walking,false);assert.equal(second[0].sprite.frameIndex,0);characters.destroy();
});

test('battle art loads once with a real deadline, failures can retry, and late results cannot revive disposed art',async()=>{
 const {MONSTER_MOTION_DATA}=await import('../../maze/monster-motion-data.js');let loads=0,fail=true,resolveLate;
 const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})}),characters=createTownCharacterArt({fetcher,assets,loadMonsterImage:async(url,options)=>{loads++;assert.equal(options.timeout,10000);if(fail)throw Error('No connection');if(url.includes('franken'))return new Promise(resolve=>resolveLate=resolve);const layout=MONSTER_MOTION_DATA.ghost;return{width:layout.width,height:layout.height};}});await characters.ready;
 assert.equal(await characters.ensureMonster('ghost'),false);fail=false;const first=characters.ensureMonster('ghost'),same=characters.ensureMonster('ghost');assert.equal(await first,true);assert.equal(await same,true);assert.equal(loads,2);assert(characters.art.images.ghost);
 const late=characters.ensureMonster('franken');characters.destroy();resolveLate({width:MONSTER_MOTION_DATA.franken.width,height:MONSTER_MOTION_DATA.franken.height});assert.equal(await late,false);assert.equal(characters.art.images.franken,undefined);
});

test('each visible CNA member can be tapped within reach even when another member is nearest',async()=>{
 const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;
 const state=nearCNA(characters);characters.visitorActors({state,time:0,motion:false});for(let i=0;i<8;i++)await flush();
 const all=characters.visitorActors({state,time:0,motion:false}),cna=all.filter(actor=>actor.creatorId==='grand_daisy8632');assert.equal(cna.length,3);
 const center=cna[1],nearState={...state,position:{x:center.x,z:center.z+.65}},nearest=characters.nearbyVisitor(nearState);assert(nearest);
 for(const actor of cna){const tapped=characters.reachableVisitor(actor.id,nearState);assert(tapped);assert.equal(tapped.id,actor.id);assert.equal(tapped.x,actor.x);assert.equal(tapped.z,actor.z);}
 assert(cna.some(actor=>actor.id!==nearest.id));assert.equal(characters.reachableVisitor(cna[0].id,{...nearState,position:{x:5,z:40}}),null);
 characters.destroy();
});

test('saved creator rooms load only their own complete group and keep every home actor available to article lookup',async()=>{
 const home=CREATOR_HOMES.find(home=>home.creatorId==='grand_daisy8632'),initialState={...initialTownState(),mapId:home.interiorId,position:{...getTownMap(home.interiorId).spawn}},requested=[];
 const assets=createCharacterAssets({loadImage:async(_url,asset)=>{requested.push(asset.src);return{width:asset.width,height:asset.height};}}),characters=createTownCharacterArt({fetcher,assets,initialState,deferEnhancements:true});await characters.ready;
 for(let i=0;i<8;i++)await flush();
 const actors=characters.visitorActors({state:initialState,time:0,clock:0,motion:false});assert.equal(actors.length,3);assert(actors.every(actor=>actor.creatorId===home.creatorId&&actor.mapId===home.interiorId&&actor.sprite));
 assert.equal(requested.length,5);assert(requested.every(src=>src.includes('owner-')||src.includes('cna-')));assert.equal(characters.isHomeResidentVisible('resident-'+home.creatorId,initialState),true);assert.equal(characters.isHomeResidentVisible('resident-'+home.creatorId,{...initialState,mapId:CREATOR_QUARTER_ID}),false);
 for(const home of CREATOR_HOMES){const visitors=characters.visitors().filter(visitor=>visitor.creatorId===home.creatorId&&visitor.creatorHome);assert(visitors.some(visitor=>visitor.mapId===home.interiorId));assert(visitors.some(visitor=>visitor.mapId===CREATOR_QUARTER_ID));for(const visitor of visitors){assert.equal(characters.visitor(visitor.id)?.sourceCharacterId,visitor.sourceCharacterId);assert.equal(visitor.profileURL,home.publicProfileURL);if(visitor.participationRole!=='profile-guest')assert(visitor.articleLinks.some(link=>link.url===visitor.articleURL));}}
 characters.destroy();
});

test('paused map changes and teleports immediately replace visitor selection and owner home art stays independent from the player rig',async()=>{
 const rigs=[],assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})}),characters=createTownCharacterArt({fetcher,assets,makeRigs:()=>({update(id){rigs.push(id);return null;},get:()=>null,battle:()=>null,destroy(){}})});await characters.ready;
 const maps=['creator-home-koakumako','creator-home-ss_yr','creator-home-grand_daisy8632',CREATOR_QUARTER_ID],seen=[];
 for(const mapId of maps){const homeVisitor=characters.visitors().find(visitor=>visitor.mapId===mapId&&visitor.creatorId===(mapId===CREATOR_QUARTER_ID?'ss_yr':getTownMap(mapId).creatorHome.creatorId)),state={...initialTownState(),mapId,position:{...homeVisitor.center}};characters.visitorActors({state,time:0,clock:0,motion:false});characters.companionActors({state,time:0,motion:false});for(let i=0;i<8;i++)await flush();const actors=characters.visitorActors({state,time:0,clock:0,motion:false});assert(actors.length);assert(actors.every(actor=>actor.mapId===mapId));seen.push(...actors);}
 assert(rigs.includes(seen.find(visitor=>visitor.creatorId==='koakumako').sourceCharacterId));assert(rigs.some(id=>id.startsWith('home:')&&id.endsWith(':owner-lantern-hero')));assert(!rigs.includes('owner-lantern-hero'),'home owner must not reuse player live canvas');
 const owner=seen.find(visitor=>visitor.creatorId==='ss_yr');assert(owner.sprite);assert.equal(owner.sprite.image,characters.art.images.playerAtlas);assert.notEqual(owner.id,'owner-lantern-hero');
 assert(characters.status().loaded<=8);assert.equal(characters.status().rejectedRequests,0);characters.destroy();
});
