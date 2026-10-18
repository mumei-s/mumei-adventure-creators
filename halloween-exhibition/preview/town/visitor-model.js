import {isInPalaceForecourt} from './palace-forecourt.js?v=20261019-journey1';
import {TOWN_START_MAP,getTownMap,isTownWalkable,mapTargets} from './story-data.js?v=20261019-homes2';
import {sampleTravel} from '../maze/patrol-model.js?v=20261017-review1';
import {locomotionPhase,yawForVector,shortestTurn,facingForVector} from '../maze/movement-runtime.js?v=20261017-review1';

// These are town streets, not reused palace slots or palace patrol geometry.
// The protagonist is already present; only the verified roster.npcs are guests.
export const TOWN_VISITOR_RANGE=10;
export const TOWN_VISITOR_SLOTS=Object.freeze([
  {id:'gate-east-guests',x:50.5,z:10.5,cna:true},
  {id:'gate-west-guests',x:12.5,z:8.5},
  {id:'north-plaza-guests',x:12.5,z:13.5},
  {id:'market-bridge-guests',x:13.5,z:20.5},
  {id:'workshop-street-guests',x:15.5,z:28.5},
  {id:'south-plaza-guests',x:26.5,z:32.5},
  {id:'canal-plaza-guests',x:38.5,z:26.5},
  {id:'clock-street-guests',x:49.5,z:16.5},
  {id:'east-market-guests',x:59.5,z:13.5},
  {id:'east-quay-guests',x:58.5,z:27.5},
  {id:'library-garden-guests',x:45.5,z:31.5},
  {id:'south-garden-guests',x:56.5,z:43.5},
  {id:'south-market-guests',x:23.5,z:43.5},
  {id:'inn-street-guests',x:13.5,z:39.5},
  {id:'south-quay-guests',x:40.5,z:43.5},
  {id:'west-flower-guests',x:6.5,z:39.5},
  {id:'west-lane-guests',x:3.5,z:27.5},
  {id:'far-quay-guests',x:60.5,z:32.5},
  {id:'south-east-guests',x:50.5,z:44.5},
  {id:'middle-lane-guests',x:19.5,z:31.5},
]);
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const mod=(n,d)=>(n%d+d)%d;
function offsets(count){return Array.from({length:count},(_,i)=>(i-(count-1)/2)*.95);}
function pointSafe(point,offsets,occupied=[]){
  return offsets.every(dx=>{
    const p={x:point.x+dx,z:point.z};
    return !isInPalaceForecourt(p,.4)&&isTownWalkable(TOWN_START_MAP,p.x,p.z,.23)&&!mapTargets(TOWN_START_MAP).some(t=>Math.hypot(t.x-p.x,t.z-p.z)<1.25)&&!occupied.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<2.7);
  });
}
function segmentSafe(a,b,offsets,occupied=[]){const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.08));for(let n=0;n<=steps;n++){const t=n/steps;if(!pointSafe({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},offsets,occupied))return false;}return true;}
function makeRoute(center,offsets,groupId,occupied){
  const points=[{...center}];
  const sign=hash(groupId)%2?1:-1;
  for(const[dx,dz]of [[sign,0],[0,1],[-sign,0],[0,-1]]){
    // Walk a visible stretch of street, shortening only where a real obstacle
    // or another group's reserved route would make the full leg unsafe.
    for(const length of [2.6,2.1,1.6,1.1,.65]){
      const next={x:center.x+dx*length,z:center.z+dz*length};
      if(segmentSafe(center,next,offsets,occupied)){points.push(next,{...center});break;}
    }
    if(points.length>=5)break;
  }
  // Every group can at least breathe/turn in place when a street is narrow.
  const speed=.76+(hash(groupId)%9)*.014,wait=.85+(hash(groupId)%7)*.06,ramp=.42,turnDuration=.65;
  const segments=[];let elapsed=0,distance=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b.x-a.x,b.z-a.z),duration=sampleTravel(length,speed,ramp,0).duration;
    // Turn only while standing, from the actual incoming route into this leg.
    // Skipping zero-length closure legs keeps the heading continuous at wrap.
    let incoming=null;for(let step=1;step<=points.length;step++){const p=points[mod(i-step,points.length)],q=points[mod(i-step+1,points.length)];if(Math.hypot(q.x-p.x,q.z-p.z)>1e-7){incoming={x:q.x-p.x,z:q.z-p.z};break;}}
    const previousYaw=incoming?yawForVector(incoming.x,incoming.z):0,yaw=length?yawForVector(b.x-a.x,b.z-a.z):previousYaw;
    // The final point is the first point again; do not add a second idle-only
    // segment there. It otherwise looks as if everybody has stopped walking.
    if(length===0)continue;
    segments.push({a,b,start:elapsed,wait,duration,length,distance,yaw,previousYaw,turn:shortestTurn(previousYaw,yaw)});elapsed+=wait+duration;distance+=length;
  }
  if(!segments.length)segments.push({a:center,b:center,start:0,wait,duration:0,length:0,distance:0,yaw:0,previousYaw:0,turn:0});
  return {points,segments,duration:elapsed||wait,distance,speed,ramp,turnDuration,phaseOffset:(hash(groupId)%97)/10};
}

