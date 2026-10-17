import {advanceLocomotion,createDistanceTrail,locomotionPhase,facingForVector} from '../maze/movement-runtime.js?v=20261017-review1';

export {advanceLocomotion,createDistanceTrail,locomotionPhase,facingForVector};
export const TOWN_TILE=64;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** A pixel camera. Its response is measured in seconds, independently of refresh rate. */
export function followTownCamera(previous,target,dt,{snap=false,response=.12}={}){
  if(!previous||snap)return {...target};
  const amount=1-Math.exp(-clamp(Number.isFinite(dt)?dt:0,0,.1)/response);
  return {x:previous.x+(target.x-previous.x)*amount,y:previous.y+(target.y-previous.y)*amount};
}

export function townCameraTarget(position,map,width,height,tile=TOWN_TILE){
  const worldWidth=map.width*TOWN_TILE,worldHeight=map.height*TOWN_TILE,scale=tile/TOWN_TILE;
  const halfWidth=width/(2*scale),halfHeight=height/(2*scale);
  return {x:worldWidth<=halfWidth*2?worldWidth/2:clamp(position.x*TOWN_TILE,halfWidth,worldWidth-halfWidth),
    y:worldHeight<=halfHeight*2?worldHeight/2:clamp(position.z*TOWN_TILE,halfHeight,worldHeight-halfHeight)};
}

/** Visible tile bounds include roof overhangs and tall trees above their ground footprints. */
export function townVisibleBounds(camera,width,height,scale,map,padding=3,depthScale=1){
  return {left:clamp(Math.floor((camera.x-width/scale/2)/TOWN_TILE)-padding,0,map.width-1),
    right:clamp(Math.ceil((camera.x+width/scale/2)/TOWN_TILE)+padding,0,map.width-1),
    top:clamp(Math.floor((camera.y-height/(scale*depthScale)/2)/TOWN_TILE)-padding,0,map.height-1),
    bottom:clamp(Math.ceil((camera.y+height/(scale*depthScale)/2)/TOWN_TILE)+padding+3,0,map.height-1)};
}

export function townWorldToScreen(point,camera,width,height,scale,depthScale=1){
  return {x:width/2+(point.x*TOWN_TILE-camera.x)*scale,y:height/2+(point.z*TOWN_TILE-camera.y)*scale*depthScale};
}

export function townScreenToWorld(point,camera,width,height,scale,depthScale=1){
  return {x:((point.x-width/2)/scale+camera.x)/TOWN_TILE,z:((point.y-height/2)/(scale*depthScale)+camera.y)/TOWN_TILE};
}
