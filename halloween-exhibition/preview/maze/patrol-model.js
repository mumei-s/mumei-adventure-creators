import {blocked, CELL} from './maze-model.js?v=20261014-adventure2';
import {inFurniture} from './rpg-model.js?v=20261014-adventure2';

// Tile coordinates, independent of rendering and player position. Each lane stays
// inside one room: opening a door never changes a character's itinerary.
const lane=(x,z,x2,z2)=>Object.freeze([[x,z],[x2,z2]].map(([x,z])=>Object.freeze({x,z})));
export const PATROL_ROUTES=Object.freeze({
  creator:Object.freeze({
    'hall-west':lane(6.35,8,6.35,9),
    'hall-upper-west':lane(7,7.7,7,9.4),
    'hall-west-mid':lane(5.15,10,5.15,10.6),
    'hall-west-south':lane(6.15,12,6.15,13.1),
    'hall-south-east':lane(10.2,13.9,10.8,13.9),
    'hall-east':lane(10.85,10,10.85,10.6),
    'east-north':lane(13.4,8.85,13.4,9.45),
    'east-upper':lane(14.55,8.85,14.55,9.45),
    'east-south':lane(15.05,10.25,15.05,11.2),
    'west-north':lane(.95,7.95,1.55,7.95),
    'west-east':lane(2.95,9.3,2.95,10),
    'west-south':lane(.95,11.9,1.55,11.9),
    'archive-north-west':lane(5.55,1.25,6.15,1.25),
    'archive-north-east':lane(10.05,1.25,10.65,1.25),
    'archive-west':lane(5.7,3.05,5.7,4),
    'archive-east':lane(10.3,3.4,10.3,4.35),
    'archive-mid-west':lane(6.65,2.7,6.65,3.8),
    'archive-mid-east':lane(9.45,2.7,9.45,3.8),
  }),
  monster:Object.freeze({
    pumpkin:lane(8.05,10.1,8.05,11.4),
    zombie:lane(7.45,12.7,7.45,13.9),
    franken:lane(9.2,8,9.2,9.5),
    ghost:lane(13.95,10.4,13.95,11.5),
    vampire:lane(2.25,10.85,3.2,10.85),
    bat:lane(8,2.45,8,3.95),
    witch:lane(7.8,4.85,8.9,4.85),
    masked_wanderer:lane(2.65,8,3.3,8),
    werewolf:lane(14.4,12.2,15.15,12.2),
    mummy:lane(9.9,5.2,10.7,5.2),
  }),
  resident:Object.freeze({
    'resident-archivist':lane(7.6,1.05,8.65,1.05),
    'resident-gardener':lane(8.8,12.65,8.8,13.9),
  }),
});
const CREATOR_ANCHORS={
  'hall-west':5.7,'hall-upper-west':7,'hall-west-mid':5.15,'hall-west-south':5.6,'hall-south-east':10.2,'hall-east':10.9,
  'east-north':13.3,'east-upper':14.3,'east-south':14.9,'west-north':1.5,'west-east':2.9,'west-south':1.5,
  'archive-north-west':5.7,'archive-north-east':10.3,'archive-west':5.8,'archive-east':10.3,'archive-mid-west':6.5,'archive-mid-east':9.8,
};
// Scenery feet in both palace renderers, beyond the two collidable shelves.
// Rectangles conservatively include small columns, chairs, desks and planters.
const SCENERY=Object.freeze([
  // Crooked west-room frame posts, including their floor-height tilt.
  ...[8.5,10.5,11.5].flatMap(z=>[1,3].map(x=>({x,z,hw:.105,hd:.0375}))),
  // World floor pumpkins: .74 world-unit lobe/face envelope, plus actor radius below.
  ...[[22,34,.65],[42,34,.8],[22,50,.75],[42,50,.55],[54,34,.65],[60,46,.75],[6,34,.65],[10,46,.8],[23,8,.65],[41,8,.7]].map(([x,z,scale])=>({x:x/CELL,z:z/CELL,hw:.74*scale/CELL,hd:.74*scale/CELL})),
  {x:14,z:10,hw:.165,hd:.165},
  ...[7.5,9.5,11.5,13.5].flatMap(z=>[5.375,10.625].map(x=>({x,z,hw:.18,hd:.18}))),
  ...[8.5,11.5].flatMap(z=>[13,15].map(x=>({x,z,hw:.1,hd:.1}))),
  {x:6,z:4.65,hw:.4,hd:.2},{x:6.25,z:4.9,hw:.4,hd:.22},
  {x:13.325,z:12.375,hw:.4,hd:.2},{x:2,z:12.35,hw:.4,hd:.2},
  {x:4.8,z:8.375,hw:.2,hd:.2},{x:11.2,z:8.375,hw:.2,hd:.2},
  ...[[4.7,12.5],[11.3,12.5],[4.725,3.5],[11.275,3.5],[12.7,11.75],[15.3,8.75],[.7,9.75]].map(([x,z])=>({x,z,hw:.17,hd:.17})),
]);
export function patrolPointSafe(point,state={},radius=.13){
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return false;
  for(const dx of[-radius,0,radius])for(const dz of[-radius,0,radius])
    if(blocked((point.x+dx)*CELL,(point.z+dz)*CELL,state)||inFurniture((point.x+dx)*CELL,(point.z+dz)*CELL))return false;
  return !SCENERY.some(p=>Math.abs(point.x-p.x)<p.hw+radius&&Math.abs(point.z-p.z)<p.hd+radius);
}
export function patrolSegmentSafe(a,b,state={},radius=.13){
  const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.04));
  for(let i=0;i<=steps;i++)if(!patrolPointSafe({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps},state,radius))return false;
  return true;
}
function hash(value){let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n/4294967296;}
const openState={unlocked:true,horrorAccepted:true};
const accessStates=[{}, {unlocked:true}, {horrorAccepted:true}, openState];
const accessIndex=state=>(state.unlocked?1:0)+(state.horrorAccepted?2:0);
export function createPatrolRoute({id='patrol',waypoints=[],speed=.22,pause=1.8,radius=.13}={}){
  if(!Number.isFinite(speed)||speed<=0||!Number.isFinite(pause)||pause<0||!Number.isFinite(radius)||radius<0)throw new TypeError('Invalid patrol timing or radius');
  const points=waypoints.map(p=>({x:p.x,z:p.z}));
  if(!points.length||points.some(p=>!patrolPointSafe(p,openState,radius)))throw new Error(`Unsafe patrol point: ${id}`);
  for(let i=0;i<points.length;i++)if(!patrolSegmentSafe(points[i],points[(i+1)%points.length],openState,radius))throw new Error(`Unsafe patrol segment: ${id}`);
  let duration=0;const segments=points.map((a,i)=>{const b=points[(i+1)%points.length],distance=Math.hypot(b.x-a.x,b.z-a.z),travel=distance/speed;const segment=Object.freeze({a:Object.freeze(a),b:Object.freeze(b),start:duration,travel,distance,safe:Object.freeze(accessStates.map(state=>patrolSegmentSafe(a,b,state,radius)))});duration+=travel+pause;return segment;});
  return Object.freeze({id,points:Object.freeze(points),segments:Object.freeze(segments),speed,pause,radius,duration,offset:hash(id)*duration});
}
export function createActorPatrol(actor,{role='creator'}={}){
  const key=role==='creator'?actor.slotId:actor.id,source=PATROL_ROUTES[role]?.[key];
  if(!source)throw new Error(`Unknown ${role} patrol: ${key}`);
  const dx=role==='creator'?(actor.x-CREATOR_ANCHORS[key]):0;
  return createPatrolRoute({id:`${role}:${key}`,waypoints:source.map(p=>({x:p.x+dx,z:p.z})),speed:role==='monster'?.2:.24});
}
export function samplePatrolPosition(route,timeSeconds=0,{motion=true,state={}}={}){
  const home=route.points[0],still={...home,facing:'down',walking:false,phase:0};
  if(!motion||route.points.length===1||!Number.isFinite(timeSeconds))return still;
  // A closed door cannot produce teleporting or walking through a blocked room.
  if(!route.segments[0].safe[accessIndex(state)])return still;
  const t=((timeSeconds+route.offset)%route.duration+route.duration)%route.duration;
  const s=route.segments.find(s=>t<s.start+s.travel+route.pause)||route.segments.at(-1);
  if(!s.safe[accessIndex(state)])return still;
  const elapsed=t-s.start,progress=s.travel?Math.min(1,elapsed/s.travel):0,dx=s.b.x-s.a.x,dz=s.b.z-s.a.z;
  return {x:s.a.x+dx*progress,z:s.a.z+dz*progress,facing:Math.abs(dx)>Math.abs(dz)?dx>0?'right':'left':dz>0?'down':'up',walking:elapsed<s.travel&&s.distance>0,phase:timeSeconds*7};
}
