export const DEFAULT_LIGHTING={brightness:1.2,lantern:true};
export function normalizeLighting(value){const p=value&&typeof value==='object'&&!Array.isArray(value)?value:{};return {brightness:Number.isFinite(p.brightness)?Math.max(.75,Math.min(1.75,p.brightness)):DEFAULT_LIGHTING.brightness,lantern:typeof p.lantern==='boolean'?p.lantern:DEFAULT_LIGHTING.lantern};}
// Shared brightness is a comfort adjustment, not a replacement for local light.
export const NIGHT_LIGHTING=Object.freeze({ambient:.13,moon:.10,exposure:1.02,beam:95,nearLight:8,fog:.038});

export function palace2DLighting(brightness=1.2){
 const level=Number.isFinite(brightness)?Math.max(.75,Math.min(1.75,brightness)):1.2;
 return {darkness:Math.max(.56,Math.min(.82,.76-(level-1)*.2)),candlePower:.22,moonPower:.12};
}
