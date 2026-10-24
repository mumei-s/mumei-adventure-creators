import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withDeadline} from '../../transition-effects.js';
import {classifyTown3DFailure} from '../../town/view-mode.js';
import {viewpointOptions,resolveViewpoint,migrateViewpoint,saveViewpoint} from '../../viewpoint-presets.js';
import {movementVector} from '../view-model.js';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const setViewSource=app.slice(app.indexOf('async function setView('),app.indexOf('function restoreExhibits('));
const statusSource=app.slice(app.indexOf('function viewpointStatus(){'),app.indexOf('function showViewpoints(){'));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function harness({failedBefore=true,createWorld=()=>({resize(){},dispose(){}})}={}){
 const nodes=new Map(),storage=new Map(),notices=[],record={created:0,loadedRemaining:0,finished:0,restored:0,updated:0};
 const state={x:32,z:43.5,yaw:.7,pitch:.15,hasKey:true,unlocked:true,horrorAccepted:true,collection:['key'],progress:{chapter:3}};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,disabled:false,textContent:'',attributes:{},setAttribute(key,value){this.attributes[key]=value;}});return nodes.get(id);};
 const module={createWorld:options=>{record.created++;return createWorld(options,record.created);}},localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
 const context=vm.createContext({AbortController,withDeadline,classifyTown3DFailure,Error,initialFailed:failedBefore,mockModule:module,initialState:state,
  prepareViewpointAssets(){},releaseViewPreload(){},resolveViewpoint,migrateViewpoint,saveViewpoint:(page,id)=>saveViewpoint(page,id,localStorage),saveCameraDistance:(page,value)=>storage.set('halloween-exhibition:camera:'+page,value),
  document:{hidden:false},content:{querySelectorAll:()=>[]},console:{warn(){}},$:node,rpgArt:{loadRemaining(){record.loadedRemaining++;return Promise.resolve();}},
  transitions:{begin(){return()=>{record.finished++;};},enter(){}},clearInput(){},updateViewUI(){record.updated++;context.refresh();},restoreExhibits(){record.restored++;},notify:text=>notices.push(text),localStorage});
 vm.runInContext(`let viewRequest=0,viewAbort=null,world=null,worldModule=mockModule,worldFailed=initialFailed,view='2d',viewFailure='',state=initialState,cameraDistance='normal',cameraZoom=.82,desiredViewpoint=resolveViewpoint('maze','overhead'),viewPending=false,resumeViewpoint=false,gameReady=true;const viewKey='halloween-exhibition:horror-view:v1',cameraButton=$('camera-distance');${setViewSource};${statusSource};globalThis.setView=setView;globalThis.setViewpoint=setViewpoint;globalThis.fallback=fallbackView;globalThis.suspend=suspendViewpoint;globalThis.resume=resumePendingViewpoint;globalThis.refresh=updateCameraButton;globalThis.snapshot=()=>({view,viewFailure,worldFailed,world,state,cameraDistance,cameraZoom,desiredViewpoint,viewPending,resumeViewpoint});globalThis.setModule=value=>{worldModule=value;};globalThis.setReady=value=>{gameReady=value;};`,context);
 return {context,setView:context.setView,setViewpoint:context.setViewpoint,snapshot:context.snapshot,setModule:context.setModule,node,storage,notices,record,state};
}

test('an explicit viewpoint retry recreates the world after a previous GPU context failure',async()=>{
 const world={resize(){}},h=harness({createWorld:()=>world});assert.equal(h.snapshot().worldFailed,true);
 await h.setViewpoint('eye');assert.equal(h.record.created,1);assert.equal(h.snapshot().world,world);assert.equal(h.snapshot().view,'3d');assert.equal(h.snapshot().worldFailed,false);
 assert.equal(h.storage.get('halloween-exhibition:horror-view:v1'),'3d');assert.equal(h.storage.get('halloween-exhibition:viewpoint:maze:v1'),'eye');
});

