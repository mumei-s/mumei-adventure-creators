/** The full camera pullback envelope. At its exact boundary the influence is 0.
 * Keep this forecourt open for the protagonist and castle gate, including the
 * low-influence approach where automatic framing first starts. */
export const PALACE_FORECOURT=Object.freeze({minX:17,maxX:47,maxZ:21,centerX:32,halfWidth:15});
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function palaceForecourtInfluence(position){
 if(!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return 0;
 return smooth((PALACE_FORECOURT.maxZ-position.z)/8)*smooth((PALACE_FORECOURT.halfWidth-Math.abs(position.x-PALACE_FORECOURT.centerX))/5);
}
export function isInPalaceForecourt(position,margin=0){
 return Number.isFinite(position?.x)&&Number.isFinite(position?.z)&&position.x>PALACE_FORECOURT.minX-margin&&position.x<PALACE_FORECOURT.maxX+margin&&position.z<PALACE_FORECOURT.maxZ+margin;
}
export function intersectsPalaceForecourt(rect,margin=0){
 return Number.isFinite(rect?.x)&&Number.isFinite(rect?.z)&&Number.isFinite(rect?.w)&&Number.isFinite(rect?.h)&&rect.w>0&&rect.h>0&&rect.x<PALACE_FORECOURT.maxX+margin&&rect.x+rect.w>PALACE_FORECOURT.minX-margin&&rect.z<PALACE_FORECOURT.maxZ+margin;
}
