/** Match the screen's pixels while bounding the backing buffer. This changes
 * rendering resolution only; source images, game scale and movement are kept. */
export function renderPixelRatio(width,height,deviceRatio=1,{maxPixels}={}){
 const valid=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
 const w=valid(width,1),h=valid(height,1),requested=Math.min(3,valid(deviceRatio,1));
 const budget=valid(maxPixels,w<=640?2400000:w<=1100?3600000:6000000);
 // Never reduce a native 1x screen below its original backing resolution.
 return Math.min(requested,Math.max(1,Math.sqrt(budget/(w*h))));
}
