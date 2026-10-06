import {visualSpec} from './visual-specs.js?v=11';
import {poseItems} from './poses.js?v=11';
import {dailySamples} from './collection.js?v=11';
import {individualSamples} from './sample-catalog.js?v=11';
import {colorWorlds,luminousMedia} from './worlds.js?v=11';
// Each field owns one semantic role. A word such as "墨" in a story must not change the medium.
// file is used only to show a picker preview; it must never become a generation reference.
export function recipeFor(key,value){
 const spec=visualSpec(key,value);
 const pose=key==='pose'?poseItems.find(p=>p.value===value):null;
 const world=(key==='palette'?colorWorlds:key==='medium'?luminousMedia:[]).find(x=>x.value===value);
 const sample=dailySamples[key+'\u0000'+value]||individualSamples[key+'\u0000'+value];
 return {key,value,file:pose?.file||world?.file||sample?.file||null,referenceRole:'ui-only',text:spec.text,checks:spec.checks};
}
export const sampleKeys=['medium','design','theme','costume','mood','place','palette','pose'];
export function selectedRecipes(values){return sampleKeys.map(key=>recipeFor(key,values[key]));}
