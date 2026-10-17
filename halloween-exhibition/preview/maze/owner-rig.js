/** Articulated owner pilot. Every image is a rigid, independently painted part.
 * Positions and foot contacts use world x/z; the solved skeleton uses rig pixels.
 * This runtime cannot manufacture missing profile/back/turn drawings.
 */
export const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mod=(v,n)=>(v%n+n)%n;
const finite=(v,d=0)=>Number.isFinite(v)?v:d;
const copy=p=>({x:p.x,z:p.z}),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
const angleDelta=(a,b)=>mod(b-a+Math.PI,TAU)-Math.PI;
const distance2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const worldDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerpWorld=(a,b,t)=>({x:mix(a.x,b.x,t),z:mix(a.z,b.z,t)});

/** Analytic, fixed-length two-joint chain. Unreachable endpoints are clamped;
 * the requested target is retained so callers can inspect reach violations.
 */
export function solveTwoBone(root,target,lengthA,lengthB,{bend=1}={}){
 if(![root?.x,root?.y,target?.x,target?.y,lengthA,lengthB].every(Number.isFinite)||lengthA<=0||lengthB<=0)throw new TypeError('Finite joints and positive bone lengths are required');
 const dx=target.x-root.x,dy=target.y-root.y,wanted=Math.hypot(dx,dy),minimum=Math.abs(lengthA-lengthB),maximum=lengthA+lengthB;
 const direction=wanted>1e-10?{x:dx/wanted,y:dy/wanted}:{x:0,y:1};
 const span=clamp(wanted,Math.max(minimum,1e-8),maximum),along=(lengthA*lengthA-lengthB*lengthB+span*span)/(2*span),height=Math.sqrt(Math.max(0,lengthA*lengthA-along*along)),side=bend<0?-1:1;
 const joint={x:root.x+direction.x*along-direction.y*height*side,y:root.y+direction.y*along+direction.x*height*side};
 const end={x:root.x+direction.x*span,y:root.y+direction.y*span};
 return{root:{...root},joint,end,requestedTarget:{...target},reachable:wanted>=minimum-1e-8&&wanted<=maximum+1e-8,angles:{upper:Math.atan2(joint.y-root.y,joint.x-root.x),lower:Math.atan2(end.y-joint.y,end.x-joint.x)}};
}

/** A leg flexes in its heading-forward depth plane, never by spreading both
 * knees sideways in a front view. Physical lengths stay constant in 3D; the
 * projected segments shorten naturally when a knee moves toward the camera.
 */
export function solveTwoBone3D(root,target,lengthA,lengthB,{pole={x:0,y:0,z:1}}={}){
 if(![root?.x,root?.y,root?.z,target?.x,target?.y,target?.z,lengthA,lengthB,pole?.x,pole?.y,pole?.z].every(Number.isFinite)||lengthA<=0||lengthB<=0)throw new TypeError('Finite 3D joints and positive lengths are required');
 const vector={x:target.x-root.x,y:target.y-root.y,z:target.z-root.z},wanted=Math.hypot(vector.x,vector.y,vector.z),axis=wanted>1e-10?{x:vector.x/wanted,y:vector.y/wanted,z:vector.z/wanted}:{x:0,y:-1,z:0},minimum=Math.abs(lengthA-lengthB),maximum=lengthA+lengthB,span=clamp(wanted,Math.max(minimum,1e-8),maximum);
 let dot=pole.x*axis.x+pole.y*axis.y+pole.z*axis.z,bend={x:pole.x-axis.x*dot,y:pole.y-axis.y*dot,z:pole.z-axis.z*dot},norm=Math.hypot(bend.x,bend.y,bend.z);
 if(norm<1e-8){const alternate=Math.abs(axis.x)<.8?{x:1,y:0,z:0}:{x:0,y:0,z:1};dot=alternate.x*axis.x+alternate.y*axis.y+alternate.z*axis.z;bend={x:alternate.x-axis.x*dot,y:alternate.y-axis.y*dot,z:alternate.z-axis.z*dot};norm=Math.hypot(bend.x,bend.y,bend.z);}
 bend={x:bend.x/norm,y:bend.y/norm,z:bend.z/norm};const along=(lengthA*lengthA-lengthB*lengthB+span*span)/(2*span),height=Math.sqrt(Math.max(0,lengthA*lengthA-along*along));
 return{root:{...root},joint:{x:root.x+axis.x*along+bend.x*height,y:root.y+axis.y*along+bend.y*height,z:root.z+axis.z*along+bend.z*height},end:{x:root.x+axis.x*span,y:root.y+axis.y*span,z:root.z+axis.z*span},requestedTarget:{...target},reachable:wanted>=minimum-1e-8&&wanted<=maximum+1e-8};
}

