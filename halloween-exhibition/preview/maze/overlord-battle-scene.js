import * as THREE from './vendor/three.module.js';
import {createOverlordBoss} from './overlord-boss.js?v=20261029-overlord2';
import {attachOverlordMaterials} from './overlord-materials.js?v=20261029-overlord2';
import {createOverlordThrone,createOverlordHall} from './overlord-room.js?v=20261029-overlord2';
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
 return {boss:{x:.45,y:0,z:.2},hero:{x:narrow?-.68:-1.25,y:.025,z:1.8},heroHeight:narrow?1.02:1.42,
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
function actorFrameGeometry(actor){
 const root=actor.group,swords=actor.swords||[];root.updateMatrixWorld(true);let count=0;
 root.traverseVisible(node=>{if(node.isMesh)count+=node.geometry.attributes.position.count;});
 const positions=new Float32Array(count*3),parts=new Uint8Array(count),point=new THREE.Vector3();let offset=0;
 const inverse=swords.map(sword=>sword.matrixWorld.clone().invert());
 root.traverseVisible(node=>{if(!node.isMesh)return;let parent=node,index=-1;while(parent&&parent!==root){index=swords.indexOf(parent);if(index>=0)break;parent=parent.parent;}
  const attribute=node.geometry.attributes.position;for(let i=0;i<attribute.count;i++){point.fromBufferAttribute(attribute,i).applyMatrix4(node.matrixWorld);if(index>=0)point.applyMatrix4(inverse[index]);const base=offset*3;positions[base]=point.x;positions[base+1]=point.y;positions[base+2]=point.z;parts[offset++]=index+1;}});
 return {positions,parts,swords:swords.map(sword=>({position:sword.position.clone(),rotation:sword.rotation.clone(),scale:sword.scale.clone()}))};
}
function standingFramePoints(geometry,layout,rootScale){
 const rootMatrix=new THREE.Matrix4().compose(new THREE.Vector3(layout.boss.x,layout.boss.y,layout.boss.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),overlordAimYaw(layout.boss,layout.hero)),rootScale);
 const swordMatrices=geometry.swords.map(sword=>{const position=sword.position.clone(),rotation=sword.rotation.clone();position.x*=layout.swordSpread;rotation.z*=layout.swordSpread;return new THREE.Matrix4().multiplyMatrices(rootMatrix,new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromEuler(rotation),sword.scale));});
 const points=new Float32Array(geometry.positions.length+36),point=new THREE.Vector3();
 for(let i=0;i<geometry.parts.length;i++){point.fromArray(geometry.positions,i*3).applyMatrix4(geometry.parts[i]?swordMatrices[geometry.parts[i]-1]:rootMatrix);const base=i*3;points[base]=point.x;points[base+1]=point.y;points[base+2]=point.z;}
 return {points,offset:geometry.positions.length};
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

