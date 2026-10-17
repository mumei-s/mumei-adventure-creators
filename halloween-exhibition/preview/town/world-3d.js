import * as THREE from '../maze/vendor/three.module.js';
import {getTownMap} from './story-data.js';
import {playerPose,loadArtImage} from '../maze/rpg-art.js?v=20261017-rig2';
import {townVisualSeed as seed} from './visual-data.js';
import {withDeadline} from '../transition-effects.js?v=20261016-living1';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
export const TOWN_3D_CAMERA_ELEVATION=55*Math.PI/180;

/** The camera stays aligned with the controls: east is right and south is down. */
export function town3DCameraParameters(width,height,interior=false){
  width=Math.max(1,width);height=Math.max(1,height);
  const pixelsPerTile=clamp(Math.min(width/(interior?9.8:10.8),height/(interior?7.5:8.2)),22,66);
  return {left:-width/pixelsPerTile/2,right:width/pixelsPerTile/2,top:height/pixelsPerTile/2,bottom:-height/pixelsPerTile/2,
    elevation:TOWN_3D_CAMERA_ELEVATION,distance:34,pixelsPerTile};
}

const colors={grass:'#47624f',road:'#a7a498',plaza:'#b4aaa0',stone:'#b3b5a5',stoneDark:'#637787',wall:'#d0c1a3',wood:'#594438',woodLight:'#a18058',gold:'#c1a671',water:'#2f7180',roof:'#53667a',leaf:'#4b7059'};

function palette(resources){
  const mat=(color,extra={})=>{const material=new THREE.MeshStandardMaterial({color,roughness:.86,...extra});resources.add(material);return material;};
  const materials={
    grass:mat(colors.grass),road:mat(colors.road),plaza:mat(colors.plaza),soil:mat('#5d6b4d'),stone:mat(colors.stone),stoneDark:mat(colors.stoneDark),
    wall:mat(colors.wall),wallCool:mat('#a9b9b4'),wood:mat(colors.wood),woodLight:mat(colors.woodLight),gold:mat(colors.gold,{metalness:.38,roughness:.54}),
    roof:mat(colors.roof),roofWarm:mat('#926154'),roofTeal:mat('#3a7375'),roofPlum:mat('#735c79'),
    glass:mat('#ffe4a4',{emissive:'#ffc665',emissiveIntensity:.4,roughness:.38}),dark:mat('#273d4b'),water:mat(colors.water,{metalness:.25,roughness:.28}),
    leaf:mat(colors.leaf),leafLight:mat('#769468'),leafAutumn:mat('#b68454'),leafRose:mat('#a2655e'),flower:mat('#e2c2b2'),paper:mat('#ece0b9'),
    castleStone:mat('#535a77'),castleTrim:mat('#8388a2'),castlePlum:mat('#432c55'),pumpkin:mat('#ba632d'),
    parquet:mat('#9e7b58'),carpet:mat('#6f4259'),bookRed:mat('#805364'),bookTeal:mat('#46787b'),bookGold:mat('#b09264'),
  };for(const [name,material]of Object.entries(materials))material.name=name;return materials;
}

/** Batched primitives keep the whole town inexpensive on mobile GPUs. */
function builder(root,resources,materials){
  const unitBox=new THREE.BoxGeometry(1,1,1),sphere=new THREE.IcosahedronGeometry(1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),cone=new THREE.ConeGeometry(1,1,10);
  for(const geometry of[unitBox,sphere,cylinder,cone])resources.add(geometry);
  const batches=new Map(),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0);
  function instance(geometry,material,x,y,z,w,h,d,turn=0,bucket='town'){
    const key=bucket+'|'+geometry.uuid+'|'+material.uuid;
    if(!batches.has(key))batches.set(key,{geometry,material,matrices:[],bucket});
    rotation.setFromAxisAngle(axis,turn);matrix.compose(new THREE.Vector3(x,y,z),rotation,new THREE.Vector3(w,h,d));batches.get(key).matrices.push(matrix.clone());
  }
  const box=(x,y,z,w,h,d,material=materials.stone,turn=0,bucket)=>instance(unitBox,material,x,y,z,w,h,d,turn,bucket);
  const ball=(x,y,z,w,h,d,material=materials.leaf,bucket)=>instance(sphere,material,x,y,z,w,h,d,0,bucket);
  const round=(x,y,z,r,h,material=materials.stone,bucket)=>instance(cylinder,material,x,y,z,r,h,r,0,bucket);
  const peak=(x,y,z,r,h,material=materials.roof,bucket)=>instance(cone,material,x,y,z,r,h,r,0,bucket);
  function perBuildingMaterial(material,bucket){
    if(!bucket||['town','trees','lamps','interior-windows'].includes(bucket))return material;
    const clone=material.clone();resources.add(clone);return clone;
  }
  function mesh(geometry,material,position,bucket){
    resources.add(geometry);const item=new THREE.Mesh(geometry,perBuildingMaterial(material,bucket));item.position.copy(position);item.castShadow=true;item.receiveShadow=true;item.userData.occluder=true;item.userData.bucket=bucket;root.add(item);return item;
  }
  function finish(){
    for(const {geometry,material,matrices,bucket}of batches.values()){
      const batch=new THREE.InstancedMesh(geometry,perBuildingMaterial(material,bucket),matrices.length);matrices.forEach((m,i)=>batch.setMatrixAt(i,m));batch.instanceMatrix.needsUpdate=true;batch.castShadow=true;batch.receiveShadow=true;batch.userData.occluder=true;batch.userData.bucket=bucket;root.add(batch);
    }
    return root;
  }
  return {box,ball,round,peak,mesh,finish};
}

function roofGeometry(width,depth,height){
  // A closed triangular prism: visible sloping planes, gable ends and thickness.
  const x=width/2,z=depth/2,vertices=[-x,0,-z,x,0,-z,0,height,-z,-x,0,z,x,0,z,0,height,z];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);geo.computeVertexNormals();
  const uv=[];for(let i=0;i<6;i++)uv.push(vertices[i*3]/width+.5,vertices[i*3+2]/depth+.5);geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geo;
}

