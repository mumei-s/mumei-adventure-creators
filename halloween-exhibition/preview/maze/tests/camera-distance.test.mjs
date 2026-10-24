import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stageCamera} from '../stage-2d.js';
import {initialState,blocked} from '../maze-model.js';
import {CAMERA_DISTANCE_STAGES,cameraDistanceScale,nextCameraDistance,cameraDistanceLabel,mazeCameraZoom,mazeWideCamera,readCameraDistance,saveCameraDistance,readCameraZoom,saveCameraZoom} from '../../camera-distance.js';
test('wide view increases visible ground on phone, tablet and desktop without moving the player',()=>{
 for(const [w,h]of[[320,400],[820,700],[1280,720]]){const state=initialState(),before={...state},normal=stageCamera(state,w,h),wide=stageCamera(state,w,h,'wide'),far=stageCamera(state,w,h,'far');assert.ok(wide.scale<normal.scale);assert.ok(w/wide.scale>w/normal.scale);assert.ok(Math.abs(far.scale/normal.scale-.48)<1e-12);assert.ok(w/far.scale>w/wide.scale*1.4);assert.deepEqual(state,before);}
 assert.equal(cameraDistanceScale('other'),1);
});
test('third person camera has wall clearance and remains below the ceiling',()=>{
 for(const stage of['wide','far'])for(const state of [{...initialState(),yaw:0},{x:2.6,z:30.6,yaw:1.7,unlocked:false,horrorAccepted:false}]){
  const pose=mazeWideCamera(state,blocked,stage);assert.ok(pose.distance<=(stage==='far'?8:5));assert.ok(pose.y<7.4);for(const dx of[-.32,.32])for(const dz of[-.32,.32])assert.equal(blocked(pose.x+dx,pose.z+dz,state),false);
 }
});
test('far view uses more open floor but a locked barrier still limits every camera step',()=>{
 const state={x:0,z:0,yaw:0,unlocked:false},barrier=(_x,z,state)=>!state.unlocked&&z>=3;
 const wide=mazeWideCamera({...state,unlocked:true},barrier),far=mazeWideCamera({...state,unlocked:true},barrier,'far');assert.equal(wide.distance,5);assert.equal(far.distance,8);assert.equal(far.y,5.3);
 const limited=mazeWideCamera(state,barrier,'far');assert.ok(limited.distance<3-.32);assert.ok(limited.distance<far.distance);
 for(let step=.25;step<=limited.distance;step+=.25)for(const dx of[-.32,.32])for(const dz of[-.32,.32])assert.equal(barrier(dx,step+dz,state),false,'no intermediate sample crosses a locked barrier');
 for(const zoom of[.65,1,1.4]){assert.equal(mazeCameraZoom('normal',zoom),zoom);assert.equal(mazeCameraZoom('wide',zoom),zoom);assert.ok(Math.abs(mazeCameraZoom('far',zoom)/zoom-.48/.68)<1e-12);}
});
test('street and underground retain independent camera modes and tolerate denied storage',()=>{
 const previous=globalThis.localStorage;const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
 try{saveCameraDistance('town','wide');saveCameraZoom('town',.82);assert.equal(readCameraDistance('town'),'wide');assert.equal(readCameraDistance('maze'),'normal');saveCameraDistance('maze','far');assert.equal(readCameraDistance('maze'),'far');assert.equal(readCameraDistance('town'),'wide','existing saved wide is not migrated or overwritten');assert.equal(readCameraZoom('town'),.82);globalThis.localStorage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};assert.equal(readCameraDistance('town'),'normal');assert.doesNotThrow(()=>saveCameraDistance('town','wide'));}finally{globalThis.localStorage=previous;}
});
test('legacy stages retain their meanings while both games use a viewpoint picker without changing zoom',()=>{
 assert.deepEqual(CAMERA_DISTANCE_STAGES,['normal','wide','far']);assert.deepEqual(CAMERA_DISTANCE_STAGES.map(cameraDistanceLabel),['標準','引き','遠景']);assert.equal(nextCameraDistance('normal'),'wide');assert.equal(nextCameraDistance('wide'),'far');assert.equal(nextCameraDistance('far'),'normal');
 for(const page of['town','maze']){
  const source=fs.readFileSync(new URL(`../../${page}/app.js`,import.meta.url),'utf8');
  assert.match(source,/cycleViewpoint/);assert.match(source,/readViewpoint/);assert.match(source,/saveViewpoint/);
  assert.doesNotMatch(source,/cameraDistance=nextCameraDistance/);
  assert.match(source,/bindPinchZoom/);assert.match(source,/saveCameraZoom/);
 }
});
test('camera buttons are reachable in both games and their menus include the comparison page',()=>{
 for(const page of ['town','maze']){const base=new URL(`../../${page}/`,import.meta.url),html=fs.readFileSync(new URL('index.html',base),'utf8'),app=fs.readFileSync(new URL('app.js',base),'utf8');assert.match(html,/id="camera-distance"/);assert.match(app,/cameraDistance/);assert.match(app,/\.\.\/characters\//);}
});
