// Controller tests execute the actual app function with DOM/GPU boundaries stubbed.
// These are not WebGL, browser, or device rendering acceptance tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withDeadline} from '../../transition-effects.js';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const functionSource=source.slice(source.indexOf('async function setView('),source.indexOf('\nfunction restoreExhibits()')).replace(/import\('\.\/world\.js\?v=[^']+'\)/,'loadWorld()');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function harness({load=()=>Promise.resolve({createWorld:()=>({dispose(){}})}),restore=()=>{}}={}){
 const elements=new Map(),statuses=[],notifications=[],writes=[],timers=new Map();let serial=0;
 const $=id=>{if(!elements.has(id))elements.set(id,{hidden:true,disabled:false});return elements.get(id);};
 const context=vm.createContext({$,AbortController,rpgArt:{},loadWorld:load,restoreExhibits:restore,console:{warn(){}},clearInput(){},notify:text=>notifications.push(text),updateViewUI(){},transitions:{begin:()=>result=>statuses.push(result),enter(){}},localStorage:{setItem:(...entry)=>writes.push(entry)},viewKey:'view',withDeadline:(promise,options)=>withDeadline(promise,{...options,timers:{setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)}})});
 vm.runInContext(`let view='2d',viewRequest=0,viewAbort=null,world=null,worldFailed=false,state={pitch:.3};${functionSource};globalThis.api={select:setView,snapshot:()=>({view,viewRequest,world,pitch:state.pitch})}`,context);
 return {api:context.api,$,statuses,notifications,writes,timers};
}
test('a pending 3D renderer leaves the ready 2D view and its controls usable',async()=>{
 const pending=deferred(),h=harness({load:()=>pending.promise}),p=h.api.select('3d');
 assert.equal(h.api.snapshot().view,'2d');assert.equal(h.$('view-3d').disabled,true);
 assert.equal(h.$('view-2d').disabled,false);pending.resolve({createWorld:()=>({dispose(){}})});await p;
 assert.equal(h.api.snapshot().view,'3d');assert.equal(h.$('view-3d').disabled,false);assert.equal(h.timers.size,0);
});
test('choosing 2D cancels an earlier 3D import and its late success cannot create or activate a renderer',async()=>{
 const pending=deferred();let creations=0;const h=harness({load:()=>pending.promise}),first=h.api.select('3d');
 await h.api.select('2d');pending.resolve({createWorld:()=>{creations++;return {dispose(){}};}});await first;
 assert.equal(h.api.snapshot().view,'2d');assert.equal(creations,0);assert.equal(h.$('view-3d').disabled,false);assert.equal(h.timers.size,0);assert.equal(h.statuses.length,1);
});
test('a 3D deadline leaves 2D active, exposes retry, and a later successful retry owns the screen',async()=>{
 const stalled=deferred();let attempt=0,lateCreations=0;const h=harness({load:()=>++attempt===1?stalled.promise:Promise.resolve({createWorld:()=>({dispose(){}})})});
 const first=h.api.select('3d');[...h.timers.values()][0]();await first;
 assert.equal(h.api.snapshot().view,'2d');assert.equal(h.$('view-retry').hidden,false);assert.equal(h.statuses[0].error,true);assert.equal(h.$('view-3d').disabled,false);
 await h.api.select('3d');assert.equal(h.api.snapshot().view,'3d');assert.equal(h.$('view-retry').hidden,true);
 stalled.resolve({createWorld:()=>{lateCreations++;return {dispose(){}};}});await Promise.resolve();assert.equal(lateCreations,0);assert.equal(h.api.snapshot().view,'3d');
});
test('failed exhibit preparation disposes the partial renderer and a later attempt creates a new instance',async()=>{
 let throws=true,created=0,disposed=0;const h=harness({load:()=>Promise.resolve({createWorld:()=>{created++;return {dispose(){disposed++;}};}}),restore:()=>{if(throws)throw Error('Unavailable image');}});
 await h.api.select('3d');assert.equal(disposed,1);assert.equal(h.api.snapshot().world,null);assert.equal(h.api.snapshot().view,'2d');
 throws=false;await h.api.select('3d');assert.equal(created,2);assert.equal(disposed,1);assert.equal(h.api.snapshot().view,'3d');
});
test('startup readies the 2D scene before launching optional 3D work and respects an earlier user choice',()=>{
 const init=source.slice(source.indexOf('async function init(){'));
 assert(init.indexOf("gameReady=true")<init.indexOf("if(preferredView==='3d'&&viewRequest===0)void setView"));
 assert(init.includes("$('loading').hidden=true"));assert(!init.includes('await setView('));
});

test('additional environment images never hold the base scene readiness or prevent later art updates',async()=>{
 const {createArtLibrary}=await import('../rpg-art.js');
 const pending=[];let environmentCount=0;
 const art=createArtLibrary({motionData:{},loadPlayer:false,loadImage:url=>{
  if(url.includes('/palace/')){environmentCount++;return new Promise(resolve=>pending.push(resolve));}
  return Promise.resolve({width:800,height:800});
 }});
 await art.sceneReady;assert(environmentCount>0);assert(art.images.pumpkin);assert.equal(art.images.palaceAtlas,undefined);
 let complete=false;art.ready.then(()=>complete=true);await Promise.resolve();assert.equal(complete,false);
 const version=art.version;for(const resolve of pending)resolve({width:1536,height:1088});await art.ready;
 assert.equal(complete,true);assert(art.version>version);assert(art.images.palaceDoor);assert(source.includes('rpgArt.sceneReady'));
});