function groundGeometry(map,tileTypes,y=0){
  const vertices=[],uv=[],indices=[];
  for(let z=0;z<map.height;z++)for(let x=0;x<map.width;x++)if(tileTypes.includes(map.tiles[z][x])){
    const offset=vertices.length/3;vertices.push(x,y,z,x,y,z+1,x+1,y,z+1,x+1,y,z);uv.push(x/3,z/3,x/3,(z+1)/3,(x+1)/3,(z+1)/3,(x+1)/3,z/3);indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Geometry uses exactly the story map footprints, thresholds and furniture. No gameplay state is stored here. */
export function createTownSceneGeometry(map=getTownMap(),{materials=null,resources=new Set()}={}){
  const root=new THREE.Group();root.name='town-world-'+map.id;materials??=palette(resources);const b=builder(root,resources,materials),buildings=[],trees=[],water=[],lamps=[],stars=[];
  const interior=map.id!=='lantern-town';
  for(const [types,material,y]of interior?[['i',materials.parquet,0],['#',materials.dark,-.025]]:[['gfb#',materials.grass,-.025],['.',materials.road,0],['p',materials.plaza,.008],['=',materials.stone,.04],['~',materials.water,-.14]]){
    const geometry=groundGeometry(map,types,y);if(!geometry.attributes.position.count){geometry.dispose();continue;}
    resources.add(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.name='ground-'+types;root.add(mesh);if(types==='~')water.push(mesh);
  }
  function window(x,y,z,width=.58,height=.7,bucket){
    b.box(x,y,z,width+.15,height+.16,.13,materials.wood,0,bucket);b.box(x,y,z+.075,width,height,.035,materials.glass,0,bucket);
    b.box(x,y,z+.1,.055,height,.045,materials.wood,0,bucket);b.box(x,y,z+.1,width,.055,.045,materials.wood,0,bucket);b.box(x,y-height/2-.07,z+.08,width+.23,.11,.27,materials.woodLight,0,bucket);
  }
  function doorway(x,z,height=1.35,width=.86,bucket){
    b.box(x,height/2,z,width+.24,height+.17,.15,materials.stone,0,bucket);b.box(x,height/2,z+.09,width,height,.04,materials.dark,0,bucket);
    for(const side of[-1,1])b.box(x+side*width*.245,height*.48,z+.12,width*.46,height*.93,.035,materials.wood,0,bucket);
    b.box(x+width*.18,height*.44,z+.15,.05,.05,.03,materials.gold,0,bucket);b.box(x,.045,z+.25,width+.45,.09,.55,materials.stone,0,bucket);
  }
  function lantern(x,z,lit=true,bucket='lamps'){
    b.round(x,.95,z,.052,1.9,materials.dark,bucket);b.round(x,.06,z,.19,.12,materials.stone,bucket);b.box(x,1.96,z,.48,.07,.08,materials.gold,0,bucket);
    b.box(x+.2,1.76,z,.22,.35,.22,materials.dark,0,bucket);b.box(x+.2,1.77,z,.15,.24,.15,materials.glass,0,bucket);b.peak(x+.2,2,z,.21,.2,materials.roof,bucket);
    lamps.push({x:x+.2,y:1.77,z,lit});
  }
  function house(building){
    const {x,z,w,h}=building,cx=x+w/2,cz=z+h/2,south=z+h,high=building.kind==='clocktower'?3.4:2.05+Math.min(h,5)*.2,bucket=building.id;
    const wall=building.kind==='library'?materials.wallCool:materials.wall,roof=building.kind==='bakery'?materials.roofWarm:building.kind==='inn'?materials.roofPlum:building.kind==='shop'||building.kind==='library'?materials.roofTeal:materials.roof;
    b.box(cx,.1,cz,w,.2,h,materials.stoneDark,0,bucket);b.box(cx,high/2+.2,cz,w-.12,high,h-.1,wall,0,bucket);
    for(const side of[-1,1]){b.box(cx+side*(w/2-.15),high/2+.2,cz,.15,high+.08,h+.03,materials.wood,0,bucket);b.box(cx,high/2+.2,cz+side*(h/2-.015),w+.02,high+.08,.13,materials.wood,0,bucket);}
    // Divided timber, upper beam and stone plinth are real volume, including the side facade.
    for(let n=1;n<Math.ceil(w/1.45);n++)b.box(x+n*w/Math.ceil(w/1.45),high/2+.2,south-.01,.13,high,.16,materials.wood,0,bucket);
    b.box(cx,.34,south+.03,w+.12,.23,.22,materials.stone,0,bucket);b.box(cx,high+.19,south+.03,w+.27,.2,.22,materials.woodLight,0,bucket);
    const roofHeight=Math.min(2.2,w*.27),roofMesh=b.mesh(roofGeometry(w+.62,h+.65,roofHeight),roof,new THREE.Vector3(cx,high+.2,cz),bucket);
    roofMesh.name='roof-'+building.id;
    // Thin ridge cap and parallel raised tile courses catch the directional light.
    b.box(cx,high+roofHeight+.23,cz,.17,.13,h+.8,materials.woodLight,0,bucket);
    for(let course=1;course<6;course++)for(const side of[-1,1]){
      const fraction=course/6,xx=cx+side*(w+.62)*.5*fraction,yy=high+.2+roofHeight*(1-fraction);
      b.box(xx,yy+.025,cz,.045,.045,h+.66,roof,0,bucket);
    }
    const doorX=building.door?.x??cx;doorway(doorX,south+.07,1.4,.83,bucket);
    for(const fraction of[.22,.76]){const wx=x+w*fraction;if(Math.abs(wx-doorX)>.83)window(wx,1.45,south+.075,.64,.75,bucket);}
    if(high>2.8)for(const fraction of[.25,.75])window(x+w*fraction,high-.45,south+.075,.49,.52,bucket);
    b.box(x+w*.78,high+roofHeight*.48,cz-.25,.43,1.35,.47,materials.stone,0,bucket);b.box(x+w*.78,high+roofHeight*.48+.7,cz-.25,.58,.12,.61,materials.stoneDark,0,bucket);
    if(building.kind==='clocktower'){
      const yy=high+roofHeight+.7;b.box(cx,yy,cz,1.45,3.15,1.55,materials.stone,0,bucket);b.peak(cx,yy+2.1,cz,1.25,1.8,materials.roof,bucket);
      const face=b.mesh(new THREE.CircleGeometry(.52,32),materials.paper,new THREE.Vector3(cx,yy+.25,cz+.79),bucket);face.name='clock-face';
      b.box(cx,yy+.37,cz+.81,.045,.43,.035,materials.wood,0,bucket);b.box(cx+.12,yy+.25,cz+.82,.28,.045,.035,materials.wood,0,bucket);
      for(let n=0;n<12;n++){const a=n*TAU/12;b.ball(cx+Math.sin(a)*.42,yy+.25+Math.cos(a)*.42,cz+.82,.025,.025,.018,materials.gold,bucket);}
    }
    if(building.kind==='bakery'){
      b.box(x+w*.27,1.28,south+.58,w*.47,.12,.95,materials.roofWarm,0,bucket);
      for(let n=0;n<7;n++)b.box(x+.18+n*w*.47/7,1.37,south+.58,w*.47/14,.07,.95,materials.paper,0,bucket);
      for(const side of[-1,1])b.box(x+w*.27+side*w*.22,.69,south+.9,.07,1.3,.07,materials.wood,0,bucket);
    }
    buildings.push({id:building.id,footprint:{x,z,w,h},door:{...building.door},height:high+roofHeight,bucket});
  }
  function castle(building){
    const {x,z,w,h}=building,cx=x+w/2,cz=z+h/2,south=z+h,bucket=building.id,doorX=building.door.x;
    // Cool masonry, projecting courses and pilasters break up the broad facade.
    // These are rendering details only; the story footprint and exit never move.
    b.box(cx,1.9,cz,w-.8,3.8,h-.35,materials.castleStone,0,bucket);b.box(cx,.2,cz,w+.1,.4,h+.2,materials.stoneDark,0,bucket);
    for(const yy of[.55,2.03,3.66])b.box(cx,yy,south-.08,w-.45,.12,.28,materials.castleTrim,0,bucket);
    b.box(cx,3.78,south-.02,w-.35,.055,.32,materials.gold,0,bucket);
    for(let n=0;n<w;n++){
      b.box(x+n+.5,4.05,south-.12,.65,.58,.62,materials.castleTrim,0,bucket);
      if(n%2===0&&Math.abs(x+n+.5-doorX)>1.8&&Math.abs(Math.abs(x+n+.5-doorX)-3.1)>.7)window(x+n+.5,2.7,south-.07,.44,.85,bucket);
    }
    for(const side of[-1,1]){
      const tx=cx+side*(w/2-.65);b.round(tx,2.7,cz,1.08,5.4,materials.castleStone,bucket);b.round(tx,4.9,cz,1.18,.25,materials.castleTrim,bucket);b.peak(tx,6.3,cz,1.5,2.7,materials.roofPlum,bucket);
      b.round(tx,5.1,cz,1.19,.065,materials.gold,bucket);b.round(tx,7.85,cz,.035,1.1,materials.gold,bucket);b.box(tx+.32,8.08,cz,.6,.34,.04,materials.castlePlum,0,bucket);window(tx,3.5,cz+1.055,.42,.85,bucket);
      const px=doorX+side*2.05;
      b.box(px,1.8,south+.03,.32,3.6,.44,materials.castleTrim,0,bucket);b.box(px,3.55,south+.08,.52,.18,.56,materials.gold,0,bucket);
      b.box(px,.24,south+.06,.55,.45,.58,materials.stoneDark,0,bucket);
      // Hanging plum pennants have a pointed hem and a small gold star.
      const banner=new THREE.Shape();banner.moveTo(-.35,0);banner.lineTo(0,-.28);banner.lineTo(.35,0);banner.lineTo(.35,1.5);banner.lineTo(-.35,1.5);banner.closePath();
      const bx=doorX+side*3.1;b.mesh(new THREE.ExtrudeGeometry(banner,{depth:.035,bevelEnabled:false}),materials.castlePlum,new THREE.Vector3(bx,1.35,south+.09),bucket).name='castle-banner-'+side;
      b.box(bx,2.88,south+.14,.9,.075,.12,materials.gold,0,bucket);
      star(bx,2.3,south+.15,.23);
      lantern(doorX+side*1.63,south+.44,true,bucket);
      // Small harvest clusters sit to either side, leaving the threshold clear.
      for(let n=0;n<2;n++){
        const qx=doorX+side*(2.3+n*.4),qz=south+.42+n*.18,r=n?.18:.25;
        b.ball(qx,r,qz,r,r*.86,r,materials.pumpkin,bucket);b.round(qx,r*1.86,qz,.035,.13,materials.wood,bucket);
        for(const offset of[-.075,.075])b.ball(qx+offset,r*1.05,qz+r*.88,.035,.04,.022,materials.glass,bucket);
      }
    }
    b.box(cx,4.55,cz-.9,2.25,3.3,1.8,materials.castleStone,0,bucket);b.peak(cx,7.1,cz-.9,1.9,2.5,materials.roofPlum,bucket);window(cx,5.3,cz+.04,.65,1,bucket);
    function star(sx,sy,sz,r){
      const shape=new THREE.Shape();for(let n=0;n<10;n++){const a=Math.PI/2+n*Math.PI/5,rr=n%2?r*.43:r,xx=Math.cos(a)*rr,yy=Math.sin(a)*rr;n?shape.lineTo(xx,yy):shape.moveTo(xx,yy);}shape.closePath();
      b.mesh(new THREE.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:false}),materials.gold,new THREE.Vector3(sx,sy,sz),bucket).name='castle-star';
    }
    function arch(radius,spring){
      const shape=new THREE.Shape();shape.moveTo(-radius,0);shape.lineTo(radius,0);shape.lineTo(radius,spring);shape.absarc(0,spring,radius,0,Math.PI,false);shape.lineTo(-radius,0);return shape;
    }
    // Layered arched recess and metalwork face south, toward the original exit.
    const gate=arch(1.02,1.8);b.mesh(new THREE.ExtrudeGeometry(gate,{depth:.08,bevelEnabled:false}),materials.castlePlum,new THREE.Vector3(doorX,.05,south+.18),bucket).name='castle-arched-gate';
    const frame=new THREE.Shape();frame.moveTo(-1.23,0);frame.lineTo(-1.23,1.8);frame.absarc(0,1.8,1.23,Math.PI,0,true);frame.lineTo(1.23,0);frame.lineTo(1.04,0);frame.lineTo(1.04,1.8);frame.absarc(0,1.8,1.04,0,Math.PI,false);frame.lineTo(-1.04,0);frame.closePath();
    b.mesh(new THREE.ExtrudeGeometry(frame,{depth:.22,bevelEnabled:false}),materials.gold,new THREE.Vector3(doorX,.05,south+.24),bucket).name='castle-gate-frame';
    for(let n=-4;n<=4;n++){
      const xx=n*.21,high=1.8+Math.sqrt(1.02**2-xx**2)-.1;b.box(doorX+xx,high/2+.05,south+.3,.037,high,.045,materials.gold,0,bucket);
    }
    for(const yy of[.55,1.4])b.box(doorX,yy,south+.33,2.04,.055,.055,materials.gold,0,bucket);
    const crest=b.mesh(new THREE.TorusGeometry(.3,.035,6,24),materials.gold,new THREE.Vector3(doorX,3.47,south+.23),bucket);crest.name='castle-gate-crest';star(doorX,3.47,south+.25,.23);
    for(let n=0;n<5;n++)b.box(doorX,.02-n*.035,south+.35+n*.23,2.15+n*.22,.13,.3,materials.castleTrim,0,bucket);
    buildings.push({id:building.id,footprint:{x,z,w,h},door:{...building.door},height:8.6,bucket});
  }
  function tree(x,z,autumn=false,index=0){
    const bucket='tree-'+index,leaf=autumn?materials.leafAutumn:materials.leaf;
    trees.push({bucket,footprint:{x:x-1.45,z:z-.95,w:2.9,h:1.9},height:3.6});
    b.round(x,1.15,z,.13,2.3,materials.wood,bucket);
    for(let n=0;n<7;n++){const a=n*2.4,r=n%3*.29;b.ball(x+Math.cos(a)*r,2.5+(n%2)*.28,z+Math.sin(a)*r,1.05,.78,.94,n%3===0?autumn?materials.leafRose:materials.leafLight:leaf,bucket);}
  }
  function fountain(x,z,pool=false){
    const r=pool?1.04:.87;b.round(x,.08,z,r,.18,materials.stone);b.round(x,.18,z,r*.89,.11,materials.stoneDark);b.round(x,.24,z,r*.77,.035,materials.water);
    if(!pool){b.round(x,.59,z,.13,.8,materials.stone);b.round(x,1.06,z,.4,.12,materials.stone);b.round(x,1.14,z,.31,.055,materials.water);b.ball(x,1.33,z,.075,.21,.075,materials.paper);}
    for(let n=0;n<12;n++){const a=n*TAU/12;b.box(x+Math.cos(a)*r*.94,.15,z+Math.sin(a)*r*.94,.26,.12,.25,materials.stone,a);}
  }
  function bench(x,z){b.box(x,.47,z,1.65,.13,.52,materials.woodLight);b.box(x,.81,z-.22,1.65,.5,.1,materials.wood);for(const side of[-1,1]){b.box(x+side*.66,.23,z,.11,.43,.43,materials.dark);b.box(x+side*.77,.68,z,.08,.14,.62,materials.gold);}}
  if(!interior){
    for(const building of map.buildings)building.kind==='castle'?castle(building):house(building);
    // Stone banks and bridge rails have height and cast shadows on the water below.
    for(let z=6;z<47;z++)for(const x of[30.84,33.16])if(map.tiles[z]?.[31]==='~')b.box(x,.02,z+.5,.22,.33,1.02,materials.stone);
    for(let z=6;z<47;z++)if(map.tiles[z]?.[31]==='='&&map.tiles[z-1]?.[31]!=='='){
      for(const side of[0,2]){b.box(32,.42,z+side-.04,4.1,.12,.16,materials.stone);for(let n=0;n<7;n++)b.box(30.1+n*.63,.22,z+side-.04,.1,.4,.12,materials.stoneDark);}
    }
    for(const [index,prop]of(map.decorations||[]).entries()){
      if(prop.kind==='tree'||prop.kind==='autumnTree')tree(prop.x,prop.z,prop.kind==='autumnTree',index);
      else if(prop.kind==='lamp')lantern(prop.x,prop.z);
      else if(prop.kind==='market'){
        b.box(prop.x,.62,prop.z,1.45,.16,.8,materials.woodLight);for(const sx of[-.62,.62])for(const sz of[-.3,.3])b.box(prop.x+sx,.88,prop.z+sz,.06,1.76,.06,materials.wood);
        b.box(prop.x,1.8,prop.z,1.65,.14,1.08,index%2?materials.roofWarm:materials.roofTeal);
        for(let n=0;n<4;n++)b.ball(prop.x-.5+n*.32,.79,prop.z,.13,.12,.13,index%2?materials.leafAutumn:materials.flower);
      }else if(prop.kind==='statue'){b.box(prop.x,.28,prop.z,.7,.56,.7,materials.stoneDark);b.round(prop.x,1,prop.z,.23,.95,materials.stone);b.ball(prop.x,1.68,prop.z,.23,.3,.23,materials.stone);}
    }
    for(let z=2;z<map.height-1;z+=2)for(let x=2;x<map.width-1;x+=2)if(map.tiles[z][x]==='f'){
      const xx=x+.2+seed(x,z)*.6,zz=z+.2+seed(z,x)*.6;b.round(xx,.13,zz,.025,.26,materials.leaf);
      for(let n=0;n<4;n++){const a=n*TAU/4;b.ball(xx+Math.cos(a)*.055,.27,zz+Math.sin(a)*.055,.07,.035,.07,materials.flower);}
    }
  }else{
    // Open south wall keeps the player's exit visible; the doorway matches the portal.
    b.box(map.width/2,1.25,.42,map.width,2.5,.27,materials.wall);b.box(.42,1.25,map.height/2,.27,2.5,map.height,materials.wall);b.box(map.width-.42,1.25,map.height/2,.27,2.5,map.height,materials.wall);
    for(const xx of[4,10,16])window(xx,1.55,.58,.9,1.15,'interior-windows');
    b.box(map.width/2,.015,10,3.2,.025,9,materials.carpet);for(const xx of[8.45,11.55])b.box(xx,.033,10,.045,.018,9,materials.gold);
    for(const f of map.furniture||[]){
      const cx=f.x+f.w/2,cz=f.z+f.h/2;
      if(f.kind==='bookshelf'){
        b.box(cx,1.1,cz,f.w,2.2,f.h,materials.wood);
        // Shelves face the walking aisle on the south end of each footprint.
        for(let row=0;row<4;row++){const yy=.22+row*.5;b.box(cx,yy,f.z+f.h+.02,f.w+.12,.1,.36,materials.woodLight);for(let n=0;n<11;n++)b.box(f.x+.18+n*.25,yy+.23,f.z+f.h+.04,.18,.32+seed(n,row)*.12,.22,[materials.bookRed,materials.bookTeal,materials.bookGold][n%3]);}
      }else if(f.kind==='bed'){
        b.box(cx,.32,cz,f.w,.6,f.h,materials.wood);b.box(cx,.72,cz,f.w-.25,.28,f.h-.3,materials.carpet);b.box(cx,.93,f.z+.65,f.w-.4,.22,.85,materials.paper);b.box(cx,1.05,f.z+.1,f.w,1.5,.17,materials.woodLight);
      }else{
        b.box(cx,.55,cz,f.w,1.1,f.h,materials.wood);b.box(cx,1.14,cz,f.w+.2,.16,f.h+.2,materials.woodLight);for(let n=0;n<3;n++)b.round(f.x+.6+n*.8,1.35,f.z+f.h-.4,.16,.3,materials.gold);
      }
    }
    for(const side of[3,17])lantern(side,8);
  }
  for(const target of map.targets||[]){
    if(target.kind==='lantern'){lantern(target.x,target.z,false,target.id);lamps[lamps.length-1].targetId=target.id;}
    if(target.kind==='pool'||target.kind==='fountain')fountain(target.x,target.z,target.kind==='pool');
    if(target.kind==='bench')bench(target.x,target.z);
    if(target.kind==='sluice'){for(const xx of[-.55,.55])b.box(target.x+xx,.74,target.z,.22,1.48,.3,materials.stone);b.box(target.x,1.35,target.z,1.3,.2,.34,materials.wood);for(let n=0;n<6;n++)b.box(target.x-.45+n*.18,.65,target.z,.07,1.2,.08,materials.gold);}
    if(target.kind==='star'){
      const shape=new THREE.Shape();for(let n=0;n<10;n++){const a=n*Math.PI/5-Math.PI/2,r=n%2?.08:.2;n?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();
      const star=b.mesh(new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false}),materials.gold,new THREE.Vector3(target.x,.025,target.z));star.rotation.x=-Math.PI/2;star.userData.starId=target.id;stars.push(star);
    }
    if(['clock','console','book'].includes(target.kind)){
      b.box(target.x,.5,target.z,1.2,1,.65,materials.wood);b.box(target.x,1.05,target.z,1.4,.12,.8,materials.woodLight);for(let n=0;n<3;n++)b.ball(target.x-.38+n*.38,1.2,target.z,.1,.1,.1,[materials.bookRed,materials.bookTeal,materials.gold][n]);
    }
  }
  b.finish();root.updateMatrixWorld(true);
  return {root,materials,resources,buildings,trees,occluders:[...buildings,...trees],water,lamps,stars,dispose(){root.traverse(item=>{if(item.isInstancedMesh)item.dispose();});for(const resource of resources)resource.dispose?.();resources.clear();root.clear();}};
}

