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

test('bundled scenery metadata starts all four images without any manifest request',async()=>{
 const requests=[],images=[];
 const renderer=createTownRenderer({makeCanvas,fetcher:async input=>{requests.push(String(input));throw Error('No metadata request expected');},loadImage:async input=>{images.push(input);return{width:1024,height:1024};}});
 await renderer.ready;assert.equal(requests.length,0);assert.equal(images.length,4);assert.equal(renderer.status().loaded.length,4);assert.deepEqual(renderer.status().failed,[]);renderer.destroy();
});

test('failed scenery retries only the same asset and manual retry preserves successful images',async()=>{
 const calls=new Map();let allow=false;
 const renderer=createTownRenderer({makeCanvas,loadImage:async input=>{const file=new URL(input).pathname.split('/').pop();calls.set(file,(calls.get(file)||0)+1);if(file==='stonepath-warm.webp'&&!allow)throw Error('temporary network failure');return{width:1024,height:1024};}});
 await renderer.ready;assert.deepEqual(renderer.status().failed,['soil']);assert.equal(calls.get('stonepath-warm.webp'),2);allow=true;await renderer.retry();assert.deepEqual(renderer.status().failed,[]);assert.equal(calls.get('props-atlas.webp'),1);assert.equal(calls.get('stonepath-warm.webp'),3);renderer.destroy();
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


test('bundled scenery frames exactly match the approved source atlas manifests',async()=>{
 const {TOWN_SCENERY_FRAMES}=await import('../scenery-data.js');for(const name of['props','residents']){const manifest=JSON.parse(fs.readFileSync(new URL('../assets/'+name+'-manifest.json',import.meta.url),'utf8'));assert.deepEqual(TOWN_SCENERY_FRAMES[name],manifest.sprites);}
});