export const OWNER_PART_KEYS=Object.freeze(['head','backHair','bodiceTorso','pelvisFrontSkirt','leftUpperArm','leftForearmHand','rightUpperArm','rightForearmHand','leftUpperLeg','leftLowerLegBoot','rightUpperLeg','rightLowerLegBoot','lantern','backSkirtTails','leftFrontHair','rightFrontHair']);
export const OWNER_ATLAS_SCHEMA=Object.freeze({version:1,width:2048,height:2048,cell:512,parts:OWNER_PART_KEYS});
const VIEW_HEADINGS=Object.freeze({down:0,'down-right':Math.PI/4,right:Math.PI/2,'up-right':Math.PI*.75,up:Math.PI,'up-left':-Math.PI*.75,left:-Math.PI/2,'down-left':-Math.PI/4,'down-threequarter':0});
/** Each direction uses separately authored parts. Selecting a supplied view
 * never mirrors, narrows or blends a body. Missing views remain explicit.
 */
export function selectOwnerView(manifest,heading=0){
 const requested=Object.entries(VIEW_HEADINGS).filter(([key])=>['down','right','up','left'].includes(key)).sort((a,b)=>Math.abs(angleDelta(heading,a[1]))-Math.abs(angleDelta(heading,b[1])))[0][0];
 const views=Object.entries(manifest?.views||{});if(!views.length)return{key:manifest?.direction||'down-threequarter',requested,fallback:requested!=='down'};
 const available=views.map(([key,view])=>({key,heading:finite(view.heading,VIEW_HEADINGS[key]??0)})).sort((a,b)=>Math.abs(angleDelta(heading,a.heading))-Math.abs(angleDelta(heading,b.heading)));
 return{key:available[0].key,requested,fallback:!Object.hasOwn(manifest.views,requested)&&!(requested==='down'&&Object.hasOwn(manifest.views,'down-threequarter'))};
}

/** Bone geometry interpolates cyclically between authored views while painted
 * part selection stays discrete. A wrist/prop never teleports when the nearest
 * part drawing changes. Signed bone centers may cross through a profile;
 * painted part widths remain rigid and positive.
 */
function blendedGeometry(manifest,yaw,baseDimensions,baseSides,baseLegSides){
 const views=Object.entries(manifest?.views||{}).map(([key,view])=>({key,view,angle:mod(finite(view.heading,VIEW_HEADINGS[key]??0),TAU)})).sort((a,b)=>a.angle-b.angle);
 if(!views.length)views.push({key:manifest?.direction||'down',view:{},angle:0});
 const angle=mod(yaw,TAU);let a=views.at(-1),b=views[0],from=a.angle,to=b.angle+TAU,current=angle<a.angle?angle+TAU:angle;
 for(let i=0;i<views.length-1;i++)if(angle>=views[i].angle&&angle<=views[i+1].angle){a=views[i];b=views[i+1];from=a.angle;to=b.angle;current=angle;break;}
 const t=views.length===1?0:smooth(clamp((current-from)/(to-from),0,1)),sample=view=>{const dimensions={...baseDimensions,...view.rig},sides={...baseSides,...view.screenSides},legs={...baseLegSides,...view.legSides},rest={...manifest?.restHands,...view.restHands},idles={...manifest?.idleHands,...view.idleHands},hands={};for(const side of['left','right'])hands[side]=Array.isArray(rest[side])&&rest[side].length===2&&rest[side].every(Number.isFinite)?rest[side]:[sides[side]*(side==='left'?29:34),side==='left'?-15:-32];return{dimensions,sides,hands,idles,shoulders:{left:sides.left*dimensions.shoulderHalfWidth,right:sides.right*dimensions.shoulderHalfWidth},hips:{left:legs.left*dimensions.hipHalfWidth,right:legs.right*dimensions.hipHalfWidth}};},first=sample(a.view),second=sample(b.view),out={dimensions:{},sides:{},hands:{},idles:{},shoulders:{},hips:{}};
 for(const key of Object.keys(baseDimensions))out.dimensions[key]=mix(first.dimensions[key],second.dimensions[key],t);
 for(const side of['left','right']){out.sides[side]=mix(first.sides[side],second.sides[side],t);out.hands[side]=[mix(first.hands[side][0],second.hands[side][0],t),mix(first.hands[side][1],second.hands[side][1],t)];out.shoulders[side]=mix(first.shoulders[side],second.shoulders[side],t);out.hips[side]=mix(first.hips[side],second.hips[side],t);const u=first.idles[side],v=second.idles[side];if(u||v){const amp=value=>Array.isArray(value?.amplitude)&&value.amplitude.length===2&&value.amplitude.every(Number.isFinite)?value.amplitude:[0,0],ua=amp(u),va=amp(v),up=finite(u?.phase),vp=finite(v?.phase);out.idles[side]={amplitude:[mix(ua[0],va[0],t),mix(ua[1],va[1],t)],frequency:mix(finite(u?.frequency,1.5),finite(v?.frequency,1.5),t),phase:up+angleDelta(up,vp)*t};}}return out;
}
export const OWNER_RIG_DEFAULTS=Object.freeze({thigh:44,shin:46,upperArm:34,forearm:38,hipHeight:79,hipHalfWidth:10,shoulderHeight:72,shoulderHalfWidth:20,neckHeight:94,headHeight:94,hairHeight:137,frontHairHeight:91,torsoHeight:103,skirtHeight:75,tailsHeight:93,lanternHeight:63,waistOffset:28});
const ACTION=Object.freeze([['charge',.45],['ready',.25],['circle',.3],['release',.25],['impact',.18],['recovery',.42]]);
const ACTION_DURATION=ACTION.reduce((n,[,seconds])=>n+seconds,0);
export const OWNER_ATTACK_DURATION=ACTION_DURATION;

