import test from 'node:test';
import assert from 'node:assert/strict';
import {PATROL_ROUTES,createPatrolRoute,createActorPatrol,samplePatrolPosition,patrolPointSafe,patrolSegmentSafe} from '../patrol-model.js';
import {CREATOR_SLOTS} from '../creator-runtime.js';
const state={unlocked:true,horrorAccepted:true};
const creators=CREATOR_SLOTS.flatMap(s=>(s.capacity===3?[-.55,0,.55]:[-.3,.3]).map(dx=>({role:'creator',id:s.id+dx,slot:s.id,route:createActorPatrol({...s,slotId:s.id,x:s.x+dx})})));
const others=['monster','resident'].flatMap(role=>Object.keys(PATROL_ROUTES[role]).map(id=>({role,id,route:createActorPatrol({id},{role})})));
const actors=[...creators,...others];
test('all authored lanes and maximum-capacity creator groups clear walls and scenery',()=>{
  for(const actor of actors){assert.ok(Object.isFrozen(actor.route));for(const segment of actor.route.segments)assert.ok(patrolSegmentSafe(segment.a,segment.b,state),actor.id);
    for(let t=0;t<actor.route.duration;t+=.13)assert.ok(patrolPointSafe(samplePatrolPosition(actor.route,t,{state}),state),actor.id);
  }
});
test('actual patrol travel spans rooms rather than tiny oscillation',()=>{
  for(const actor of actors){let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(let t=0;t<actor.route.duration;t+=.1){const p=samplePatrolPosition(actor.route,t,{state});minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}assert.ok(Math.hypot(maxX-minX,maxZ-minZ)>=.59,actor.id);}
});
test('simultaneous creator, resident and monster lanes remain separated for four minutes',()=>{
  let minimum=Infinity;
  for(let t=0;t<240;t+=.25){const poses=actors.map(a=>samplePatrolPosition(a.route,t,{state}));for(let a=0;a<actors.length;a++)for(let b=a+1;b<actors.length;b++)if(actors[a].role!==actors[b].role){const d=Math.hypot(poses[a].x-poses[b].x,poses[a].z-poses[b].z);minimum=Math.min(minimum,d);assert.ok(d>=.79,`${actors[a].id}/${actors[b].id}: ${d} at ${t}`);}}
  assert.ok(minimum<2,'test actually compares nearby characters');
});
test('group members share phase, direction and spacing throughout movement',()=>{
  for(const slot of CREATOR_SLOTS){const a=createActorPatrol({...slot,slotId:slot.id,x:slot.x-.3}),b=createActorPatrol({...slot,slotId:slot.id,x:slot.x+.3});for(let t=0;t<80;t+=.27){const p=samplePatrolPosition(a,t,{state}),q=samplePatrolPosition(b,t,{state});assert.ok(Math.abs(q.x-p.x-.6)<1e-10);assert.equal(p.z,q.z);assert.equal(p.facing,q.facing);assert.equal(p.walking,q.walking);}}
});
test('deterministic phase, stationary reduced motion, no player tracking or teleporting',()=>{
  for(const a of actors){assert.deepEqual(samplePatrolPosition(a.route,20,{motion:false,state}),samplePatrolPosition(a.route,99,{motion:false,state}));for(let t=-10;t<40;t+=.17){const p=samplePatrolPosition(a.route,t,{state}),q=samplePatrolPosition(a.route,t+.01,{state});assert.ok(Math.hypot(q.x-p.x,q.z-p.z)<=a.route.speed*.010001);assert.deepEqual(p,samplePatrolPosition(a.route,t,{state:{...state,x:Math.random()*100,z:0}}));}}
});
test('invalid points and wall-crossing interpolation are rejected, including furniture',()=>{
  assert.throws(()=>createPatrolRoute({waypoints:[{x:0,z:0}]}),/Unsafe/);
  assert.throws(()=>createPatrolRoute({waypoints:[{x:6.2,z:11.2}]}),/Unsafe/);
  assert.throws(()=>createPatrolRoute({waypoints:[{x:2,z:9},{x:6,z:9}]}),/segment/);
  assert.throws(()=>createPatrolRoute({speed:0,waypoints:[{x:8,z:12}]}),/timing/);
  const r=createPatrolRoute({waypoints:[{x:8,z:5},{x:8,z:7}]});
  assert.deepEqual(samplePatrolPosition(r,2),samplePatrolPosition(r,9));
});
test('original six monster IDs plus optional encounters have explicit lanes',()=>{
  assert.deepEqual(Object.keys(PATROL_ROUTES.monster).sort(),['pumpkin','zombie','franken','ghost','vampire','bat','witch','masked_wanderer','werewolf','mummy','nameless_overlord'].sort());
});
test('world floor pumpkins and key pedestal are forbidden, including their foot clearance',()=>{
  for(const [x,z]of[[22,34],[42,34],[22,50],[42,50],[54,34],[60,46],[6,34],[10,46],[23,8],[41,8],[56,40]])assert.equal(patrolPointSafe({x:x/4,z:z/4},state),false,`${x},${z}`);
  assert.equal(patrolPointSafe({x:13.95,z:10.25},state),false,'old ghost start grazes pedestal');
  assert.equal(patrolPointSafe({x:2.25,z:11.5},state),false,'old vampire lane grazes pumpkin');
  for(const slot of CREATOR_SLOTS)for(const dx of[-.3,0,.3,...(slot.capacity===3?[-.55,.55]:[])]){
    const route=createActorPatrol({...slot,slotId:slot.id,x:slot.x+dx});
    for(const segment of route.segments)assert.ok(patrolSegmentSafe(segment.a,segment.b,state),`${slot.id}/${dx}`);
  }
});
test('crooked west-room frame feet are excluded at their transformed floor width',()=>{
  for(const x of[1,3])for(const z of[8.5,10.5,11.5])assert.equal(patrolPointSafe({x,z},state),false);
  assert.equal(patrolPointSafe({x:2.9,z:11.5},state),false,'former vertical vampire lane clips the pier');
  assert.ok(patrolSegmentSafe({x:2.25,z:10.85},{x:3.2,z:10.85},state));
});