function repeatTexture(image,resources){const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.needsUpdate=true;resources.add(texture);return texture;}

function surfaceTexture(makeCanvas,kind,resources){
  const cv=makeCanvas(256,256),c=cv.getContext('2d');c.fillStyle=kind==='roof'?'#b1a5a1':kind==='stone'?'#c6c1af':kind==='wood'?'#c4b395':'#d9cbb4';c.fillRect(0,0,256,256);
  for(let n=0;n<1200;n++){const x=seed(n,17)*256,y=seed(21,n)*256;c.fillStyle=n%2?'#302f3d0b':'#fff9e612';c.fillRect(x,y,1+n%3,1+n%2);}
  c.strokeStyle=kind==='roof'?'#35394a55':kind==='wood'?'#50382a40':'#5f655342';c.lineWidth=kind==='roof'?2:1;
  if(kind==='wood')for(let row=0;row<18;row++){c.beginPath();c.moveTo(0,row*15);c.bezierCurveTo(80,row*15+4,170,row*15-3,256,row*15);c.stroke();}
  else if(kind==='wall'){for(const x of[12,244]){c.beginPath();c.moveTo(x,0);c.lineTo(x,256);c.stroke();}}
  else for(let row=0;row<8;row++){const y=row*32;c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();for(let col=-1;col<5;col++){const x=col*64+(row%2)*32;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+32);c.stroke();c.strokeStyle='#fff8de35';c.beginPath();c.moveTo(x+2,y+3);c.lineTo(x+61,y+3);c.stroke();c.strokeStyle=kind==='roof'?'#35394a55':'#5f655342';}}
  const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;resources.add(texture);return texture;
}

