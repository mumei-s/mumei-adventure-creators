import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTownRenderer} from '../renderer.js';
import {withDeadline} from '../../transition-effects.js';

const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const makeCanvas=(width,height)=>({width,height,getContext:()=>({})});
function clock(){const queued=new Set();return{setTimeout(fn){queued.add(fn);return fn;},clearTimeout:fn=>queued.delete(fn),expire(){for(const fn of [...queued])fn();},size:()=>queued.size};}

test('optional scenery manifests start together and response-body deadlines retain usable fallbacks',async()=>{
 const timers=clock(),pending=deferred(),requests=[],images=[];
 const renderer=createTownRenderer({makeCanvas,timers,fetcher:async input=>{requests.push(String(input));return{ok:true,json:()=>pending.promise};},loadImage:async input=>{images.push(input);return{width:2048,height:2048};}});
 await settle();assert.equal(requests.length,2);assert.equal(images.length,0);timers.expire();await renderer.ready;
 assert.deepEqual(renderer.status().failed,['props-manifest','residents-manifest']);assert.equal(images.length,4);assert.equal(renderer.status().loaded.length,4);
 const version=renderer.status().artVersion;pending.resolve({sprites:{invalid:'late'}});await settle();assert.equal(renderer.status().artVersion,version);renderer.destroy();assert.equal(timers.size(),0);
});

test('a stuck scenery image reaches a retryable failure and disposal prevents old loads starting',async()=>{
 const timers=clock(),image=deferred();let loads=0;
 const renderer=createTownRenderer({makeCanvas,timers,fetcher:async()=>({ok:true,json:async()=>({sprites:{}})}),loadImage:()=>{loads++;return image.promise;}});
 await settle();assert.equal(loads,4);timers.expire();await renderer.ready;assert.equal(renderer.status().failed.length,4);assert.equal(renderer.status().loaded.length,0);
 image.resolve({width:2048,height:2048});await settle();assert.equal(renderer.status().loaded.length,0);renderer.destroy();
 const request=deferred(),disposalClock=clock();let lateLoads=0;
 const disposed=createTownRenderer({makeCanvas,timers:disposalClock,fetcher:()=>request.promise,loadImage:async()=>{lateLoads++;return{width:2048,height:2048};}});disposed.destroy();await disposed.ready;
 request.resolve({ok:true,json:async()=>({sprites:{}})});await settle();assert.equal(lateLoads,0);assert.equal(disposalClock.size(),0);
});

test('the actual startup unlocks town after hero/cat readiness while scenery continues independently',async()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),source=app.slice(app.indexOf('async function boot(){'),app.indexOf("\n$('loading-retry').onclick"));
 const core=deferred(),scenery=deferred(),messages=[],nodes={'town-loading':{hidden:true,querySelector:()=>({textContent:''})},'loading-retry':{hidden:false}};
 const context=vm.createContext({AbortController,withDeadline,console,settings:{view:'2d'},tick(){},$:id=>nodes[id],panel:{open:false},loop:{stop(){},start(){}},clearInput(){},resetTownView(){},prepareTownView(){},resize(){},updateHUD(){},notify:message=>messages.push(message),showHelp(){throw Error('Saved intro should not reopen help');},session:{snapshot:()=>({state:{flags:{intro:true}}})},createTownCharacterArt:()=>({ready:core.promise,art:{},destroy(){}}),createTownRenderer:()=>({ready:scenery.promise,status:()=>({failed:['props']}),invalidate(){},destroy(){}})});
 vm.runInContext(`let bootRequest=0,panelRevision=0,bootAbort=null,ready=false,renderer=null,characterArt=null;${source};globalThis.start=boot;globalThis.isReady=()=>ready;`,context);
 const boot=context.start();await settle();assert.equal(context.isReady(),false);core.resolve();await boot;
 assert.equal(context.isReady(),true);assert.equal(nodes['town-loading'].hidden,true);assert.equal(messages.length,0);
 scenery.resolve();await settle();assert.equal(messages.length,1);assert.match(messages[0],/読み込み直せます/);
});
