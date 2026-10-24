import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTownViewController} from '../view-mode.js';
import {withDeadline} from '../../transition-effects.js';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const bootSource=app.slice(app.indexOf('async function boot(){'),app.indexOf("\n$('loading-retry').onclick"));
const viewSource=app.slice(app.indexOf('function prepareTownView(){'),app.indexOf('function beginPanel('));
const eventSource=app.split('\n').filter(line=>line.startsWith("window.addEventListener('pagehide'")||line.startsWith("window.addEventListener('pageshow'")||line.startsWith("document.addEventListener('visibilitychange'")).join('\n');
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
const settle=async()=>{for(let index=0;index<20;index++)await Promise.resolve();};

function harness(t,{view='3d',hero=Promise.resolve(),module}={}){
 const frames=[],windows={},documents={},nodes=new Map();
 const record={controllers:0,worlds:0,worldDestroys:0,preloads:0,releases:0,enhancements:0,scenery:0,saves:0};
 const no=()=>{},scene={ready:Promise.resolve(),destroy:no,invalidate:no,status:()=>({failed:[]}),start(){record.scenery++;}};
 const characters={ready:hero,art:{},destroy:no,startEnhancements(){record.enhancements++;}};
 const createWorld=()=>{record.worlds++;return {ready:Promise.resolve(),destroy(){record.worldDestroys++;}};};
 let context;
 context=vm.createContext({AbortController,console,withDeadline,bootRequest:0,panelRevision:0,bootAbort:null,ready:false,pageActive:true,padMode:'slide',padBinding:{refresh:no},panel:{open:false},settings:{view},cameraZoom:.82,
  renderer:null,characterArt:null,sceneImages:{clear:no,load:no},viewController:null,townWorldModule:module||{createTownWorld3D:createWorld},
  window:{addEventListener:(name,fn)=>windows[name]=fn},document:{hidden:false,addEventListener:(name,fn)=>documents[name]=fn},
  releaseViewPreload(){record.releases++;},prepareSelectedView(){if(context.settings.view==='3d')record.preloads++;},
  readPadMode:()=> 'slide',resize:no,updateHUD:no,tick:no,notify:no,showHelp:no,clearInput:no,updateViewUI:no,audio:{stop:no},loop:{stop:no,start:no},
  session:{save(){record.saves++;},snapshot:()=>({state:{mapId:'creator-quarter',flags:{intro:true},position:{x:11,z:18}}})},
  requestAnimationFrame:fn=>frames.push(fn),createTownCharacterArt:()=>characters,createTownRenderer:()=>scene,createTownSceneImages:()=>({clear:no,load:no}),
  resetTownView(){context.viewController?.destroy();context.viewController=null;},
  createTownViewController(options){record.controllers++;return createTownViewController(options);},
  $:id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,querySelector:()=>({textContent:''})});return nodes.get(id);},
 });
 vm.runInContext(`${viewSource}\n${bootSource}\n${eventSource}\nglobalThis.startBoot=boot;globalThis.resume=resumeTownView;`,context);
 t.after(()=>{context.bootAbort?.abort();context.viewController?.destroy();});
 return {context,record,createWorld,frames,boot:()=>context.startBoot(),nextFrame(){assert.ok(frames.length,'a deferred animation frame exists');frames.shift()();},hide:()=>windows.pagehide(),show:()=>windows.pageshow(),visibility(hidden){context.document.hidden=hidden;documents.visibilitychange();},snapshot:()=>context.viewController?.snapshot()};
}

test('history restoration before the second boot frame reuses one controller and world',async t=>{
 const h=harness(t);await h.boot();h.nextFrame();h.hide();h.show();h.nextFrame();await settle();
 assert.equal(h.record.controllers,1);assert.equal(h.record.worlds,1);assert.equal(h.snapshot().active,'3d');assert.equal(h.record.worldDestroys,0);
});

test('a hidden pageshow waits for visibility before restoring the desired viewpoint',async t=>{
 const h=harness(t);await h.boot();h.nextFrame();h.nextFrame();await settle();assert.equal(h.snapshot().active,'3d');
 h.hide();await settle();const preloads=h.record.preloads;h.context.document.hidden=true;h.show();await settle();
 assert.equal(h.snapshot().active,'2d');assert.equal(h.record.preloads,preloads);assert.equal(h.context.settings.view,'3d');
 h.visibility(false);await settle();assert.equal(h.snapshot().active,'3d');assert.equal(h.record.controllers,1);assert.equal(h.record.worlds,1);assert.equal(h.context.cameraZoom,.82);
});

test('a queued boot frame cannot initialize 3D after a hidden pageshow',async t=>{
 const h=harness(t);await h.boot();h.nextFrame();h.hide();h.context.document.hidden=true;h.show();h.nextFrame();await settle();
 assert.equal(h.record.controllers,0);assert.equal(h.record.worlds,0);assert.equal(h.record.enhancements,0);assert.equal(h.record.scenery,0);
 h.visibility(false);await settle();assert.equal(h.record.controllers,1);assert.equal(h.record.worlds,1);assert.ok(h.record.enhancements>0);assert.ok(h.record.scenery>0);
});

test('a late import after pagehide creates no stale world and resumes only when visible',async t=>{
 const imported=deferred(),h=harness(t,{module:imported.promise});await h.boot();h.nextFrame();h.nextFrame();await settle();assert.equal(h.snapshot().status,'loading');
 h.hide();imported.resolve({createTownWorld3D:h.createWorld});await settle();assert.equal(h.record.worlds,0);assert.equal(h.snapshot().active,'2d');
 h.context.document.hidden=true;h.show();await settle();assert.equal(h.record.worlds,0);h.visibility(false);await settle();assert.equal(h.record.worlds,1);assert.equal(h.snapshot().active,'3d');
});

test('overhead history and visibility changes never prepare or construct 3D dependencies',async t=>{
 const h=harness(t,{view:'2d'});await h.boot();h.nextFrame();h.nextFrame();await settle();h.hide();h.context.document.hidden=true;h.show();h.visibility(false);await settle();
 assert.equal(h.record.preloads,0);assert.equal(h.record.worlds,0);assert.equal(h.snapshot().active,'2d');assert.equal(h.context.settings.view,'2d');
});

test('foreground notifications do not cross the real hero gate',async t=>{
 const hero=deferred(),h=harness(t,{hero:hero.promise}),boot=h.boot();await settle();h.show();h.visibility(false);await settle();
 assert.equal(h.context.ready,false);assert.equal(h.record.preloads,0);assert.equal(h.record.controllers,0);assert.equal(h.record.worlds,0);
 hero.resolve();await boot;h.nextFrame();h.nextFrame();await settle();assert.equal(h.record.worlds,1);
});
