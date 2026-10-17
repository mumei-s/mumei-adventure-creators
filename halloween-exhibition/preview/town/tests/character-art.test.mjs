import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createTownCharacterArt} from '../character-art.js';
import {createCharacterAssets} from '../../maze/creator-runtime.js';
import {initialTownState} from '../town-model.js';
const archive=JSON.parse(fs.readFileSync(new URL('../../data/archive.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('../../maze/data/creator-characters.json',import.meta.url)));
const fetcher=async url=>url.includes('creator-characters')?manifest:archive;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('entrance participants start loading before the welcome panel closes without blocking the core loader',async()=>{
 const requested=[],assets=createCharacterAssets({loadImage:async(_url,asset)=>{requested.push(asset.src);return {width:Math.min(1024,asset.width),height:Math.min(1024,asset.height)};}}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;
 for(let i=0;i<8;i++)await flush();
 const actors=characters.visitorActors({state:initialTownState(),time:1,clock:1});
 assert.ok(actors.some(actor=>actor.creatorId==='grand_daisy8632'));
 for(const visitor of characters.visitors().filter(visitor=>visitor.creatorId==='grand_daisy8632'))assert.ok(requested.includes(visitor.asset.src));
 assert.equal(characters.status().rejectedRequests,0);characters.destroy();
});
test('resuming indoors or far from the entrance preloads only participants around the saved location',async()=>{
 for(const initialState of [{...initialTownState(),mapId:'inn',position:{x:9.5,z:12.5}},{...initialTownState(),position:{x:56.5,z:43.5}}]){
  const requested=[],assets=createCharacterAssets({loadImage:async(_url,asset)=>{requested.push(asset.src);return {width:Math.min(1024,asset.width),height:Math.min(1024,asset.height)};}}),characters=createTownCharacterArt({fetcher,assets,initialState});await characters.ready;
  for(let i=0;i<8;i++)await flush();
  assert.ok(requested.every(src=>!src.includes('cna-')),initialState.mapId+' queues unrelated entrance guests');
  if(initialState.mapId==='inn')assert.equal(requested.length,2);
  else assert.ok(characters.visitorActors({state:initialState,time:0,clock:0}).some(actor=>actor.creatorId==='aihan_days'));
  characters.destroy();
 }
});
test('town retains every approved creator group and CNA has only real profile links while articles remain pending',async()=>{
 const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;
 const visitors=characters.visitors(),creators=new Set(visitors.map(visitor=>visitor.creatorId));assert.equal(creators.size+1,15);
 const cna=visitors.filter(visitor=>visitor.creatorId==='grand_daisy8632');assert.equal(cna.length,3);for(const visitor of cna){assert.equal(visitor.participationRole,'profile-guest');assert.equal(visitor.articleURL,null);assert.deepEqual(visitor.articleLinks,[]);assert.equal(visitor.profileURL,'https://note.com/grand_daisy8632');}
 assert(visitors.some(visitor=>visitor.interactive===false));for(const visitor of visitors.filter(visitor=>visitor.participationRole!=='profile-guest'))assert(visitor.articleLinks.some(link=>link.url===visitor.articleURL));characters.destroy();
});
test('walking all visitor districts loads only whole nearby groups with hero/cat pinned inside8atlases/32MiB',async()=>{
 let closed=0;const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:Math.min(1024,asset.width),height:Math.min(1024,asset.height),close(){closed++;}})}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;
 const districts=[...new Map(characters.visitors().map(visitor=>[visitor.groupId,visitor])).values()];let time=0,seen=new Set();
 for(const visitor of districts){const state={...initialTownState(),position:{x:visitor.center.x,z:visitor.center.z+1.5}};characters.visitorActors({state,time:time+=1,motion:false});for(let i=0;i<8;i++)await flush();const actors=characters.visitorActors({state,time,motion:false});
  const status=characters.status();assert(status.loaded<=8);assert(status.decodedBytes<=32*1024*1024);assert.equal(status.rejectedRequests,0);for(const actor of actors){seen.add(actor.creatorId);assert(actor.sprite);const group=characters.visitors().filter(peer=>peer.groupId===actor.groupId);assert.equal(actors.filter(peer=>peer.groupId===actor.groupId).length,group.length);}
 }
 assert.equal(seen.size,14);assert(closed>0);characters.destroy();assert.equal(characters.status().loaded,0);
});
test('CNA visitors do not appear as a partial group during independent atlas decodes',async()=>{
 const cache=new Map(),pending=new Map(),assets={setPinned(){},status:()=>({}),dispose(){},get:src=>cache.get(src),request(asset){if(asset.src.includes('owner-')){const image={width:asset.width,height:asset.height};cache.set(asset.src,image);return Promise.resolve(image);}if(!pending.has(asset.src)){let resolve;const promise=new Promise(done=>resolve=done);pending.set(asset.src,{asset,resolve,promise});}return pending.get(asset.src).promise;}};
 const characters=createTownCharacterArt({fetcher,assets});await characters.ready;const cna=characters.visitors().filter(visitor=>visitor.creatorId==='grand_daisy8632'),state={...initialTownState(),position:{x:36.5,z:8.5}};
 assert.equal(characters.visitorActors({state,time:0,motion:false}).filter(actor=>actor.creatorId==='grand_daisy8632').length,0);
 const first=cna[0].asset;cache.set(first.src,{width:first.width,height:first.height});assert.equal(characters.visitorActors({state,time:.1,motion:false}).filter(actor=>actor.creatorId==='grand_daisy8632').length,0);
 for(const visitor of cna){cache.set(visitor.asset.src,{width:visitor.asset.width,height:visitor.asset.height});pending.get(visitor.asset.src)?.resolve(cache.get(visitor.asset.src));}
 assert.equal(characters.visitorActors({state,time:.2,motion:false}).filter(actor=>actor.creatorId==='grand_daisy8632').length,3);characters.destroy();
});

test('pausing the world clock freezes actual visitor positions instead of returning everybody home',async()=>{
 const assets=createCharacterAssets({loadImage:async(_url,asset)=>({width:asset.width,height:asset.height})}),characters=createTownCharacterArt({fetcher,assets});await characters.ready;const state={...initialTownState(),position:{x:36.5,z:8.5}};
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
 const state={...initialTownState(),position:{x:36.5,z:8.5}};characters.visitorActors({state,time:0,motion:false});for(let i=0;i<8;i++)await flush();
 const all=characters.visitorActors({state,time:0,motion:false}),cna=all.filter(actor=>actor.creatorId==='grand_daisy8632');assert.equal(cna.length,3);
 const center=cna[1],nearState={...state,position:{x:center.x,z:center.z+.65}},nearest=characters.nearbyVisitor(nearState);assert(nearest);
 for(const actor of cna){const tapped=characters.reachableVisitor(actor.id,nearState);assert(tapped);assert.equal(tapped.id,actor.id);assert.equal(tapped.x,actor.x);assert.equal(tapped.z,actor.z);}
 assert(cna.some(actor=>actor.id!==nearest.id));assert.equal(characters.reachableVisitor(cna[0].id,{...nearState,position:{x:5,z:40}}),null);
 characters.destroy();
});
