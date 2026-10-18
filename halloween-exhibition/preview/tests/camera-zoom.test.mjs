import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeCameraZoom,readCameraZoom,saveCameraZoom} from '../camera-distance.js';
import {stageCamera} from '../maze/stage-2d.js';
test('camera magnification is bounded and persists independently for street and underground',()=>{
 for(const [input,want]of[[NaN,1],[Infinity,1],[null,1],[.1,.65],[10,1.4],[.9,.9]])assert.equal(normalizeCameraZoom(input),want);
 const old=globalThis.localStorage,values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 try{assert.equal(readCameraZoom('town'),1);saveCameraZoom('town',.85);assert.equal(readCameraZoom('town'),.85);assert.equal(readCameraZoom('maze'),1);saveCameraZoom('maze',1.25);assert.equal(readCameraZoom('town'),.85);assert.equal(readCameraZoom('maze'),1.25);globalThis.localStorage={getItem(){throw Error()},setItem(){throw Error()}};assert.equal(readCameraZoom('town'),1);assert.doesNotThrow(()=>saveCameraZoom('town',1));}finally{globalThis.localStorage=old;}
});
test('underground 2D pinch magnifies both camera modes without moving the player or misaligning its projection',()=>{
 const state=Object.freeze({x:32,z:40}),normal=stageCamera(state,420,600,'normal',1);
 for(const distance of ['normal','wide'])for(const zoom of [.65,1,1.4]){const camera=stageCamera(state,420,600,distance,zoom),base=stageCamera(state,420,600,distance,1);assert.ok(Math.abs(camera.scale/base.scale-zoom)<1e-10);const point={x:state.x/4*72+23,y:state.z/4*72-41},screen={x:camera.originX+(point.x-camera.x)*camera.scale,y:camera.originY+(point.y-camera.y)*camera.scale};assert.ok(Math.abs((screen.x-camera.originX)/camera.scale+camera.x-point.x)<1e-9);assert.ok(Math.abs((screen.y-camera.originY)/camera.scale+camera.y-point.y)<1e-9);}
 assert.ok(normal.scale>stageCamera(state,420,600,'wide',1).scale);assert.deepEqual(state,{x:32,z:40});
});
