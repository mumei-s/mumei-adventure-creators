// Labels may improve while saved values and illustration assets keep their
// identity. Only known catalogue values migrate; custom copy is never edited.
export const legacySelectionLabels=Object.freeze({
 theme:Object.freeze({'雨上がりの怪談':'雨上がりのホラー'}),
 mood:Object.freeze({'ひやりとする怪談':'ひやりとするホラー'})
});
export function canonicalSelectionLabel(key,value){
 const aliases=legacySelectionLabels[key];
 return aliases&&Object.hasOwn(aliases,value)?aliases[value]:value;
}
export function normalizeSelectionLabels(values={}){
 let normalized=values;
 for(const key of Object.keys(legacySelectionLabels)){
  const value=canonicalSelectionLabel(key,values[key]);
  if(value!==values[key]){
   if(normalized===values)normalized={...values};
   normalized[key]=value;
  }
 }
 return normalized;
}
export function preserveLegacyAssetKeys(table,{key=null,separator='\u0000'}={}){
 for(const [selectionKey,aliases] of Object.entries(legacySelectionLabels)){
  if(key&&key!==selectionKey)continue;
  for(const [legacy,current] of Object.entries(aliases)){
   const prefix=key?'':selectionKey+separator;
   if(Object.hasOwn(table,prefix+current)&&!Object.hasOwn(table,prefix+legacy))Object.defineProperty(table,prefix+legacy,{value:table[prefix+current],writable:true,configurable:true,enumerable:false});
  }
 }
 return table;
}
