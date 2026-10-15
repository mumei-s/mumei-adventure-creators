/** Decorative frame colors only. Images never receive hue or saturation filters. */
export const DOOR_PALETTES = Object.freeze([
 ['#784451','#eeb582','#432738'],['#225f66','#a0ddd1','#193c4a'],
 ['#58427c','#ceb1ec','#30234d'],['#7b4924','#f0c46f','#492c20'],
 ['#365d43','#b2d69a','#233c30'],['#344b7e','#a7c6ee','#202d4c'],
 ['#7d3b64','#edabd0','#492840'],['#6c5b2b','#e9db8b','#3e3825'],
 ['#28625a','#8ddbc0','#183d3a'],['#704761','#dcb3d0','#3e2b40'],
 ['#834c3d','#efb49e','#492b29'],['#48637a','#bed7e9','#2a3d50'],
 ['#665244','#e2c8a5','#3d342f'],['#605c87','#cbc7ed','#36334d'],
 ['#6a6833','#d9dda1','#3c4025'],['#75442e','#f2bf89','#482d25']
].map(colors=>Object.freeze(colors)));
export function createDoorPalettePicker(random=Math.random){
 let bag=[],last=-1;const seen=new Map();
 function refill(){bag=DOOR_PALETTES.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[bag[i],bag[j]]=[bag[j],bag[i]];}}
 return key=>{if(!bag.length)refill();let at=bag.findIndex(i=>i!==last&&i!==seen.get(key));
 // A bag tail may contain only a prohibited color; keep it for another door.
 if(at<0){const available=DOOR_PALETTES.map((_,i)=>i).filter(i=>i!==last&&i!==seen.get(key));const selected=available[Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)))];last=selected;seen.set(key,selected);return DOOR_PALETTES[selected];}
 const [selected]=bag.splice(at,1);last=selected;seen.set(key,selected);return DOOR_PALETTES[selected];};
}