/** Native actor, gothic hall and timed attacks; no reference card is projected. */
export function createOverlordBattleScene({canvas,art,onLost=()=>{}}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new THREE.Scene(),resources=new Set();scene.background=new THREE.Color('#190f1b');scene.fog=new THREE.Fog('#190f1b',17,34);
 try{scene.environment=createReflectionEnvironment(renderer,resources);}catch{ /* Direct lighting remains usable on restricted mobile drivers. */ }
 const camera=new THREE.PerspectiveCamera(31,1,.08,45),baseCameraPosition=new THREE.Vector3(),baseCameraQuaternion=new THREE.Quaternion();
 const throneAnchor=new THREE.Vector3(.45,0,-1.55);
 const hall=createOverlordHall(THREE,{compact:true,lights:false});hall.group.position.copy(throneAnchor);scene.add(hall.group);
 const throne=createOverlordThrone(THREE);(throne.group||throne).position.copy(throneAnchor);scene.add(throne.group||throne);
 scene.add(new THREE.HemisphereLight('#e0d7e8','#51313b',2.25));
 const key=new THREE.DirectionalLight('#ffe4bd',3.7);key.position.set(-3,5,6);scene.add(key);
 const fill=new THREE.DirectionalLight('#d5dfff',1.65);fill.position.set(3,2,4);scene.add(fill);
 const rim=new THREE.PointLight('#eb163e',14,14,2);rim.position.set(.5,3,-2);scene.add(rim);
 const boss=createOverlordBoss(THREE),standingGeometry=actorFrameGeometry(boss);scene.add(boss.group);const materials=attachOverlordMaterials(THREE,boss);
 const hero=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,alphaTest:.05,depthWrite:false}));resources.add(hero.material);hero.center.set(.5,0);scene.add(hero);let heroImage=null,heroTexture=null;
 const groundMaterial=new THREE.MeshBasicMaterial({map:shadowTexture(resources),transparent:true,depthWrite:false,toneMapped:false});resources.add(groundMaterial);
 const groundShadow=new THREE.Mesh(new THREE.PlaneGeometry(1.55,.9),groundMaterial);resources.add(groundShadow.geometry);groundShadow.rotation.x=-Math.PI/2;groundShadow.position.set(.45,.012,.2);scene.add(groundShadow);
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
 let framingKey='',dead=false,last=0,start=null,viewWidth=0,viewHeight=0;
 const lost=event=>{event.preventDefault();if(!dead)onLost();};canvas.addEventListener('webglcontextlost',lost);
 function frameStage(w,h,layout){
  const cache=[w,h,hero.scale.x,hero.scale.y,hero.center.x,hero.center.y].join(',');if(cache===framingKey)return;framingKey=cache;
  const framed=standingFramePoints(standingGeometry,layout,boss.group.scale),point=new THREE.Vector3();
  // The hero is a foreground shoulder/upper-body presence; its feet may crop.
  for(const x of[layout.hero.x,layout.hero.x+.35])for(const u of[0,1])for(const v of[.6,1]){
   point.set(x,layout.hero.y,layout.hero.z).addScaledVector(battleCameraRight,(u-hero.center.x)*hero.scale.x).addScaledVector(battleCameraUp,(v-hero.center.y)*hero.scale.y);framed.points[framed.offset++]=point.x;framed.points[framed.offset++]=point.y;framed.points[framed.offset++]=point.z;
  }
  fitOverlordBattlePoints(camera,framed.points.subarray(0,framed.offset),w/h,{margin:.92});baseCameraPosition.copy(camera.position);baseCameraQuaternion.copy(camera.quaternion);
  scene.fog.near=Math.max(17,camera.position.distanceTo(boss.group.position)+9);scene.fog.far=scene.fog.near+20;
 }
 function render({battle,effect,time=0,motion=true}){
  if(dead)return;
  const w=Math.max(1,canvas.clientWidth||360),h=Math.max(1,canvas.clientHeight||260);if(w!==viewWidth||h!==viewHeight){renderer.setSize(w,h,false);viewWidth=w;viewHeight=h;}
  if(start===null)start=time;const dt=Math.max(0,Math.min(.05,time-last));last=time;
  const cue=overlordBattleCue({battle,effect,time,motion,start}),{intro,age,counter,state,attackProgress,phase}=cue,layout=overlordBattleLayout(w/h);
  const walk=cue.walkProgress*cue.walkProgress*(3-2*cue.walkProgress);
  boss.group.position.set(layout.boss.x,0,throneAnchor.z+(layout.boss.z-throneAnchor.z)*walk);
  hero.position.set(layout.hero.x+(motion&&effect?.type==='attack'&&age<.7?Math.sin(age/.7*Math.PI)*.35:0),layout.hero.y,layout.hero.z);
  boss.group.rotation.y=overlordAimYaw(boss.group.position,hero.position);
  boss.update(dt,{time,motion,state,attackProgress,speed:.85,swordSpread:layout.swordSpread,portrait:w/h<.9});
  const sprite=playerPose(art,'right',false,0);
  if(sprite){const image=sprite.image||sprite;if(image!==heroImage){heroTexture?.dispose();heroTexture=new THREE.Texture(image);heroTexture.colorSpace=THREE.SRGBColorSpace;heroTexture.needsUpdate=true;hero.material.map=heroTexture;hero.material.needsUpdate=true;heroImage=image;}const [x,y,sw,sh]=sprite.frame||[0,0,image.width,image.height];heroTexture.repeat.set(sw/image.width,sh/image.height);heroTexture.offset.set(x/image.width,1-(y+sh)/image.height);hero.scale.set(layout.heroHeight*sw/(sprite.contentHeight||sh),layout.heroHeight*sh/(sprite.contentHeight||sh),1);hero.center.set(sprite.anchorX??.5,1-(sprite.anchorY??1));}
  else hero.scale.set(layout.heroHeight*.68,layout.heroHeight,1);
  hero.visible=!!sprite;frameStage(w,h,layout);
  camera.position.copy(baseCameraPosition);camera.quaternion.copy(baseCameraQuaternion);
  const special=counter&&effect?.counterSpecial;
  if(motion&&special&&phase==='impact'){const pulse=Math.sin((attackProgress-.7)/.3*Math.PI);camera.position.addScaledVector(battleCameraRight,Math.sin(time*45)*.025*pulse);camera.position.y+=Math.cos(time*36)*.012*pulse;}
  camera.updateMatrixWorld();
  const lightProgress=motion?Math.min(1,age/1.1):.5;orb.visible=!!effect&&effect.type==='shine'&&age<1.1;orb.position.copy(hero.position).lerp(boss.group.position,lightProgress);orb.position.y=1.15;orb.scale.setScalar(1+Math.sin(lightProgress*Math.PI)*1.2);
  shield.visible=effect?.type==='guard'&&age<2.8;shield.position.copy(hero.position);shield.position.y=.86;shield.lookAt(camera.position);
  charge.visible=!!(special&&motion&&phase==='charge');charge.position.copy(boss.group.position);charge.position.y=1.35;charge.rotation.z=motion?time*.65:0;charge.scale.setScalar(.65+attackProgress*1.8);
  impact.visible=!!(special&&motion&&phase==='impact');impact.position.copy(hero.position);impact.position.y=.07;impact.scale.setScalar(.4+Math.max(0,attackProgress-.7)*4.6);
  sparks.visible=!!(special&&motion);
  if(sparks.visible){for(let i=0;i<particleCount;i++){const seed=i/particleCount,a=i*2.399+time*(phase==='charge'?1.4:.4),flight=Math.max(0,Math.min(1,(attackProgress-.25)/.5)),radius=.25+seed*.7;const x=boss.group.position.x+(hero.position.x-boss.group.position.x)*flight,y=.25+((seed*3.4+time*.2)%1)*1.8,z=boss.group.position.z+(hero.position.z-boss.group.position.z)*flight;particlePositions.set([x+Math.cos(a)*radius,y,z+Math.sin(a)*radius],i*3);}particleGeo.attributes.position.needsUpdate=true;}
  slashes.forEach((object,index)=>{const pose=overlordSpecialArc({index,progress:attackProgress,source:boss.group.position,target:hero.position,counter:special,motion});object.visible=pose.visible;object.position.set(pose.x,pose.y,pose.z);object.rotation.set(.13,pose.yaw,-.55+index*.15);object.scale.setScalar(pose.scale);});
  rim.intensity=14+(special&&motion?Math.sin(attackProgress*Math.PI)*7:0);
  groundShadow.position.x=boss.group.position.x;groundShadow.position.z=boss.group.position.z;
  hall.update?.({time,motion,phase});renderer.render(scene,camera);
 }
 function dispose(){if(dead)return;dead=true;canvas.removeEventListener('webglcontextlost',lost);materials.dispose();boss.dispose();throne.dispose?.();hall.dispose?.();heroTexture?.dispose();for(const resource of resources)resource.dispose?.();renderer.dispose();}
 return {render,dispose,scene,camera,boss};
}
