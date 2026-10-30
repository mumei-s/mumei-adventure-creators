import {drawArtSprite} from './rpg-art.js?v=20261019-unified1';
import {drawDeformedOverlord,createOverlordDeformGeometry,updateOverlordDeformGeometry} from './overlord-deform.js?v=20261030-actions1';
import {spriteTextureUV} from './monster-motion.js?v=20261019-unified1';

const TAU=Math.PI*2;
const clamp=value=>Math.max(0,Math.min(1,value));
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const BASE_LIMITATIONS=Object.freeze(['front-view-only','missing-authored-directional-walk','missing-authored-defeat']);
/** Capabilities describe authored material, not the fact that a picture can be
 * moved. Two front steps do not imply a complete directional walk set. */
export function overlordAnimationInfo(layout={}){
 const frontWalkArt=layout.frontWalkArt===true||(sequenceFrames(layout.actions?.walk)?.length||layout.walkFrames?.length||0)>1;
 const defeatArt=layout.defeatArt===true;
 const limitations=BASE_LIMITATIONS.filter(value=>value==='missing-authored-defeat'?!defeatArt:value==='missing-authored-directional-walk'?!layout.directionalWalk:value==='front-view-only'?!layout.directionalWalk:true);
 return {frontWalkArt,defeatArt,authoredPoseCount:finite(layout.authoredPoseCount,layout.frames?.length||0),animationAssetComplete:layout.animationAssetComplete===true&&layout.directionalWalk===true&&defeatArt,animationLimitations:Object.freeze(limitations)};
}
const imageSize=image=>({width:image?.naturalWidth||image?.width||0,height:image?.naturalHeight||image?.height||0});
const validIndex=(index,frames)=>Number.isInteger(index)&&index>=0&&index<frames.length;
const sequenceFrames=value=>Array.isArray(value)?value:value?.frames;

function selectSequence(layout,input,idle){
 const state=input.state||'idle';
 const authored=layout.actions?.[state];
 if(sequenceFrames(authored)?.length)return {frames:sequenceFrames(authored),stops:authored.stops,loop:authored.loop===true,duration:authored.duration,fps:authored.fps};
 if(['attack','special'].includes(state)&&layout.actionFrames?.length)return {frames:layout.actionFrames,stops:layout.actionStops,loop:false};
 if(state==='walk'&&layout.walkFrames?.length)return {frames:layout.walkFrames,loop:true};
 if(state==='idle'&&layout.idleFrames?.length)return {frames:layout.idleFrames,loop:true};
 return {frames:[idle],loop:false};
}

/** Whole painted poses use exactly the maze character sprite contract. The
 * caller supplies measured crops and foot anchors; no detached body parts are
 * assembled here. Unavailable views and actions keep the resting picture.
 */
export function sampleOverlordSprite(image,layout,input={}){
 const size=imageSize(image),frames=layout?.frames;
 if(!size.width||!size.height||!Array.isArray(frames)||!frames.length)return null;
 const idle=validIndex(layout.idleFrame,frames)?layout.idleFrame:0;
 let index=idle;
 if(input.motion===false&&input.state==='defeat'){
  const held=sequenceFrames(layout.actions?.defeat)?.filter(value=>validIndex(value,frames));
  if(held?.length)index=held.at(-1);
 }
 if(input.motion!==false){
  const selected=selectSequence(layout,input,idle),sequence=selected.frames.filter(value=>validIndex(value,frames));
  if(sequence.length){
   const explicit=Number.isFinite(input.progress)?input.progress:Number.isFinite(input.attackProgress)?input.attackProgress:input.body?.progress;
   const phase=Number.isFinite(input.phase)?((input.phase%TAU)+TAU)%TAU/TAU:null;
   const elapsed=Math.max(0,finite(input.stateElapsed,finite(input.elapsed,finite(input.time))));
   const duration=Math.max(.001,finite(layout.actions?.[input.state]?.duration,finite(layout.actionDuration,1)));
   const loopProgress=Number.isFinite(selected.duration)&&selected.duration>0?(elapsed/selected.duration)%1:((elapsed*Math.max(.01,finite(selected.fps,finite(layout.fps,5))))%sequence.length)/sequence.length;
   const progress=selected.loop?(phase??loopProgress):clamp(finite(explicit,elapsed/duration));
   const stops=selected.stops;
   let cursor=Math.min(sequence.length-1,Math.floor(progress*sequence.length));
   if(Array.isArray(stops)&&stops.length===sequence.length&&stops.every((value,i)=>Number.isFinite(value)&&value>=0&&value<=1&&(i===0||value>=stops[i-1]))){
    cursor=0;for(let i=1;i<stops.length&&progress>=stops[i];i++)cursor=i;
   }
   index=sequence[cursor];
  }
 }
 const source=frames[index],rect=source?.frame||source?.rect;
 if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite))return null;
 const referenceWidth=finite(layout.width,size.width),referenceHeight=finite(layout.height,size.height);
 if(referenceWidth<=0||referenceHeight<=0||rect[0]<0||rect[1]<0||rect[2]<=0||rect[3]<=0||rect[0]+rect[2]>referenceWidth||rect[1]+rect[3]>referenceHeight)return null;
 const sx=size.width/referenceWidth,sy=size.height/referenceHeight;
 const contentHeight=finite(source.contentHeight,finite(layout.contentHeight,rect[3]));
 if(contentHeight<=0)return null;
 return {image,state:input.state||'idle',frame:rect.map((value,i)=>value*(i%2?sy:sx)),anchorX:finite(source.anchorX,finite(layout.anchorX,.5)),anchorY:finite(source.anchorY,finite(layout.anchorY,1)),contentHeight:contentHeight*sy,
  frameIndex:index,pose:source.pose||null,authoredPose:source.pose?.authored===true,poseKind:source.pose?.kind||'standing',animated:true,...overlordAnimationInfo(layout)};
}

