import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CREATOR_HOMES,CREATOR_QUARTER_ID,CREATOR_QUARTER_LAYOUT,CREATOR_QUARTER_LAYOUT_VERSION,CREATOR_QUARTER_CONNECTION,migrateCreatorQuarterPosition} from '../creator-homes.js';
import {getTownMap,isTownWalkable,initialTownState,restoreTownState,interactTown,moveTown} from '../town-model.js';
import {createTownSession} from '../controller.js';
import {exportTownState,importTownState} from '../save-model.js';

const map=getTownMap(CREATOR_QUARTER_ID);
const legacyDoor=index=>({x:6.5+(index%4)*11,z:8.5+Math.floor(index/4)*11});
const fixture=()=>{const state=restoreTownState({...initialTownState(),coins:123,hp:42,energy:2,inventory:{tonic:7},flags:{intro:true,maskStarted:true,lamps:[],stamps:['stamp-market'],gearNotes:[]},visited:['lantern-town','creator-quarter',CREATOR_HOMES[5].interiorId],steps:264,battleReceipts:['town-battle-kept']});delete state.layoutVersion;return state;};

test('the quarter expands actual physical spacing rather than shrinking houses or changing the camera',()=>{
 assert.deepEqual(CREATOR_QUARTER_LAYOUT,{width:80,height:88,columns:4,pitchX:18,pitchZ:17,roadWidth:5});
 assert.equal(CREATOR_HOMES.length,17);assert.ok(map.width*map.height>48*48*3);
 for(const [index,home] of CREATOR_HOMES.entries()){
  assert.equal(home.w,7);assert.equal(home.h,5);assert.equal(home.interiorId,'creator-home-'+home.creatorId);
  assert.equal(home.gridRow,Math.floor(index/4)+1);assert.equal(home.gridColumn,(home.x-7)/18+1);
  if(index<16){assert.equal(home.x,7+(index%4)*18);assert.equal(home.z,6+Math.floor(index/4)*17);}
 }
 for(let row=0;row<4;row++)for(let col=0;col<3;col++){const a=CREATOR_HOMES[row*4+col],b=CREATOR_HOMES[row*4+col+1];assert.equal(b.x-(a.x+a.w),11,'side clearance increased from four tiles to eleven');}
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){const a=CREATOR_HOMES[row*4+col],b=CREATOR_HOMES[(row+1)*4+col];assert.equal(b.z-(a.z+a.h),12,'front/back clearance increased from six tiles to twelve');}
 // Real player-radius samples across every five-tile east/west boulevard.
 for(const z of [12,29,46,63,80])for(let x=1.25;x<78.8;x+=.5)for(let dz=.25;dz<5;dz+=.5)assert.ok(isTownWalkable(map,x,z+dz),`boulevard ${x},${z+dz}`);
 for(const x of [1,19,37,55,73])for(let z=1.25;z<86.8;z+=.5)for(let dx=.25;dx<5;dx+=.5)assert.ok(isTownWalkable(map,x+dx,z),`avenue ${x+dx},${z}`);
});

test('all sixteen old doorstep saves and checkpoints migrate to the same creator, exactly once',()=>{
 for(let index=0;index<16;index++){
  const home=CREATOR_HOMES[index],source={...fixture(),mapId:CREATOR_QUARTER_ID,position:legacyDoor(index),checkpoint:{mapId:CREATOR_QUARTER_ID,position:legacyDoor(index)}},before=structuredClone(source),restored=restoreTownState(source);
  assert.deepEqual(restored.position,home.door,home.creatorId);assert.deepEqual(restored.checkpoint.position,home.door);assert.equal(restored.layoutVersion,CREATOR_QUARTER_LAYOUT_VERSION);
  for(const key of ['coins','hp','energy','inventory','flags','visited','steps','battleReceipts'])assert.deepEqual(restored[key],source[key],key);
  assert.deepEqual(source,before,'migration does not mutate the original saved record');assert.deepEqual(restoreTownState(restored),restored,'layoutVersion makes migration idempotent');
  const imported=importTownState(exportTownState(source));assert.equal(imported.ok,true);assert.deepEqual(imported.state.position,home.door);assert.deepEqual(imported.state.checkpoint,restored.checkpoint);
  const entered=interactTown(restored,home.id);assert.equal(entered.transition,true);assert.equal(entered.state.mapId,home.interiorId);
 }
});

test('old exterior coordinates recover walkably, including new obstacles, malformed positions and the old entrance',()=>{
 let recovered=0;
 for(let z=1.5;z<47;z++)for(let x=1.5;x<47;x++){
  const position={x,z},candidate=migrateCreatorQuarterPosition(position,undefined),state=restoreTownState({...fixture(),mapId:CREATOR_QUARTER_ID,position,checkpoint:{mapId:CREATOR_QUARTER_ID,position}});
  assert.ok(isTownWalkable(map,state.position.x,state.position.z));assert.ok(isTownWalkable(map,state.checkpoint.position.x,state.checkpoint.position.z));
  assert.ok(map.portals.filter(p=>p.openPassage).every(p=>Math.hypot(p.x-state.position.x,p.z-state.position.z)>=1.2),'old saves never auto-transfer at the first movement');
  if(!isTownWalkable(map,candidate.x,candidate.z))recovered++;
 }
 assert.ok(recovered>0,'actual new blocked coordinates exercised nearest-safe recovery');
 assert.deepEqual(restoreTownState({...fixture(),mapId:CREATOR_QUARTER_ID,position:{x:23.5,z:44.5}}).position,CREATOR_QUARTER_CONNECTION.quarterArrival);
 for(const position of [{x:NaN,z:12},{x:999,z:12},{x:12,z:-7},null])assert.deepEqual(restoreTownState({...fixture(),mapId:CREATOR_QUARTER_ID,position}).position,map.spawn);
});

