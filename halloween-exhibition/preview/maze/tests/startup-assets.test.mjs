import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {fetchStartupJSON,loadRequiredCharacters} from '../startup-assets.js';
import {createCharacterAssets,browserImage} from '../creator-runtime.js';
import {createArtLibrary} from '../rpg-art.js';
import {MONSTER_IDS} from '../monster-motion.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../data/creator-characters.json',import.meta.url)));
const hero=manifest.characters.find(character=>character.role==='hero').asset,cat=manifest.companions[0].asset;
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};

test('game metadata retries one failed request with cache reload and cancels both fetch and body',async()=>{
 const calls=[];let retries=0;
 const data=await fetchStartupJSON('manifest',{onRetry:()=>retries++,fetcher:async(url,options)=>{calls.push(options);if(calls.length===1)throw Error('temporary');return{ok:true,json:async()=>({ready:true})};}});
 assert.equal(data.ready,true);assert.equal(retries,1);assert.deepEqual(calls.map(call=>call.cache),['default','reload']);assert(calls.every(call=>call.signal.aborted));
 let count=0;await assert.rejects(fetchStartupJSON('gone',{fetcher:async()=>{count++;return{ok:false,status:404};}}));assert.equal(count,1);
 const abort=new AbortController();let requestSignal;
 const blocked=fetchStartupJSON('slow',{signal:abort.signal,fetcher:async(_url,{signal})=>{requestSignal=signal;return{ok:true,json:()=>new Promise(()=>{})};}});await turn();abort.abort();await assert.rejects(blocked,/cancelled/);assert.equal(requestSignal.aborted,true);
});

test('required hero retry preserves the loaded cat, exact identity, and high priority',async()=>{
 const calls=[];let failed=false;
 const assets=createCharacterAssets({loadImage:async(url,asset,options)=>{calls.push({url,src:asset.src,priority:options.priority});if(asset.src===hero.src&&!failed){failed=true;throw Error('temporary');}return{width:asset.width,height:asset.height};}});
 assets.setPinned([hero.src,cat.src]);const images=await loadRequiredCharacters(assets,[hero,cat]);
 assert.equal(images.length,2);assert.equal(images[0].width,hero.width);assert.equal(calls.filter(call=>call.src===hero.src).length,2);assert.equal(calls.filter(call=>call.src===cat.src).length,1);assert(calls.every(call=>call.priority==='high'));assert.equal(new Set(calls.filter(call=>call.src===hero.src).map(call=>call.url)).size,1);assets.dispose();
});

test('failed essential art never becomes a playable empty hero and cancellation stops retries',async()=>{
 let calls=0;const assets=createCharacterAssets({loadImage:async()=>{calls++;throw Error('offline');}});await assert.rejects(loadRequiredCharacters(assets,[hero]),/Required character/);assert.equal(calls,2);assert.equal(assets.get(hero.src),null);assets.dispose();
 const abort=new AbortController(),pending=deferred();let signal;
 const cancelled=createCharacterAssets({loadImage:async(_url,_asset,options)=>{signal=options.signal;await pending.promise;return{width:1024,height:1024};}});
 const boot=loadRequiredCharacters(cancelled,[hero],{signal:abort.signal});await turn();abort.abort();await assert.rejects(boot,/cancelled/);assert.equal(signal.aborted,true);pending.resolve();await turn();assert.equal(cancelled.get(hero.src),null);assert.equal(cancelled.status().failed,0);cancelled.dispose();
});

test('browser cancellation detaches the pending source and its handlers',async()=>{
 const before=globalThis.Image,images=[];globalThis.Image=class{constructor(){images.push(this);}removeAttribute(name){if(name==='src')this.removed=true;}};
 try{const abort=new AbortController(),pending=browserImage('/same-approved-hero.webp',hero,{signal:abort.signal,priority:'high'});assert.equal(images[0].fetchPriority,'high');abort.abort();await assert.rejects(pending,/cancelled/);assert.equal(images[0].removed,true);assert.equal(images[0].onload,null);assert.equal(images[0].onerror,null);}finally{globalThis.Image=before;}
});

test('3D first scene keeps every animated monster but postpones six unused images, with exact byte evidence',async()=>{
 const loaded=[];const art=createArtLibrary({loadPlayer:false,deferOptional:true,loadImage:async url=>{loaded.push(url);return{width:512,height:512};}});await art.sceneReady;
 assert.equal(loaded.length,16);for(const id of MONSTER_IDS)assert(art.images[id],id);assert.equal(art.images.battle,undefined);
 const initialBytes=loaded.reduce((sum,url)=>sum+fs.statSync(fileURLToPath(url)).size,0),version=art.version;
 await art.loadRemaining();await art.ready;assert.equal(loaded.length,22);assert(art.images.battle);assert(art.version>version);
 const totalBytes=loaded.reduce((sum,url)=>sum+fs.statSync(fileURLToPath(url)).size,0);assert.equal(totalBytes-initialBytes,881930);assert.equal(initialBytes,1798664);assert.equal(totalBytes,2680594);
 await art.loadRemaining();assert.equal(loaded.length,22);
});

