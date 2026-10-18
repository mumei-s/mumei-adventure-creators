import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stageCamera} from '../stage-2d.js';
import {initialState,blocked} from '../maze-model.js';
import {cameraDistanceScale,mazeWideCamera,readCameraDistance,saveCameraDistance} from '../../camera-distance.js';
test('wide view increases visible ground on phone, tablet and desktop without moving the player',()=>{
 for(const [w,h]of[[320,400],[820,700],[1280,720]]){const state=initialState(),before={...state},normal=stageCamera(state,w,h),wide=stageCamera(state,w,h,'wide');assert.ok(wide.scale<normal.scale);assert.ok(w/wide.scale>w/normal.scale);assert.deepEqual(state,before);}
 assert.equal(cameraDistanceScale('other'),1);
});
test('third person camera has wall clearance and remains below the ceiling',()=>{
 for(const state of [{...initialState(),yaw:0},{x:2.6,z:30.6,yaw:1.7,unlocked:false,horrorAccepted:false}]){
  const pose=mazeWideCamera(state,blocked);assert.ok(pose.distance<=5);assert.ok(pose.y<7.4);for(const dx of[-.32,.32])for(const dz of[-.32,.32])assert.equal(blocked(pose.x+dx,pose.z+dz,state),false);
 }
});
test('street and underground retain independent camera modes and tolerate denied storage',()=>{
 const previous=globalThis.localStorage;const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
 try{saveCameraDistance('town','wide');assert.equal(readCameraDistance('town'),'wide');assert.equal(readCameraDistance('maze'),'normal');globalThis.localStorage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};assert.equal(readCameraDistance('town'),'normal');assert.doesNotThrow(()=>saveCameraDistance('town','wide'));}finally{globalThis.localStorage=previous;}
});
test('camera buttons are reachable in both games and their menus include the comparison page',()=>{
 for(const page of ['town','maze']){const base=new URL(`../../${page}/`,import.meta.url),html=fs.readFileSync(new URL('index.html',base),'utf8'),app=fs.readFileSync(new URL('app.js',base),'utf8');assert.match(html,/id="camera-distance"/);assert.match(app,/cameraDistance/);assert.match(app,/\.\.\/characters\//);}
});
