import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTownViewController,classifyTown3DFailure} from '../view-mode.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const settle=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function clock(){const jobs=new Set();return{setTimeout(fn){jobs.add(fn);return fn;},clearTimeout:fn=>jobs.delete(fn),expire(){for(const fn of [...jobs])fn();},size:()=>jobs.size};}
test('3D failures distinguish GPU, interrupted context, image transfer, module transfer and timeout',()=>{
 const cases=[['Error creating WebGL context.','webgl-unavailable'],['No GPU','webgl-unavailable'],['Town 3D resident art is unavailable','assets-unavailable'],['Art image timed out','assets-unavailable'],['Failed to fetch dynamically imported module','module-unavailable'],['Town renderer unavailable','module-unavailable'],['Loading deadline exceeded','timeout']];
 for(const [message,code]of cases){const reason=classifyTown3DFailure(Error(message));assert.equal(reason.code,code);assert.equal(reason.retryable,true);assert.ok(reason.message.includes('3D'));assert.ok(!reason.message.includes(message),'internal diagnostic is not shown as user text');}
 assert.equal(classifyTown3DFailure({type:'webglcontextlost'},{phase:'context'}).code,'context-lost');assert.equal(classifyTown3DFailure(Error('draw fault'),{phase:'render'}).code,'render-failed');assert.equal(classifyTown3DFailure(Object.assign(Error('not for display'),{code:'ASSETS_UNAVAILABLE'})).code,'assets-unavailable');
});
test('the controller exposes an image failure and keeps 3D desired until the visitor chooses 2D',async()=>{
 const events=[],controller=createTownViewController({onChange:s=>events.push(s),load:()=>({ready:Promise.reject(Error('Town 3D resident art is unavailable')),destroy(){}})});
 await controller.setMode('3d');const failed=controller.snapshot();assert.equal(failed.desired,'3d');assert.equal(failed.active,'2d');assert.equal(failed.failure.code,'assets-unavailable');assert.equal(failed.failureReason,failed.failure.message);assert.equal(events.at(-1).failureReason,failed.failureReason);
 await controller.setMode('2d');assert.equal(controller.snapshot().failure,null);assert.equal(controller.snapshot().failureReason,'');controller.destroy();
});
test('a deadline reports slow preparation and a successful retry clears the old reason',async()=>{
 const timers=clock(),pending=deferred();let first=true;
 const controller=createTownViewController({timers,load:()=>first?(first=false,pending.promise):{ready:Promise.resolve(),destroy(){}}});const request=controller.setMode('3d');await settle();timers.expire();await request;
 assert.equal(controller.snapshot().failure.code,'timeout');assert.equal(controller.snapshot().desired,'3d');await controller.setMode('3d',{retry:true});assert.equal(controller.snapshot().active,'3d');assert.equal(controller.snapshot().failureReason,'');assert.equal(controller.snapshot().failure,null);controller.destroy();
});
test('runtime failures retain their cause while a dormant context loss does not interrupt chosen 2D',async()=>{
 let lose,released=0;const controller=createTownViewController({load:({onContextLost})=>{lose=onContextLost;return {ready:Promise.resolve(),destroy(){released++;}};}});
 await controller.setMode('3d');controller.reportFailure(Error('draw failure'));assert.equal(controller.snapshot().failure.code,'render-failed');assert.equal(released,1);
 await controller.setMode('3d',{retry:true});lose();assert.equal(controller.snapshot().failure.code,'context-lost');assert.equal(released,2);
 await controller.setMode('3d',{retry:true});await controller.setMode('2d');lose();assert.equal(controller.snapshot().status,'idle');assert.equal(controller.snapshot().failureReason,'');assert.equal(released,3);controller.destroy();
});
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
 const prepare=source.slice(source.indexOf('function prepareTownView(){'),source.indexOf('function beginPanel(')).replace(/import\('[^']+'\)/,"loadModule()");
 const module=deferred(),timers=clock();let created=0,destroyed=0;
 const context=vm.createContext({Error,settings:{view:'3d'},characterArt:{art:{}},$:()=>({}),loadModule:()=>module.promise,updateViewUI(){},createTownViewController:options=>createTownViewController({...options,timers})});
 vm.runInContext(`let viewController=null,townWorldModule=null;${prepare};globalThis.prepare=prepareTownView;globalThis.get=()=>viewController`,context);
 context.prepare();await settle();timers.expire();await settle();assert.equal(context.get().snapshot().status,'failed');
 const retry=context.get().setMode('3d',{retry:true});await settle();module.resolve({createTownWorld3D(){created++;return{ready:Promise.resolve(),destroy(){destroyed++;}};}});await retry;await settle();
 assert.equal(created,1);assert.equal(destroyed,0);assert.equal(context.get().snapshot().active,'3d');context.get().destroy();assert.equal(destroyed,1);
});
