/** Native stage atmosphere: geometry, light and particles, never a background card. */
export function createOverlordStageEffects(THREE){
 const group=new THREE.Group();group.name='overlord-stage-atmosphere';const owned=new Set();
 const own=value=>{owned.add(value);return value;},clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
 const red=new THREE.Color('#b71135'),gold=new THREE.Color('#d4b26c'),ash=new THREE.Color('#544251'),emberWarm=new THREE.Color('#db9b68');
 const emissive=opacity=>own(new THREE.MeshBasicMaterial({color:red,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const portalMaterial=emissive(0),portalCore=own(new THREE.MeshBasicMaterial({color:'#09050c',transparent:true,opacity:0,depthWrite:false}));
 const portal=new THREE.Group();portal.name='opening-astral-portal';portal.position.set(.45,2.05,-3.45);group.add(portal);
 const aperture=new THREE.Mesh(own(new THREE.CircleGeometry(1.47,48)),portalCore);portal.add(aperture);
 const portalRing=new THREE.Mesh(own(new THREE.TorusGeometry(1.49,.025,5,72)),portalMaterial);portalRing.position.z=.018;portal.add(portalRing);
 const orbitRing=new THREE.Mesh(own(new THREE.TorusGeometry(1.68,.009,4,72)),portalMaterial);orbitRing.position.z=.024;portal.add(orbitRing);
 const glyphGeometry=own(new THREE.BoxGeometry(.012,.13,.012));
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2,glyph=new THREE.Mesh(glyphGeometry,portalMaterial);glyph.position.set(Math.cos(a)*1.61,Math.sin(a)*1.61,.04);glyph.rotation.z=a+.48;portal.add(glyph);}
 const floorMaterial=own(new THREE.LineBasicMaterial({color:red,transparent:true,opacity:.04,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const floorGeometry=own(new THREE.BufferGeometry()),lines=[];
 for(const radius of[1.05,1.18])for(let i=0;i<72;i++){const a=i/72*Math.PI*2,b=(i+1)/72*Math.PI*2;lines.push(Math.cos(a)*radius,0,Math.sin(a)*radius,Math.cos(b)*radius,0,Math.sin(b)*radius);}
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2,b=(i+2)/5*Math.PI*2;lines.push(Math.cos(a)*.98,0,Math.sin(a)*.98,Math.cos(b)*.98,0,Math.sin(b)*.98);}
 floorGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));const seal=new THREE.LineSegments(floorGeometry,floorMaterial);seal.name='five-blade-floor-seal';seal.position.set(.45,.082,.2);group.add(seal);
 const emberCount=88,emberGeometry=own(new THREE.BufferGeometry()),embersPosition=new Float32Array(emberCount*3);emberGeometry.setAttribute('position',new THREE.BufferAttribute(embersPosition,3));
 const emberMaterial=own(new THREE.PointsMaterial({color:'#db9b68',size:.014,sizeAttenuation:true,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const embers=new THREE.Points(emberGeometry,emberMaterial);embers.name='slow-rising-throne-embers';group.add(embers);
 // A deep corkscrew passage replaces the quiet wall during an attack. Every
 // layer is pooled geometry; no fullscreen image or shader compilation occurs
 // when a turn starts.
 const astral=new THREE.Color('#6943ee'),ice=new THREE.Color('#b7dcff');
 const riftMaterial=own(new THREE.MeshBasicMaterial({color:astral,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const passage=new THREE.Group();passage.name='flowing-astral-passage';passage.position.set(.45,1.7,-3.9);group.add(passage);
 const ribbonGeometry=own(new THREE.TorusGeometry(1,.045,4,72,Math.PI*1.65)),ribbons=[];
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(ribbonGeometry,riftMaterial);ring.position.z=-i*1.1;ring.scale.setScalar(1.6+i*.48);passage.add(ring);ribbons.push(ring);}
 const streamGeometry=own(new THREE.BufferGeometry()),streamPositions=new Float32Array(96*2*3);
 streamGeometry.setAttribute('position',new THREE.BufferAttribute(streamPositions,3));
 const streamMaterial=own(new THREE.LineBasicMaterial({color:ice,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const streams=new THREE.LineSegments(streamGeometry,streamMaterial);streams.name='rushing-astral-light-streaks';group.add(streams);
 const victoryGeometry=own(new THREE.BufferGeometry()),victoryPositions=new Float32Array(24*2*3);victoryGeometry.setAttribute('position',new THREE.BufferAttribute(victoryPositions,3));
 const victoryMaterial=own(new THREE.LineBasicMaterial({color:gold,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const victoryRays=new THREE.LineSegments(victoryGeometry,victoryMaterial);victoryRays.name='victory-dawn-rays';group.add(victoryRays);
 const shockMaterial=own(new THREE.MeshBasicMaterial({color:'#f5d1fa',transparent:true,opacity:0,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
 const shockwave=new THREE.Mesh(own(new THREE.RingGeometry(.90,1,64)),shockMaterial);shockwave.name='expanding-impact-shockwave';shockwave.rotation.x=-Math.PI/2;group.add(shockwave);
 const glowPixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,r=Math.hypot((x+.5)/16-1,(y+.5)/16-1);glowPixels[i]=glowPixels[i+1]=glowPixels[i+2]=255;glowPixels[i+3]=Math.round(Math.max(0,1-r)**2*255);}
 const bloomTexture=own(new THREE.DataTexture(glowPixels,32,32));bloomTexture.needsUpdate=true;
 const bloomMaterial=own(new THREE.MeshBasicMaterial({color:'#fff0df',map:bloomTexture,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const bloom=new THREE.Mesh(own(new THREE.PlaneGeometry(5.6,5.6)),bloomMaterial);bloom.name='bounded-impact-bloom';group.add(bloom);
 const rubbleMaterial=own(new THREE.MeshStandardMaterial({color:'#27212a',roughness:.76,metalness:.1})),rubbleGeometry=own(new THREE.OctahedronGeometry(1,0)),rubble=[];
 for(let i=0;i<9;i++){const shard=new THREE.Mesh(rubbleGeometry,rubbleMaterial);shard.name='rising-marble-fragment';shard.scale.set(.055+(i%3)*.017,.03+(i%2)*.016,.04+(i%4)*.01);group.add(shard);rubble.push(shard);}
 let disposed=false;
 function update({time=0,motion=true,environment={},boss={x:.45,y:0,z:.2},target={x:-.4,y:0,z:1.2},camera}={}){
  if(disposed)return;const t=motion&&Number.isFinite(time)?time:0,rage=clamp(environment.rage),win=clamp(environment.gold),opening=clamp(environment.portal),wind=motion?clamp(environment.wind):0,pulse=motion?clamp(environment.pulse):0;
  portal.visible=opening>.001;portal.scale.setScalar(.82+opening*.18);portal.rotation.z=motion?t*(.055+rage*.035):0;portalMaterial.opacity=opening*(.32+pulse*.08);portalCore.opacity=opening*.86;
  portalMaterial.color.copy(red).lerp(gold,win);floorMaterial.color.copy(red).lerp(gold,win);
  floorMaterial.opacity=.025+clamp(environment.floorGlow)*(.30+pulse*.055)+win*.19;seal.position.x=boss.x;seal.position.z=boss.z;seal.rotation.y=motion?t*.035*(1+rage):0;
  emberMaterial.color.copy(emberWarm).lerp(red,rage*.55).lerp(gold,win);emberMaterial.opacity=.32+rage*.28+win*.12;
  const emberSpeed=motion?Math.max(0,Number.isFinite(environment.emberSpeed)?environment.emberSpeed:.16):0;
  for(let i=0;i<emberCount;i++){
   const a=i*2.399963,cycle=(i*.173+t*emberSpeed*.19)%1,radius=.48+(i%13)*.19;
   embersPosition[i*3]=boss.x+Math.cos(a)*radius+Math.sin(t*.4+i)*wind*.12;
   embersPosition[i*3+1]=.08+cycle*3.6;embersPosition[i*3+2]=boss.z-1.3+Math.sin(a)*radius;
  }
  emberGeometry.attributes.position.needsUpdate=true;
  rubbleMaterial.color.copy(ash).multiplyScalar(.36+rage*.18);
  rubble.forEach((shard,i)=>{const a=i/9*Math.PI*2,drift=motion?Math.sin(t*(.36+i*.025)+i):0;shard.visible=rage>.015;shard.position.set(boss.x+Math.cos(a)*(1.3+(i%3)*.16),.07+rage*(.06+(i%4)*.12+drift*.045),boss.z+Math.sin(a)*(1.2+(i%3)*.12));shard.rotation.set(i*.7+drift*.14,a+(motion?t*.08*rage:0),i*.43);});
  const rift=motion?clamp(environment.rift):0,stream=motion?clamp(environment.stream):0,shock=motion?clamp(environment.shock):0,flash=motion?clamp(environment.flash):0,winRays=motion?clamp(environment.victoryRays):0;
  passage.visible=rift>.001;riftMaterial.opacity=rift*.72;riftMaterial.color.copy(astral).lerp(red,rage*.25);
  ribbons.forEach((ring,i)=>{ring.rotation.set(Math.sin(t*.6+i)*.12,Math.cos(t*.7+i)*.15,t*(i%2?-.72:.65)+i*1.8);ring.scale.set(1.65+i*.5,1.3+i*.42,1);});
  streams.visible=stream>.001;streamMaterial.opacity=stream*.74;streamMaterial.color.copy(ice).lerp(red,rage*.24);
  for(let i=0;i<96;i++){
   const a=i*2.399963+t*.11,flight=(i*.618033+t*(.32+stream*.7))%1,radius=1.1+flight*3.8,z=-7+flight*9,len=.16+flight*.8;
   const x=.45+Math.cos(a)*radius,y=1.6+Math.sin(a)*radius*.67,j=i*6;
   streamPositions.set([x,y,z,x+Math.cos(a)*len,y+Math.sin(a)*len*.67,z+len*1.9],j);
  }
  streamGeometry.attributes.position.needsUpdate=true;
  victoryRays.visible=winRays>.001;victoryMaterial.opacity=winRays*.70;
  for(let i=0;i<24;i++){const a=i*Math.PI/12+t*.10,inner=.42+(i%3)*.12,outer=3.6+(i%4)*.4,j=i*6;victoryPositions.set([boss.x+Math.cos(a)*inner,1.5+Math.sin(a)*inner*.7,boss.z-1,boss.x+Math.cos(a)*outer,1.5+Math.sin(a)*outer*.7,boss.z-3],j);}victoryGeometry.attributes.position.needsUpdate=true;
  shockwave.visible=shock>.001;shockMaterial.opacity=shock*.67;shockMaterial.color.copy(ice).lerp(gold,win);shockwave.position.set(target.x,.095,target.z);shockwave.scale.setScalar(.20+clamp(environment.shockTravel)*2.3);
  bloom.visible=flash>.001;bloomMaterial.opacity=flash*.58;bloom.position.set(target.x,target.y+.9,target.z+.08);bloom.scale.setScalar(.6+flash*.9);if(camera)bloom.lookAt(camera.position);
 }
 update({motion:false});
 return {group,portal,seal,embers,passage,streams,shockwave,bloom,victoryRays,update,dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const item of owned)item.dispose();owned.clear();}};
}
