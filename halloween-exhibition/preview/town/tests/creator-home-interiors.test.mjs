import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATOR_HOMES,CREATOR_QUARTER_ID,CREATOR_QUARTER_CONNECTION} from '../creator-homes.js';
import {createCreatorHomeInterior} from '../creator-home-interiors.js';
import {TOWN_MAPS,getTownMap,isTownWalkable,mapTargets} from '../story-data.js';
import {initialTownState,interactTown,restoreTownState,nearestTownTarget} from '../town-model.js';
import {exportTownState,importTownState} from '../save-model.js';
import {isInPalaceForecourt} from '../palace-forecourt.js';

function reachable(map){
 const first={x:Math.floor(map.spawn.x),z:Math.floor(map.spawn.z)},queue=[first],seen=new Set([`${first.x},${first.z}`]);
 for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const p={x:queue[i].x+dx,z:queue[i].z+dz},key=`${p.x},${p.z}`;if(!seen.has(key)&&isTownWalkable(map,p.x+.5,p.z+.5)){seen.add(key);queue.push(p);}}
 return seen;
}

test('all 16 creator homes contain a distinct walkable atelier, furniture, resident and work desk',()=>{
 const palettes=new Set(),layouts=new Set(),labels=new Set();
 for(const home of CREATOR_HOMES){
  const map=getTownMap(home.interiorId),seen=reachable(map);assert.equal(TOWN_MAPS[home.interiorId],map);assert.equal(map.outdoor,false);assert.equal(map.creatorHome.creatorId,home.creatorId);assert.equal(map.homeTheme,home.homeTheme);assert.equal(map.tiles.length,map.height);assert(map.tiles.every(row=>row.length===map.width));assert(seen.size>100);
  palettes.add(JSON.stringify(map.interiorPalette));layouts.add(JSON.stringify(map.furniture.map(({kind,x,z,w,h})=>({kind,x,z,w,h}))));labels.add(map.roomLabel);
  for(const item of map.furniture){assert(item.label);assert(!isTownWalkable(map,item.x+item.w/2,item.z+item.h/2),'furniture must block movement: '+item.id);assert(item.x>0&&item.z>0&&item.x+item.w<map.width&&item.z+item.h<map.height);}
  const resident=map.npcs.find(npc=>npc.creatorId===home.creatorId),works=map.targets.find(target=>target.type==='creator-works');assert(resident);assert.equal(resident.creatorHome,true);assert(works);assert.equal(works.creatorId,home.creatorId);
  for(const target of mapTargets(map.id)){assert(seen.has(`${Math.floor(target.x)},${Math.floor(target.z)}`),target.id+' reachable');assert(isTownWalkable(map,target.x,target.z),target.id+' floor clear');assert.equal(nearestTownTarget({...initialTownState(),mapId:map.id,position:{x:target.x,z:target.z}}).id,target.id);}
 }
 assert.equal(palettes.size,16);assert.equal(layouts.size,16);assert.equal(labels.size,16);
});

test('house thresholds enter actual rooms and every exit returns to that exact doorstep',()=>{
 for(const home of CREATOR_HOMES){
  const source={...initialTownState(),mapId:CREATOR_QUARTER_ID,position:{...home.door},coins:63,steps:82,visited:['lantern-town',CREATOR_QUARTER_ID]},entered=interactTown(source,home.id);assert.equal(entered.transition,true);assert.equal(entered.state.mapId,home.interiorId);assert.deepEqual(entered.state.position,home.interiorSpawn);assert.equal(entered.state.facing,'up');assert.equal(source.mapId,CREATOR_QUARTER_ID);assert(entered.state.visited.includes(home.interiorId));
  const map=getTownMap(home.interiorId),exit=map.portals[0],works=map.targets[0],reading=interactTown({...entered.state,position:{x:works.x,z:works.z}},works.id);assert.equal(reading.creatorWorks,home.creatorId);
  const returned=interactTown({...entered.state,position:{x:exit.x,z:exit.z}},exit.id);assert.equal(returned.transition,true);assert.equal(returned.state.mapId,CREATOR_QUARTER_ID);assert.deepEqual(returned.state.position,home.door);assert.equal(returned.state.facing,'down');
  for(const key of ['coins','steps','inventory','flags','checkpoint','battleReceipts'])assert.deepEqual(returned.state[key],source[key]);
  const farState={...source,position:{x:home.door.x,z:home.door.z+3}},far=interactTown(farState,home.id);assert.equal(far.state,farState);assert.equal(far.transition,undefined);
 }
});

test('saving, restoring and importing inside every room preserves map, location and checkpoint',()=>{
 for(const home of CREATOR_HOMES){
  const state={...initialTownState(),mapId:home.interiorId,position:{...home.interiorSpawn},checkpoint:{mapId:home.interiorId,position:{x:10.5,z:9.5}},visited:['lantern-town',CREATOR_QUARTER_ID,home.interiorId]},restored=restoreTownState(state),imported=importTownState(exportTownState(state));
  assert.equal(restored.mapId,home.interiorId);assert.deepEqual(restored.position,state.position);assert.deepEqual(restored.checkpoint,state.checkpoint);assert.equal(imported.ok,true);assert.equal(imported.state.mapId,home.interiorId);assert.deepEqual(imported.state.checkpoint,state.checkpoint);assert.deepEqual(imported.state.visited,state.visited);
 }
 assert.equal(restoreTownState({...initialTownState(),mapId:'creator-home-missing'}).mapId,'lantern-town');
});

test('room factories isolate furniture and palette edits from their home definition and other instances',()=>{
 const home=CREATOR_HOMES[0],first=createCreatorHomeInterior(home),second=createCreatorHomeInterior(home);first.furniture[0].x=900;first.creatorHome.homePalette.wall='#000000';first.interiorPalette.floor='#000000';first.portals[0].spawn.x=900;
 assert.notEqual(second.furniture[0].x,900);assert.notEqual(home.homePalette.wall,'#000000');assert.notEqual(second.interiorPalette.floor,'#000000');assert.notEqual(home.door.x,900);assert.notEqual(second.portals[0].spawn.x,900);
});

test('the plaza has a clear street connection, visible route metadata and guides outside the palace forecourt',()=>{
 const town=getTownMap(),quarter=getTownMap(CREATOR_QUARTER_ID),enter=town.portals.find(portal=>portal.id==='enter-creator-quarter');assert.deepEqual({x:enter.x,z:enter.z},CREATOR_QUARTER_CONNECTION.street);assert(enter.z<35,'primary entrance belongs beside the central plaza');assert(town.routePath.length>=4);assert(town.routeSigns.length>=2);
 for(const point of town.routePath)assert(isTownWalkable(town,point.x,point.z));
 for(const sign of town.routeSigns){assert(!isInPalaceForecourt(sign,.5));assert.match(sign.label+sign.sublabel,/家|クリエイター/);}
 const streetGuide=town.npcs.find(npc=>npc.id==='creator-street-guide'),quarterGuide=quarter.npcs.find(npc=>npc.id==='quarter-guide');assert(streetGuide?.dialogue);assert(quarterGuide?.dialogue);assert(!isInPalaceForecourt(streetGuide,.5));
 assert.equal(new Set(quarter.npcs.filter(npc=>npc.creatorHome).map(npc=>npc.creatorId)).size,16);
 for(const npc of quarter.npcs)assert(isTownWalkable(quarter,npc.x,npc.z),npc.id+' stands on clear floor');
});
