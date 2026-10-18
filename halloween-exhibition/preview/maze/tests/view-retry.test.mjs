import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withDeadline} from '../../transition-effects.js';
import {classifyTown3DFailure} from '../../town/view-mode.js';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const setViewSource=app.slice(app.indexOf('async function setView('),app.indexOf('function restoreExhibits('));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function harness({failedBefore=true,createWorld=()=>({resize(){}})}={}){
 const nodes=new Map(),storage=new Map(),notices=[],record={created:0,loadedRemaining:0,finished:0,restored:0,updated:0};
 const state={x:32,z:43.5,yaw:.7,pitch:.15,hasKey:true,unlocked:true,horrorAccepted:true,collection:['key'],progress:{chapter:3}};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:true,disabled:false,textContent:''});return nodes.get(id);};
 const module={createWorld:options=>{record.created++;return createWorld(options,record.created);}};
 const context=vm.createContext({AbortController,withDeadline,classifyTown3DFailure,Error,initialFailed:failedBefore,mockModule:module,initialState:state,
  console:{warn(){}},$:node,rpgArt:{loadRemaining(){record.loadedRemaining++;return Promise.resolve();}},
  transitions:{begin(){return()=>{record.finished++;};},enter(){}},clearInput(){},updateViewUI(){record.updated++;},restoreExhibits(){record.restored++;},notify:text=>notices.push(text),localStorage:{setItem:(key,value)=>storage.set(key,value)}});
 vm.runInContext(`let viewRequest=0,viewAbort=null,world=null,worldModule=mockModule,worldFailed=initialFailed,view='2d',viewFailure='',state=initialState;const viewKey='halloween-exhibition:horror-view:v1';${setViewSource};globalThis.setView=setView;globalThis.snapshot=()=>({view,viewFailure,worldFailed,world,state});globalThis.setModule=value=>{worldModule=value;};`,context);
 return {setView:context.setView,snapshot:context.snapshot,setModule:context.setModule,node,storage,notices,record,state};
}

test('an explicit 3D retry recreates the world after a previous WebGL context failure',async()=>{
 const world={resize(){}},h=harness({createWorld:()=>world});assert.equal(h.snapshot().worldFailed,true);
 await h.setView('3d');assert.equal(h.record.created,1);assert.equal(h.snapshot().world,world);assert.equal(h.snapshot().view,'3d');assert.equal(h.snapshot().worldFailed,false);assert.equal(h.node('view-3d').disabled,false);
 assert.equal(h.storage.get('halloween-exhibition:horror-view:v1'),'3d');
});

test('a quiet GPU failure keeps the requested 3D preference and exposes a reason with retry',async()=>{
 const h=harness({createWorld:()=>{throw Error('Error creating WebGL context.');}});
 await h.setView('3d',{quiet:true});assert.equal(h.snapshot().view,'2d');assert.equal(h.storage.get('halloween-exhibition:horror-view:v1'),'3d');
 assert.match(h.snapshot().viewFailure,/端末またはブラウザー/);assert.equal(h.node('maze-view-status').hidden,false);assert.equal(h.node('maze-view-status').textContent,h.snapshot().viewFailure);assert.equal(h.node('maze-view-retry').hidden,false);
 assert.equal(h.node('view-3d').disabled,false);assert.equal(h.notices.length,0);assert.equal(h.record.finished,1);assert.equal(h.record.loadedRemaining,1);
});

test('a module communication failure remains visible on quiet startup without overwriting saved 3D',async()=>{
 const h=harness(),request=deferred();h.setModule(request.promise);h.storage.set('halloween-exhibition:horror-view:v1','3d');
 const operation=h.setView('3d',{quiet:true,persist:false});request.reject(Error('Failed to fetch dynamically imported module'));await operation;
 assert.equal(h.snapshot().view,'2d');assert.equal(h.storage.get('halloween-exhibition:horror-view:v1'),'3d');assert.match(h.node('maze-view-status').textContent,/表示データ/);assert.equal(h.node('maze-view-status').hidden,false);assert.equal(h.node('maze-view-retry').hidden,false);assert.equal(h.record.created,0);
});

test('a successful second attempt clears the failure and preserves position, inventory and progress',async()=>{
 const world={resize(){}},h=harness({createWorld:(_options,attempt)=>{if(attempt===1)throw Error('Error creating WebGL context.');return world;}});
 const original=JSON.parse(JSON.stringify(h.state));await h.setView('3d',{quiet:true});assert.equal(h.snapshot().view,'2d');await h.setView('3d',{quiet:true});
 assert.equal(h.record.created,2);assert.equal(h.snapshot().view,'3d');assert.equal(h.snapshot().world,world);assert.equal(h.snapshot().viewFailure,'');assert.equal(h.node('maze-view-status').textContent,'');assert.equal(h.node('maze-view-status').hidden,true);assert.equal(h.node('maze-view-retry').hidden,true);
 assert.equal(h.snapshot().state,h.state);assert.deepEqual({...h.state,pitch:original.pitch},original);assert.equal(h.record.restored,1);assert.equal(h.storage.get('halloween-exhibition:horror-view:v1'),'3d');
});

test('choosing 2D after a failed request clears the failure and explicitly saves 2D',async()=>{
 const h=harness({createWorld:()=>{throw Error('Error creating WebGL context.');}});await h.setView('3d',{quiet:true});await h.setView('2d',{quiet:true});
 assert.equal(h.snapshot().view,'2d');assert.equal(h.storage.get('halloween-exhibition:horror-view:v1'),'2d');assert.equal(h.node('maze-view-status').hidden,true);assert.equal(h.node('maze-view-retry').hidden,true);
});
