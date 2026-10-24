// User-facing views describe the camera, not the renderer implementation.
const common=[
 {id:'eye',label:'目線',view:'3d',distance:'normal'},
 {id:'overhead',label:'見下ろし',view:'2d',distance:'normal'},
 {id:'far',label:'遠景',view:'2d',distance:'far'},
 {id:'overhead-wide',label:'見下ろし（引き）',view:'2d',distance:'wide',detail:true},
];
const details={
 town:[{id:'angled',label:'立体の俯瞰',view:'3d',distance:'wide',detail:true},{id:'angled-far',label:'立体の俯瞰（遠景）',view:'3d',distance:'far',detail:true}],
 maze:[{id:'behind',label:'背後',view:'3d',distance:'wide',detail:true},{id:'behind-far',label:'背後（遠景）',view:'3d',distance:'far',detail:true}],
};
export function viewpointOptions(page){return [...common,...(details[page]||[])].map(value=>({...value}));}
export function resolveViewpoint(page,id){return viewpointOptions(page).find(value=>value.id===id)||{...common[0]};}
export function migrateViewpoint(page,{view='3d',distance='normal'}={}){
 return viewpointOptions(page).find(value=>value.view===(view==='2d'?'2d':'3d')&&value.distance===distance)||resolveViewpoint(page,view==='2d'?'overhead':'eye');
}
const key=page=>'halloween-exhibition:viewpoint:'+page+':v1';
function getStorage(provided){if(provided!==undefined)return provided;try{return globalThis.localStorage;}catch{return null;}}
export function readViewpoint(page,legacy={},provided){
 try{const id=getStorage(provided)?.getItem(key(page));if(viewpointOptions(page).some(value=>value.id===id))return resolveViewpoint(page,id);}catch{}
 return migrateViewpoint(page,legacy);
}
export function saveViewpoint(page,id,provided){const value=resolveViewpoint(page,id);try{getStorage(provided)?.setItem(key(page),value.id);}catch{}return value;}
