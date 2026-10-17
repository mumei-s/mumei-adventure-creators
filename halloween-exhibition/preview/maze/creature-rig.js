/** Nonhuman articulated skeletons. This module supplies motion, never artwork.
 * Every layer must be supplied as a separately painted part with hidden overlaps,
 * a local pivot and (for segments) a local endpoint, as drawOwnerPose expects.
 * Existing whole-character pictures are not split, mirrored, scaled or blended.
 */
import {solveTwoBone3D} from './owner-rig.js?v=20261017-rig1';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mod=(v,n)=>(v%n+n)%n;
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback,copy=p=>({...p}),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
const angleDelta=(a,b)=>mod(b-a+Math.PI,TAU)-Math.PI,worldDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const lerp=(a,b,t)=>({x:mix(a.x,b.x,t),z:mix(a.z,b.z,t)}),tip=(a,length,angle)=>({x:a.x+Math.cos(angle)*length,y:a.y+Math.sin(angle)*length});
const ALIASES=Object.freeze({quadruped:'quadruped','cat-quadruped':'quadruped',cat:'quadruped',flying:'wing',wing:'wing','flying-bat':'wing',bat:'wing',floating:'float',float:'float','ghost-floating':'float',ghost:'float'});
export const CREATURE_PART_KEYS=Object.freeze({
 quadruped:Object.freeze(['tail_back','hind_upper_far','hind_lower_far','hind_paw_far','fore_upper_far','fore_lower_far','fore_paw_far','body','neck','head','ears','hind_upper_near','hind_lower_near','hind_paw_near','fore_upper_near','fore_lower_near','fore_paw_near','tail_tip','collar_accessory']),
 wing:Object.freeze(['wing_left_membrane','wing_left_upper','wing_left_outer','wing_right_membrane','wing_right_upper','wing_right_outer','tail','feet','body','head_ears']),
 float:Object.freeze(['trail_back','sleeve_far','forearm_far','hand_far','hood_back','torso_cloth','head','sleeve_near','forearm_near','hand_near','trail_mid','trail_tip']),
});
export const CREATURE_RIG_DEFAULTS=Object.freeze({
 quadruped:Object.freeze({upperLeg:32,lowerLeg:34,hipHeight:43,bodyHeight:48,neckHeight:25,headHeight:40,earsHeight:18,pawHeight:13,bodyHalfLength:.28,footSpacing:.13,tailBase:25,tailTip:24,collarHeight:18}),
 wing:Object.freeze({upperWing:52,outerWing:60,wingRootHalfWidth:17,chestHeight:81,bodyHeight:71,headHeight:49,tailLength:30,feetHeight:16,membraneHeight:77,period:.8}),
 float:Object.freeze({upperArm:34,forearm:37,shoulderHalfWidth:23,torsoHeight:91,neckHeight:111,headHeight:49,bodyHeight:93,handHeight:17,trailBack:35,trailMid:29,trailTip:31,period:2.4}),
});
const HEADINGS={down:0,'down-right':Math.PI/4,right:Math.PI/2,'up-right':Math.PI*.75,up:Math.PI,'up-left':-Math.PI*.75,left:-Math.PI/2,'down-left':-Math.PI/4};
const FOOT_SPEC=Object.freeze({fore_near:{side:1,fore:1,offset:0},hind_far:{side:-1,fore:-1,offset:0},fore_far:{side:-1,fore:1,offset:.5},hind_near:{side:1,fore:-1,offset:.5}});
const ACTION=[['charge',.25],['release',.28],['recovery',.57]];
export const CREATURE_ACTION_DURATION=1.1;

