export const CAMERA_WIDE_SCALE=.68;
export const CAMERA_FAR_SCALE=.48;
export const CAMERA_DISTANCE_STAGES=Object.freeze(['normal','wide','far']);
export const normalizeCameraDistance=value=>CAMERA_DISTANCE_STAGES.includes(value)?value:'normal';
export const cameraDistanceScale=value=>({normal:1,wide:CAMERA_WIDE_SCALE,far:CAMERA_FAR_SCALE})[normalizeCameraDistance(value)];
export const nextCameraDistance=value=>CAMERA_DISTANCE_STAGES[(CAMERA_DISTANCE_STAGES.indexOf(normalizeCameraDistance(value))+1)%CAMERA_DISTANCE_STAGES.length];
export const cameraDistanceLabel=value=>({normal:'標準',wide:'引き',far:'遠景'})[normalizeCameraDistance(value)];
// Perspective retains the existing first-person/third-person framing. The new
// far stage widens its view as well as using any additional clear floor behind.
export const mazeCameraZoom=(distance,zoom=1)=>normalizeCameraZoom(zoom)*(normalizeCameraDistance(distance)==='far'?CAMERA_FAR_SCALE/CAMERA_WIDE_SCALE:1);
export function readCameraDistance(page){try{return normalizeCameraDistance(localStorage.getItem('halloween-exhibition:camera:'+page));}catch{return 'normal';}}
export function saveCameraDistance(page,value){try{localStorage.setItem('halloween-exhibition:camera:'+page,normalizeCameraDistance(value));}catch{}}
// Pull back only through open floor, never through a locked gate or a wall.
export function mazeWideCamera(state,blocked,stage='wide'){const far=normalizeCameraDistance(stage)==='far',limit=far?8:5;let distance=0;for(let step=.25;step<=limit;step+=.25){const x=state.x+Math.sin(state.yaw)*step,z=state.z+Math.cos(state.yaw)*step;if([-.32,.32].some(dx=>[-.32,.32].some(dz=>blocked(x+dx,z+dz,state))))break;distance=step;}return {x:state.x+Math.sin(state.yaw)*distance,z:state.z+Math.cos(state.yaw)*distance,y:Math.min(far?5.3:4.1,2.1+distance*.4),distance};}

export function normalizeCameraZoom(value){return typeof value==='number'&&Number.isFinite(value)?Math.max(.65,Math.min(1.4,value)):1;}
export function readCameraZoom(page){try{const raw=localStorage.getItem('halloween-exhibition:camera-zoom:'+page);return raw===null?1:normalizeCameraZoom(Number(raw));}catch{return 1;}}
export function saveCameraZoom(page,value){try{localStorage.setItem('halloween-exhibition:camera-zoom:'+page,String(Math.round(normalizeCameraZoom(value)*1000)/1000));}catch{}}
