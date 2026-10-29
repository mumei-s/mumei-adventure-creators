import * as THREE from './vendor/three.module.js';
import {createOverlordBoss} from './overlord-boss.js?v=20261028-overlord1';
import {createOverlordThrone} from './overlord-room.js?v=20261028-overlord1';
import {playerPose} from './rpg-art.js?v=20261019-unified1';

/** Match visual responses to the resolved turn, including fully blocked strikes. */
export function overlordBattleCue({battle,effect,time=0,motion=true,start=0}){
 const intro=motion?Math.max(0,Math.min(1,(time-start)/1.3)):1;
 const age=effect?Math.max(0,time-effect.started):99;
 const counter=!!effect&&age>1.4&&age<2.9&&!effect.finished&&(effect.retaliation>0||effect.blocked>0);
 let state=intro<1?'stand':battle.status==='won'&&age>=1.1?'defeat':counter?(effect.counterSpecial?'special':'attack'):'idle';
 if(effect&&age>.4&&age<1.1&&effect.damage)state='hit';
 return {intro,age,counter,state,attackProgress:intro<1?intro:counter?(age-1.4)/1.5:Math.min(1,(age-.4)/.7)};
}

const battleCameraDirection=new THREE.Vector3(3,1.7,6.85).normalize();
const battleCameraRight=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),battleCameraDirection).normalize();
const battleCameraUp=new THREE.Vector3().crossVectors(battleCameraDirection,battleCameraRight).normalize();
export function overlordAimYaw(source,target){return Math.atan2(target.x-source.x,target.z-source.z);}
/** Fit the complete stage inside the camera, including its near-side corners. */
export function fitOverlordBattleCamera(camera,bounds,aspect){
 const center=bounds.getCenter(new THREE.Vector3()),point=new THREE.Vector3();
 const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*.88,horizontal=vertical*Math.max(.1,aspect);
 let distance=6.8;
 for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z]){
  point.set(x,y,z).sub(center);const depth=point.dot(battleCameraDirection);
  distance=Math.max(distance,depth+Math.abs(point.dot(battleCameraRight))/horizontal,depth+Math.abs(point.dot(battleCameraUp))/vertical);
 }
 camera.aspect=aspect;camera.far=Math.max(35,distance+bounds.getSize(new THREE.Vector3()).length()+3);
 camera.position.copy(center).addScaledVector(battleCameraDirection,distance);camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 return distance;
}
/** Five delayed cuts follow the same source-to-target line as the launched swords. */
export function overlordSpecialArc({index,progress,source,target,counter,motion=true}){
 const begin=.12+index*.035,end=.86+index*.02,travel=Math.max(0,Math.min(1,(progress-begin)/.62)),yaw=overlordAimYaw(source,target),lateral=(index-2)*.08;
 return {visible:!!(motion&&counter&&progress>begin&&progress<end),yaw,scale:.45+index*.055+Math.sin(travel*Math.PI)*.12,
  x:source.x+(target.x-source.x)*travel+Math.cos(yaw)*lateral,
  y:source.y+1.35+(target.y-source.y-.25)*travel+Math.sin(travel*Math.PI)*.14,
  z:source.z+(target.z-source.z)*travel-Math.sin(yaw)*lateral};
}

/** A true mesh actor and throne, not the supplied card projected onto a plane.
 * The existing player retains its established art. No timers or audio here. */