test('a quiet GPU failure exposes actual overhead while retaining the requested detailed viewpoint and zoom',async()=>{
 const h=harness({createWorld:()=>{throw Error('Error creating WebGL context.');}});
 await h.setViewpoint('behind-far',{quiet:true});assert.equal(h.snapshot().view,'2d');assert.equal(h.snapshot().cameraDistance,'normal');assert.equal(h.snapshot().desiredViewpoint.id,'behind-far');assert.equal(h.snapshot().cameraZoom,.82);
 assert.equal(h.storage.get('halloween-exhibition:horror-view:v1'),'3d');assert.equal(h.storage.get('halloween-exhibition:camera:maze'),'far');assert.equal(h.storage.get('halloween-exhibition:viewpoint:maze:v1'),'behind-far');
 assert.match(h.snapshot().viewFailure,/端末またはブラウザー/);assert.equal(h.node('maze-view-status').hidden,false);assert.equal(h.node('maze-view-retry').hidden,false);assert.match(h.node('camera-distance').textContent,/見下ろし.*代替/);assert.match(h.node('camera-distance').attributes['aria-description'],/背後（遠景）.*再試行/);
 assert.equal(h.notices.length,0);assert.equal(h.record.finished,1);assert.equal(h.record.loadedRemaining,1);
});

test('a module communication failure remains visible on quiet startup without overwriting saved preference',async()=>{
 const h=harness(),request=deferred();h.setModule(request.promise);h.storage.set('halloween-exhibition:horror-view:v1','3d');
 const operation=h.setViewpoint('eye',{quiet:true,persist:false});request.reject(Error('Failed to fetch dynamically imported module'));await operation;
 assert.equal(h.snapshot().view,'2d');assert.equal(h.storage.get('halloween-exhibition:horror-view:v1'),'3d');assert.match(h.node('maze-view-status').textContent,/表示データ/);assert.equal(h.node('maze-view-status').hidden,false);assert.equal(h.node('maze-view-retry').hidden,false);assert.equal(h.record.created,0);
});

test('a successful second attempt clears the failure and preserves position, inventory and progress',async()=>{
 const world={resize(){}},h=harness({createWorld:(_options,attempt)=>{if(attempt===1)throw Error('Error creating WebGL context.');return world;}});
 const original=JSON.parse(JSON.stringify(h.state));await h.setViewpoint('behind',{quiet:true});assert.equal(h.snapshot().view,'2d');await h.setViewpoint(h.snapshot().desiredViewpoint.id,{quiet:true});
 assert.equal(h.record.created,2);assert.equal(h.snapshot().view,'3d');assert.equal(h.snapshot().cameraDistance,'wide');assert.equal(h.snapshot().world,world);assert.equal(h.snapshot().viewFailure,'');assert.equal(h.node('maze-view-status').hidden,true);assert.equal(h.node('maze-view-retry').hidden,true);
 assert.equal(h.snapshot().state,h.state);assert.deepEqual({...h.state,pitch:original.pitch},original);assert.equal(h.record.restored,1);assert.equal(h.snapshot().cameraZoom,.82);
});

test('all six old combinations remain selectable with unchanged movement semantics',async()=>{
 const h=harness();
 for(const option of viewpointOptions('maze')){
  await h.setViewpoint(option.id,{quiet:true});const current=h.snapshot();
  assert.equal(current.view,option.view);assert.equal(current.cameraDistance,option.distance);assert.equal(current.cameraZoom,.82);
  const vector=movementVector(current.view,Math.PI/2,1,0,1);if(option.view==='2d')assert.deepEqual(vector,{dx:0,dz:-1});else assert.ok(Math.abs(vector.dx+1)<1e-10);
 }
});

test('choosing far after failure clears it and explicitly persists the selected overhead distance',async()=>{
 const h=harness({createWorld:()=>{throw Error('Error creating WebGL context.');}});await h.setViewpoint('eye',{quiet:true});await h.setViewpoint('far',{quiet:true});
 assert.equal(h.snapshot().view,'2d');assert.equal(h.snapshot().cameraDistance,'far');assert.equal(h.storage.get('halloween-exhibition:horror-view:v1'),'2d');assert.equal(h.node('maze-view-status').hidden,true);assert.equal(h.node('maze-view-retry').hidden,true);
});

