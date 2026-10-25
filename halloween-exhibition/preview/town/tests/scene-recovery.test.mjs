import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTownSceneRecovery} from '../scene-recovery.js';
import {createFrameLoop} from '../../maze/frame-loop.js';

function documentFixture(){
 const doc={activeElement:null,createElement(tag){return{tag,children:[],attributes:{},events:{},open:false,append(...nodes){this.children.push(...nodes);},setAttribute(name,value){this.attributes[name]=value;},addEventListener(type,handler){this.events[type]=handler;},showModal(){this.open=true;},close(){this.open=false;},focus(){doc.activeElement=this;}};}};
 doc.body=doc.createElement('body');doc.activeElement=doc.createElement('button');return doc;
}
function harness(){
 const doc=documentFixture(),priorFocus=doc.activeElement,queued=new Map(),errors=[];let serial=0,visible=true,fail=true,frames=0,pauses=0,retries=0,loop;
 const state={mapId:'creator-quarter',position:{x:28.5,z:12.35},inventory:{key:1},flags:{intro:true}},battle={phase:'enemy',turn:3},panel={open:true};
 const recovery=createTownSceneRecovery({document:doc,onPause(){pauses++;loop.stop();},onRetry(){retries++;loop.start();},onError:error=>errors.push(error)});
 loop=createFrameLoop({request:fn=>{queued.set(++serial,fn);return serial;},cancel:id=>queued.delete(id),shouldRun:()=>visible&&!recovery.blocked,onFrame:()=>{frames++;if(fail)throw Error('interrupted draw');},onError:recovery.report});
 return{doc,priorFocus,queued,errors,state,battle,panel,recovery,loop,record:()=>({frames,pauses,retries}),fail:value=>fail=value,visible:value=>visible=value,flush(time=100){const [id,fn]=queued.entries().next().value;queued.delete(id);fn(time);return fn;}};
}