export function drawOverlordSprite(context,image,layout,{x=0,y=0,height=1,alpha=1,...input}={}){
 const sprite=sampleOverlordSprite(image,layout,input);
 if(!sprite)return false;
 return input.motion===false?drawArtSprite(context,sprite,x,y,height,{alpha}):drawDeformedOverlord(context,sprite,{x,y,height,alpha,...input});
}

/** One ordinary THREE.Sprite and one texture, matching the other maze actors.
 * Frame changes update UVs and measured anchors, never allocate/upload a new
 * texture. Hit recoil and world travel remain the scene director's concern.
 */
export function createOverlordSprite(THREE,{image=null,layout=null,height=3.05,scale=1}={}){
 if(!Number.isFinite(height)||height<=0||!Number.isFinite(scale)||scale<=0)throw new TypeError('Positive character dimensions are required');
 const group=new THREE.Group();group.name='Overlord S — whole-frame sprite';group.scale.setScalar(scale);
 const texture=new THREE.Texture();texture.colorSpace=THREE.SRGBColorSpace;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;
 const material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.025,depthWrite:false,depthTest:true,toneMapped:false,fog:false,color:0xffffff});
 const sprite=new THREE.Sprite(material),geometry=createOverlordDeformGeometry(THREE);sprite.geometry=geometry;sprite.name='queen-whole-frame';sprite.frustumCulled=false;sprite.visible=false;group.add(sprite);
 let disposed=false,currentImage=null,currentLayout=layout,lastInput={},currentSample=null;
 function apply(input={}){
  if(disposed)return null;
  lastInput=input;
  const sampled=sampleOverlordSprite(currentImage,currentLayout,input);
  sprite.visible=!!sampled;
  currentSample=sampled;
  if(!sampled)return null;
  const uv=spriteTextureUV(sampled),displayHeight=height*uv.heightScale;
  texture.repeat.set(uv.repeatX,uv.repeatY);texture.offset.set(uv.offsetX,uv.offsetY);
  sprite.center.set(uv.centerX,uv.centerY);sprite.scale.set(displayHeight*uv.aspect,displayHeight,1);
  updateOverlordDeformGeometry(geometry,sampled,input);
  return sampled;
 }
 function setImage(next,nextLayout){
  if(disposed||!imageSize(next).width||!imageSize(next).height)return false;
  if(nextLayout)currentLayout=nextLayout;
  if(currentImage!==next){currentImage=next;texture.image=next;texture.needsUpdate=true;}
  apply(lastInput);return true;
 }
 function setLayout(next){if(disposed)return false;currentLayout=next;apply(lastInput);return true;}
 function dispose(){if(disposed)return;disposed=true;sprite.visible=false;geometry.dispose();texture.dispose();texture.image=null;material.dispose();group.removeFromParent();currentImage=null;currentSample=null;}
 if(image)setImage(image);
 return {group,root:group,sprite,material,texture,setImage,setLayout,update:(_dt,input={})=>apply(input),setFacing:()=>{},dispose,
  get sample(){return currentSample;},get visible(){return sprite.visible;},
  metadata:{style:'whole-frame-sprite',height,continuousCloth:true,deformTriangles:60,embeddedSwords:0,billboard:true,...overlordAnimationInfo(layout)}};
}
