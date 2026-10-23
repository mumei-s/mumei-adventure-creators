import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATOR_AREA_ROUTES,CREATOR_HOMES,CREATOR_QUARTER_CONNECTION} from '../creator-homes.js';
import {getTownMap,isTownWalkable,initialTownState} from '../town-model.js';
import {createTownSession} from '../controller.js';
const opposite={up:'down',down:'up',left:'right',right:'left'};
const vector={up:{z:-1},down:{z:1},left:{x:-1},right:{x:1}};
function reachable(map){const start=map.spawn,queue=[[Math.floor(start.x),Math.floor(start.z)]],seen=new Set();for(let i=0;i<queue.length;i++){const [x,z]=queue[i],key=x+','+z;if(seen.has(key)||!isTownWalkable(map,x+.5,z+.5))continue;seen.add(key);for(const [dx,dz]of [[0,1],[0,-1],[1,0],[-1,0]])queue.push([x+dx,z+dz]);}return seen;}
test('east west and south open avenues are walkable in both directions, reachable from all homes and preserve old gate',()=>{
 assert.deepEqual(CREATOR_AREA_ROUTES.map(route=>route.id),['east','west','south']);
 for(const mapId of ['lantern-town','creator-quarter']){
  const map=getTownMap(mapId),seen=reachable(map),routes=map.portals.filter(portal=>portal.openPassage);assert.equal(routes.length,3);
  for(const portal of routes){assert.ok(seen.has(`${Math.floor(portal.x)},${Math.floor(portal.z)}`));assert.ok(isTownWalkable(portal.to,portal.spawn.x,portal.spawn.z));assert.ok(getTownMap(portal.to).portals.filter(p=>p.openPassage).every(p=>Math.hypot(p.x-portal.spawn.x,p.z-portal.spawn.z)>2));}
  if(mapId==='creator-quarter')for(const home of CREATOR_HOMES)assert.ok(seen.has(`${Math.floor(home.door.x)},${Math.floor(home.door.z)}`));
 }
 assert.ok(getTownMap().portals.some(p=>p.id==='enter-creator-quarter'));assert.ok(getTownMap('creator-quarter').portals.some(p=>p.id==='leave-creator-quarter'));
 for(const route of CREATOR_AREA_ROUTES)for(const [start,end,map] of [[route.streetArrival,route.street,'lantern-town'],[route.quarterArrival,route.quarter,'creator-quarter']])for(let t=0;t<=1;t+=.005)assert.ok(isTownWalkable(map,start.x+(end.x-start.x)*t,start.z+(end.z-start.z)*t),`${route.id} ${map} approach ${t}`);
});
test('all six passages transition by walking, save once and do not bounce after arrival or continued input',()=>{
 for(const route of CREATOR_AREA_ROUTES)for(const fromQuarter of [false,true]){
  const mapId=fromQuarter?'creator-quarter':'lantern-town',position={...(fromQuarter?route.quarterArrival:route.streetArrival)},saved=[];
  const state={...initialTownState(),mapId,position,coins:83},session=createTownSession({state,store:{save:s=>{saved.push(structuredClone(s));return {ok:true};}}});
  const input=vector[opposite[fromQuarter?route.toQuarterFacing:route.toStreetFacing]];
  for(let n=0;n<150&&session.snapshot().state.mapId===mapId;n++)session.tick(.05,{...input,speed:3.05});
  const arrival=session.snapshot();assert.notEqual(arrival.state.mapId,mapId,route.id);assert.equal(arrival.walking,false);assert.equal(saved.length,1);assert.equal(arrival.state.coins,83);assert.deepEqual(arrival.state.inventory,state.inventory);assert.deepEqual(arrival.state.flags,state.flags);
  const expected=fromQuarter?route.streetArrival:route.quarterArrival;assert.deepEqual(arrival.state.position,expected);
  // A held key or thumb must not repeatedly cross the reverse trigger.
  for(let n=0;n<100;n++)session.tick(.05,input);assert.equal(session.snapshot().state.mapId,arrival.state.mapId);assert.deepEqual(session.snapshot().state.position,expected);assert.equal(saved.length,1);
  session.tick(.05,{});assert.deepEqual(session.snapshot().state.position,expected);
  for(let n=0;n<100&&session.snapshot().state.mapId!==mapId;n++)session.tick(.05,input);assert.equal(session.snapshot().state.mapId,mapId,'release then walk allows intentional return');
 }
});
test('area shortcut is not an individual home selection and is blocked in battle',()=>{
 const saved=[],session=createTownSession({store:{save:s=>{saved.push(s);return {ok:true};}}});
 assert.ok(session.visitCreatorQuarter().transition);assert.deepEqual(session.snapshot().state.position,CREATOR_QUARTER_CONNECTION.quarterArrival);assert.equal(session.target()?.type==='creator-home',false);assert.equal(saved.length,1);
 session.beginBattle('canal-mist');const before=session.snapshot().state;assert.equal(session.visitCreatorQuarter(),null);assert.equal(session.snapshot().state,before);assert.equal(saved.length,1);
});