export function solveCreatureChain(root,target,first,second,{bend=1}={}){
 if(![root?.x,root?.y,target?.x,target?.y,first,second].every(Number.isFinite)||first<=0||second<=0)throw new TypeError('Finite joints and positive bone lengths are required');
 const dx=target.x-root.x,dy=target.y-root.y,wanted=Math.hypot(dx,dy),min=Math.abs(first-second),max=first+second,span=clamp(wanted,Math.max(min,1e-8),max),ux=wanted>1e-10?dx/wanted:0,uy=wanted>1e-10?dy/wanted:1;
 const along=(first*first-second*second+span*span)/(2*span),height=Math.sqrt(Math.max(0,first*first-along*along)),side=bend<0?-1:1;
 return {root:copy(root),joint:{x:root.x+ux*along-uy*height*side,y:root.y+uy*along+ux*height*side},end:{x:root.x+ux*span,y:root.y+uy*span},requestedTarget:copy(target),reachable:wanted>=min-1e-8&&wanted<=max+1e-8};
}

function selectView(manifest,heading){
 const requested=Object.keys(HEADINGS).filter(key=>['down','right','up','left'].includes(key)).sort((a,b)=>Math.abs(angleDelta(heading,HEADINGS[a]))-Math.abs(angleDelta(heading,HEADINGS[b])))[0];
 const views=Object.entries(manifest?.views||{}).map(([key,view])=>({key,heading:finite(view.heading,HEADINGS[key]??0)})).sort((a,b)=>Math.abs(angleDelta(heading,a.heading))-Math.abs(angleDelta(heading,b.heading)));
 return {key:views[0]?.key||manifest?.direction||'down',requested,fallback:views.length?!Object.hasOwn(manifest.views,requested):requested!=='down'};
}

/** Compatible with owner rig update/reset/snapshot/destroy and pose.layers.
 * Paused updates return the exact snapshot. motion:false freezes secondary
 * movement while accepted world travel still drives quadruped foot contacts.
 */
