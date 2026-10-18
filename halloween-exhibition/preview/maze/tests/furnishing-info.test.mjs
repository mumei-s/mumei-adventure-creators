import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNISHING_INFO,nearestFurnishing} from '../furnishing-info.js';
import {PALACE_FURNISHINGS} from '../stage-2d.js';
import {CELL,blocked,initialState} from '../maze-model.js';
import {moveAroundFurniture} from '../rpg-model.js';
import {resolveContextAction,actionButtonFor} from '../context-action.js';

const TILE=72;
const at=(x,z,extra={})=>({...initialState(),x:x*CELL,z:z*CELL,...extra});
const furnishing=(kind,x,z,extra={})=>({kind,x:x*TILE,y:z*TILE,...extra});
const expectedNames={bookcase:'回廊の蔵書棚',cabinet:'灯具の保管庫',moonWindow:'月灯りの窓',tapestry:'宮殿の織物',palaceColumn:'回廊を支える石柱',planter:'銀葉草の鉢',chaise:'回廊の休憩椅子',harvest:'収穫祭の飾り',candelabra:'三枝の燭台',armchair:'読書椅子',writingDesk:'記録机',armillary:'星読みの天球儀'};

test('all 47 authored furnishings have a real name and description in the 12-kind vocabulary',()=>{
 assert.equal(PALACE_FURNISHINGS.length,47);
 assert.deepEqual(Object.keys(FURNISHING_INFO).sort(),Object.keys(expectedNames).sort());
 assert.deepEqual([...new Set(PALACE_FURNISHINGS.map(item=>item.kind))].sort(),Object.keys(expectedNames).sort());
 for(const item of PALACE_FURNISHINGS){
  const info=FURNISHING_INFO[item.kind];assert.equal(info.name,expectedNames[item.kind]);assert.equal(typeof info.text,'string');assert(info.text.trim().length>=25,`${item.kind} needs a usable explanation`);
  const result=nearestFurnishing(at(item.x/TILE,item.y/TILE),[item],{isBlocked:()=>false});
  assert.equal(result.name,expectedNames[item.kind]);assert.equal(result.text,info.text);assert.equal(result.furnishingKind,item.kind);
 }
});

test('furnishing pixels and player world coordinates convert to the same tile distance',()=>{
 const state=at(8,12),far=furnishing('planter',8,12.9),near=furnishing('bookcase',8.3,12.4);
 const frozen=Object.freeze([Object.freeze(far),Object.freeze(near)]),result=nearestFurnishing(state,frozen,{isBlocked:()=>false});
 assert.equal(result.id,'furnishing-1');assert.equal(result.furnishingKind,'bookcase');assert.ok(Math.abs(result.distance-.5)<1e-12);assert.equal(result.x,near.x);assert.equal(result.y,near.y);assert.equal(frozen[1].distance,undefined);
 assert.equal(nearestFurnishing(state,[near],{maxDistance:.49,isBlocked:()=>false}),null);
 const exactBoundary=furnishing('bookcase',8.5,12);assert.equal(nearestFurnishing(state,[exactBoundary],{maxDistance:.5,isBlocked:()=>false}).name,expectedNames.bookcase);
});

test('empty, out-of-range and unknown furnishings never offer an inspect action',()=>{
 const state=at(8,12),visible=furnishing('armchair',8.8,12),unknown=furnishing('unknown-object',8,12);
 assert.equal(nearestFurnishing(state,[]),null);
 assert.equal(nearestFurnishing(state,[furnishing('bookcase',9.06,12)],{isBlocked:()=>false}),null);
 assert.equal(nearestFurnishing(state,[unknown],{isBlocked:()=>false}),null);
 assert.equal(nearestFurnishing(state,[{...unknown,name:'Should not become an authored furnishing',text:'Untrusted extra fields'}],{isBlocked:()=>false}),null);
 assert.equal(nearestFurnishing(state,[unknown,visible],{isBlocked:()=>false}).furnishingKind,'armchair');
 for(const value of [NaN,Infinity,undefined]){assert.equal(nearestFurnishing({...state,x:value},[visible]),null);assert.equal(nearestFurnishing(state,[{...visible,x:value}]),null);assert.equal(nearestFurnishing(state,[{...visible,y:value}]),null);}
});

