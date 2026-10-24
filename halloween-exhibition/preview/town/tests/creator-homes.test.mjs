import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CREATOR_HOMES,CREATOR_HOMES_NOTICE,CREATOR_QUARTER_ID,CREATOR_QUARTER_CONNECTION,createCreatorQuarter,getCreatorHome} from '../creator-homes.js';
import {TOWN_MAPS,TOWN_START_MAP,TOWN_VERSION,getTownMap,isTownWalkable,mapTargets} from '../story-data.js';
import {initialTownState,interactTown,restoreTownState,nearestTownTarget} from '../town-model.js';
import {exportTownState,importTownState} from '../save-model.js';
import {compileCharacterRoster} from '../../maze/creator-runtime.js';
import {placeTownVisitors,sampleTownVisitors} from '../visitor-model.js';
const archive=JSON.parse(await readFile(new URL('../../data/archive.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('../../maze/data/creator-characters.json',import.meta.url),'utf8'));
test('every participant house has its own public creator ID evidence and an explicit fictional design interpretation',async()=>{
 const sources=JSON.parse(await readFile(new URL('../data/creator-home-sources.json',import.meta.url),'utf8'));
 assert.equal(new Set(sources.creators.map(person=>person.creatorId)).size,CREATOR_HOMES.length);
 assert.deepEqual(sources.creators.map(person=>person.creatorId).sort(),CREATOR_HOMES.map(home=>home.creatorId).sort());
 for(const person of sources.creators){const url=new URL(person.publicProfileURL);assert.equal(url.origin,'https://note.com');assert.equal(url.pathname,'/'+person.creatorId);assert.ok(person.verifiedActivityCues.length);assert.equal(person.interpretationIsInference,true);assert.ok(person.fictionalDesignInterpretation);}
});
function reachable(map){
 const first={x:Math.floor(map.spawn.x),z:Math.floor(map.spawn.z)},queue=[first],seen=new Set([`${first.x},${first.z}`]);
 for(let i=0;i<queue.length;i++)for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
  const next={x:queue[i].x+dx,z:queue[i].z+dz},key=`${next.x},${next.z}`;
  if(!seen.has(key)&&isTownWalkable(map,next.x+.5,next.z+.5)){seen.add(key);queue.push(next);}
 }
 return {queue,seen};
}

test('exactly the current 17 creators receive one distinct fictional home, including both pending profiles',()=>{
 assert.equal(CREATOR_HOMES.length,17);assert.deepEqual(CREATOR_HOMES.map(home=>home.creatorId),archive.creators.map(creator=>creator.id));
 assert.equal(new Set(CREATOR_HOMES.map(home=>home.id)).size,17);assert.equal(new Set(CREATOR_HOMES.map(home=>home.homeTheme)).size,17);assert.equal(new Set(CREATOR_HOMES.map(home=>home.motif)).size,17);assert.equal(new Set(CREATOR_HOMES.map(home=>JSON.stringify(home.homePalette))).size,17);
 for(const home of CREATOR_HOMES){assert.equal(home.kind,'creator-home');assert.equal(home.id,'home-'+home.creatorId);assert.equal(home.fictional,true);assert.ok(home.creatorName.trim());assert.ok(home.homeLabel.trim());assert.equal(getCreatorHome(home.creatorId),home);for(const color of Object.values(home.homePalette))assert.match(color,/^#[0-9a-f]{6}$/i);assert.equal(home.articleURL,undefined);}
 assert.equal(getCreatorHome('not-a-creator'),null);assert.equal(getCreatorHome('grand_daisy8632').motif,'three-stars');assert.equal(getCreatorHome('airoumu_rin').motif,'lion');assert.match(CREATOR_HOMES_NOTICE,/架空の家/);assert.match(CREATOR_HOMES_NOTICE,/実在する住まいではありません/);
});

test('the connected outdoor quarter has nonoverlapping homes and a reachable south-facing door for every creator',()=>{
 const map=getTownMap(CREATOR_QUARTER_ID);assert.equal(map.id,CREATOR_QUARTER_ID);assert.equal(map.outdoor,true);assert.equal(map.width,80);assert.equal(map.height,88);assert.equal(map.buildings.length,17);assert.equal(map.tiles.length,map.height);assert(map.tiles.every(row=>row.length===map.width));
 const {seen,queue}=reachable(map);assert(queue.length>1000);
 for(const home of map.buildings){
  assert.equal(home.door.z,home.z+home.h+.5);assert(home.door.x>home.x&&home.door.x<home.x+home.w);assert(isTownWalkable(map,home.door.x,home.door.z));assert(seen.has(`${Math.floor(home.door.x)},${Math.floor(home.door.z)}`),home.id+' doorstep unreachable');assert(!isTownWalkable(map,home.x+home.w/2,home.z+home.h/2));
  const target=mapTargets(map.id).find(item=>item.id===home.id);assert(target);assert.equal(target.type,'creator-home');assert.equal(target.kind,'creator-home');assert.equal(target.creatorId,home.creatorId);assert.equal(target.name,home.creatorName+'の家');assert.deepEqual({x:target.x,z:target.z},home.door);assert.equal(nearestTownTarget({...initialTownState(),mapId:map.id,position:{...home.door}}).id,home.id);
 }
 for(let i=0;i<map.buildings.length;i++)for(let j=i+1;j<map.buildings.length;j++){const a=map.buildings[i],b=map.buildings[j];assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.z+a.h<=b.z||b.z+b.h<=a.z,'Home footprints overlap');}
 assert.equal(new Set(map.buildings.map(home=>home.x)).size,4);assert.equal(new Set(map.buildings.map(home=>home.z)).size,5);
 for(const portal of map.portals)assert(seen.has(`${Math.floor(portal.x)},${Math.floor(portal.z)}`));
});

test('quarter instances do not mutate the immutable house definitions or another map instance',()=>{
 const first=createCreatorQuarter(),second=createCreatorQuarter();first.buildings[0].door.x=999;first.buildings[0].homePalette.wall='#000000';first.targets[0].x=999;first.spawn.x=999;
 assert.notEqual(second.buildings[0].door.x,999);assert.notEqual(CREATOR_HOMES[0].door.x,999);assert.notEqual(second.buildings[0].homePalette.wall,'#000000');assert.notEqual(second.targets[0].x,999);assert.notEqual(second.spawn.x,999);
});

test('street and quarter portals round-trip with valid spawns and preserve the existing story state',()=>{
 const town=getTownMap(),quarter=getTownMap(CREATOR_QUARTER_ID),enter=town.portals.find(portal=>portal.id==='enter-creator-quarter'),leave=quarter.portals.find(portal=>portal.id==='leave-creator-quarter');assert(enter);assert(leave);
 assert.equal(enter.to,quarter.id);assert.deepEqual(enter.spawn,quarter.spawn);assert.deepEqual({x:enter.x,z:enter.z},CREATOR_QUARTER_CONNECTION.street);assert.equal(leave.to,TOWN_START_MAP);assert.deepEqual(leave.spawn,CREATOR_QUARTER_CONNECTION.streetArrival);
 const {seen}=reachable(town);assert(seen.has(`${Math.floor(enter.x)},${Math.floor(enter.z)}`));assert(isTownWalkable(quarter.id,enter.spawn.x,enter.spawn.z));assert(isTownWalkable(town.id,leave.spawn.x,leave.spawn.z));
 const state={...initialTownState(),position:{x:enter.x,z:enter.z},flags:{...initialTownState().flags,intro:true},coins:37,steps:17};const entered=interactTown(state,enter.id);assert(entered.transition);assert.equal(entered.state.mapId,quarter.id);assert.deepEqual(entered.state.position,enter.spawn);assert.deepEqual(entered.state.flags,state.flags);assert.equal(entered.state.coins,37);assert.equal(entered.state.steps,17);
 const returned=interactTown({...entered.state,position:{x:leave.x,z:leave.z}},leave.id);assert(returned.transition);assert.equal(returned.state.mapId,town.id);assert.deepEqual(returned.state.position,leave.spawn);assert.deepEqual(returned.state.flags,state.flags);assert.deepEqual(returned.state.inventory,state.inventory);assert.equal(returned.state.coins,37);assert.equal(returned.state.steps,17);
 assert.equal(town.buildings.some(home=>home.kind==='creator-home'),false);assert.equal(town.outdoor,true);assert(Object.values(TOWN_MAPS).filter(map=>![town.id,quarter.id].includes(map.id)).every(map=>map.outdoor===false));assert.equal(TOWN_VERSION,1);
});

test('existing saves still restore and new quarter saves retain their map, doorstep, checkpoint and visited list',()=>{
 const legacy=initialTownState();assert.equal(restoreTownState(legacy).mapId,TOWN_START_MAP);
 const home=CREATOR_HOMES.at(-1),state={...legacy,mapId:CREATOR_QUARTER_ID,position:{...home.door},visited:[TOWN_START_MAP,CREATOR_QUARTER_ID],checkpoint:{mapId:CREATOR_QUARTER_ID,position:{...home.door}}};
 const imported=importTownState(exportTownState(state));assert.equal(imported.ok,true);assert.equal(imported.state.mapId,CREATOR_QUARTER_ID);assert.deepEqual(imported.state.position,home.door);assert.deepEqual(imported.state.checkpoint,state.checkpoint);assert.deepEqual(imported.state.visited,state.visited);assert.deepEqual(imported.state.flags,restoreTownState(legacy).flags);assert.deepEqual(imported.state.inventory,legacy.inventory);
});

function distanceToSegment(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
test('the new street entrance stays clear of all existing objects and approved visitor patrols',()=>{
 const enter=getTownMap().portals.find(portal=>portal.id==='enter-creator-quarter'),oldTargets=mapTargets(TOWN_START_MAP).filter(target=>target.id!==enter.id);assert(oldTargets.every(target=>Math.hypot(target.x-enter.x,target.z-enter.z)>4));
 const source=compileCharacterRoster(archive,manifest),{visitors,omitted}=placeTownVisitors(source);assert.deepEqual(omitted,[]);assert.equal(visitors.length,source.npcs.length);
 for(const visitor of visitors)for(const segment of visitor.route.segments){const a={x:segment.a.x+visitor.offsetX,z:segment.a.z},b={x:segment.b.x+visitor.offsetX,z:segment.b.z};assert(distanceToSegment(enter,a,b)>4,visitor.id+' patrol overlaps quarter entrance');}
 for(let time=0;time<75;time+=.5)for(const pose of sampleTownVisitors(visitors,{state:initialTownState(),time})){assert(isTownWalkable(TOWN_START_MAP,pose.x,pose.z,.23));assert(Math.hypot(pose.x-enter.x,pose.z-enter.z)>4);}
});