test('a frame failure pauses once, preserves battle and current save state, and traps focus on a separate recovery dialog',()=>{
 const h=harness(),before=JSON.stringify({state:h.state,battle:h.battle});h.loop.start();h.flush();
 assert.equal(h.loop.running,false);assert.equal(h.recovery.blocked,true);assert.equal(h.queued.size,0);assert.equal(h.record().pauses,1);assert.equal(h.errors.length,1);
 const dialog=h.doc.body.children[0],retry=dialog.children[2];assert.equal(dialog.id,'town-recovery');assert.equal(dialog.open,true);assert.equal(h.doc.activeElement,retry);assert.equal(h.panel.open,true);assert.equal(JSON.stringify({state:h.state,battle:h.battle}),before);
 let prevented=false;dialog.events.cancel({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(h.recovery.blocked,true);assert.equal(dialog.open,true);
 h.recovery.report(Error('duplicate'));assert.equal(h.errors.length,1);assert.equal(h.doc.body.children.length,1);
 h.loop.start();h.visible(false);h.loop.stop();h.visible(true);h.loop.start();assert.equal(h.queued.size,0,'foreground and other start calls do not bypass the fault latch');
});
test('one explicit retry owns one fresh frame; persistent failures require another click and cannot spin',()=>{
 const h=harness();h.loop.start();const stale=h.flush();const dialog=h.doc.body.children[0];
 h.recovery.retry();h.recovery.retry();assert.equal(h.record().retries,1);assert.equal(h.queued.size,1);assert.equal(dialog.open,false);assert.equal(h.doc.activeElement,h.priorFocus);
 stale(500);assert.equal(h.queued.size,1);assert.equal(h.record().frames,1);h.flush(100000);assert.equal(h.recovery.blocked,true);assert.equal(h.queued.size,0);assert.equal(h.record().frames,2);assert.equal(dialog.open,true);
 h.fail(false);h.recovery.retry();h.recovery.retry();assert.equal(h.record().retries,2);h.flush(200000);assert.equal(h.recovery.blocked,false);assert.equal(h.loop.running,true);assert.equal(h.queued.size,1);assert.equal(h.panel.open,true);h.loop.stop();
});
test('an explicit retry while hidden waits for visibility and a retry preparation failure stays recoverable',()=>{
 const h=harness();h.loop.start();h.flush();h.visible(false);h.recovery.retry();assert.equal(h.queued.size,0);h.fail(false);h.visible(true);h.loop.start();h.flush();assert.equal(h.record().frames,2);h.loop.stop();
 const doc=documentFixture();let calls=0;const recovery=createTownSceneRecovery({document:doc,onError(){},onRetry(){calls++;throw Error('invalidate failed');}});
 recovery.report(Error('draw failed'));recovery.retry();assert.equal(calls,1);assert.equal(recovery.blocked,true);assert.equal(doc.body.children[0].open,true);assert.equal(doc.body.children[0].children[2].disabled,false);
});
test('failed pause, diagnostic or focus callbacks cannot make recovery undiscoverable or block a requested retry',()=>{
 const doc=documentFixture();doc.activeElement.focus=()=>{throw Error('previous focus unavailable');};let retries=0;
 const recovery=createTownSceneRecovery({document:doc,onPause(){throw Error('audio unavailable');},onError(){throw Error('logger unavailable');},onRetry(){retries++;}});
 assert.doesNotThrow(()=>recovery.report(Error('draw failed')));assert.equal(recovery.blocked,true);const dialog=doc.body.children[0];assert.equal(dialog.open,true);assert.equal(doc.activeElement,dialog.children[2]);
 assert.doesNotThrow(()=>recovery.retry());assert.equal(retries,1);assert.equal(recovery.blocked,false);assert.equal(dialog.open,false);
 dialog.children[2].focus=()=>{throw Error('focus unavailable');};assert.doesNotThrow(()=>recovery.report(Error('draw failed again')));assert.equal(dialog.open,true);assert.equal(dialog.children[2].disabled,false);
});
test('persistent drawing failure keeps the normal castle exit available without automatically leaving or replacing progress',()=>{
 const doc=documentFixture();let exits=0;const recovery=createTownSceneRecovery({document:doc,onError(){},onExit(){exits++;}});recovery.report(Error('draw failed'));
 const exit=doc.body.children[0].children[3];assert.equal(exits,0);assert.equal(exit.tag,'a');assert.equal(exit.href,'../?return=palace');assert.equal(exit.textContent,'城へ戻る');exit.onclick();assert.equal(exits,1);assert.equal(recovery.blocked,true);
});
test('the actual castle exit attempts the current save even when input or audio cleanup fails',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),source=app.split('\n').find(line=>line.startsWith('function prepareExit('));
 for(const faults of [[],['input'],['audio'],['input','audio']]){
  const calls=[],state={mapId:'creator-quarter',position:{x:28.5,z:12.35}},before=JSON.stringify(state);
  const context=vm.createContext({clearInput(){calls.push('clear');if(faults.includes('input'))throw Error('input cleanup failed');},audio:{stop(){calls.push('audio');if(faults.includes('audio'))throw Error('audio cleanup failed');}},session:{save(){calls.push('save');return{ok:false};}},state});
  vm.runInContext(source+';globalThis.exit=prepareExit;',context);if(faults.length)assert.throws(()=>context.exit(),/cleanup failed/);else context.exit();assert.deepEqual(calls,['clear','audio','save']);assert.equal(JSON.stringify(state),before);
 }
});
test('actual town recovery callbacks stop and clear input, then invalidate only current renderers without replacing the battle or save',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),init=app.split('\n').find(line=>line.startsWith('const sceneRecovery=')),doc=documentFixture(),calls=[];
 const session={state:{position:{x:28.5,z:12.35},mapId:'creator-quarter'},battle:{phase:'enemy',turn:4}},before=JSON.stringify(session);
 const context=vm.createContext({createTownSceneRecovery:options=>createTownSceneRecovery({document:doc,onError(){},...options}),loop:{stop:()=>calls.push('stop'),start:()=>calls.push('start')},clearInput:()=>calls.push('clear'),audio:{stop:()=>calls.push('audio')},renderer:{invalidate:()=>calls.push('2d')},viewController:{snapshot:()=>({view:{invalidate:()=>calls.push('3d')}})},minimapSignature:'old',session,prepareExit:()=>calls.push('exit')});
 vm.runInContext(init+';globalThis.recovery=sceneRecovery;',context);context.recovery.report(Error('draw failed'));assert.deepEqual(calls,['stop','clear','audio']);context.recovery.retry();assert.deepEqual(calls,['stop','clear','audio','clear','2d','3d','start']);assert.equal(context.minimapSignature,'');assert.equal(JSON.stringify(session),before);
 context.clearInput=()=>{throw Error('capture unavailable');};calls.length=0;context.recovery.report(Error('again'));assert.deepEqual(calls,['stop','audio']);assert.equal(doc.body.children[0].open,true);
});
test('actual town wiring blocks direct paints and inputs and retries without booting or replacing progress',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),tick=app.slice(app.indexOf('function tick('),app.indexOf('\nconst loop='));
 const context=vm.createContext({sceneRecovery:{blocked:true},eyeCamera:{sync(){assert.fail('a faulted direct tick cannot update state or paint');}}});vm.runInContext(tick+';tick(0,0);',context);
 const init=app.split('\n').find(line=>line.startsWith('const sceneRecovery='));assert.match(init,/loop.stop\(\)/);assert.match(init,/minimapSignature=''/);assert.match(init,/loop.start\(\)/);assert.doesNotMatch(init,/boot\(|replace\(|save\(|fetch|sceneImages.clear|leaveBattle/);
 assert.match(app,/onFrame:tick,onError:sceneRecovery.report/);assert.match(app,/!document.hidden&&!sceneRecovery.blocked/);assert.match(app,/keydown',event=>\{if\(sceneRecovery.blocked\)return/);assert.match(app,/blocked:\(\)=>!ready\|\|panel.open\|\|sceneRecovery.blocked/);
 assert.match(app,/if\(ready\)try\{tick\(0,0\);\}catch\(error\)\{sceneRecovery.report\(error\);\}/);
});