test('injected occlusion receives world coordinates and the current gate state',()=>{
 const state=at(8,12,{unlocked:false}),item=furnishing('bookcase',8.9,12),samples=[];
 const result=nearestFurnishing(state,[item],{isBlocked:(x,z,passed)=>{assert.equal(passed,state);samples.push({x,z});return x>=8.4*CELL;}});
 assert.equal(result,null);assert(samples.length>0);assert(samples.every(point=>point.x>state.x&&point.x<8.9*CELL&&point.z===state.z));
 assert.equal(nearestFurnishing(state,[item],{isBlocked:()=>false}).furnishingKind,'bookcase');
});

test('walls and closed north or west doors block inspecting furniture on the other side',()=>{
 const acrossWall=furnishing('tapestry',3,8),wallState=at(5,8,{unlocked:true,horrorAccepted:true});
 assert.equal(nearestFurnishing(wallState,[acrossWall],{maxDistance:3}),null);
 const north=furnishing('armillary',8,5.55),belowGate=at(8,6.55);
 assert.equal(nearestFurnishing(belowGate,[north]),null);assert.equal(nearestFurnishing({...belowGate,unlocked:true},[north]).furnishingKind,'armillary');
 const west=furnishing('bookcase',3.75,10),besideWestDoor=at(4.75,10);
 assert.equal(nearestFurnishing(besideWestDoor,[west]),null);assert.equal(nearestFurnishing({...besideWestDoor,horrorAccepted:true},[west]).furnishingKind,'bookcase');
});

test('an occluded nearer furnishing does not hide a reachable farther furnishing',()=>{
 const state=at(8,12),hidden=furnishing('cabinet',8.5,12),visible=furnishing('planter',8,12.8);
 const target=nearestFurnishing(state,[hidden,visible],{isBlocked:(x)=>x>state.x+.2});
 assert.equal(target.id,'furnishing-1');assert.equal(target.furnishingKind,'planter');assert.ok(Math.abs(target.distance-.8)<1e-12);
});

test('scenery has an inspect action but loses exact distance ties to every gameplay target',()=>{
 const scenery=nearestFurnishing(at(8,12),[furnishing('bookcase',8.5,12)],{isBlocked:()=>false});
 const target=resolveContextAction({scenery});assert.equal(target.kind,'scenery');assert.equal(target.furnishingKind,'bookcase');assert.equal(target.name,expectedNames.bookcase);assert.equal(actionButtonFor(target),'interact');
 for(const kind of ['exit','feature','resident','creator','monster']){
  const tied=resolveContextAction({scenery,[kind]:{id:kind,distance:scenery.distance}});assert.equal(tied.kind,kind);
  const closer=resolveContextAction({scenery,[kind]:{id:kind,distance:scenery.distance+.1}});assert.equal(closer.kind,'scenery');
 }
 assert.equal(resolveContextAction({scenery:{...scenery,available:false}}),null);
});

function reachablePositions(){
 const first=at(8,12,{unlocked:true,horrorAccepted:true}),queue=[first],seen=new Set([`${first.x},${first.z}`]);
 // One world unit is a quarter tile. Use actual movement/collision rules so
 // inspection is verified from a place the player can walk to, never inside a wall or shelf.
 for(let i=0;i<queue.length;i++)for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
  const next=moveAroundFurniture(queue[i],dx,dz),key=`${next.x},${next.z}`;
  if(!seen.has(key)){seen.add(key);queue.push(next);}
 }
 return queue;
}
test('all authored furnishings can actually be selected from a reachable palace walkway',()=>{
 const positions=reachablePositions(),selected=new Map();assert(positions.length>1000);
 for(const state of positions){assert(!blocked(state.x,state.z,state));const target=nearestFurnishing(state,PALACE_FURNISHINGS);if(target&&!selected.has(target.id))selected.set(target.id,state);}
 const inaccessible=PALACE_FURNISHINGS.flatMap((item,index)=>selected.has(`furnishing-${index}`)?[]:[`${index}:${item.kind}@${item.x/TILE},${item.y/TILE}`]);
 assert.deepEqual(inaccessible,[],'Every visible furnishing needs its own reachable inspect target, including colocated wall decor');
 assert.equal(selected.size,47);
 for(const [id,state]of selected){const target=nearestFurnishing(state,PALACE_FURNISHINGS);assert.equal(target.id,id);assert(target.distance<=1.05);assert.equal(actionButtonFor(resolveContextAction({scenery:target})),'interact');}
});
