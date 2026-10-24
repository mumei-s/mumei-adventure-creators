import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createTownEyeCamera,townEyeLevel,townFacingYaw} from '../eye-camera.js';
import {getTownMap,initialTownState} from '../town-model.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('eye camera applies only to outdoor normal, not rooms, wide, far or 2D input',()=>{
 assert.equal(townEyeLevel(getTownMap('lantern-town')),true);assert.equal(townEyeLevel(getTownMap('creator-quarter')),true);
 for(const distance of ['wide','far'])assert.equal(townEyeLevel(getTownMap('lantern-town'),distance),false);
 assert.equal(townEyeLevel(getTownMap('inn')),false);
 const camera=createTownEyeCamera();camera.sync({...initialTownState(),facing:'left'});
 const input=camera.input({keys:new Set(['arrowup']),eye:false});near(input.x,0);near(input.z,-1);
});
test('forward follows all arrival orientations while strafing never turns the camera',()=>{
 const camera=createTownEyeCamera();for(const [facing,x,z]of [['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]]){
  camera.sync({...initialTownState(),facing},{reset:true});const input=camera.input({keys:new Set(['w']),eye:true});near(input.x,x);near(input.z,z);
  const yaw=camera.snapshot().yaw;camera.input({keys:new Set(['d']),eye:true});near(camera.snapshot().yaw,yaw);
 }
});
test('arrow and pad rotate in eye mode, WASD strafes, diagonal speed stays bounded',()=>{
 const camera=createTownEyeCamera();camera.sync({...initialTownState(),facing:'up'});
 const rotate=camera.input({direction:'left',eye:true,dt:.05});near(rotate.x,0);near(rotate.z,0);near(camera.snapshot().yaw,.115);
 const move=camera.input({keys:new Set(['w','d']),eye:true});near(Math.hypot(move.x,move.z),1);
 camera.input({direction:'right',eye:true,dt:.05});near(camera.snapshot().yaw,0);
 camera.look(100,10000);near(camera.snapshot().yaw,-.5);near(camera.snapshot().pitch,-.6);
 camera.look(0,-10000);near(camera.snapshot().pitch,.6);
});
test('movement-facing changes do not hijack view; arrivals and explicit same-map travel reset it',()=>{
 const camera=createTownEyeCamera(),state={...initialTownState(),facing:'up'};camera.sync(state);camera.look(100,20);const looked=camera.snapshot();
 camera.sync({...state,facing:'right'});assert.deepEqual(camera.snapshot(),looked);
 camera.sync({...state,mapId:'inn',facing:'up'});near(camera.snapshot().pitch,0);
 camera.sync({...state,mapId:'lantern-town',facing:'down'});near(camera.snapshot().yaw,Math.PI);
 camera.sync({...state,facing:'up'},{reset:true});near(camera.snapshot().yaw,0);
 // A fresh controller recovers the existing saved facing without changing its schema.
 const fresh=createTownEyeCamera();fresh.sync({...state,facing:'left'});near(fresh.snapshot().yaw,townFacingYaw('left'));
});
test('app wires transition reset, pause-safe rotation, pinch cleanup and drag-not-tap',()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(source,/if\(result.transition\)\{eyeCamera.sync\(result.state,\{reset:true\}\)/);
 assert.match(source,/inputVector\(panel.open\?0:dt\)/);assert.match(source,/eyeCamera.sync\(snapshot.state\)/);
 assert.match(source,/onStart:clearInput/);assert.match(source,/if\(start.moved\|\|/);assert.match(source,/pointer.moved=true/);
 assert.ok(source.indexOf('bindPinchZoom(surface')<source.indexOf("surface.addEventListener('pointermove'"));
});

test('both backup restoration and a new journey reset same-map camera orientation',()=>{const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.equal((source.match(/session.replace\(next\);eyeCamera.sync\(next,\{reset:true\}\)/g)||[]).length,2);});

test('six outdoor passage crossings align the view with arrival facing and retain release protection',async()=>{
 const {CREATOR_AREA_ROUTES}=await import('../creator-homes.js'),{createTownSession}=await import('../controller.js');
 const opposite={up:'down',down:'up',left:'right',right:'left'};
 for(const route of CREATOR_AREA_ROUTES)for(const fromQuarter of [false,true]){
  const mapId=fromQuarter?'creator-quarter':'lantern-town',position={...(fromQuarter?route.quarterArrival:route.streetArrival)},facing=opposite[fromQuarter?route.toQuarterFacing:route.toStreetFacing];
  const session=createTownSession({state:{...initialTownState(),mapId,position,facing}}),camera=createTownEyeCamera();camera.sync(session.snapshot().state);
  for(let n=0;n<150&&session.snapshot().state.mapId===mapId;n++){session.tick(.05,{...camera.input({keys:new Set(['w']),eye:true,dt:.05})});camera.sync(session.snapshot().state);}
  const arrival=session.snapshot().state;assert.notEqual(arrival.mapId,mapId);near(camera.snapshot().yaw,townFacingYaw(arrival.facing));near(camera.snapshot().pitch,0);
  for(let n=0;n<100;n++)session.tick(.05,camera.input({keys:new Set(['w']),eye:true,dt:.05}));assert.deepEqual(session.snapshot().state.position,arrival.position);
 }
});
