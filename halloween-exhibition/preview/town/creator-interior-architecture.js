import * as THREE from '../maze/vendor/three.module.js';
import {creatorHomeEmblemGeometry} from './creator-home-architecture.js?v=20261019-rooms1';
import {creatorInteriorPalette} from './creator-interior-painter.js?v=20261019-rooms1';

export function creatorInteriorMaterials(map,materials,resources){
 const palette=creatorInteriorPalette(map),m={};
 for(const [key,source,color]of[['wall','wall',palette.wall],['parquet','parquet',palette.floor],['wood','wood',palette.wood],['accent','carpet',palette.accent],['trim','gold',palette.trim],['paper','paper',palette.paper],['glass','glass',palette.glass]]){
  const material=materials[source].clone();material.color.set(color);material.name='creator-room-'+key+'-'+map.creatorHome.creatorId;material.roughness=key==='glass'?.28:.83;
  if(key==='glass'){material.emissive.set(palette.trim);material.emissiveIntensity=.2;}resources.add(material);m[key]=material;
 }
 return m;
}
function plaque({b,materials,resources,makeCanvas,label,sublabel,x,y,z,width=4.2,height=.8,name='creator-room-plaque'}){
 b.box(x,y,z,width+.14,height+.14,.13,materials.wood);const cv=makeCanvas?.(512,128),c=cv?.getContext?.('2d');
 if(typeof c?.fillText!=='function'){b.box(x,y,z+.08,width,height,.04,materials.accent||materials.dark);return null;}
 c.fillStyle='#163840';c.fillRect(0,0,512,128);c.strokeStyle='#e5ca89';c.lineWidth=4;c.strokeRect?.(5,5,502,118);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff0c5';
 const fit=(text,size)=>{c.font=`600 ${size}px "Yu Gothic",sans-serif`;const measured=c.measureText?.(String(text)).width||0;if(measured>480)c.font=`600 ${Math.max(14,size*480/measured)}px "Yu Gothic",sans-serif`;return String(text||'');};
 c.fillText(fit(label,36),256,47,480);c.fillStyle='#cfdfd3';c.fillText(fit(sublabel,23),256,94,480);
 const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;resources.add(texture);
 const material=new THREE.MeshBasicMaterial({map:texture});resources.add(material);const sign=b.mesh(new THREE.PlaneGeometry(width,height),material,new THREE.Vector3(x,y,z+.085));sign.name=name;return sign;
}
function emblem({b,resources,material,motif,x,y,z,size=.7,name='creator-room-art'}){const item=b.mesh(creatorHomeEmblemGeometry(motif),material,new THREE.Vector3(x,y,z));item.name=name;item.scale.setScalar(size);return item;}
function plant(b,materials,m,x,z,scale=1,flowers=false){
 b.round(x,.19*scale,z,.22*scale,.38*scale,m.accent);for(let n=0;n<6;n++){const a=n*2.4,xx=x+Math.sin(a)*.3*scale,zz=z+Math.cos(a)*.23*scale,yy=(.6+n%3*.18)*scale;b.round(xx,yy*.55,zz,.025*scale,yy,materials.leaf);b.ball(xx,yy,zz,.23*scale,.12*scale,.2*scale,n%2?materials.leafLight:materials.leaf);if(flowers){for(let j=0;j<5;j++){const q=j*Math.PI*2/5;b.ball(xx+Math.cos(q)*.08*scale,yy+.08*scale,zz+Math.sin(q)*.08*scale,.07*scale,.035*scale,.07*scale,m.paper);}b.ball(xx,yy+.1*scale,zz,.04*scale,.04*scale,.04*scale,m.trim);}}
}
/** Cutaway walls, a named workroom and motif art remain readable from above. */
export function buildCreatorInteriorShell({map,b,materials,resources,makeCanvas,m}){
 const width=map.width,depth=map.height,home=map.creatorHome,cx=width/2;
 b.box(cx,1.35,.5,width-1,2.7,.27,m.wall);b.box(.5,.62,depth/2,.25,1.24,depth-1,m.wall);b.box(width-.5,.62,depth/2,.25,1.24,depth-1,m.wall);
 for(const y of[.18,.7]){b.box(cx,y,.66,width-1,.09,.08,m.trim);for(const x of[.66,width-.66])b.box(x,y,depth/2,.09,.09,depth-1,m.trim);}
 for(let x=1.2;x<width-1;x+=1.25)b.box(x,.45,.67,.045,.42,.035,m.wood);
 for(const xx of[width*.22,width*.78]){
  b.box(xx,1.73,.68,1.62,1.65,.16,m.wood);b.box(xx,1.74,.79,1.44,1.43,.06,m.glass);
  b.box(xx,1.74,.84,.055,1.43,.055,m.wood);b.box(xx,1.74,.84,1.44,.055,.055,m.wood);b.box(xx,.96,.84,1.82,.13,.36,m.trim);
  for(const side of[-1,1]){b.box(xx+side*.95,1.81,.88,.33,1.66,.17,m.accent);b.box(xx+side*.95,1.44,.98,.35,.09,.06,m.trim);}
 }
 plaque({b,materials:{...materials,...m},resources,makeCanvas,label:home.creatorName,sublabel:map.roomLabel||home.homeLabel,x:cx,y:2.03,z:.71,width:Math.min(5.6,width*.36),height:.94,name:'creator-room-name-'+home.creatorId});
 for(const x of[1.6,width-1.6]){b.box(x,1.75,.73,1.04,1.2,.12,m.trim);b.box(x,1.75,.82,.89,1.04,.05,m.accent);emblem({b,resources,material:m.paper,motif:home.motif,x,y:1.75,z:.87,size:.72});}
 const rugW=width*.4,rugD=depth*.31,rugZ=depth*(.47+.31/2);b.box(cx,.014,rugZ,rugW,.028,rugD,m.accent);
 for(const side of[-1,1]){b.box(cx+side*(rugW/2-.12),.033,rugZ,.045,.012,rugD-.2,m.trim);b.box(cx,.033,rugZ+side*(rugD/2-.12),rugW-.2,.012,.045,m.trim);}
 const medallion=emblem({b,resources,material:m.trim,motif:home.motif,x:cx,y:.04,z:rugZ,size:Math.min(rugW,rugD)*.44,name:'creator-room-rug-'+home.creatorId});medallion.rotation.x=-Math.PI/2;
 for(let z=1;z<depth-1;z+=.65)for(let x=1;x<width-1;x+=2.2)b.box(x+(Math.floor(z/.65)%2)*.9,.007,z,2.13,.008,.018,m.wood);
 // Exit has a ground mat rather than a wall across the controllable doorway.
 const exit=map.portals?.[0];if(exit){b.box(exit.x,.025,exit.z,1.7,.035,.85,m.wood);b.box(exit.x,.048,exit.z,1.5,.014,.66,m.trim);}
 return {creatorId:home.creatorId,theme:home.homeTheme,motif:home.motif,roomLabel:map.roomLabel,palette:map.interiorPalette,exit:exit?{x:exit.x,z:exit.z}:null};
}

