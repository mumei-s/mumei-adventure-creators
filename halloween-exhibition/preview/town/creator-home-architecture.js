import * as THREE from '../maze/vendor/three.module.js';

const TAU=Math.PI*2;
const vegetationByResources=new WeakMap();
const surfacesByResources=new WeakMap();
const surfaceNoise=(x,y,seed)=>{const value=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return value-Math.floor(value);};
function surfaceTexture(kind){
  const size=kind==='slate'?128:64,color=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const grain=surfaceNoise(x,y,kind.length),fine=surfaceNoise(x*.37,y*.19,3);let light=242+(grain-.5)*10,height=125+(grain-.5)*24;
    if(kind==='wood'){
      const fibre=Math.sin(x*.63+Math.sin(y*.06)*1.2+Math.sin(x*.13)*2),pore=grain>.94?12:0;
      light=222+fibre*10+(fine-.5)*12-pore;height=125+fibre*28-pore;
    }else if(kind==='stone'||kind==='brick'){
      const course=kind==='brick'?8:16,row=Math.floor(y/course),column=Math.floor((x+(row%2)*8)/16),joint=y%course<1||(x+(row%2)*8)%16<1,block=surfaceNoise(column,row,21);
      light=joint?169:218+(block-.5)*18+(grain-.5)*14;height=joint?35:142+(grain-.5)*35;
    }else if(kind==='slate'){
      const row=Math.floor(y/16),column=Math.floor((x+(row%2)*8)/16),edge=y%16<2,seam=(x+(row%2)*8)%16<1,tile=surfaceNoise(column,row,12);
      light=edge?161:seam?176:219+(tile-.5)*24+(grain-.5)*10;height=edge?36:seam?72:116+(y%16)*4+(grain-.5)*15;
    }
    const offset=(y*size+x)*4;for(let channel=0;channel<3;channel++){color[offset+channel]=Math.max(0,Math.min(255,light));relief[offset+channel]=Math.max(0,Math.min(255,height));}color[offset+3]=relief[offset+3]=255;
  }
  const make=(bytes,role)=>{const texture=new THREE.DataTexture(bytes,size,size,THREE.RGBAFormat);texture.name='creator-home-'+kind+'-'+role;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;};
  const map=make(color,'color');map.colorSpace=THREE.SRGBColorSpace;return{map,bumpMap:make(relief,'relief')};
}
function homeSurfaces(resources){
  let surfaces=surfacesByResources.get(resources);if(surfaces&&resources.has(surfaces.plaster.map))return surfaces;
  surfaces=Object.fromEntries(['plaster','wood','stone','brick','slate'].map(kind=>[kind,surfaceTexture(kind)]));
  for(const maps of Object.values(surfaces))for(const texture of Object.values(maps))resources.add(texture);
  surfacesByResources.set(resources,surfaces);return surfaces;
}
function homeFoliage(b,resources,x,y,z,w,h,d,material,bucket){
  let geometry=vegetationByResources.get(resources);if(!geometry||!resources.has(geometry)){geometry=new THREE.IcosahedronGeometry(1,0);resources.add(geometry);vegetationByResources.set(resources,geometry);}
  b.instance(geometry,material,x,y,z,w,h,d,0,bucket);
}
function polygon(points){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return shape;}
function ellipse(x,y,rx,ry=rx){const shape=new THREE.Shape();shape.absellipse(x,y,rx,ry,0,TAU,false,0);return shape;}
function star(x,y,r,points=5){return polygon(Array.from({length:points*2},(_,i)=>{const a=i*Math.PI/points+Math.PI/2,s=i%2?r*.42:r;return[x+Math.cos(a)*s,y+Math.sin(a)*s];}));}
function stroke(x1,y1,x2,y2,width){const a=Math.atan2(y2-y1,x2-x1),dx=Math.sin(a)*width/2,dy=Math.cos(a)*width/2;return polygon([[x1-dx,y1+dy],[x2-dx,y2+dy],[x2+dx,y2-dy],[x1+dx,y1-dy]]);}
function hole(shape,x,y,rx,ry=rx){const path=new THREE.Path();path.absellipse(x,y,rx,ry,0,TAU,true,0);shape.holes.push(path);return shape;}
function cat(x=0,y=0,scale=1){return polygon([[-.3,-.21],[-.38,.3],[-.12,.2],[0,.24],[.14,.2],[.38,.3],[.3,-.21],[0,-.32]].map(([a,b])=>[x+a*scale,y+b*scale]));}

function crossRoof(points,depth){const shape=polygon(points),geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:8});geometry.translate(0,0,-depth/2);return geometry;}
function gable(width,depth,height){return crossRoof([[-width/2,0],[0,height],[width/2,0]],depth);}
function barrel(width,depth,height,steps=12){return crossRoof(Array.from({length:steps+1},(_,n)=>[-Math.cos(n*Math.PI/steps)*width/2,Math.sin(n*Math.PI/steps)*height]),depth);}
function hip(width,depth,height,top=.04){
  const a=width/2,d=depth/2,t=top,positions=[-a,0,-d,a,0,-d,a,0,d,-a,0,d,-a*t,height,-d*t,a*t,height,-d*t,a*t,height,d*t,-a*t,height,d*t],geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex([0,1,2,0,2,3,0,5,1,0,4,5,1,6,2,1,5,6,2,7,3,2,6,7,3,4,0,3,7,4,4,6,5,4,7,6]);
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((v,i)=>i%3===0?[v/width+.5,positions[i+2]/depth+.5]:[]),2));geometry.computeVertexNormals();return geometry;
}
function joinedRoof(parts){
  const positions=[],normals=[],uv=[];
  for(const [source,x=0,y=0,z=0]of parts){const geometry=source.index?source.toNonIndexed():source;geometry.translate(x,y,z);positions.push(...geometry.attributes.position.array);normals.push(...geometry.attributes.normal.array);uv.push(...geometry.attributes.uv.array);if(geometry!==source)geometry.dispose();source.dispose();}
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return result;
}

