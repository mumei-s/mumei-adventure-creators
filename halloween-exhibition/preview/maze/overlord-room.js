import {CELL,OVERLORD_ROOM} from './maze-model.js?v=20261029-overlord2';

// Authored, native geometry. No image cards or network requests are used here.
// Reused primitives and rigid-material batching keep the gothic detail inexpensive.
function kit(THREE){
 const group=new THREE.Group(),resources=new Set();
 const track=resource=>{resources.add(resource);return resource;};
 const material=(name,color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.55,...extra});m.name=name;resources.add(m);return m;};
 const stone=material('blue-black carved marble','#303548',{metalness:.24,roughness:.4});
 const black=material('polished obsidian','#171c2a',{metalness:.5,roughness:.28});
 const gold=material('antique gilded relief','#dbb367',{metalness:.78,roughness:.26});
 const pale=material('worn marble veins','#687083',{metalness:.3,roughness:.38});
 const red=material('crimson velvet','#801a3b',{roughness:.8,side:THREE.DoubleSide});
 const ruby=material('faceted ruby inlay','#a90939',{metalness:.2,roughness:.17,emissive:'#4e071c',emissiveIntensity:.35});
 const glow=material('amber candle flame','#ffc77b',{emissive:'#ff7c28',emissiveIntensity:2.5,roughness:.4});
 const glass=material('garnet stained glass','#56112c',{emissive:'#b71943',emissiveIntensity:.6,metalness:.12,roughness:.25});
 const geos={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,12,8),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,8),gem:new THREE.OctahedronGeometry(1,0)};
 Object.values(geos).forEach(g=>resources.add(g));
 function mesh(type,mat,x,y,z,sx,sy,sz,parent=group){const o=new THREE.Mesh(geos[type],mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=false;o.receiveShadow=true;parent.add(o);return o;}
 const box=(mat,x,y,z,w,h,d,parent=group)=>mesh('box',mat,x,y,z,w,h,d,parent);
 function tube(points,radius,mat,parent=group,segments=20,sides=4){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const geo=new THREE.TubeGeometry(curve,segments,radius,sides,false);resources.add(geo);const m=new THREE.Mesh(geo,mat);parent.add(m);return m;}
 function shape(points,mat,depth=.06,parent=group){const path=new THREE.Shape();points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();const geo=new THREE.ExtrudeGeometry(path,{depth,steps:1,bevelEnabled:false});resources.add(geo);const m=new THREE.Mesh(geo,mat);parent.add(m);return m;}
 function batch(node=group){
  for(const child of [...node.children])if(child.isGroup&&!child.userData.dynamic)batch(child);
  const buckets=new Map();for(const m of [...node.children])if(m.isMesh){const list=buckets.get(m.material)||[];list.push(m);buckets.set(m.material,list);}
  for(const [mat,list]of buckets){if(list.length<2)continue;const positions=[],normals=[];
   for(const m of list){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);geo.dispose();node.remove(m);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));resources.add(geo);const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;node.add(m);
  }
 }
 let dead=false;return {group,stone,black,gold,pale,red,ruby,glow,glass,mesh,box,tube,shape,batch,track,dispose(){if(dead)return;dead=true;resources.forEach(r=>r.dispose());group.removeFromParent();}};
}

function arch(THREE,k,parent,{x=0,y=0,z=0,width=3,height=4,rotation=0,glass=true,ornate=true}={}){
 const group=new THREE.Group();group.name='pointed-gothic-arch';group.position.set(x,y,z);group.rotation.y=rotation;parent.add(group);
 const half=width/2,points=[[-half,0,0],[-half,height*.48,0],[-half*.62,height*.79,0],[0,height,0],[half*.62,height*.79,0],[half,height*.48,0],[half,0,0]];
 if(glass){const m=k.shape([[-half,0],[half,0],[half,height*.47],[half*.62,height*.79],[0,height],[-half*.62,height*.79],[-half,height*.47]],k.glass,.055,group);m.position.z=-.12;}
 k.tube(points,.16,k.black,group,24);k.tube(points.map(([a,b])=>[a,b,.075]),.043,k.gold,group,24);
 k.box(k.gold,0,0,.02,width+.26,.075,.23,group);
 if(glass){for(const s of[-1,1])k.box(k.gold,s*width*.22,height*.36,.025,.026,height*.71,.04,group);k.box(k.gold,0,height*.43,.03,.035,height*.84,.04,group);k.box(k.gold,0,height*.34,.03,width*.9,.035,.04,group);}
 if(ornate){for(const s of[-1,1]){k.mesh('gem',k.gold,s*(half+.1),height*.14,.015,.09,.16,.045,group);k.tube([[s*half,height*.62,.03],[s*(half+.25),height*.76,.03],[s*(half+.08),height*.91,.03],[s*(half*.67),height*.94,.03]],.035,k.gold,group,10);}}
 return group;
}

