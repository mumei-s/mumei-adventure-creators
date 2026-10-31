import {LINKS} from './journey-data.js?v=20261031-return-3';
// Author IDs come from the manuscript, not proximity to ordinary town residents.
export const CAST_CREATORS=Object.freeze([...new Set(LINKS.map(([,url])=>new URL(url).pathname.split('/')[1]))]);
export const CAST_LABELS=Object.freeze(Object.fromEntries(CAST_CREATORS.map(id=>[id,LINKS.find(([,url])=>new URL(url).pathname.split('/')[1]===id)[0]])));
export function manuscriptCast(visitors){
 const cast=visitors.filter(v=>v.mapId==='lantern-town'&&CAST_CREATORS.includes(v.creatorId));
 const ids=new Set();for(const actor of cast){if(ids.has(actor.id))throw Error('Duplicate manuscript actor');ids.add(actor.id);}
 const missing=CAST_CREATORS.filter(id=>!cast.some(v=>v.creatorId===id));
 if(missing.length)throw Error('Missing manuscript creators: '+missing.join(', '));
 if(cast.filter(v=>v.creatorId==='grand_daisy8632').length!==3)throw Error('CNA cast must contain three approved members');
 return cast;
}
export function castPositions(cast,stage,walkable){
 // A shallow crowd around the story landmark. Keep the approach/goal clear.
 const slots=[];
 for(let dz=-4;dz<=4;dz++)for(let dx=-5;dx<=5;dx++){
  const x=stage.goal.x+dx*.95,z=stage.goal.z+dz*.95;
  if(Math.hypot(x-stage.goal.x,z-stage.goal.z)<1.8||Math.abs(dx)<1&&dz>=0||!walkable(x,z))continue;
  slots.push({x,z});
 }
 slots.sort((a,b)=>Math.hypot(a.x-stage.goal.x,a.z-stage.goal.z)-Math.hypot(b.x-stage.goal.x,b.z-stage.goal.z));
 if(slots.length<cast.length)throw Error('Insufficient safe manuscript cast positions');
 const priority=stage.id===3?['airoumu_rin','imota14','dandy_snake880']:stage.id===2?['clever_hare2654','naemotion','dandy_snake880']:[];
 const rank=id=>priority.includes(id)?priority.indexOf(id):priority.length;
 const ordered=[...cast].sort((a,b)=>rank(a.creatorId)-rank(b.creatorId));
 return ordered.map((actor,i)=>({...actor,...slots[i],id:'story-'+actor.id,interactive:false,walking:false,facing:'down',phase:0}));
}
