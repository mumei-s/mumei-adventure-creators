import {createOverlordMaterialSource,loadOverlordImage,getOverlordIdentityImage} from './overlord-materials.js?v=20261030-art1';
import {composeOverlordIdentityArt} from './overlord-battle-2d.js?v=20261030-quality1';
import {OVERLORD_CHARACTER_PREVIEW} from './overlord-character-preview.js';

export const OVERLORD_CHARACTER_URL=new URL('./assets/overlord/queen-original-art-v1.webp',import.meta.url).href;
const fullSource=createOverlordMaterialSource({url:OVERLORD_CHARACTER_URL});
const faceSource={load:getOverlordIdentityImage};
const states=['idle','seated','stand','walk','attack','special','hit','defeat'];
const faces=new WeakMap();

/** The same original-art sprite as the other characters. The embedded preview
 * remains visible if a network request fails; full art upgrades it in place. */
export function createOverlordCharacter(THREE,{scale=1,height=3.05,image,
 loadImage=loadOverlordImage,artSource=fullSource,identitySource=faceSource}={}){
 const group=new THREE.Group();group.name='Overlord S — original artwork';group.scale.setScalar(scale);
 const material=new THREE.SpriteMaterial({color:0xffffff,transparent:true,alphaTest:.025,depthWrite:false,depthTest:true,toneMapped:false,fog:false});
 const sprite=new THREE.Sprite(material);sprite.name='original-art-queen';sprite.center.set(.5,0);sprite.scale.set(height*2/3,height,1);sprite.frustumCulled=false;sprite.visible=false;group.add(sprite);
 let texture=null,currentImage=null,currentBase=null,fullInstalled=false,dead=false,state='idle',elapsed=0,readyDone=false,resolveReady,failed=0;
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 const finishReady=value=>{if(!readyDone){readyDone=true;resolveReady(value);}};
 function install(next,{preview=false}={}){
  if(dead||!next||!(next.width||next.naturalWidth)||!(next.height||next.naturalHeight)||(preview&&fullInstalled))return false;
  if(next===currentImage)return true;
  if(!preview)fullInstalled=true;
  const previous=texture;texture=new THREE.Texture(next);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  currentImage=next;material.map=texture;material.needsUpdate=true;sprite.visible=true;
  sprite.scale.set(height*(next.width||next.naturalWidth)/(next.height||next.naturalHeight),height,1);previous?.dispose();finishReady(true);return true;
 }
 function setImage(next){
  const base=next?.image||next;
  if(base===currentBase&&fullInstalled)return true;
  if(!install(faces.get(base)||base))return false;
  currentBase=base;
  void identitySource.load().then(reference=>{
   if(dead||currentBase!==base)return;
   let composed=faces.get(base);if(!composed){composed=composeOverlordIdentityArt(base,reference);faces.set(base,composed);}install(composed);
  }).catch(()=>{/* Keep the approved full artwork; never hide a loaded character. */});
  return true;
 }
 const failure=()=>{if(++failed===2)finishReady(false);return false;};
 if(image){setImage(image);}
 else{
  void loadImage(OVERLORD_CHARACTER_PREVIEW).then(preview=>install(preview,{preview:true})).catch(failure);
  void artSource.load().then(setImage).catch(failure);
 }
 function setState(next){if(!states.includes(next))throw Error('Unknown Overlord state: '+next);if(next!==state){state=next;elapsed=0;}}
 function update(dt,input={}){
  if(dead)return;dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;if(input.state)setState(input.state);
  elapsed=Number.isFinite(input.stateElapsed)?Math.max(0,input.stateElapsed):elapsed+dt;
  const motion=input.motion!==false,time=Number.isFinite(input.time)?input.time:elapsed,p=Math.max(0,Math.min(1,input.attackProgress??elapsed)),strike=motion&&['attack','special','hit'].includes(state)?Math.sin(p*Math.PI):0;
  // Move the whole painting by a few pixels; its face, hair and proportions
  // are never warped by a skeleton, lighting or camera angle.
  sprite.position.set(state==='hit'?strike*.025:0,motion&&state!=='defeat'?Math.sin(time*1.4)*.004:0,0);
  material.rotation=motion&&state==='special'?strike*.015:0;
  return {state,elapsed};
 }
 function dispose(){if(dead)return;dead=true;finishReady(false);group.removeFromParent();texture?.dispose();material.dispose();}
 return {group,root:group,sprite,materials:{art:material},swords:[],ready,update,setState,setImage,dispose,
  metadata:{style:'original-art',height,standDuration:1.1,states:[...states],embeddedSwords:5}};
}
