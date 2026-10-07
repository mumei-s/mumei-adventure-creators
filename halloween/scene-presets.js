// A selected world, story or location is one scene. The old place key is kept
// only as an internal detail for saved records and existing drawing recipes.
const placeTitles=new Set();

export function sceneIsUnified(values={}){return values.sceneUnified===true;}
export function sceneSourcePlace(value){return placeTitles.has(value)?value:null;}
export function sceneLabel(values={}){return values.theme||'おまかせ';}

export function mergeSceneGroups(worldGroups=[],placeGroups=[]){
 for(const group of placeGroups)for(const value of group.values)placeTitles.add(value);
 const seen=new Set();
 const clone=(group,source)=>{
  const values=group.values.filter(value=>!seen.has(value)&&seen.add(value));
  return {...group,label:source==='place'?'場所から選ぶ / '+group.label:group.label,values,sceneSource:source};
 };
 // applyCollection can restore groups that were already merged once.
 return [...worldGroups.filter(group=>group.sceneSource!=='place').map(group=>clone(group,'theme')),
  ...placeGroups.map(group=>clone(group,'place'))].filter(group=>group.values.length);
}
