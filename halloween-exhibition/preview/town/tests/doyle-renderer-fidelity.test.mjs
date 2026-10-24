import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownRenderer} from '../renderer.js';
import {getCreatorHome} from '../creator-homes.js';
import {getTownMap,initialTownState,interactTown} from '../town-model.js';

function harness(){
 const requestedRigs=[],drawnImages=[];
 function makeCanvas(width,height){
  const canvas={width,height};
  const context=new Proxy({canvas,globalAlpha:1,measureText:value=>({width:String(value).length*9}),createPattern:()=>null,
   createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),
   drawImage(image){drawnImages.push(image);}},
   {get:(target,key)=>key in target?target[key]:(()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});
  canvas.getContext=()=>context;return canvas;
 }
 const art={images:{},version:0,rigs:{get(id){requestedRigs.push(id);return null;}}};
 const canvas=makeCanvas(640,600),renderer=createTownRenderer({makeCanvas,art,deferAssets:true,loadImage:async()=>({width:512,height:512})});
 return {canvas,renderer,requestedRigs,drawnImages};
}

test('Doyle never becomes a generic home resident while his authored image is unavailable',()=>{
 const home=getCreatorHome('dandy_snake880');
 for(const mapId of ['creator-quarter',home.interiorId]){
  const {canvas,renderer,requestedRigs,drawnImages}=harness(),map=getTownMap(mapId);
  const resident=map.npcs.find(n=>n.creatorId===home.creatorId),state={...initialTownState(),mapId,position:{x:resident.x,z:resident.z+1}};
  try{
   renderer.render({canvas,state,motion:false,creatorActors:[]});
   assert.ok(!requestedRigs.includes('resident:'+resident.id),'no unrelated resident fallback is requested');
   const image={width:128,height:128},actor={id:'review-doyle',creatorId:home.creatorId,creatorHome:true,x:resident.x,z:resident.z,
    sprite:{image,frame:[0,0,128,128],anchorX:.5,anchorY:1,contentHeight:128},heightPx:76};
   renderer.render({canvas,state,motion:false,creatorActors:[actor]});
   assert.ok(drawnImages.includes(image),'the actual authored actor still renders as soon as available');
  }finally{renderer.destroy();}
 }
});

test('the narrow Doyle visual guard leaves existing residents, door entry and article desk actions intact',()=>{
 const {canvas,renderer,requestedRigs}=harness(),map=getTownMap('creator-quarter');
 const existing=map.npcs.find(n=>n.creatorId==='ss_yr');
 try{
  renderer.render({canvas,state:{...initialTownState(),mapId:map.id,position:{x:existing.x,z:existing.z+1}},motion:false});
  assert.ok(requestedRigs.includes('resident:'+existing.id),'existing creator rendering is unchanged');
 }finally{renderer.destroy();}
 const home=getCreatorHome('dandy_snake880'),entered=interactTown({...initialTownState(),mapId:map.id,position:home.door},home.id);
 assert.equal(entered.transition,true);assert.equal(entered.state.mapId,home.interiorId);
 const room=getTownMap(home.interiorId),desk=room.targets.find(target=>target.type==='creator-works');
 assert.ok(desk);assert.equal(interactTown({...entered.state,position:{x:desk.x,z:desk.z}},desk.id).creatorWorks,home.creatorId);
});