function banner(THREE,k,parent,x,y,z,width=1,height=3,rotation=0){
 const group=new THREE.Group();group.name='folded-crimson-banner';group.position.set(x,y,z);group.rotation.y=rotation;parent.add(group);
 const n=8,positions=[],idx=[];
 for(let row=0;row<=6;row++)for(let col=0;col<=n;col++){const u=col/n,v=row/6;positions.push((u-.5)*width,-v*height+(v>.84?Math.abs(u-.5)*height*.24:0),Math.sin(u*Math.PI*6)*.055*(.6+v));if(row<6&&col<n){const a=row*(n+1)+col;idx.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}}
 // A thin closed border follows the fabric; the broad surface is actual cloth geometry.
 const geometry=k.track(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(idx);geometry.computeVertexNormals();
 const cloth=new THREE.Mesh(geometry,k.red);group.add(cloth);
 k.box(k.gold,0,.03,0,width+.25,.075,.095,group);
 for(const s of[-1,1])k.tube([[s*width*.48,0,.07],[s*width*.48,-height*.8,.07],[0,-height*.91,.07]],.018,k.gold,group,10);
 k.mesh('gem',k.gold,0,-height*.36,.09,width*.13,height*.12,.025,group);
 return group;
}

export function createOverlordThrone(THREE){
 const k=kit(THREE),{group,box,mesh,tube,shape,black,gold,red,ruby}=k;group.name='overlord-volumetric-throne';
 // The .75 seat and floor footprint preserve the authored sitting rig/collision.
 box(black,0,.13,0,3.5,.26,2.65);box(gold,0,.277,0,3.34,.035,2.49);
 box(black,0,.42,-.08,2.6,.26,1.98);box(gold,0,.565,-.08,2.48,.025,1.85);
 box(black,0,.64,-.1,1.9,.16,1.46);box(red,0,.75,-.04,1.44,.12,1.19);
 const back=shape([[-.91,.62],[.91,.62],[.91,2.58],[.56,3.05],[0,3.62],[-.56,3.05],[-.91,2.58]],black,.22);back.position.z=-.64;
 const cushion=shape([[-.67,.84],[.67,.84],[.67,2.45],[0,3.1],[-.67,2.45]],red,.08);cushion.position.z=-.385;
 for(const s of[-1,1]){
  tube([[s*.92,.62,-.37],[s*.92,2.58,-.37],[s*.57,3.09,-.37],[0,3.66,-.37]],.052,gold,group,18,5);
  tube([[s*.72,.92,-.265],[s*.72,2.41,-.265],[0,3.16,-.265]],.024,gold,group,16);
  box(black,s*.88,.9,.15,.22,.22,1.37);box(gold,s*.88,1.03,.15,.245,.035,1.41);
  tube([[s*.88,.9,-.44],[s*.89,1.14,-.12],[s*.88,1.16,.42],[s*.88,.96,.78]],.065,black,group,12,6);
  tube([[s*.88,1,-.42],[s*.89,1.19,-.1],[s*.88,1.21,.42],[s*.88,1.02,.77]],.024,gold,group,12);
  mesh('gem',gold,s*.88,1.02,.81,.12,.16,.15);mesh('gem',ruby,s*.88,1.1,.86,.043,.07,.04);
  box(black,s*.85,.53,.6,.15,.74,.15);box(gold,s*.85,.26,.6,.22,.04,.22);
  // Raised curling relief, visible in three-quarter and close views.
  for(let j=0;j<3;j++){const y=1.18+j*.46;tube([[s*.77,y,-.27],[s*.47,y+.12,-.235],[s*.42,y+.31,-.235],[s*.62,y+.35,-.24],[s*.69,y+.22,-.25]],.019,gold,group,12);}
  for(let j=0;j<3;j++){const x=s*(.29+j*.18),y=3.08-j*.12;const fin=shape([[x-.07,y-.17],[x+.07,y-.17],[x+.055,y+.22],[x,y+.52],[x-.055,y+.22]],gold,.055);fin.position.z=-.6;}
  // Small, faceted, offset inlays. No red sphere over the character's head.
  mesh('gem',ruby,s*.48,2.72,-.245,.075,.13,.032);
 }
 for(const x of[-.44,0,.44])for(const y of[1.2,1.65,2.1])mesh('gem',gold,x,y,-.271,.025,.025,.014);
 const crest=shape([[0,3.58],[-.15,3.24],[-.1,3.04],[0,3.13],[.1,3.04],[.15,3.24]],gold,.06);crest.position.z=-.47;
 group.userData.seatHeight=.75;group.userData.embeddedRuby=true;k.batch();return {...k,seatHeight:.75};
}

/** Local-origin hall: throne anchor at 0, back wall behind it and open foreground.
 * Compact form is shared with battle; full form stays on existing room margins. */
export function createOverlordHall(THREE,{compact=false,lights=!compact}={}){
 const k=kit(THREE),{group,box,mesh,tube,stone,black,gold,pale,red,ruby,glow}=k;group.name='overlord-gothic-hall';
 const half=compact?6:18,backZ=compact?-3.5:-7.4,frontZ=compact?7.5:36.4,height=compact?8:6.65,depth=frontZ-backZ;
 box(black,0,-.055,(frontZ+backZ)/2,half*2,.1,depth);
 const columns=compact?5:9,rows=compact?6:11,tileW=half*2/columns,tileD=depth/rows;
 for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
  const x=-half+(c+.5)*tileW,z=backZ+(r+.5)*tileD;box((c+r)%2?stone:black,x,.008,z,tileW-.035,.022,tileD-.035);
  if((c+r)%3===0){const vein=box(pale,x+.13,.023,z,tileW*.75,.008,.012);vein.rotation.y=.31+(r%2)*.28;const fork=box(pale,x-.07,.023,z+.08,tileW*.32,.008,.008);fork.rotation.y=-.55;}
 }
 const carpetW=compact?2.8:5.1,carpetLength=compact?9.5:33.4,carpetZ=compact?2.6:17.2;
 box(gold,0,.028,carpetZ,carpetW+.17,.025,carpetLength+.16);box(red,0,.045,carpetZ,carpetW,.023,carpetLength);
 for(const s of[-1,1])box(gold,s*(carpetW/2-.12),.061,carpetZ,.018,.012,carpetLength-.15);
 for(let i=0;i<(compact?6:12);i++){const z=carpetZ-carpetLength/2+.45+i*(carpetLength-.9)/(compact?5:11);for(const s of[-1,1]){const diamond=mesh('gem',gold,s*(carpetW/2-.32),.062,z,.075,.008,.12);diamond.rotation.y=Math.PI/4;}}
 box(stone,0,height/2,backZ-.12,half*2,height,.24);box(black,0,.33,backZ+.11,half*2,.66,.26);box(gold,0,.7,backZ+.28,half*2,.045,.1);
 const centerArch=arch(THREE,k,group,{y:1.1,z:backZ+.31,width:compact?4.6:5.8,height:height-1.4});centerArch.userData.centralWindow=true;
 // Blood-moon rose tracery is high in the wall, far behind the actor.
 const rose=new THREE.Group();rose.name='garnet-rose-tracery';rose.position.set(0,compact?5.25:4.75,backZ+.48);group.add(rose);
 const roseR=compact?1.0:1.22;const ringGeo=k.track(new THREE.TorusGeometry(roseR,.035,4,32));const ring=new THREE.Mesh(ringGeo,gold);rose.add(ring);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;tube([[0,0,.02],[Math.cos(a)*roseR*.55,Math.sin(a)*roseR*.55,.02],[Math.cos(a)*roseR,Math.sin(a)*roseR,.02]],.018,gold,rose,6);mesh('gem',ruby,Math.cos(a)*roseR*.68,Math.sin(a)*roseR*.68,.04,.09,.14,.025,rose);}
 const backXs=compact?[-4.5,4.5]:[-13.5,-7.2,7.2,13.5];
 for(const x of backXs){arch(THREE,k,group,{x,y:.9,z:backZ+.28,width:compact?2.3:3.3,height:height-1.25,ornate:false});banner(THREE,k,group,x,height-.5,backZ+.56,compact?.7:1.2,height-1.3);}
 const pillarX=compact?5.25:13.6,pillarZs=compact?[-2.9]:[6.4,18.4,30.4];
 for(const z of pillarZs)for(const s of[-1,1]){
  const column=new THREE.Group();column.name='clustered-marble-pier';column.position.set(s*pillarX,0,z);group.add(column);
  box(black,0,.12,0,1.66,.24,1.66,column);box(gold,0,.27,0,1.45,.045,1.45,column);
  for(let j=0;j<5;j++){const a=j/5*Math.PI*2;mesh('cylinder',stone,Math.cos(a)*.22,(height-.6)/2+.3,Math.sin(a)*.22,.19,height-.6,.19,column);}
  for(const y of[.39,height-.42,height-.18]){box(black,0,y,0,1.07,.13,1.07,column);box(gold,0,y+.08,0,1.1,.025,1.1,column);}
  mesh('cone',black,0,height+.18,0,.5,.65,.5,column);
  // Warm altar flames and guarded pumpkin faces, not large glowing spheres.
  box(black,0,.8,.63,.52,1.1,.33,column);box(gold,0,1.37,.63,.66,.045,.44,column);
  for(const x of[-.17,.17]){mesh('cylinder',gold,x,1.56,.65,.045,.4,.045,column);mesh('cone',glow,x,1.84,.65,.055,.18,.055,column);}
  const pumpkin=mesh('sphere',red,0,.61,.84,.3,.27,.25,column);pumpkin.name='pumpkin-altar';for(const x of[-.1,.1]){const eye=mesh('cone',glow,x,.65,1.062,.048,.06,.025,column);eye.rotation.z=Math.PI;}box(glow,0,.53,1.068,.13,.025,.02,column);
 }
 if(!compact){
  // Native vault ribs sit below the host room ceiling and away from the aisle.
  for(const z of pillarZs){for(const s of[-1,1]){const ps=[[s*pillarX,height-.47,z],[s*pillarX*.7,height-.1,z],[s*pillarX*.35,height+.04,z],[0,height+.12,z]];tube(ps,.12,black);tube(ps.map(([x,y,z])=>[x,y-.08,z+.06]),.035,gold);}}
  for(const s of[-1,1])for(const z of[2,12.5,24.5]){const side=arch(THREE,k,group,{x:s*(half-.4),y:.95,z,width:4.8,height:height-1.25,rotation:s<0?Math.PI/2:-Math.PI/2});side.userData.sideWindow=true;}
  for(const z of[11.5,23.5])for(const s of[-1,1])tube([[s*pillarX,height-.45,z-5],[s*7,height-.1,z-2],[0,height+.1,z],[s*-7,height-.1,z+2],[s*-pillarX,height-.45,z+5]],.055,gold,group,24);
 }
 const lightNodes=[];
 if(lights){const warm=new THREE.PointLight('#ffd6a3',135,66,1.25);warm.position.set(0,4.8,12);group.add(warm);const rim=new THREE.PointLight('#ec3162',74,45,1.3);rim.position.set(0,5,backZ+3.7);group.add(rim);lightNodes.push(warm,rim);}
 group.userData.architecture={compact,pointedArches:1+backXs.length+(compact?0:6),clusteredPiers:pillarZs.length*2,roseWindow:true,openForeground:true};
 k.batch();
 let dead=false;
 return {group,metadata:group.userData.architecture,update({time=0,motion=true}={}){if(lightNodes[1])lightNodes[1].intensity=74+(motion?Math.sin(time*.7)*2.5:0);},dispose(){if(dead)return;dead=true;k.dispose();}};
}

