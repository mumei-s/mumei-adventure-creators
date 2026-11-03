import {selectionAvailableInCollection} from './scene-collection-policy.js';
export const FAVORITE_LIMIT=5;
export const FAVORITE_STORAGE='halloween-option-favorites-v1';
export function favoriteKey(collection,key){return collection+':'+key;}
export function normalizeFavorites(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 return Object.fromEntries(Object.entries(input).filter(([key,values])=>/^(halloween|everyday):[a-z]+$/.test(key)&&Array.isArray(values)).map(([key,values])=>[key,[...new Set(values.filter(v=>typeof v==='string'&&v.length>0&&v.length<300))].slice(0,FAVORITE_LIMIT)]));
}
export function toggleFavorite(values,value){
 const clean=[...new Set(values)].slice(0,FAVORITE_LIMIT);
 if(clean.includes(value))return {values:clean.filter(v=>v!==value),changed:true,added:false};
 if(clean.length===FAVORITE_LIMIT)return {values:clean,changed:false,added:false};
 return {values:[...clean,value],changed:true,added:true};
}

// Hide retired seasonal choices in everyday without deleting stored favorites.
export function collectionFavorites(favorites,collection,key){
 const own=(favorites[favoriteKey(collection,key)]||[]).filter(value=>selectionAvailableInCollection(key,value,collection));
 const legacy=collection==='halloween'?(favorites[favoriteKey('everyday',key)]||[]).filter(value=>!selectionAvailableInCollection(key,value,'everyday')):[];
 return [...new Set([...own,...legacy])];
}
// A legacy everyday seasonal favorite is shown/manageable in Halloween while
// retaining its original storage key. No destructive startup migration or cap
// truncation is needed when both editions already have five saved choices.
export function favoriteStorageKeys(favorites,collection,key,value){
 const keys=[favoriteKey(collection,key)];
 if(collection==='halloween'&&!selectionAvailableInCollection(key,value,'everyday'))keys.push(favoriteKey('everyday',key));
 return keys.filter(key=>(favorites[key]||[]).includes(value));
}