/** Roof silhouettes carry the character of a house even with its colors and crest hidden. */
export function creatorHomeRoofGeometry(motif,width,depth,height){
  const a=width/2;let geometry;
  switch(motif){
    case'lantern':geometry=joinedRoof([[gable(width,depth,height)],[gable(width*.33,depth*.31,height*.7),0,height*.44,depth*.38]]);break;
    case'bat-wing':geometry=joinedRoof([[gable(width,depth,height)],[hip(width*.2,depth*.22,height*1.12),-width*.37,height*.1,depth*.3],[hip(width*.2,depth*.22,height*1.12),width*.37,height*.1,depth*.3]]);break;
    case'wave-star':geometry=joinedRoof([[hip(width,depth,height*.65,.18)],[hip(width*.24,depth*.3,height*.85),-width*.32,height*.78,-depth*.17]]);break;
    case'candy':geometry=joinedRoof([[barrel(width,depth,height,10)],[hip(width*.19,depth*.23,height*.46,.3),-width*.37,height*.48,depth*.38],[hip(width*.19,depth*.23,height*.46,.3),width*.37,height*.48,depth*.38]]);break;
    case'open-book':geometry=crossRoof([[-a,0],[-a,height],[-a*.09,height*.28],[0,height*.19],[a*.09,height*.28],[a,height],[a,0]],depth);break;
    case'bread-loaf':geometry=hip(width,depth,height,.49);break;
    case'twin-stars':geometry=joinedRoof([[gable(width*.54,depth,height),-width*.245,0,0],[gable(width*.54,depth,height),width*.245,0,0]]);break;
    case'moon-cat':geometry=joinedRoof([[hip(width,depth,height*.65,.22)],[hip(width*.2,depth*.24,height*.96),-width*.33,height*.9,-depth*.25]]);break;
    case'cat-leaf':geometry=joinedRoof([[gable(width,depth,height)],[hip(width*.2,depth*.25,height*.7),-width*.35,height*.23,depth*.37],[hip(width*.2,depth*.25,height*.7),width*.35,height*.23,depth*.37]]);break;
    case'flower':geometry=barrel(width,depth,height,6);break;
    case'hedgehog':geometry=joinedRoof([[barrel(width,depth,height,16)],...Array.from({length:7},(_,n)=>[hip(width*.115,depth*.16,height*.33),0,height*.92,-depth*.42+n*depth*.14])]);break;
    case'shiba':geometry=joinedRoof([[gable(width,depth,height)],[gable(width*.6,depth*.32,height*.65),0,height*.1,depth*.39]]);break;
    case'woven-diamond':geometry=hip(width,depth,height,.42);break;
    case'three-stars':geometry=joinedRoof(Array.from({length:3},(_,n)=>[gable(width*.35,depth,height),width*(n-1)/3,0,0]));break;
    case'iris-flower':geometry=crossRoof([[-a,0],[-a*.88,height*.43],[-a*.62,height*.63],[-a*.3,height*.36],[0,height],[a*.3,height*.36],[a*.62,height*.63],[a*.88,height*.43],[a,0]],depth);break;
    case'lion':geometry=joinedRoof([[hip(width,depth,height,.18)],[barrel(width*.25,depth*.23,height*.38,8),0,height*.82,-depth*.1]]);break;
    // A broad, folded cape roof carries a hood-shaped lantern dormer and stem.
    // Its geometry, not a recolored crest, distinguishes the seventeenth home.
    case'pumpkin-book':geometry=joinedRoof([
      [crossRoof([[-a,0],[-a*.91,height*.38],[-a*.69,height*.64],[-a*.34,height*.48],[0,height*.72],[a*.34,height*.48],[a*.69,height*.64],[a*.91,height*.38],[a,0]],depth)],
      [barrel(width*.28,depth*.36,height*.55,10),0,height*.72,depth*.26],
      [hip(width*.065,depth*.12,height*.26,.65),0,height*1.24,depth*.26],
    ]);break;
    default:geometry=gable(width,depth,height);
  }
  geometry.name='creator-home-roof-'+motif;geometry.userData.motif=motif;return geometry;
}

function windowShape(kind){
  if(kind==='cat')return cat(0,0,1.35);
  if(kind==='round')return ellipse(0,0,.5);
  if(kind==='diamond')return polygon([[0,.63],[.5,0],[0,-.63],[-.5,0]]);
  if(kind==='book')return polygon([[-.57,-.46],[-.08,-.51],[0,-.61],[.08,-.51],[.57,-.46],[.57,.48],[.08,.55],[0,.46],[-.08,.55],[-.57,.48]]);
  if(kind==='arch'){const shape=new THREE.Shape();shape.moveTo(-.5,-.56);shape.lineTo(.5,-.56);shape.lineTo(.5,.05);shape.quadraticCurveTo(.48,.45,0,.67);shape.quadraticCurveTo(-.48,.45,-.5,.05);shape.closePath();return shape;}
  return polygon([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]);
}

