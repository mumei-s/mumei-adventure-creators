const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Scene-only lighting. 75 is neutral; controls and minimap are never shaded. */
export function townLighting(mapId,brightness=75,{interior2D=false}={}){
 const level=clamp(Number.isFinite(brightness)?brightness:75,0,100),night=mapId==='library'||interior2D,adjust=(level-75)/75;
 return night?{night,level,ambient:.2+adjust*.12,sun:.12+adjust*.07,shade:.78-adjust*.1,lanternPower:7.5,lanternRange:4.8,lanternRadius:145,windowGlow:.07}
 :{night,level,ambient:1.5+level*.014,sun:2.3+level/100,shade:clamp(.23-(level/100-.75)*.3,.035,.38),lanternPower:1.4,lanternRange:4,lanternRadius:155,windowGlow:.4};
}
export function townLanternPosition(position,facing='down',ahead=.55){
 const direction={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[facing]||[0,1];
 return {x:position.x+direction[0]*ahead,z:position.z+direction[1]*ahead};
}
