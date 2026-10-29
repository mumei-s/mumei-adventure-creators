/** Articulated original-art queen. Coordinates are authored in character-height
 * units, with +y down and the planted ground at y=1. Each limb is a separately
 * painted atlas part; joints rotate those parts without stretching the face. */
const TAU=Math.PI*2;
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const point=(x,y)=>({x,y});
const end=(origin,length,angle)=>point(origin.x+Math.sin(angle)*length,origin.y+Math.cos(angle)*length);
const angle=(a,b)=>Math.atan2(b.x-a.x,b.y-a.y);
const STATES=new Set(['idle','seated','stand','walk','attack','special','hit','defeat']);

export const OVERLORD_ART_PART_NAMES=Object.freeze([
 'head','torso','pelvis','cape','upperArmL','forearmL','handL','upperArmR',
 'forearmR','handR','thighL','shinL','footL','thighR','shinR','footR',
]);
const ATLAS_EDGE=1254;
const SOURCE_RECTS=[[5,3,306,311],[364,7,223,307],[641,79,286,228],[940,6,307,306],[55,314,179,307],[428,314,105,307],[711,336,139,265],[1020,323,180,298],[96,639,110,290],[394,641,138,299],[714,630,151,310],[1049,630,104,301],[80,948,149,291],[399,940,141,303],[732,940,108,300],[1025,948,149,291]];
const cell=index=>SOURCE_RECTS[index].map(value=>value/ATLAS_EDGE);
const sizes={head:[.25,.25],torso:[.21,.27],pelvis:[.22,.17],cape:[.57,.74],
 upperArmL:[.105,.185],upperArmR:[.105,.185],forearmL:[.062,.173],forearmR:[.062,.173],
 handL:[.061,.108],handR:[.061,.108],thighL:[.115,.225],thighR:[.115,.225],
 shinL:[.091,.229],shinR:[.091,.229],footL:[.074,.105],footR:[.074,.105]};
const pivots={head:[.5,.91],torso:[.5,.11],pelvis:[.5,.12],cape:[.5,.03]};
const AXES={upperArmL:[[.737,.07],[.369,.95]],upperArmR:[[.261,.07],[.628,.95]],forearmL:[[.448,.07],[.562,.95]],forearmR:[[.482,.06],[.391,.95]],handL:[[.482,.064],[.482,.94]],handR:[[.522,.06],[.522,.94]],thighL:[[.457,.07],[.623,.94]],thighR:[[.511,.07],[.369,.94]],shinL:[[.54,.045],[.567,.95]],shinR:[[.546,.045],[.509,.95]],footL:[[.423,.07],[.785,.93]],footR:[[.584,.07],[.215,.93]]};
/** Override source/size/pivot after measuring the alpha bounds of the atlas.
 * source=[u,v,width,height] is normalized; pivot is local to that source crop.
 * Head/torso should use their source aspect, while the cape may be cloth-fitted. */
export const OVERLORD_ART_PARTS=Object.freeze(Object.fromEntries(OVERLORD_ART_PART_NAMES.map((name,index)=>[name,Object.freeze({
 source:Object.freeze(cell(index)),size:Object.freeze(name==='cape'?sizes[name]:[sizes[name][1]*SOURCE_RECTS[index][2]/SOURCE_RECTS[index][3],sizes[name][1]]),pivot:Object.freeze(pivots[name]||AXES[name]?.[0]||[.5,.075]),...(AXES[name]?{axis:AXES[name]}:{}),
})])));

