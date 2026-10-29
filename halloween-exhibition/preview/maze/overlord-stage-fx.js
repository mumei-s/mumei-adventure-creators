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
 const rubbleMaterial=own(new THREE.MeshStandardMaterial({color:'#27212a',roughness:.76,metalness:.1})),rubbleGeometry=own(new THREE.OctahedronGeometry(1,0)),rubble=[];
 for(let i=0;i<9;i++){const shard=new THREE.Mesh(rubbleGeometry,rubbleMaterial);shard.name='rising-marble-fragment';shard.scale.set(.055+(i%3)*.017,.03+(i%2)*.016,.04+(i%4)*.01);group.add(shard);rubble.push(shard);}
 let disposed=false;
 function update({time=0,motion=true,environment={},boss={x:.45,y:0,z:.2}}={}){
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
 }
 update({motion:false});
 return {group,portal,seal,embers,update,dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const item of owned)item.dispose();owned.clear();}};
}