function shapedWindow({b,resources,materials,trim,bucket,kind,x,y,z,width=1,height=1,mullions=true,geometryCache}){
  if(!geometryCache.has(kind)){
    const frame=windowShape(kind),opening=new THREE.Path(),points=windowShape(kind).getPoints(6);
    points.forEach((point,index)=>index?opening.lineTo(point.x*.8,point.y*.8):opening.moveTo(point.x*.8,point.y*.8));opening.closePath();frame.holes.push(opening);
    const geometry=new THREE.ExtrudeGeometry(frame,{depth:.13,bevelEnabled:false,curveSegments:6}),glass=new THREE.ShapeGeometry(windowShape(kind),6);
    geometry.name='creator-home-recessed-frame-'+kind;glass.name='creator-home-inset-glass-'+kind;for(const item of[geometry,glass])resources.add(item);geometryCache.set(kind,{frame:geometry,glass});
  }
  const geometry=geometryCache.get(kind);b.instance(geometry.frame,trim,x,y,z,width,height,1,0,bucket);b.instance(geometry.glass,materials.dark,x,y,z+.015,width*.86,height*.86,1,0,bucket);b.instance(geometry.glass,materials.glass,x,y,z+.045,width*.8,height*.8,1,0,bucket);
  if(mullions){b.box(x,y,z+.14,.045,height*.78,.04,trim,0,bucket);b.box(x,y-.02,z+.14,width*.78,.045,.04,trim,0,bucket);}
}

/** A raised, recognizable doorway emblem. Each creator's motif has its own silhouette. */
export function creatorHomeEmblemGeometry(motif='lantern'){
  let shapes;
  switch(motif){
    case 'bat-wing':shapes=[polygon([[-.55,.23],[-.28,.05],[-.13,.24],[0,.15],[.13,.24],[.28,.05],[.55,.23],[.44,-.21],[.2,-.1],[0,-.32],[-.2,-.1],[-.44,-.21]])];break;
    case 'wave-star':shapes=[star(.24,.2,.22),...Array.from({length:3},(_,i)=>stroke(-.5+i*.29,-.12+(i%2)*.12,-.21+i*.29,-.12+((i+1)%2)*.12,.09)),stroke(-.44,-.31,.38,-.31,.06)];break;
    case 'candy':shapes=[ellipse(0,0,.24,.3),polygon([[-.21,0],[-.5,.24],[-.5,-.24]]),polygon([[.21,0],[.5,-.24],[.5,.24]])];break;
    case 'open-book':shapes=[polygon([[-.48,.26],[-.08,.18],[-.03,.1],[-.03,-.32],[-.12,-.24],[-.48,-.16]]),polygon([[.48,.26],[.08,.18],[.03,.1],[.03,-.32],[.12,-.24],[.48,-.16]])];break;
    case 'pumpkin-book':{
      const pumpkin=polygon([[-.33,.04],[-.32,.24],[-.19,.35],[-.06,.31],[.06,.31],[.19,.35],[.32,.24],[.33,.04],[.23,-.1],[.1,-.14],[0,-.11],[-.1,-.14],[-.23,-.1]]);
      hole(pumpkin,-.12,.14,.035,.05);hole(pumpkin,.12,.14,.035,.05);hole(pumpkin,0,-.015,.1,.025);
      shapes=[pumpkin,polygon([[-.045,.31],[-.025,.49],[.085,.52],[.04,.31]]),
        polygon([[-.5,-.14],[-.08,-.2],[-.025,-.25],[-.025,-.48],[-.12,-.41],[-.5,-.35]]),
        polygon([[.5,-.14],[.08,-.2],[.025,-.25],[.025,-.48],[.12,-.41],[.5,-.35]])];break;
    }
    case 'bread-loaf':{
      const loaf=ellipse(0,0,.51,.29);for(const x of[-.2,0,.2])hole(loaf,x,.035,.024,.14);shapes=[loaf];break;
    }
    case 'twin-stars':shapes=[star(-.25,.05,.3),star(.27,-.06,.25)];break;
    case 'moon-cat':{
      const moon=new THREE.Shape();moon.absarc(-.08,.02,.42,Math.PI*.3,Math.PI*1.7,false);moon.absarc(.13,.02,.31,Math.PI*1.57,Math.PI*.43,true);moon.closePath();shapes=[moon,cat(.28,-.17,.45)];break;
    }
    case 'cat-leaf':shapes=[cat(-.15,-.04,.9),polygon([[.15,.05],[.29,.42],[.53,.45],[.5,.17],[.3,.03]]),stroke(.13,-.16,.4,.3,.035)];break;
    case 'flower':shapes=[...Array.from({length:6},(_,i)=>ellipse(Math.cos(i*TAU/6)*.27,Math.sin(i*TAU/6)*.27,.14)),ellipse(0,0,.14)];break;
    case 'hedgehog':shapes=[polygon([[-.49,-.2],[-.47,.03],[-.37,.02],[-.35,.27],[-.22,.16],[-.1,.39],[.02,.2],[.17,.34],[.23,.11],[.37,.16],[.35,-.19]]),ellipse(.33,-.16,.2,.13),ellipse(.51,-.12,.055)];break;
    case 'shiba':{
      const head=polygon([[-.42,.35],[-.19,.21],[0,.26],[.19,.21],[.42,.35],[.35,-.18],[.14,-.36],[-.14,-.36],[-.35,-.18]]);hole(head,-.14,-.04,.045);hole(head,.14,-.04,.045);hole(head,0,-.2,.065,.035);shapes=[head];break;
    }
    case 'woven-diamond':shapes=[polygon([[0,.44],[.45,0],[0,-.44],[-.45,0]])];hole(shapes[0],0,0,.16);shapes.push(stroke(-.4,-.26,.4,.26,.045),stroke(-.4,.26,.4,-.26,.045));break;
    case 'three-stars':shapes=[star(0,.22,.25),star(-.3,-.17,.2),star(.3,-.17,.2)];break;
    case 'iris-flower':shapes=[polygon([[0,-.02],[-.2,.15],[-.16,.43],[.02,.27],[.16,.43],[.21,.15]]),polygon([[-.02,-.02],[-.28,.2],[-.51,.13],[-.28,-.14]]),polygon([[.02,-.02],[.28,.2],[.51,.13],[.28,-.14]]),stroke(0,-.4,0,.09,.06),polygon([[0,-.28],[-.2,-.08],[-.3,-.1],[-.15,-.31]])];break;
    case 'lion':{
      const mane=polygon(Array.from({length:24},(_,i)=>{const a=i*TAU/24,r=i%2?.35:.46;return[Math.cos(a)*r,Math.sin(a)*r];}));hole(mane,0,0,.265,.25);const face=ellipse(0,-.015,.23,.22);hole(face,-.09,.035,.026);hole(face,.09,.035,.026);hole(face,0,-.08,.043,.025);shapes=[mane,face];break;
    }
    default:{
      const frame=polygon([[-.22,-.25],[.22,-.25],[.28,.2],[-.28,.2]]);hole(frame,0,-.015,.15,.15);const handle=ellipse(0,.34,.16,.11);hole(handle,0,.34,.105,.065);shapes=[frame,polygon([[-.32,.23],[.32,.23],[.2,.35],[-.2,.35]]),handle,star(0,-.015,.115)];
    }
  }
  const geometry=new THREE.ExtrudeGeometry(shapes,{depth:.055,bevelEnabled:false,curveSegments:8});geometry.name='creator-home-emblem-'+motif;return geometry;
}

