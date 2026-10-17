import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTownViewController} from '../view-mode.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const settle=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function clock(){const jobs=new Set();return{setTimeout(fn){jobs.add(fn);return fn;},clearTimeout:fn=>jobs.delete(fn),expire(){for(const fn of [...jobs])fn();},size:()=>jobs.size};}
test('Canvas remains playable while the requested 3D view prepares, with explicit reusable switches',async()=>{
 const preparation=deferred();let loads=0,destroyed=0;
 const view={ready:preparation.promise,destroy(){destroyed++;}},controller=createTownViewController({load:()=>{loads++;return view;}});
 const request=controller.setMode('3d');await settle();assert.equal(controller.snapshot().active,'2d');assert.equal(controller.snapshot().status,'loading');
 preparation.resolve();await request;assert.equal(controller.snapshot().active,'3d');
 await controller.setMode('2d');assert.equal(destroyed,0);await controller.setMode('3d');assert.equal(loads,1);controller.destroy();assert.equal(destroyed,1);
});
test('late import success after deadline is destroyed and cannot replace fallback or a successful retry',async()=>{
 const timers=clock(),first=deferred();let destroyed=0,loads=0;
 const controller=createTownViewController({timers,load:()=>++loads===1?first.promise:{ready:Promise.resolve(),destroy(){}}});
 const request=controller.setMode('3d');await settle();timers.expire();await request;assert.equal(controller.snapshot().status,'failed');assert.equal(controller.snapshot().active,'2d');
 await controller.setMode('3d',{retry:true});assert.equal(controller.snapshot().active,'3d');
 first.resolve({ready:Promise.resolve(),destroy(){destroyed++;}});await settle();assert.equal(destroyed,1);assert.equal(controller.snapshot().active,'3d');controller.destroy();assert.equal(timers.size(),0);
});
test('switching away during preparation cancels old completion and does not leak its GPU resources',async()=>{
 const pending=deferred();let destroyed=0;
 const controller=createTownViewController({load:()=>({ready:pending.promise,destroy(){destroyed++;}})});
 const request=controller.setMode('3d');await settle();await controller.setMode('2d');await request;
 assert.equal(destroyed,1);pending.resolve();await settle();assert.equal(destroyed,1);assert.equal(controller.snapshot().active,'2d');controller.destroy();
});
test('context loss and unavailable WebGL release the current view and allow an explicit retry',async()=>{
 let lose,destroyed=0;const controller=createTownViewController({load:({onContextLost})=>{lose=onContextLost;return{ready:Promise.resolve(),destroy(){destroyed++;}};}});
 await controller.setMode('3d');await controller.setMode('2d');await controller.setMode('3d');lose();assert.equal(controller.snapshot().status,'failed');assert.equal(controller.snapshot().active,'2d');assert.equal(destroyed,1);
 await controller.setMode('3d',{retry:true});assert.equal(controller.snapshot().active,'3d');controller.destroy();
 const unavailable=createTownViewController({load:()=>{throw Error('No GPU');}});await unavailable.setMode('3d');assert.equal(unavailable.snapshot().status,'failed');unavailable.destroy();
});

test('actual app checks a cancelled module import before creating another context on the shared canvas',async()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const prepare=source.slice(source.indexOf('function prepareTownView(){'),source.indexOf('function beginPanel(')).replace(/await import\('[^']+'\)/,"await loadModule()");
 const module=deferred(),timers=clock();let created=0,destroyed=0;
 const context=vm.createContext({Error,settings:{view:'3d'},characterArt:{art:{}},$:()=>({}),loadModule:()=>module.promise,updateViewUI(){},createTownViewController:options=>createTownViewController({...options,timers})});
 vm.runInContext(`let viewController=null;${prepare};globalThis.prepare=prepareTownView;globalThis.get=()=>viewController`,context);
 context.prepare();await settle();timers.expire();await settle();assert.equal(context.get().snapshot().status,'failed');
 const retry=context.get().setMode('3d',{retry:true});await settle();module.resolve({createTownWorld3D(){created++;return{ready:Promise.resolve(),destroy(){destroyed++;}};}});await retry;await settle();
 assert.equal(created,1);assert.equal(destroyed,0);assert.equal(context.get().snapshot().active,'3d');context.get().destroy();assert.equal(destroyed,1);
});
