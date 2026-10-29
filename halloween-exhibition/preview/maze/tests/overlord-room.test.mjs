import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {MAP,CELL,FEATURES,OVERLORD_ROOM,blocked,move,nearby,initialState} from '../maze-model.js';
import {createOverlordRoom,createOverlordThrone,createOverlordHall} from '../overlord-room.js';
const open={unlocked:true,horrorAccepted:true,overlordUnlocked:true};
function reachable(a,b,state){const queue=[a],seen=new Set();while(queue.length){const p=queue.shift(),key=`${p.x},${p.z}`;if(seen.has(key))continue;seen.add(key);if(p.x===b.x&&p.z===b.z)return true;for(const [dx,dz]of[[0,1],[0,-1],[1,0],[-1,0]]){const n={x:p.x+dx,z:p.z+dz};if(!blocked(n.x*CELL,n.z*CELL,state))queue.push(n);}}return false;}
test('666th-floor seal preserves original coordinates and gates both passage directions',()=>{assert.equal(MAP.length,17);assert.equal(MAP[0].length,29);assert.deepEqual(FEATURES.spawn,{x:8,z:12});assert.equal(initialState().overlordUnlocked,false);assert.equal(blocked(72,12,{unlocked:true}),true);assert.equal(blocked(72,12,open),false);assert.equal(nearby({x:68,z:12}),'overlord-door');assert.equal(reachable(FEATURES.spawn,OVERLORD_ROOM.entry,{unlocked:true}),false);assert.equal(reachable(FEATURES.spawn,OVERLORD_ROOM.entry,open),true);assert.equal(reachable(OVERLORD_ROOM.entry,FEATURES.spawn,open),true);assert.equal(reachable(OVERLORD_ROOM.entry,{x:23,z:4},open),true);});
test('room throne and columns are solid, actor-width aisle remains clear',()=>{assert.equal(blocked(92,9.6,open),true);assert.equal(blocked(19.6*CELL,16,open),true);for(let z=4;z<11;z+=.1){const s={...open,x:92,z:z*CELL};assert.equal(blocked(s.x,s.z,s),false);assert.equal(move(s,.1,0).x,s.x+.1);}});
test('native throne and castle use real reusable geometry with bounded complexity',()=>{const room=createOverlordRoom(THREE);let meshes=0,lights=0,triangles=0;room.group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}if(o.isLight)lights++;});assert.ok(meshes>20);assert.ok(meshes<150);assert.ok(triangles<30000);assert.equal(lights,2);assert.deepEqual(room.thronePosition,{x:92,y:0,z:9.6});room.update({unlocked:true,motion:false});room.dispose();const throne=createOverlordThrone(THREE);assert.equal(throne.seatHeight,.75);assert.ok(new THREE.Box3().setFromObject(throne.group).getSize(new THREE.Vector3()).z>2);throne.dispose();});


test('gothic hall shares native arches and an open foreground with the battle stage',()=>{
 const hall=createOverlordHall(THREE,{compact:true,lights:false});let meshes=0,triangles=0,lights=0,arches=0,cloth=0;
 hall.group.traverse(o=>{if(o.name==='pointed-gothic-arch')arches++;if(o.name==='folded-crimson-banner')cloth++;if(o.isLight)lights++;if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.ok(!o.isSprite);for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));}});
 assert(arches>=3);assert(cloth>=2);assert.equal(lights,0);assert(meshes<60);assert(triangles<10000);
 const piers=hall.group.getObjectsByProperty('name','clustered-marble-pier');assert.equal(piers.length,2);assert(piers.every(p=>p.position.z< -2&&Math.abs(p.position.x)>4));
 const rose=hall.group.getObjectByName('garnet-rose-tracery');assert(rose.position.y>4&&rose.position.z< -3,'the moon window stays above and behind the actor');
 hall.update({time:5,motion:false});hall.dispose();hall.dispose();
});

test('throne ruby is an embedded faceted detail outside the character head silhouette',()=>{
 const throne=createOverlordThrone(THREE);let rubyVertices=0;
 throne.group.traverse(o=>{if(!o.isMesh||o.material.name!=='faceted ruby inlay')return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){rubyVertices++;assert(!(p.getY(i)>2.45&&p.getY(i)<3&&Math.abs(p.getX(i))<.3),'no large central pink head-like gem');}});
 assert(rubyVertices>0);assert.equal(throne.seatHeight,.75);throne.dispose();
});