export function createOverlordRoom(THREE){
 const k=kit(THREE),{group,box,mesh,black,gold,ruby}=k;group.name='floor-666-nameless-overlord-castle';
 const cx=OVERLORD_ROOM.throne.x*CELL,tz=OVERLORD_ROOM.throne.z*CELL;
 const hall=createOverlordHall(THREE);hall.group.position.set(cx,0,tz);group.add(hall.group);
 const throne=createOverlordThrone(THREE);throne.group.position.set(cx,0,tz);group.add(throne.group);
 // Finite astral passage: the collision grid and seal coordinates are unchanged.
 box(black,15*CELL,.025,3*CELL,28,.05,3.94);
 for(const s of[-1,1])box(gold,15*CELL,.064,3*CELL+s*1.72,27,.012,.035);
 for(const xx of[12.5,14.5,16.5]){
  for(const s of[-1,1]){box(black,xx*CELL,2.4,3*CELL+s*1.9,.22,4.8,.18);box(gold,xx*CELL,2.4,3*CELL+s*1.78,.045,4.8,.045);}
  box(black,xx*CELL,4.76,3*CELL,.25,.15,3.95);mesh('gem',ruby,xx*CELL,4.76,3*CELL,.08,.13,.13);
 }
 const door=new THREE.Group();door.name='overlord-sealed-door';door.userData.dynamic=true;door.position.set(18*CELL,0,3*CELL);group.add(door);
 box(black,0,2.1,0,.3,4.2,3.7,door);box(gold,-.18,2.1,0,.08,4.4,3.9,door);
 mesh('gem',ruby,-.24,2.1,0,.08,.38,.38,door);
 // The marker is a seal in the doorway; names are handled by compact gameplay UI.
 k.batch();
 let dead=false;
 return {group,thronePosition:{x:cx,y:0,z:tz},update({unlocked=false,time=0,motion=true}={}){door.visible=!unlocked;hall.update({time,motion});},dispose(){if(dead)return;dead=true;throne.dispose();hall.dispose();k.dispose();}};
}