function homeMaterials(building,materials,resources){
  const source=building.homePalette||{},bucket=building.id,surfaces=homeSurfaces(resources);
  const result=Object.fromEntries([
    ['wall',materials.wall,source.wall||'#d0c1a3',['stone','brick'].includes(building.homeConstruction)?building.homeConstruction:'plaster',.94,.025],['roof',materials.roof,source.roof||'#53667a','slate',.87,.055],['trim',materials.woodLight,source.trim||'#a18058','wood',.78,.018],
    ['wood',materials.wood,null,'wood',.8,.02],['stone',materials.stone,null,'stone',.96,.035],['foundation',materials.stoneDark,null,'stone',.98,.04],
  ].map(([role,base,color,surface,roughness,bumpScale])=>{
    const material=base.clone();if(color)material.color.set(color);Object.assign(material,surfaces[surface],{roughness,bumpScale,metalness:0});material.name=(role==='trim'?'wood':role)+'-creator-home-'+building.creatorId;material.userData.fadeBucket=bucket;material.userData.surface=surface;resources.add(material);return[role,material];
  }));
  const glass=materials.glass.clone();glass.name='glass-creator-home-'+building.creatorId;glass.color.set('#c7d5cf');glass.emissive.set('#e2b780');glass.emissiveIntensity=.12;glass.roughness=.21;glass.metalness=.12;glass.userData.fadeBucket=bucket;resources.add(glass);result.glass=glass;return result;
}
function roofSurfaceUV(geometry){
  const position=geometry.attributes.position,normal=geometry.attributes.normal,uv=[];
  for(let index=0;index<position.count;index++){
    const vertical=Math.abs(normal.getZ(index))>.7;
    uv.push(position.getX(index)/1.1,(vertical?position.getY(index):position.getZ(index))/.9);
  }
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geometry;
}

function nameplate(building,b,materials,resources,makeCanvas,x,y,z,bucket){
  b.box(x,y,z,2.22,.57,.12,materials.wood,0,bucket);
  const canvas=makeCanvas?.(256,64),c=canvas?.getContext?.('2d');
  if(typeof c?.fillText!=='function'){b.box(x,y,z+.075,2.1,.46,.045,materials.paper,0,bucket);return;}
  c.fillStyle='#efe2bd';c.fillRect(0,0,256,64);c.fillStyle='#43372e';c.textAlign='center';c.textBaseline='middle';
  const fit=(text,base,max)=>{c.font=`600 ${base}px system-ui,sans-serif`;if(c.measureText){const length=c.measureText(text).width;if(length>max)c.font=`600 ${Math.max(10,base*max/length)}px system-ui,sans-serif`;}return text;};
  c.fillText(fit(building.creatorName||building.creatorId||'',26,242),128,21,242);c.fillText(fit(building.homeLabel||building.label||'',16,242),128,47,242);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;resources.add(texture);
  const material=new THREE.MeshBasicMaterial({map:texture});material.name='creator-home-nameplate';material.userData.fadeBucket=bucket;resources.add(material);
  const sign=b.mesh(new THREE.PlaneGeometry(2.06,.44),material,new THREE.Vector3(x,y,z+.103),bucket);sign.name='creator-home-nameplate-'+building.creatorId;sign.userData.creatorId=building.creatorId;
}

const HOME_BUILDINGS={
  lantern:{high:2.85,roof:1.75,window:'cat'},'bat-wing':{high:3.15,roof:2.05,window:'arch'},'wave-star':{high:2.86,roof:1.7,window:'round'},
  candy:{high:2.6,roof:1.55,window:'round'},'open-book':{high:2.86,roof:1.5,window:'book'},'bread-loaf':{high:2.52,roof:1.35,window:'arch'},
  'twin-stars':{high:2.9,roof:1.55,window:'arch'},'moon-cat':{high:3.12,roof:1.6,window:'round'},'cat-leaf':{high:2.55,roof:1.35,window:'cat'},
  flower:{high:2.46,roof:1.2,window:'arch'},hedgehog:{high:2.36,roof:1.32,window:'round'},shiba:{high:2.64,roof:1.85,window:'arch'},
  'pumpkin-book':{high:2.94,roof:1.68,window:'book'},
  'woven-diamond':{high:2.82,roof:1.45,window:'diamond'},'three-stars':{high:3.08,roof:1.55,window:'arch'},'iris-flower':{high:2.94,roof:1.88,window:'arch'},lion:{high:3.02,roof:1.7,window:'round'},
};

