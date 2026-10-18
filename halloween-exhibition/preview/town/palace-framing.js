/** Shared camera math stays independent of the optional 3D renderer. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};

/** Gradually pull back at the palace so all spires stay visible in either orientation. */
export function townPalaceFraming(position,map,elevation,width,height){
  const palace=map?.buildings?.find(item=>item.kind==='castle');if(!palace)return {influence:0};
  const cx=palace.x+palace.w/2,south=palace.z+palace.h;
  const approach=smooth((south+15-position.z)/8),side=smooth((palace.w/2+8-Math.abs(position.x-cx))/5),influence=approach*side;
  if(!influence)return {influence:0};
  const top=(position.z-(palace.z+1.25))*Math.sin(elevation)+14.2*Math.cos(elevation),bottom=-1.6;
  const verticalSpan=Math.max(16.5,top-bottom+3),horizontalSpan=palace.w+3.8;
  const pixelsPerTile=Math.min(width/horizontalSpan,height/verticalSpan),projectedCenter=(top+bottom)*.5;
  // Raising the target (without rotating it) preserves the compass and ground picking.
  return {influence,pixelsPerTile,targetX:cx,targetZ:position.z-2.1,targetY:(projectedCenter-2.1*Math.sin(elevation))/Math.cos(elevation)};
}
