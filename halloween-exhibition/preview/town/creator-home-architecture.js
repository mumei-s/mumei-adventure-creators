import * as THREE from '../maze/vendor/three.module.js';

const TAU=Math.PI*2;
function polygon(points){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return shape;}
function ellipse(x,y,rx,ry=rx){const shape=new THREE.Shape();shape.absellipse(x,y,rx,ry,0,TAU,false,0);return shape;}
function star(x,y,r,points=5){return polygon(Array.from({length:points*2},(_,i)=>{const a=i*Math.PI/points+Math.PI/2,s=i%2?r*.42:r;return[x+Math.cos(a)*s,y+Math.sin(a)*s];}));}
function stroke(x1,y1,x2,y2,width){const a=Math.atan2(y2-y1,x2-x1),dx=Math.sin(a)*width/2,dy=Math.cos(a)*width/2;return polygon([[x1-dx,y1+dy],[x2-dx,y2+dy],[x2+dx,y2-dy],[x1+dx,y1-dy]]);}
function hole(shape,x,y,rx,ry=rx){const path=new THREE.Path();path.absellipse(x,y,rx,ry,0,TAU,true,0);shape.holes.push(path);return shape;}
function cat(x=0,y=0,scale=1){return polygon([[-.3,-.21],[-.38,.3],[-.12,.2],[0,.24],[.14,.2],[.38,.3],[.3,-.21],[0,-.32]].map(([a,b])=>[x+a*scale,y+b*scale]));}

