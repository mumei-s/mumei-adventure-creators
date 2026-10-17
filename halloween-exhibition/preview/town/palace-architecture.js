import * as THREE from '../maze/vendor/three.module.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
export const TOWN_PALACE_COLORS={stone:'#c7b9c4',shadow:'#776b91',roof:'#462c70',roofLight:'#6a438d',gold:'#e6b95c',door:'#bb782f',glass:'#68d7da',rose:'#ec91bb'};

function gothicShape(width,height){
  const half=width/2,shoulder=height-width*.68,shape=new THREE.Shape();
  shape.moveTo(-half,0);shape.lineTo(half,0);shape.lineTo(half,shoulder);
  shape.bezierCurveTo(half,height-width*.26,width*.24,height-width*.13,0,height);
  shape.bezierCurveTo(-width*.24,height-width*.13,-half,height-width*.26,-half,shoulder);shape.closePath();return shape;
}
function gothicGeometry(width,height,depth=.07){return new THREE.ExtrudeGeometry(gothicShape(width,height),{depth,steps:1,bevelEnabled:false,curveSegments:10});}
function archGeometry(width,height,thickness,depth){
  const shape=gothicShape(width,height),inner=gothicShape(width-thickness*2,height-thickness*1.6);
  // Holes are translated above the stone sill; the opening stays truly open in 3D.
  const points=inner.getPoints(24),hole=new THREE.Path();points.forEach((p,i)=>i?hole.lineTo(p.x,p.y+thickness):hole.moveTo(p.x,p.y+thickness));hole.closePath();shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:10});
}

/** The same gold portal, violet spires and luminous glass as the illustrated entrance.
 * Every solid remains inside the authored castle footprint; only its existing stairs extend south. */
