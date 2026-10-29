export function directionFromMovement(dx,dz,previous='down'){
  if(Math.abs(dx)+Math.abs(dz)<.0001)return previous;
  return Math.abs(dx)>Math.abs(dz)?dx>0?'right':'left':dz>0?'down':'up';
}
export function followCamera(previous,target,dt,reducedMotion=false){
  if(!previous||reducedMotion||Math.hypot(target.x-previous.x,target.y-previous.y)>150)return {...target};
  const t=1-Math.exp(-Math.max(0,Math.min(dt,.05))*22);
  return {x:previous.x+(target.x-previous.x)*t,y:previous.y+(target.y-previous.y)*t};
}
export function depthOrder(items){return items.map((item,index)=>({...item,index})).sort((a,b)=>a.depth-b.depth||a.index-b.index);}

// Physical feet of two freestanding shelves. All existing routes remain open.
import {move} from './maze-model.js?v=20261014-adventure2';
export const FURNITURE_FOOTPRINTS=[{x:24.8,z:44.8,halfWidth:2.1,halfDepth:.65},{x:39.2,z:44.8,halfWidth:2.1,halfDepth:.65}];
export function inFurniture(x,z){return FURNITURE_FOOTPRINTS.some(p=>Math.abs(x-p.x)<p.halfWidth+.45&&Math.abs(z-p.z)<p.halfDepth+.45);}
export function moveAroundFurniture(state,dx,dz){let next=move(state,dx,0);if(inFurniture(next.x,next.z))next=state;const moved=move(next,0,dz);return inFurniture(moved.x,moved.z)?next:moved;}

// The camera stays within the authored room envelope, with headroom for the hero.
// In tall viewports this shows adjoining architecture rather than unbounded void.
export function clampSceneCamera(target,width,height,scale,originY){
  const fit=(value,low,high)=>low>high?(low+high)/2:Math.max(low,Math.min(high,value));
  const margin=90,left=.5*72,right=(target.x>16*72?27.5:15.5)*72,top=.5*72,bottom=14.5*72;
  return {x:fit(target.x,left-margin+width/(2*scale),right+margin-width/(2*scale)),y:fit(target.y,top-margin+originY/scale,bottom+margin-(height-originY)/scale)};
}
