import {TOWN_START_MAP,getTownMap,isTownWalkable,mapTargets} from './story-data.js';

// These are town streets, not reused palace slots or palace patrol geometry.
// The protagonist is already present; only the verified roster.npcs are guests.
export const TOWN_VISITOR_RANGE=10;
export const TOWN_VISITOR_SLOTS=Object.freeze([
  {id:'gate-east-guests',x:36.5,z:8.5,cna:true},
  {id:'gate-west-guests',x:12.5,z:8.5},
  {id:'north-plaza-guests',x:23.5,z:8.5},
  {id:'market-bridge-guests',x:16.5,z:13.5},
  {id:'workshop-street-guests',x:15.5,z:26.5},
  {id:'south-plaza-guests',x:26.5,z:32.5},
  {id:'canal-plaza-guests',x:38.5,z:26.5},
  {id:'clock-street-guests',x:43.5,z:13.5},
  {id:'east-market-guests',x:57.5,z:13.5},
  {id:'east-quay-guests',x:57.5,z:27.5},
  {id:'library-garden-guests',x:45.5,z:29.5},
  {id:'south-garden-guests',x:56.5,z:43.5},
  {id:'south-market-guests',x:23.5,z:43.5},
  {id:'inn-street-guests',x:13.5,z:39.5},
  {id:'south-quay-guests',x:40.5,z:43.5},
  {id:'west-flower-guests',x:6.5,z:39.5},
]);
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const direction=(dx,dz,previous='down')=>Math.abs(dx)+Math.abs(dz)<1e-7?previous:Math.abs(dx)>Math.abs(dz)?dx>0?'right':'left':dz>0?'down':'up';
const mod=(n,d)=>(n%d+d)%d;
function offsets(count){return Array.from({length:count},(_,i)=>(i-(count-1)/2)*.95);}
function pointSafe(point,offsets,occupied=[]){
  return offsets.every(dx=>{
    const p={x:point.x+dx,z:point.z};
    return isTownWalkable(TOWN_START_MAP,p.x,p.z,.23)&&!mapTargets(TOWN_START_MAP).some(t=>Math.hypot(t.x-p.x,t.z-p.z)<1.25)&&!occupied.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<2.7);
  });
}
function segmentSafe(a,b,offsets,occupied=[]){const length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/.08));for(let n=0;n<=steps;n++){const t=n/steps;if(!pointSafe({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},offsets,occupied))return false;}return true;}
function makeRoute(center,offsets,groupId,occupied){
  const points=[{...center}];
  const sign=hash(groupId)%2?1:-1;
  for(const[dx,dz]of [[.65*sign,0],[0,.65],[-.65*sign,0],[0,-.65]]){
    const next={x:center.x+dx,z:center.z+dz};
    if(segmentSafe(center,next,offsets,occupied)){points.push(next,{...center});if(points.length>=5)break;}
  }
  // Every group can at least breathe/turn in place when a street is narrow.
  const speed=.48+(hash(groupId)%9)*.012,wait=1.8+(hash(groupId)%7)*.12;
  const segments=[];let elapsed=0,distance=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b.x-a.x,b.z-a.z),duration=length/speed;
    segments.push({a,b,start:elapsed,wait,duration,length,distance});elapsed+=wait+duration;distance+=length;
  }
  return {points,segments,duration:elapsed,distance,speed,phaseOffset:(hash(groupId)%97)/10};
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
      visitors.push({...npc,id:npc.id,creatorId:npc.creatorId,name:npc.name,label:npc.label||npc.name,profileURL:npc.profileURL||`https://note.com/${npc.creatorId}`,articleURL:npc.articleURL||null,groupId,mapId:TOWN_START_MAP,slotId:chosen.slot.id,x,z,center:{...chosen.center},offsetX:positions[index],route,interactive:npc.interactive!==false,walking:false,facing:'down',phase:0});occupied.push({x,z});
    });
  }
  return {visitors,omitted};
}

function sampleRoute(visitor,time,motion){
  const route=visitor.route;if(!motion||!route||!Number.isFinite(time))return {x:visitor.x,z:visitor.z,walking:false,facing:'down',phase:0};
  const clock=mod(time+route.phaseOffset,route.duration);
  const segment=route.segments.find(s=>clock<s.start+s.wait+s.duration)||route.segments.at(-1),local=clock-segment.start;
  if(local<segment.wait||segment.length===0){const quarter=Math.floor(Math.max(0,local)/segment.wait*3);const previous=direction(segment.a.x-segment.b.x,segment.a.z-segment.b.z);return {x:segment.a.x+visitor.offsetX,z:segment.a.z,walking:false,facing:quarter===2?'down':previous,phase:0};}
  const t=Math.min(1,Math.max(0,(local-segment.wait)/segment.duration)),walked=segment.distance+segment.length*t;
  return {x:segment.a.x+(segment.b.x-segment.a.x)*t+visitor.offsetX,z:segment.a.z+(segment.b.z-segment.a.z)*t,walking:true,facing:direction(segment.b.x-segment.a.x,segment.b.z-segment.a.z),phase:walked/1.05*Math.PI*2};
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
