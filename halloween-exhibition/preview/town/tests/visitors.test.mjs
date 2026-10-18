import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileCharacterRoster} from '../../maze/creator-runtime.js';
import {initialTownState} from '../town-model.js';
import {TOWN_START_MAP,isTownWalkable,mapTargets} from '../story-data.js';
import {placeTownVisitors,sampleTownVisitors,chooseTownVisitorGroups,nearestTownVisitor,townVisitorLineOfSight} from '../visitor-model.js';
const read=url=>JSON.parse(fs.readFileSync(new URL(url,import.meta.url)));
const roster=()=>compileCharacterRoster(read('../../data/archive.json'),read('../../maze/data/creator-characters.json'),2026);

test('all verified creator groups retain every paired member and profile-only CNA guests without inventing articles',()=>{
  const source=roster(),before=structuredClone(source),placed=placeTownVisitors(source);
  assert.deepEqual(source,before);assert.deepEqual(placed.omitted,[]);assert.equal(placed.visitors.length,source.npcs.length);
  assert.equal(new Set([source.hero.creatorId,...placed.visitors.map(p=>p.creatorId)]).size,15);
  const cna=placed.visitors.filter(p=>p.creatorId==='grand_daisy8632');assert.equal(cna.length,3);assert.ok(cna.every(p=>p.articleURL===null&&p.profileURL==='https://note.com/grand_daisy8632'));assert.equal(new Set(cna.map(p=>p.groupId)).size,1);assert.ok(cna.every(p=>p.x>48&&p.x<53&&p.z>=9&&p.z<13));
  const noninteractive=source.npcs.filter(p=>p.interactive===false);assert.ok(noninteractive.length);for(const p of noninteractive)assert.equal(placed.visitors.find(v=>v.id===p.id)?.interactive,false);
});
test('authored town patrols remain walkable and clear of entrances, objects and other groups over their full cycles',()=>{
  const {visitors,omitted}=placeTownVisitors(roster());assert.deepEqual(omitted,[]);const state=initialTownState();let walking=0;
  for(let time=0;time<75;time+=.12){const poses=sampleTownVisitors(visitors,{state,time});for(const pose of poses){assert.ok(isTownWalkable(TOWN_START_MAP,pose.x,pose.z,.23),`${pose.id} at ${time}`);assert.ok(mapTargets(TOWN_START_MAP).every(t=>Math.hypot(t.x-pose.x,t.z-pose.z)>=1.24),`${pose.id} overlapping context target`);if(pose.walking)walking++;}for(let i=0;i<poses.length;i++)for(let j=i+1;j<poses.length;j++)if(poses[i].groupId!==poses[j].groupId)assert.ok(Math.hypot(poses[i].x-poses[j].x,poses[i].z-poses[j].z)>1.2);}
  assert.ok(walking>100,'visitors genuinely patrol rather than standing in place');
});
test('every participant group visibly walks through its district with no duplicate idle leg at the loop closure',()=>{
 const {visitors}=placeTownVisitors(roster()),state=initialTownState(),groups=[...new Map(visitors.map(visitor=>[visitor.groupId,visitor])).values()];
 for(const visitor of groups){
  assert.ok(visitor.route.segments.every(segment=>segment.length>0),visitor.id+' has an extra idle-only leg');
  const poses=Array.from({length:600},(_,i)=>sampleTownVisitors([visitor],{state,time:i*visitor.route.duration/600})[0]);
  assert.ok(Math.max(...poses.map(p=>p.x))-Math.min(...poses.map(p=>p.x))>=1||Math.max(...poses.map(p=>p.z))-Math.min(...poses.map(p=>p.z))>=1,visitor.id+' only shuffles in place');
  assert.ok(poses.filter(p=>p.walking).length/poses.length>.5,visitor.id+' spends most of the visit stopped');
 }
});
test('every actual town patrol accelerates and brakes to rest while gait follows accepted distance across loops',()=>{
 const {visitors}=placeTownVisitors(roster()),state=initialTownState(),groups=[...new Map(visitors.map(visitor=>[visitor.groupId,visitor])).values()];
 const pose=(visitor,time)=>sampleTownVisitors([visitor],{state,time})[0];
 for(const visitor of groups){const route=visitor.route;
  for(const segment of route.segments.filter(s=>s.length>0)){
   const start=route.duration+segment.start+segment.wait-route.phaseOffset,end=start+segment.duration;
   for(const time of[start,end]){const at=pose(visitor,time),before=pose(visitor,time-.001),after=pose(visitor,time+.001);assert.ok(at.speed<1e-9);assert.ok(before.speed<.0001);assert.ok(after.speed<.0001);assert.ok(Math.hypot(after.x-before.x,after.z-before.z)<.000001);}
   const middle=pose(visitor,start+segment.duration/2);assert.ok(middle.walking);assert.ok(middle.speed<=route.speed+1e-10);assert.ok(middle.distance>segment.distance);assert.ok(Math.abs(middle.phase-((middle.distance/1.05*Math.PI*2)%(Math.PI*2)))<1e-9);
  }
  const wrap=route.duration-route.phaseOffset,earlier=pose(visitor,wrap-.001),later=pose(visitor,wrap+.001);assert.ok(Math.abs(later.distance-earlier.distance)<.000001);assert.ok(Math.hypot(later.x-earlier.x,later.z-earlier.z)<.000001);
 }
});
test('town visitors retain their incoming heading, turn only while stopped, and keep heading continuous at segment and loop joins',()=>{
 const {visitors}=placeTownVisitors(roster()),state=initialTownState(),groups=[...new Map(visitors.map(visitor=>[visitor.groupId,visitor])).values()];
 const pose=(visitor,time)=>sampleTownVisitors([visitor],{state,time})[0],difference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));let turns=0;
 for(const visitor of groups){const route=visitor.route;for(const segment of route.segments){
  const time=route.duration+segment.start-route.phaseOffset,before=pose(visitor,time-.0001),at=pose(visitor,time+.0001);assert.ok(Math.abs(difference(before.yaw,at.yaw))<.0001,`${visitor.id} heading at segment boundary`);
  if(Math.abs(segment.turn)<.001)continue;const begin=time+(segment.wait-route.turnDuration)/2,mid=pose(visitor,begin+route.turnDuration/2),out=pose(visitor,begin+route.turnDuration);
  assert.equal(mid.walking,false);assert.equal(mid.speed,0);assert.equal(mid.turning,true);assert.ok(Math.abs(difference(mid.yaw,segment.previousYaw))>.1);assert.ok(Math.abs(difference(out.yaw,segment.yaw))<1e-9);assert.equal(mid.animationAssetComplete,false);turns++;
 }}assert.ok(turns>10);
});
test('distance selection is bounded by whole groups, retains side companions, and excludes offscreen/interior visitors',()=>{
  const {visitors}=placeTownVisitors(roster()),state=initialTownState(),poses=sampleTownVisitors(visitors,{state,time:12}),selected=chooseTownVisitorGroups(poses,state,3),ids=new Set(selected.map(p=>p.groupId));assert.ok(ids.size<=3);
  for(const id of ids)assert.equal(selected.filter(p=>p.groupId===id).length,visitors.filter(p=>p.groupId===id).length);
  assert.deepEqual(chooseTownVisitorGroups(poses,{...state,mapId:'inn'},3),[]);assert.deepEqual(sampleTownVisitors(visitors,{state:{...state,mapId:'library'},time:12}),[]);
  assert.deepEqual(chooseTownVisitorGroups(poses,{...state,position:{x:500,z:500}},3),[]);
  assert.ok(sampleTownVisitors(visitors,{state,time:12,motion:false}).every(p=>!p.walking&&p.phase===0));
});
test('visitor conversation respects noninteractive companions and town wall/water line of sight',()=>{
  const {visitors}=placeTownVisitors(roster()),state=initialTownState(),poses=sampleTownVisitors(visitors,{state,time:0,motion:false}),guest=poses.find(p=>p.interactive!==false);
  const near={...state,position:{x:guest.x,z:guest.z+.5}};assert.equal(nearestTownVisitor([guest],near)?.id,guest.id);assert.equal(nearestTownVisitor([{...guest,interactive:false}],near),null);
  assert.equal(townVisitorLineOfSight({...state,position:{x:30.5,z:22.5}},{mapId:TOWN_START_MAP,x:33.5,z:22.5}),false);
  assert.equal(townVisitorLineOfSight({...state,mapId:'inn'},guest),false);
});
