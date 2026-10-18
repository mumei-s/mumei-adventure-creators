import * as THREE from '../maze/vendor/three.module.js';

const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
export const TOWN_PALACE_COLORS={stone:'#b2aaa3',shadow:'#5c5663',roof:'#462c70',roofLight:'#6a438d',gold:'#c8a567',door:'#503a30',glass:'#68b9c0',rose:'#c78ea7'};

/** Small deterministic material maps are ready with the geometry; no texture request blocks entry. */
function palaceSurface(resources,kind){
  const size=128,data=new Uint8Array(size*size*4),brick=kind==='stone',course=brick?8:10;
  // Low contrast mineral grain survives close views; darker, irregular joints remain
  // narrow enough to read as cut limestone and overlapping slate rather than bricks.
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const row=Math.floor(y/course),stagger=row%2?course:0,xx=(x+stagger)%(course*2),yy=y%course;
    const noise=((x*17+y*37+(x*y)%73)%23)/23,block=((Math.floor((x+stagger)/(course*2))*13+row*7)%11)-5;
    const seam=yy===0||xx===0,edge=yy===1||xx===1,weather=Math.max(0,Math.sin(x*.11+y*.04)*Math.sin(y*.13))*(brick?7:3);
    const value=seam?(brick?157:123):Math.round((brick?226:211)+block+(noise-.5)*(brick?10:16)-weather+(edge?6:0));
    const i=(y*size+x)*4;data[i]=value;data[i+1]=Math.min(255,value+(brick?-2:0));data[i+2]=Math.min(255,value+(brick?-5:4));data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.name='palace-'+kind+'-detail';texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;resources.add(texture);return texture;
}

/** A slate spire is a coursed, slightly concave roof with a flared eave.
 * One smooth lathed shell replaces ten floating rings around a low-poly cone. */
function slateSpireGeometry(){
  const profile=[new THREE.Vector2(1.015,0),new THREE.Vector2(1.015,.018),new THREE.Vector2(.96,.04)];
  for(let row=1;row<12;row++){
    const y=row/12,r=Math.pow(1-y,1.16);profile.push(new THREE.Vector2(r+.005,y-.006),new THREE.Vector2(r+.015,y+.002));
  }
  profile.push(new THREE.Vector2(.012,.99),new THREE.Vector2(0,1));
  const geometry=new THREE.LatheGeometry(profile,24);geometry.name='palace-coursed-slate-spire';
  const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){uv.setX(i,uv.getX(i)*3);uv.setY(i,uv.getY(i)*2);}return geometry;
}

function cutStoneVaultGeometry(width,height,thickness,depth){
  const outer=gothicShape(width,height).getPoints(10),inner=gothicShape(width-thickness*2,height-thickness*1.6).getPoints(10),positions=[],normals=[],uvs=[];
  for(let n=1;n<outer.length;n++){
    // Separate every dressed voussoir by a hairline mortar joint. The curved
    // opening remains genuinely hollow, including its visible underside.
    const a=outer[n-1].clone().lerp(outer[n],.025),b=outer[n-1].clone().lerp(outer[n],.975),d=inner[n-1].clone().lerp(inner[n],.025),e=inner[n-1].clone().lerp(inner[n],.975);
    d.y+=thickness;e.y+=thickness;const shape=new THREE.Shape();shape.moveTo(a.x,a.y);shape.lineTo(b.x,b.y);shape.lineTo(e.x,e.y);shape.lineTo(d.x,d.y);shape.closePath();
    const block=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.007,bevelThickness:.008,curveSegments:1});
    positions.push(...block.attributes.position.array);normals.push(...block.attributes.normal.array);uvs.push(...block.attributes.uv.array);block.dispose();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.name='palace-cut-stone-vault';return geometry;
}

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

function royalRoseGeometry(){
  const position=[],color=[],colors=['#59a8b5','#b184bb','#e1b66d','#bc7397'].map(value=>new THREE.Color(value)),inner=.13,outer=.68;
  for(let n=0;n<24;n++){
    const a=n*TAU/24,bb=(n+1)*TAU/24,values=[[Math.cos(a)*inner,Math.sin(a)*inner,.035],[Math.cos(a)*outer,Math.sin(a)*outer,0],[Math.cos(bb)*outer,Math.sin(bb)*outer,0],[Math.cos(a)*inner,Math.sin(a)*inner,.035],[Math.cos(bb)*outer,Math.sin(bb)*outer,0],[Math.cos(bb)*inner,Math.sin(bb)*inner,.035]];
    for(const point of values){position.push(...point);const tint=colors[Math.floor(n/2)%colors.length];color.push(tint.r,tint.g,tint.b);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,3));geometry.computeVertexNormals();geometry.name='palace-royal-rose-glass';return geometry;
}