export function createOwnerRig({manifest=null,strideLength=1.15,unitsToPixels=64,depthScale=.78,groundYaw=0,footSpacing=.17,stepLift=.16,teleportDistance=3,canPlant=()=>true,rig:overrides={}}={}){
 if(![strideLength,unitsToPixels,depthScale,footSpacing,stepLift,teleportDistance].every(v=>Number.isFinite(v)&&v>0))throw new TypeError('Invalid rig travel dimensions');
 const baseDimensions={...OWNER_RIG_DEFAULTS,...manifest?.rig,...overrides};for(const value of Object.values(baseDimensions))if(!Number.isFinite(value)||value<=0)throw new TypeError('Invalid skeleton dimensions');
 const baseSides={left:manifest?.screenSides?.left??1,right:manifest?.screenSides?.right??-1},baseLegSides={...baseSides,...manifest?.legSides},anatomicalSides={...baseLegSides,...manifest?.anatomicalSides};for(const pair of[baseSides,baseLegSides,anatomicalSides])if(![pair.left,pair.right].every(value=>value===1||value===-1)||pair.left===pair.right)throw new TypeError('Each arm/leg needs an opposite screen side');
 if(!Number.isFinite(groundYaw))throw new TypeError('Finite ground-plane orientation is required');
 let disposed=false,initialized=false,projectionInitialized=false,wasMoving=false,phaseBias=0,standingHeading=0,root={x:0,z:0},lastRoot={x:0,z:0},heading=0,time=0,distance=0,gaitCoordinate=0,version=0,lastPose=null,action=null,turnFoot=null;
 const feet={left:null,right:null};
 const lateral=(side,at=root,yaw=heading,forward=0)=>({x:at.x+Math.cos(yaw)*footSpacing*side+Math.sin(yaw)*forward,z:at.z-Math.sin(yaw)*footSpacing*side+Math.cos(yaw)*forward});
 function plantable(goal,side,at=root,yaw=heading){for(const candidate of[goal,lateral(side,at,yaw),at])if(canPlant(candidate))return copy(candidate);return copy(at);}
 function initialize(position,yaw){root=copy(position);lastRoot=copy(root);heading=yaw;standingHeading=yaw;for(const[name,side,offset]of[['left',anatomicalSides.left,0],['right',anatomicalSides.right,.5]])feet[name]={world:plantable(lateral(side),side),lift:0,contact:true,mode:'stance',coordinate:gaitCoordinate+phaseBias+offset,side,offset,swing:null,settle:null};initialized=true;}
 function beginSwing(foot,at,yaw,coordinate){if(foot.swing||Object.values(feet).some(other=>other!==foot&&!other.contact))return;const remaining=(1-.62)*strideLength,goal=lateral(foot.side,at,yaw,remaining+strideLength*.31);foot.swing={start:copy(foot.world),startLift:foot.lift,target:plantable(goal,foot.side,at,yaw),startCoordinate:coordinate,endCoordinate:Math.floor(coordinate)+1};foot.settle=null;foot.contact=false;foot.mode='swing';}
 function evaluateSwing(foot,coordinate){if(!foot.swing)return;const s=foot.swing,t=clamp((coordinate-s.startCoordinate)/(s.endCoordinate-s.startCoordinate),0,1);foot.world=lerpWorld(s.start,s.target,smooth(t));foot.lift=(s.startLift||0)*(1-smooth(t))+Math.sin(Math.PI*t)*stepLift;if(t>=1-1e-9){foot.world=copy(s.target);foot.lift=0;foot.contact=true;foot.mode='stance';foot.swing=null;}}
 function settleFoot(foot,dt){if(!foot.settle){foot.settle={start:copy(foot.world),target:plantable(lateral(foot.side,root,heading,strideLength*.035),foot.side),lift:foot.lift,elapsed:0};foot.swing=null;}const s=foot.settle;s.elapsed+=dt;const t=clamp(s.elapsed/.2,0,1);foot.world=lerpWorld(s.start,s.target,smooth(t));foot.lift=s.lift*(1-smooth(t));foot.contact=false;foot.mode='settle';if(t>=1){foot.world=copy(s.target);foot.lift=0;foot.contact=true;foot.mode='stance';foot.settle=null;}}
 function advanceFeet(previousGait,travel,yawBefore,dt,moving){
  if(moving){
   // Merge both feet's distance crossings in actual chronological order. A
   // low-rate frame may contain one landing followed by the OTHER toe-off;
   // processing a whole left leg before a right leg would skip a real step.
   const events=[];for(const foot of Object.values(feet)){const prior=previousGait+phaseBias+foot.offset,next=gaitCoordinate+phaseBias+foot.offset;for(let cycle=Math.floor(prior)-1;cycle<=Math.floor(next)+1;cycle++){const off=cycle+.62,on=cycle+1;if(off>prior+1e-10&&off<=next+1e-10)events.push({foot,coordinate:off,global:off-foot.offset-phaseBias,type:'off'});if(on>prior+1e-10&&on<=next+1e-10)events.push({foot,coordinate:on,global:on-foot.offset-phaseBias,type:'on'});}}
   events.sort((a,b)=>a.global-b.global||(a.type==='on'?-1:1));
   for(const event of events){const fraction=gaitCoordinate>previousGait?(event.global-previousGait)/(gaitCoordinate-previousGait):1,at=lerpWorld(lastRoot,root,clamp(fraction,0,1)),yaw=yawBefore+angleDelta(yawBefore,heading)*fraction;
    if(event.type==='off')beginSwing(event.foot,at,yaw,event.coordinate);else if(event.foot.swing)evaluateSwing(event.foot,event.coordinate);
   }
  }
  for(const foot of Object.values(feet)){const next=gaitCoordinate+phaseBias+foot.offset;if(moving){if(foot.swing)evaluateSwing(foot,next);else if(foot.settle)settleFoot(foot,dt);}else if(foot.swing||foot.settle)settleFoot(foot,dt);foot.coordinate=next;}
 }
 function standingTurn(dt,moving){
  if(action&&turnFoot){const f=feet[turnFoot];f.settle={start:copy(f.world),target:plantable(lateral(f.side),f.side),lift:f.lift,elapsed:0};delete f.turn;turnFoot=null;}
  if(moving||action)return;
  if(turnFoot){const f=feet[turnFoot],s=f.turn;s.elapsed+=dt;const t=clamp(s.elapsed/.26,0,1);f.world=lerpWorld(s.start,s.target,smooth(t));f.lift=Math.sin(Math.PI*t)*stepLift*.55;f.contact=false;f.mode='turn';if(t>=1){f.world=copy(s.target);f.lift=0;f.contact=true;f.mode='stance';delete f.turn;turnFoot=null;}return;}
  if(Math.abs(angleDelta(standingHeading,heading))<.08)return;
  if(Object.values(feet).some(foot=>!foot.contact||foot.settle||foot.swing))return;
  const candidates=Object.entries(feet).filter(([,f])=>f.contact&&!f.settle&&!f.swing).map(([name,f])=>({name,foot:f,target:plantable(lateral(f.side),f.side)})).sort((a,b)=>worldDistance(b.foot.world,b.target)-worldDistance(a.foot.world,a.target));
  const next=candidates[0];if(next&&worldDistance(next.foot.world,next.target)>4/unitsToPixels){turnFoot=next.name;next.foot.turn={start:copy(next.foot.world),target:next.target,elapsed:0};next.foot.contact=false;next.foot.mode='turn';}else standingHeading=heading;
 }
 function currentAction(){if(!action)return{kind:'locomotion',stage:'idle',progress:0};let elapsed=action.elapsed;for(const[stage,duration]of ACTION){if(elapsed<=duration)return{kind:'attack',stage,progress:clamp(elapsed/duration,0,1),elapsed:action.elapsed,duration:ACTION_DURATION};elapsed-=duration;}return{kind:'locomotion',stage:'idle',progress:0};}
 function buildPose(speed,moving){
  const selectedView=selectOwnerView(manifest,heading-groundYaw),authoredView=manifest?.views?.[selectedView.key],geometry=blendedGeometry(manifest,heading-groundYaw,baseDimensions,baseSides,baseLegSides),dimensions=geometry.dimensions,sides=geometry.sides;
  for(const value of Object.values(dimensions))if(!Number.isFinite(value)||value<=0)throw new TypeError('Invalid authored-view skeleton dimensions');
  const rotateGround=(x,z)=>({x:(x*Math.cos(groundYaw)-z*Math.sin(groundYaw))*unitsToPixels,z:(x*Math.sin(groundYaw)+z*Math.cos(groundYaw))*unitsToPixels}),gaitPhase=mod(gaitCoordinate*TAU,TAU),left=feet.left,right=feet.right,foot3D=f=>({...rotateGround(f.world.x-root.x,f.world.z-root.z),y:f.lift*unitsToPixels}),project=p=>({x:p.x,y:-p.y+p.z*depthScale}),footPixel=f=>project(foot3D(f));
  const targetLeft=footPixel(left),targetRight=footPixel(right),support=[left,right].filter(f=>f.contact),pelvisX=clamp(support.length===1?footPixel(support[0]).x*.13:0,-3.5,3.5),reach=dimensions.thigh+dimensions.shin-1;
  const target3DLeft=foot3D(left),target3DRight=foot3D(right);
  let hipHeight=dimensions.hipHeight;for(const[target,side]of[[target3DLeft,'left'],[target3DRight,'right']]){const dx=target.x-(pelvisX+geometry.hips[side]);hipHeight=Math.min(hipHeight,target.y+Math.sqrt(Math.max(1,reach*reach-dx*dx-target.z*target.z)));}
  hipHeight=Math.max(36,hipHeight);const pelvis={x:pelvisX,y:-hipHeight};
  const hip3D={left:{x:pelvis.x+geometry.hips.left,y:hipHeight,z:0},right:{x:pelvis.x+geometry.hips.right,y:hipHeight,z:0}},pole={x:Math.sin(heading-groundYaw),y:0,z:Math.cos(heading-groundYaw)},chainLeft=solveTwoBone3D(hip3D.left,target3DLeft,dimensions.thigh,dimensions.shin,{pole}),chainRight=solveTwoBone3D(hip3D.right,target3DRight,dimensions.thigh,dimensions.shin,{pole});
  const hips={left:project(hip3D.left),right:project(hip3D.right)},legLeft={joint:project(chainLeft.joint),end:project(chainLeft.end)},legRight={joint:project(chainRight.joint),end:project(chainRight.end)};
  const shoulders={left:{x:pelvis.x+geometry.shoulders.left,y:pelvis.y-dimensions.shoulderHeight},right:{x:pelvis.x+geometry.shoulders.right,y:pelvis.y-dimensions.shoulderHeight}},neck={x:pelvis.x,y:pelvis.y-dimensions.neckHeight};
  const amplitude=moving?clamp(speed/2,0,1):0,swing=Math.sin(gaitPhase)*10*amplitude,breath=Math.sin(time*1.8)*.65;
  const restLeft=geometry.hands.left,restRight=geometry.hands.right;
  const idleOffset=side=>{const value=geometry.idles[side];if(!value)return{x:0,y:0};const phase=Math.sin(time*value.frequency+value.phase);return{x:value.amplitude[0]*phase,y:value.amplitude[1]*phase};},idleLeft=idleOffset('left'),idleRight=idleOffset('right');
  let leftHand={x:pelvis.x+restLeft[0]+sides.left*swing*.25+idleLeft.x,y:pelvis.y+restLeft[1]+swing+idleLeft.y},rightHand={x:pelvis.x+restRight[0]+idleRight.x,y:pelvis.y+restRight[1]+(geometry.idles.right?idleRight.y:breath)},lanternRotation=Math.sin(gaitPhase)*.025*amplitude;
  const act=currentAction();
  if(act.kind==='attack'){
   const key={charge:.4+act.progress*.3,ready:.7,circle:.7,release:.7+act.progress*.3,impact:1,recovery:1-smooth(act.progress)}[act.stage],amount=clamp(key,0,1);
   rightHand={x:mix(pelvis.x+restRight[0],pelvis.x+sides.right*72,amount),y:mix(pelvis.y+restRight[1],pelvis.y-99,amount)};leftHand={x:mix(pelvis.x+restLeft[0],pelvis.x+sides.left*43,amount),y:mix(pelvis.y+restLeft[1],pelvis.y-66,amount)};lanternRotation=mix(0,sides.right*.3,amount);
  }
  const armLeft=solveTwoBone(shoulders.left,leftHand,dimensions.upperArm,dimensions.forearm,{bend:-baseSides.left}),armRight=solveTwoBone(shoulders.right,rightHand,dimensions.upperArm,dimensions.forearm,{bend:-baseSides.right});
  const joints={pelvis,neck,leftHip:hips.left,leftKnee:legLeft.joint,leftAnkle:legLeft.end,rightHip:hips.right,rightKnee:legRight.joint,rightAnkle:legRight.end,leftShoulder:shoulders.left,leftElbow:armLeft.joint,leftWrist:armLeft.end,rightShoulder:shoulders.right,rightElbow:armRight.joint,rightWrist:armRight.end};
  const layers=[],part=(name,origin,height,rotation=0)=>layers.push({part:name,origin:{...origin},height,rotation,scaleX:1,scaleY:1}),bone=(name,a,b)=>{part(name,a,distance2(a,b),Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2);layers.at(-1).boneEnd={...b};};
  const extraParts=authoredView?.appendages??manifest?.appendages??manifest?.motionParts??[];
  const appendages=where=>{for(const item of Array.isArray(extraParts)?extraParts:[]){if((item.layer||'backHair')!==where||item.visible===false||!item.part)continue;const anchor=joints[item.anchor||'neck'],offset=item.offset||[0,0];if(!anchor||!Number.isFinite(item.height)||item.height<=0||!offset.every(Number.isFinite))continue;const rotation=finite(item.rotation)+Math.sin(time*finite(item.frequency,1.5)+finite(item.phase))*finite(item.amplitude,.025),origin={x:anchor.x+offset[0],y:anchor.y+offset[1]};part(item.part,origin,item.height,rotation);if(typeof item.joint==='string'&&item.joint&&!Object.hasOwn(joints,item.joint))joints[item.joint]={x:origin.x-Math.sin(rotation)*item.height,y:origin.y+Math.cos(rotation)*item.height};}};
  part('backHair',neck,dimensions.hairHeight,Math.sin(time*1.1)*.012);part('backSkirtTails',{x:pelvis.x,y:pelvis.y-dimensions.waistOffset},dimensions.tailsHeight,Math.sin(gaitPhase-.3)*.025*amplitude);
  appendages('backHair');
  bone('rightUpperLeg',hips.right,legRight.joint);bone('rightLowerLegBoot',legRight.joint,legRight.end);bone('leftUpperLeg',hips.left,legLeft.joint);bone('leftLowerLegBoot',legLeft.joint,legLeft.end);
  bone('rightUpperArm',shoulders.right,armRight.joint);bone('rightForearmHand',armRight.joint,armRight.end);
  part('bodiceTorso',neck,dimensions.torsoHeight);part('pelvisFrontSkirt',{x:pelvis.x,y:pelvis.y-dimensions.waistOffset},dimensions.skirtHeight);
  bone('leftUpperArm',shoulders.left,armLeft.joint);bone('leftForearmHand',armLeft.joint,armLeft.end);
  const viewHeading=finite(authoredView?.heading,VIEW_HEADINGS[selectedView.key]??0);
  part('head',neck,dimensions.headHeight,clamp(angleDelta(viewHeading,heading-groundYaw),-.9,.9)*.045);part('leftFrontHair',neck,dimensions.frontHairHeight,Math.sin(time*1.3+.4)*.015);part('rightFrontHair',neck,dimensions.frontHairHeight,Math.sin(time*1.3-.4)*.015);
  appendages('front');
  part('lantern',armRight.end,dimensions.lanternHeight,lanternRotation);
  const joints3D={leftHip:hip3D.left,leftKnee:chainLeft.joint,leftAnkle:chainLeft.end,rightHip:hip3D.right,rightKnee:chainRight.joint,rightAnkle:chainRight.end},view=selectedView,pose={version:++version,root:copy(root),heading,time,distance,gaitPhase,speed,moving,view:view.key,projection:{unitsToPixels,depthScale,groundYaw,strideLength,footSpacing,stepLift},feet:{left:{world:copy(left.world),lift:left.lift,contact:left.contact,mode:left.mode},right:{world:copy(right.world),lift:right.lift,contact:right.contact,mode:right.mode}},joints,joints3D,limbLengths:{thigh:dimensions.thigh,shin:dimensions.shin,upperArm:dimensions.upperArm,forearm:dimensions.forearm},lantern:{grip:{...armRight.end},rotation:lanternRotation},layers,action:act,artwork:{directions:Object.keys(manifest?.views||{}).length?Object.keys(manifest.views):manifest?.directions||['down-threequarter'],requestedView:view.requested,usingFallbackView:view.fallback,continuousTurnComplete:manifest?.continuousTurnComplete===true,attackArtComplete:manifest?.attackArtComplete===true},diagnostics:{leftFootReach:distance2(legLeft.end,targetLeft),rightFootReach:distance2(legRight.end,targetRight)}};
  return pose;
 }
 const api={
  update({position=root,dt=0,heading:desiredHeading,moving,motion=true,attack=false,worldPixelsPerUnit,displayHeightPx,groundDepthScale,worldStrideLength,groundYaw:cameraYaw}={}){
   if(disposed)throw Error('Owner rig is disposed');if(![position?.x,position?.z,dt].every(Number.isFinite)||dt<0)throw new TypeError('Finite world position and non-negative dt are required');
   if(worldPixelsPerUnit!==undefined||displayHeightPx!==undefined){if(!Number.isFinite(worldPixelsPerUnit)||worldPixelsPerUnit<=0||!Number.isFinite(displayHeightPx)||displayHeightPx<=0)throw new TypeError('Both world pixel scale and actual displayed body height are required');unitsToPixels=worldPixelsPerUnit*(manifest?.contentHeight||256)/displayHeightPx;strideLength=Number.isFinite(worldStrideLength)&&worldStrideLength>0?worldStrideLength:(baseDimensions.thigh+baseDimensions.shin)*1.35/unitsToPixels;footSpacing=baseDimensions.hipHalfWidth*1.15/unitsToPixels;stepLift=(baseDimensions.thigh+baseDimensions.shin)*.14/unitsToPixels;if(!projectionInitialized&&initialized&&distance===0&&gaitCoordinate===0)initialize(position,finite(desiredHeading,heading));projectionInitialized=true;}
   if(groundDepthScale!==undefined){if(!Number.isFinite(groundDepthScale)||groundDepthScale<=0)throw new TypeError('Positive ground projection depth is required');depthScale=groundDepthScale;}
   if(cameraYaw!==undefined){if(!Number.isFinite(cameraYaw))throw new TypeError('Finite ground-plane orientation is required');groundYaw=cameraYaw;}
   const step=Math.min(dt,.1),previousGait=gaitCoordinate,yawBefore=heading;if(!initialized)initialize(position,finite(desiredHeading));lastRoot=copy(root);const travel=worldDistance(position,root);root=copy(position);
   if(travel>teleportDistance){initialize(position,finite(desiredHeading,heading));lastPose=buildPose(0,false);return lastPose;}
   distance+=travel;gaitCoordinate+=travel/strideLength;if(motion)time+=step;const isMoving=moving!==false&&travel>1e-9,speed=step?travel/step:0,targetHeading=finite(desiredHeading,travel>1e-9?Math.atan2(root.x-lastRoot.x,root.z-lastRoot.z):heading);heading+=angleDelta(heading,targetHeading)*(1-Math.exp(-step/.12));
   if(attack)api.requestAttack();if(action){action.elapsed+=step;if(action.elapsed>=ACTION_DURATION)action=null;}
   if(isMoving&&turnFoot){const f=feet[turnFoot];f.swing=null;f.settle={start:copy(f.world),target:plantable(lateral(f.side),f.side),lift:f.lift,elapsed:0};delete f.turn;turnFoot=null;}
   if(isMoving&&!wasMoving){const entries=Object.entries(feet),direction={x:(root.x-lastRoot.x)/travel,z:(root.z-lastRoot.z)/travel},selected=entries.find(([,foot])=>!foot.contact)||entries.map(([name,foot])=>({name,foot,behind:(foot.world.x-lastRoot.x)*direction.x+(foot.world.z-lastRoot.z)*direction.z})).sort((a,b)=>a.behind-b.behind)[0],foot=Array.isArray(selected)?selected[1]:selected.foot;phaseBias=Math.floor(previousGait+phaseBias)+.62-foot.offset-previousGait;foot.swing=null;foot.settle=null;delete foot.turn;beginSwing(foot,lastRoot,Math.atan2(direction.x,direction.z),previousGait+phaseBias+foot.offset);}
   advanceFeet(previousGait,travel,yawBefore,step,isMoving);standingTurn(step,isMoving);if(isMoving)standingHeading=heading;wasMoving=isMoving;lastPose=buildPose(speed,isMoving);return lastPose;
  },
  requestAttack(){if(disposed||action)return false;action={elapsed:0};return true;},snapshot:()=>lastPose,
  seekAction(elapsedSeconds,{position=root,heading:yaw=heading,motion=true}={}){if(disposed)throw Error('Owner rig is disposed');if(![elapsedSeconds,position?.x,position?.z,yaw].every(Number.isFinite)||elapsedSeconds<0)throw new TypeError('A finite non-negative action age and position are required');distance=0;gaitCoordinate=0;phaseBias=0;wasMoving=false;time=motion?elapsedSeconds:0;turnFoot=null;initialize(position,yaw);action=elapsedSeconds<ACTION_DURATION?{elapsed:motion?elapsedSeconds:1.43}:null;lastPose=buildPose(0,false);return lastPose;},
  reset(position={x:0,z:0},yaw=0){if(disposed)throw Error('Owner rig is disposed');distance=0;gaitCoordinate=0;phaseBias=0;wasMoving=false;time=0;action=null;turnFoot=null;initialize(position,yaw);lastPose=buildPose(0,false);return lastPose;},
  destroy(){disposed=true;lastPose=null;feet.left=null;feet.right=null;action=null;turnFoot=null;},
 };
 return api;
}

