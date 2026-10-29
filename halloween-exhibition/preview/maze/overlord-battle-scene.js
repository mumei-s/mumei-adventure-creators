import * as THREE from './vendor/three.module.js';
import {overlordBattleDirector} from './overlord-battle-director.js?v=20261029-overlord5';
import {createOverlordStageEffects} from './overlord-stage-fx.js?v=20261029-overlord5';
import {createOverlordBoss} from './overlord-boss.js?v=20261029-overlord5';
import {attachOverlordMaterials} from './overlord-materials.js?v=20261029-overlord5';
import {createOverlordThrone,createOverlordHall} from './overlord-room.js?v=20261029-overlord5';
import {playerPose} from './rpg-art.js?v=20261019-unified1';

/** Resolved turn timing drives the performance; a peaceful bow cannot attack. */
export function overlordBattleCue({battle,effect,time=0,motion=true,start=0}){
 const entrance=effect?2.6:Math.max(0,time-start),intro=motion?Math.min(1,entrance/2.6):1;
 const age=effect?Math.max(0,time-effect.started):99;
 const counter=!!effect&&age>1.4&&age<2.9&&!effect.finished&&(effect.retaliation>0||effect.blocked>0);
 const counterProgress=counter?(age-1.4)/1.5:0;
 let state=intro<1?(entrance<.28?'seated':entrance<1.55?'stand':'walk'):battle.status==='won'&&age>=1.1?'defeat':counter?(effect.counterSpecial?'special':'attack'):'idle';
 let phase=intro<1?'entrance':battle.status==='won'?'victory':!effect?'idle':age<.4?'player-charge':age<1.1?'player-impact':counter?(counterProgress<.28?'charge':counterProgress<.7?'cast':'impact'):'settle';
 if(effect&&age>.4&&age<1.1&&effect.damage)state='hit';
 return {intro,age,counter,state,phase,walkProgress:intro===1?1:Math.max(0,Math.min(1,(entrance-1.55)/1.05)),counterProgress,
  attackProgress:counter?counterProgress:Math.min(1,Math.max(0,(age-.4)/.7))};
}

