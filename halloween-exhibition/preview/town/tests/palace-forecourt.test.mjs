import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PALACE_FORECOURT,isInPalaceForecourt,intersectsPalaceForecourt,palaceForecourtInfluence} from '../palace-forecourt.js';
import {townPalaceFraming} from '../palace-architecture.js';
import {TOWN_START_MAP,TOWN_NPCS,getTownMap,isTownWalkable,mapTargets} from '../story-data.js';
import {initialTownState,restoreTownState,interactTown,nearestTownTarget} from '../town-model.js';
import {CREATOR_HOMES} from '../creator-homes.js';
import {compileCharacterRoster} from '../../maze/creator-runtime.js';
import {placeTownVisitors,sampleTownVisitors} from '../visitor-model.js';
const archive=JSON.parse(await readFile(new URL('../../data/archive.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('../../maze/data/creator-characters.json',import.meta.url),'utf8'));

test('only working story buildings and participant homes occupy the town maps',()=>{
 const town=getTownMap(),allowed=new Set(['castle','bakery',...town.portals.map(portal=>portal.to)]);
 for(const building of town.buildings)assert.ok(allowed.has(building.id),building.id+' has no participant or story function');
 for(const old of [{id:'home-west',x:7.5,z:5.5},{id:'home-east',x:57.5,z:20.5},{id:'boathouse',x:37.5,z:34.5},{id:'market-copper',x:7.5,z:24.5},{id:'market-ribbons',x:20.5,z:35.5},{id:'market-tailor',x:13.5,z:23.5},{id:'canal-guesthouse',x:38.5,z:39.5},{id:'gate-east-house',x:56.5,z:12.5}]){
  assert.ok(!town.buildings.some(building=>building.id===old.id));assert.ok(isTownWalkable(town,old.x,old.z),old.id+' leaves no invisible wall');
 }
 const quarter=getTownMap('creator-quarter');assert.equal(quarter.buildings.length,CREATOR_HOMES.length);
 for(const home of quarter.buildings)assert.ok(quarter.targets.some(target=>target.creatorId===home.creatorId),'each participant house opens its own creator page');
});

function reachable(map){
 const first={x:Math.floor(map.spawn.x),z:Math.floor(map.spawn.z)},queue=[first],seen=new Set([`${first.x},${first.z}`]);
 for(let i=0;i<queue.length;i++)for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const p={x:queue[i].x+dx,z:queue[i].z+dz},key=`${p.x},${p.z}`;if(!seen.has(key)&&isTownWalkable(map,p.x+.5,p.z+.5)){seen.add(key);queue.push(p);}}
 return {queue,seen};
}
test('shared forecourt covers the whole exact palace camera influence including its faint approach',()=>{
 assert.deepEqual(PALACE_FORECOURT,{minX:17,maxX:47,maxZ:21,centerX:32,halfWidth:15});
 const map=getTownMap();for(const x of[0,16.9,17,17.0001,18,25,32,40,46.9999,47,47.1,63])for(const z of[-1,1,6,13,20,20.9999,21,21.1,48]){
  const point={x,z},actual=townPalaceFraming(point,map,55*Math.PI/180,390,844).influence;assert.equal(isInPalaceForecourt(point),actual>0,`${x},${z}`);assert.ok(Math.abs(palaceForecourtInfluence(point)-actual)<1e-12);
 }
 assert.equal(isInPalaceForecourt({x:NaN,z:10}),false);assert.equal(palaceForecourtInfluence(null),0);
 assert.equal(intersectsPalaceForecourt({x:16,z:3,w:2,h:2}),true);assert.equal(intersectsPalaceForecourt({x:15,z:3,w:2,h:2}),false);assert.equal(intersectsPalaceForecourt({x:25,z:21,w:5,h:2}),false);
});

test('only the castle and its exit occupy the forecourt; buildings and full obstacle footprints stay clear',()=>{
 const map=getTownMap(),castle=map.buildings.filter(b=>b.kind==='castle');assert.equal(castle.length,1);
 for(const b of map.buildings.filter(b=>b.kind!=='castle')){assert(!intersectsPalaceForecourt(b,.35),b.id+' overlaps the camera approach');assert(isTownWalkable(map,b.door.x,b.door.z),b.id+' door is obstructed');}
 for(const npc of TOWN_NPCS.filter(n=>n.mapId===TOWN_START_MAP))assert(!isInPalaceForecourt(npc,.4),npc.id+' must not stand in the forecourt');
 for(const target of mapTargets(TOWN_START_MAP).filter(t=>t.id!=='castle-exit'))assert(!isInPalaceForecourt(target,.25),target.id+' occupies the clear approach');
 for(const d of map.decorations)assert(!isInPalaceForecourt(d,d.radius||0),d.id+' obstacle overlaps the clear approach');
 for(let i=0;i<map.buildings.length;i++)for(let j=i+1;j<map.buildings.length;j++){const a=map.buildings[i],b=map.buildings[j];assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.z+a.h<=b.z||b.z+b.h<=a.z,`${a.id}/${b.id} relocated footprints overlap`);}
 const quarter=getTownMap('creator-quarter');assert.equal(quarter.buildings.length,17);assert.deepEqual(quarter.buildings.map(b=>({id:b.id,x:b.x,z:b.z,w:b.w,h:b.h,door:b.door})),CREATOR_HOMES.map(b=>({id:b.id,x:b.x,z:b.z,w:b.w,h:b.h,door:b.door})));
});

test('the central approach is walkable while the southern canal, bridges and water quests remain intact',()=>{
 const map=getTownMap();for(let z=1;z<=20;z++)for(let x=17;x<47;x++)assert(!'~='.includes(map.tiles[z][x]),'old water or bridge rails remain inside the pullback zone');for(let z=6;z<=20;z++)for(const x of [31.5,32.5])assert(isTownWalkable(map,x,z+.5),`central forecourt blocked at ${x},${z+.5}`);
 for(const z of [21,22,23,24,25,28,29,30,31,32,33,34,35,36,37,40,41,42,45])for(const x of [31,32]){assert.equal(map.tiles[z][x],'~');assert(!isTownWalkable(map,x+.5,z+.5));}
 for(const z of [26,38,43])for(const x of [30,31,32,33])assert.equal(map.tiles[z][x],'=');
 for(const id of ['sluice','stamp-canal','moon-pool'])assert(mapTargets(map.id).some(target=>target.id===id));
 const start={...initialTownState(),position:{x:32.5,z:7.5}};let state=start;
 // Follow the exact former water obstruction through the camera boundary.
 for(let step=0;step<52;step++){const next={...state,position:{...state.position,z:state.position.z+.25}};assert(isTownWalkable(map,next.position.x,next.position.z));state=next;}
 assert.equal(state.position.z,20.5);
});

test('all 21 approved visitor actors and paired CNA guests patrol outside the full forecourt without omissions',()=>{
 const roster=compileCharacterRoster(archive,manifest),{visitors,omitted}=placeTownVisitors(roster);assert.deepEqual(omitted,[]);assert.equal(visitors.length,21);assert.equal(visitors.length,roster.npcs.length);assert.equal(visitors.filter(v=>v.creatorId==='grand_daisy8632').length,3);
 assert.deepEqual(visitors.map(v=>v.id).sort(),roster.npcs.map(v=>v.id).sort());
 for(const visitor of visitors){assert(!isInPalaceForecourt(visitor,.4));for(const segment of visitor.route.segments){const steps=Math.max(1,Math.ceil(segment.length/.06));for(let n=0;n<=steps;n++){const f=n/steps,point={x:segment.a.x+(segment.b.x-segment.a.x)*f+visitor.offsetX,z:segment.a.z+(segment.b.z-segment.a.z)*f};assert(!isInPalaceForecourt(point,.4),visitor.id+' patrol crosses the pullback envelope');}}}
 const state=initialTownState();for(let time=0;time<75;time+=.12)for(const actor of sampleTownVisitors(visitors,{state,time})){assert(!isInPalaceForecourt(actor,.4));assert(isTownWalkable(TOWN_START_MAP,actor.x,actor.z,.23));}
});

test('relocated NPCs, story objects and doors remain reachable and selectable from the existing start',()=>{
 const map=getTownMap(),{queue,seen}=reachable(map);assert(queue.length>1800);
 for(const building of map.buildings)assert(seen.has(`${Math.floor(building.door.x)},${Math.floor(building.door.z)}`),building.id+' doorstep disconnected');
 for(const target of mapTargets(TOWN_START_MAP))assert(queue.some(p=>{const position={x:p.x+.5,z:p.z+.5};return Math.hypot(position.x-target.x,position.z-target.z)<1.6&&nearestTownTarget({...initialTownState(),position})?.id===target.id;}),target.id+' has no selectable walking position');
 for(const portal of map.portals.filter(p=>p.to!=='creator-quarter')){const inside=getTownMap(portal.to),back=inside.portals.find(p=>p.to===map.id),building=map.buildings.find(b=>b.id===portal.to);assert.deepEqual({x:portal.x,z:portal.z},building.door);assert.deepEqual(back.spawn,{x:building.door.x,z:building.door.z+.8});assert(isTownWalkable(map,back.spawn.x,back.spawn.z),back.id+' returns inside relocated furniture');}
});

test('old saves in newly occupied footprints recover safely and saved interiors return through their relocated doors',()=>{
 const old={...initialTownState(),mapId:TOWN_START_MAP,position:{x:20.5,z:25.5},coins:73,flags:{...initialTownState().flags,intro:true},checkpoint:{mapId:TOWN_START_MAP,position:{x:20.5,z:25.5}}};
 const restored=restoreTownState(old);assert(isTownWalkable(restored.mapId,restored.position.x,restored.position.z));assert.equal(restored.coins,73);assert.equal(restored.flags.intro,true);assert(isTownWalkable(restored.checkpoint.mapId,restored.checkpoint.position.x,restored.checkpoint.position.z));
 for(const id of ['candle-shop','workshop','library','inn']){const inside=getTownMap(id),back=inside.portals[0],state=restoreTownState({...initialTownState(),mapId:id,position:{x:back.x,z:back.z}}),result=interactTown(state,back.id);assert(result.transition);assert.equal(result.state.mapId,TOWN_START_MAP);assert.deepEqual(result.state.position,back.spawn);assert(isTownWalkable(result.state.mapId,result.state.position.x,result.state.position.z));}
});