/** Draw measured alpha-tight cells. Pivots/endpoints are LOCAL to the rect.
 * Segment parts are rotated from their authored pivot→end vector, so art may
 * occupy any angle in a cell. All joints keep their painted hidden overlaps.
 */
export function drawOwnerPose(context,atlas,manifest,pose,{x=0,y=0,scale=1,alpha=1}={}){
 if(!context||!atlas||!pose||!manifest)return false;const view=manifest.views?.[pose.view],parts=view?.parts||manifest.parts;if(!parts)return false;context.save();context.translate(x,y);context.scale(scale,scale);context.globalAlpha*=alpha;
 for(const layer of pose.layers){const part=parts[layer.part];if(!part||part.visible===false)continue;const rect=part.rect||part.frame,pivot=part.pivot;if(!Array.isArray(rect)||rect.length!==4||!Array.isArray(pivot)||pivot.length!==2)continue;
  const atlasKey=part.atlas||view?.atlas||manifest.atlas,source=atlasKey?(atlas[atlasKey]||atlas.images?.[atlasKey]||(Number.isFinite(atlas.width)?atlas:null)):atlas;if(!source)continue;
  const end=part.end,sourceLength=end?Math.hypot(end[0]-pivot[0],end[1]-pivot[1]):part.contentHeight||rect[3],ratio=layer.height/sourceLength,authoredAngle=end?Math.atan2(end[1]-pivot[1],end[0]-pivot[0])-Math.PI/2:0;
  context.save();context.translate(layer.origin.x,layer.origin.y);context.rotate(layer.rotation-authoredAngle+(part.rotationOffset||0));context.scale(ratio*layer.scaleX,ratio*layer.scaleY);context.drawImage(source,...rect,-pivot[0],-pivot[1],rect[2],rect[3]);context.restore();
 }context.restore();return true;
}