/** A real, elevated 3D scene. Approved character sheets remain unmodified camera-facing sprites. */
export function createTownWorld3D({canvas,art={images:{},version:0},onContextLost=()=>{},makeCanvas=(w,h)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;},loadImage=loadArtImage,fetcher=globalThis.fetch,assetTimeout=12000,rendererFactory=options=>new THREE.WebGLRenderer(options)}={}){
  if(!canvas)throw new TypeError('A dedicated WebGL town canvas is required');
  const renderer=rendererFactory({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.36;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#243e4e');scene.fog=new THREE.Fog('#243e4e',38,77);
  const camera=new THREE.OrthographicCamera(-8,8,6,-6,.1,100),ambient=new THREE.HemisphereLight('#e5efff','#546340',2.45),sun=new THREE.DirectionalLight('#ffe8bd',3.2);
  sun.position.set(-12,24,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-17;sun.shadow.camera.right=17;sun.shadow.camera.top=17;sun.shadow.camera.bottom=-17;sun.shadow.camera.near=.5;sun.shadow.camera.far=70;sun.shadow.normalBias=.035;sun.shadow.bias=-.00035;
  scene.add(ambient,sun,sun.target);
  const warmLight=new THREE.PointLight('#ffd78b',1.4,4,2);scene.add(warmLight);
  const lampLights=Array.from({length:4},()=>{const light=new THREE.PointLight('#ffcf87',1.1,5,2);scene.add(light);return light;});
  const actorRoot=new THREE.Group();scene.add(actorRoot);const textureResources=new Set(),actors=new Map(),imageTextures=new WeakMap(),spriteFrames=new Map(),liveFrames=new Map(),raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),pointer=new THREE.Vector2(),hitPoint=new THREE.Vector3(),projected=new THREE.Vector3(),abort=new AbortController();
  const assets={images:{},residentFrames:null,loaded:[],failed:[]};let scenery=null,mapId=null,disposed=false,lost=false,prepared=false,cameraTarget=null,lastView=null,version=0,frameSerial=0,lastFrameSignature='';
  const imageIds=new WeakMap();let nextImageId=1;
  function imageId(sprite){const image=sprite?.image||sprite;if(!image||typeof image!=='object')return 0;if(!imageIds.has(image))imageIds.set(image,nextImageId++);return imageIds.get(image);}
  const contextLost=event=>{event.preventDefault?.();if(disposed)return;lost=true;onContextLost(event);};canvas.addEventListener('webglcontextlost',contextLost);
  const load=async(key,file)=>{try{const image=await withDeadline(loadImage(new URL(file,import.meta.url).href,{timeout:assetTimeout}),{timeout:assetTimeout,signal:abort.signal});if(disposed)return null;assets.images[key]=image;assets.loaded.push(key);version++;return image;}catch{if(!disposed)assets.failed.push(key);return null;}};
  const ready=(async()=>{
    const manifestPromise=(async()=>{try{const data=await withDeadline((async()=>{const response=await fetcher(new URL('./assets/residents-manifest.json',import.meta.url),{signal:abort.signal});if(!response.ok)throw Error('Resident manifest unavailable');return response.json();})(),{timeout:6000,signal:abort.signal});if(!disposed)assets.residentFrames=data.sprites;}catch{if(!disposed)assets.failed.push('resident-manifest');}})();
    await Promise.all([manifestPromise,load('residents','./assets/residents-atlas.webp'),load('cobbles','./assets/cobblestone-dark.webp'),load('parquet','../maze/assets/rpg/palace/parquet.webp')]);
    if(disposed||lost)throw Error('Town 3D renderer was released before readiness');
    const residentImage=assets.images.residents;
    if(!residentImage||!assets.residentFrames||['keeper','baker','sailor','gardener','cat','maskmaker','merchant','clocksmith','archivist','innkeeper'].some(key=>{const f=assets.residentFrames[key]?.frame;return !f||f[2]<=0||f[3]<=0||f[0]<0||f[1]<0||f[0]+f[2]>residentImage.width||f[1]+f[3]>residentImage.height;}))throw Error('Town 3D resident art is unavailable');
    prepared=true;return {loaded:[...assets.loaded],failed:[...assets.failed]};
  })();
  function spriteTexture(sprite){
    const image=sprite.image||sprite,frame=sprite.frame||[0,0,image.width,image.height];let frames=imageTextures.get(image);
    if(!frames){frames=new Map();imageTextures.set(image,frames);}const key=frame.join(',');if(frames.has(key)){const texture=frames.get(key);spriteFrames.get(texture).used=frameSerial;return texture;}
    // Crop pixels without redrawing or altering the character: no border from adjacent atlas cells.
    const cropScale=Math.min(1,512/Math.max(frame[2],frame[3])),cv=makeCanvas(Math.max(1,Math.ceil(frame[2]*cropScale)),Math.max(1,Math.ceil(frame[3]*cropScale)));const ctx=cv.getContext('2d');ctx.drawImage(image,...frame,0,0,cv.width,cv.height);
    const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;textureResources.add(texture);frames.set(key,texture);spriteFrames.set(texture,{canvas:cv,data:null,frames,key,used:frameSerial,bytes:cv.width*cv.height*4});return texture;
  }
  function releaseLiveTexture(entry){
    if(!entry.liveTexture)return;entry.liveTexture.dispose();textureResources.delete(entry.liveTexture);liveFrames.delete(entry.liveTexture);entry.liveTexture=null;entry.liveImage=null;entry.livePoseVersion=undefined;
  }
  function actorTexture(entry,sprite){
    if(!Number.isFinite(sprite.poseVersion)){releaseLiveTexture(entry);return spriteTexture(sprite);}
    const image=sprite.image||sprite,frame=sprite.frame||[0,0,image.width,image.height];
    // Articulated actors repaint one canvas. Its pose revision updates the same GPU allocation.
    if(entry.liveImage!==image){releaseLiveTexture(entry);const texture=new THREE.CanvasTexture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;textureResources.add(texture);entry.liveTexture=texture;entry.liveImage=image;liveFrames.set(texture,{canvas:image,data:null,frame,bytes:image.width*image.height*4});}
    const texture=entry.liveTexture,record=liveFrames.get(texture),frameKey=frame.join(',');
    if(entry.livePoseVersion!==sprite.poseVersion||record.frameKey!==frameKey||record.bytes!==image.width*image.height*4){texture.needsUpdate=true;record.data=null;record.frame=[...frame];record.frameKey=frameKey;record.bytes=image.width*image.height*4;entry.livePoseVersion=sprite.poseVersion;}
    texture.repeat.set(frame[2]/image.width,frame[3]/image.height);texture.offset.set(frame[0]/image.width,1-(frame[1]+frame[3])/image.height);return texture;
  }
  const shadowCanvas=makeCanvas(64,64),shadowContext=shadowCanvas.getContext('2d'),gradient=shadowContext.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'#091e2c88');gradient.addColorStop(1,'#091e2c00');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,64,64);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);textureResources.add(shadowTexture);const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.8}),shadowGeometry=new THREE.PlaneGeometry(1,1);textureResources.add(shadowMaterial);textureResources.add(shadowGeometry);
  function actor(id,sprite,x,z,height,interactive=false){
    if(!sprite)return;let entry=actors.get(id);if(!entry){const material=new THREE.SpriteMaterial({transparent:true,alphaTest:.075,depthWrite:true,depthTest:true,fog:true});const object=new THREE.Sprite(material);object.userData.actorId=id;const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.026;actorRoot.add(shadow,object);entry={object,shadow,material};actors.set(id,entry);}
    const frame=sprite.frame||[0,0,(sprite.image||sprite).width,(sprite.image||sprite).height],fullHeight=height*frame[3]/(sprite.contentHeight||frame[3]);
    const texture=actorTexture(entry,sprite);if(entry.object.material.map!==texture){entry.object.material.map=texture;entry.object.material.needsUpdate=true;}entry.object.center.set(sprite.anchorX??.5,1-(sprite.anchorY??1));entry.object.scale.set(fullHeight*frame[2]/frame[3],fullHeight,1);entry.object.position.set(x,.035,z);entry.object.visible=true;entry.shadow.position.set(x,.026,z);entry.shadow.scale.set(height*.58,height*.43,1);entry.shadow.visible=true;entry.sprite=sprite;entry.interactive=interactive;entry.frame=frame;
  }
  function prepareMap(map){
    if(map.id===mapId&&scenery)return;scenery?.dispose();if(scenery)scene.remove(scenery.root);scenery=createTownSceneGeometry(map);scene.add(scenery.root);mapId=map.id;cameraTarget=null;
    const {materials,resources}=scenery;
    if(assets.images.cobbles){const texture=repeatTexture(assets.images.cobbles,resources);texture.anisotropy=Math.min(4,renderer.capabilities?.getMaxAnisotropy?.()||1);materials.road.map=texture;materials.plaza.map=texture;materials.road.color.set('#d2ccc0');materials.plaza.color.set('#e1d0b4');materials.road.needsUpdate=materials.plaza.needsUpdate=true;}
    if(assets.images.parquet){materials.parquet.map=repeatTexture(assets.images.parquet,resources);materials.parquet.color.set('#d8c9aa');materials.parquet.needsUpdate=true;}
    const detail={stone:surfaceTexture(makeCanvas,'stone',resources),roof:surfaceTexture(makeCanvas,'roof',resources),wood:surfaceTexture(makeCanvas,'wood',resources),wall:surfaceTexture(makeCanvas,'wall',resources)};
    for(const resource of resources)if(resource.isMaterial){const name=resource.name,kind=name.startsWith('roof')?'roof':name.startsWith('wood')?'wood':name.startsWith('wall')?'wall':name==='stone'||name==='stoneDark'||name==='castleStone'||name==='castleTrim'?'stone':null;if(kind){resource.map=detail[kind];resource.needsUpdate=true;}}
  }
  function resize(pixelRatio){
    const width=Math.max(1,Math.round(canvas.clientWidth||canvas.width||640)),height=Math.max(1,Math.round(canvas.clientHeight||canvas.height||480));const ratio=clamp(pixelRatio||globalThis.devicePixelRatio||1,1,Math.min(width,height)<650?1.5:1.8);
    if(lastView?.width!==width||lastView?.height!==height||lastView?.ratio!==ratio){renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);}return {width,height,ratio};
  }
  function releaseUnusedActors(){
    for(const [id,entry]of actors)if(!entry.object.visible){actorRoot.remove(entry.object,entry.shadow);releaseLiveTexture(entry);entry.material.dispose();actors.delete(id);}
    // The cropped-frame cache includes the original protagonist and only recent visitor groups.
    const pinned=new Set([...actors.values()].map(entry=>entry.material.map));let bytes=[...spriteFrames.values(),...liveFrames.values()].reduce((sum,frame)=>sum+frame.bytes,0);
    for(const [texture,frame]of[...spriteFrames].sort((a,b)=>a[1].used-b[1].used)){
      if(bytes<=32*1024*1024&&spriteFrames.size<=80)break;if(pinned.has(texture))continue;
      bytes-=frame.bytes;frame.frames.delete(frame.key);frame.canvas.width=frame.canvas.height=1;texture.dispose();textureResources.delete(texture);spriteFrames.delete(texture);
    }
  }
  function revealPlayer(position){
    const faded=new Set(scenery.occluders.filter(building=>{const p=building.footprint;return position.x>p.x-.35&&position.x<p.x+p.w+.35&&position.z>p.z-building.height/Math.tan(TOWN_3D_CAMERA_ELEVATION)-.2&&position.z<p.z+p.h+.1;}).map(building=>building.bucket));
    for(const item of scenery.root.children){if(!item.userData.bucket||!item.material)continue;const fade=faded.has(item.userData.bucket),material=item.material;
      if(item.userData.faded===fade)continue;item.userData.faded=fade;material.transparent=fade;material.opacity=fade?.24:1;material.depthWrite=!fade;material.needsUpdate=true;item.castShadow=!fade;
    }
  }
  function render({state,time=0,dt=.016,motion=true,pixelRatio=1,walking=false,walkPhase=0,facing=state?.facing||'down',brightness=75,lantern=true,creatorActors=[]}={}){
    if(disposed||lost||!state?.position)return false;frameSerial++;const map=getTownMap(state.mapId);prepareMap(map);const view=resize(pixelRatio),parameters=town3DCameraParameters(view.width,view.height,map.id!=='lantern-town');
    const heroSprite=playerPose(art,facing,walking&&motion,walkPhase),signature=JSON.stringify([map.id,view.width,view.height,view.ratio,state.position.x,state.position.z,facing,brightness,lantern,motion,version,art.version,assets.loaded.length,state.flags,heroSprite?.poseVersion,imageId(heroSprite),heroSprite?.frame,(map.npcs||[]).map(npc=>art.rigs?.get?.('resident:'+npc.id)?.poseVersion),creatorActors.map(actor=>[actor.id,actor.x,actor.z,actor.heightPx,actor.interactive,imageId(actor.sprite),actor.sprite?.frame,actor.sprite?.anchorX,actor.sprite?.anchorY,actor.sprite?.contentHeight,actor.sprite?.poseVersion])]);
    if(!motion&&signature===lastFrameSignature)return false;
    Object.assign(camera,{left:parameters.left,right:parameters.right,top:parameters.top,bottom:parameters.bottom});camera.updateProjectionMatrix();
    const target={x:state.position.x,z:state.position.z-.85},amount=cameraTarget&&motion?1-Math.exp(-clamp(dt,0,.1)/.12):1;
    cameraTarget={x:(cameraTarget?.x??target.x)+(target.x-(cameraTarget?.x??target.x))*amount,z:(cameraTarget?.z??target.z)+(target.z-(cameraTarget?.z??target.z))*amount};
    camera.position.set(cameraTarget.x,Math.sin(parameters.elevation)*parameters.distance,cameraTarget.z+Math.cos(parameters.elevation)*parameters.distance);camera.lookAt(cameraTarget.x,0,cameraTarget.z);camera.updateMatrixWorld(true);
    sun.position.set(cameraTarget.x-12,24,cameraTarget.z+15);sun.target.position.set(cameraTarget.x,0,cameraTarget.z);sun.target.updateMatrixWorld(true);
    sun.intensity=2.3+clamp(brightness,20,100)/100;ambient.intensity=1.5+clamp(brightness,20,100)*.014;warmLight.visible=lantern;warmLight.position.set(state.position.x,1.1,state.position.z);
    for(const lamp of scenery.lamps)if(lamp.targetId){lamp.lit=!!state.flags?.lamps?.includes(lamp.targetId);for(const item of scenery.root.children)if(item.userData.bucket===lamp.targetId&&item.material?.name==='glass'){item.material.color.set(lamp.lit?'#ffe4a4':'#405263');item.material.emissiveIntensity=lamp.lit?.55:0;}}
    const nearLamps=scenery.lamps.filter(lamp=>lamp.lit).sort((a,b)=>Math.hypot(a.x-state.position.x,a.z-state.position.z)-Math.hypot(b.x-state.position.x,b.z-state.position.z)).slice(0,lampLights.length);
    lampLights.forEach((light,index)=>{const lamp=nearLamps[index];light.visible=!!lamp;if(lamp)light.position.set(lamp.x,lamp.y,lamp.z);});revealPlayer(state.position);
    for(const entry of actors.values()){entry.object.visible=false;entry.shadow.visible=false;}
    actor('hero',heroSprite,state.position.x,state.position.z,1.6);
    for(const item of creatorActors)if(item.sprite)actor(item.id,item.sprite,item.x,item.z,item.heightPx?item.heightPx/48:1.16,item.interactive!==false);
    for(const npc of map.npcs||[]){const frame=assets.residentFrames?.[npc.appearance],liveSprite=art.rigs?.get?.('resident:'+npc.id);if(liveSprite?.image)actor('resident-'+npc.id,liveSprite,npc.x,npc.z,1.6*(frame?.heightRatio||1));else if(frame&&assets.images.residents)actor('resident-'+npc.id,{image:assets.images.residents,...frame},npc.x,npc.z,1.6*(frame.heightRatio||1));}
    releaseUnusedActors();
    for(const star of scenery.stars)star.visible=!state.flags?.stamps?.includes(star.userData.starId);
    // A gentle highlight travels across real water geometry; motion preference freezes it.
    scenery.materials.water.color.setHSL(.535,.36,.27+(motion?Math.sin(time*.8)*.012:0));
    lastView={...view,map,state,parameters};scene.updateMatrixWorld(true);renderer.render(scene,camera);lastFrameSignature=signature;return true;
  }
  function setRay(x,y){if(!lastView)return false;const point=typeof x==='object'?x:{x,y};pointer.set(point.x/lastView.width*2-1,1-point.y/lastView.height*2);raycaster.setFromCamera(pointer,camera);return true;}
  function screenToWorld(x,y){if(!setRay(x,y)||!raycaster.ray.intersectPlane(plane,hitPoint))return null;return {x:hitPoint.x,z:hitPoint.z};}
  function worldToScreen(x,z){if(!lastView)return null;const point=typeof x==='object'?x:{x,z};projected.set(point.x,point.y||0,point.z).project(camera);return {x:(projected.x+1)*lastView.width/2,y:(1-projected.y)*lastView.height/2};}
  function opaque(hit){const texture=hit.object.material.map,frame=spriteFrames.get(texture)||liveFrames.get(texture);if(!frame||!hit.uv)return true;try{frame.data??=frame.canvas.getContext('2d').getImageData(0,0,frame.canvas.width,frame.canvas.height);const crop=frame.frame||[0,0,frame.data.width,frame.data.height],x=clamp(Math.floor(crop[0]+hit.uv.x*crop[2]),0,frame.data.width-1),y=clamp(Math.floor(crop[1]+(1-hit.uv.y)*crop[3]),0,frame.data.height-1);return frame.data.data[(y*frame.data.width+x)*4+3]>55;}catch{return true;}}
  function pickVisitor(x,y){
    if(!setRay(x,y))return null;const candidates=[...actors.values()].filter(entry=>entry.object.visible).map(entry=>entry.object),hits=raycaster.intersectObjects(candidates,false);
    const occlusion=scenery?raycaster.intersectObjects(scenery.root.children.filter(item=>item.userData.occluder&&item.visible&&!item.userData.faded),false)[0]?.distance??Infinity:Infinity;
    for(const hit of hits){if(hit.distance>occlusion+.05)return null;if(!opaque(hit))continue;const id=hit.object.userData.actorId,entry=actors.get(id);return entry.interactive?id:null;}return null;
  }
  return {ready,render,screenToWorld,worldToScreen,pickVisitor,invalidate(){version++;},status:()=>({mode:'3d',ready:prepared&&!disposed&&!lost,loaded:[...assets.loaded],failed:[...assets.failed],mapId,version,actors:actors.size,spriteFrames:spriteFrames.size,liveSprites:liveFrames.size,spriteBytes:[...spriteFrames.values(),...liveFrames.values()].reduce((sum,frame)=>sum+frame.bytes,0),drawCalls:renderer.info?.render?.calls||0}),
    destroy(){if(disposed)return;disposed=true;abort.abort();canvas.removeEventListener('webglcontextlost',contextLost);scenery?.dispose();sun.shadow.map?.dispose();for(const entry of actors.values()){releaseLiveTexture(entry);entry.material.dispose();}actors.clear();spriteFrames.clear();liveFrames.clear();for(const resource of textureResources)resource.dispose?.();textureResources.clear();actorRoot.clear();renderer.dispose();scene.clear();lastView=null;cameraTarget=null;},
  };
}

export const createTown3DRenderer=createTownWorld3D;
