import {decodeOverlordHuman,HUMAN_JOINTS,HUMAN_BODY_SOURCE} from './overlord-human-data.js';
import {createOverlordHairCloth} from './overlord-hair-cloth.js?v=20261029-overlord4';
import {createOverlordRegalia} from './overlord-regalia.js?v=20261029-overlord4';

/** Facial projection on an anatomical surface, in world-rest coordinates.
 * The landmarks are the actual eyelids, nose tip, lips and chin of the mesh. */
export function overlordFaceUV(x,y){
 const clamp=v=>Math.max(0,Math.min(1,v));
 const rows=[[1.955,.995],[1.982,.92],[2.0123,.78],[2.058266,.60],[2.097872,.31],[2.127,.16],[2.194,0]];
 let top=y<rows[0][0]?rows[0][1]:0;
 for(let i=1;i<rows.length;i++)if(y<=rows[i][0]){const a=rows[i-1],b=rows[i],t=clamp((y-a[0])/(b[0]-a[0]));top=a[1]+(b[1]-a[1])*t;break;}
 return [clamp(.5+x/.1648),clamp(1-top)];
}

/** One continuous anatomical, skinned character. +Z forward, feet at Y=0.
 * Native mesh assets are CC0; caller-owned surface textures are never disposed. */
export function createOverlordBoss(THREE,options={}){
 const root=new THREE.Group();root.name='Overlord S — anatomical skinned queen';
 const body=new THREE.Group();root.add(body);
 const mats={
  armor:new THREE.MeshStandardMaterial({color:0x15121a,metalness:.72,roughness:.31}),
  engraved:new THREE.MeshStandardMaterial({color:0x24202a,metalness:.72,roughness:.34,vertexColors:true}),
  gold:new THREE.MeshStandardMaterial({color:0xc79846,metalness:.82,roughness:.28}),
  goldLight:new THREE.MeshStandardMaterial({color:0xe8c77c,metalness:.72,roughness:.24}),
  skin:new THREE.MeshStandardMaterial({color:0xe6bba5,roughness:.64}),
  face:new THREE.MeshStandardMaterial({color:0xe6bba5,roughness:.63}),
  hair:new THREE.MeshStandardMaterial({color:0xb78a44,metalness:.08,roughness:.38}),
  hairLight:new THREE.MeshStandardMaterial({color:0xe1bc70,metalness:.08,roughness:.35}),
  red:new THREE.MeshStandardMaterial({color:0x520d20,roughness:.77,side:THREE.DoubleSide}),
  gem:new THREE.MeshStandardMaterial({color:0x9b0322,metalness:.28,roughness:.2,emissive:0x51000b,emissiveIntensity:.35}),
  glow:new THREE.MeshStandardMaterial({color:0xff5571,emissive:0xff173f,emissiveIntensity:1.6,roughness:.3}),
  energy:new THREE.MeshBasicMaterial({color:0xff2048,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}),
  eye:new THREE.MeshStandardMaterial({color:0xe6dfd4,roughness:.3}),
  iris:new THREE.MeshStandardMaterial({color:0xffffff,roughness:.23,vertexColors:true}),
  dark:new THREE.MeshStandardMaterial({color:0x160f14,roughness:.36}),
  glint:new THREE.MeshBasicMaterial({color:0xffffff})
 };
 const data=decodeOverlordHuman(),owned=new Set(),bones=[],boneIndex=new Map(),rest=new Map();
 function bone(parent,name,position){
  const b=new THREE.Bone();b.name=name;const p=new THREE.Vector3(...position);
  b.position.copy(p);if(parent?.isBone)b.position.sub(rest.get(parent));
  parent.add(b);rest.set(b,p);boneIndex.set(b,bones.length);bones.push(b);return b;
 }
 const pelvis=bone(body,'pelvis',HUMAN_JOINTS.pelvis),torso=bone(pelvis,'spine',HUMAN_JOINTS.spine1),neck=bone(torso,'neck',HUMAN_JOINTS.neck),head=bone(neck,'head',HUMAN_JOINTS.head);
 const arms=[],legs=[];
 for(const side of[-1,1]){
  const word=side===1?'left':'right';
  const shoulder=bone(torso,word+'-shoulder',HUMAN_JOINTS[word+'Shoulder']);
  const elbow=bone(shoulder,word+'-elbow',HUMAN_JOINTS[word+'Elbow']);
  const hand=bone(elbow,word+'-hand',HUMAN_JOINTS[word+'Hand']);
  arms.push({shoulder,elbow,hand,side});
  const hip=bone(pelvis,word+'-hip',HUMAN_JOINTS[word+'Hip']);
  const knee=bone(hip,word+'-knee',HUMAN_JOINTS[word+'Knee']);
  const ankle=bone(knee,word+'-ankle',HUMAN_JOINTS[word+'Ankle']);
  legs.push({hip,knee,ankle,side});
 }
 const V=(x,y,z)=>new THREE.Vector3(x,y,z),point=new THREE.Vector3(),edge=new THREE.Vector3(),delta=new THREE.Vector3();
 function chainWeights(p,chain,end){
  let best=null;
  for(let i=0;i<chain.length;i++){
   const a=rest.get(chain[i]),b=i+1<chain.length?rest.get(chain[i+1]):end;
   edge.copy(b).sub(a);delta.copy(p).sub(a);const t=THREE.MathUtils.clamp(delta.dot(edge)/Math.max(1e-9,edge.lengthSq()),0,1);
   const d=delta.addScaledVector(edge,-t).lengthSq();if(!best||d<best.d)best={d,t,i};
  }
  const {t,i}=best,weights=[];
  if(t<.20&&i>0){const w=(.20-t)/.40;weights.push([chain[i-1],w],[chain[i],1-w]);}
  else if(t>.80&&i+1<chain.length){const w=(t-.80)/.40;weights.push([chain[i],1-w],[chain[i+1],w]);}
  else weights.push([chain[i],1]);
  return weights;
 }
 function influences(x,y,z){
  point.set(x,y,z);
  if(y>1.94){const t=THREE.MathUtils.smoothstep(y,1.94,1.99);return [[neck,1-t],[head,t]];}
  if(y>1.18&&Math.abs(x)>.235){
   const a=arms.find(a=>a.side===Math.sign(x)),word=a.side>0?'left':'right';
   return chainWeights(point,[a.shoulder,a.elbow,a.hand],V(...HUMAN_JOINTS[word+'HandTip']).add(V(a.side*.008,-.10,.025)));
  }
  if(y<1.115){
   const a=legs.find(a=>a.side===(x>=0?1:-1)),word=a.side>0?'left':'right';
   const w=chainWeights(point,[a.hip,a.knee,a.ankle],V(...HUMAN_JOINTS[word+'Toe']));
   if(y>1.03){const t=THREE.MathUtils.smoothstep(y,1.03,1.115);return w.map(([b,w])=>[b,w*(1-t)]).concat([[pelvis,t]]);}return w;
  }
  if(y>1.83){const t=THREE.MathUtils.smoothstep(y,1.83,1.94);return [[torso,1-t],[neck,t]];}
  const t=THREE.MathUtils.smoothstep(y,1.28,1.53);return [[pelvis,1-t],[torso,t]];
 }
 function makeGeometry(source){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(source.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(source.normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(source.uvs,2));g.setIndex(new THREE.Uint16BufferAttribute(source.indices,1));owned.add(g);return g;
 }
 const geometry=makeGeometry(data),pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
 const skinIndex=new Uint16Array(pos.count*4),skinWeight=new Float32Array(pos.count*4),colors=new Float32Array(pos.count*3).fill(1);
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),weights=influences(x,y,z);
  weights.forEach(([b,w],j)=>{skinIndex[i*4+j]=boneIndex.get(b);skinWeight[i*4+j]=w;});
  // A small normal offset gives the covered body its continuous fitted metal shell.
  if(y<1.89){pos.setXYZ(i,x+normal.getX(i)*.006,y+normal.getY(i)*.006,z+normal.getZ(i)*.006);}
  if(y>1.95){const [u,v]=overlordFaceUV(x,y);uv.setXY(i,u,v);}
  else if(y>1.34&&y<1.85&&Math.abs(x)<.23&&z>.025){
   uv.setXY(i,THREE.MathUtils.clamp(.5+x/.46,0,1),THREE.MathUtils.clamp((y-1.34)/.51,0,1));
   const f=THREE.MathUtils.smoothstep(y,1.37,1.45)*(1-THREE.MathUtils.smoothstep(y,1.75,1.83))*(1-THREE.MathUtils.smoothstep(Math.abs(x),.145,.205));
   colors.fill(.06+.94*f,i*3,i*3+3);
  }
 }
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const buckets=[[],[],[],[]],ix=geometry.index.array;
 for(let i=0;i<ix.length;i+=3){
  const a=ix[i],b=ix[i+1],c=ix[i+2],y=(pos.getY(a)+pos.getY(b)+pos.getY(c))/3,z=(pos.getZ(a)+pos.getZ(b)+pos.getZ(c))/3,x=Math.max(Math.abs(pos.getX(a)),Math.abs(pos.getX(b)),Math.abs(pos.getX(c)));
  const material=y>1.95&&z>.09&&x<.112?2:y>1.89?1:y>1.37&&y<1.83&&z>.035&&x<.205?3:0;buckets[material].push(a,b,c);
 }
 const indices=[];geometry.clearGroups();buckets.forEach((list,i)=>{geometry.addGroup(indices.length,list.length,i);indices.push(...list);});geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const human=new THREE.SkinnedMesh(geometry,[mats.armor,mats.skin,mats.face,mats.engraved]);human.name='continuous-anatomical-body';human.castShadow=true;human.receiveShadow=true;human.frustumCulled=false;body.add(human);
 root.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);human.bind(skeleton);human.normalizeSkinWeights();
 const details=new THREE.Group();details.name='anatomical-eyes';head.add(details);details.position.copy(rest.get(head)).multiplyScalar(-1);
 function regularMesh(parent,g,m,p,s){owned.add(g);const o=new THREE.Mesh(g,mats[m]);if(p)o.position.set(...p);if(s)o.scale.set(...s);o.castShadow=true;parent.add(o);return o;}
 for(const word of['left','right']){
  const e=HUMAN_JOINTS[word+'Eye'],surface=Math.max(...Array.from(data.eyes[word].positions).filter((_,i)=>i%3===2));
  // Eye controls sit in front of the face; the actual cornea belongs inside
  // the anatomical eyelids at the original eye surface, not at those controls.
  const z=surface+.0007;
  regularMesh(details,makeGeometry(data.eyes[word]),'eye');
  const irisGeometry=new THREE.SphereGeometry(1,32,18),irisPosition=irisGeometry.attributes.position,irisColors=[];
  for(let i=0;i<irisPosition.count;i++){
   const x=irisPosition.getX(i),y=irisPosition.getY(i),r=Math.min(1,Math.hypot(x,y)),a=Math.atan2(y,x);
   const fibers=.82+.14*Math.sin(a*41+r*19)+.09*Math.sin(a*73-r*8),rim=1-.78*THREE.MathUtils.smoothstep(r,.76,.98),amber=Math.exp(-Math.pow((r-.42)/.19,2));
   irisColors.push((.135+.075*amber)*fibers*rim,(.158+.025*amber)*fibers*rim,.046*fibers*rim);
  }
  irisGeometry.setAttribute('color',new THREE.Float32BufferAttribute(irisColors,3));
  regularMesh(details,irisGeometry,'iris',[e[0],e[1],z],[.0075,.0077,.0016]);
  regularMesh(details,new THREE.SphereGeometry(1,14,10),'dark',[e[0],e[1],z+.0013],[.0030,.0041,.0008]);
  regularMesh(details,new THREE.SphereGeometry(.0012,8,6),'glint',[e[0]-.002,e[1]+.0025,z+.0022]);
 }
 // A fitted solid gorget covers the skin/metal seam around the moving neck.
 regularMesh(neck,new THREE.LatheGeometry([new THREE.Vector2(.079,-.043),new THREE.Vector2(.084,-.026),new THREE.Vector2(.081,.064),new THREE.Vector2(.077,.080)],36),'armor',[0,0,.023],[1,1,1.6]);
 for(const [r,y]of[[.079,-.037],[.079,.078]]){const rim=regularMesh(neck,new THREE.TorusGeometry(r,.0028,6,40),'gold',[0,y,.023]);rim.rotation.x=Math.PI/2;rim.scale.y=1.6;}
 const joints={body,pelvis,torso,neck,head,arms,legs,rest};
 const cloth=createOverlordHairCloth(THREE,{head,torso,materials:mats});
 const regalia=createOverlordRegalia(THREE,{joints,materials:mats,positions:data.positions});
 if(regalia.group)root.add(regalia.group);
 const swords=regalia.swords;
 root.scale.setScalar(options.scale??1);
 let state='idle',elapsed=0,time=0,disposed=false;
 const valid=new Set(['idle','seated','stand','walk','attack','special','hit','defeat']);
 function setState(next,{restart=false}={}){if(!valid.has(next))throw new Error('Unknown Overlord animation: '+next);if(next!==state||restart){state=next;elapsed=0;}}
 function update(dt,input={}){
  if(disposed)return;dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  if(input.state&&input.state!==state)setState(input.state);
  const motion=input.motion!==false;time=motion?(Number.isFinite(input.time)?input.time:time+dt):0;elapsed=Number.isFinite(input.stateElapsed)?Math.max(0,input.stateElapsed):elapsed+dt;
  const seated=state==='seated'?1:state==='stand'&&motion?1-Math.min(1,elapsed/1.1):0;
  const walk=state==='walk',special=state==='special',attack=state==='attack',hit=state==='hit',dead=state==='defeat';
  const p=THREE.MathUtils.clamp(Number.isFinite(input.attackProgress)?input.attackProgress:elapsed/(special?2.4:1),0,1),strike=motion&&(attack||special)?Math.sin(p*Math.PI):0;
  const cycle=time*6.2*THREE.MathUtils.clamp(input.speed||1,.5,1.5),stride=motion&&walk?.32:0,fall=dead?(motion?Math.min(1,elapsed/1.4):1):0;
  const recoil=motion&&hit?Math.sin(Math.min(1,elapsed/.55)*Math.PI):0;
  body.position.set(recoil*.025,motion?Math.sin(time*1.8)*.004+(walk?Math.abs(Math.sin(cycle))*.012:0)-seated*.36:-seated*.36,-recoil*.035);
  body.rotation.set(-recoil*.10,special?-strike*.15:0,0);
  pelvis.rotation.set(0,0,seated?0:walk?Math.sin(cycle)*.018:-.055);
  torso.rotation.set(-strike*.08+fall*.25,walk?Math.sin(cycle)*.045:-.055-strike*.14,seated?0:.045);
  neck.rotation.set(.012+fall*.08,0,0);head.rotation.set(-.018-strike*.055+fall*.24,.045+(motion?Math.sin(time*.5)*.025:0),0);
  arms.forEach(({shoulder,elbow,hand,side:s})=>{
   const reaching=s===1;
   shoulder.rotation.set((reaching?-.16:.06)-Math.sin(cycle)*stride*s-strike*(special?1.05:.72)-seated*.25,0,-s*(.57+(reaching?.08:0))+s*strike*.28);
   elbow.rotation.set((reaching?-.18:-.04)-strike*.42-seated*.45,reaching?-.04:.03,0);
   hand.rotation.set(-strike*.20,0,s*(reaching?.11:.02));
  });
  legs.forEach(({hip,knee,ankle,side:s})=>{
   hip.rotation.set(Math.sin(cycle)*stride*s-seated*Math.PI*.48+(walk?0:s===1?-.035:.025),0,s*(walk?0:.10));
   knee.rotation.x=walk?Math.max(0,-Math.sin(cycle)*s)*.55:seated*Math.PI*.48+(s===1&&!seated?.065:0);
   ankle.rotation.set(walk?-Math.max(0,Math.sin(cycle)*s)*.15:0,0,0);
  });
  if(input.bossLean&&motion)torso.rotation.x+=input.bossLean;
  cloth.update({time,motion,strike,wind:input.wind??(special?1+strike:1),defeat:fall});
  regalia.update({time,motion,state,attackProgress:p,swordSpread:input.swordSpread??1,blades:input.blades});
  mats.glow.emissiveIntensity=dead?.15:1.45+strike*1.8;
  mats.energy.opacity=dead?.03:.22+strike*.36;
  return {state,elapsed,attackProgress:p};
 }
 function setTextures(textures={}){
  if(disposed)return false;
  const install=(names,texture,tint)=>names.forEach(name=>{const m=mats[name];m.map=texture||null;m.color.set(texture?0xffffff:tint);m.needsUpdate=true;});
  if('face'in textures)install(['face'],textures.face,0xe6bba5);
  // One continuous cuirass receives a single engraving layout. Limbs and the
  // raised gilt retain their native metal, avoiding repeated full-sheet motifs.
  if('armor'in textures)install(['engraved'],textures.armor,0x24202a);
  if('hair'in textures){install(['hair','hairLight'],textures.hair,0xb78a44);if(textures.hair)mats.hairLight.color.set(0xffe8bd);}
  if('cape'in textures)install(['red'],textures.cape,0x520d20);
  return true;
 }
 if(options.textures)setTextures(options.textures);update(0);
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();cloth.dispose();regalia.dispose();skeleton.dispose();for(const g of owned)g.dispose();for(const m of Object.values(mats))m.dispose();}
 return {group:root,root,update,setState,setTextures,dispose,materials:mats,joints,swords,skeleton,human,
  metadata:{name:'無名から頂点へ至る覇王 S',special:'無名神話・覇天絶滅斬',height:2.45,bodyHeight:2.2476,seatHeight:.75,standDuration:1.1,swordCount:5,forward:'+Z',states:[...valid],style:'continuous anatomical skinned queen with fitted sculpted regalia',source:HUMAN_BODY_SOURCE}};
}