// Negative X sees the front three-quarter face of a boss aiming toward the hero.
const battleCameraDirection=new THREE.Vector3(-2.7,1.2,7.6).normalize();
const battleCameraRight=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),battleCameraDirection).normalize();
const battleCameraUp=new THREE.Vector3().crossVectors(battleCameraDirection,battleCameraRight).normalize();
export function overlordAimYaw(source,target){return Math.atan2(target.x-source.x,target.z-source.z);}
export function overlordBattleLayout(aspect){
 const narrow=aspect<.9;
 return {boss:{x:.45,y:.065,z:.2},hero:{x:narrow?-.38:-.5,y:.071,z:narrow?1.15:1.2},heroHeight:narrow?.78:.88,
  swordSpread:THREE.MathUtils.clamp(aspect/.95,.65,1),cameraDirection:battleCameraDirection.clone()};
}
/** Tight projected geometry avoids the empty corners of a rotated world AABB. */
export function fitOverlordBattlePoints(camera,points,aspect,{margin=.88,minDistance=2.7}={}){
 let minR=Infinity,maxR=-Infinity,minU=Infinity,maxU=-Infinity,minD=Infinity,maxD=-Infinity;
 const point=new THREE.Vector3();
 for(let i=0;i<points.length;i+=3){point.fromArray(points,i);const r=point.dot(battleCameraRight),u=point.dot(battleCameraUp),d=point.dot(battleCameraDirection);minR=Math.min(minR,r);maxR=Math.max(maxR,r);minU=Math.min(minU,u);maxU=Math.max(maxU,u);minD=Math.min(minD,d);maxD=Math.max(maxD,d);}
 const rCenter=(minR+maxR)/2,uCenter=(minU+maxU)/2,dCenter=(minD+maxD)/2;
 const center=new THREE.Vector3().addScaledVector(battleCameraRight,rCenter).addScaledVector(battleCameraUp,uCenter).addScaledVector(battleCameraDirection,dCenter);
 const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*margin,horizontal=vertical*Math.max(.1,aspect);
 let distance=minDistance;
 for(let i=0;i<points.length;i+=3){point.fromArray(points,i).sub(center);const depth=point.dot(battleCameraDirection);distance=Math.max(distance,depth+Math.abs(point.dot(battleCameraRight))/horizontal,depth+Math.abs(point.dot(battleCameraUp))/vertical);}
 camera.aspect=aspect;camera.far=Math.max(40,distance+maxD-minD+12);camera.position.copy(center).addScaledVector(battleCameraDirection,distance);camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld();return distance;
}
/** Generic bounds fit remains available for layout validation and other callers. */
export function fitOverlordBattleCamera(camera,bounds,aspect,options){
 const corners=[];for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z])corners.push(x,y,z);
 return fitOverlordBattlePoints(camera,corners,aspect,options);
}
/** Snapshot the queen's solid body, ignoring decorative sword tips when framing. */
export function overlordBattleActorGeometry(actor){
 const root=actor.group,swords=actor.swords||[];root.updateMatrixWorld(true);const nodes=[];let count=0;
 root.traverseVisible(node=>{
  if(!node.isMesh)return;for(let parent=node;parent&&parent!==root;parent=parent.parent)if(swords.includes(parent))return;
  nodes.push(node);count+=node.geometry.attributes.position.count;
 });
 const positions=new Float32Array(count*3),point=new THREE.Vector3();let offset=0;
 for(const node of nodes){const attribute=node.geometry.attributes.position;for(let i=0;i<attribute.count;i++){
  if(node.isSkinnedMesh)node.getVertexPosition(i,point);else point.fromBufferAttribute(attribute,i);point.applyMatrix4(node.matrixWorld);positions[offset++]=point.x;positions[offset++]=point.y;positions[offset++]=point.z;
 }}
 return {positions};
}
export function overlordBattleActorPoints(geometry,layout,rootScale){
 const rootMatrix=new THREE.Matrix4().compose(new THREE.Vector3(layout.boss.x,layout.boss.y,layout.boss.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),overlordAimYaw(layout.boss,layout.hero)),rootScale);
 const points=new Float32Array(geometry.positions.length+36),point=new THREE.Vector3();let offset=0;
 for(let i=0;i<geometry.positions.length;i+=3){point.fromArray(geometry.positions,i).applyMatrix4(rootMatrix);points[offset++]=point.x;points[offset++]=point.y;points[offset++]=point.z;}
 return {points,offset};
}
/** Move clear of the physical seat before straightening the knees. */
export function overlordRisePlacement({state,stateElapsed=0,walkProgress=1,standDuration=1.1}={}){
 const walk=THREE.MathUtils.clamp(Number.isFinite(walkProgress)?walkProgress:1,0,1);
 const duration=Number.isFinite(standDuration)&&standDuration>0?standDuration:1.1;
 const progress=THREE.MathUtils.clamp(Number.isFinite(stateElapsed)?stateElapsed/duration:0,0,1);
 const rise=state==='seated'?0:state==='stand'?THREE.MathUtils.smoothstep(progress,0,.55):1;
 return {advance:.60*rise*(1-walk),lift:state==='stand'?.04*Math.sin(Math.PI*progress):0};
}
/** Five staggered cuts follow the same source-to-target line as the real blades. */
export function overlordSpecialArc({index,progress,source,target,counter,motion=true}){
 const begin=.19+index*.025,end=.84+index*.025,travel=Math.max(0,Math.min(1,(progress-begin)/.48)),yaw=overlordAimYaw(source,target),lateral=(index-2)*.10;
 return {visible:!!(motion&&counter&&progress>begin&&progress<end),yaw,scale:.38+index*.055+Math.sin(travel*Math.PI)*.18,
  opacity:Math.sin(Math.min(1,travel)*Math.PI)*.65+.2,
  x:source.x+(target.x-source.x)*travel+Math.cos(yaw)*lateral,
  y:source.y+1.45+(target.y-source.y-.3)*travel+Math.sin(travel*Math.PI)*.17,
  z:source.z+(target.z-source.z)*travel-Math.sin(yaw)*lateral};
}

