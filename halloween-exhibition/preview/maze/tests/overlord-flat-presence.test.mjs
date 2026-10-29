import test from 'node:test';
import assert from 'node:assert/strict';
import {createStageRenderer} from '../stage-2d.js';
import {createArtLibrary} from '../rpg-art.js';
import {initialState} from '../maze-model.js';

const open={unlocked:true,horrorAccepted:true,overlordUnlocked:true};
const near={...initialState(),...open,x:92,z:18.8};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness(art,loadQueenPreview){
 const makeCanvas=(width,height)=>{
  const draws=[],texts=[],gradient={addColorStop(){}};
  const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:20}),drawImage(image,...args){draws.push({image,args});},fillText(value){texts.push(value);}},{get:(target,key)=>key in target?target[key]:()=>{},set(target,key,value){target[key]=value;return true;}});
  return {width,height,draws,texts,getContext:()=>context};
 };
 const renderer=createStageRenderer({makeCanvas,art,loadQueenPreview}),canvas=makeCanvas(390,620);
 return {canvas,renderer,render:(extra={})=>renderer.render({canvas,state:near,motion:false,encounters:true,...extra})};
}

test('flat exploration starts the deferred queen on approach and keeps embedded art when the network fails',async()=>{
 const requests=[],preview={width:128,height:192,id:'embedded-queen'},previewRequests=[];
 const art=createArtLibrary({deferOptional:true,deferScene:true,loadPlayer:false,motionData:{},loadImage:async url=>{requests.push(url);throw Error('offline');}});
 const h=harness(art,async url=>{previewRequests.push(url);return preview;});
 h.render({state:{...initialState(),...open}});await settle();
 assert.equal(requests.length,0,'opening the corridor does not fetch the optional queen');
 assert.equal(previewRequests.length,0,'an off-screen queen does not even decode its preview');
 h.render();await settle();
 assert.equal(previewRequests.length,1);
 assert(previewRequests[0].startsWith('data:image/webp;base64,'),'the preview requires no network request');
 assert.equal(requests.length,2,'the existing image library performs its bounded two attempts');
 assert(requests.every(url=>url.includes('/assets/overlord/queen-original-art-v1.webp')));
 assert(art.failures.includes('nameless_overlord'),'the regression reproduces a full-art transfer failure');
 for(const cameraDistance of ['normal','wide','far']){
  h.canvas.draws.length=0;h.render({cameraDistance});
  assert(h.canvas.draws.some(call=>call.image===preview),cameraDistance+' still draws the embedded queen');
  assert(!h.canvas.texts.includes('覇王Sを迎えています…'),'a missing optional transfer cannot replace the queen with an endless loading label');
 }
 for(let frame=0;frame<20;frame++)h.render({time:frame});
 await settle();assert.equal(requests.length,2,'exploration frames do not create a request loop');
 assert.equal(previewRequests.length,1);
 h.canvas.draws.length=0;h.render({cleared:['nameless_overlord'],cameraDistance:'far'});
 assert(h.canvas.draws.some(call=>call.image===preview),'the queen remains in her room after a victory, matching 3D exploration');
});

test('paused flat exploration redraws as embedded and full queen images become available',async()=>{
 let resolvePreview,resolveFull,ensures=0;
 const previewPromise=new Promise(resolve=>resolvePreview=resolve),fullPromise=new Promise(resolve=>resolveFull=resolve);
 const preview={width:128,height:192,id:'preview'},full={width:1024,height:1536,id:'full'};
 const art={images:{},version:0,ensure(id){assert.equal(id,'nameless_overlord');ensures++;return fullPromise;}};
 const h=harness(art,()=>previewPromise);
 assert.equal(h.render(),true);await settle();assert.equal(ensures,1);
 assert.equal(h.render(),false,'identical paused frames reuse their output while decoding');
 resolvePreview(preview);await settle();
 assert.equal(h.render(),true,'embedded decode completion invalidates the paused frame');
 assert(h.canvas.draws.some(call=>call.image===preview));
 assert.equal(h.render(),false);
 h.canvas.draws.length=0;resolveFull(full);await settle();
 assert.equal(h.render(),true,'full-art completion invalidates the same paused frame');
 assert(h.canvas.draws.some(call=>call.image===full));
 assert(!h.canvas.draws.some(call=>call.image===preview),'full art upgrades the existing queen in place');
 assert.equal(ensures,1);
});

test('unlocking the throne redraws an otherwise identical reduced-motion frame',async()=>{
 const preview={width:128,height:192};let ensures=0;
 const h=harness({images:{},version:0,ensure(){ensures++;return new Promise(()=>{});}},async()=>preview);
 h.render({state:{...near,overlordUnlocked:false}});await settle();assert.equal(ensures,0);
 assert.equal(h.render(),true,'door availability is part of the cached-frame signature');
 await settle();h.render();assert.equal(ensures,1);
 assert(h.canvas.draws.some(call=>call.image===preview));
});
