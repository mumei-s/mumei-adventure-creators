/** A shared curve for a solid blade and its wake. The blade tip reaches the
 * exact target; its orientation follows the curve tangent throughout flight.
 * `out` can be reused so live renderers allocate nothing for a moving sword. */
export function overlordBladeTrajectory({source,target,progress=0,index=2,special=false}={},out={}){
 const clean=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
 const p=Math.max(0,Math.min(1,clean(progress))),i=Math.max(0,Math.min(4,clean(index,2)));
 const sx=clean(source?.x),sy=clean(source?.y),sz=clean(source?.z),tx=clean(target?.x),ty=clean(target?.y),tz=clean(target?.z);
 const dx=tx-sx,dy=ty-sy,dz=tz-sz,span=Math.hypot(dx,dz)||1,lx=dz/span,lz=-dx/span;
 const spread=special?(i-2)*.22:.15,lift=special?.16+Math.abs(i-2)*.075:.12;
 const wave=Math.sin(Math.PI*p),slope=Math.PI*Math.cos(Math.PI*p);
 out.x=sx+dx*p+lx*wave*spread;out.y=sy+dy*p+wave*lift;out.z=sz+dz*p+lz*wave*spread;
 out.dx=dx+lx*slope*spread;out.dy=dy+slope*lift;out.dz=dz+lz*slope*spread;
 return out;
}

