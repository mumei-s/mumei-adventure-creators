import {townControlOffset} from '../camera-framing.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownRenderer} from '../renderer.js';
import {initialTownState} from '../town-model.js';
import {TOWN_DEPTH_SCALE} from '../renderer.js';
import {cameraDistanceScale} from '../../camera-distance.js';

function harness(width=420,height=700){
 const canvases=[];
 function makeCanvas(w,h){
  const canvas={width:w,height:h,originalWidth:w,originalHeight:h,drawnFloors:[]};
  const context=new Proxy({canvas,globalAlpha:1,measureText:value=>({width:String(value).length*9}),createPattern:()=>null,
   createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),
   drawImage(image){if(image?.originalWidth===512&&image?.originalHeight===512)canvas.drawnFloors.push(image);}},
   {get:(target,key)=>key in target?target[key]:(()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});
  canvas.getContext=()=>context;canvases.push(canvas);return canvas;
 }
 const canvas=makeCanvas(width,height),renderer=createTownRenderer({makeCanvas,loadImage:async()=>({width:2048,height:2048})});
 return {canvas,renderer,floorAllocations:()=>canvases.filter(item=>item.originalWidth===512&&item.originalHeight===512).length};
}

test('street framing gives the existing view more street context and keeps facade names above their doors',async()=>{
 const {canvas,renderer}=harness();await renderer.ready;
 const state={...initialTownState(),mapId:'creator-quarter',position:{x:23.5,z:20.5}};
 try{
  for(const cameraDistance of ['normal','wide','far'])for(const cameraZoom of [.65,1,1.4]){
   renderer.render({canvas,state,motion:false,cameraDistance,cameraZoom});
   const foot=renderer.worldToScreen(state.position),east=renderer.worldToScreen({...state.position,x:state.position.x+1}),raised=renderer.worldToScreen({...state.position,y:2.2});
   const span=east.x-foot.x,previousSpan=52*cameraDistanceScale(cameraDistance)*cameraZoom;
   assert.ok(span>previousSpan*.94&&span<previousSpan*.98,'the view is a modest step wider in both camera modes');
   assert.equal(raised.x,foot.x);assert.ok(Math.abs((foot.y-raised.y)-2.2*span*TOWN_DEPTH_SCALE)<1e-9,'facade names follow physical building height at every zoom');
  }
 }finally{renderer.destroy();}
});

test('wide 2D zoom preserves screen picking at the palace, in town, and in the creator quarter',async()=>{
 for(const scenario of[
  {mapId:'lantern-town',position:{x:32.5,z:8.5},width:420,height:700},
  {mapId:'lantern-town',position:{x:28.5,z:30.5},width:1280,height:720},
  {mapId:'creator-quarter',position:{x:23.5,z:20.5},width:420,height:700},
 ]){
  const {canvas,renderer}=harness(scenario.width,scenario.height);await renderer.ready;
  const state={...initialTownState(),mapId:scenario.mapId,position:scenario.position},spans=[];
  try{
   for(const cameraZoom of[.65,1,1.4]){
    assert.equal(renderer.render({canvas,state,motion:false,cameraDistance:'wide',cameraZoom}),true,'changing zoom redraws the scene');
    for(const offset of[{x:0,z:0},{x:1.2,z:-.8},{x:-2.1,z:1.4}]){
     const point={x:state.position.x+offset.x,z:state.position.z+offset.z},screen=renderer.worldToScreen(point),back=renderer.screenToWorld(screen);
     assert.ok(Number.isFinite(screen.x)&&Number.isFinite(screen.y));assert.ok(Math.abs(back.x-point.x)<1e-9&&Math.abs(back.z-point.z)<1e-9,`${scenario.mapId} at zoom ${cameraZoom} keeps the selected world point`);
    }
    const center=renderer.worldToScreen(state.position),east=renderer.worldToScreen({x:state.position.x+1,z:state.position.z});spans.push(east.x-center.x);
    assert.equal(renderer.render({canvas,state,motion:false,cameraDistance:'wide',cameraZoom}),false,'an identical stopped view does not redraw');
   }
   assert.ok(spans[0]<spans[1]&&spans[1]<spans[2],'zoom changes actual scene scale');assert.ok(Math.abs(spans[2]/spans[0]-1.4/.65)<1e-9);
  }finally{renderer.destroy();}
 }
});

test('wide and far 2D frames retain their whole visible floor at every zoom instead of evicting it while drawing',async()=>{
 // The palace pullback plus manual wide mode used to need 25+ floor canvases;
 // the old 20-entry LRU regenerated the same floor on every following frame.
 for(const [width,height]of[[420,700],[1280,720]]){
  const {canvas,renderer,floorAllocations}=harness(width,height);await renderer.ready;
  const state={...initialTownState(),position:{x:32.5,z:8.5}};
  try{
   for(const cameraDistance of['wide','far'])for(const cameraZoom of[.65,1,1.4]){
    renderer.invalidate();assert.equal(renderer.render({canvas,state,motion:false,cameraDistance,cameraZoom}),true);
    const allocations=floorAllocations(),visible=new Set(canvas.drawnFloors);assert.ok(visible.size>0,'the test rendered actual cached ground canvases');
    const status=renderer.status();assert.ok(status.chunkLimit<=48&&status.chunkLimit>=visible.size);assert.ok(status.chunks<=48);
    for(let frame=0;frame<2;frame++){
     canvas.drawnFloors.length=0;renderer.invalidate();assert.equal(renderer.render({canvas,state,motion:false,cameraDistance,cameraZoom}),true,'force the warm frame through the real draw path');
     assert.equal(floorAllocations(),allocations,`zoom ${cameraZoom}: a warm frame allocates no replacement ground`);
     assert.deepEqual(new Set(canvas.drawnFloors),visible,'the same visible floor surfaces are reused');
     assert.ok(renderer.status().chunkLimit<=48&&renderer.status().chunks<=48);
    }
    canvas.drawnFloors.length=0;
   }
  }finally{renderer.destroy();}
 }
});


test('control safe area works for portrait, landscape, tablet and desktop without altering picking',async()=>{
 for(const [width,height,padHeight] of [[390,650,160],[844,320,118],[768,900,180],[1280,650,180]]){
  const world={top:70,bottom:70+height,height},pad={top:70+height-padHeight,bottom:70+height,height:padHeight};
  const offset=townControlOffset(world,pad);assert.ok(offset>0&&offset<=height*.22);
  const {canvas,renderer}=harness(width,height);await renderer.ready;
  const state={...initialTownState(),mapId:'creator-quarter',position:{x:23.5,z:20.5}};
  renderer.render({canvas,state,motion:false});const before=renderer.worldToScreen(state.position);
  renderer.render({canvas,state,motion:false,cameraOffsetY:offset});const after=renderer.worldToScreen(state.position);
  assert.ok(Math.abs(before.y-after.y-offset)<1e-8);assert.equal(before.x,after.x);
  const back=renderer.screenToWorld(after);assert.ok(Math.abs(back.x-state.position.x)<1e-8&&Math.abs(back.z-state.position.z)<1e-8);
  assert.equal(townControlOffset(world,{top:world.bottom,bottom:world.bottom+100,height:100}),0);
  renderer.destroy();
 }
});