test('old room saves keep their room coordinates while an exterior checkpoint follows the moved house',()=>{
 for(let index=0;index<16;index++){
  const home=CREATOR_HOMES[index],state=restoreTownState({...fixture(),mapId:home.interiorId,position:home.interiorSpawn,checkpoint:{mapId:CREATOR_QUARTER_ID,position:legacyDoor(index)}});
  assert.deepEqual(state.position,home.interiorSpawn);assert.deepEqual(state.checkpoint.position,home.door);
  const exit=getTownMap(home.interiorId).portals[0],returned=interactTown({...state,position:{x:exit.x,z:exit.z}},exit.id);
  assert.equal(returned.transition,true);assert.deepEqual(returned.state.position,home.door);assert.ok(isTownWalkable(map,returned.state.position.x,returned.state.position.z));
 }
 const source={...fixture(),mapId:'lantern-town',position:{x:32.5,z:7.5},checkpoint:{mapId:'inn',position:{x:9.5,z:12.5}}};
 const state=restoreTownState(source);assert.deepEqual(state.position,source.position);assert.deepEqual(state.checkpoint,source.checkpoint);
 const invalid=restoreTownState({...source,position:{x:25.5,z:2.5},checkpoint:{mapId:'inn',position:{x:2.5,z:2.5}}});assert.deepEqual(invalid.position,getTownMap().spawn);assert.deepEqual(invalid.checkpoint,initialTownState().checkpoint,'unrelated map recovery behavior stays unchanged');
});

test('all seventeen direct visits enter and return through clear doors and can walk onto the wider streets',()=>{
 for(const home of CREATOR_HOMES){
  const session=createTownSession();assert.equal(session.visitCreatorHome(home.creatorId).transition,true);assert.equal(session.target().id,home.id);
  assert.equal(session.interact(home.id).transition,true);assert.equal(session.snapshot().state.mapId,home.interiorId);
  const exit=getTownMap(home.interiorId).portals[0];session.replace({...session.snapshot().state,position:{x:exit.x,z:exit.z}});assert.equal(session.interact(exit.id).transition,true);
  let state=session.snapshot().state;assert.deepEqual(state.position,home.door);
  for(let step=0;step<16;step++){state=moveTown(state,0,.25);assert.ok(isTownWalkable(map,state.position.x,state.position.z));}
  assert.ok(Math.abs(state.position.z-(home.door.z+4))<1e-8,'walking south leaves the facade without clipping');
 }
});

test('reading directions use authored row/column metadata, including Doyle on the second southern lot',async()=>{
 const source=await readFile(new URL('../app.js',import.meta.url),'utf8');assert.match(source,/row=home\?\.gridRow\|\|1,col=home\?\.gridColumn\|\|1/);assert.doesNotMatch(source,/\(home\.[xz]-3\)\/11/);
 const doyle=CREATOR_HOMES.at(-1);assert.equal(doyle.creatorId,'dandy_snake880');assert.equal(doyle.gridRow,5);assert.equal(doyle.gridColumn,2);
});

test('rendered avenue clearances stay open at the actual first-person eye height',async()=>{
 const THREE=await import('../../maze/vendor/three.module.js'),{createTownSceneGeometry}=await import('../world-3d.js'),{TOWN_EYE_HEIGHT}=await import('../eye-camera.js');
 const scene=createTownSceneGeometry(map),ray=new THREE.Raycaster();ray.far=2.3;
 try{
  // A 4.6-tile view corridor is unobstructed by real wall, window, tree and
  // ornament geometry, not merely marked walkable in a tile grid.
  for(const x of [21.5,39.5,57.5])for(const z of [8.5,25.5,42.5,59.5])for(const dx of [-1,1]){
   ray.set(new THREE.Vector3(x,TOWN_EYE_HEIGHT,z),new THREE.Vector3(dx,0,0));assert.equal(ray.intersectObjects(scene.root.children,false).length,0,`north/south avenue at ${x},${z}`);
  }
  for(const z of [14.5,31.5,48.5,65.5,82.5])for(const x of [10.5,28.5,46.5,64.5])for(const dz of [-1,1]){
   ray.set(new THREE.Vector3(x,TOWN_EYE_HEIGHT,z),new THREE.Vector3(0,0,dz));assert.equal(ray.intersectObjects(scene.root.children,false).length,0,`east/west boulevard at ${x},${z}`);
  }
 }finally{scene.dispose();}
});