/** Bounded LRU for explicit baked samples; live actors should use createLiveComposer.
 * No per-frame image encoding, textures, or unreleased canvases are created.
 */
export function createFrameComposer({makeCanvas,renderFrame,maxFrames=32}={}){
 if(typeof makeCanvas!=='function'||typeof renderFrame!=='function'||!Number.isInteger(maxFrames)||maxFrames<1)throw new TypeError('Canvas factory, renderer and a positive cache budget are required');let disposed=false;const frames=new Map();
 const release=canvas=>{canvas.width=0;canvas.height=0;};
 return{get(key,{width=256,height=320,...data}={}){if(disposed)throw Error('Frame composer is disposed');const identity=JSON.stringify([key,width,height]);if(frames.has(identity)){const canvas=frames.get(identity);frames.delete(identity);frames.set(identity,canvas);return canvas;}const canvas=makeCanvas(width,height);canvas.width=width;canvas.height=height;try{renderFrame(canvas,data);}catch(error){release(canvas);throw error;}frames.set(identity,canvas);while(frames.size>maxFrames){const first=frames.keys().next().value;release(frames.get(first));frames.delete(first);}return canvas;},clear(){for(const canvas of frames.values())release(canvas);frames.clear();},destroy(){this.clear();disposed=true;},status:()=>({frames:frames.size,maxFrames,disposed})};
}

/** One mutable Canvas per active actor. A 3D adapter owns ONE texture for it and
 * updates texture.needsUpdate whenever poseVersion changes; it must not key a
 * new texture on every pose. The ground anchor remains stable across movement.
 */
export function createLiveComposer({makeCanvas,atlas,manifest,width=256,height=320,scale=1,anchorX=.5,anchorY=.94,contentHeight=manifest?.contentHeight||256}={}){
 if(typeof makeCanvas!=='function')throw new TypeError('Canvas factory is required');const canvas=makeCanvas(width,height);canvas.width=width;canvas.height=height;let disposed=false,poseVersion=-1;
 return{canvas,render(pose){if(disposed)throw Error('Live composer is disposed');if(!pose||pose.version===poseVersion)return false;const context=canvas.getContext('2d');context.clearRect(0,0,width,height);drawOwnerPose(context,atlas,manifest,pose,{x:width*anchorX,y:height*anchorY,scale});poseVersion=pose.version;return true;},sprite(){return{image:canvas,frame:[0,0,width,height],anchorX,anchorY,contentHeight:contentHeight*scale,poseVersion};},destroy(){canvas.width=0;canvas.height=0;disposed=true;},status:()=>({canvases:disposed?0:1,poseVersion,disposed})};
}
