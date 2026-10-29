export const CELL=4;
const grid=Array.from({length:17},()=>Array(29).fill('#'));
function room(x1,z1,x2,z2){for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++)grid[z][x]='.';}
room(5,7,11,14);room(5,1,11,5);room(7,5,9,7);room(1,8,3,12);room(13,8,15,12);room(3,10,5,10);room(11,10,13,10);
// The astral passage links the archive to a single authored 666th-floor chamber.
room(12,3,18,3);room(19,1,27,11);
export const OVERLORD_ROOM=Object.freeze({id:'nameless-overlord-castle',name:'第666階層 · 無名の覇王城',bounds:{minX:18.5,maxX:27.5,minZ:.5,maxZ:11.5},entry:{x:20,z:3},throne:{x:23,z:2.4},boss:{x:23,z:2.55},walk:[{x:23,z:4},{x:23,z:6}]});
export const OVERLORD_SOLIDS=Object.freeze([{x:23,z:2.35,hw:.6,hd:.55},...[4,7,10].flatMap(z=>[19.6,26.4].map(x=>({x,z,hw:.22,hd:.22})))]);
export const MAP=grid.map(r=>r.join(''));
export const FEATURES={spawn:{x:8,z:12},overlordDoor:{x:18,z:3},key:{x:14,z:10},gate:{x:8,z:6},article:{x:9,z:8},horrorDoor:{x:4,z:10},normalDoor:{x:12,z:10},horrorArt:{x:2,z:9},vault:{x:8,z:3}};
export const toWorld=p=>({x:p.x*CELL,z:p.z*CELL});
export function collectionAt(x,z){return 'horror';}
export function blocked(x,z,{unlocked=false,horrorAccepted=false,overlordUnlocked=false}={}){const tx=Math.floor((x+CELL/2)/CELL),tz=Math.floor((z+CELL/2)/CELL);if(MAP[tz]?.[tx]!=='.')return true;if(!overlordUnlocked&&tx===18&&tz===3)return true;if(OVERLORD_SOLIDS.some(p=>Math.abs(x/CELL-p.x)<p.hw&&Math.abs(z/CELL-p.z)<p.hd))return true;if(!unlocked&&tz===6&&tx>=7&&tx<=9)return true;if(!horrorAccepted&&tx===4&&tz===10)return true;return false;}
export function move(state,dx,dz){const next={...state},radius=.45;const okay=(x,z)=>[-radius,radius].every(a=>[-radius,radius].every(b=>!blocked(x+a,z+b,state)));if(okay(next.x+dx,next.z))next.x+=dx;if(okay(next.x,next.z+dz))next.z+=dz;return next;}
export function distance(state,feature){const p=toWorld(feature);return Math.hypot(state.x-p.x,state.z-p.z);}
export function nearby(state){if(distance(state,FEATURES.overlordDoor)<5)return 'overlord-door';if(distance(state,FEATURES.horrorDoor)<5&&!state.horrorAccepted)return 'horror';if(distance(state,FEATURES.key)<4&&!state.hasKey)return 'key';if(distance(state,FEATURES.gate)<6&&!state.unlocked)return 'gate';if(distance(state,FEATURES.article)<5)return 'article';if(distance(state,FEATURES.horrorArt)<5)return 'horror-art';if(distance(state,FEATURES.vault)<5)return 'vault';return null;}
export function initialState(){return {...toWorld(FEATURES.spawn),yaw:0,pitch:0,hasKey:false,unlocked:false,horrorAccepted:false,overlordUnlocked:false};}
export function visibleArticles(items,collection='horror'){return items.map((item,index)=>({item,index})).filter(({item})=>item.collection===collection&&item.visible!==false).sort((a,b)=>(Number.isFinite(a.item.order)?a.item.order:a.index)-(Number.isFinite(b.item.order)?b.item.order:b.index)||a.index-b.index).map(({item})=>item);}