/** Soft studio reflections make black metal readable without turning it grey. */
function createReflectionEnvironment(renderer,resources){
 const width=128,height=64,pixels=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height;
  const soft=(a,b,sx,sy)=>Math.exp(-((u-a)**2/sx+(v-b)**2/sy));
  const warm=soft(.18,.28,.007,.026),white=soft(.72,.36,.013,.045),crimson=soft(.5,.45,.025,.03),sky=Math.max(0,1-v);
  const i=(y*width+x)*4;
  pixels[i]=Math.min(255,24+warm*210+white*145+crimson*80+sky*18);
  pixels[i+1]=Math.min(255,17+warm*162+white*165+sky*20);
  pixels[i+2]=Math.min(255,26+warm*100+white*205+crimson*22+sky*30);pixels[i+3]=255;
 }
 const texture=new THREE.DataTexture(pixels,width,height);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;resources.add(texture);
 const generator=new THREE.PMREMGenerator(renderer);try{generator.compileEquirectangularShader();const environment=generator.fromEquirectangular(texture);resources.add(environment);return environment.texture;}finally{generator.dispose();}
}
function shadowTexture(resources){
 const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;pixels[i+3]=Math.round(Math.max(0,1-r)**2*180);}
 const texture=new THREE.DataTexture(pixels,size,size);texture.needsUpdate=true;resources.add(texture);return texture;
}

/** Small screens retain face detail; large buffers stay within a mobile pixel budget. */
export function overlordBattlePixelRatio(width,height,deviceRatio=1){
 const w=Number.isFinite(width)?Math.max(1,width):360,h=Number.isFinite(height)?Math.max(1,height):260,dpr=Number.isFinite(deviceRatio)?Math.max(.1,deviceRatio):1;
 return Math.min(dpr,w<=640?2:1.5,Math.sqrt(1200000/(w*h)));
}

