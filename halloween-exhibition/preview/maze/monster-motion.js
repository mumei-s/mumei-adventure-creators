import {locomotionPhase} from './movement-runtime.js?v=20261017-review1';
/** Shared atlas sampling: identical actual body-pose frames in 2D, 3D and battle. */
export const MONSTER_IDS=Object.freeze(['pumpkin','ghost','bat','zombie','vampire','franken','witch','masked_wanderer','werewolf','mummy']);
export function validMonsterLayout(value){
  if(!value||value.runtimeReady!==true||!Number.isInteger(value.width)||!Number.isInteger(value.height)||value.width>512||value.height>512||value.width<1||value.height<1||!Array.isArray(value.frames)||value.frames.length!==4)return false;
  if(!['left','right'].includes(value.faces)||!Number.isFinite(value.fps)||value.fps<=0||value.fps>12||!Number.isInteger(value.idleFrame)||value.idleFrame<0||value.idleFrame>3||!Array.isArray(value.walkFrames)||value.walkFrames.length!==4||new Set(value.walkFrames).size!==4||!value.walkFrames.every(n=>Number.isInteger(n)&&n>=0&&n<4))return false;
  if(typeof value.src!=='string'||!/^\.\/assets\/rpg\/animated\/[a-z_]+-walk\.webp$/.test(value.src))return false;
  return value.frames.every(f=>Array.isArray(f.frame)&&f.frame.length===4&&f.frame.every(Number.isFinite)&&f.frame[0]>=0&&f.frame[1]>=0&&f.frame[2]>0&&f.frame[3]>0&&f.frame[0]+f.frame[2]<=value.width&&f.frame[1]+f.frame[3]<=value.height&&Number.isFinite(f.anchorX)&&f.anchorX>=0&&f.anchorX<=1&&Number.isFinite(f.anchorY)&&f.anchorY>=0&&f.anchorY<=1&&Number.isFinite(f.contentHeight)&&f.contentHeight>0&&f.contentHeight<=value.height);
}
export function motionSprite(image,layout,{time=0,motion=true,walking=false,facing='right',battle=false,phase,distance,strideLength=.42,turning=false}={}){
  if(!image||!layout)return null;
  const moving=motion&&(walking||battle||layout.idleAnimated===true),frames=layout.walkFrames||[0,1,2,3];
  const speed=battle?Math.min(layout.fps||5,3):layout.fps||5;
  const gait=Number.isFinite(distance)?locomotionPhase(distance,strideLength):Number.isFinite(phase)?((phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2):null;
  const cursor=walking&&!battle&&gait!==null?Math.floor(gait/(Math.PI*2)*frames.length):Math.floor(Math.max(0,Number.isFinite(time)?time:0)*speed)%frames.length;
  const index=moving?frames[cursor]:layout.idleFrame||0;
  const frame=layout.frames[index]||layout.frames[0],flip=(facing==='left')!==(layout.faces==='left');
  return{image,...frame,contentHeight:layout.referenceHeightPixels||frame.contentHeight,frameIndex:index,flip,animated:true,turning,animationAssetComplete:false,animationLimitations:['four-walk-poses','missing-authored-turn','missing-authored-attack']};
}
export function monsterSprite(art,id,options={}){
  const layout=art.monsterLayouts?.[id],patrol=options.patrol;
  // Authored patrols cruise at .2 tile/second. Keep the existing 5–6 pose/sec
  // cadence at that speed, but advance the gait only by actual path distance.
  // Time spent slowing down, stopped or turning cannot add walking steps.
  if(patrol)options={...options,walking:patrol.walking,facing:patrol.facing,turning:patrol.turning,phase:patrol.phase,distance:patrol.distance,strideLength:.2*(layout?.walkFrames?.length||4)/(layout?.fps||5)};
  const articulated=options.battle?art.rigs?.battle('monster:'+id+':battle',{...options,effect:options.effect}):art.rigs?.get('monster:'+id);
  if(articulated)return articulated;
  const sprite=art.images[id];
  return layout&&sprite?motionSprite(sprite.image||sprite,layout,options):sprite||null;
}
/** Texture transform uses native atlas dimensions and preserves mirrored anchors. */
export function spriteTextureUV(sprite){
  const im=sprite.image||sprite,[x,y,w,h]=sprite.frame||[0,0,im.width,im.height],flip=!!sprite.flip;
  return{repeatX:(flip?-w:w)/im.width,repeatY:h/im.height,offsetX:(x+(flip?w:0))/im.width,offsetY:1-(y+h)/im.height,centerX:flip?1-(sprite.anchorX??.5):sprite.anchorX??.5,centerY:1-(sprite.anchorY??1),aspect:w/h,heightScale:h/(sprite.contentHeight||h)};
}