/** The same gold portal, violet spires and luminous glass as the illustrated entrance.
 * Every solid remains inside the authored castle footprint; only its existing stairs extend south. */
export function buildTownPalace({building,b,materials,resources,root}){
  const {x,z,w,h}=building,cx=x+w/2,cz=z+h/2,south=z+h,bucket=building.id,colors=TOWN_PALACE_COLORS;
  const material=(name,color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.88,...extra});m.name=name;resources.add(m);return m;};
  const stoneMap=palaceSurface(resources,'stone'),roofMap=palaceSurface(resources,'slate');
  const stone=material('palace-stone',colors.stone,{map:stoneMap,bumpMap:stoneMap,bumpScale:.025,roughness:.91}),shadow=material('palace-shadow',colors.shadow,{map:stoneMap}),roof=material('palace-roof',colors.roof,{map:roofMap,bumpMap:roofMap,bumpScale:.035,roughness:.73,metalness:.035}),gold=material('palace-gold',colors.gold,{metalness:.68,roughness:.33,emissive:'#2d1b0e',emissiveIntensity:.025}),door=material('palace-door',colors.door,{metalness:.025,roughness:.79}),glass=material('palace-glass','#f2c785',{emissive:'#ffb43f',emissiveIntensity:.32,roughness:.23,metalness:.12}),teal=material('palace-glass-teal',colors.glass,{emissive:'#39babb',emissiveIntensity:.16,roughness:.24,metalness:.1}),rose=material('palace-glass-rose',colors.rose,{emissive:'#e35696',emissiveIntensity:.14,roughness:.24,metalness:.1}),flagMaterial=material('palace-banner','#86518d',{side:THREE.DoubleSide,roughness:.86});
  const addGeo=geometry=>{resources.add(geometry);return geometry;},windowGeometry=addGeo(gothicGeometry(.58,1.45,.065)),windowFrame=addGeo(archGeometry(.77,1.64,.085,.12)),gateFrame=addGeo(archGeometry(3.1,3.8,.2,.2)),gateGeometry=addGeo(gothicGeometry(2.65,3.45,.09));
  windowGeometry.name='palace-recessed-glass';windowFrame.name='palace-window-surround';gateFrame.name='palace-gate-frame';gateGeometry.name='palace-golden-gate';
  const towerGeometry=addGeo(new THREE.CylinderGeometry(1,1,1,24));towerGeometry.name='palace-smooth-limestone-tower';
  const towerUV=towerGeometry.attributes.uv;for(let i=0;i<towerUV.count;i++){towerUV.setX(i,towerUV.getX(i)*2);towerUV.setY(i,towerUV.getY(i)*3);}
  const spireGeometry=addGeo(slateSpireGeometry());
  const model=(geometry,mat,px,py,pz,sx=1,sy=1,sz=1,turn=0)=>b.instance(geometry,mat,px,py,pz,sx,sy,sz,turn,bucket);
  const archWindow=(px,py,pz,scale=1,mat=glass,turn=0)=>{
    const fx=Math.sin(turn),fz=Math.cos(turn);
    model(windowFrame,shadow,px,py-.07,pz,scale*1.13,scale*1.07,scale,turn);
    // Glass sits behind the proud stone jambs. Gold belongs to its fine tracery,
    // leaving heavy, pale masonry to carry the building's visual weight.
    model(windowFrame,stone,px+fx*.12,py-.035,pz+fz*.12,scale,scale,scale*1.35,turn);model(windowGeometry,mat,px+fx*.045,py,pz+fz*.045,scale*.96,scale*.98,scale*.4,turn);
    b.box(px+fx*.115,py+.58*scale,pz+fz*.115,.036*scale,1.1*scale,.035,gold,turn,bucket);
    b.box(px+fx*.115,py+.48*scale,pz+fz*.115,.5*scale,.036*scale,.035,gold,turn,bucket);
    b.box(px,py-.12,pz,.92*scale,.12,.26,stone,turn,bucket);
  };
  function buttress(px,pz,height,turn=0){
    b.box(px,height*.5,pz,.25,height,.45,shadow,turn,bucket);b.box(px-.05,height*.5,pz+.09,.18,height,.3,stone,turn,bucket);
    for(const at of[.08,.48,.82]){b.box(px,height*at,pz,.42,.13,.56,stone,turn,bucket);b.box(px,height*at+.055,pz+.04,.44,.04,.6,stone,turn,bucket);}
    b.box(px,height+.12,pz,.38,.22,.53,stone,turn,bucket);
  }
  const arcadeGeometry=addGeo(archGeometry(1.44,2.86,.095,.13));arcadeGeometry.name='palace-royal-arcade';
  const rosetteGeometry=addGeo(new THREE.TorusGeometry(.68,.045,6,36));rosetteGeometry.name='palace-rose-tracery';
  const roseGlass=material('palace-rose-mosaic','#ffffff',{vertexColors:true,emissive:'#a89a75',emissiveIntensity:.2,roughness:.29,metalness:.1,side:THREE.DoubleSide});
  const roseGeometry=addGeo(royalRoseGeometry());
  function goldLeaf(px,py,pz,scale=1){
    b.ball(px,py,pz,.07*scale,.18*scale,.035,gold,bucket);for(const side of[-1,1]){b.ball(px+side*.11*scale,py-.05*scale,pz,.12*scale,.055*scale,.035,gold,bucket);b.peak(px+side*.11*scale,py+.04*scale,pz,.065*scale,.2*scale,gold,bucket);}b.round(px,py-.22*scale,pz,.035*scale,.2*scale,gold,bucket);
  }
  function wallFountain(px){
    // The relief and bowls stay within the existing facade overhang; no new walking obstacle.
    const pz=south+.04;model(windowFrame,shadow,px,.31,pz,.98,1.1,.7);b.ball(px,1.47,pz+.19,.26,.31,.09,gold,bucket);
    for(let n=0;n<9;n++){const a=n*TAU/9;b.ball(px+Math.cos(a)*.23,1.47+Math.sin(a)*.29,pz+.18,.095,.1,.055,gold,bucket);}
    b.ball(px,1.43,pz+.27,.17,.2,.06,gold,bucket);b.ball(px,1.33,pz+.34,.09,.06,.055,gold,bucket);
    b.round(px,.5,pz+.07,.35,.15,shadow,bucket);b.round(px,.58,pz+.07,.37,.09,stone,bucket);b.round(px,.635,pz+.07,.29,.022,teal,bucket);
    for(const dx of[-.025,0,.025])b.round(px+dx,.95,pz+.3,.009,.6,teal,bucket);
  }
  const effects=[];
  function banner(px,py,pz,index){
    b.round(px,py-.28,pz,.028,1.23,gold,bucket);b.peak(px,py+.42,pz,.075,.21,gold,bucket);
    const geometry=new THREE.PlaneGeometry(.84,.43,12,4);geometry.translate(.42,-.2,0);
    const flag=b.mesh(geometry,flagMaterial,new THREE.Vector3(px,py+.22,pz),bucket);flag.name='palace-banner-'+index;flag.userData.occluder=false;flag.castShadow=false;
    effects.push({kind:'banner',object:flag,rest:geometry.attributes.position.array.slice(),phase:index*1.7});
    b.ball(px,py+.54,pz,.045,.07,.045,gold,bucket);
  }
  function tower(px,pz,r,height,roofHeight,index,small=false){
    b.round(px,.19,pz,r*1.12,.38,shadow,bucket);model(towerGeometry,stone,px,height*.5+.22,pz,r,height,r);
    for(const yy of[.48,height*.48,height-.12]){model(towerGeometry,stone,px,yy,pz,r*1.08,.13,r*1.08);model(towerGeometry,stone,px,yy+.075,pz,r*1.095,.045,r*1.095);b.round(px,yy-.12,pz,r*1.1,.065,shadow,bucket);}
    // Dressed-stone courses and attached ribs give the towers a faceted, sculpted body.
    for(let yy=.7;yy<height-.2;yy+=.58)model(towerGeometry,stone,px,yy,pz,r*1.008,.025,r*1.008);
    for(let n=0;n<6;n++){const angle=n*TAU/6;b.round(px+Math.sin(angle)*r*.96,height*.5+.22,pz+Math.cos(angle)*r*.96,.035,height-.18,stone,bucket);}
    const roofBase=height+.36;b.round(px,roofBase-.05,pz,r*1.24,.13,shadow,bucket);model(towerGeometry,stone,px,roofBase+.015,pz,r*1.27,.09,r*1.27);
    model(spireGeometry,roof,px,roofBase,pz,r*1.3,roofHeight,r*1.3);
    // A handful of old bronze clips accent the roof; its slate courses carry the
    // detail. Replacing hundreds of gold studs funds the smoother roof geometry.
    for(let n=0;n<3;n++){const a=n*TAU/3;for(const f of[.27,.69]){const rr=r*1.3*Math.pow(1-f,1.16)+.025;b.ball(px+Math.sin(a)*rr,roofBase+roofHeight*f,pz+Math.cos(a)*rr,.027,.045,.027,gold,bucket);}}
    b.round(px,roofBase+roofHeight+.28,pz,.035,.6,gold,bucket);b.peak(px,roofBase+roofHeight+.63,pz,.11,.25,gold,bucket);
    if(!small){archWindow(px,height*.36,pz+r*.97,.74,index%2?teal:glass);archWindow(px,height*.7,pz+r*.97,.67,glass);for(const side of[-1,1])archWindow(px+side*r*.97,height*.52,pz,.55,glass,side*Math.PI/2);banner(px,roofBase+roofHeight+.85,pz,index);}
    else archWindow(px,height*.52,pz+r*.97,.64,glass);
    // A shallow terrace and balustrade give the lower round towers visible depth.
    if(index<2){model(towerGeometry,stone,px,height*.53,pz,r*1.24,.17,r*1.24);for(let n=0;n<11;n++){const a=n*Math.PI/10;b.round(px+Math.cos(a)*r*1.14,height*.53+.29,pz+Math.sin(a)*r*1.14,.028,.52,gold,bucket);}b.round(px,height*.53+.58,pz,r*1.25,.06,shadow,bucket);}
  }
  // The palace rises in three layers: the broad entrance, rear keep, then five spires.
  b.box(cx,.15,cz,w,.3,h,shadow,0,bucket);
  b.box(cx,2.05,cz,w-1.45,3.8,h-.2,stone,0,bucket);
  for(const yy of[.4,1.2,3.82]){b.box(cx,yy,south-.01,w-1.25,.14,.18,stone,0,bucket);b.box(cx,yy+.07,south+.025,w-1.25,.035,.2,gold,0,bucket);b.box(cx,yy-.1,south-.12,w-1.05,.13,.2,shadow,0,bucket);}
  for(let yy=.52;yy<3.72;yy+=.36){
    b.box(cx,yy,south+.008,w-1.48,.017,.025,shadow,0,bucket);
    for(let col=0;col<14;col++){const xx=x+.78+col*.9+(Math.round(yy/.36)%2?.45:0);if(xx<x+w-.78)b.box(xx,yy+.17,south+.008,.014,.34,.025,shadow,0,bucket);}
  }
  // A parapet around the roof shows top, front and side faces instead of a flat strip.
  for(const side of[-1,1])for(let n=0;n<13;n++){const px=x+.9+n*(w-1.8)/12;b.box(px,4.02,side<0?z+.2:south-.2,.36,.48,.4,stone,0,bucket);b.box(px,4.27,side<0?z+.2:south-.2,.4,.06,.44,gold,0,bucket);}
  for(const side of[-1,1])for(const f of[.18,.31])buttress(cx+side*w*f,south-.05,3.65);
  // Pilasters, capitals and tall stained windows are readable from the walking camera.
  for(const side of[-1,1])for(const fraction of[.2,.34]){
    const px=cx+side*w*fraction;b.box(px,1.99,south+.015,.19,3.78,.3,shadow,0,bucket);b.box(px,3.8,south+.03,.37,.22,.4,gold,0,bucket);
  }
  for(const fraction of[.23,.37,.63,.77]){
    const px=x+w*fraction;model(arcadeGeometry,gold,px,.72,south+.19,1,1,.8);archWindow(px,1.46,south+.23,.88,fraction<.5?glass:teal);goldLeaf(px,3.63,south+.2,.8);
  }
  // A pierced upper arcade joins the towers; the gilded top rail catches daylight.
  for(const side of[-1,1]){
    for(let n=0;n<7;n++){const px=cx+side*(2.1+n*.49);model(windowFrame,gold,px,3.93,south-.07,.52,.37,.6);b.box(px,4.34,south-.02,.045,.65,.06,gold,0,bucket);}
    b.box(cx+side*3.57,4.62,south-.02,3.8,.075,.15,gold,0,bucket);b.box(cx+side*3.57,3.94,south-.02,3.8,.08,.18,shadow,0,bucket);
  }
  // Upper gallery and central keep behind the entrance arch establish a whole palace.
  b.box(cx,4.65,z+1.83,6.5,3.35,2.85,stone,0,bucket);b.box(cx,6.25,z+1.83,6.85,.18,3.12,stone,0,bucket);b.box(cx,6.35,z+1.83,6.9,.055,3.16,gold,0,bucket);
  b.mesh(new THREE.ConeGeometry(4.3,2.35,4).rotateY(Math.PI/4).scale(1,1,.53),roof,new THREE.Vector3(cx,7.47,z+1.83),bucket).name='palace-gallery-roof';
  for(const side of[-1,1]){
    archWindow(cx+side*1.95,4.68,z+3.29,.92,glass);goldLeaf(cx+side*2.6,5.4,z+3.39,1.2);
    // Rich heraldic banners sit on the stone keep, below its existing roof line.
    b.box(cx+side*2.8,4.85,z+3.36,.39,1.35,.035,flagMaterial,0,bucket);b.peak(cx+side*2.8,4.15,z+3.36,.25,.35,gold,bucket);goldLeaf(cx+side*2.8,4.93,z+3.42,.72);
  }
  model(roseGeometry,roseGlass,cx,5.41,z+3.43);model(rosetteGeometry,gold,cx,5.41,z+3.48);
  for(const scale of[.25,.5,.93])model(rosetteGeometry,gold,cx,5.41,z+3.52,scale,scale,.65);
  for(let n=0;n<12;n++){const a=n*TAU/12;b.box(cx+Math.cos(a)*.63,5.41+Math.sin(a)*.63,z+3.52,.035,.035,.06,gold,0,bucket);}b.ball(cx,5.41,z+3.55,.13,.13,.05,gold,bucket);
  tower(cx,z+1.25,1.05,8.9,3.25,4);
  for(const side of[-1,1])tower(cx+side*3.45,z+1.15,.78,7.3,2.8,side<0?2:3);
  for(const side of[-1,1])tower(cx+side*(w/2-1.1),south-1.25,.96,5.95,2.65,side<0?0:1);
  for(const side of[-1,1])tower(cx+side*2.3,south-.75,.42,4.1,1.65,6,true);
  // A separate sculpted arch surrounds golden double leaves, rather than a timber house door.
  const gateX=building.door.x;
  const outerGate=addGeo(archGeometry(3.92,4.65,.25,.35));outerGate.name='palace-sculpted-stone-arch';model(outerGate,shadow,gateX,-.02,south+.02,1.015,1.015,1);model(outerGate,stone,gateX,0,south+.19);
  const cutVault=addGeo(cutStoneVaultGeometry(3.92,4.65,.25,.045));model(cutVault,stone,gateX,0,south+.535);
  // Side buttresses and a proud arch make the threshold a gatehouse in its own right.
  for(const side of[-1,1])buttress(gateX+side*1.97,south-.04,4.05);
  model(gateGeometry,door,gateX,.1,south+.29);model(gateFrame,gold,gateX,0,south+.43);
  for(const side of[-1,1]){wallFountain(cx+side*2.95);goldLeaf(gateX+side*1.58,3.63,south+.52,1.3);for(const yy of[.48,2.52,3.13])b.box(gateX+side*1.58,yy,south+.5,.42,.07,.14,gold,0,bucket);}

  for(const side of[-1,1]){
    b.box(gateX+side*1.57,1.65,south+.38,.29,3.3,.45,stone,0,bucket);b.box(gateX+side*1.57,.27,south+.5,.48,.53,.52,gold,0,bucket);
    b.box(gateX+side*.7,1.35,south+.42,.63,1.78,.065,gold,0,bucket);b.box(gateX+side*.7,1.35,south+.465,.52,1.64,.035,door,0,bucket);
    model(windowGeometry,side<0?teal:rose,gateX+side*.7,1.02,south+.51,.51,.92,.5);
    for(const yy of[1.25,1.73,2.15]){model(windowFrame,gold,gateX+side*.7,yy,south+.575,.31,.3,.25);}
    b.ball(gateX+side*.14,1.2,south+.58,.065,.1,.065,gold,bucket);goldLeaf(gateX+side*.7,.55,south+.56,.62);

  }
  b.box(gateX,1.45,south+.58,.055,2.7,.045,gold,0,bucket);
  for(let n=0;n<4;n++)b.box(gateX,.025-n*.018,south+.25+n*.25,3.8+n*.24,.12,.34,n%2?stone:shadow,0,bucket);
  // Crest: a glowing jewel and real gold halo, with a slow breathing light.
  const halo=b.mesh(new THREE.TorusGeometry(.48,.045,6,28),gold,new THREE.Vector3(gateX,4.48,south+.32),bucket);halo.name='palace-crest';
  for(const side of[-1,1]){model(rosetteGeometry,gold,gateX+side*.65,4.48,south+.35,.32,.32,.7);goldLeaf(gateX+side*.97,4.45,south+.34,.9);}
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
