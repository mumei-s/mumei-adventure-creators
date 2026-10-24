import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATOR_HOMES} from '../creator-homes.js';
import {getTownMap} from '../story-data.js';
import {createTownSceneGeometry} from '../world-3d.js';
import {creatorInteriorPalette,drawCreatorInteriorFloor2D,drawCreatorInteriorWalls2D,drawCreatorFurniture2D,drawCreatorRoute2D,drawCreatorRouteSign2D} from '../creator-interior-painter.js';
import {creatorRoomCameraScale,creatorRoomCameraFollow} from '../creator-interior-view.js';

function canvasContext(){
 const calls=[];let saved=0;const gradient={addColorStop(){}};
 const c=new Proxy({save(){saved++;},restore(){saved--;},createLinearGradient:()=>gradient},{get:(target,key)=>key in target?target[key]:(...values)=>calls.push([key,...values])});
 return {c,calls,saved:()=>saved};
}

test('every creator room paints its own wall name, themed floor and complete furniture without palace images',()=>{
 const signatures=new Set();
 for(const home of CREATOR_HOMES){
  const map=getTownMap(home.interiorId),{c,calls,saved}=canvasContext();
  assert.equal(creatorInteriorPalette(map).floor,map.interiorPalette.floor);
  assert.equal(drawCreatorInteriorFloor2D(c,map),true);assert.equal(drawCreatorInteriorWalls2D(c,map),true);
  for(const f of map.furniture)assert.equal(drawCreatorFurniture2D(c,f,map),true);
  assert.ok(calls.some(call=>call[0]==='fillText'&&call[1]===home.creatorName));
  assert.ok(calls.some(call=>call[0]==='fillText'&&call[1]===map.roomLabel));
  assert.equal(calls.some(call=>call[0]==='drawImage'),false,'native interiors cannot display an unrelated palace furniture atlas');
  for(const call of calls)for(const value of call.slice(1))if(typeof value==='number')assert.ok(Number.isFinite(value));
  assert.equal(saved(),0);signatures.add(JSON.stringify(calls.filter(call=>call[0]!=='fillText')));
 }
 assert.equal(signatures.size,17,'room drawings differ beyond the creator names');
});

test('all creator interiors have finite volumetric furniture at the exact authored footprints and dispose their materials',()=>{
 for(const home of CREATOR_HOMES){
  const map=getTownMap(home.interiorId),scene=createTownSceneGeometry(map),room=scene.root.userData.creatorInterior;
  assert.equal(room.creatorId,home.creatorId);assert.equal(room.theme,home.homeTheme);assert.deepEqual(room.exit,{x:map.portals[0].x,z:map.portals[0].z});
  assert.deepEqual(room.furniture.map(({id,kind,x,z,w,h})=>({id,kind,x,z,w,h})),map.furniture.map(({id,kind,x,z,w,h})=>({id,kind,x,z,w,h})));
  assert.equal(scene.materials.parquet.color.getHexString(),map.interiorPalette.floor.slice(1));
  let raised=0;for(const item of scene.root.children){if(item.isInstancedMesh){for(const value of item.instanceMatrix.array)assert.ok(Number.isFinite(value));raised+=item.count;}}
  assert.ok(raised>150,'shelves, room trims and individual furniture parts have real volume');
  assert.ok(scene.root.getObjectByName('creator-room-rug-'+home.creatorId));scene.dispose();assert.equal(scene.resources.size,0);
 }
});

test('street route paints continuous ground chevrons and both named signs; room pullbacks reveal more than standard',()=>{
 const map=getTownMap(),{c,calls,saved}=canvasContext();assert.equal(drawCreatorRoute2D(c,map),true);
 for(const sign of map.routeSigns)drawCreatorRouteSign2D(c,sign);
 assert.ok(calls.filter(call=>call[0]==='rotate').length>=12,'arrows continue from the palace path all the way to the housing gate');
 for(const sign of map.routeSigns)assert.ok(calls.some(call=>call[0]==='fillText'&&call[1]===sign.label));
 assert.equal(saved(),0);assert.equal(creatorRoomCameraScale('normal'),1.35);assert.equal(creatorRoomCameraScale('wide'),1);assert.ok(creatorRoomCameraScale('far')<1);
 assert.equal(creatorRoomCameraFollow(1),0);assert.ok(creatorRoomCameraFollow(1.35)>0);assert.equal(creatorRoomCameraFollow(2),1);
});
