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
