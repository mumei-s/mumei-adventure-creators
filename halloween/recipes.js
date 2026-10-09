import {optionRecipe} from './option-recipes.js?v=28.4.4';
import {poseItems} from './poses.js?v=28.4.4';
import {dailySamples} from './collection.js?v=28.4.4';
import {individualSamples} from './sample-catalog.js?v=28.4.4';
import {colorWorlds,luminousMedia} from './worlds.js?v=28.4.4';
import {sceneIsUnified} from './scene-presets.js?v=28.4.4';
import {angleItems} from './angles.js?v=28.4.4';
// Each field owns one semantic role. A word such as "墨" in a story must not change the medium.
// file is used only to show a picker preview; it must never become a generation reference.
export function recipeFor(key,value,context={}){
 const spec=optionRecipe(key,value,context);
 const pose=key==='pose'?poseItems.find(p=>p.value===value):null;
 const angle=key==='angle'?angleItems.find(p=>p.value===value):null;
 const world=(key==='palette'?colorWorlds:key==='medium'?luminousMedia:[]).find(x=>x.value===value);
 const sampleKey=spec.sourceKey||key;
 const sample=dailySamples[sampleKey+'\u0000'+value]||individualSamples[sampleKey+'\u0000'+value];
 return {key,value,sourceKey:spec.sourceKey||key,file:pose?.file||angle?.file||world?.file||sample?.file||null,referenceRole:'ui-only',text:spec.sections[0].text,sections:spec.sections,checks:spec.checks};
}
export const sampleKeys=['medium','design','theme','costume','mood','place','palette','pose','angle'];
export function selectedRecipes(values){return sampleKeys.filter(key=>key==='angle'?sceneIsUnified(values):key!=='place'||!sceneIsUnified(values)).map(key=>recipeFor(key,values[key],{values}));}