export function buildCreatorFurniture({map,f,b,materials,resources,m}){
 const x=f.x,z=f.z,w=f.w||1,d=f.h||1,cx=x+w/2,cz=z+d/2,k=f.kind,accent=f.color?(()=>{const mat=m.accent.clone();mat.color.set(f.color);resources.add(mat);return mat;})():m.accent;
 const box=(xx,y,zz,ww,hh,dd,mat=m.wood,turn=0)=>b.box(xx,y,zz,ww,hh,dd,mat,turn),ball=(xx,y,zz,ww,hh,dd,mat=m.accent)=>b.ball(xx,y,zz,ww,hh,dd,mat);
 const table=(height=.95)=>{for(const sx of[-1,1])for(const sz of[-1,1])box(cx+sx*(w/2-.13),height/2,cz+sz*(d/2-.13),.12,height,.12);box(cx,height,cz,w+.13,.14,d+.13,m.trim);box(cx,height-.05,cz,w+.16,.11,d+.16,m.wood);};
 if(['bookshelf','shelf','display-case'].includes(k)){
  const rows=k==='bookshelf'?4:2,high=k==='bookshelf'?2.3:1.35;box(cx,high/2,cz,w,high,d,m.wood);box(cx,high/2,z+d+.035,w-.12,high-.13,.05,accent);
  for(let row=0;row<rows;row++){
   const yy=.12+(row+1)*(high-.2)/rows;box(cx,yy,z+d+.08,w+.07,.08,.32,m.trim);
   if(k==='bookshelf'){const count=Math.max(4,Math.floor(w/.24));for(let n=0;n<count;n++)box(x+.17+n*(w-.26)/count,yy+.18,z+d+.09,(w-.3)/count-.035,.25+(n%3)*.055,.23,[accent,m.trim,materials.bookTeal,materials.bookRed][n%4]);}
   else for(let n=0;n<3;n++){const xx=x+w*(.19+n*.31);if(map.creatorHome.motif==='bread-loaf'){ball(xx,yy+.15,z+d+.09,.15,.09,.1,materials.bookGold);for(const q of[-.06,.05])box(xx+q,yy+.225,z+d+.1,.02,.015,.07,m.paper,-.25);}else{box(xx,yy+.24,z+d+.1,.45,.47,.06,m.trim);box(xx,yy+.24,z+d+.15,.37,.39,.035,accent);emblem({b,resources,material:m.paper,motif:map.creatorHome.motif,x:xx,y:yy+.24,z:z+d+.18,size:.26});}}
  }
 }else if(['sofa','chair','bed','pet-bed'].includes(k)){
  const pet=k==='pet-bed';box(cx,.22,cz,w,.32,d,m.wood);box(cx,.47,cz,w-.1,.3,d-.1,accent);
  if(!pet){box(cx,.87,z+.11,w,.88,.23,accent);for(const side of[-1,1])box(cx+side*(w/2-.09),.65,cz,.22,.6,d,accent);for(const xx of[cx-w*.25,cx+w*.25])box(xx,.67,z+d*.35,w*.25,.2,d*.33,m.paper);}
  else{ball(cx,.65,cz,.36,.16,.25,accent);ball(cx+.24,.73,cz-.13,.19,.17,.17,accent);for(const side of[-1,1])b.peak(cx+.24+side*.12,.91,cz-.13,.075,.19,accent);}
 }else if(k==='plant'||k==='flower')plant(b,materials,m,cx,cz,Math.min(w,d)*1.4,k==='flower'||['flower','iris-flower'].includes(map.creatorHome.motif));
 else if(k==='easel'){
  for(const side of[-1,1])box(cx+side*w*.25,1.05,cz,.09,2.1,.13,m.wood,side*.11);box(cx,.8,cz+.35,w*.8,.09,.16,m.trim);box(cx,1.4,cz,w*.9,1.33,.1,m.trim);box(cx,1.4,cz+.07,w*.78,1.19,.03,m.paper);emblem({b,resources,material:accent,motif:map.creatorHome.motif,x:cx,y:1.42,z:cz+.1,size:w*.6});box(cx,.73,cz+.13,w+.13,.1,.3,m.wood);
 }else if(k==='instrument'||k==='piano'){
  table(.77);box(cx,1.04,cz,w,.48,d,accent);box(cx,1.35,z+.12,w,.14,.22,m.trim);box(cx,.99,z+d*.81,w+.1,.08,d*.36,m.paper);
  for(let n=0;n<14;n++){const xx=x+n*w/14;box(xx,.999,z+d*.85,.012,.018,d*.33,m.wood);if(n%7!==2&&n%7!==6)box(xx+w/30,1.035,z+d*.76,w/30,.05,d*.17,m.wood);}
  box(cx,1.61,z+d*.3,w*.47,.45,.04,m.wood);box(cx,1.62,z+d*.33,w*.42,.39,.02,m.paper);
 }else if(['monitor','video','camera'].includes(k)){
  table();box(cx,1.55,z+d*.37,w*.77,.87,.13,m.wood);box(cx,1.55,z+d*.37+.08,w*.69,.71,.025,accent);emblem({b,resources,material:m.trim,motif:map.creatorHome.motif,x:cx,y:1.55,z:z+d*.37+.11,size:w*.27});box(cx,1.04,z+d*.37,.17,.3,.16);box(cx,.98,z+d*.77,w*.62,.045,.22,m.paper);
  for(const side of[-1,1]){const xx=cx+side*w*.43;box(xx,1.23,cz,.26,.52,.32,m.wood);for(const yy of[1.13,1.35])ball(xx,yy,cz+.17,.07,.07,.025,m.trim);}
 }else if(k==='oven'||k==='bakery'){
  box(cx,.76,cz,w,1.5,d,m.wall);box(cx,.73,z+d+.04,w*.77,.8,.1,m.wood);box(cx,.74,z+d+.11,w*.65,.63,.04,materials.glass);box(cx,.3,z+d+.19,w*.86,.1,.25,m.wood);box(x+w*.77,1.9,z+.28,w*.2,.85,d*.25,m.wood);
  for(let n=0;n<3;n++)ball(x+w*(.25+n*.25),.57,z+d+.16,w*.09,.06,.055,materials.bookGold);
 }else if(k==='loom'||k==='knit'){
  for(const xx of[x+.1,x+w-.1])box(xx,1.03,cz,.15,2.06,.18);for(const yy of[.35,1.85])box(cx,yy,cz,w+.1,.13,.2,m.trim);
  for(let n=0;n<12;n++)box(x+.2+n*(w-.4)/11,1.1,cz+.1,.018,1.4,.025,m.paper);for(let n=0;n<15;n++)box(cx,.65+n*.047,cz+.14,w-.3,.031,.025,n%2?accent:m.trim);
  for(const side of[-1,1])ball(cx+side*w*.29,.15,cz+.35,.2,.18,.2,side<0?accent:m.trim);
 }else if(k==='telescope'||k==='globe'){
  for(const turn of[0,Math.PI*2/3,Math.PI*4/3])box(cx+Math.cos(turn)*.23,.45,cz+Math.sin(turn)*.23,.07,.9,.07,m.wood,.2);
  box(cx,1.05,cz,.12,1,.12,m.trim);const geometry=new THREE.CylinderGeometry(.22,.15,w*.83,14),scope=b.mesh(geometry,accent,new THREE.Vector3(cx,1.55,cz));scope.rotation.z=-.75;scope.rotation.x=.4;scope.name='creator-room-telescope';
 }else{
  table();box(x+w*.29,1.04,z+d*.6,w*.35,.03,d*.4,m.paper);for(let n=0;n<4;n++)box(x+w*.29,1.06,z+d*(.47+n*.07),w*.27,.01,.012,m.wood);
  b.round(x+w*.76,1.16,z+d*.44,.14,.31,accent);for(let n=0;n<5;n++)box(x+w*(.7+n*.025),1.44,z+d*.44,.025,.38,.025,m.trim,(n-2)*.1);
  box(cx,.48,z+d+.42,w*.35,.12,.4,accent);box(cx,.78,z+d+.58,w*.36,.62,.1,accent);
 }
 return {id:f.id,kind:k,x,z,w,h:d,creatorId:map.creatorHome.creatorId};
}