export function buildTownPalace({building,b,materials,resources,root}){
  const {x,z,w,h}=building,cx=x+w/2,cz=z+h/2,south=z+h,bucket=building.id,colors=TOWN_PALACE_COLORS;
  const material=(name,color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.74,...extra});m.name=name;resources.add(m);return m;};
  const stone=material('palace-stone',colors.stone),shadow=material('palace-shadow',colors.shadow),roof=material('palace-roof',colors.roof),roofLight=material('palace-roof-light',colors.roofLight),gold=material('palace-gold',colors.gold,{metalness:.66,roughness:.35}),door=material('palace-door',colors.door,{metalness:.5,roughness:.42}),glass=material('palace-glass','#ffc77b',{emissive:'#ffb43f',emissiveIntensity:.8,roughness:.25}),teal=material('palace-glass-teal',colors.glass,{emissive:'#39babb',emissiveIntensity:.62,roughness:.25}),rose=material('palace-glass-rose',colors.rose,{emissive:'#e35696',emissiveIntensity:.48,roughness:.3}),flagMaterial=material('palace-banner','#86518d',{side:THREE.DoubleSide,roughness:.86});
  const addGeo=geometry=>{resources.add(geometry);return geometry;},windowGeometry=addGeo(gothicGeometry(.58,1.45,.065)),windowFrame=addGeo(archGeometry(.77,1.64,.085,.12)),gateFrame=addGeo(archGeometry(3.1,3.8,.2,.2)),gateGeometry=addGeo(gothicGeometry(2.65,3.45,.09));
  const model=(geometry,mat,px,py,pz,sx=1,sy=1,sz=1,turn=0)=>b.instance(geometry,mat,px,py,pz,sx,sy,sz,turn,bucket);
  const archWindow=(px,py,pz,scale=1,mat=glass,turn=0)=>{
    model(windowFrame,gold,px,py-.07,pz,scale,scale,scale,turn);model(windowGeometry,mat,px,py,pz+.13,scale,scale,scale,turn);
    b.box(px,py+.58*scale,pz+.22,.045*scale,1.1*scale,.045,gold,turn,bucket);
    b.box(px,py+.48*scale,pz+.22,.5*scale,.045*scale,.045,gold,turn,bucket);
  };
  const effects=[];
  function banner(px,py,pz,index){
    b.round(px,py-.28,pz,.028,1.23,gold,bucket);b.peak(px,py+.42,pz,.075,.21,gold,bucket);
    const geometry=new THREE.PlaneGeometry(.84,.43,12,4);geometry.translate(.42,-.2,0);
    const flag=b.mesh(geometry,flagMaterial,new THREE.Vector3(px,py+.22,pz),bucket);flag.name='palace-banner-'+index;flag.userData.occluder=false;flag.castShadow=false;
    effects.push({kind:'banner',object:flag,rest:geometry.attributes.position.array.slice(),phase:index*1.7});
    b.ball(px,py+.54,pz,.045,.07,.045,gold,bucket);
  }
  function tower(px,pz,r,height,roofHeight,index,small=false){
    b.round(px,.19,pz,r*1.12,.38,shadow,bucket);b.round(px,height*.5+.22,pz,r,height,stone,bucket);
    for(const yy of[.48,height*.48,height-.12]){b.round(px,yy,pz,r*1.07,.14,gold,bucket);b.round(px,yy-.12,pz,r*1.1,.13,shadow,bucket);}
    const roofBase=height+.36;b.round(px,roofBase-.05,pz,r*1.24,.2,shadow,bucket);b.round(px,roofBase+.08,pz,r*1.27,.08,gold,bucket);
    b.peak(px,roofBase+roofHeight*.5,pz,r*1.3,roofHeight,roof,bucket);
    // Raised courses catch light on all roof faces rather than painting a flat triangle.
    for(let row=1;row<7;row++){const f=row/7;b.round(px,roofBase+roofHeight*f,pz,r*1.3*(1-f)+.025,.055,roofLight,bucket);}
    b.round(px,roofBase+roofHeight+.28,pz,.035,.6,gold,bucket);b.peak(px,roofBase+roofHeight+.63,pz,.11,.25,gold,bucket);
    if(!small){archWindow(px,height*.36,pz+r*.97,.86,index%2?teal:glass);archWindow(px,height*.7,pz+r*.97,.72,glass);banner(px,roofBase+roofHeight+.85,pz,index);}
    else archWindow(px,height*.52,pz+r*.97,.64,glass);
    // A shallow terrace and balustrade give the lower round towers visible depth.
    if(index<2){b.round(px,height*.53,pz,r*1.24,.17,stone,bucket);for(let n=0;n<11;n++){const a=n*Math.PI/10;b.round(px+Math.cos(a)*r*1.14,height*.53+.29,pz+Math.sin(a)*r*1.14,.028,.52,gold,bucket);}b.round(px,height*.53+.58,pz,r*1.25,.06,shadow,bucket);}
  }
  // The palace rises in three layers: the broad entrance, rear keep, then five spires.
  b.box(cx,.15,cz,w,.3,h,shadow,0,bucket);
  b.box(cx,2.05,cz,w-1.45,3.8,h-.2,stone,0,bucket);
  for(const yy of[.4,1.2,3.82]){b.box(cx,yy,south-.01,w-1.25,.14,.18,gold,0,bucket);b.box(cx,yy,south-.12,w-1.05,.13,.2,shadow,0,bucket);}
  // Pilasters, capitals and tall stained windows are readable from the walking camera.
  for(const side of[-1,1])for(const fraction of[.2,.34]){
    const px=cx+side*w*fraction;b.box(px,1.99,south+.015,.19,3.78,.3,shadow,0,bucket);b.box(px,3.8,south+.03,.37,.22,.4,gold,0,bucket);
  }
  for(const fraction of[.23,.37,.63,.77])archWindow(x+w*fraction,1.55,south+.02,.85,fraction<.5?glass:teal);
  // Upper gallery and central keep behind the entrance arch establish a whole palace.
  b.box(cx,4.65,z+1.83,6.5,3.35,2.85,stone,0,bucket);b.box(cx,6.25,z+1.83,6.85,.18,3.12,gold,0,bucket);
  b.mesh(new THREE.ConeGeometry(4.3,2.35,4).rotateY(Math.PI/4).scale(1,1,.53),roof,new THREE.Vector3(cx,7.47,z+1.83),bucket).name='palace-gallery-roof';
  for(const side of[-1,1])archWindow(cx+side*1.95,4.68,z+3.29,.92,glass);
  tower(cx,z+1.25,1.05,8.9,3.25,4);
  for(const side of[-1,1])tower(cx+side*3.45,z+1.15,.78,7.3,2.8,side<0?2:3);
  for(const side of[-1,1])tower(cx+side*(w/2-1.1),south-1.25,.96,5.95,2.65,side<0?0:1);
  for(const side of[-1,1])tower(cx+side*2.3,south-.75,.42,4.1,1.65,6,true);
  // A separate sculpted arch surrounds golden double leaves, rather than a timber house door.
  const gateX=building.door.x;b.box(gateX,1.92,south+.13,3.42,3.84,.25,shadow,0,bucket);
  model(gateGeometry,door,gateX,.1,south+.29);model(gateFrame,gold,gateX,0,south+.43);
  for(const side of[-1,1]){
    b.box(gateX+side*1.57,1.65,south+.38,.29,3.3,.45,stone,0,bucket);b.box(gateX+side*1.57,.27,south+.5,.48,.53,.52,gold,0,bucket);
    b.box(gateX+side*.7,1.35,south+.42,.74,1.78,.065,gold,0,bucket);b.box(gateX+side*.7,1.35,south+.465,.61,1.64,.035,door,0,bucket);
    model(windowGeometry,side<0?teal:rose,gateX+side*.7,1.02,south+.51,.66,.92,.5);
    b.ball(gateX+side*.14,1.2,south+.58,.065,.1,.065,gold,bucket);
  }
  b.box(gateX,1.45,south+.58,.055,2.7,.045,gold,0,bucket);
  for(let n=0;n<4;n++)b.box(gateX,.025-n*.018,south+.25+n*.25,3.8+n*.24,.12,.34,n%2?stone:shadow,0,bucket);
  // Crest: a glowing jewel and real gold halo, with a slow breathing light.
  const halo=b.mesh(new THREE.TorusGeometry(.48,.045,6,28),gold,new THREE.Vector3(gateX,4.48,south+.32),bucket);halo.name='palace-crest';
  const heart=b.mesh(new THREE.OctahedronGeometry(.31),glass,new THREE.Vector3(gateX,4.48,south+.43),bucket);heart.scale.y=1.4;heart.name='palace-heart';effects.push({kind:'heart',object:heart});
  for(const side of[-1,1]){b.peak(gateX+side*.55,4.42,south+.3,.13,.3,gold,bucket);b.box(gateX+side*1.55,3.87,south+.3,.52,.12,.5,gold,0,bucket);}
  return {building:{id:building.id,footprint:{x,z,w,h},door:{...building.door},height:14.2,bucket,palace:true},effects};
}