/** Native actor, gothic hall and timed attacks; no reference card is projected. */
export function createOverlordBattleScene({canvas,art,onLost=()=>{}}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
 const scene=new THREE.Scene(),resources=new Set();scene.background=new THREE.Color('#0a080e');scene.fog=new THREE.Fog('#0a080e',12,25);scene.environmentIntensity=.58;
 try{scene.environment=createReflectionEnvironment(renderer,resources);}catch{ /* Direct lighting remains usable on restricted mobile drivers. */ }
 const camera=new THREE.PerspectiveCamera(31,1,.08,45),baseCameraPosition=new THREE.Vector3(),baseCameraFocus=new THREE.Vector3(),cameraOffset=new THREE.Vector3(),towardBoss=new THREE.Vector3();let cameraDistance=5;
 const throneAnchor=new THREE.Vector3(.45,0,-1.55);
 const hall=createOverlordHall(THREE,{compact:true,lights:false});hall.group.position.copy(throneAnchor);scene.add(hall.group);
 const throne=createOverlordThrone(THREE);(throne.group||throne).position.copy(throneAnchor);scene.add(throne.group||throne);
 scene.add(new THREE.HemisphereLight('#b8bfd3','#24141d',.72));
 const key=new THREE.DirectionalLight('#ffe5c7',2.9);key.position.set(-3,5,6);key.target.position.set(.35,1.15,.1);scene.add(key,key.target);
 key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3.5,right:3.5,top:3.5,bottom:-3.5,near:.5,far:18});key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.00035;key.shadow.normalBias=.018;key.shadow.radius=2;resources.add(key.shadow);
 const fill=new THREE.DirectionalLight('#c3d1f2',.62);fill.position.set(3,2,4);scene.add(fill);
 const rim=new THREE.PointLight('#b51235',6.5,12,2);rim.position.set(.5,3,-2);scene.add(rim);
 const boss=createOverlordBoss(THREE),standingGeometry=overlordBattleActorGeometry(boss);scene.add(boss.group);const materials=attachOverlordMaterials(THREE,boss);
 const hero=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,alphaTest:.05,depthWrite:false}));resources.add(hero.material);hero.center.set(.5,0);scene.add(hero);let heroImage=null,heroTexture=null;
 const groundMaterial=new THREE.MeshBasicMaterial({map:shadowTexture(resources),transparent:true,depthWrite:false,toneMapped:false});resources.add(groundMaterial);
 const groundShadow=new THREE.Mesh(new THREE.PlaneGeometry(1.55,.9),groundMaterial);resources.add(groundShadow.geometry);groundShadow.rotation.x=-Math.PI/2;groundShadow.position.set(.45,.073,.2);scene.add(groundShadow);
 const heroShadow=new THREE.Mesh(groundShadow.geometry,groundMaterial);heroShadow.rotation.x=-Math.PI/2;heroShadow.scale.set(.36,.36,1);heroShadow.position.y=.073;scene.add(heroShadow);
 const atmosphere=createOverlordStageEffects(THREE);scene.add(atmosphere.group);
 const idleBackdrop=new THREE.Color('#0a080e'),dangerBackdrop=new THREE.Color('#16050b'),goldBackdrop=new THREE.Color('#15100a'),bloodRim=new THREE.Color('#b51235'),goldRim=new THREE.Color('#f3c477');
 const makeMaterial=parameters=>{const m=new THREE.MeshBasicMaterial(parameters);resources.add(m);return m;};
 const lightMaterial=makeMaterial({color:'#ffdc95',transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const redMaterial=makeMaterial({color:'#ff234e',transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const coreMaterial=makeMaterial({color:'#ffd8dc',transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const mesh=(geometry,material)=>{resources.add(geometry);const object=new THREE.Mesh(geometry,material);object.visible=false;scene.add(object);return object;};
 const orb=mesh(new THREE.SphereGeometry(.105,12,8),lightMaterial),shield=mesh(new THREE.TorusGeometry(.62,.025,5,48),lightMaterial);
 const charge=mesh(new THREE.TorusGeometry(.62,.012,4,64),redMaterial);charge.rotation.x=Math.PI/2;
 const impact=mesh(new THREE.TorusGeometry(.72,.025,5,64),coreMaterial);impact.rotation.x=Math.PI/2;
 const coreGeo=new THREE.TorusGeometry(1,.010,4,36,Math.PI*.95),glowGeo=new THREE.TorusGeometry(1,.048,4,36,Math.PI*.95);resources.add(coreGeo);resources.add(glowGeo);
 const slashes=[];for(let i=0;i<5;i++){const group=new THREE.Group();group.add(new THREE.Mesh(glowGeo,redMaterial),new THREE.Mesh(coreGeo,coreMaterial));group.visible=false;scene.add(group);slashes.push(group);}
 const particleCount=70,particleGeo=new THREE.BufferGeometry(),particlePositions=new Float32Array(particleCount*3);particleGeo.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));resources.add(particleGeo);
 const particleMaterial=new THREE.PointsMaterial({color:'#ff9a73',size:.027,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});resources.add(particleMaterial);const sparks=new THREE.Points(particleGeo,particleMaterial);sparks.visible=false;scene.add(sparks);
 let framingKey='',dead=false,last=0,start=null,viewWidth=0,viewHeight=0,viewRatio=0;
 const lost=event=>{event.preventDefault();if(!dead)onLost();};canvas.addEventListener('webglcontextlost',lost);
 function frameStage(w,h,layout){
  const cache=[w,h,hero.scale.x,hero.scale.y,hero.center.x,hero.center.y].join(',');if(cache===framingKey)return;framingKey=cache;
  const framed=overlordBattleActorPoints(standingGeometry,layout,boss.group.scale),point=new THREE.Vector3();
  // Keep the small companion complete; the queen owns the frame, not her wide sword fan.
  for(const x of[layout.hero.x,layout.hero.x+.18])for(const u of[0,1])for(const v of[0,1]){
   point.set(x,layout.hero.y,layout.hero.z).addScaledVector(battleCameraRight,(u-hero.center.x)*hero.scale.x).addScaledVector(battleCameraUp,(v-hero.center.y)*hero.scale.y);framed.points[framed.offset++]=point.x;framed.points[framed.offset++]=point.y;framed.points[framed.offset++]=point.z;
  }
  cameraDistance=fitOverlordBattlePoints(camera,framed.points.subarray(0,framed.offset),w/h,{margin:.92});baseCameraPosition.copy(camera.position);baseCameraFocus.copy(camera.position).addScaledVector(battleCameraDirection,-cameraDistance);
  scene.fog.near=Math.max(17,camera.position.distanceTo(boss.group.position)+9);scene.fog.far=scene.fog.near+20;
 }
 function render({battle,effect,time=0,motion=true}){
  if(dead)return;time=Number.isFinite(time)?Math.max(0,time):0;
  const w=Math.max(1,canvas.clientWidth||360),h=Math.max(1,canvas.clientHeight||260),ratio=overlordBattlePixelRatio(w,h,globalThis.devicePixelRatio||1);if(w!==viewWidth||h!==viewHeight||Math.abs(ratio-viewRatio)>.001){renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);viewWidth=w;viewHeight=h;viewRatio=ratio;}
  if(start===null)start=time;const dt=Math.max(0,Math.min(.05,time-last));last=time;
  const beat=overlordBattleDirector({battle,effect,time,motion,start}),{environment,actors,player,counter}=beat,layout=overlordBattleLayout(w/h);
  const rise=overlordRisePlacement({state:beat.state,stateElapsed:beat.stateElapsed,walkProgress:beat.walkProgress,standDuration:boss.metadata.standDuration});
  boss.group.position.set(layout.boss.x,layout.boss.y+rise.lift,throneAnchor.z+(layout.boss.z-throneAnchor.z)*beat.walkProgress+rise.advance);
  towardBoss.set(layout.boss.x-layout.hero.x,0,layout.boss.z-layout.hero.z).normalize();
  hero.position.set(layout.hero.x,layout.hero.y+actors.heroLift,layout.hero.z).addScaledVector(towardBoss,actors.heroAdvance-actors.heroRecoil);
  boss.group.position.addScaledVector(towardBoss,actors.bossRecoil);boss.group.rotation.set(-actors.bossLean*.12,overlordAimYaw(boss.group.position,hero.position),0);
  boss.update(dt,{time,motion,state:beat.state,stateElapsed:beat.stateElapsed,attackProgress:beat.attackProgress,speed:.85,swordSpread:layout.swordSpread,portrait:w/h<.9,
   blades:beat.blades,wind:environment.wind,bossLean:actors.bossLean,swordFlare:actors.swordFlare});
  const sprite=playerPose(art,'right',false,0);
  if(sprite){const image=sprite.image||sprite;if(image!==heroImage){heroTexture?.dispose();heroTexture=new THREE.Texture(image);heroTexture.colorSpace=THREE.SRGBColorSpace;heroTexture.needsUpdate=true;hero.material.map=heroTexture;hero.material.needsUpdate=true;heroImage=image;}const [x,y,sw,sh]=sprite.frame||[0,0,image.width,image.height];heroTexture.repeat.set(sw/image.width,sh/image.height);heroTexture.offset.set(x/image.width,1-(y+sh)/image.height);hero.scale.set(layout.heroHeight*sw/(sprite.contentHeight||sh),layout.heroHeight*sh/(sprite.contentHeight||sh),1);hero.center.set(sprite.anchorX??.5,1-(sprite.anchorY??1));}
  else hero.scale.set(layout.heroHeight*.68,layout.heroHeight,1);
  hero.visible=!!sprite;frameStage(w,h,layout);
  cameraOffset.copy(baseCameraPosition).sub(baseCameraFocus).applyAxisAngle(new THREE.Vector3(0,1,0),beat.camera.orbit).multiplyScalar(1+beat.camera.pullback-beat.camera.push);
  camera.position.copy(baseCameraFocus).add(cameraOffset);camera.lookAt(baseCameraFocus);camera.position.addScaledVector(battleCameraRight,beat.camera.shakeX).addScaledVector(battleCameraUp,beat.camera.shakeY);camera.updateMatrixWorld();
  orb.visible=motion&&player.active&&player.kind==='shine';orb.position.copy(hero.position).lerp(boss.group.position,player.travel);orb.position.y=.55+player.travel*.72;orb.scale.setScalar(.7+player.charge*1.8+player.impact*.9);
  shield.visible=player.shield>.001;shield.position.copy(hero.position);shield.position.y+=layout.heroHeight*.48;shield.lookAt(camera.position);shield.scale.setScalar(.78+counter.impact*.10);
  charge.visible=motion&&counter.charge>.001;charge.position.copy(boss.group.position);charge.position.y+=1.1;charge.rotation.z=motion?time*.65:0;charge.scale.setScalar(.72+counter.charge*.48);
  impact.visible=motion&&counter.impact>.001;impact.position.copy(hero.position);impact.position.y=.083;impact.scale.setScalar(.4+counter.impact*1.1);
  sparks.visible=motion&&(counter.active||player.impact>.001);
  if(sparks.visible){for(let i=0;i<particleCount;i++){const seed=i/particleCount,a=i*2.399+time*(counter.charge>.01?1.4:.4),flight=counter.active?counter.progress:1,radius=.14+seed*.42,x=boss.group.position.x+(hero.position.x-boss.group.position.x)*flight,y=.15+((seed*3.4+time*.2)%1)*1.4,z=boss.group.position.z+(hero.position.z-boss.group.position.z)*flight;particlePositions.set([x+Math.cos(a)*radius,y,z+Math.sin(a)*radius],i*3);}particleGeo.attributes.position.needsUpdate=true;}
  slashes.forEach((object,index)=>{const blade=beat.blades[index],yaw=overlordAimYaw(boss.group.position,hero.position),lateral=(index-2)*.075;object.visible=motion&&blade.active;object.position.set(boss.group.position.x+(hero.position.x-boss.group.position.x)*blade.travel+Math.cos(yaw)*lateral,1.35+(hero.position.y+.34-1.35)*blade.travel,boss.group.position.z+(hero.position.z-boss.group.position.z)*blade.travel-Math.sin(yaw)*lateral);object.rotation.set(.13,yaw,-.55+index*.15);object.scale.setScalar(.30+index*.035+Math.sin(blade.travel*Math.PI)*.14);});
  rim.intensity=6.5+environment.rage*4+counter.charge*2+counter.impact*5;rim.color.copy(bloodRim).lerp(goldRim,environment.gold);
  scene.background.copy(idleBackdrop).lerp(dangerBackdrop,environment.rage).lerp(goldBackdrop,environment.gold);scene.fog.color.copy(scene.background);
  groundShadow.position.x=boss.group.position.x;groundShadow.position.z=boss.group.position.z;heroShadow.visible=hero.visible;heroShadow.position.x=hero.position.x;heroShadow.position.z=hero.position.z;
  atmosphere.update({time,motion,environment,boss:boss.group.position});hall.update?.({time,motion,phase:beat.phase,environment});renderer.render(scene,camera);
 }
 function dispose(){if(dead)return;dead=true;canvas.removeEventListener('webglcontextlost',lost);materials.dispose();atmosphere.dispose();boss.dispose();throne.dispose?.();hall.dispose?.();heroTexture?.dispose();for(const resource of resources)resource.dispose?.();renderer.dispose();}
 return {render,dispose,scene,camera,boss,ready:materials.ready};
}
