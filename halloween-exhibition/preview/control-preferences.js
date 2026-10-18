// The same thumb preference follows the player between the street and palace.
export const PAD_MODE_KEY='halloween-exhibition:pad-mode:v1';
export const PAD_MODES=Object.freeze(['slide','fixed']);
export const normalizePadMode=value=>value==='fixed'?'fixed':'slide';
function storage(provided){if(provided!==undefined)return provided;try{return globalThis.localStorage;}catch{return null;}}
export function readPadMode(provided){try{return normalizePadMode(storage(provided)?.getItem(PAD_MODE_KEY));}catch{return 'slide';}}
export function savePadMode(value,provided){const mode=normalizePadMode(value);try{const target=storage(provided);if(!target)return {ok:false,mode};target.setItem(PAD_MODE_KEY,mode);return {ok:true,mode};}catch{return {ok:false,mode};}}
