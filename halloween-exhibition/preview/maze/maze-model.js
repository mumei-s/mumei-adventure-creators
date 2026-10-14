export const CELL=4;
const grid=Array.from({length:17},()=>Array(17).fill('#'));
function room(x1,z1,x2,z2){for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++)grid[z][x]='.';}
room(5,7,11,14);room(5,1,11,5);room(7,5,9,7);room(1,8,3,12);room(13,8,15,12);room(3,10,5,10);room(11,10,13,10);
export const MAP=grid.map(r=>r.join(''));
export const FEATURES={spawn:{x:8,z:12},key:{x:14,z:10},gate:{x:8,z:6},article:{x:9,z:8},horrorDoor:{x:4,z:10},normalDoor:{x:12,z:10},horrorArt:{x:2,z:9},vault:{x:8,z:3}};
export const toWorld=p=>({x:p.x*CELL,z:p.z*CELL});
export function collectionAt(x,z){return 'horror';}
export function blocked(x,z,{unlocked=false,horrorAccepted=false}={}){const tx=Math.floor((x+CELL/2)/CELL),tz=Math.floor((z+CELL/2)/CELL);if(MAP[tz]?.[tx]!=='.')return true;if(!unlocked&&tz===6&&tx>=7&&tx<=9)return true;if(!horrorAccepted&&tx===4&&tz===10)return true;return false;}
export function move(state,dx,dz){const next={...state},radius=.45;const okay=(x,z)=>[-radius,radius].every(a=>[-radius,radius].every(b=>!blocked(x+a,z+b,state)));if(okay(next.x+dx,next.z))next.x+=dx;if(okay(next.x,next.z+dz))next.z+=dz;return next;}
export function distance(state,feature){const p=toWorld(feature);return Math.hypot(state.x-p.x,state.z-p.z);}
export function nearby(state){if(distance(state,FEATURES.horrorDoor)<5&&!state.horrorAccepted)return 'horror';if(distance(state,FEATURES.key)<4&&!state.hasKey)return 'key';if(distance(state,FEATURES.gate)<6&&!state.unlocked)return 'gate';if(distance(state,FEATURES.article)<5)return 'article';if(distance(state,FEATURES.horrorArt)<5)return 'horror-art';if(distance(state,FEATURES.vault)<5)return 'vault';return null;}
export function initialState(){return {...toWorld(FEATURES.spawn),yaw:0,pitch:0,hasKey:false,unlocked:false,horrorAccepted:false};}
