import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownRenderer} from '../renderer.js';
import {getTownMap} from '../story-data.js';
import {initialTownState} from '../town-model.js';

function harness(){
 const surfaces=[];
 function makeCanvas(width,height){
  const canvas={width,height,fills:[],ellipses:[],images:[],labels:[],clears:0};
  const context=new Proxy({canvas,
   fillRect(...args){canvas.fills.push(args);},ellipse(...args){canvas.ellipses.push(args);},
   drawImage(...args){canvas.images.push(args);},fillText(...args){canvas.labels.push(args);},
   clearRect(){canvas.clears++;}},
   {get:(target,key)=>key in target?target[key]:(()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});
  canvas.getContext=()=>context;surfaces.push(canvas);return canvas;
 }
 const renderer=createTownRenderer({makeCanvas,deferAssets:true});
 return {makeCanvas,renderer,surfaces};
}

test('a moving minimap marker reuses one static map instead of repainting every tile',()=>{
 const {makeCanvas,renderer,surfaces}=harness(),canvas=makeCanvas(160,120),map=getTownMap('creator-quarter');
 const state={...initialTownState(),mapId:map.id,position:{...map.spawn}};
 try{
  renderer.drawMap(canvas,state);const base=canvas.images.at(-1)[0],count=surfaces.length;
  assert.equal(base.fills.length,map.width*map.height);assert.equal(canvas.fills.length,0);
  const scale=Math.min(140/map.width,100/map.height),ox=(160-map.width*scale)/2,oy=(120-map.height*scale)/2;
  for(let i=1;i<=20;i++){
   state.position={x:map.spawn.x+i*.25,z:map.spawn.z};renderer.drawMap(canvas,state);
   assert.equal(canvas.images.at(-1)[0],base);assert.equal(base.fills.length,map.width*map.height);
   assert.deepEqual(canvas.ellipses.at(-1).slice(0,4),[ox+state.position.x*scale,oy+state.position.z*scale,2.8,2.8]);
  }
  assert.equal(surfaces.length,count);assert.equal(canvas.clears,21);
  assert.equal(canvas.ellipses.length,42,'only the two current-position circles draw above the cached scenery');
 }finally{renderer.destroy();}
});

test('map switches and resize rebuild the same bounded surface and retain route labels',()=>{
 const {makeCanvas,renderer,surfaces}=harness(),canvas=makeCanvas(960,720),state=initialTownState();
 try{
  renderer.drawMap(canvas,state);const base=canvas.images.at(-1)[0],count=surfaces.length;
  assert.equal(base.labels.length,3,'the large town map labels all three open routes');
  const firstFills=base.fills.length;state.mapId='creator-quarter';state.position={...getTownMap(state.mapId).spawn};
  renderer.drawMap(canvas,state);assert.equal(canvas.images.at(-1)[0],base);
  assert.equal(base.fills.length-firstFills,getTownMap(state.mapId).width*getTownMap(state.mapId).height);
  assert.equal(base.labels.length,6,'the quarter map retains all three return-route labels');
  canvas.width=160;canvas.height=120;const previousFills=base.fills.length;renderer.drawMap(canvas,state);
  assert.equal(base.width,160);assert.equal(base.height,120);assert.ok(base.fills.length>previousFills);
  assert.equal(base.labels.length,6,'the small minimap still omits large-map labels');
  assert.equal(surfaces.length,count,'changing dimensions or maps never retains another base canvas');
  const draws=canvas.images.length;renderer.destroy();assert.equal(base.width,1);assert.equal(base.height,1);
  renderer.drawMap(canvas,state);assert.equal(canvas.images.length,draws,'destroyed renderers cannot revive the cache');
 }finally{renderer.destroy();}
});