test('a slow earlier eye request cannot override a newer overhead choice or create an unused world',async()=>{
 const h=harness(),request=deferred();h.setModule(request.promise);const first=h.setViewpoint('eye',{quiet:true});await h.setViewpoint('far',{quiet:true});request.resolve({createWorld(){throw Error('stale constructor called');}});await first;
 assert.equal(h.snapshot().desiredViewpoint.id,'far');assert.equal(h.snapshot().view,'2d');assert.equal(h.snapshot().cameraDistance,'far');assert.equal(h.record.created,0);assert.equal(h.node('maze-view-status').hidden,true);
});

test('rapid perspective changes commit only the latest distance after a shared module resolves',async()=>{
 const h=harness(),request=deferred();h.setModule(request.promise);const first=h.setViewpoint('eye',{quiet:true}),last=h.setViewpoint('behind-far',{quiet:true});let creates=0;request.resolve({createWorld(){creates++;return {resize(){}};}});await Promise.all([first,last]);
 assert.equal(creates,1);assert.equal(h.snapshot().desiredViewpoint.id,'behind-far');assert.equal(h.snapshot().view,'3d');assert.equal(h.snapshot().cameraDistance,'far');
});

test('context fallback is synchronous and cannot post a stale reason over a newer selection',async()=>{
 const h=harness();await h.setViewpoint('behind',{quiet:true});h.context.fallback(Error('context lost'),'context');await h.setViewpoint('far',{quiet:true});await Promise.resolve();
 assert.equal(h.snapshot().desiredViewpoint.id,'far');assert.equal(h.snapshot().view,'2d');assert.equal(h.snapshot().cameraDistance,'far');assert.equal(h.snapshot().viewFailure,'');assert.equal(h.node('maze-view-retry').hidden,true);
});

test('background or history interruption cancels pending construction and resumes the latest desired viewpoint',async()=>{
 const h=harness(),request=deferred();h.setModule(request.promise);let creates=0;const first=h.setViewpoint('behind-far',{quiet:true});h.context.suspend();request.resolve({createWorld(){creates++;return {resize(){}};}});await first;
 assert.equal(creates,0);assert.equal(h.snapshot().resumeViewpoint,true);assert.equal(h.snapshot().view,'2d');assert.equal(h.snapshot().viewFailure,'');h.context.resume();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(creates,1);assert.equal(h.snapshot().view,'3d');assert.equal(h.snapshot().cameraDistance,'far');assert.equal(h.snapshot().resumeViewpoint,false);
});

test('viewpoint UI replaces renderer buttons and duplicate menu controls while retaining detail choices and retry',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/id="view-[23]d"|>2D<|>3D<|3Dを再試行/);assert.match(html,/id="camera-distance"[^>]+aria-haspopup="dialog"/);assert.match(html,/>視点を再試行</);
 assert.match(app,/cameraButton\.onclick=showViewpoints/);assert.match(app,/option\.detail\?more:main/);assert.doesNotMatch(app,/cameraToggle|cameraDistance=nextCameraDistance/);
 assert.match(app,/pagehide'.*suspendViewpoint/);assert.match(app,/pageshow'.*resumePendingViewpoint/);assert.match(app,/visibilitychange'.*suspendViewpoint/);
});

test('a viewpoint chosen before the hero gate saves the latest intent without constructing WebGL',async()=>{
 const h=harness();h.context.setReady(false);await h.setViewpoint('eye');await h.setViewpoint('behind-far');assert.equal(h.record.created,0);assert.equal(h.snapshot().desiredViewpoint.id,'behind-far');assert.equal(h.storage.get('halloween-exhibition:viewpoint:maze:v1'),'behind-far');assert.equal(h.storage.get('halloween-exhibition:camera:maze'),'far');
});
