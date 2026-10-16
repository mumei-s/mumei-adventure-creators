import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {integrateVelocity,advanceLocomotion,locomotionPhase,createDistanceTrail,TAU} from '../movement-runtime.js';
import {createPatrolRoute,samplePatrolPosition,sampleTravel} from '../patrol-model.js';
import {companionActor,createCharacterAssets} from '../creator-runtime.js';
import {motionSprite} from '../monster-motion.js';
import {MONSTER_MOTION_DATA} from '../monster-motion-data.js';
const flags={unlocked:true,horrorAccepted:true};
const close=(a,b,message='',epsilon=1e-9)=>assert.ok(Math.abs(a-b)<epsilon,`${message}: ${a} / ${b}`);
const angularDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const manifest=JSON.parse(fs.readFileSync(new URL('../data/creator-characters.json',import.meta.url)));
const asset=name=>({...structuredClone(manifest.characters[0].asset),src:`assets/creator-npcs/budget-${name}.png`});
const turnRoute=()=>createPatrolRoute({id:'continuity',waypoints:[{x:8.05,z:10.1},{x:8.05,z:11.4}],speed:.24});
const routeTime=(r,elapsed)=>elapsed-r.offset;

test('exact acceleration, braking and reversal agree at 30/60/120 Hz',()=>{
  const simulate=hz=>{
    let velocity={x:0,z:0},position={x:0,z:0};
    for(const target of [{x:6.8,z:0},{x:0,z:6.8},{x:-6.8,z:0},{x:0,z:0}])for(let n=0;n<hz;n++){
      const next=integrateVelocity(velocity,target,1/hz);position.x+=next.dx;position.z+=next.dz;velocity=next;
    }
    return{...position,vx:velocity.x,vz:velocity.z};
  };
  const reference=simulate(120);
  for(const hz of[30,60])for(const key of Object.keys(reference))close(simulate(hz)[key],reference[key],`${hz}Hz ${key}`);
  const first=integrateVelocity({x:0,z:0},{x:6.8,z:0},1/60);assert(first.x>0&&first.x<6.8);assert(first.dx>0&&first.dx<6.8/60);
  const resumed=integrateVelocity({x:6.8,z:0},{x:6.8,z:0},60);close(resumed.dx,6.8*.05,'hidden-tab jump guard');
  close(integrateVelocity({x:1,z:2},{x:3,z:4},NaN).dx,0,'invalid time ignored');
});
test('collision accepts only travelled distance for phase and removes blocked momentum',()=>{
  const previous={position:{x:0,z:0},velocity:{x:4,z:0},distance:3,facing:'right'};
  const blocked=advanceLocomotion(previous,{x:4,z:0},1/60,{move:p=>p,strideLength:1});
  close(blocked.distance,3);close(blocked.velocity.x,0);close(blocked.phase,0);assert.equal(blocked.walking,false);
  const moved=advanceLocomotion(previous,{x:4,z:0},1/60,{strideLength:1});
  close(moved.distance,3+4/60);close(moved.phase,locomotionPhase(3+4/60));assert.equal(moved.facing,'right');
});
test('patrol velocity ramps continuously without increasing authored speed',()=>{
  const distance=1.3,speed=.24,ramp=.42,duration=sampleTravel(distance,speed,ramp,0).duration;
  close(sampleTravel(distance,speed,ramp,0).speed,0);close(sampleTravel(distance,speed,ramp,duration).speed,0);
  close(sampleTravel(distance,speed,ramp,duration).distance,distance);
  let last=0;
  for(let t=0;t<=duration;t+=.002){const sample=sampleTravel(distance,speed,ramp,t);assert(sample.speed<=speed+1e-10);assert(sample.distance>=last);last=sample.distance;
    const next=sampleTravel(distance,speed,ramp,t+.00001),numerical=(next.distance-sample.distance)/.00001;close(numerical,sample.speed,'integrated velocity',.00002);
  }
  for(const boundary of[ramp,duration-ramp,duration])close(sampleTravel(distance,speed,ramp,boundary-.000001).speed,sampleTravel(distance,speed,ramp,boundary+.000001).speed,'ramp boundary',.00001);
});
test('endpoint turns happen stopped, with continuous heading and a complete repeatable itinerary',()=>{
  const r=turnRoute(),s=r.segments[0],turnStart=s.travel+(r.pause-r.turnDuration)/2;
  const a=samplePatrolPosition(r,routeTime(r,turnStart+.01),{state:flags}),b=samplePatrolPosition(r,routeTime(r,turnStart+r.turnDuration-.01),{state:flags});
  assert(a.turning&&b.turning);assert(!a.walking&&!b.walking);close(a.x,b.x);close(a.z,b.z);assert(Math.abs(a.yaw-b.yaw)>3);
  assert.equal(a.animationAssetComplete,false,'four walking frames cannot certify authored turning');
  for(const boundary of[s.travel,s.travel+r.pause,r.duration]){
    const before=samplePatrolPosition(r,routeTime(r,boundary-.000001),{state:flags}),after=samplePatrolPosition(r,routeTime(r,boundary+.000001),{state:flags});
    assert(Math.hypot(before.x-after.x,before.z-after.z)<.000001);assert(angularDistance(before.yaw,after.yaw)<.000001);assert(angularDistance(before.phase,after.phase)<.00001);
  }
  for(let n=0;n<8;n++){const p=samplePatrolPosition(r,routeTime(r,1+n*r.duration),{state:flags}),first=samplePatrolPosition(r,routeTime(r,1),{state:flags});close(p.x,first.x);close(p.z,first.z);assert.equal(p.walking,true);}
});
test('gait phase changes with travelled path and remains fixed through endpoint pauses',()=>{
  const r=turnRoute(),s=r.segments[0];
  const a=samplePatrolPosition(r,routeTime(r,.6),{state:flags}),b=samplePatrolPosition(r,routeTime(r,1),{state:flags});
  close((b.phase-a.phase+TAU)%TAU,locomotionPhase(b.distance-a.distance,r.strideLength));
  const p=samplePatrolPosition(r,routeTime(r,s.travel+.1),{state:flags}),q=samplePatrolPosition(r,routeTime(r,s.travel+r.pause-.1),{state:flags});close(p.phase,q.phase);close(p.distance,q.distance);
  const layout=MONSTER_MOTION_DATA.pumpkin,image={width:512,height:512};
  for(const time of[0,10,1000])assert.equal(motionSprite(image,layout,{time,phase:TAU*.6,walking:true}).frameIndex,2);
  assert.equal(motionSprite(image,layout,{phase:TAU*.6,walking:false}).frameIndex,layout.idleFrame);
});
test('cat follows path distance across a corner at all refresh rates, with bounded history',()=>{
  const walk=hz=>{const trail=createDistanceTrail();for(let n=0;n<=hz*2;n++){const t=n/hz;trail.push({x:8+Math.min(t,1),z:10+Math.max(0,t-1)});}return trail;};
  const reference=walk(120).sample(.42);
  for(const hz of[30,60,120]){const trail=walk(hz),p=trail.sample(.42);close(p.x,reference.x);close(p.z,reference.z);close(p.phase,reference.phase);assert.equal(p.facing,'down');assert(trail.status().samples<=128);}
  const aroundCorner=walk(120).sample(1.2);close(aroundCorner.x,8.8);close(aroundCorner.z,10);assert.equal(aroundCorner.facing,'right');
  const trail=createDistanceTrail({maxSamples:64,maxDistance:1});for(let n=0;n<100000;n++)trail.push({x:8+n*.00001,z:10});assert(trail.status().samples<=64);assert(trail.status().retainedDistance>.42,'subpixel samples preserve useful trailing path');
  const companion=manifest.companions[0],actor=companionActor(companion,{width:1024,height:1024},walk(60),flags,{walking:true});assert(actor);close(actor.x,reference.x);close(actor.z,reference.z);close(actor.phase,locomotionPhase(2,.68));
  trail.push({x:15,z:10});assert.equal(trail.status().samples,1);close(trail.sample().x,15);close(trail.status().distance,0,'explicit relocation resets trail');
});
test('decoded cache, pending requests and failure history have enforced finite limits',async()=>{
  for(const options of[{concurrent:0},{maxResident:NaN},{maxBytes:0},{maxPending:1},{maxFailures:0}])assert.throws(()=>createCharacterAssets(options),/budget/);
  const tasks=[];const manager=createCharacterAssets({concurrent:1,maxPending:2,maxFailures:2,loadImage:()=>new Promise(resolve=>tasks.push(resolve))});
  const one=manager.request(asset('one')),two=manager.request(asset('two'));assert.equal(await manager.request(asset('three')),null);assert.equal(manager.status().pending,2);assert.equal(manager.status().rejectedRequests,1);
  await new Promise(resolve=>setImmediate(resolve));manager.dispose();assert.deepEqual(await Promise.all([one,two]),[null,null]);assert.equal(manager.status().pending,0);
  let closed=false;tasks[0]({width:1024,height:1024,close(){closed=true;}});await new Promise(resolve=>setImmediate(resolve));assert.equal(closed,true);assert.equal(manager.status().decodedBytes,0);
  const failures=createCharacterAssets({maxFailures:2,loadImage:async()=>{throw Error('offline');}});for(let n=0;n<8;n++){await failures.request(asset('failure-'+n));await new Promise(resolve=>setImmediate(resolve));}assert.equal(failures.status().failed,2);failures.dispose();
});

test('cat startup is visible behind owner and joins travelled history without a first-step warp',()=>{
  const trail=createDistanceTrail(),definition=manifest.companions[0],image={width:1024,height:1024};
  trail.push({x:8,z:10,facing:'down'});
  let previous=companionActor(definition,image,trail,flags,{walking:false});assert(previous);close(previous.z,9.58);assert.equal(previous.walking,false);
  for(let n=1;n<100;n++){
    trail.push({x:8+n*.01,z:10,facing:'right'});
    const next=companionActor(definition,image,trail,flags,{walking:true});assert(next);
    assert(Math.hypot(next.x-previous.x,next.z-previous.z)<=.0100001,'startup and history join cannot jump');previous=next;
  }
  // A constrained spawn can shorten its startup extension; it never walks into a wall.
  const constrained=createDistanceTrail();constrained.push({x:8,z:7.1,facing:'down'});
  const actor=companionActor(definition,image,constrained,{},{});if(actor)assert(actor.z>=7.1-.42);
});
