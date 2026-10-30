import {overlordArtSource,OVERLORD_ART_ATLAS_URL} from './overlord-art-source.js?v=20261030-sprite1';
import {createOverlordSprite} from './overlord-sprite.js?v=20261030-sprite1';
import {OVERLORD_SPRITE_LAYOUT,OVERLORD_SPRITE_BOUNDS} from './overlord-sprite-layout.js?v=20261030-sprite1';

export const OVERLORD_CHARACTER_URL=OVERLORD_ART_ATLAS_URL;
const states=['idle','seated','stand','walk','attack','special','hit','defeat'];

/** The same whole-frame Sprite representation used by the other maze actors.
 * Three authored drawings supply the cast; missing walk/back/death artwork is
 * kept explicit rather than manufactured from detached body parts. */
export function createOverlordCharacter(THREE,{scale=1,height=3.05,atlas,atlasSource=overlordArtSource,layout=OVERLORD_SPRITE_LAYOUT}={}){
 const rig=createOverlordSprite(THREE,{height,image:atlas,layout});
 const group=rig.group;group.name='Overlord S — whole-frame artwork';group.scale.setScalar(scale);group.visible=false;
 let dead=false,state='idle',elapsed=0,readyDone=false,resolveReady;
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 const finish=value=>{if(!readyDone){readyDone=true;resolveReady(value);}};
 function setAtlas(image){if(dead||!rig.setImage(image))return false;group.visible=rig.visible;if(group.visible)finish(true);return group.visible;}
 const unsubscribe=atlas?()=>{}:atlasSource.subscribe(setAtlas);
 if(atlas)setAtlas(atlas);else void atlasSource.start().then(image=>{if(!dead){if(image)setAtlas(image);else finish(false);}});
 function setState(next){if(!states.includes(next))throw Error('Unknown Overlord state: '+next);if(next!==state){state=next;elapsed=0;}}
 function update(dt,input={}){
  if(dead)return;dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;if(input.state)setState(input.state);
  elapsed=Number.isFinite(input.stateElapsed)?Math.max(0,input.stateElapsed):elapsed+dt;
  return rig.update(dt,{...input,state,elapsed,time:input.time??elapsed});
 }
 function dispose(){if(dead)return;dead=true;group.visible=false;finish(false);unsubscribe();rig.dispose();group.removeFromParent();}
 return {group,root:group,rig,sprite:rig.sprite,parts:new Map(),ready,update,setState,setAtlas,
  // Roster portraits use a different crop layout and cannot replace this sheet.
  setImage:()=>false,setFacing:rig.setFacing,dispose,swords:[],
  metadata:{...rig.metadata,style:'whole-frame-sprite',height,bounds:OVERLORD_SPRITE_BOUNDS,standDuration:1.27,states:[...states],authoredPoseCount:3,embeddedSwords:0,billboard:true}};
}