function themeDetails({building,b,m,materials,resources,geometryCache,high,roofHeight}){
  const {x,z,w,h}=building,cx=x+w/2,south=z+h,cz=z+h/2,bucket=building.id,kind=building.motif,door=building.door.x,top=high+.27;
  const box=(px,py,pz,ww,hh,dd,mat=m.trim,turn=0)=>b.box(px,py,pz,ww,hh,dd,mat,turn,bucket),ball=(px,py,pz,ww,hh,dd,mat=materials.leaf)=>[materials.leaf,materials.leafLight,materials.flower].includes(mat)?homeFoliage(b,resources,px,py,pz,ww,hh,dd,mat,bucket):b.ball(px,py,pz,ww,hh,dd,mat,bucket);
  const round=(px,py,pz,r,hh,mat=m.trim)=>b.round(px,py,pz,r,hh,mat,bucket),peak=(px,py,pz,r,hh,mat=m.roof)=>b.peak(px,py,pz,r,hh,mat,bucket);
  const win=(kind,px,py,pz,width,height,mullions=true)=>shapedWindow({b,resources,materials,trim:m.trim,bucket,kind,x:px,y:py,z:pz,width,height,mullions,geometryCache});
  const awning=(px,py,pz,width,depth=1)=>{box(px,py,pz,width,.16,depth,m.roof);for(let n=0;n<7;n++)box(px-width*.45+n*width*.15,py+.09,pz,width*.07,.035,depth+.02,materials.paper);for(const side of[-1,1])box(px+side*width*.43,py-.45,pz+depth*.38,.06,.9,.06);};
  // Public creative activity influences usable frontage, alongside the retained
  // character motifs. These are imagined studios, never real-house replicas.
  if(building.homeUse==='shop-atelier'){
    const xx=x+w*.18;awning(xx,2.02,south+.2,1.78,.66);box(xx,.61,south+.29,1.35,.12,.42,m.wood);
    for(let n=0;n<3;n++)box(xx-.38+n*.38,.77,south+.34,.24,.19,.16,materials.paper);
  }
  if(building.homeUse==='writing-garden'){
    const xx=x+w*.83;box(xx,.42,south+.14,1.27,.12,.39,m.wood);for(const side of[-1,1])box(xx+side*.49,.21,south+.14,.08,.4,.3,m.wood);
    box(xx,.52,south+.15,.42,.045,.26,materials.paper);
  }
  switch(kind){
    case'lantern':
      box(cx,top+1.08,cz+h*.41,1.45,.96,.85,m.wall);win('cat',cx,top+1.14,south+.36,.86,.8);
      for(const side of[-1,1]){peak(cx+side*.48,top+1.77,south-.16,.24,.5);box(x+side*.05+w*.13,1.48,south+.17,.33,.58,.3,materials.gold);box(x+side*.05+w*.13,1.49,south+.34,.22,.4,.08,materials.glass);}
      break;
    case'bat-wing':
      for(const side of[-1,1]){const xx=cx+side*w*.37;round(xx,top-.1,south-1,.38,1.2,m.wall);round(xx,top+.54,south-1,.48,.11);peak(xx,top+1.16,south-1,.55,1.15);}
      for(const side of[-1,1])box(door+side*.77,1.93,south+.21,.9,.09,.54,m.roof,side*.34);
      break;
    case'wave-star':{
      const tx=x+w*.18,tz=z+h*.32,towerTop=top+roofHeight*.78;round(tx,towerTop/2,tz,.62,towerTop,m.wall);for(let n=0;n<4;n++)round(tx,.75+n*.85,tz,.64,.13,m.trim);round(tx,towerTop,tz,.7,.13,m.trim);win('round',tx,towerTop-.48,tz+.66,.57,.57);
      for(let n=0;n<6;n++){const xx=x+.35+n*.35;box(xx,.62,south+.17,.4,.055,.16,materials.paper,n%2?.15:-.15);}
      break;
    }
    case'candy':
      awning(x+w*.18,1.91,south+.16,1.7,.68);for(const side of[-1,1]){const xx=x+(side<0?.055:.945)*w;round(xx,1.05,south-.12,.12,1.9,materials.paper);for(let n=0;n<5;n++)round(xx,.3+n*.34,south-.12,.126,.12,m.roof);ball(xx,2.13,south-.12,.28,.3,.28,materials.paper);}
      break;
    case'open-book':
      for(const xx of[x+w*.18,x+w*.82]){box(xx,1.4,south+.22,1.3,1.22,.26,materials.wood);for(let shelf=0;shelf<3;shelf++){box(xx,.97+shelf*.34,south+.37,1.22,.06,.32,m.trim);for(let n=0;n<5;n++)box(xx-.45+n*.22,1.14+shelf*.34,south+.4,.14,.25+(n%2)*.04,.15,[materials.bookRed,materials.bookTeal,materials.bookGold][n%3]);}}
      for(let n=0;n<4;n++)box(cx,top+.06+n*.09,south+.37,w-.35,.045,.13,materials.paper);
      break;
    case'pumpkin-book':{
      // Scenery follows the submitted pumpkin-hood boy, cape, library and cat;
      // it does not describe the author's personal tastes or actual residence.
      const hoodY=top+roofHeight*.99,hoodZ=south-.72;
      for(const dx of[-.38,0,.38])ball(cx+dx,hoodY,hoodZ,.48,.52,.57,materials.pumpkin);
      box(cx,hoodY+.61,hoodZ,.13,.28,.14,materials.leaf);
      win('arch',cx,hoodY-.06,south-.12,.57,.59,false);
      for(const side of[-1,1]){
        const xx=x+(side<0?.18:.82)*w;
        box(xx,1.22,south+.23,1.32,1.04,.26,m.wood);
        for(let shelf=0;shelf<2;shelf++){
          box(xx,.91+shelf*.37,south+.39,1.34,.07,.37,m.trim);
          for(let n=0;n<5;n++)box(xx-.46+n*.22,1.07+shelf*.37,south+.41,.14,.25+(n%2)*.04,.17,[materials.bookGold,materials.bookTeal,materials.bookRed][(n+shelf)%3]);
        }
      }
      // The lantern hangs beside the threshold, never across the walking line.
      const lx=door+1.3;box(lx,1.95,south+.25,.07,.61,.08,materials.gold);box(lx,1.68,south+.3,.36,.49,.3,materials.gold);
      box(lx,1.69,south+.47,.23,.33,.055,materials.glass);peak(lx,1.99,south+.3,.27,.19,m.roof);
      const catX=x+w*.84,catZ=south+.62;
      ball(catX,.36,catZ,.21,.33,.17,materials.dark);ball(catX,.67,catZ+.015,.22,.2,.17,materials.dark);
      for(const side of[-1,1]){peak(catX+side*.145,.85,catZ+.015,.09,.2,materials.dark);ball(catX+side*.07,.69,catZ+.17,.025,.035,.018,materials.gold);}
      // A curled tail sits against the plinth, clear of the door and path.
      ball(catX+.25,.25,catZ,.22,.075,.075,materials.dark);ball(catX+.42,.33,catZ,.07,.14,.075,materials.dark);
      break;
    }
    case'bread-loaf':
      awning(x+w*.18,1.96,south+.16,1.75,.76);ball(x+w*.83,.69,south-.06,.66,.75,.58,materials.stone);win('arch',x+w*.83,.65,south+.47,.78,.76,false);
      box(x+w*.83,.53,south+.57,.53,.15,.08,materials.wood);for(let n=0;n<3;n++)ball(x+w*.83-.19+n*.19,.61,south+.6,.1,.07,.06,materials.bookGold);
      round(x+w*.84,top+.62,z+h*.58,.23,1.8,materials.stone);round(x+w*.84,top+1.57,z+h*.58,.32,.12,m.trim);
      break;
    case'twin-stars':
      for(const side of[-1,1]){const xx=cx+side*w*.245;box(xx,top+.49,south+.26,1.3,.88,.12,m.wall);win('arch',xx,top+.6,south+.35,.64,.68);box(xx,top+1.17,cz,.07,.08,h+.67,m.trim);}
      box(cx,.07,south+.1,.07,.08,.4,materials.gold);
      break;
    case'moon-cat':{
      const tx=x+w*.17,tz=z+h*.25,towerTop=top+roofHeight*.9,spireTop=top+roofHeight*1.86;round(tx,towerTop/2,tz,.52,towerTop,m.wall);round(tx,towerTop,tz,.66,.15,m.trim);for(const side of[-1,1])box(tx+side*.43,towerTop-.28,tz+.42,.055,.55,.1,m.trim);win('arch',tx,towerTop-.34,tz+.48,.45,.68);
      round(tx,spireTop+.14,tz,.035,.6,materials.gold);const moonGeometry=creatorHomeEmblemGeometry('moon-cat'),moon=b.mesh(moonGeometry,materials.gold,new THREE.Vector3(tx,spireTop+.47,tz),bucket);moon.scale.setScalar(.62);moon.name='creator-home-moon-finial';
      break;
    }
    case'cat-leaf':
      for(const xx of[x+w*.17,x+w*.83]){box(xx,1.31,south+.18,1.35,1.37,.48,m.trim);win('cat',xx,1.5,south+.48,1.18,1.1);for(let n=0;n<4;n++)ball(xx-.45+n*.3,.74,south+.42,.19,.14,.15,materials.leafLight);}
      for(let n=0;n<5;n++){const xx=x+.27+n*.48;box(xx,2.02,south+.15,.065,.7,.09,m.trim);ball(xx,1.8+(n%2)*.21,south+.23,.16,.21,.09,materials.leafLight);}
      break;
    case'flower':
      for(const xx of[x+w*.17,x+w*.83]){box(xx,1.32,south+.08,1.44,1.3,.55,m.trim);win('arch',xx,1.4,south+.46,1.3,1.06);for(const side of[-1,1])box(xx+side*.48,1.38,south+.48,.04,1.04,.04,m.trim);for(let n=0;n<4;n++)ball(xx-.4+n*.27,.9,south+.5,.095,.09,.065,materials.flower);}
      for(let n=0;n<6;n++)box(cx-w*.37+n*w*.148,top+.24,cz,.045,.055,h+.62,m.trim);
      break;
    case'hedgehog':
      for(const side of[-1,1]){const xx=cx+side*w*.34;box(xx,.48,south+.12,.9,.2,.55,m.trim);for(let n=0;n<4;n++)round(xx-.3+n*.2,.73,south+.26,.045,.37,materials.wood);ball(xx,.91,south+.25,.33,.18,.15,materials.leaf);}
      for(let n=0;n<4;n++)box(x+.24+n*.43,.27,south+.11,.27,.15,.24,materials.stone);
      break;
    case'shiba':
      box(door,top+.39,south+.26,2.12,.8,.15,m.wall);win('arch',door,top+.4,south+.37,.68,.65);
      for(const side of[-1,1]){const xx=door+side*1.01;box(xx,1.15,south+.13,.16,2.16,.2,materials.paper);box(xx,2.19,south+.13,.53,.16,.25,materials.paper);}
      for(let n=0;n<3;n++){const xx=x+.36+n*.38,zz=south-.03;ball(xx,.47,zz,.1,.11,.055,materials.wood);for(const dx of[-.075,0,.075])ball(xx+dx,.61,zz+.02,.035,.045,.035,materials.wood);}
      break;
    case'woven-diamond':
      for(const side of[-1,1])for(let n=0;n<5;n++){const xx=x+(side<0?.12:.88)*w;box(xx,1.38,south+.29,.065,.99,.055,m.trim,(n-2)*.17);}
      for(let n=0;n<6;n++)box(cx,top+roofHeight+.03,cz-h*.4+n*h*.16,.23,.08,.1,materials.paper,n%2?.4:-.4);
      break;
    case'three-stars':
      for(let n=0;n<3;n++){const xx=cx+(n-1)*w/3;box(xx,top+.42,south+.27,1.37,.81,.14,m.wall);win('arch',xx,top+.47,south+.38,.65,.7);box(xx,top+roofHeight+.04,cz,.08,.08,h+.6,m.trim);}
      break;
    case'iris-flower':
      for(const xx of[x+w*.18,x+w*.82]){win('arch',xx,1.48,south+.3,.88,1.44);for(const side of[-1,1])box(xx+side*.2,1.48,south+.47,.045,1.05,.045,materials.gold);for(let n=0;n<3;n++)box(xx,1.03+n*.35,south+.48,.55,.04,.04,materials.gold);}
      for(const side of[-1,1]){const xx=cx+side*w*.39;ball(xx,.64,south+.13,.33,.24,.28,materials.leaf);for(let n=0;n<3;n++)peak(xx+(n-1)*.12,1.02+Math.abs(n-1)*.07,south+.16,.1,.43,materials.flower);}
      break;
    case'lion':
      for(const side of[-1,1]){const xx=door+side*.96;box(xx,.16,south+.1,.39,.3,.42,materials.stone);ball(xx,.55,south+.07,.22,.28,.2,m.trim);ball(xx,.84,south+.1,.25,.25,.21,m.trim);ball(xx,.84,south+.26,.15,.14,.1,materials.paper);for(const dx of[-.1,.1])box(xx+dx,.3,south+.21,.12,.25,.14,m.trim);}
      for(const xx of[x+w*.18,x+w*.82]){for(let n=0;n<8;n++){const angle=n*TAU/8;box(xx+Math.sin(angle)*.64,1.43+Math.cos(angle)*.64,south+.19,.06,.16,.06,materials.gold,angle);}}
      break;
  }
}