function keyframe(progress,keys){
 for(let i=1;i<keys.length;i++)if(progress<=keys[i][0]){const a=keys[i-1],b=keys[i];return mix(a[1],b[1],ease((progress-a[0])/(b[0]-a[0])));}
 return keys.at(-1)[1];
}
function leg(hip,ankle,side){
 const upper=.199,lower=.206,dx=ankle.x-hip.x,dy=ankle.y-hip.y,d=clamp(Math.hypot(dx,dy),.025,upper+lower-.0001);
 const direction=Math.atan2(dx,dy),bend=Math.acos(clamp((upper*upper+d*d-lower*lower)/(2*upper*d),-1,1));
 const knee=end(hip,upper,direction+side*bend);
 return {knee,upperAngle:angle(hip,knee),lowerAngle:angle(knee,ankle)};
}
function definition(name,parts){
 const base=OVERLORD_ART_PARTS[name],custom=parts?.[name]||{};
 return {...base,...custom,source:custom.source||base.source,size:custom.size||base.size,pivot:custom.pivot||base.pivot};
}
function layerBounds(layers){
 const result={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
 for(const layer of layers){const [w,h]=layer.size,[px,py]=layer.pivot,c=Math.cos(layer.rotation),s=Math.sin(layer.rotation);
  for(const [u,v]of[[0,0],[1,0],[1,1],[0,1]]){const dx=(u-px)*w,dy=(v-py)*h,x=layer.x+c*dx-s*dy,y=layer.y+s*dx+c*dy;result.left=Math.min(result.left,x);result.right=Math.max(result.right,x);result.top=Math.min(result.top,y);result.bottom=Math.max(result.bottom,y);}
 }
 return result;
}

/** Pure, seekable animation pose shared by native Three and Canvas2D battle.
 * attackProgress is the director's full action clock, never projectile travel.
 * motion:false has a deterministic resting pose independent of every clock. */
export function sampleOverlordArtPose(input={}){
 const state=STATES.has(input.state)?input.state:'idle',motion=input.motion!==false;
 const time=motion?finite(input.time,finite(input.elapsed,finite(input.stateElapsed))):0;
 const elapsed=motion?Math.max(0,finite(input.elapsed,finite(input.stateElapsed))):0;
 const progress=motion?clamp(finite(input.attackProgress,elapsed)):0;
 const active=motion?state:'idle',breath=motion?Math.sin(time*1.65):0,sway=motion?Math.sin(time*.93):0;
 let rootX=sway*.006,hipY=.54+breath*.0025,torsoAngle=sway*.012,headAngle=-sway*.010;
 let upperL=-.085+breath*.018,upperR=.085-breath*.018,elbowL=-.065,elbowR=.065,handL=-.025,handR=.025;
 let ankleL=point(-.072,.944),ankleR=point(.072,.944),footAngleL=-.20,footAngleR=.20;
 let capeAngle=motion?Math.sin(time*1.18+.5)*.022:0,capeSpread=1;
 let kneel=0;
 if(active==='walk'){
  const cycle=time*TAU*.85,step=Math.sin(cycle),liftL=Math.max(0,step)*.045,liftR=Math.max(0,-step)*.045;
  ankleL=point(-.073+step*.025,.944-liftL);ankleR=point(.073-step*.025,.944-liftR);
  upperL=-.085-step*.24;upperR=.085+step*.24;elbowL=-.10-Math.max(0,-step)*.16;elbowR=.10+Math.max(0,step)*.16;
  rootX=Math.sin(cycle)*.008;hipY+=Math.cos(cycle*2)*.004;torsoAngle=-step*.025;capeAngle+=step*.045;
 }else if(active==='attack'){
  const wind=keyframe(progress,[[0,0],[.20,1],[.42,.12],[.60,0],[1,0]]),strike=keyframe(progress,[[0,0],[.19,0],[.43,1],[.61,.75],[1,0]]);
  upperR+=wind*1.38-strike*1.15;elbowR+=wind*.28-strike*.85;handR-=strike*.20;
  upperL-=wind*.22+strike*.32;elbowL-=strike*.24;
  rootX-=strike*.022;hipY-=strike*.003;torsoAngle-=wind*.065+strike*.085;headAngle+=strike*.055;
  ankleL.x-=strike*.025;ankleR.x+=strike*.035;footAngleR+=strike*.08;capeAngle-=strike*.09;
 }else if(active==='special'){
  const charge=keyframe(progress,[[0,0],[.23,1],[.52,.92],[1,0]]),release=keyframe(progress,[[0,0],[.23,0],[.38,1],[.56,.82],[1,0]]);
  upperL-=charge*1.20;upperR+=charge*1.20;elbowL-=charge*1.80;elbowR+=charge*1.80;
  // The casting arm sweeps through each blade launch while the other hand
  // remains raised. This is a joint motion, not whole-character translation.
  const cast=release*(.5+.5*Math.sin((progress-.23)*Math.PI*8));
  elbowR-=release*.35+cast*.15;handR-=release*.26;elbowL+=cast*.15;
  hipY+=charge*.0015;torsoAngle+=release*.035;headAngle-=release*.025;rootX+=release*.008;
  ankleL.x-=charge*.018;ankleR.x+=charge*.018;capeAngle+=charge*.055+release*.04;capeSpread+=charge*.12;
 }else if(active==='hit'){
  const recoil=Math.sin(progress*Math.PI);
  rootX+=recoil*.027;hipY+=recoil*.007;torsoAngle+=recoil*.15;headAngle-=recoil*.07;
  upperL-=recoil*.32;upperR+=recoil*.42;elbowL-=recoil*.28;elbowR+=recoil*.24;capeAngle+=recoil*.12;
 }else if(active==='seated'||active==='stand'||active==='defeat'){
  kneel=active==='seated'?1:active==='stand'?1-ease(progress):ease(progress);
  rootX+=kneel*.015;hipY+=kneel*.105;torsoAngle+=kneel*.11;headAngle+=kneel*.08;
  ankleL.x-=kneel*.055;ankleR.x+=kneel*.055;ankleR.y-=kneel*.025;
  upperL-=kneel*.36;upperR+=kneel*.26;elbowL-=kneel*.66;elbowR+=kneel*.48;capeAngle+=kneel*.08;
 }
 const pelvis=point(rootX,hipY-.038),hipL=point(rootX-.058,hipY),hipR=point(rootX+.058,hipY);
 const shoulder=point(rootX+Math.sin(torsoAngle)*.252,hipY-Math.cos(torsoAngle)*.252);
 const shoulderL=point(shoulder.x-.109*Math.cos(torsoAngle),shoulder.y+.109*Math.sin(torsoAngle));
 const shoulderR=point(shoulder.x+.109*Math.cos(torsoAngle),shoulder.y-.109*Math.sin(torsoAngle));
 const neck=point(shoulder.x-Math.sin(torsoAngle)*.029,shoulder.y-.029*Math.cos(torsoAngle));
 const armL=upperL+torsoAngle,armR=upperR+torsoAngle,foreL=armL+elbowL,foreR=armR+elbowR;
 const elbowPointL=end(shoulderL,.162,armL),elbowPointR=end(shoulderR,.162,armR);
 const wristL=end(elbowPointL,.153,foreL),wristR=end(elbowPointR,.153,foreR);
 const legL=leg(hipL,ankleL,-1),legR=leg(hipR,ankleR,1);
 const joints={pelvis,neck,shoulder,shoulderL,shoulderR,elbowL:elbowPointL,elbowR:elbowPointR,wristL,wristR,
  hipL,hipR,kneeL:legL.knee,kneeR:legR.knee,ankleL,ankleR,
  handL:end(wristL,.084,foreL+handL),handR:end(wristR,.084,foreR+handR),
  toeL:end(ankleL,.095,footAngleL),toeR:end(ankleR,.095,footAngleR)};
 const bones={};
 const bone=(name,parent,start,finish,localAngle)=>{bones[name]={parent,start, end:finish,angle:angle(start,finish),localAngle};};
 bone('upperArmL','torso',shoulderL,elbowPointL,upperL);bone('upperArmR','torso',shoulderR,elbowPointR,upperR);
 bone('forearmL','upperArmL',elbowPointL,wristL,elbowL);bone('forearmR','upperArmR',elbowPointR,wristR,elbowR);
 bone('handL','forearmL',wristL,joints.handL,handL);bone('handR','forearmR',wristR,joints.handR,handR);
 bone('thighL','pelvis',hipL,legL.knee,legL.upperAngle);bone('thighR','pelvis',hipR,legR.knee,legR.upperAngle);
 bone('shinL','thighL',legL.knee,ankleL,legL.lowerAngle-legL.upperAngle);bone('shinR','thighR',legR.knee,ankleR,legR.lowerAngle-legR.upperAngle);
 bone('footL','shinL',ankleL,joints.toeL,footAngleL-legL.lowerAngle);bone('footR','shinR',ankleR,joints.toeR,footAngleR-legR.lowerAngle);
 const layers=[],push=(part,origin,partAngle=0)=>{const def=definition(part,input.parts);let size=def.size,rotation=-partAngle,pivot=def.pivot;
  if(def.axis&&bones[part]){const [a,b]=def.axis,aspect=def.source[2]/def.source[3],dx=(b[0]-a[0])*aspect,dy=b[1]-a[1],bone=bones[part],length=Math.hypot(bone.end.x-bone.start.x,bone.end.y-bone.start.y),h=length/Math.hypot(dx,dy);size=[h*aspect,h];pivot=a;rotation+=Math.atan2(dx,dy);}
  layers.push({...def,size,pivot,part,x:origin.x,y:origin.y,rotation,depth:layers.length*.00035});};
 push('cape',neck,capeAngle);layers[0].size=[layers[0].size[0]*capeSpread,layers[0].size[1]];
 for(const side of['L','R']){for(const name of['thigh','shin','foot']){const b=bones[name+side];push(name+side,b.start,b.angle);}}
 push('pelvis',pelvis,torsoAngle*.28);push('torso',shoulder,torsoAngle);
 for(const side of['L','R'])for(const name of['upperArm','forearm','hand']){const b=bones[name+side];push(name+side,b.start,b.angle);}
 push('head',neck,torsoAngle+headAngle);
 return {state,elapsed,progress,motion,joints,bones,layers,bounds:layerBounds(layers),kneel};
}

/** Draw with x/y at the character's planted ground and height in CSS pixels. */
export function drawOverlordArtRig(context,image,{x=0,y=0,height=256,pose,...input}={}){
 const width=image?.naturalWidth||image?.width,imageHeight=image?.naturalHeight||image?.height;
 if(!context||!width||!imageHeight||!Number.isFinite(height)||height<=0)return false;
 const current=pose||sampleOverlordArtPose(input);
 context.save();context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
 for(const layer of current.layers){const [u,v,sw,sh]=layer.source,[w,h]=layer.size,[px,py]=layer.pivot;
  context.save();context.translate(x+layer.x*height,y+(layer.y-1)*height);context.rotate(layer.rotation);
  context.drawImage(image,u*width,v*imageHeight,sw*width,sh*imageHeight,-px*w*height,-py*h*height,w*height,h*height);context.restore();
 }
 context.restore();return true;
}

/** Sixteen small planes share one texture/material; no dynamic canvas upload.
 * Call update({...poseInputs,camera}) after moving/yawing the actor's parent. */
export function createOverlordArtRig(THREE,{image,height=3.05,parts,renderOrder=0}={}){
 const group=new THREE.Group();group.name='Overlord S articulated original-art body';group.scale.setScalar(height);
 const texture=new THREE.Texture();texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;
 const material=new THREE.MeshBasicMaterial({map:texture,color:0xffffff,transparent:true,alphaTest:.025,depthWrite:false,depthTest:true,toneMapped:false,fog:false,side:THREE.DoubleSide});
 const rest=sampleOverlordArtPose({motion:false,parts}),restLayers=new Map(rest.layers.map(layer=>[layer.part,layer]));
 const meshes=new Map(),worldQuaternion=new THREE.Quaternion(),parentQuaternion=new THREE.Quaternion();let dead=false,currentImage=null,pose;
 for(const name of OVERLORD_ART_PART_NAMES){const def=restLayers.get(name),[width,partHeight]=def.size,[px,py]=def.pivot,geometry=new THREE.PlaneGeometry(width,partHeight),uv=geometry.attributes.uv,[u,v,w,h]=def.source;
  geometry.translate((.5-px)*width,(py-.5)*partHeight,0);
  for(let i=0;i<uv.count;i++)uv.setXY(i,u+uv.getX(i)*w,1-v-h+uv.getY(i)*h);uv.needsUpdate=true;
  const mesh=new THREE.Mesh(geometry,material);mesh.name='queen-'+name;mesh.frustumCulled=false;mesh.renderOrder=renderOrder;group.add(mesh);meshes.set(name,mesh);
 }
 function setImage(next){const base=next?.image||next;if(dead||!base||!(base.width||base.naturalWidth)||!(base.height||base.naturalHeight))return false;if(base!==currentImage){currentImage=base;texture.image=base;texture.needsUpdate=true;}group.visible=true;return true;}
 function setFacing(camera){if(dead||!camera)return;camera.getWorldQuaternion?.(worldQuaternion)||worldQuaternion.copy(camera.quaternion);if(group.parent){group.parent.getWorldQuaternion(parentQuaternion);parentQuaternion.invert();group.quaternion.copy(parentQuaternion.multiply(worldQuaternion));}else group.quaternion.copy(worldQuaternion);}
 function update(input={}){if(dead)return pose;pose=sampleOverlordArtPose({...input,parts:input.parts||parts});
  for(const layer of pose.layers){const mesh=meshes.get(layer.part),base=restLayers.get(layer.part);mesh.position.set(layer.x,1-layer.y,layer.depth);mesh.rotation.z=-layer.rotation;mesh.scale.set(layer.size[0]/base.size[0],layer.size[1]/base.size[1],1);}
  if(input.camera)setFacing(input.camera);return pose;
 }
 group.visible=false;if(image)setImage(image);update({motion:false});
 function dispose(){if(dead)return;dead=true;group.removeFromParent();for(const mesh of meshes.values())mesh.geometry.dispose();texture.dispose();material.dispose();}
 return {group,root:group,meshes,parts:meshes,material,texture,setImage,setFacing,update,dispose,get pose(){return pose;},get image(){return currentImage;}};
}