/** Pooled native stage atmosphere, painted energy and geometric depth. */
export function createOverlordStageEffects(THREE,{images={}}={}){
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
 // Broad folded surfaces move at separate depths around the real hall. They
 // leave the center clear for the face, instead of covering it in light lines.
 const curtainMaterial=own(new THREE.MeshBasicMaterial({color:astral,vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
 const curtains=[];
 for(const side of[-1,1]){
  const columns=24,rows=2,positions=new Float32Array((columns+1)*(rows+1)*3),colors=new Float32Array(positions.length),indices=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
   const at=(row*(columns+1)+col)*3,edge=Math.sin(col/columns*Math.PI)*.7+.08,vertical=row===1?1:.12;
   colors.set([edge*vertical,edge*vertical*.40,edge*vertical*.85],at);
   if(row<rows&&col<columns){const a=row*(columns+1)+col,b=a+1,d=a+columns+1,e=d+1;indices.push(a,d,b,b,d,e);}
  }
  const geometry=own(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,curtainMaterial);mesh.name='folded-astral-curtain-'+(side<0?'left':'right');mesh.frustumCulled=false;mesh.visible=false;group.add(mesh);curtains.push({mesh,positions,columns,rows,side});
 }
 const streamGeometry=own(new THREE.BufferGeometry()),streamPositions=new Float32Array(96*2*3);
 streamGeometry.setAttribute('position',new THREE.BufferAttribute(streamPositions,3));
 const streamMaterial=own(new THREE.LineBasicMaterial({color:ice,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const streams=new THREE.LineSegments(streamGeometry,streamMaterial);streams.name='rushing-astral-light-streaks';group.add(streams);
 const victoryGeometry=own(new THREE.BufferGeometry()),victoryPositions=new Float32Array(24*2*3);victoryGeometry.setAttribute('position',new THREE.BufferAttribute(victoryPositions,3));
 const victoryMaterial=own(new THREE.LineBasicMaterial({color:gold,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const victoryRays=new THREE.LineSegments(victoryGeometry,victoryMaterial);victoryRays.name='victory-dawn-rays';group.add(victoryRays);
 const shockMaterial=own(new THREE.MeshBasicMaterial({color:'#f5d1fa',transparent:true,opacity:0,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
 const shockwave=new THREE.Mesh(own(new THREE.RingGeometry(.90,1,64)),shockMaterial);shockwave.name='expanding-impact-shockwave';shockwave.rotation.x=-Math.PI/2;group.add(shockwave);
 const fracturePositions=new Float32Array(9*3*2*3),fractureGeometry=own(new THREE.BufferGeometry());fractureGeometry.setAttribute('position',new THREE.BufferAttribute(fracturePositions,3));
 const fractureMaterial=own(new THREE.LineBasicMaterial({color:'#f48f99',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const fractures=new THREE.LineSegments(fractureGeometry,fractureMaterial);fractures.name='timed-ground-impact-fractures';fractures.frustumCulled=false;fractures.visible=false;group.add(fractures);
 const glowPixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,r=Math.hypot((x+.5)/16-1,(y+.5)/16-1);glowPixels[i]=glowPixels[i+1]=glowPixels[i+2]=255;glowPixels[i+3]=Math.round(Math.max(0,1-r)**2*255);}
 const bloomTexture=own(new THREE.DataTexture(glowPixels,32,32));bloomTexture.needsUpdate=true;
 const bloomMaterial=own(new THREE.MeshBasicMaterial({color:'#fff0df',map:bloomTexture,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 const bloom=new THREE.Mesh(own(new THREE.PlaneGeometry(5.6,5.6)),bloomMaterial);bloom.name='bounded-impact-bloom';group.add(bloom);
 const rubbleMaterial=own(new THREE.MeshStandardMaterial({color:'#27212a',roughness:.76,metalness:.1})),rubbleGeometry=own(new THREE.OctahedronGeometry(1,0)),rubble=[];
 for(let i=0;i<9;i++){const shard=new THREE.Mesh(rubbleGeometry,rubbleMaterial);shard.name='rising-marble-fragment';shard.scale.set(.055+(i%3)*.017,.03+(i%2)*.016,.04+(i%4)*.01);group.add(shard);rubble.push(shard);}

 const energyPlanes=[],energyTextures=[];let energyImage=null;
 for(let i=0;i<3;i++){
  const texture=own(new THREE.Texture());texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.repeat.set(1/3,1);texture.offset.set(i/3,0);energyTextures.push(texture);
  const material=own(new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));
  const object=new THREE.Sprite(material);object.name=['painted-sword-wake','painted-impact-flare','painted-casting-aura'][i];object.visible=false;object.renderOrder=12+i;group.add(object);energyPlanes.push(object);
 }
 let disposed=false;
 function update({time=0,motion=true,environment={},boss={x:.45,y:0,z:.2},target={x:-.4,y:0,z:1.2},camera}={}){
  if(disposed)return;const t=motion&&Number.isFinite(time)?time:0,rage=clamp(environment.rage),win=clamp(environment.gold),opening=clamp(environment.portal),wind=motion?clamp(environment.wind):0,pulse=motion?clamp(environment.pulse):0;
  if(images.battleEnergy&&images.battleEnergy!==energyImage){energyImage=images.battleEnergy;for(const texture of energyTextures){texture.image=energyImage;texture.needsUpdate=true;}}
  const burst=motion?clamp(environment.flash||0):0,charge=motion?clamp(environment.pulse||0)*clamp(environment.rift||0):0;
  for(let i=0;i<energyPlanes.length;i++){const plane=energyPlanes[i],power=i===0?clamp(environment.stream||0)*.48:i===1?burst:charge;plane.visible=!!energyImage&&motion&&power>.001;plane.material.opacity=power*(i===2?.48:.84);plane.material.rotation=i===0?-.48:i===2?t*.12:0;const location=i===1&&(environment.impactTarget!=='boss')?target:boss;plane.position.set(location.x,location.y+(i===1?.9:1.6),location.z+.12);plane.scale.setScalar(i===1?1.35+burst*1.15:3.6);}
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
  curtainMaterial.opacity=rift*.30;curtainMaterial.color.copy(astral).lerp(red,clamp(environment.eclipse)*.65);
  for(const {mesh,positions,columns,rows,side}of curtains){
   mesh.visible=rift>.001;
   if(!mesh.visible)continue;
   for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
    const u=col/columns,v=row/rows,fold=Math.sin(u*Math.PI*3.2-t*.67+side*.8),depth=u*3.8;
    positions.set([boss.x+side*(1.47+fold*.25+Math.sin(v*Math.PI)*.12),.13+v*3.9+Math.sin(u*5+t*.48)*.13,boss.z-.62-depth+Math.sin(v*Math.PI)*.22],(row*(columns+1)+col)*3);
   }mesh.geometry.attributes.position.needsUpdate=true;
  }
  streams.visible=stream>.001;streamMaterial.opacity=stream*.74;streamMaterial.color.copy(ice).lerp(red,rage*.24);
  if(streams.visible)for(let i=0;i<96;i++){
   const a=i*2.399963+t*.11,flight=(i*.618033+t*(.32+stream*.7))%1,radius=1.1+flight*3.8,z=-7+flight*9,len=.16+flight*.8;
   const x=.45+Math.cos(a)*radius,y=1.6+Math.sin(a)*radius*.67,j=i*6;
   streamPositions.set([x,y,z,x+Math.cos(a)*len,y+Math.sin(a)*len*.67,z+len*1.9],j);
  }
  if(streams.visible)streamGeometry.attributes.position.needsUpdate=true;
  victoryRays.visible=winRays>.001;victoryMaterial.opacity=winRays*.70;
  if(victoryRays.visible){for(let i=0;i<24;i++){const a=i*Math.PI/12+t*.10,inner=.42+(i%3)*.12,outer=3.6+(i%4)*.4,j=i*6;victoryPositions.set([boss.x+Math.cos(a)*inner,1.5+Math.sin(a)*inner*.7,boss.z-1,boss.x+Math.cos(a)*outer,1.5+Math.sin(a)*outer*.7,boss.z-3],j);}victoryGeometry.attributes.position.needsUpdate=true;}
  const impactTarget=environment.impactTarget==='boss'?boss:target,travel=clamp(environment.shockTravel),radius=.20+travel*2.3;
  shockwave.visible=shock>.001;shockMaterial.opacity=shock*.58;shockMaterial.color.copy(ice).lerp(gold,win);shockwave.position.set(impactTarget.x,.095,impactTarget.z);shockwave.scale.setScalar(radius);
  fractures.visible=shock>.001;fractureMaterial.opacity=shock*(1-travel*.55)*.68;fractureMaterial.color.copy(red).lerp(gold,win*.8);
  if(fractures.visible)for(let i=0;i<9;i++){
   const angle=i/9*Math.PI*2+.21,dx=Math.cos(angle),dz=Math.sin(angle),bend=(i%2?1:-1)*radius*.09;
   const points=[[dx*radius*.10,dz*radius*.10],[dx*radius*.44-dz*bend,dz*radius*.44+dx*bend],[dx*radius*.73+dz*bend*.3,dz*radius*.73-dx*bend*.3],[dx*radius*(.86+(i%3)*.055),dz*radius*(.86+(i%3)*.055)]];
   for(let step=0;step<3;step++){const j=(i*3+step)*6;fracturePositions.set([impactTarget.x+points[step][0],.097,impactTarget.z+points[step][1],impactTarget.x+points[step+1][0],.097,impactTarget.z+points[step+1][1]],j);}
  }if(fractures.visible)fractureGeometry.attributes.position.needsUpdate=true;
  bloom.visible=flash>.001;bloomMaterial.opacity=flash*.38;bloom.position.set(impactTarget.x,impactTarget.y+(environment.impactTarget==='boss'?1.3:.9),impactTarget.z+.08);bloom.scale.setScalar(.6+flash*.72);if(camera)bloom.lookAt(camera.position);
 }
 update({motion:false});
 return {group,portal,seal,embers,passage,curtains:curtains.map(item=>item.mesh),streams,shockwave,fractures,bloom,victoryRays,update,dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const item of owned)item.dispose();owned.clear();}};
}
