export const VERSION=1;
export const SAVE_KEY='mumei.halloween.reading-night.2026.v1';
export const STAGES=Object.freeze([
 {id:1,title:'集合写真',objective:'広場の灯りまで歩いて、写真を撮る',action:'集合写真を撮る',spawn:{x:27.5,z:30.5},goal:{x:27.5,z:23.5},brightness:68},
 {id:2,title:'誰もいない通り',objective:'みんなを待たせた「夜の書庫」へ戻る',action:'書庫の扉を開ける',spawn:{x:27.5,z:23.5},goal:{x:48.5,z:30.5},brightness:35},
 {id:3,title:'先に帰る私',objective:'みんなを追って、宮殿前の門へ向かう',action:'みんなに声をかける',spawn:{x:48.5,z:30.5},goal:{x:32.5,z:8.5},brightness:27}
]);
export function cleanSave(raw){
 const n=Number.isInteger(raw?.chapter)?Math.max(0,Math.min(3,raw.chapter)):0;
 const position=raw?.position&&Number.isFinite(raw.position.x)&&Number.isFinite(raw.position.z)&&raw.position.x>0&&raw.position.x<64&&raw.position.z>0&&raw.position.z<48?{x:raw.position.x,z:raw.position.z}:null;
 return {version:VERSION,chapter:n,mode:raw?.mode==='walk'&&n<3?'walk':'read',position,muted:raw?.muted!==false,view:raw?.view==='2d'?'2d':'3d'};
}
export function loadSave(storage){try{return cleanSave(JSON.parse(storage?.getItem(SAVE_KEY)||'null'));}catch{return cleanSave(null);}}
export function writeSave(storage,state){try{storage?.setItem(SAVE_KEY,JSON.stringify(cleanSave(state)));return !!storage;}catch{return false;}}
export function routeFrom(search){const p=new URLSearchParams(search);const scene=p.get('scene'),chapter=p.get('chapter');if(/^[123]$/.test(scene||''))return {chapter:Number(scene)-1,mode:'walk',position:null};if(/^[0-3]$/.test(chapter||''))return {chapter:Number(chapter),mode:'read',position:null};return null;}
export function noteReturn(search,referrer=''){const p=new URLSearchParams(search),candidate=p.get('return')||referrer;try{const u=new URL(candidate);return u.protocol==='https:'&&u.hostname==='note.com'&&/^\/ss_yr\/n\/[a-zA-Z0-9]+\/?$/.test(u.pathname)?u.href:null;}catch{return null;}}
export function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
export function reached(a,b){return distance(a,b)<1.55;}
export function complete(state){return cleanSave({...state,chapter:Math.min(3,state.chapter+1),mode:'read',position:null});}
/** Four-neighbour paths deliberately avoid cutting corners through buildings. */
export function findPath(start,goal,walkable,width=64,height=48){
 const key=(x,z)=>z*width+x,sx=Math.floor(start.x),sz=Math.floor(start.z),gx=Math.floor(goal.x),gz=Math.floor(goal.z);
 if(![sx,sz,gx,gz].every(Number.isFinite)||sx<0||sz<0||gx<0||gz<0||sx>=width||gx>=width||sz>=height||gz>=height)return [];
 const first=key(sx,sz),last=key(gx,gz),queue=[first],prev=new Map([[first,null]]);
 for(let i=0;i<queue.length;i++){const at=queue[i];if(at===last)break;const x=at%width,z=Math.floor(at/width);for(const [dx,dz]of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(nx<0||nz<0||nx>=width||nz>=height||prev.has(k)||!walkable(nx+.5,nz+.5))continue;prev.set(k,at);queue.push(k);}}
 if(!prev.has(last))return [];const out=[];for(let at=last;at!==null;at=prev.get(at))out.push({x:at%width+.5,z:Math.floor(at/width)+.5});return out.reverse().slice(1);
}