export function placeTownVisitors(roster){
  const source=Array.isArray(roster)?roster:Array.isArray(roster?.npcs)?roster.npcs:[],groups=new Map(),visitors=[],omitted=[],usedSlots=new Set(),occupied=[];
  for(const npc of source){if(!npc?.id||!npc.creatorId||!npc.asset?.src){omitted.push({id:npc?.id||null,reason:'invalid-town-visitor'});continue;}const groupId=npc.groupId||npc.creatorId;if(!groups.has(groupId))groups.set(groupId,[]);groups.get(groupId).push(npc);}
  const grouped=[...groups].sort(([,a],[,b])=>Number(b.some(n=>n.creatorId==='grand_daisy8632'))-Number(a.some(n=>n.creatorId==='grand_daisy8632')));
  for(const[groupId,original]of grouped){
    const members=[...original].sort((a,b)=>(a.groupOrder??0)-(b.groupOrder??0)||a.id.localeCompare(b.id)),positions=offsets(members.length),cna=members.some(n=>n.creatorId==='grand_daisy8632');
    if(members.length>3){omitted.push({groupId,reason:'town-group-too-large'});continue;}
    let chosen=null;
    for(const slot of TOWN_VISITOR_SLOTS.filter(s=>!usedSlots.has(s.id)&&(!s.cna||cna)&&(!cna||s.cna))){
      for(const[dx,dz]of [[0,0],[0,1],[0,-1],[1,0],[-1,0],[0,2],[0,-2]]){const center={x:slot.x+dx,z:slot.z+dz};if(pointSafe(center,positions,occupied)){chosen={slot,center};break;}}
      if(chosen)break;
    }
    if(!chosen){omitted.push({groupId,reason:'no-safe-town-capacity'});continue;}
    usedSlots.add(chosen.slot.id);const route=makeRoute(chosen.center,positions,groupId,occupied);
    members.forEach((npc,index)=>{
      const x=chosen.center.x+positions[index],z=chosen.center.z;
      visitors.push({...npc,id:npc.id,creatorId:npc.creatorId,name:npc.name,label:npc.label||npc.name,profileURL:npc.profileURL||`https://note.com/${npc.creatorId}`,articleURL:npc.articleURL||null,groupId,mapId:TOWN_START_MAP,slotId:chosen.slot.id,x,z,center:{...chosen.center},offsetX:positions[index],route,interactive:npc.interactive!==false,walking:false,facing:'down',phase:0});
      for(const segment of route.segments){const steps=Math.max(1,Math.ceil(segment.length/.3));for(let n=0;n<=steps;n++){const t=n/steps;occupied.push({x:segment.a.x+(segment.b.x-segment.a.x)*t+positions[index],z:segment.a.z+(segment.b.z-segment.a.z)*t});}}
    });
  }
  return {visitors,omitted};
}

function sampleRoute(visitor,time,motion){
  const route=visitor.route;if(!motion||!route||!Number.isFinite(time))return {x:visitor.x,z:visitor.z,walking:false,facing:'down',phase:0,speed:0,distance:0,yaw:0,turning:false,turnProgress:0,animationAssetComplete:false};
  const absolute=time+route.phaseOffset,cycle=Math.floor(absolute/route.duration),clock=mod(absolute,route.duration);
  const segment=route.segments.find(s=>clock<s.start+s.wait+s.duration)||route.segments.at(-1),local=clock-segment.start;
  const travel=sampleTravel(segment.length,route.speed,route.ramp,local-segment.wait),progress=segment.length?travel.distance/segment.length:0;
  const turnStart=(segment.wait-route.turnDuration)/2,turnProgress=Math.max(0,Math.min(1,(local-turnStart)/route.turnDuration)),eased=turnProgress*turnProgress*(3-2*turnProgress),yaw=segment.previousYaw+segment.turn*eased;
  const walked=cycle*route.distance+segment.distance+travel.distance;
  return {x:segment.a.x+(segment.b.x-segment.a.x)*progress+visitor.offsetX,z:segment.a.z+(segment.b.z-segment.a.z)*progress,walking:travel.speed>1e-6,facing:facingForVector(Math.sin(yaw),Math.cos(yaw)),phase:locomotionPhase(walked,1.05),speed:travel.speed,distance:walked,yaw,turnProgress,turning:Math.abs(segment.turn)>1e-7&&turnProgress>0&&turnProgress<1,animationAssetComplete:false};
}
export function sampleTownVisitors(visitors,{state,time=0,motion=true}={}){
  if(state?.mapId&&state.mapId!==TOWN_START_MAP)return[];
  return visitors.map(visitor=>({...visitor,...sampleRoute(visitor,time,motion)}));
}
export function chooseTownVisitorGroups(poses,state,maxGroups=3){
  if(!state?.position||state.mapId!==TOWN_START_MAP)return[];
  const groups=new Map();for(const pose of poses){if(pose.mapId!==state.mapId)continue;if(!groups.has(pose.groupId))groups.set(pose.groupId,[]);groups.get(pose.groupId).push(pose);}
  const distance=group=>Math.min(...group.map(p=>Math.hypot(p.x-state.position.x,p.z-state.position.z)));
  return [...groups.values()].filter(group=>distance(group)<=TOWN_VISITOR_RANGE).sort((a,b)=>distance(a)-distance(b)||a[0].groupId.localeCompare(b[0].groupId)).slice(0,Math.max(0,Math.min(8,Math.floor(Number(maxGroups)||0)))).flat();
}
export function townVisitorLineOfSight(state,target){
  if(state?.mapId!==target.mapId)return false;const a=state.position,steps=Math.max(1,Math.ceil(Math.hypot(a.x-target.x,a.z-target.z)/.1));
  for(let n=1;n<=steps;n++){const t=n/steps;if(!isTownWalkable(state.mapId,a.x+(target.x-a.x)*t,a.z+(target.z-a.z)*t,.05))return false;}return true;
}
export function nearestTownVisitor(poses,state,range=1.6){return poses.filter(p=>p.interactive!==false&&p.mapId===state.mapId).map(p=>({pose:p,distance:Math.hypot(p.x-state.position.x,p.z-state.position.z)})).filter(item=>item.distance<=range&&townVisitorLineOfSight(state,item.pose)).sort((a,b)=>a.distance-b.distance)[0]?.pose||null;}