/** A raised, recognizable doorway emblem. Each creator's motif has its own silhouette. */
export function creatorHomeEmblemGeometry(motif='lantern'){
  let shapes;
  switch(motif){
    case 'bat-wing':shapes=[polygon([[-.55,.23],[-.28,.05],[-.13,.24],[0,.15],[.13,.24],[.28,.05],[.55,.23],[.44,-.21],[.2,-.1],[0,-.32],[-.2,-.1],[-.44,-.21]])];break;
    case 'wave-star':shapes=[star(.24,.2,.22),...Array.from({length:3},(_,i)=>stroke(-.5+i*.29,-.12+(i%2)*.12,-.21+i*.29,-.12+((i+1)%2)*.12,.09)),stroke(-.44,-.31,.38,-.31,.06)];break;
    case 'candy':shapes=[ellipse(0,0,.24,.3),polygon([[-.21,0],[-.5,.24],[-.5,-.24]]),polygon([[.21,0],[.5,-.24],[.5,.24]])];break;
    case 'open-book':shapes=[polygon([[-.48,.26],[-.08,.18],[-.03,.1],[-.03,-.32],[-.12,-.24],[-.48,-.16]]),polygon([[.48,.26],[.08,.18],[.03,.1],[.03,-.32],[.12,-.24],[.48,-.16]])];break;
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
  const source=building.homePalette||{},bucket=building.id;
  return Object.fromEntries([['wall',materials.wall,source.wall||'#d0c1a3'],['roof',materials.roof,source.roof||'#53667a'],['trim',materials.woodLight,source.trim||'#a18058']].map(([role,base,color])=>{
    const material=base.clone();material.color.set(color);material.name=(role==='trim'?'wood':role)+'-creator-home-'+building.creatorId;material.userData.fadeBucket=bucket;resources.add(material);return[role,material];
  }));
}

function nameplate(building,b,materials,resources,makeCanvas,x,y,z,bucket){
  b.box(x,y,z,2.22,.57,.12,materials.wood,0,bucket);b.box(x,y,z+.075,2.1,.46,.045,materials.paper,0,bucket);
  if(!makeCanvas)return;
  const canvas=makeCanvas(256,64),c=canvas?.getContext?.('2d');if(typeof c?.fillText!=='function')return;
  c.fillStyle='#efe2bd';c.fillRect(0,0,256,64);c.fillStyle='#43372e';c.textAlign='center';c.textBaseline='middle';
  const fit=(text,base,max)=>{c.font=`600 ${base}px system-ui,sans-serif`;if(c.measureText){const length=c.measureText(text).width;if(length>max)c.font=`600 ${Math.max(10,base*max/length)}px system-ui,sans-serif`;}return text;};
  c.fillText(fit(building.creatorName||building.creatorId||'',23,242),128,21);c.fillText(fit(building.homeLabel||building.label||'',16,242),128,47);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;resources.add(texture);
  const material=new THREE.MeshBasicMaterial({map:texture});material.name='creator-home-nameplate';material.userData.fadeBucket=bucket;resources.add(material);
  const sign=b.mesh(new THREE.PlaneGeometry(2.06,.44),material,new THREE.Vector3(x,y,z+.103),bucket);sign.name='creator-home-nameplate-'+building.creatorId;sign.userData.creatorId=building.creatorId;
}

/** Individual homes share primitive buffers and keep the authored threshold clear. */
export function buildCreatorHome({building,b,materials,resources,roofGeometry,makeCanvas}){
  const {x,z,w,h}=building,cx=x+w/2,cz=z+h/2,south=z+h,bucket=building.id,m=homeMaterials(building,materials,resources),motif=building.motif||'lantern';
  const airy=['wave-star','iris-flower','three-stars','twin-stars'].includes(motif),garden=['cat-leaf','flower','hedgehog','shiba','iris-flower'].includes(motif),spires=['bat-wing','moon-cat','lion'].includes(motif),high=airy?2.92:spires?3.08:2.65,roofHeight=spires?2.05:garden?1.3:1.65,doorX=building.door?.x??cx;
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
  const roof=b.mesh(roofGeometry(w+.64,h+.62,roofHeight),m.roof,new THREE.Vector3(cx,high+.27,cz),bucket);roof.name='roof-'+building.id;
  b.box(cx,high+roofHeight+.31,cz,.18,.11,h+.78,m.trim,0,bucket);
  for(let row=1;row<6;row++)for(const side of[-1,1]){const f=row/6;b.box(cx+side*(w+.64)*.5*f,high+.3+roofHeight*(1-f),cz,.047,.045,h+.65,m.roof,0,bucket);}
  b.box(doorX,.78,south+.13,1.22,1.56,.22,m.trim,0,bucket);b.box(doorX,.75,south+.26,.98,1.5,.07,materials.wood,0,bucket);b.box(doorX+.3,.69,south+.31,.055,.075,.04,materials.gold,0,bucket);b.box(doorX,.055,south+.27,1.5,.11,.54,materials.stone,0,bucket);
  // The emblem is actual extruded geometry; it stays recognizable before any images load.
  b.box(doorX,high-.37,south+.17,1.26,.9,.12,m.trim,0,bucket);b.box(doorX,high-.37,south+.24,1.13,.77,.045,materials.dark,0,bucket);
  const emblem=b.mesh(creatorHomeEmblemGeometry(motif),materials.gold,new THREE.Vector3(doorX,high-.38,south+.28),bucket);emblem.name='creator-home-emblem-'+building.creatorId;emblem.userData.creatorId=building.creatorId;emblem.userData.motif=motif;
  for(const wx of[x+w*.18,x+w*.82]){
    b.box(wx,1.43,south+.14,1.05,1.05,.19,m.trim,0,bucket);b.box(wx,1.43,south+.25,.86,.86,.035,materials.glass,0,bucket);b.box(wx,1.43,south+.29,.055,.89,.03,m.trim,0,bucket);b.box(wx,1.43,south+.29,.89,.055,.03,m.trim,0,bucket);b.box(wx,.9,south+.24,1.18,.12,.4,m.trim,0,bucket);
    // Window boxes keep greenery beside the door rather than across the walking line.
    b.box(wx,.75,south+.21,1.07,.23,.48,m.trim,0,bucket);
    for(let n=0;n<3;n++)b.ball(wx-.31+n*.31,.97,south+.25,.2,.17,.17,garden?materials.leafLight:materials.leaf,bucket);
    if(garden||motif==='candy')for(let n=0;n<4;n++)b.ball(wx-.36+n*.24,1.1,south+.29,.085,.07,.075,motif==='candy'?materials.paper:materials.flower,bucket);
  }
  nameplate(building,b,materials,resources,makeCanvas,x+w*.2,2.19,south+.31,bucket);
  const chimneyX=x+w*.79,chimneyZ=z+h*.3;b.box(chimneyX,high+roofHeight*.55,chimneyZ,.43,1.34,.49,materials.stone,0,bucket);b.box(chimneyX,high+roofHeight*.55+.7,chimneyZ,.58,.12,.62,m.trim,0,bucket);
  if(spires){const tx=x+.62,tz=z+.68;b.round(tx,high*.56,tz,.58,high+.25,m.wall,bucket);b.round(tx,high+.25,tz,.68,.13,m.trim,bucket);b.peak(tx,high+1.26,tz,.8,1.98,m.roof,bucket);b.ball(tx,high+2.3,tz,.075,.09,.075,materials.gold,bucket);}
  else if(airy){const skylight=b.mesh(new THREE.BoxGeometry(1.05,.08,1.35),materials.glass,new THREE.Vector3(cx+w*.24,high+roofHeight*.55+.14,cz),bucket);skylight.rotation.z=-Math.atan(roofHeight/((w+.64)/2));skylight.name='creator-home-skylight-'+building.creatorId;}
  else {b.box(x+.7,high+roofHeight*.54,cz,.62,.53,.66,m.wall,0,bucket);b.peak(x+.7,high+roofHeight*.54+.63,cz,.58,.75,m.roof,bucket);}
  return {id:building.id,creatorId:building.creatorId,motif,footprint:{x,z,w,h},door:{...building.door},height:high+Math.max(roofHeight,spires?2.4:1.9)+.35,bucket};
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
