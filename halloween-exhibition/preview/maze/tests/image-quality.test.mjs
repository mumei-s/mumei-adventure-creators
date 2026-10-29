import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderPixelRatio} from '../../render-quality.js';
import {renderOverlordBattle2D} from '../overlord-battle-2d.js';
import {newBattle} from '../encounter-model.js';
import {withMazeWorld} from './helpers/maze-world-factory.mjs';

test('actual maze world matches a dense phone screen and recomputes its buffer after rotation without moving the camera',async()=>{
 await withMazeWorld(async({world,canvas,requests})=>{
  assert.equal(canvas.pixelRatio,2.625);
  assert.equal(canvas.width,Math.floor(390*2.625));assert.equal(canvas.height,Math.floor(844*2.625));
  assert(canvas.width*canvas.height>Math.floor(390*1.35)*Math.floor(844*1.35)*3.7,'the old mobile cap discarded most of the physical pixels');
  world.render({x:32,z:48,yaw:0,time:0,motion:false,cameraDistance:'normal'});
  const position=world.camera.position.clone(),count=requests.length;
  canvas.clientWidth=844;canvas.clientHeight=390;world.resize();
  assert.equal(canvas.width,Math.floor(844*2.625));assert.equal(canvas.height,Math.floor(390*2.625));
  assert.equal(world.camera.aspect,844/390);assert(world.camera.position.equals(position));assert.equal(requests.length,count,'resolution changes cannot load more artwork');
 },{width:390,height:844,devicePixelRatio:2.625});
});

test('the actual fallback battle uses native backing pixels while retaining identical logical actor sizes and source artwork',()=>{
 const previous=globalThis.devicePixelRatio;
 const image={width:1024,height:1536},hero={width:1024,height:1024};
 const context=new Proxy({globalAlpha:1,createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};}},{get:(object,key)=>key in object?object[key]:()=>{},set:(object,key,value)=>(object[key]=value,true)});
 const canvas={clientWidth:390,clientHeight:430,width:390,height:430,getContext:()=>context},art={images:{nameless_overlord:image,playerAtlas:hero}};
 try{
  globalThis.devicePixelRatio=1;const base=renderOverlordBattle2D({canvas,art,battle:newBattle('nameless_overlord'),motion:false});
  globalThis.devicePixelRatio=3;const dense=renderOverlordBattle2D({canvas,art,battle:newBattle('nameless_overlord'),motion:false});
  assert.equal(canvas.width,1170);assert.equal(canvas.height,1290);
  assert.deepEqual(dense.queen,base.queen);assert.deepEqual(dense.hero,base.hero);
  assert.equal(context.imageSmoothingEnabled,true);assert.equal(context.imageSmoothingQuality,'high');
 }finally{if(previous===undefined)delete globalThis.devicePixelRatio;else globalThis.devicePixelRatio=previous;}
});

test('the actual flat-canvas resize uses the same bounded resolution as the render call',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8'),definition=source.match(/function resizeFlat\(\)\{[^\n]+\}/)?.[0];assert(definition);
 const canvas={clientWidth:390,clientHeight:844};let invalidated=0;
 const resize=Function('renderPixelRatio','stageRenderer','$','devicePixelRatio',definition+';return resizeFlat;')(renderPixelRatio,{invalidate(){invalidated++;}},()=>canvas,2.625);
 resize();assert.equal(invalidated,1);assert.equal(canvas.width,Math.round(390*2.625));assert.equal(canvas.height,Math.round(844*2.625));
 assert(source.includes("pixelRatio:renderPixelRatio($('fallback').clientWidth||1,$('fallback').clientHeight||1,devicePixelRatio||1)"));
});
