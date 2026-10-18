const MAX_NAMES=32,EDGE=8,LABEL_HEIGHT=18;
const finitePoint=point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.z);
const labelText=value=>{const name=String(value||'').split(/[｜|]/,1)[0].trim(),letters=Array.from(name);return letters.length>22?letters.slice(0,21).join('')+'…':name;};
const approximateWidth=text=>Array.from(text).reduce((width,letter)=>width+(/[\x00-\x7f]/.test(letter)?6:11),12);
function registryHome(homes,id){return Array.isArray(homes)?homes.find(home=>home.creatorId===id):homes instanceof Map?homes.get(id):homes?.[id];}
// Grid traversal hides people behind actual walls, while water and bridges remain
// transparent. Diagonal wall corners do not reveal a label through stone.
function visiblePerson(map,from,to){
 if(!map?.tiles||!finitePoint(from)||!finitePoint(to))return !map?.tiles;
 let x=Math.floor(from.x),z=Math.floor(from.z);const endX=Math.floor(to.x),endZ=Math.floor(to.z),dx=to.x-from.x,dz=to.z-from.z,sx=Math.sign(dx),sz=Math.sign(dz);
 const solid=(xx,zz)=>{const tile=map.tiles[zz]?.[xx];return tile===undefined||tile==='#'||tile==='b';};
 let tx=dx?((sx>0?x+1:x)-from.x)/dx:Infinity,tz=dz?((sz>0?z+1:z)-from.z)/dz:Infinity;
 const stepx=dx?1/Math.abs(dx):Infinity,stepz=dz?1/Math.abs(dz):Infinity;
 for(let steps=0;steps<512&&(x!==endX||z!==endZ);steps++){
  if(Math.abs(tx-tz)<1e-9){if(solid(x+sx,z)||solid(x,z+sz))return false;x+=sx;z+=sz;tx+=stepx;tz+=stepz;}
  else if(tx<tz){x+=sx;tx+=stepx;}else{z+=sz;tz+=stepz;}
  if(solid(x,z))return false;
 }
 return x===endX&&z===endZ;
}
function nameCandidates({map,state,actors=[],homes=[]}){
 const result=[],from=state?.position,seenCreators=new Set(),seenGroups=new Set(),distance=point=>finitePoint(from)?Math.hypot(point.x-from.x,point.z-from.z):0;
 for(const actor of [...actors].filter(finitePoint).sort((a,b)=>distance(a)-distance(b))){
  if(actor.interactive===false||actor.id==='owner-black-cat'||actor.name==='黒猫'||actor.mapId&&actor.mapId!==map.id)continue;
  const creatorId=actor.creatorId,groupId=actor.groupId;
  if(creatorId&&seenCreators.has(creatorId)||groupId&&seenGroups.has(groupId))continue;
  const text=labelText(registryHome(homes,creatorId)?.creatorName||actor.name||actor.label||actor.characterName);
  if(!text||!visiblePerson(map,from,actor))continue;
  if(creatorId)seenCreators.add(creatorId);if(groupId)seenGroups.add(groupId);
  result.push({id:'actor:'+(creatorId||groupId||actor.id),kind:'person',text,x:actor.x,z:actor.z,distance:distance(actor)});
 }
 for(const npc of map.npcs||[]){
  if(!finitePoint(npc)||npc.interactive===false||npc.appearance==='cat'||npc.name==='黒猫'||!visiblePerson(map,from,npc))continue;
  const text=labelText(npc.name);if(text)result.push({id:'npc:'+npc.id,kind:'person',text,x:npc.x,z:npc.z,distance:distance(npc)});
 }
 for(const building of map.buildings||[]){
  if(building.kind!=='creator-home'||!finitePoint(building.door))continue;
  const home=registryHome(homes,building.creatorId)||building,name=labelText(home.creatorName||building.creatorName);
  if(name){const point={x:building.door.x,z:building.door.z+.2};result.push({id:'home:'+(building.creatorId||building.id),kind:'home',text:name+'の家',...point,distance:distance(point)});}
 }
 return result.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
}
function layoutName(point,text,width,height,placed){
 const maxWidth=Math.max(1,Math.min(176,width-EDGE*2)),labelWidth=Math.min(maxWidth,approximateWidth(text));
 const x=Math.max(EDGE+labelWidth/2,Math.min(width-EDGE-labelWidth/2,point.x)),baseY=point.y+10;
 let best=null,bestScore=Infinity;
 for(const offset of [0,-20,20,-40,40]){
  const y=Math.max(EDGE,Math.min(height-EDGE-LABEL_HEIGHT,baseY+offset)),box={left:x-labelWidth/2,right:x+labelWidth/2,top:y,bottom:y+LABEL_HEIGHT};
  const score=placed.reduce((sum,other)=>sum+Math.max(0,Math.min(box.right,other.right)-Math.max(box.left,other.left))*Math.max(0,Math.min(box.bottom+3,other.bottom+3)-Math.max(box.top,other.top)),0);
  if(score<bestScore){best={x,y,maxWidth,...box};bestScore=score;if(!score)break;}
 }
 return best;
}
export function createSceneNameOverlay(container){
 const document=container.ownerDocument,overlay=document.createElement('div'),labels=new Map();let destroyed=false;
 overlay.className='scene-names';overlay.setAttribute('aria-hidden','true');container.append(overlay);
 const clear=()=>{for(const entry of labels.values())if(!entry.node.hidden)entry.node.hidden=true;};
 function update({map,state,actors=[],homes=[],project}={}){
  if(destroyed)return;
  const bounds=container.getBoundingClientRect(),width=bounds.width,height=bounds.height;
  if(!map||typeof project!=='function'||width<=EDGE*2||height<=EDGE*2+LABEL_HEIGHT){clear();return;}
  const shown=new Set(),placed=[];
  for(const candidate of nameCandidates({map,state,actors,homes})){
   if(shown.size>=MAX_NAMES)break;
   const point=project({x:candidate.x,z:candidate.z});
   if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.visible===false||point.x<0||point.x>width||point.y<0||point.y>height)continue;
   const position=layoutName(point,candidate.text,width,height,placed);if(!position)continue;
   let entry=labels.get(candidate.id);
   if(!entry){
    if(labels.size>=MAX_NAMES){const unused=[...labels].find(([id])=>!shown.has(id));if(unused){unused[1].node.remove();labels.delete(unused[0]);}}
    const node=document.createElement('span');node.className='scene-name scene-name-'+candidate.kind;overlay.append(node);entry={node,signature:''};labels.set(candidate.id,entry);
   }
   const signature=[candidate.text,Math.round(position.x),Math.round(position.y),position.maxWidth].join('|');
   if(entry.signature!==signature){
    if(entry.node.textContent!==candidate.text)entry.node.textContent=candidate.text;
    for(const [name,value]of [['left',Math.round(position.x)+'px'],['top',Math.round(position.y)+'px'],['maxWidth',position.maxWidth+'px']])if(entry.node.style[name]!==value)entry.node.style[name]=value;
    entry.signature=signature;
   }
   if(entry.node.hidden)entry.node.hidden=false;
   shown.add(candidate.id);placed.push(position);
  }
  for(const [id,entry]of labels)if(!shown.has(id)&&!entry.node.hidden)entry.node.hidden=true;
 }
 return {update,clear,destroy(){if(destroyed)return;destroyed=true;labels.clear();overlay.remove();}};
}
