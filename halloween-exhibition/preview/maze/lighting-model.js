export const DEFAULT_LIGHTING={brightness:1.2,lantern:true};
export function normalizeLighting(value){const p=value&&typeof value==='object'&&!Array.isArray(value)?value:{};return {brightness:Number.isFinite(p.brightness)?Math.max(.75,Math.min(1.75,p.brightness)):DEFAULT_LIGHTING.brightness,lantern:typeof p.lantern==='boolean'?p.lantern:DEFAULT_LIGHTING.lantern};}