/** Individual homes share primitive buffers and keep the authored threshold clear. */
export function buildCreatorHome({building,b,materials,resources,roofGeometry,makeCanvas}){
  const {x,z,w,h}=building,cx=x+w/2,cz=z+h/2,south=z+h,bucket=building.id,m=homeMaterials(building,materials,resources),motif=building.motif||'lantern';
  // Local copies retain the same batch count and disposal ownership as the
  // palette's per-building materials, while making every visible surface real.
  materials={...materials,wood:m.wood,stone:m.stone,stoneDark:m.foundation,glass:m.glass};
  const profile=HOME_BUILDINGS[motif]||HOME_BUILDINGS.lantern,{high,roof:roofHeight}=profile,garden=['cat-leaf','flower','hedgehog','shiba','iris-flower'].includes(motif),doorX=building.door?.x??cx,geometryCache=new Map();
  b.box(cx,.13,cz,w,.26,h,materials.stoneDark,0,bucket);b.box(cx,high/2+.26,cz,w-.14,high,h-.14,m.wall,0,bucket);
  for(const side of[-1,1]){
    for(const end of[-1,1])b.box(cx+side*(w/2-.12),high/2+.26,cz+end*(h/2-.035),.17,high+.1,.17,m.trim,0,bucket);
    for(const yy of[.43,high+.24]){
      b.box(cx,yy,cz+side*(h/2-.03),w+.05,.14,.17,m.trim,0,bucket);
      b.box(cx+side*(w/2-.12),yy,cz,.17,.14,h+.05,m.trim,0,bucket);
    }
  }
  b.box(cx,.4,south+.04,w+.13,.21,.22,materials.stone,0,bucket);b.box(cx,high+.22,south+.03,w+.25,.18,.24,m.trim,0,bucket);
  // Side-facing structural beams and divided windows also read from the elevated camera.
  for(const fraction of[.23,.77])b.box(x+w*fraction,high*.54,south+.055,.12,high-.25,.17,m.trim,0,bucket);
  const roof=b.mesh(roofSurfaceUV(creatorHomeRoofGeometry(motif,w+.64,h+.62,roofHeight)),m.roof,new THREE.Vector3(cx,high+.27,cz),bucket);roof.name='roof-'+building.id;
  // Thin fascia and gutter volumes produce an overhanging eave rather than a
  // roof glued straight onto a box. They remain above the walking threshold.
  for(const side of[-1,1]){
    b.box(cx,high+.22,cz+side*(h/2+.25),w+.55,.12,.12,m.wood,0,bucket);
    b.box(cx,high+.18,cz+side*(h/2+.31),w+.55,.065,.11,materials.dark,0,bucket);
  }
  if(['lantern','cat-leaf','shiba','iris-flower','hedgehog','candy'].includes(motif))b.box(cx,high+roofHeight+.31,cz,.14,.08,h+.7,m.trim,0,bucket);
  b.box(doorX,.78,south+.13,1.22,1.56,.22,m.trim,0,bucket);b.box(doorX,.75,south+.26,.98,1.5,.07,materials.wood,0,bucket);b.box(doorX+.3,.69,south+.31,.055,.075,.04,materials.gold,0,bucket);b.box(doorX,.055,south+.27,1.5,.11,.54,materials.stone,0,bucket);
  for(const yy of[.42,1.1]){
    b.box(doorX,yy,south+.297,.73,.53,.012,materials.dark,0,bucket);
    b.box(doorX,yy,south+.301,.65,.45,.012,m.wood,0,bucket);
  }
  // The emblem is actual extruded geometry; it stays recognizable before any images load.
  b.box(doorX,high-.37,south+.17,1.26,.9,.12,m.trim,0,bucket);b.box(doorX,high-.37,south+.24,1.13,.77,.045,materials.dark,0,bucket);
  const emblem=b.mesh(creatorHomeEmblemGeometry(motif),materials.gold,new THREE.Vector3(doorX,high-.38,south+.28),bucket);emblem.name='creator-home-emblem-'+building.creatorId;emblem.userData.creatorId=building.creatorId;emblem.userData.motif=motif;
  const studio=['illustration-studio','media-studio','design-studio'].includes(building.homeUse),recording=building.homeUse==='recording-studio';
  for(const wx of[x+w*.18,x+w*.82]){
    if(recording){
      for(const offset of[-.38,0,.38])shapedWindow({b,resources,materials,trim:m.trim,bucket,kind:'recording',x:wx+offset,y:1.43,z:south+.13,width:.32,height:1.08,mullions:false,geometryCache});
    }else shapedWindow({b,resources,materials,trim:m.trim,bucket,kind:studio?'studio':profile.window,x:wx,y:1.43,z:south+.13,width:studio?1.36:1.06,height:studio?1.27:motif==='iris-flower'?1.42:.96,geometryCache});
    b.box(wx,.9,south+.24,studio?1.48:1.18,.12,.4,m.trim,0,bucket);
    // Window boxes keep greenery beside the door rather than across the walking line.
    b.box(wx,.75,south+.21,1.07,.23,.48,m.trim,0,bucket);
    for(let n=0;n<3;n++)homeFoliage(b,resources,wx-.31+n*.31,.97,south+.25,.2,.17,.17,garden?materials.leafLight:materials.leaf,bucket);
    if(motif==='flower'||motif==='iris-flower'||motif==='candy')for(let n=0;n<3;n++)homeFoliage(b,resources,wx-.3+n*.3,1.1,south+.29,.085,.07,.075,motif==='candy'?materials.paper:materials.flower,bucket);
  }
  nameplate(building,b,materials,resources,makeCanvas,x+w*.2,2.19,south+.31,bucket);
  const chimneyX=x+w*.79,chimneyZ=z+h*.3;b.box(chimneyX,high+roofHeight*.55,chimneyZ,.43,1.34,.49,materials.stone,0,bucket);b.box(chimneyX,high+roofHeight*.55+.7,chimneyZ,.58,.12,.62,m.trim,0,bucket);
  themeDetails({building,b,m,materials,resources,geometryCache,high,roofHeight});
  roof.geometry.computeBoundingBox();const roofTop=roof.geometry.boundingBox.max.y+high+.27,detailTop=motif==='moon-cat'?high+.27+roofHeight*1.86+.8:motif==='wave-star'?high+2.1:high+2.13;
  return {id:building.id,creatorId:building.creatorId,motif,architecture:building.homeTheme,homeUse:building.homeUse,construction:building.homeConstruction,window:recording?'triple-recording':studio?'studio-bay':profile.window,footprint:{x,z,w,h},door:{...building.door},height:Math.max(roofTop,detailTop)+.2,bucket};
}

