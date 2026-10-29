import {CELL,OVERLORD_ROOM} from './maze-model.js?v=20261028-overlord1';

// Native, volumetric scenery. Shared low-poly primitives, no textures or network
// loads, and two non-shadow-casting lights keep the chamber mobile-friendly.
function kit(THREE){
 const group=new THREE.Group(),resources=new Set();
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.65,...extra});resources.add(m);return m;};
 const stone=material('#211e2c'),black=material('#100f19',{metalness:.35}),gold=material('#c79b47',{metalness:.7,roughness:.32}),red=material('#700e2b'),glow=material('#ff6831',{emissive:'#ff471a',emissiveIntensity:1.6}),moon=material('#e3314b',{emissive:'#c51d38',emissiveIntensity:.9});
 const geos={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,12,8),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,8)};Object.values(geos).forEach(g=>resources.add(g));
 const mesh=(type,mat,x,y,z,sx,sy,sz,parent=group)=>{const o=new THREE.Mesh(geos[type],mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;};
 const box=(mat,x,y,z,w,h,d,parent)=>mesh('box',mat,x,y,z,w,h,d,parent);
 return {group,stone,black,gold,red,glow,moon,mesh,box,dispose(){for(const r of resources)r.dispose();group.removeFromParent();}};
}
export function createOverlordThrone(THREE){
 const k=kit(THREE),{group,box,mesh,black,gold,red}=k;group.name='overlord-volumetric-throne';
 // Seat at .75 matches the articulated boss seated pose; all feet stay at y=0.
 box(black,0,.18,0,3.5,.36,2.65);box(gold,0,.37,0,3.28,.06,2.4);
 box(black,0,.54,0,2.35,.32,1.75);box(red,0,.74,0,1.8,.16,1.32);
 box(black,0,1.9,-.63,2.35,2.9,.4);box(red,0,1.9,-.39,1.76,2.1,.12);
 for(const x of[-1.1,1.1]){box(gold,x,1.9,-.61,.13,3.25,.55);mesh('cone',gold,x,3.72,-.61,.24,.65,.24);box(black,x,1.04,.22,.35,.3,1.75);box(gold,x,1.22,.22,.38,.08,1.8);mesh('sphere',gold,x,1.32,1,.18,.18,.18);box(black,x,.56,.78,.24,1,.24);}
 for(let i=-2;i<=2;i++){const y=3.1+(2-Math.abs(i))*.24;box(gold,i*.37,y,-.62,.13,.7,.25);mesh('cone',gold,i*.37,y+.48,-.62,.16,.35,.16);}
 const gem=mesh('sphere',k.moon,0,2.8,-.28,.23,.34,.13);gem.rotation.z=Math.PI/4;
 for(const side of[-1,1]){const wing=box(gold,side*.5,2.25,-.28,.07,1.0,.07);wing.rotation.z=side*.55;}
 return {...k,seatHeight:.75};
}
export function createOverlordRoom(THREE){
 const k=kit(THREE),{group,box,mesh,stone,black,gold,red,glow,moon}=k;group.name='floor-666-nameless-overlord-castle';
 const cx=23*CELL,nz=.5*CELL,sz=11.5*CELL;
 // A narrow astral bridge makes “666” a magical destination, not 666 generated floors.
 box(black,15*CELL,.06,3*CELL,28,.08,3.94);
 for(const zz of[3*CELL-1.65,3*CELL+1.65])box(moon,15*CELL,.12,zz,27,.04,.035);
 for(const xx of[12.5,14.5,16.5]){
  for(const side of[-1,1]){box(black,xx*CELL,2.4,3*CELL+side*1.9,.26,4.8,.16);box(gold,xx*CELL,2.4,3*CELL+side*1.8,.05,4.8,.06);}
  box(black,xx*CELL,4.8,3*CELL,.28,.22,3.95);
  mesh('sphere',moon,xx*CELL,4.8,3*CELL,.12,.24,.24);
 }
 // Black marble overlay over the ordinary map floor: gold seams, broad aisle.
 box(black,cx,.018,6*CELL,36,.03,44);
 for(let z=1;z<=11;z++)for(let x=19;x<=27;x++){box((x+z)%2?stone:black,x*CELL,.04,z*CELL,3.94,.03,3.94);}
 box(gold,cx,.075,6.7*CELL,5.4,.03,33);box(red,cx,.099,6.7*CELL,5.1,.03,33);
 for(const x of[cx-2.35,cx+2.35])box(gold,x,.12,6.7*CELL,.035,.025,32.4);
 // Towering northern reredos, crimson drapes and a blood moon above the throne.
 box(black,cx,4,nz+.1,35.6,8,.25);
 for(const x of[19.2,21,25,26.8]){box(gold,x*CELL,4,nz+.3,.14,7.9,.14);box(red,x*CELL,4.3,nz+.5,3,6.9,.14);mesh('cone',gold,x*CELL,.6,nz+.5,1.6,.9,.13);}
 mesh('sphere',moon,cx,5.8,nz+.7,1.6,1.6,.2);
 for(const x of[-1.9,0,1.9])box(black,cx+x,5.8,nz+.95,.08,3.8,.1);
 box(gold,cx,3.7,nz+.85,4.2,.12,.18);
 // Six substantial fluted pillar bays and pointed ribs, away from all paths.
 for(const z of[4,7,10])for(const x of[19.6,26.4]){
  box(black,x*CELL,.22,z*CELL,1.65,.44,1.65);mesh('cylinder',stone,x*CELL,3.3,z*CELL,.59,6.2,.59);
  for(const yy of[.5,5.8,6.4])box(gold,x*CELL,yy,z*CELL,1.5,.16,1.5);
  mesh('cone',black,x*CELL,7.05,z*CELL,.9,1.3,.9);
  const inward=x<23?1:-1,beam=box(gold,x*CELL+inward*2,6.9,z*CELL,4.4,.13,.16);beam.rotation.z=inward*.3;
 }
 // Pumpkin lanterns sit on the outer columns' bases, not in the aisle.
 for(const z of[4,7,10])for(const x of[19.6,26.4]){
  const zz=z*CELL+.15,xx=x*CELL;mesh('sphere',k.red,xx,1,zz,.59,.53,.56);
  for(const d of[-.28,0,.28])mesh('sphere',glow,xx+d,1,zz+.14,.26,.45,.43);
  for(const dx of[-.2,.2]){const eye=mesh('cone',black,xx+dx,1.16,zz+.58,.13,.18,.04);eye.rotation.z=Math.PI;}
  box(black,xx,.85,zz+.59,.43,.07,.04);box(gold,xx,1.6,zz,.1,.25,.1);
 }
 const throne=createOverlordThrone(THREE);throne.group.position.set(OVERLORD_ROOM.throne.x*CELL,0,OVERLORD_ROOM.throne.z*CELL);group.add(throne.group);
 // Sealed astral door across the one-tile passage; opened leaves retract clear.
 const door=new THREE.Group();door.position.set(18*CELL,0,3*CELL);group.add(door);
 box(black,0,2.1,0,.3,4.2,3.7,door);box(gold,-.18,2.1,0,.08,4.4,3.9,door);
 mesh('sphere',moon,-.3,2.1,0,.12,.75,.75,door);
 const light=new THREE.PointLight('#ffb66b',1.25,33,2);light.position.set(cx,5,5*CELL);group.add(light);
 const redLight=new THREE.PointLight('#e52a55',.85,20,2);redLight.position.set(cx,5,nz+3);group.add(redLight);
 return {group,thronePosition:{x:cx,y:0,z:OVERLORD_ROOM.throne.z*CELL},update({unlocked=false,time=0,motion=true}={}){door.visible=!unlocked;redLight.intensity=.85+(motion?Math.sin(time*.8)*.06:0);},dispose(){throne.dispose();k.dispose();}};
}