export function animateTownPalace(effects,time=0,motion=true){
  for(const effect of effects||[]){const {object}=effect,t=motion?time:0;
    if(effect.kind==='banner'){
      const position=object.geometry.attributes.position;
      for(let n=0;n<position.count;n++){const i=n*3,xx=effect.rest[i],yy=effect.rest[i+1],wave=xx/.84;position.array[i+1]=yy+Math.sin(t*2.1+xx*5+effect.phase)*.025*wave;position.array[i+2]=Math.sin(t*2.5+xx*7+yy*2+effect.phase)*.13*wave;}
      position.needsUpdate=true;object.geometry.computeVertexNormals();
    }else if(effect.kind==='heart'){object.material.emissiveIntensity=.84+(motion?Math.sin(t*1.45)*.18:0);object.rotation.y=motion?Math.sin(t*.32)*.32:0;}
  }
}

/** Gradually pull back at the palace so all spires stay visible in either orientation. */
export function townPalaceFraming(position,map,elevation,width,height){
  const palace=map?.buildings?.find(item=>item.kind==='castle');if(!palace)return {influence:0};
  const cx=palace.x+palace.w/2,south=palace.z+palace.h;
  const approach=smooth((south+15-position.z)/8),side=smooth((palace.w/2+8-Math.abs(position.x-cx))/5),influence=approach*side;
  if(!influence)return {influence:0};
  const top=(position.z-(palace.z+1.25))*Math.sin(elevation)+14.2*Math.cos(elevation),bottom=-1.6;
  const verticalSpan=Math.max(16.5,top-bottom+3),horizontalSpan=palace.w+3.8;
  const pixelsPerTile=Math.min(width/horizontalSpan,height/verticalSpan),projectedCenter=(top+bottom)*.5;
  // Raising the target (without rotating it) preserves the compass and ground picking.
  return {influence,pixelsPerTile,targetX:cx,targetZ:position.z-2.1,targetY:(projectedCenter-2.1*Math.sin(elevation))/Math.cos(elevation)};
}
