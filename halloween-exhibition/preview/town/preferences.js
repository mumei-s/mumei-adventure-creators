import {TOWN_SAVE_KEY} from './save-model.js?v=20261017-town1';
export const TOWN_UI_KEY=TOWN_SAVE_KEY+':ui';
export const TOWN_LAYOUTS=Object.freeze(['auto','phone','tablet','desktop']);
export const TOWN_SPEEDS=Object.freeze([.75,1,1.25,1.5]);
export function normalizeTownPreferences(value){return {brightness:typeof value?.brightness==='number'&&Number.isFinite(value.brightness)?Math.max(0,Math.min(100,Math.round(value.brightness))):75,lantern:value?.lantern!==false,motion:value?.motion!==false,layout:TOWN_LAYOUTS.includes(value?.layout)?value.layout:'auto',speed:TOWN_SPEEDS.includes(value?.speed)?value.speed:1};}
function storage(provided){if(provided!==undefined)return provided;try{return globalThis.localStorage;}catch{return null;}}
export function readTownPreferences(provided){try{const source=storage(provided);return {preferences:normalizeTownPreferences(JSON.parse(source?.getItem(TOWN_UI_KEY)||'null')),saved:!!source};}catch{return {preferences:normalizeTownPreferences(null),saved:false};}}
export function saveTownPreferences(value,provided){const preferences=normalizeTownPreferences(value);try{const target=storage(provided);if(!target)throw Error('Storage unavailable');target.setItem(TOWN_UI_KEY,JSON.stringify(preferences));return {ok:true,preferences};}catch{return {ok:false,preferences};}}
export function resolveTownLayout(mode,width){if(TOWN_LAYOUTS.includes(mode)&&mode!=='auto')return mode;return width<=680?'phone':width<=1100?'tablet':'desktop';}