export function buildCreatorRoute({map,b,materials,resources,makeCanvas}){
 const path=map.routePath||[],signs=map.routeSigns||[],m=materials;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],t=path[i],dx=t.x-a.x,dz=t.z-a.z,length=Math.hypot(dx,dz),angle=Math.atan2(dz,dx);
  for(let d=.4;d<length;d+=1.05){const f=d/length,x=a.x+dx*f,z=a.z+dz*f;for(const side of[-1,1])b.box(x+Math.sin(angle)*side*.075,.034,z-Math.cos(angle)*side*.075,.27,.025,.075,m.gold,side*.65-angle);}
 }
 for(const sign of signs){
  if(sign.openPath){
   b.box(sign.x,.65,sign.z,.1,1.3,.1,m.wood);
   plaque({b,materials:m,resources,makeCanvas,label:sign.label,sublabel:sign.sublabel,x:sign.x,y:1.35,z:sign.z,width:2.8,height:.65,name:'creator-route-sign-'+sign.id});
   continue;
  }
  for(const side of[-1,1]){b.box(sign.x+side*1.35,.94,sign.z,.11,1.88,.14,m.wood);b.box(sign.x+side*1.35,.06,sign.z,.37,.12,.4,m.stone);b.ball(sign.x+side*1.35,2.43,sign.z,.11,.11,.11,m.glass);}
  plaque({b,materials:m,resources,makeCanvas,label:sign.label||'参加者の家・アトリエ',sublabel:sign.sublabel||'光る道から、作者の家へ →',x:sign.x,y:2.03,z:sign.z,width:4.1,height:1.02,name:'creator-route-sign-'+sign.id});
 }
 return signs.map(sign=>({id:sign.id,x:sign.x,z:sign.z,label:sign.label}));
}