/** A clear opening and a named sign make both ends of the new lane discoverable. */
export function buildCreatorQuarterGate({portal,b,materials,resources,makeCanvas}){
  const {x,z}=portal,bucket='gate-'+portal.id,label=portal.to==='creator-quarter'?'参加者の住宅街':'星灯りの街';
  for(const side of[-1,1]){
    const px=x+side*1.6;b.box(px,.16,z-.1,.59,.32,.64,materials.stone,0,bucket);b.box(px,1.34,z-.1,.26,2.5,.3,materials.wood,0,bucket);
    b.box(px,2.59,z-.1,.42,.16,.47,materials.gold,0,bucket);b.peak(px,2.84,z-.1,.35,.42,materials.roofPlum,bucket);
    b.box(px,1.86,z+.12,.22,.29,.17,materials.glass,0,bucket);
  }
  b.box(x,2.57,z-.1,3.5,.22,.34,materials.woodLight,0,bucket);b.box(x,.023,z,2.75,.04,1.2,materials.stone,0,bucket);
  nameplate({creatorId:portal.id,creatorName:label,homeLabel:portal.to==='creator-quarter'?'一人ひとりのアトリエへ':'街の広場へ戻る'},b,materials,resources,makeCanvas,x,3.04,z-.12,bucket);
  return {id:portal.id,to:portal.to,label,x,z,clearWidth:2.7};
}