test('preloads use the exact approved character hashes and no duplicate image URL',()=>{
 for(const scene of ['maze','town']){const html=fs.readFileSync(new URL(`../../${scene}/index.html`,import.meta.url),'utf8');for(const asset of [hero,cat]){const url=asset.src+'?v='+asset.sha256.slice(0,12);assert(html.includes(url));assert(html.includes('fetchpriority="high"'));}}
});

test('3D texture installation reuses decoded scene art and only falls back to a request when absent',()=>{
 const source=fs.readFileSync(new URL('../world.js',import.meta.url),'utf8'),fn=source.slice(source.indexOf('  function loadSceneTexture('),source.indexOf('  function loadSurface('));let requests=0;const image={width:1024,height:1024};
 const context=vm.createContext({art:{images:{parquet:image}},THREE:{Texture:class{constructor(value){this.image=value;}}},surfaceLoader:{load(){requests++;}},URL,disposed:false});
 vm.runInContext(fn.replace('import.meta.url',JSON.stringify('https://example.test/maze/world.js'))+';globalThis.load=loadSceneTexture',context);let texture;context.load('parquet','parquet.webp',value=>texture=value);assert.equal(texture.image,image);assert.equal(texture.needsUpdate,true);assert.equal(requests,0);context.load('missing','missing.webp',()=>{});assert.equal(requests,1);
});

test('maze actual boot starts hero before resident metadata and paints before dismissing real loading',async()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),source=app.slice(app.indexOf('async function init(){'),app.indexOf('\nrpgArt.ready.then'));
 const scene=deferred(),resident=deferred(),label={textContent:''},loading={hidden:true,querySelector:selector=>selector==='p'?label:null,append(){}};let requested=0,painted=0,remaining=0;
 const assets={setPinned(){},request:async asset=>{requested++;return{width:asset.width,height:asset.height};},retry(){}};
 const context=vm.createContext({AbortController,console,performance:{now:()=>0},$:id=>id==='loading'?loading:{},fetchStartupJSON:async url=>url.includes('residents')?resident.promise:url.includes('creator-characters')?manifest:{},compileResidents:()=>[],libraryFromArchive:()=>({selectedYear:2026}),compileCharacterRoster:()=>({hero:{asset:hero},npcs:[],omitted:[]}),placeCreatorNPCs:()=>({placed:[],omitted:[]}),compileCompanions:()=>[{asset:cat}],characterAssets:assets,loadRequiredCharacters,scaledCharacterLayout:()=>({}),withDeadline:promise=>promise,rpgArt:{sceneReady:scene.promise,setPlayerAtlas(){},loadRemaining(){remaining++;}},restore(){},setView:async()=>{},updateCreatorFrames(){},renderExploration(){assert.equal(loading.hidden,false);painted++;},transitions:{enter(){}},start(){},showStory(){},element:()=>({dataset:{}})});
 vm.runInContext(`let bootRequest=0,bootAbort=null,worldModule=null,view='2d',catalog,year,creatorRoster,companions,residents,gameReady=false;const progress={2026:{storySeen:true}};${source};globalThis.init=init;globalThis.ready=()=>gameReady;`,context);
 const boot=context.init();await turn();assert.equal(requested,2);assert.equal(context.ready(),false);assert.equal(loading.hidden,false);scene.resolve();await turn();assert.equal(context.ready(),false);resident.resolve({});await boot;assert.equal(painted,1);assert.equal(context.ready(),true);assert.equal(loading.hidden,true);assert.equal(remaining,1);
});

test('a timed-out essential request settles its cache entry before the second attempt',async()=>{
 const timers={queue:new Set(),setTimeout(fn){this.queue.add(fn);return fn;},clearTimeout(fn){this.queue.delete(fn);},expire(){for(const fn of [...this.queue])fn();}};let calls=0;
 const assets=createCharacterAssets({loadImage:async(_url,asset,{signal})=>{calls++;if(calls===1)return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));return{width:asset.width,height:asset.height};}});
 const boot=loadRequiredCharacters(assets,[hero],{timers});await turn();assert.equal(calls,1);timers.expire();const images=await boot;assert.equal(calls,2);assert.equal(images[0].width,hero.width);assert.equal(assets.status().failed,0);assets.dispose();
});

test('late completion from an aborted attempt cannot replace or clear the successful retry',async()=>{
 const timers={queue:new Set(),setTimeout(fn){this.queue.add(fn);return fn;},clearTimeout(fn){this.queue.delete(fn);},expire(){for(const fn of [...this.queue])fn();}},old=deferred();let calls=0,closed=0;const current={width:1024,height:1024};
 const assets=createCharacterAssets({loadImage:async()=>++calls===1?old.promise:current});const boot=loadRequiredCharacters(assets,[hero],{timers});await turn();timers.expire();await boot;assert.equal(calls,2);assert.equal(assets.get(hero.src),current);old.resolve({width:1024,height:1024,close(){closed++;}});await turn();assert.equal(assets.get(hero.src),current);assert.equal(assets.status().pending,0);assert.equal(closed,1);assets.dispose();
});
