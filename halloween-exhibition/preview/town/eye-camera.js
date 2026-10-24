import {movementVector} from '../maze/view-model.js';
export const TOWN_EYE_HEIGHT=1.65;
export const TOWN_EYE_FOV=69;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const townFacingYaw=facing=>({up:0,right:-Math.PI/2,down:Math.PI,left:Math.PI/2}[facing]??0);
export const townEyeLevel=(map,distance='normal')=>map?.outdoor===true&&distance==='normal';
/** View-only orientation; never changes the town's save schema or movement rules. */
export function createTownEyeCamera(){
 let yaw=0,pitch=0,mapId=null;
 function sync(state,{reset=false}={}){if(reset||state.mapId!==mapId){mapId=state.mapId;yaw=townFacingYaw(state.facing);pitch=0;}return snapshot();}
 function snapshot(){return {yaw,pitch};}
 function look(dx,dy){yaw-=dx*.005;pitch=clamp(pitch-dy*.004,-.6,.6);return snapshot();}
 function input({keys=new Set(),held=new Set(),direction=null,dt=0,eye=false}={}){
  const down=name=>held.has(name)||direction===name;
  const forward=(keys.has('w')||keys.has('arrowup')||down('forward')?1:0)-(keys.has('s')||keys.has('arrowdown')||down('back')?1:0);
  const right=(keys.has('d')||!eye&&(keys.has('arrowright')||down('right'))?1:0)-(keys.has('a')||!eye&&(keys.has('arrowleft')||down('left'))?1:0);
  if(eye)yaw+=((keys.has('arrowleft')||down('left')?1:0)-(keys.has('arrowright')||down('right')?1:0))*clamp(dt,0,.05)*2.3;
  const {dx,dz}=movementVector(eye?'3d':'2d',yaw,forward,right,1);return {x:dx,z:dz};
 }
 return {sync,snapshot,look,input};
}
