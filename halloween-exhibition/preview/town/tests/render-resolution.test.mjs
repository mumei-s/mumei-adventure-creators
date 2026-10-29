import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {renderPixelRatio} from '../../render-quality.js';
import {createTownRenderer} from '../renderer.js';
import {initialTownState,getTownMap} from '../town-model.js';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('actual town canvas sizing uses the same bounded device ratio as its render frame',()=>{
 const context=vm.createContext({renderPixelRatio,devicePixelRatio:3});
 vm.runInContext([app.split('\n').find(line=>line.startsWith('const canvasPixelRatio=')),app.split('\n').find(line=>line.startsWith('function fitCanvas(')),'globalThis.fit=fitCanvas;globalThis.ratio=canvasPixelRatio;'].join('\n'),context);
 for(const [width,height]of[[390,844],[844,390],[768,950]]){
  const canvas={clientWidth:width,clientHeight:height,width:1,height:1};context.fit(canvas);const ratio=renderPixelRatio(width,height,3);
  assert.equal(context.ratio(canvas),ratio);assert.equal(canvas.width,Math.round(width*ratio));assert.equal(canvas.height,Math.round(height*ratio));
 }
 assert(app.includes("pixelRatio:canvasPixelRatio($('town-canvas'))"));assert(app.includes('pixelRatio:canvasPixelRatio(battleCanvas)'));
});

function makeCanvas(width,height){
 const canvas={width,height},context=new Proxy({canvas,globalAlpha:1,transforms:[],measureText:value=>({width:String(value).length*9}),createPattern:()=>null,createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),setTransform(...values){this.transforms.push(values);}}, {get:(target,key)=>key in target?target[key]:(()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});
 canvas.getContext=()=>context;return canvas;
}

test('high-density 2D town and battle preserve CSS-size projection rather than zooming the world',()=>{
 const art={images:{},version:0,rigs:{get:()=>null,battle:()=>null}},renderer=createTownRenderer({makeCanvas,art,deferAssets:true,loadImage:async()=>({width:512,height:512})}),canvas=makeCanvas(390,844);
 const map=getTownMap('inn'),state={...initialTownState(),mapId:map.id,position:{...map.spawn}},point={x:state.position.x+.6,z:state.position.z-.3};
 try{
  renderer.render({canvas,state,motion:false,pixelRatio:1});const before=renderer.worldToScreen(point),ratio=renderPixelRatio(390,844,3);
  canvas.width=Math.round(390*ratio);canvas.height=Math.round(844*ratio);renderer.render({canvas,state,motion:false,pixelRatio:ratio});const after=renderer.worldToScreen(point);
  assert(Math.hypot(after.x-before.x,after.y-before.y)<.25,'backing-resolution changes cannot zoom or shift the logical map');
  assert.equal(canvas.getContext('2d').transforms.at(-1)[0],ratio,'the renderer must not clamp a correctly sized canvas back to 2x');
  renderer.renderTownBattle({canvas,battle:{id:'quality-proof',enemyId:'canal-mist',turn:1,phase:'active'},motion:false,pixelRatio:ratio});
  const context=canvas.getContext('2d');assert.equal(context.transforms.at(-1)[0],ratio);assert.equal(context.imageSmoothingQuality,'high');
 }finally{renderer.destroy();}
});
