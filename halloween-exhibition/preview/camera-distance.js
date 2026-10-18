export const CAMERA_WIDE_SCALE=.68;
export const normalizeCameraDistance=value=>value==='wide'?'wide':'normal';
export const cameraDistanceScale=value=>normalizeCameraDistance(value)==='wide'?CAMERA_WIDE_SCALE:1;
export function readCameraDistance(page){try{return normalizeCameraDistance(localStorage.getItem('halloween-exhibition:camera:'+page));}catch{return 'normal';}}
export function saveCameraDistance(page,value){try{localStorage.setItem('halloween-exhibition:camera:'+page,normalizeCameraDistance(value));}catch{}}
// Pull back only through open floor, never through a locked gate or a wall.
export function mazeWideCamera(state,blocked){let distance=0;for(let step=.25;step<=5;step+=.25){const x=state.x+Math.sin(state.yaw)*step,z=state.z+Math.cos(state.yaw)*step;if([-.32,.32].some(dx=>[-.32,.32].some(dz=>blocked(x+dx,z+dz,state))))break;distance=step;}return {x:state.x+Math.sin(state.yaw)*distance,z:state.z+Math.cos(state.yaw)*distance,y:Math.min(4.1,2.1+distance*.4),distance};}

export function normalizeCameraZoom(value){return typeof value==='number'&&Number.isFinite(value)?Math.max(.65,Math.min(1.4,value)):1;}
export function readCameraZoom(page){try{const raw=localStorage.getItem('halloween-exhibition:camera-zoom:'+page);return raw===null?1:normalizeCameraZoom(Number(raw));}catch{return 1;}}
export function saveCameraZoom(page,value){try{localStorage.setItem('halloween-exhibition:camera-zoom:'+page,String(Math.round(normalizeCameraZoom(value)*1000)/1000));}catch{}}