export function createCreatureRig({archetype='quadruped',manifest=null,strideLength=.8,unitsToPixels=64,depthScale=.78,stepLift=.11,teleportDistance=3,canPlant=()=>true,rig:overrides={}}={}){
 const kind=ALIASES[archetype];if(!kind)throw new TypeError('Unsupported creature archetype');
 if(![strideLength,unitsToPixels,depthScale,stepLift,teleportDistance].every(value=>Number.isFinite(value)&&value>0)||typeof canPlant!=='function')throw new TypeError('Invalid creature travel dimensions');
 const dimensions={...CREATURE_RIG_DEFAULTS[kind],...manifest?.rig,...overrides};for(const value of Object.values(dimensions))if(!Number.isFinite(value)||value<=0)throw new TypeError('Creature skeleton dimensions must be positive');
 let disposed=false,initialized=false,root={x:0,z:0},lastRoot=copy(root),heading=0,time=0,travelDistance=0,gaitCoordinate=0,version=0,lastPose=null,action=null,turnFoot=null,groundYaw=0,projectionFitted=false,wasMoving=false;const feet={};
 const bodyHalfPixels=dimensions.bodyHalfLength*unitsToPixels,footSpacingPixels=dimensions.footSpacing*unitsToPixels;
 const localWorld=(side=0,forward=0,at=root,yaw=heading)=>({x:at.x+Math.cos(yaw)*side+Math.sin(yaw)*forward,z:at.z-Math.sin(yaw)*side+Math.cos(yaw)*forward});
 const nominal=(foot,at=root,yaw=heading,lead=0)=>localWorld(foot.side*dimensions.footSpacing,foot.fore*dimensions.bodyHalfLength+lead,at,yaw);
 const plant=(target,foot,at=root,yaw=heading)=>{for(const p of[target,nominal(foot,at,yaw),at])if(canPlant(p))return copy(p);return copy(at);};
 const spatial=(point,lift=0)=>{const dx=point.x-root.x,dz=point.z-root.z;return{x:(dx*Math.cos(groundYaw)-dz*Math.sin(groundYaw))*unitsToPixels,y:lift*unitsToPixels,z:(dx*Math.sin(groundYaw)+dz*Math.cos(groundYaw))*unitsToPixels};};
 const project=point=>({x:point.x,y:-point.y+point.z*depthScale}),pixel=(point,lift=0)=>project(spatial(point,lift));
 function initialize(position,yaw){root=copy(position);lastRoot=copy(root);heading=yaw;turnFoot=null;for(const key of Object.keys(feet))delete feet[key];if(kind==='quadruped')for(const [name,spec]of Object.entries(FOOT_SPEC))feet[name]={...spec,world:plant(nominal(spec),spec),lift:0,contact:true,mode:'stance',swing:null,settle:null};initialized=true;}
 function swing(foot,at,yaw,coordinate){if(!foot.contact||Object.values(feet).filter(value=>value.contact).length<=2)return;foot.swing={start:copy(foot.world),target:plant(nominal(foot,at,yaw,strideLength*.62),foot,at,yaw),startCoordinate:coordinate,endCoordinate:Math.floor(coordinate)+1};foot.settle=null;foot.contact=false;foot.mode='swing';}
 function sampleSwing(foot,coordinate){if(!foot.swing)return;const s=foot.swing,t=clamp((coordinate-s.startCoordinate)/(s.endCoordinate-s.startCoordinate),0,1);foot.world=lerp(s.start,s.target,smooth(t));foot.lift=Math.sin(t*Math.PI)*stepLift;if(t>=1-1e-9){foot.world=copy(s.target);foot.lift=0;foot.contact=true;foot.mode='stance';foot.swing=null;}}
 function settle(foot,dt){if(!foot.settle){foot.settle={start:copy(foot.world),target:plant(nominal(foot),foot),lift:foot.lift,elapsed:0};foot.swing=null;}const s=foot.settle;s.elapsed+=dt;const t=clamp(s.elapsed/.2,0,1);foot.world=lerp(s.start,s.target,smooth(t));foot.lift=s.lift*(1-smooth(t));foot.contact=false;foot.mode='settle';if(t>=1){foot.world=copy(s.target);foot.lift=0;foot.contact=true;foot.mode='stance';foot.settle=null;}}
 function advanceFeet(previousGait,yawBefore,dt,moving){
  if(moving){
   const events=[];for(const [name,foot]of Object.entries(feet)){const before=previousGait+foot.offset,after=gaitCoordinate+foot.offset;for(let cycle=Math.floor(before)-1;cycle<=Math.floor(after)+1;cycle++)for(const [coordinate,event]of[[cycle+.62,'off'],[cycle+1,'on']])if(coordinate>before+1e-10&&coordinate<=after+1e-10)events.push({name,event,coordinate,travel:coordinate-foot.offset});}
   events.sort((a,b)=>a.travel-b.travel||a.event.localeCompare(b.event));
   for(const event of events){const foot=feet[event.name],fraction=(event.travel-previousGait)/Math.max(1e-12,gaitCoordinate-previousGait),at=lerp(lastRoot,root,clamp(fraction,0,1)),yaw=yawBefore+angleDelta(yawBefore,heading)*fraction;if(event.event==='off')swing(foot,at,yaw,event.coordinate);else sampleSwing(foot,event.coordinate);}
   for(const foot of Object.values(feet)){if(foot.swing)sampleSwing(foot,gaitCoordinate+foot.offset);else if(foot.settle)settle(foot,dt);}
  }else for(const foot of Object.values(feet))if(foot.swing||foot.settle)settle(foot,dt);
 }
 function standingTurn(dt,moving){
  if(kind!=='quadruped'||moving)return;
  if(turnFoot){const foot=feet[turnFoot],turn=foot.turn;turn.elapsed+=dt;const t=clamp(turn.elapsed/.22,0,1);foot.world=lerp(turn.start,turn.target,smooth(t));foot.lift=Math.sin(Math.PI*t)*stepLift*.65;foot.contact=false;foot.mode='turn';if(t>=1){foot.world=copy(turn.target);foot.lift=0;foot.contact=true;foot.mode='stance';delete foot.turn;turnFoot=null;}return;}
  if(Object.values(feet).some(foot=>!foot.contact))return;
  const candidate=Object.entries(feet).map(([name,foot])=>({name,foot,target:plant(nominal(foot),foot)})).sort((a,b)=>worldDistance(b.foot.world,b.target)-worldDistance(a.foot.world,a.target))[0];
  if(candidate&&worldDistance(candidate.foot.world,candidate.target)>3.84/unitsToPixels){turnFoot=candidate.name;candidate.foot.turn={start:copy(candidate.foot.world),target:candidate.target,elapsed:0};candidate.foot.contact=false;candidate.foot.mode='turn';}
 }
 function actionPose(){if(!action)return{kind:'locomotion',stage:'idle',progress:0};let age=action.elapsed;for(const [stage,duration]of ACTION){if(age<=duration)return{kind:'attack',stage,progress:clamp(age/duration,0,1),elapsed:action.elapsed,duration:CREATURE_ACTION_DURATION};age-=duration;}return{kind:'locomotion',stage:'idle',progress:0};}
 function buildPose(speed,moving){
  const layers=[],joints={},chains={},attachments={},phaseValue=mod(kind==='quadruped'?gaitCoordinate*TAU:time/dimensions.period*TAU,TAU),phase=phaseValue<1e-10||TAU-phaseValue<1e-10?0:phaseValue,act=actionPose();
  const gesture=act.kind==='attack'?Math.sin(clamp(act.elapsed/CREATURE_ACTION_DURATION,0,1)*Math.PI):0;
  const part=(name,origin,height,rotation=0)=>{layers.push({part:name,origin:copy(origin),height,rotation,scaleX:1,scaleY:1});return layers.at(-1);};
  const bone=(name,a,b)=>{const layer=part(name,a,distance(a,b),Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2);layer.boneEnd=copy(b);};
  if(kind==='quadruped'){
   let hipHeight=dimensions.hipHeight;const targets={};
   for(const[name,foot]of Object.entries(feet)){const ground=spatial(nominal(foot)),target=spatial(foot.world,foot.lift),reach=dimensions.upperLeg+dimensions.lowerLeg-.25;targets[name]={ground,target};hipHeight=Math.min(hipHeight,target.y+Math.sqrt(Math.max(1,reach*reach-(target.x-ground.x)**2-(target.z-ground.z)**2)));}
   hipHeight=Math.max(1,hipHeight);const base={x:0,y:-dimensions.bodyHeight+dimensions.hipHeight-hipHeight},hips={};
   for(const[name,foot]of Object.entries(feet)){const{ground,target}=targets[name],hip={...ground,y:hipHeight},yaw=heading-groundYaw,physical=solveTwoBone3D(hip,target,dimensions.upperLeg,dimensions.lowerLeg,{pole:{x:-foot.fore*Math.sin(yaw),y:0,z:-foot.fore*Math.cos(yaw)}}),chain={root:project(physical.root),joint:project(physical.joint),end:project(physical.end),requestedTarget:project(target),physical};hips[name]=chain.root;chains[name]=chain;joints['hip_'+name]=chain.root;joints['knee_'+name]=chain.joint;joints['paw_'+name]=chain.end;}
   const tailBase=pixel(localWorld(0,-dimensions.bodyHalfLength));tailBase.y-=hipHeight+8;const tailAngle=-Math.PI*.64+Math.sin(phase)*.15+Math.sin(time*1.2)*.045,tailMid=tip(tailBase,dimensions.tailBase,tailAngle),tailTip=tip(tailMid,dimensions.tailTip,tailAngle+.23+Math.sin(phase-.4)*.17);
   joints.tail_base=tailBase;joints.tail_mid=tailMid;joints.tail_tip=tailTip;bone('tail_back',tailBase,tailMid);
   for(const suffix of['far','near']){
    if(suffix==='near'){
     part('body',base,dimensions.bodyHeight);const neck=pixel(localWorld(0,dimensions.bodyHalfLength));neck.y-=hipHeight+12;joints.neck=neck;joints.head={x:neck.x,y:neck.y-15};part('neck',neck,dimensions.neckHeight);part('head',joints.head,dimensions.headHeight,Math.sin(time*1.35)*.025);part('ears',joints.head,dimensions.earsHeight,Math.sin(time*1.7)*.04+gesture*.1);
    }
    for(const limb of['hind','fore']){const chain=chains[limb+'_'+suffix];bone(limb+'_upper_'+suffix,chain.root,chain.joint);bone(limb+'_lower_'+suffix,chain.joint,chain.end);part(limb+'_paw_'+suffix,chain.end,dimensions.pawHeight);}
   }
   bone('tail_tip',tailMid,tailTip);part('collar_accessory',joints.neck,dimensions.collarHeight);joints.grip=copy(joints.head);
  }else if(kind==='wing'){
   const chest={x:0,y:-dimensions.chestHeight};joints.chest=chest;joints.root={x:0,y:0};
   for(const [side,sign]of[['left',-1],['right',1]]){
    const start={x:sign*dimensions.wingRootHalfWidth,y:chest.y-4},angle=.08+Math.sin(phase)*(.72+gesture*.16),upperAngle=sign===1?angle:Math.PI-angle,elbow=tip(start,dimensions.upperWing,upperAngle),outerAngle=sign===1?upperAngle+.25+Math.sin(phase-.4)*.32:upperAngle-.25-Math.sin(phase-.4)*.32,end=tip(elbow,dimensions.outerWing,outerAngle);
    joints['wing_'+side+'_root']=start;joints['wing_'+side+'_elbow']=elbow;joints['wing_'+side+'_tip']=end;chains[side]={root:start,joint:elbow,end};
    part('wing_'+side+'_membrane',start,dimensions.membraneHeight,upperAngle-Math.PI/2);bone('wing_'+side+'_upper',start,elbow);bone('wing_'+side+'_outer',elbow,end);
   }
   const tailStart={x:0,y:chest.y+36},tailEnd=tip(tailStart,dimensions.tailLength,Math.PI/2+Math.sin(phase-.3)*.13);joints.tail_base=tailStart;joints.tail_tip=tailEnd;bone('tail',tailStart,tailEnd);part('feet',{x:0,y:chest.y+43},dimensions.feetHeight);part('body',chest,dimensions.bodyHeight);joints.head={x:0,y:chest.y-25};part('head_ears',joints.head,dimensions.headHeight,Math.sin(time*1.2)*.025);joints.grip=copy(joints.tail_base);
  }else{
   const torso={x:0,y:-dimensions.torsoHeight},neck={x:0,y:-dimensions.neckHeight},head={x:0,y:neck.y-12};joints.torso=torso;joints.neck=neck;joints.head=head;
   const trailBase={x:0,y:torso.y+34},a=Math.PI/2+Math.sin(phase)*.14,b=Math.PI/2+Math.sin(phase-.45)*.22,c=Math.PI/2+Math.sin(phase-.9)*.3,mid=tip(trailBase,dimensions.trailBack,a),end=tip(mid,dimensions.trailMid,b),tipEnd=tip(end,dimensions.trailTip,c);
   joints.trail_base=trailBase;joints.trail_mid=mid;joints.trail_end=end;joints.trail_tip=tipEnd;bone('trail_back',trailBase,mid);
   for(const [side,sign]of[['far',-1],['near',1]]){
    if(side==='near'){part('hood_back',neck,dimensions.headHeight*1.25);part('torso_cloth',torso,dimensions.bodyHeight);part('head',head,dimensions.headHeight);}
    const shoulder={x:sign*dimensions.shoulderHalfWidth,y:torso.y-9},hand={x:sign*(53+Math.sin(phase+sign*.5)*5+gesture*12),y:torso.y+21+Math.sin(phase+sign*.6)*6-gesture*20},chain=solveCreatureChain(shoulder,hand,dimensions.upperArm,dimensions.forearm,{bend:-sign});
    chains[side]=chain;joints['shoulder_'+side]=shoulder;joints['elbow_'+side]=chain.joint;joints['wrist_'+side]=chain.end;bone('sleeve_'+side,shoulder,chain.joint);bone('forearm_'+side,chain.joint,chain.end);part('hand_'+side,chain.end,dimensions.handHeight,Math.sin(phase+sign)*.06);
   }
   bone('trail_mid',mid,end);bone('trail_tip',end,tipEnd);joints.grip=copy(joints.wrist_near);
  }
  for(const attachment of manifest?.attachments||[]){const parent=joints[attachment.parent||'grip'];if(!parent||!attachment.part)continue;const offset=attachment.offset||[0,0],rotation=finite(attachment.rotation),origin={x:parent.x+finite(offset[0]),y:parent.y+finite(offset[1])};part(attachment.part,origin,finite(attachment.height,24),rotation);attachments[attachment.part]={parent:attachment.parent||'grip',grip:copy(parent),origin:copy(origin),rotation};}
  const view=selectView(manifest,heading-groundYaw),parts=manifest?.views?.[view.key]?.parts||manifest?.parts||{},missingParts=CREATURE_PART_KEYS[kind].filter(key=>!parts[key]);
  return {version:++version,archetype:kind,root:copy(root),heading,time,distance:travelDistance,gaitPhase:phase,speed,moving,view:view.key,layers,joints,chains,projection:{unitsToPixels,depthScale,groundYaw,strideLength},limbLengths:copy(dimensions),feet:Object.fromEntries(Object.entries(feet).map(([name,foot])=>[name,{world:copy(foot.world),lift:foot.lift,contact:foot.contact,mode:foot.mode,pair:foot.offset===0?'diagonalA':'diagonalB'}])),attachments,action:act,
   artwork:{requestedView:view.requested,usingFallbackView:view.fallback,directions:Object.keys(manifest?.views||{}),missingParts,partsReady:missingParts.length===0,artworkComplete:manifest?.artworkComplete===true&&missingParts.length===0,continuousTurnComplete:manifest?.continuousTurnComplete===true,attackArtComplete:manifest?.attackArtComplete===true},
   diagnostics:{supportedFeet:Object.values(feet).filter(foot=>foot.contact).length,footReach:Object.fromEntries(Object.entries(chains).filter(([,chain])=>chain.requestedTarget).map(([name,chain])=>[name,distance(chain.end,chain.requestedTarget)]))}};
 }
 const api={
  update({position=root,dt=0,heading:desiredHeading,moving,paused=false,motion=true,attack=false,worldPixelsPerUnit,displayHeightPx,groundDepthScale,groundYaw:cameraYaw,worldStrideLength}={}){
   if(disposed)throw Error('Creature rig is disposed');if(![position?.x,position?.z,dt].every(Number.isFinite)||dt<0||desiredHeading!==undefined&&!Number.isFinite(desiredHeading))throw new TypeError('Finite position, heading and non-negative dt are required');
   if(paused){if(!initialized)initialize(position,finite(desiredHeading));return lastPose??=buildPose(0,false);}
   if(worldPixelsPerUnit!==undefined||displayHeightPx!==undefined){
    if(!Number.isFinite(worldPixelsPerUnit)||worldPixelsPerUnit<=0||!Number.isFinite(displayHeightPx)||displayHeightPx<=0)throw Error('Both positive world scale and displayed height are required');
    unitsToPixels=worldPixelsPerUnit*(manifest?.contentHeight||256)/displayHeightPx;
    if(kind==='quadruped'){strideLength=Number.isFinite(worldStrideLength)&&worldStrideLength>0?worldStrideLength:(dimensions.upperLeg+dimensions.lowerLeg)*1.3/unitsToPixels;dimensions.bodyHalfLength=bodyHalfPixels/unitsToPixels;dimensions.footSpacing=footSpacingPixels/unitsToPixels;stepLift=(dimensions.upperLeg+dimensions.lowerLeg)*.14/unitsToPixels;}
    if(!projectionFitted&&initialized)initialize(position,finite(desiredHeading,heading));projectionFitted=true;
   }
   if(groundDepthScale!==undefined){if(!Number.isFinite(groundDepthScale)||groundDepthScale<=0)throw Error('Positive ground depth is required');depthScale=groundDepthScale;}
   if(cameraYaw!==undefined){if(!Number.isFinite(cameraYaw))throw Error('Finite ground yaw is required');groundYaw=cameraYaw;}
   const step=Math.min(dt,.1);if(!initialized)initialize(position,finite(desiredHeading));let previousGait=gaitCoordinate;const yawBefore=heading;lastRoot=copy(root);const travel=worldDistance(position,root);root=copy(position);
   if(travel>teleportDistance){initialize(position,finite(desiredHeading,heading));lastPose=buildPose(0,false);return lastPose;}
   travelDistance+=travel;if(motion)time+=step;const isMoving=moving!==false&&travel>1e-9,speed=step?travel/step:0,targetHeading=finite(desiredHeading,travel>1e-9?Math.atan2(root.x-lastRoot.x,root.z-lastRoot.z):heading);heading+=angleDelta(heading,targetHeading)*(1-Math.exp(-step/.12));
   if(isMoving&&!wasMoving){gaitCoordinate=0;previousGait=0;}gaitCoordinate+=travel/strideLength;
   if(attack)api.requestAttack();if(action&&motion){action.elapsed+=step;if(action.elapsed>=CREATURE_ACTION_DURATION)action=null;}
   if(kind==='quadruped'){
    if(isMoving&&turnFoot){const foot=feet[turnFoot];foot.swing=null;foot.settle={start:copy(foot.world),target:plant(nominal(foot),foot),lift:foot.lift,elapsed:0};delete foot.turn;turnFoot=null;}
    advanceFeet(previousGait,yawBefore,step,isMoving);standingTurn(step,isMoving);
   }
   wasMoving=isMoving;lastPose=buildPose(speed,isMoving);return lastPose;
  },
  reset(position={x:0,z:0},yaw=0){if(disposed)throw Error('Creature rig is disposed');if(![position?.x,position?.z,yaw].every(Number.isFinite))throw new TypeError('Finite reset position and heading are required');time=0;travelDistance=0;gaitCoordinate=0;wasMoving=false;action=null;initialize(position,yaw);lastPose=buildPose(0,false);return lastPose;},
  snapshot:()=>lastPose,
  requestAttack(){if(disposed||action)return false;action={elapsed:0};return true;},
  seekAction(elapsed,{position=root,heading:yaw=heading,motion=true}={}){if(disposed)throw Error('Creature rig is disposed');if(![elapsed,position?.x,position?.z,yaw].every(Number.isFinite)||elapsed<0)throw new TypeError('Finite non-negative action age is required');time=motion?elapsed:0;travelDistance=0;gaitCoordinate=0;wasMoving=false;initialize(position,yaw);action=elapsed<CREATURE_ACTION_DURATION?{elapsed:motion?elapsed:.53}:null;lastPose=buildPose(0,false);return lastPose;},
  destroy(){if(disposed)return;disposed=true;lastPose=null;action=null;for(const name of Object.keys(feet))delete feet[name];},
 };
 return api;
}

export const createQuadrupedRig=options=>createCreatureRig({...options,archetype:'quadruped'});
export const createWingRig=options=>createCreatureRig({...options,archetype:'wing'});
export const createFloatingRig=options=>createCreatureRig({...options,archetype:'float'});
