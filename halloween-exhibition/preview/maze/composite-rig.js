import {createOwnerRig} from './owner-rig.js?v=20261017-rig2';
import {createCreatureRig} from './creature-rig.js?v=20261017-rig2';

/** One registered avatar may contain several separately articulated entities.
 * The main entity uses the biped rig. Children use their own limb/contact
 * solvers; only their layer origins are translated into the main rig's frame.
 * Authored child dimensions use the parent's contentHeight coordinate system.
 * Flattened drawable parts are named `childKey:part` in the root manifest.
 *
 * Ground children: offsetWorld is [right, forward] and turns with the parent.
 * Carried children: local contact space stays fixed while their independent
 * tail/ears/balance animate; anchor + offsetRig place that support plane on the
 * parent. A head cat therefore never accumulates the woman's walking distance.
 */
const KINDS=Object.freeze({biped:'biped',upright:'biped',humanoid:'biped',owner:'biped',quadruped:'quadruped',cat:'quadruped','cat-quadruped':'quadruped',wing:'wing',flying:'wing',bat:'wing','flying-bat':'wing',float:'float',floating:'float',ghost:'float','ghost-floating':'float'});
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const point=position=>({x:position.x,z:position.z});
const validPoint=position=>position&&Number.isFinite(position.x)&&Number.isFinite(position.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const PROJECTION_KEYS=['worldPixelsPerUnit','displayHeightPx','groundDepthScale','worldStrideLength','groundYaw'];
function pair(value,label,fallback=[0,0]){const result=value??fallback;if(!Array.isArray(result)||result.length!==2||!result.every(Number.isFinite))throw new TypeError(label+' must contain two finite numbers');return [...result];}
function stripParts(parts,key){const prefix=key+':';return Object.fromEntries(Object.entries(parts||{}).filter(([name])=>name.startsWith(prefix)).map(([name,value])=>[name.slice(prefix.length),value]));}
function childManifest(parent,child){
 const supplied=child.manifest||child,views={},keys=new Set([...Object.keys(parent.views||{}),...Object.keys(supplied.views||{})]);
 for(const name of keys){const rootView=parent.views?.[name]||{},view=supplied.views?.[name]||{},rootParts=stripParts(rootView.parts,child.key);if(!Object.hasOwn(supplied.views||{},name)&&!Object.keys(rootParts).length)continue;views[name]={...view,heading:view.heading??rootView.heading,atlas:view.atlas||rootView.atlas||parent.atlas,parts:{...stripParts(parent.parts,child.key),...rootParts,...view.parts}};}
 return {...supplied,contentHeight:parent.contentHeight||256,atlas:supplied.atlas||parent.atlas,atlases:{...parent.atlases,...supplied.atlases},parts:{...stripParts(parent.parts,child.key),...supplied.parts},...(Object.keys(views).length?{views}:{})};
}
function validateChild(child,index){
 if(!child||typeof child!=='object'||!/^[-_a-zA-Z0-9]{1,64}$/.test(child.key||'')||child.key==='main')throw new TypeError('Each child needs a distinct safe key');
 const kind=KINDS[child.archetype||child.manifest?.archetype||'biped'];if(!kind)throw new TypeError('Unsupported child archetype');
 if((child.children||child.manifest?.children)?.length)throw new TypeError('Declare composite entities in one flat child list');
 const mode=child.mode||'ground';if(!['ground','carried'].includes(mode))throw new TypeError('Unsupported child contact mode');
 const anchor=child.anchor||'neck';if(typeof anchor!=='string'||!/^[-_a-zA-Z0-9]{1,64}$/.test(anchor))throw new TypeError('A carried anchor must name a joint');
 return {definition:child,key:child.key,kind,mode,anchor,index,offsetWorld:pair(child.offsetWorld,'offsetWorld'),offsetRig:pair(child.offsetRig,'offsetRig'),rig:null,pose:null};
}

export function createCompositeRig({manifest={},ownerFactory=createOwnerRig,creatureFactory=createCreatureRig,...options}={}){
 if(!manifest||typeof manifest!=='object'||!Array.isArray(manifest.children||[]))throw new TypeError('Composite children must be an array');
 if((manifest.children||[]).length>7)throw new TypeError('A composite supports at most eight articulated entities');
 if(manifest.contentHeight!==undefined&&(!Number.isFinite(manifest.contentHeight)||manifest.contentHeight<=0))throw new TypeError('Positive authored contentHeight is required');
 const children=(manifest.children||[]).map(validateChild),keys=new Set(children.map(child=>child.key));if(keys.size!==children.length)throw new TypeError('Duplicate child key');
 const shared=Object.fromEntries(['unitsToPixels','depthScale','teleportDistance','canPlant'].filter(key=>options[key]!==undefined).map(key=>[key,options[key]]));
 let main,disposed=false,lastPose=null,version=0,projection={},lastMainPosition={x:0,z:0};
 try{
  main=ownerFactory({...options,manifest});
  for(const child of children){const definition=child.definition,subManifest=childManifest(manifest,definition),childOptions={...shared,...definition.motion,manifest:subManifest};if(child.mode==='carried'&&definition.motion?.canPlant===undefined)delete childOptions.canPlant;child.rig=(child.kind==='biped'?ownerFactory:creatureFactory)({...childOptions,archetype:child.kind});}
 }catch(error){main?.destroy();for(const child of children)child.rig?.destroy();throw error;}
 const live=()=>{if(disposed)throw Error('Composite rig is disposed');};
 function captureProjection(input){for(const key of PROJECTION_KEYS)if(input[key]!==undefined)projection[key]=input[key];}
 function childWorld(child,pose){const [right,forward]=child.offsetWorld,c=Math.cos(pose.heading),s=Math.sin(pose.heading);return {x:pose.root.x+c*right+s*forward,z:pose.root.z-s*right+c*forward};}
 function groundProjection(mainPose,world){const u=mainPose.projection?.unitsToPixels||finite(options.unitsToPixels,64),depth=mainPose.projection?.depthScale||finite(options.depthScale,.78),yaw=mainPose.projection?.groundYaw??finite(projection.groundYaw),x=world.x-mainPose.root.x,z=world.z-mainPose.root.z;return {x:(x*Math.cos(yaw)-z*Math.sin(yaw))*u,y:(x*Math.sin(yaw)+z*Math.cos(yaw))*u*depth,depth:x*Math.sin(yaw)+z*Math.cos(yaw)};}
 function translatedLayer(layer,origin,key){const result={...layer,part:key?key+':'+layer.part:layer.part,origin:{x:layer.origin.x+origin.x,y:layer.origin.y+origin.y}};if(layer.boneEnd)result.boneEnd={x:layer.boneEnd.x+origin.x,y:layer.boneEnd.y+origin.y};return result;}
 function assemble(mainPose){
  const groups=[{key:'main',depth:0,index:-1,layers:mainPose.layers.map(layer=>translatedLayer(layer,{x:0,y:0}))}],poses={};
  for(const child of children){
   const pose=child.pose,world=childWorld(child,mainPose),ground=groundProjection(mainPose,world);let origin;
   if(child.mode==='carried'){const joint=mainPose.joints[child.anchor]||mainPose.layers.find(layer=>layer.part===child.anchor)?.origin;if(!joint)throw new TypeError('Unknown carried anchor: '+child.anchor);origin={x:joint.x+child.offsetRig[0],y:joint.y+child.offsetRig[1]};}
   else origin={x:ground.x+child.offsetRig[0],y:ground.y+child.offsetRig[1]};
   poses[child.key]={...pose,key:child.key,contactSpace:child.mode==='carried'?'parent':'world',mode:child.mode,worldRoot:child.mode==='carried'?point(mainPose.root):world,origin:{...origin},depth:child.mode==='carried'?0:ground.depth};
   groups.push({key:child.key,depth:poses[child.key].depth,index:child.index,layers:pose.layers.map(layer=>translatedLayer(layer,origin,child.key))});
  }
  groups.sort((a,b)=>a.depth-b.depth||a.index-b.index);
  lastPose={...mainPose,version:++version,archetype:'composite',mainArchetype:'biped',layers:groups.flatMap(group=>group.layers),layerOrder:groups.map(group=>group.key),children:poses,entityVersions:{main:mainPose.version,...Object.fromEntries(children.map(child=>[child.key,child.pose.version]))},diagnostics:{...mainPose.diagnostics,entityCount:children.length+1,children:Object.fromEntries(children.map(child=>[child.key,child.pose.diagnostics]))},artwork:{...mainPose.artwork,usingFallbackView:mainPose.artwork?.usingFallbackView===true||children.some(child=>child.pose.artwork?.usingFallbackView===true),unsupportedChildren:children.filter(child=>child.pose.artwork?.usingFallbackView===true).map(child=>child.key),continuousTurnComplete:mainPose.artwork?.continuousTurnComplete===true&&children.every(child=>child.pose.artwork?.continuousTurnComplete===true),attackArtComplete:mainPose.artwork?.attackArtComplete===true&&children.every(child=>child.pose.artwork?.attackArtComplete===true),children:Object.fromEntries(children.map(child=>[child.key,child.pose.artwork]))}};
  return lastPose;
 }
 function childInput(child,input,mainPose){
  const position=child.mode==='carried'?{x:0,z:0}:childWorld(child,mainPose),previous=child.pose?.root;
  const ownProjection={...projection};if(child.definition.worldStrideLength!==undefined)ownProjection.worldStrideLength=child.definition.worldStrideLength;else delete ownProjection.worldStrideLength;
  return {...input,...ownProjection,position,heading:Number.isFinite(input.heading)?input.heading:mainPose.heading,moving:child.mode==='carried'?false:previous?distance(previous,position)>1e-9:false,attack:false};
 }
 const api={
  update(input={}){
   live();const position=input.position||lastPose?.root||lastMainPosition,dt=input.dt??0;if(!validPoint(position)||!Number.isFinite(dt)||dt<0||input.heading!==undefined&&!Number.isFinite(input.heading))throw new TypeError('Finite composite position/heading and non-negative dt are required');
   if(input.paused)return lastPose||api.update({...input,position,paused:false,dt:0,moving:false,attack:false});
   captureProjection(input);if(input.attack)api.requestAttack();const update={...input,...projection,position,dt:input.motion===false?0:dt,attack:false},mainPose=main.update(update);lastMainPosition=point(mainPose.root);
   for(const child of children)child.pose=child.rig.update(childInput(child,update,mainPose));
   return assemble(mainPose);
  },
  reset(position={x:0,z:0},heading=0){live();if(!validPoint(position)||!Number.isFinite(heading))throw new TypeError('Finite reset position and heading are required');lastMainPosition=point(position);const mainPose=main.reset(position,heading);for(const child of children){const at=child.mode==='carried'?{x:0,z:0}:childWorld(child,mainPose);child.pose=child.rig.reset(at,heading);}return assemble(mainPose);},
  seekAction(elapsed,{position=lastPose?.root||lastMainPosition,heading=lastPose?.heading||0,motion=true,...input}={}){
   live();if(!Number.isFinite(elapsed)||elapsed<0||!validPoint(position)||!Number.isFinite(heading))throw new TypeError('Finite non-negative action age and position are required');captureProjection(input);if(Object.keys(projection).length)main.update({...projection,position,heading,moving:false,dt:0});const mainPose=main.seekAction(elapsed,{position,heading,motion});lastMainPosition=point(mainPose.root);
   for(const child of children){const update=childInput(child,{...input,heading,dt:0,moving:false,motion},mainPose);child.rig.update(update);child.pose=child.rig.seekAction(elapsed,{position:update.position,heading,motion});}return assemble(mainPose);
  },
  snapshot:()=>lastPose,
  requestAttack(){if(disposed||!main.requestAttack())return false;for(const child of children)child.rig.requestAttack();return true;},
  destroy(){if(disposed)return;disposed=true;main.destroy();for(const child of children){child.rig.destroy();child.pose=null;}lastPose=null;},
 };
 return api;
}