export function createOverlordBattleScene({canvas,art,onLost=()=>{}}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#100b19');scene.fog=new THREE.Fog('#100b19',13,25);
 const camera=new THREE.PerspectiveCamera(36,1,.1,35),resources=new Set();
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.5,...extra});resources.add(m);return m;};
 const black=material('#19141f'),gold=material('#c49a45',{metalness:.7}),red=material('#6d1531');
 function mesh(g,m,x,y,z){resources.add(g);const n=new THREE.Mesh(g,m);n.position.set(x,y,z);scene.add(n);return n;}
 const floor=mesh(new THREE.CylinderGeometry(6.5,6.5,.15,48),black,0,-.12,0);
 const ring=mesh(new THREE.TorusGeometry(4.5,.018,5,72),gold,0,.01,0);ring.rotation.x=-Math.PI/2;
 const carpet=mesh(new THREE.BoxGeometry(2.4,.015,10),red,.9,0,-1);
 for(const side of[-1,1])for(let i=0;i<3;i++){mesh(new THREE.CylinderGeometry(.22,.3,4.8,10),black,side*4,2.4,-3+i*3);mesh(new THREE.TorusGeometry(.3,.045,6,12),gold,side*4,.35,-3+i*3).rotation.x=Math.PI/2;}
 scene.add(new THREE.HemisphereLight('#b9c8fa','#42202d',2.2));const key=new THREE.DirectionalLight('#ffe2b1',3.5);key.position.set(2,5,5);scene.add(key);const rim=new THREE.PointLight('#bc254b',25,12);rim.position.set(2,2.8,-2);scene.add(rim);
 const throne=createOverlordThrone(THREE);scene.add(throne.group||throne);(throne.group||throne).position.set(1.3,0,-1.2);
 const boss=createOverlordBoss(THREE);boss.group.position.set(1.3,0,-1.2);scene.add(boss.group);
 const hero=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,alphaTest:.05,depthWrite:false}));resources.add(hero.material);hero.center.set(.5,0);hero.position.set(-1.7,.02,1.5);hero.scale.set(1.5,2.2,1);scene.add(hero);let heroImage=null,heroTexture=null;
 const lightMaterial=new THREE.MeshBasicMaterial({color:'#ffce79',transparent:true,opacity:.6});resources.add(lightMaterial);
 const orb=mesh(new THREE.SphereGeometry(.12,12,8),lightMaterial,-1,1,1);orb.visible=false;
 const shield=mesh(new THREE.TorusGeometry(.8,.025,5,40),lightMaterial,-1.7,1.1,1.5);shield.visible=false;
 const slashCore=new THREE.MeshBasicMaterial({color:'#ffb2c1',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const slashGlow=new THREE.MeshBasicMaterial({color:'#ff1746',transparent:true,opacity:.34,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const slashCoreGeo=new THREE.TorusGeometry(1,.012,4,32,Math.PI*.8),slashGlowGeo=new THREE.TorusGeometry(1,.06,4,32,Math.PI*.8);
 for(const resource of[slashCore,slashGlow,slashCoreGeo,slashGlowGeo])resources.add(resource);
 const slashes=[];for(let i=0;i<5;i++){const n=new THREE.Group();n.add(new THREE.Mesh(slashGlowGeo,slashGlow),new THREE.Mesh(slashCoreGeo,slashCore));n.visible=false;scene.add(n);slashes.push(n);}
 // The authored motion envelope includes cloth wind, seated feet and sword travel.
 boss.group.position.set(1.3,0,-.5);boss.group.rotation.y=overlordAimYaw(boss.group.position,hero.position);
 const stageBounds=new THREE.Box3().setFromObject(throne.group).union(new THREE.Box3().setFromObject(boss.group)).expandByScalar(.4);
 let framingKey='';
 function frameStage(w,h){
  const key=[w,h,hero.scale.x,hero.scale.y,hero.center.x,hero.center.y].join(',');if(key===framingKey)return;framingKey=key;
  const bounds=stageBounds.clone(),point=new THREE.Vector3();
  // A camera-facing sprite has width along camera right and height along camera up.
  for(const x of[-1.7,-1.1])for(const u of[0,1])for(const v of[0,1]){
   point.set(x,.02,1.5).addScaledVector(battleCameraRight,(u-hero.center.x)*hero.scale.x).addScaledVector(battleCameraUp,(v-hero.center.y)*hero.scale.y);bounds.expandByPoint(point);
  }
  const distance=fitOverlordBattleCamera(camera,bounds,w/h);scene.fog.near=Math.max(13,distance+4);scene.fog.far=Math.max(25,distance+16);
 }
 let dead=false,last=0,start=null,viewWidth=0,viewHeight=0;const lost=e=>{e.preventDefault();if(!dead)onLost();};canvas.addEventListener('webglcontextlost',lost);
 function render({battle,effect,time=0,motion=true}){
  if(dead)return;const w=Math.max(1,canvas.clientWidth||360),h=Math.max(1,canvas.clientHeight||220);if(w!==viewWidth||h!==viewHeight){renderer.setSize(w,h,false);viewWidth=w;viewHeight=h;}
  if(start===null)start=time;const dt=Math.max(0,Math.min(.05,time-last));last=time;
  const {intro,age,counter,state,attackProgress}=overlordBattleCue({battle,effect,time,motion,start});
  boss.group.position.set(1.3,0,-1.2+Math.min(1,intro)*.7);
  hero.position.x=-1.7+(motion&&effect?.type==='attack'&&age<.7?Math.sin(age/.7*Math.PI)*.6:0);
  boss.group.rotation.y=overlordAimYaw(boss.group.position,hero.position);
  boss.update(dt,{time,motion,state,attackProgress});
  const sp=playerPose(art,'right',false,0);if(sp){const image=sp.image||sp;if(image!==heroImage){heroTexture?.dispose();heroTexture=new THREE.Texture(image);heroTexture.colorSpace=THREE.SRGBColorSpace;heroTexture.needsUpdate=true;hero.material.map=heroTexture;hero.material.needsUpdate=true;heroImage=image;}const [x,y,sw,sh]=sp.frame||[0,0,image.width,image.height];heroTexture.repeat.set(sw/image.width,sh/image.height);heroTexture.offset.set(x/image.width,1-(y+sh)/image.height);hero.scale.set(2.2*sw/(sp.contentHeight||sh),2.2*sh/(sp.contentHeight||sh),1);hero.center.set(sp.anchorX??.5,1-(sp.anchorY??1));}
  hero.visible=!!sp;frameStage(w,h);
  orb.visible=!!effect&&effect.type==='shine'&&age<1.1;const lightProgress=motion?Math.min(1,age/1.1):.5;orb.position.set(-1.3+lightProgress*2.6,1.2,1.1-lightProgress*1.4);
  shield.visible=effect?.type==='guard'&&age<2.8;
  slashes.forEach((n,i)=>{const pose=overlordSpecialArc({index:i,progress:attackProgress,source:boss.group.position,target:hero.position,counter:counter&&effect.counterSpecial,motion});n.visible=pose.visible;n.position.set(pose.x,pose.y,pose.z);n.rotation.set(0,pose.yaw,-.7+i*.17);n.scale.setScalar(pose.scale);});
  renderer.render(scene,camera);
 }
 function dispose(){if(dead)return;dead=true;canvas.removeEventListener('webglcontextlost',lost);boss.dispose();throne.dispose?.();heroTexture?.dispose();for(const r of resources)r.dispose?.();renderer.dispose();}
 return{render,dispose,scene,camera,boss};
}
