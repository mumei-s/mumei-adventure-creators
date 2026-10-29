import {overlordArtSource,OVERLORD_ART_ATLAS_URL} from './overlord-art-source.js?v=20261030-body1';
import {createOverlordArtRig} from './overlord-art-rig.js?v=20261030-body1';

export const OVERLORD_CHARACTER_URL=OVERLORD_ART_ATLAS_URL;
const states=['idle','seated','stand','walk','attack','special','hit','defeat'];

/** Articulated game actor. The face is a rigid head layer; shoulders, elbows,
 * hips, knees and ankles receive separate poses on the common action clock. */
export function createOverlordCharacter(THREE,{scale=1,height=3.05,atlas,atlasSource=overlordArtSource}={}){
 const rig=createOverlordArtRig(THREE,{height,image:atlas});
 const group=new THREE.Group();group.name='Overlord S — articulated artwork';group.scale.setScalar(scale);group.visible=false;group.add(rig.group);
 let dead=false,state='idle',elapsed=0,readyDone=false,resolveReady;
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 const finish=value=>{if(!readyDone){readyDone=true;resolveReady(value);}};
 function setAtlas(image){if(dead||!rig.setImage(image))return false;group.visible=true;finish(true);return true;}
 const unsubscribe=atlas?()=>{}:atlasSource.subscribe(setAtlas);
 if(atlas)setAtlas(atlas);else void atlasSource.start().then(image=>{if(!dead){if(image)setAtlas(image);else finish(false);}});
 function setState(next){if(!states.includes(next))throw Error('Unknown Overlord state: '+next);if(next!==state){state=next;elapsed=0;}}
 function update(dt,input={}){
  if(dead)return;dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;if(input.state)setState(input.state);
  elapsed=Number.isFinite(input.stateElapsed)?Math.max(0,input.stateElapsed):elapsed+dt;
  return rig.update({...input,state,elapsed,time:input.time??elapsed});
 }
 function dispose(){if(dead)return;dead=true;group.visible=false;finish(false);unsubscribe();rig.dispose();group.removeFromParent();}
 return {group,root:group,rig,parts:rig.meshes,ready,update,setState,setAtlas,
  // Whole-body roster portraits must never overwrite a joint atlas.
  setImage:()=>false,setFacing:rig.setFacing,dispose,swords:[],
  metadata:{style:'articulated-art',height,standDuration:1.27,states:[...states],embeddedSwords:0,billboard:true}};
}
