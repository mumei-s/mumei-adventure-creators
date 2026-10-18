import {createExhibitResources} from './exhibit-resources.js?v=20261019-audit1';
import {normalizeCameraDistance,mazeCameraZoom} from '../camera-distance.js?v=20261019-journey1';
import {mazeWideCamera} from '../camera-distance.js?v=20261019-journey1';
import {monsterSprite,spriteTextureUV} from './monster-motion.js?v=20261019-unified1';
import {ART_FILES,ART_BOUNDS,ART_ANCHORS,PALACE_ART,playerPose} from './rpg-art.js?v=20261019-unified1';
import * as THREE from './vendor/three.module.js';
import { MAP, CELL, FEATURES, toWorld, blocked } from './maze-model.js?v=20261014-adventure2';
import { NIGHT_LIGHTING } from './lighting-model.js?v=20261019-interior1';
import { ALL_MONSTERS as MONSTERS, monsterAvailable, monsterPose } from './encounter-model.js?v=20261016-living1';

// All architectural objects live in world space. Camera motion, collision and
// interaction remain in the controller, making the gallery usable with keys,
// touch controls, and pointer-lock alike.
export function createWorld({ canvas, onReady, art } = {}) {
  const compactViewport=Math.min(canvas.clientWidth||window.innerWidth,canvas.clientHeight||window.innerHeight)<720;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactViewport?1.35:1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#141623');
  scene.fog = new THREE.FogExp2('#202233', Math.min(.024,NIGHT_LIGHTING.fog));
  const camera = new THREE.PerspectiveCamera(69, 1, .075, 115);
  camera.rotation.order = 'YXZ';
  const resources = new Set(), animated = [], lamps = [], lanternSources = [], lanternMaterials = new Map(), exhibitGroup = new THREE.Group();
  scene.add(exhibitGroup);
  const map = MAP.map(row => typeof row === 'string' ? [...row] : row);
  const cols = Math.max(...map.map(r => r.length)), rows = map.length;
  const walk = (x,z) => z >= 0 && z < rows && x >= 0 && x < (map[z]?.length || 0) && !['#',1].includes(map[z][x]);
  const mat = (color, extra={}) => { const m = new THREE.MeshStandardMaterial({color, roughness:.82, ...extra}); resources.add(m); return m; };
  const gold = mat('#a37e40', {metalness:.7, roughness:.32});
  const brass = mat('#d9b775', {metalness:.72, roughness:.25});
  const dark = mat('#3a3035');
  const wall = [mat('#4a4d61'), mat('#526c6c'), mat('#636878')];
  const trim = [mat('#95a5b6'), gold, mat('#8faead')];
  const matFloorLight=mat('#66787e');
  const floor = [mat('#5b6379'), mat('#78918a'), mat('#8a929a')];
  const zone = x => x < 4.5 ? 0 : x > 12.5 ? 2 : 1;
  const mesh = (geometry, material, x=0,y=0,z=0, parent=scene) => {resources.add(geometry); const m=new THREE.Mesh(geometry,material); m.position.set(x,y,z); parent.add(m); return m;};
  const boxGeo = new THREE.BoxGeometry(1,1,1); resources.add(boxGeo);
  const box = (w,h,d,x,y,z,m=gold,parent=scene) => {const o=new THREE.Mesh(boxGeo,m);o.scale.set(w,h,d);o.position.set(x,y,z);parent.add(o);return o;};
  const textTexture = (title, subtitle, color='#e9cb8e', bg='#101e23') => {
    const c=document.createElement('canvas'); c.width=1024;c.height=512; const g=c.getContext('2d');
    g.fillStyle=bg;g.fillRect(0,0,1024,512);g.strokeStyle=color;g.lineWidth=2;g.strokeRect(28,28,968,456);
    g.textAlign='center';g.fillStyle=color;g.font='24px sans-serif';g.fillText('THE HAUNTED ARCHIVE',512,111);
    g.font=`${title.length>23?46:60}px Georgia, serif`;g.fillText(title,512,252,925);
    g.font='22px sans-serif';g.fillStyle='#b1c2bd';g.fillText(subtitle||'',512,336,900);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;resources.add(t);return t;
  };
  const sign = (title, sub, x,y,z, ry=0, width=2.6, parent=scene) => {
    const texture=textTexture(title,sub);const material=new THREE.MeshBasicMaterial({map:texture});resources.add(material);
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;parent.add(g);
    box(width+.14,width/2+.14,.095,0,0,-.065,gold,g);
    mesh(new THREE.PlaneGeometry(width,width/2),material,0,0,0,g);return g;
  };
  // Original painted surfaces, shared with the 2D palace. Materials remain local and deterministic.
  const floorPlaneGeo=new THREE.PlaneGeometry(CELL,CELL);resources.add(floorPlaneGeo);
  const surfaceLoader=new THREE.TextureLoader(),surfaceMaterials={parquet:mat('#b58a60',{roughness:.72}),limestone:mat('#c5c5ae',{roughness:.86}),marble:mat('#72677f',{roughness:.46})};
  function loadSceneTexture(key,file,install){const image=art?.images?.[key];if(image){const texture=new THREE.Texture(image.image||image);texture.needsUpdate=true;install(texture);}else surfaceLoader.load(new URL(`./assets/rpg/palace/${file}`,import.meta.url).href,texture=>{if(disposed){texture.dispose();return;}install(texture);},undefined,()=>{});}
  function loadSurface(key,file,material){loadSceneTexture(key,file,t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());resources.add(t);material.map=t;material.needsUpdate=true;});}
  for(const [key,material]of Object.entries(surfaceMaterials))loadSurface(key,`${key}.webp`,material);
  // Tactile plaster, fine stone joints, and walnut wainscoting replace flat box faces.
  function masonryTexture(palette){const cv=document.createElement('canvas');cv.width=512;cv.height=512;const c=cv.getContext('2d');c.fillStyle=palette[0];c.fillRect(0,0,512,512);for(let i=0;i<2200;i++){const n=(i*79)%257,x=(i*137)%512,y=(i*191)%512;c.fillStyle=n%2?'#fff8dd09':'#1520350b';c.fillRect(x,y,1+n%4,1+n%2);}for(let row=0;row<8;row++){c.strokeStyle=palette[1];c.lineWidth=2;c.beginPath();c.moveTo(0,row*64);c.lineTo(512,row*64);c.stroke();for(let col=-1;col<5;col++){const x=col*128+(row%2)*64;c.beginPath();c.moveTo(x,row*64);c.lineTo(x,row*64+64);c.stroke();}}const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;resources.add(t);return t;}
  wall[0].color.set('#887593');wall[1].color.set('#c2b394');wall[2].color.set('#bdc7bc');
  for(const [i,m]of wall.entries()){m.map=masonryTexture(i===0?['#93839d','#71647b']:i===1?['#c6b89c','#aa9d85']:['#bfcabf','#a3afa7']);m.needsUpdate=true;}
  const panelMaterials=wall.map(m=>{const material=m.clone();resources.add(material);return material;});loadSceneTexture('wallPanel','wainscot-wall.webp',t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());resources.add(t);for(const material of panelMaterials){material.map=t;material.needsUpdate=true;}});
  const walnut=mat('#5e3b27',{roughness:.68}),walnutEdge=mat('#936841',{roughness:.65}),velvet=mat('#173e46',{roughness:.97}),plumVelvet=mat('#4f2b48',{roughness:.97});
  const furniturePaper=mat('#e8d5ad'),plantLeaf=mat('#3d6541'),flowerPetal=mat('#e5d8b9'),potBronze=mat('#967242',{metalness:.4,roughness:.52});
  const bookColors=['#5e314b','#284e54','#997248','#39405c','#758063'].map(c=>mat(c,{roughness:.89}));
  const contactCv=document.createElement('canvas');contactCv.width=128;contactCv.height=128;const contactCtx=contactCv.getContext('2d'),contactGrad=contactCtx.createRadialGradient(64,64,8,64,64,64);contactGrad.addColorStop(0,'#050611aa');contactGrad.addColorStop(.48,'#05061177');contactGrad.addColorStop(1,'#05061100');contactCtx.fillStyle=contactGrad;contactCtx.fillRect(0,0,128,128);const contactTex=new THREE.CanvasTexture(contactCv);resources.add(contactTex);const contactMat=new THREE.MeshBasicMaterial({map:contactTex,transparent:true,depthWrite:false,opacity:.72});resources.add(contactMat);
  function contactShadow(x,z,w,d,parent=scene){const sh=mesh(new THREE.PlaneGeometry(w,d),contactMat,x,.012,z,parent);sh.rotation.x=-Math.PI/2;return sh;}
  function furnishingRoot(x,z,rotation=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;g.userData.staticScenery=true;scene.add(g);return g;}
  function cabinet3D(x,z,width=3.8,height=3.0,rotation=0){const g=furnishingRoot(x,z,rotation);box(width,height,.18,0,height/2,-.44,walnut,g);for(const sx of[-1,1]){box(.15,height+.2,.88,sx*(width/2-.06),height/2,0,walnutEdge,g);box(.22,.13,1,sx*(width/2-.06),.12,0,gold,g);}for(let row=0;row<4;row++){const yy=.16+row*(height-.24)/3;box(width,.12,.93,0,yy,0,walnutEdge,g);box(width,.035,.05,0,yy+.03,.49,gold,g);if(row<3)for(let n=0;n<Math.floor(width/.26)-1;n++){const bh=.46+(n*7+row*3)%5*.055,bw=.15+(n%3)*.018,b=box(bw,bh,.5,-width/2+.26+n*.26,yy+.06+bh/2,.04,bookColors[(n+row*2)%bookColors.length],g);b.rotation.z=n%6===2?.11:0;box(bw*.88,.02,.015,b.position.x,yy+.16,.305,gold,g);}}box(width+.23,.18,1.02,0,height+.04,0,walnutEdge,g);contactShadow(0,0,width+1,1.8,g);return g;}
  function readingDesk3D(x,z,rotation=0){const g=furnishingRoot(x,z,rotation);box(3,.14,1.3,0,1.3,0,walnutEdge,g);for(const sx of[-1,1])for(const sz of[-1,1])box(.13,1.25,.13,sx*1.3,.62,sz*.48,walnut,g);box(2.65,.4,.9,0,1.02,-.06,walnut,g);for(const sx of[-1,1]){box(1.12,.25,.03,sx*.68,1.04,.42,walnutEdge,g);mesh(new THREE.SphereGeometry(.055,8,6),gold,sx*.68,1.04,.47,g);}const pages=box(.9,.07,.67,-.25,1.43,0,furniturePaper,g);pages.rotation.y=.12;box(.035,.095,.7,-.25,1.45,0,gold,g);mesh(new THREE.CylinderGeometry(.13,.15,.25,8),dark,.78,1.47,.2,g);const quill=box(.025,.68,.03,.78,1.85,.2,furniturePaper,g);quill.rotation.z=-.28;contactShadow(0,0,4,2.3,g);return g;}
  function chair3D(x,z,rotation=0,long=false){const g=furnishingRoot(x,z,rotation),ww=long?2.9:1.4,vel=long?plumVelvet:velvet;box(ww,.28,1.1,0,.65,0,vel,g);box(ww,.95,.25,0,1.13,-.47,vel,g);for(const sx of[-1,1]){box(.13,1.35,.2,sx*(ww/2+.05),.94,-.47,walnutEdge,g);box(.16,.58,1.13,sx*ww/2,.98,0,walnutEdge,g);for(const sz of[-1,1])box(.12,.6,.12,sx*(ww/2-.11),.3,sz*.39,walnut,g);}for(let i=0;i<(long?6:3);i++)mesh(new THREE.SphereGeometry(.035,6,4),gold,-ww*.36+i*ww*.72/((long?6:3)-1),1.25,-.327,g);contactShadow(0,0,ww+1,2.1,g);return g;}
  function plant3D(x,z,scale=1){const g=furnishingRoot(x,z);g.scale.setScalar(scale);mesh(new THREE.CylinderGeometry(.4,.27,.75,10),potBronze,0,.38,0,g);mesh(new THREE.TorusGeometry(.39,.04,6,16),gold,0,.73,0,g).rotation.x=Math.PI/2;for(let i=0;i<11;i++){const a=i*2.4,yy=.85+(i%4)*.2,leaf=mesh(new THREE.SphereGeometry(.27,7,5),plantLeaf,Math.cos(a)*.37,yy,Math.sin(a)*.31,g);leaf.scale.set(1,.46,1.35);leaf.rotation.z=Math.sin(a)*.55;if(i%3===0)mesh(new THREE.SphereGeometry(.075,6,4),flowerPetal,Math.cos(a)*.42,yy+.1,Math.sin(a)*.34,g);}contactShadow(0,0,1.6,1.6,g);return g;}
  // All new decoration stays on room margins; the original collision model is unchanged.
  cabinet3D(24.8,44.8,4.1,3.5);cabinet3D(39.2,44.8,4.1,3.5);
  cabinet3D(22.7,26.1,3.6,2.7);cabinet3D(41.3,26.1,3.6,2.7);
  cabinet3D(23,2.4,4,4.5);cabinet3D(41,2.4,4,4.5);cabinet3D(56,30.3,3.8,2.7);cabinet3D(8,30.3,3.8,2.7);
  readingDesk3D(24,18.6);readingDesk3D(53.3,49.5);chair3D(19.2,33.5,Math.PI/2);chair3D(44.8,33.5,-Math.PI/2);chair3D(21,57.1,0,true);chair3D(43,57.1,0,true);chair3D(8,49.4,0,true);
  for(const [x,z]of[[18.8,50],[45.2,50],[18.9,14],[45.1,14],[50.8,47],[61.2,35],[2.8,39]])plant3D(x,z,1.35);
  // Low, fully walkable rugs give each room a distinct identity.
  const rugMat=new THREE.MeshStandardMaterial({color:'#cfbe99',roughness:1});resources.add(rugMat);loadSurface('carpet','carpet.webp',rugMat);
  function rug3D(x,z,w,d){const g=mesh(new THREE.PlaneGeometry(w,d),rugMat,x,.021,z);g.rotation.x=-Math.PI/2;for(const sx of[-1,1])box(.035,.016,d,x+sx*w/2,.025,z,gold);for(const sz of[-1,1])box(w,.016,.035,x,.025,z+sz*d/2,gold);return g;}
  rug3D(32,44.6,10.2,20.4);rug3D(32,12,13.8,12.4);rug3D(56,40,6.6,13.5);rug3D(8,40,6.6,13.5);rug3D(32,24,5.5,8.4);
  const windowMat=new THREE.MeshBasicMaterial({color:'#bacdea',transparent:true,alphaTest:.08,side:THREE.DoubleSide});resources.add(windowMat);
  loadSceneTexture('palaceAtlas','props-atlas.webp',texture=>{texture.colorSpace=THREE.SRGBColorSpace;const f=PALACE_ART.moonWindow;texture.repeat.set(f[2]/texture.image.width,f[3]/texture.image.height);texture.offset.set(f[0]/texture.image.width,1-(f[1]+f[3])/texture.image.height);resources.add(texture);windowMat.map=texture;windowMat.needsUpdate=true;});
  for(const [x,z,ry]of[[32,2.17,0],[18.17,36,Math.PI/2],[45.83,36,-Math.PI/2],[56,30.17,0]]){const win=mesh(new THREE.PlaneGeometry(3.1,4.6),windowMat,x,4.45,z);win.rotation.y=ry;lanternSources.push({x:x+Math.sin(ry)*1.5,y:4,z:z+Math.cos(ry)*1.5,color:'#abc9ef',intensity:6,distance:13});}
  // Floor insets, wainscoting and piers define real navigable space, not a panorama.
  const wallHeight=7.3;
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++) {
    if(!walk(x,z))continue;
    const wx=x*CELL, wz=z*CELL, zi=zone(x);
    box(CELL,.15,CELL,wx,-.12,wz,floor[zi]);
    const surface=zi===0?surfaceMaterials.marble:zi===2||z>13?surfaceMaterials.limestone:surfaceMaterials.parquet;
    const tile=mesh(floorPlaneGeo,surface,wx,-.025,wz);tile.rotation.x=-Math.PI/2;
    box(.035,.017,CELL,wx-CELL/2+.16,-.008,wz,trim[zi]);
    box(CELL,.017,.035,wx,-.008,wz-CELL/2+.16,trim[zi]);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if(walk(x+dx,z+dz))continue;
      const horizontal=!!dz, px=wx+dx*CELL/2,pz=wz+dz*CELL/2;
      box(horizontal?CELL:.22,wallHeight,horizontal?.22:CELL,px,wallHeight/2,pz,panelMaterials[zi]);
      box(horizontal?CELL:.3,1.03,horizontal?.3:CELL,px,.515,pz,zi===2?trim[2]:dark);
      box(horizontal?CELL:.37,.07,horizontal?.37:CELL,px,1.04,pz,trim[zi]);
      box(horizontal?CELL:.42,.18,horizontal?.42:CELL,px,6.98,pz,trim[zi]);
      box(horizontal?CELL:.37,.065,horizontal?.37:CELL,px,.12,pz,trim[zi]);
      for(const shift of [-.42,.42]) {
        const sx=px+(horizontal?shift*CELL:0)-dx*.18, sz=pz+(!horizontal?shift*CELL:0)-dz*.18;
        box(.22,6.8,.22,sx,3.4,sz,trim[zi]);
        box(.36,.2,.36,sx,1.15,sz,gold);box(.36,.24,.36,sx,6.55,sz,gold);
      }
      if((x+z)%3===0) {
        const lx=px-dx*.4,lz=pz-dz*.4;
        addLantern(lx,2.76,lz,zi===0?'#a78aff':zi===2?'#f1dab1':'#ffb45d',x+z);
      }
    }
    if(true) {
      const ceiling=box(CELL-.1,.12,CELL-.1,wx,7.4,wz,dark);ceiling.material=wall[zi];
      box(.07,.14,CELL,wx,7.22,wz,gold);box(CELL,.14,.07,wx,7.22,wz,gold);
    }
    // Framed portals at intervals preserve long sightlines through corridors.
    if(z%3===0 && walk(x,z-1)&&walk(x,z+1)&&!walk(x-1,z)&&!walk(x+1,z)) arch(wx,wz,0,zi);
    if(x%3===0 && walk(x-1,z)&&walk(x+1,z)&&!walk(x,z-1)&&!walk(x,z+1)) arch(wx,wz,Math.PI/2,zi);
  }
  function arch(x,z,rot,zi){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;g.userData.staticScenery=true;scene.add(g);
    for(const s of [-1,1]){box(.2,3.55,.33,s*(CELL/2-.22),1.775,0,trim[zi],g);box(.4,.18,.48,s*(CELL/2-.22),.1,0,gold,g);}
    const curve=new THREE.EllipseCurve(0,0,CELL/2-.22,1.0,0,Math.PI,false,0);
    const points=curve.getPoints(28).map(p=>new THREE.Vector3(p.x,3.5+p.y,0));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),28,.105,6,false),trim[zi],0,0,0,g);
    box(.25,.45,.42,0,4.43,0,gold,g);
  }
  function addLantern(x,y,z,color,seed=0){
    const g=new THREE.Group();g.position.set(x,y,z);g.userData.staticScenery=true;scene.add(g);
    let em=lanternMaterials.get(color);if(!em){em=mat(color,{emissive:color,emissiveIntensity:1.8,roughness:.3});lanternMaterials.set(color,em);}
    mesh(new THREE.CylinderGeometry(.16,.21,.43,6),em,0,0,0,g);
    mesh(new THREE.ConeGeometry(.27,.22,6),gold,0,.3,0,g);
    box(.035,.44,.035,0,.57,0,gold,g);
    for(let i=0;i<4;i++){let a=i*Math.PI/2;box(.025,.46,.025,Math.cos(a)*.18,0,Math.sin(a)*.18,dark,g);}
    mesh(new THREE.CylinderGeometry(.26,.16,.1,6),gold,0,-.26,0,g);
    // A small bounded pool of real lamps; all lanterns remain emissive.
    lanternSources.push({x,y:y-.1,z,color});
    if(lamps.length<(compactViewport?4:6)){const l=new THREE.PointLight(color,3.2,8.5,2);l.position.set(x,y-.1,z);scene.add(l);lamps.push(l);}
    return g;
  }
  const ambient=new THREE.HemisphereLight('#acacd4','#21122d',Math.max(.42,NIGHT_LIGHTING.ambient));scene.add(ambient);
  const moon=new THREE.DirectionalLight('#b5bbef',Math.max(.32,NIGHT_LIGHTING.moon));moon.position.set(5,12,4);scene.add(moon);
  // The hand lamp is attached to the camera, and OFF disables both its geometry
  // and beam. Independent architectural light keeps navigation readable.
  scene.add(camera);
  const heldLantern=new THREE.Group();heldLantern.name='Handheld lantern';
  heldLantern.position.set(.3,-.3,-.78);heldLantern.scale.setScalar(.24);camera.add(heldLantern);
  const lampGlass=mat('#ffe7ab',{emissive:'#ffcc76',emissiveIntensity:1.3,roughness:.3});
  mesh(new THREE.CylinderGeometry(.19,.23,.42,8),lampGlass,0,0,0,heldLantern);
  mesh(new THREE.ConeGeometry(.29,.2,8),brass,0,.3,0,heldLantern);
  mesh(new THREE.CylinderGeometry(.27,.27,.09,8),gold,0,-.27,0,heldLantern);
  mesh(new THREE.TorusGeometry(.15,.022,6,22),gold,0,.54,0,heldLantern);
  for(let n=0;n<4;n++){const a=n*Math.PI/2;box(.024,.51,.024,Math.cos(a)*.2,0,Math.sin(a)*.2,gold,heldLantern);}
  const headlamp=new THREE.SpotLight('#ffd599',NIGHT_LIGHTING.beam,24,Math.PI*.25,.55,1.2);
  headlamp.position.set(.3,-.15,-.25);camera.add(headlamp);
  const nearLamp=new THREE.PointLight('#ffc578',NIGHT_LIGHTING.nearLight,8,1.5);nearLamp.position.set(.3,-.1,-.5);camera.add(nearLamp);
  const beamTarget=new THREE.Object3D();beamTarget.position.set(0,-.2,-9);camera.add(beamTarget);headlamp.target=beamTarget;
  // Frosted high windows read as moonlight throughout the haunted chambers.
  const moonGlass=mat('#a8c2d7',{emissive:'#859fb9',emissiveIntensity:.08});
  for(const zz of [34,40,46]){
    box(.09,2.7,1.8,61.78,4.5,zz,moonGlass);
    for(const dy of [-1.45,0,1.45])box(.17,.09,2,61.68,4.5+dy,zz,trim[2]);
    box(.17,3,.08,61.67,4.5,zz,trim[2]);
  }
  lanternSources.push({x:56,y:5.9,z:40,color:'#9e9ce5',intensity:5,distance:13});
  function point(fallback){return fallback?toWorld(fallback):{x:0,z:0};}
  const gatePoint=point(FEATURES.gate), gate=new THREE.Group();gate.position.set(gatePoint.x,0,gatePoint.z);scene.add(gate);
  for(let i=-17;i<=17;i++){box(.075,3.75,.11,i*.32,1.875,0,gold,gate);mesh(new THREE.ConeGeometry(.105,.25,4),brass,i*.32,3.88,0,gate);}
  box(11.8,.11,.14,0,.62,0,gold,gate);box(11.8,.11,.14,0,2.8,0,gold,gate);
  mesh(new THREE.TorusGeometry(.36,.05,8,36),gold,0,2.03,.1,gate);
  box(.34,.36,.2,0,1.86,.1,brass,gate);
  const horrorPoint=point(FEATURES.horrorDoor),horrorDoor=new THREE.Group();horrorDoor.position.set(horrorPoint.x,0,horrorPoint.z);horrorDoor.rotation.y=Math.PI/2;scene.add(horrorDoor);
  box(3.85,4.5,.19,0,2.25,0,wall[0],horrorDoor);
  for(const sx of [-1.6,1.6])box(.13,4.5,.3,sx,2.25,.1,trim[0],horrorDoor);
  sign('BEYOND THE VEIL','Horror collection · choose to enter',0,2.5,.13,0,2.9,horrorDoor);
  // Large structural ribs and stone columns produce a true vaulted central hall.
  for(const zz of [30,38,46,54]) {
    for(const xx of [21.5,42.5]) {
      mesh(new THREE.CylinderGeometry(.39,.54,5.3,10),wall[1],xx,2.65,zz);
      mesh(new THREE.CylinderGeometry(.67,.67,.2,10),gold,xx,.16,zz);
      mesh(new THREE.CylinderGeometry(.7,.51,.26,10),gold,xx,5.18,zz);
      addLantern(xx+(xx<32?.6:-.6),3.55,zz,'#ffc16d',zz);
    }
    const pts=[];for(let j=0;j<=40;j++){let a=j*Math.PI/40;pts.push(new THREE.Vector3(32+10.5*Math.cos(a),5.25+2*Math.sin(a),zz));}
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.13,7,false),gold);
  }
  // Different haunted chambers have stone piers or crooked violet framing.
  // These are fictional architecture, never fabricated submitted work.
  for(const xx of [52,60])for(const zz of [34,46]){
    box(.6,4.8,.6,xx,2.4,zz,wall[2]);box(.8,.16,.8,xx,4.85,zz,brass);
  }
  for(const zz of [34,42,46])for(const xx of [4,12]){
    const post=box(.24,4.8,.3,xx,2.4,zz,trim[0]);post.rotation.z=xx===4?.12:-.12;
    const beam=box(7.7,.15,.23,8,4.75,zz,trim[0]);beam.rotation.z=Math.sin(zz)*.06;
  }
  sign('THE LANTERN CHAMBER','A quiet room beyond the passage',56,2.6,30.2,0,4.2);
  sign('BEYOND THE VEIL','This room is awaiting its first work',8,2.6,30.2,0,4.2);
  sign('THE SEALED ARCHIVE','Some stories ask you to look a little closer',32,3.5,2.25,0,7);
  const keyPoint=point(FEATURES.key),key=new THREE.Group();key.position.set(keyPoint.x,1.6,keyPoint.z);scene.add(key);
  mesh(new THREE.TorusGeometry(.17,.035,8,24),brass,0,.15,0,key);box(.05,.43,.05,0,-.2,0,brass,key);box(.15,.05,.05,.06,-.36,0,brass,key);box(.14,.05,.05,.06,-.25,0,brass,key);
  mesh(new THREE.CylinderGeometry(.53,.66,.85,8),wall[1],keyPoint.x,.425,keyPoint.z);
  mesh(new THREE.CylinderGeometry(.65,.65,.07,8),gold,keyPoint.x,.88,keyPoint.z);
  const keyLight=new THREE.PointLight('#ffbe58',7,7,2);keyLight.position.set(keyPoint.x,2,keyPoint.z);scene.add(keyLight);
  sign('THE BRASS KEY','A small object. An unexpected door.',keyPoint.x,1.22,keyPoint.z+.45,0,1.4);
  // Authored Halloween props. These are scenery, never submitted illustrations.
  const pumpkinSkin=mat('#ba4517',{emissive:'#5d1a05',emissiveIntensity:.16});
  const pumpkinFace=mat('#ffd070',{emissive:'#ff9c27',emissiveIntensity:1.5});
  const stem=mat('#4c643a');
  function pumpkin(parent,x,y,z,scale=1){
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);if(parent===scene)g.userData.staticScenery=true;parent.add(g);
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const lobe=mesh(new THREE.SphereGeometry(.47,10,8),pumpkinSkin,Math.cos(a)*.27,.55,Math.sin(a)*.27,g);lobe.scale.y=1.03;}
    const stalk=box(.12,.3,.13,0,1.08,0,stem,g);stalk.rotation.z=.23;
    for(const side of [-1,1]){const eye=mesh(new THREE.ConeGeometry(.14,.23,3),pumpkinFace,side*.24,.67,.65,g);eye.rotation.x=Math.PI/2;}
    const grin=mesh(new THREE.TorusGeometry(.23,.05,4,12,Math.PI),pumpkinFace,0,.48,.685,g);grin.rotation.z=Math.PI;
    return g;
  }
  for(const [x,z,scale]of[[22,34,.65],[42,34,.8],[22,50,.75],[42,50,.55],[54,34,.65],[60,46,.75],[6,34,.65],[10,46,.8],[23,8,.65],[41,8,.7]])pumpkin(scene,x,.02,z,scale);
  // Quiet cobwebs catch the lantern in corners, with no flashing animation.
  const webMaterial=new THREE.LineBasicMaterial({color:'#b6a6cc',transparent:true,opacity:.4});resources.add(webMaterial);
  for(const [xx,zz]of[[22.2,29],[41.8,29],[53,32],[5,32]]){
    for(let i=0;i<=5;i++){const a=i*Math.PI/10;const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(xx,6.8,zz),new THREE.Vector3(xx+Math.cos(a)*2.2,6.8-Math.sin(a)*2.2,zz)]);resources.add(geo);scene.add(new THREE.Line(geo,webMaterial));}
    for(const r of [.7,1.4,2.1]){const pts=[];for(let i=0;i<=10;i++){const a=i*Math.PI/20;pts.push(new THREE.Vector3(xx+Math.cos(a)*r,6.8-Math.sin(a)*r,zz));}const geo=new THREE.BufferGeometry().setFromPoints(pts);resources.add(geo);scene.add(new THREE.Line(geo,webMaterial));}
  }
  const spirits=[],residentTextures=new THREE.TextureLoader();let disposed=false;
  for(const [index,definition]of MONSTERS.entries()){
    const root=new THREE.Group();root.position.set(definition.x*CELL,0,definition.z*CELL);root.name=definition.name;scene.add(root);const g=new THREE.Group();root.add(g);
    const body=mat(definition.color,{emissive:definition.color,emissiveIntensity:.28,roughness:.8});
    const eye=mat('#28192c',{roughness:1});
    const glint=mat('#fff0b6',{emissive:'#ffeaa0',emissiveIntensity:.7});
    if(definition.id==='pumpkin'){
      pumpkin(g,0,.3,0,1.25);
      for(const side of [-1,1]){const shoe=mesh(new THREE.SphereGeometry(.22,10,8),eye,side*.4,.2,.15,g);shoe.scale.set(1.1,.6,1.5);}
    }else if(definition.id==='ghost'){
      mesh(new THREE.ConeGeometry(.72,1.7,12),body,0,.87,0,g);
      mesh(new THREE.SphereGeometry(.62,16,12),body,0,1.55,0,g);
      for(const side of [-1,1]){mesh(new THREE.SphereGeometry(.09,8,6),eye,side*.22,1.63,.55,g);const arm=mesh(new THREE.SphereGeometry(.26,8,8),body,side*.63,1.1,0,g);arm.scale.set(1.5,.7,.7);}
      mesh(new THREE.SphereGeometry(.09,8,6),eye,0,1.37,.59,g);
    }else if(definition.id==='franken'){
      const coat=mat('#6b4545'),skin=mat('#8f9d78');box(.95,1.05,.55,0,.9,0,coat,g);box(.67,.63,.5,0,1.8,0,skin,g);
      for(const side of[-1,1]){box(.34,.8,.38,side*.7,.92,.1,skin,g);box(.3,.4,.5,side*.27,.22,.1,eye,g);mesh(new THREE.SphereGeometry(.07,8,6),glint,side*.16,1.83,.26,g);}
      box(.4,.025,.03,0,1.97,.27,eye,g);mesh(new THREE.TorusGeometry(.15,.045,5,12),brass,0,1.07,.3,g);
    }else if(definition.id==='zombie'||definition.id==='vampire'){
      const vampire=definition.id==='vampire',cloth=mat(vampire?'#422438':'#4a6258'),skin=mat(vampire?'#d9c6cc':'#9ab589'),hair=mat('#302438');
      mesh(new THREE.ConeGeometry(vampire?.74:.5,1.4,8),cloth,0,.85,0,g);
      mesh(new THREE.SphereGeometry(.38,12,10),skin,0,1.75,0,g);
      const cap=mesh(new THREE.SphereGeometry(.39,12,8),hair,0,1.91,-.04,g);cap.scale.y=.45;
      for(const side of[-1,1]){
        mesh(new THREE.SphereGeometry(.06,8,6),eye,side*.14,1.76,.34,g);
        mesh(new THREE.SphereGeometry(.15,8,6),skin,side*.52,vampire?1.1:1.35,vampire?.1:.3,g);
        mesh(new THREE.SphereGeometry(.16,8,6),eye,side*.22,.17,.1,g);
      }
      if(vampire){for(const side of[-1,1])mesh(new THREE.ConeGeometry(.04,.12,3),glint,side*.08,1.57,.36,g);}
      else{const stitch=mesh(new THREE.BoxGeometry(.25,.025,.025),eye,.08,1.94,.29,g);stitch.rotation.z=.25;}
    }else{
      mesh(new THREE.SphereGeometry(.49,14,10),body,0,1.4,0,g);
      for(const side of [-1,1]){
        const ear=mesh(new THREE.ConeGeometry(.19,.62,3),body,side*.29,1.93,0,g);ear.rotation.z=-side*.25;
        const shape=new THREE.Shape();shape.moveTo(side*.3,1.5);shape.lineTo(side*1.6,2);shape.lineTo(side*1.3,1.25);shape.lineTo(side*.85,1.45);shape.lineTo(side*.6,1);shape.closePath();
        const wingMaterial=mat('#73528e',{side:THREE.DoubleSide,emissive:'#4d356c',emissiveIntensity:.3});mesh(new THREE.ShapeGeometry(shape),wingMaterial,0,0,-.08,g);
        mesh(new THREE.SphereGeometry(.07,8,6),glint,side*.18,1.48,.43,g);
      }
    }
    sign(definition.name,'モンスター',0,2.7,0,0,2.1,root);
    const shadowMaterial=new THREE.MeshBasicMaterial({color:'#05050b',transparent:true,opacity:.3,depthWrite:false});resources.add(shadowMaterial);const shadow=mesh(new THREE.CircleGeometry(.58,20),shadowMaterial,0,.025,0,root);shadow.rotation.x=-Math.PI/2;
    // The same original enemy art is visible in 3D as grounded billboards.
    const spriteMaterial=new THREE.SpriteMaterial({transparent:true,alphaTest:.05,depthWrite:false});resources.add(spriteMaterial);const sprite=new THREE.Sprite(spriteMaterial);sprite.visible=false;root.add(sprite);
    function installMonsterTexture(texture){if(disposed){texture.dispose();return false;}texture.colorSpace=THREE.SRGBColorSpace;resources.add(texture);spriteMaterial.map=texture;spriteMaterial.needsUpdate=true;sprite.position.y=.04;sprite.visible=true;g.visible=false;root.userData.originalArt=true;return true;}
    const source=art?.images?.[definition.id];
    if(source){const texture=new THREE.Texture(source.image||source);texture.needsUpdate=true;installMonsterTexture(texture);}
    else if(!art&&ART_FILES[definition.id])residentTextures.load(new URL(`./assets/rpg/${ART_FILES[definition.id]}`,import.meta.url).href,texture=>{if(!installMonsterTexture(texture))return;const bounds=ART_BOUNDS[definition.id]||[0,0,512,512],anchor=ART_ANCHORS[definition.id]||{anchorX:.5,anchorY:1};texture.repeat.set(bounds[2]/texture.image.width,bounds[3]/texture.image.height);texture.offset.set(bounds[0]/texture.image.width,1-(bounds[1]+bounds[3])/texture.image.height);sprite.center.set(anchor.anchorX,1-anchor.anchorY);const height=definition.id==='franken'?2.35:definition.id==='bat'?1.85:2.15;sprite.scale.set(height*bounds[2]/bounds[3],height,1);},undefined,()=>console.warn('Original monster art unavailable:',definition.id));
    spirits.push({node:root,model:g,sprite,index,id:definition.id,definition,baseY:0,installMonsterTexture,sourceImage:source?.image||source});
  }
  // A drifting orbital mobile is sculpture, explicitly environmental decoration.
  const center=point(FEATURES.mobile||FEATURES.spawn||{x:Math.floor(cols/2),z:Math.floor(rows/2)});
  const mobile=new THREE.Group();mobile.position.set(center.x,3.45,center.z);scene.add(mobile);
  for(let i=0;i<3;i++){const ring=mesh(new THREE.TorusGeometry(.7+i*.29,.018,5,70),brass,0,0,0,mobile);ring.rotation.set(i*.65+.5,i*.5,.3+i*.7);}
  for(let i=0;i<9;i++){const a=i*2.4;const o=mesh(new THREE.OctahedronGeometry(.065+(i%3)*.04),i%2?brass:trim[0],Math.cos(a)*1.3,Math.sin(a*.8)*.55,Math.sin(a)*1.3,mobile);animated.push({node:o,kind:'facet',seed:i,base:o.position.y});}
  // Authored environmental installation: blank folios spiral over the vault.
  // They are physical covers, spines and bowed leaves, not submitted articles.
  const vaultPoint=point(FEATURES.vault),folios=new THREE.Group(),folioMotion=[];
  folios.name='Environmental floating folio installation';
  folios.position.set(vaultPoint.x,0,vaultPoint.z);scene.add(folios);
  const paper=mat('#e8d6ae',{side:THREE.DoubleSide,roughness:.93});
  const pageEdge=mat('#b9a680',{roughness:.9});
  const bookCovers=[mat('#274e4c'),mat('#694135'),mat('#393a53')];
  function bowedLeaf(side,offset=0){
    const geometry=new THREE.PlaneGeometry(.78,1.04,12,2),pos=geometry.attributes.position;
    for(let n=0;n<pos.count;n++){
      const u=(pos.getX(n)+.39)/.78,v=pos.getY(n);
      pos.setXYZ(n,side*(.025+u*.78),.09+Math.sin(u*Math.PI)*.16+u*.15+offset,v);
    }
    geometry.computeVertexNormals();return geometry;
  }
  for(let i=0;i<15;i++){
    const a=i*2.39996,r=2.2+(i%4)*.92,y=2.65+i*.205;
    const book=new THREE.Group();book.position.set(Math.cos(a)*r,y,Math.sin(a)*r);
    book.rotation.set(.27+Math.sin(a)*.22,-a+Math.PI/2,Math.cos(a)*.16);folios.add(book);
    const cover=bookCovers[i%bookCovers.length];
    for(const side of [-1,1]){
      const board=box(.87,.06,1.16,side*.44,.055,0,cover,book);board.rotation.z=side*.19;
      const edge=box(.79,.07,1.05,side*.42,.11,0,pageEdge,book);edge.rotation.z=side*.19;
      for(let leaf=0;leaf<3;leaf++)mesh(bowedLeaf(side,leaf*.012),paper,0,0,0,book);
      const corner=box(.12,.024,.12,side*.78,.235,.5,gold,book);corner.rotation.z=side*.19;
      box(.018,.025,1.08,side*.8,.25,0,brass,book);
    }
    box(.072,.15,1.17,0,.045,0,cover,book);
    const ribbon=box(.035,.014,.52,.045,.16,.66,gold,book);ribbon.rotation.x=-.17;
    folioMotion.push({node:book,baseY:y,baseX:book.rotation.x,baseZ:book.rotation.z,phase:a});
  }
  // Low concentric brass inlays anchor the installation without blocking paths.
  for(const r of [1.45,2.2,5.5]){
    const orbit=mesh(new THREE.TorusGeometry(r,.025,6,96),gold,vaultPoint.x,.018,vaultPoint.z);orbit.rotation.x=Math.PI/2;
  }
  lanternSources.push({x:vaultPoint.x,y:4.4,z:vaultPoint.z,color:'#ffb85b',intensity:7,distance:12});
  sign('THE FLOATING ARCHIVE','An installation of unwritten pages',vaultPoint.x,1.75,vaultPoint.z+5.6,0,2.8);
  const particles=new THREE.BufferGeometry(),positions=[];
  for(let i=0;i<150;i++){const x=1+((i*17)%Math.max(1,cols-2)),z=1+((i*13)%Math.max(1,rows-2));if(walk(x,z))positions.push(x*CELL+Math.sin(i)*1.5,.5+(i%29)/9,z*CELL+Math.cos(i)*1.5);}
  particles.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));resources.add(particles);
  const pm=new THREE.PointsMaterial({color:'#cfc29b',size:.024,transparent:true,opacity:.48,depthWrite:false});resources.add(pm);const dust=new THREE.Points(particles,pm);scene.add(dust);
  const featureSigns=[['entrance','THE HAUNTED ARCHIVE','A maze of stories, still becoming'],['normal','THE LANTERN CHAMBER','The old collection awaits'],['halloween','THE ECHO HALL','Follow the warm light'],['horror','BEYOND THE VEIL','An open room for future work']];
  for(const [name,title,sub] of featureSigns){if(FEATURES[name]){const p=point(FEATURES[name]);sign(title,sub,p.x,2.55,p.z-CELL/2+.2,0,2.8);}}
  // Exhibits are only populated from parent-provided real collection records.
  const textureLoader=new THREE.TextureLoader(),exhibitResources=createExhibitResources(resources);
  function setExhibits(items=[]){
    if(disposed)return;const generation=exhibitResources.reset();
    while(exhibitGroup.children.length)exhibitGroup.remove(exhibitGroup.children[0]);
    items.forEach((item,i)=>{
      const f=item.position||FEATURES[item.feature]||(i===0?FEATURES.article:null);if(!f)return;
      const p=point(f),g=new THREE.Group();g.position.set(p.x,f.y||2.1,p.z);g.rotation.y=f.yaw||item.yaw||0;exhibitGroup.add(g);
      box(3.58,1.94,.12,0,0,-.09,gold,g);
      const placeholder=textTexture(item.title||'Archive in progress',item.subtitle||'A place for a real memory');exhibitResources.track(placeholder,generation);
      const m=new THREE.MeshBasicMaterial({map:placeholder});exhibitResources.track(m,generation);
      const geometry=new THREE.PlaneGeometry(3.42,1.79);exhibitResources.track(geometry,generation);mesh(geometry,m,0,0,0,g);
      const src=item.image||item.imageUrl||item.src;
      if(src)textureLoader.load(src,t=>{if(!exhibitResources.track(t,generation))return;t.colorSpace=THREE.SRGBColorSpace;exhibitResources.release(m.map);m.map=t;m.needsUpdate=true;},undefined,()=>{});
    });
  }
  function creatorNameTexture(value){const cv=document.createElement('canvas');cv.width=512;cv.height=96;const c=cv.getContext('2d');c.fillStyle='#152032ed';c.fillRect(5,8,502,78);c.strokeStyle='#c6ac75';c.lineWidth=2;c.strokeRect(6,9,500,76);c.font='500 34px "Yu Gothic", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f5e4bc';c.fillText(value,256,49,470);const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;resources.add(texture);return texture;}
  const creatorNodes=new Map(),creatorAlphaCache=new WeakMap(),creatorRay=new THREE.Raycaster();let creatorHitTargets=[];
  function updateCreatorActors(actors=[]){
    const seen=new Set(),groupRows=new Map();creatorHitTargets=[];
    for(const a of actors){if(!a.id||!a.sprite)continue;seen.add(a.id);const sp=a.sprite,image=sp.image||sp,frame=sp.frame||[0,0,image.width,image.height];let entry=creatorNodes.get(a.id);
      if(!entry){const material=new THREE.SpriteMaterial({transparent:true,alphaTest:.08,depthWrite:false,color:'#ffffff'});resources.add(material);const sprite=new THREE.Sprite(material);sprite.userData.creatorId=a.id;sprite.name=`Palace resident: ${a.characterName||a.name||a.id}`;scene.add(sprite);const shadow=contactShadow(a.x*CELL,a.z*CELL,1.35,.8);shadow.userData.ignorePicking=true;entry={sprite,material,shadow,image:null,texture:null};creatorNodes.set(a.id,entry);}
      if(entry.image!==image){if(entry.texture){entry.texture.dispose();resources.delete(entry.texture);}const tex=new THREE.Texture(image);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;resources.add(tex);entry.texture=tex;entry.material.map=tex;entry.material.needsUpdate=true;entry.image=image;}
      if(entry.poseVersion!==sp.poseVersion){entry.texture.needsUpdate=true;creatorAlphaCache.delete(image);entry.poseVersion=sp.poseVersion;}
      entry.texture.repeat.set(frame[2]/image.width,frame[3]/image.height);entry.texture.offset.set(frame[0]/image.width,1-(frame[1]+frame[3])/image.height);
      entry.sprite.center.set(sp.anchorX??.5,1-(sp.anchorY??1));const ch=sp.contentHeight||frame[3],hh=a.heightWorld||2.38;entry.sprite.scale.set(hh*frame[2]/ch,hh*frame[3]/ch,1);
      entry.sprite.position.set(a.x*CELL,.035,a.z*CELL);entry.shadow.position.set(a.x*CELL,.016,a.z*CELL);entry.shadow.scale.setScalar(Math.max(.55,hh/2.38));entry.sprite.visible=true;entry.sprite.userData.interactive=a.interactive!==false;entry.actor=a;entry.source=sp;creatorHitTargets.push(entry.sprite);
      const name=a.interactive===false?'':String(a.label||a.name||a.characterName||''),group=a.groupId||a.id,labelRow=groupRows.get(group)||0;groupRows.set(group,labelRow+1);if(name&&entry.labelText!==name){if(entry.label){scene.remove(entry.label);entry.label.material.map.dispose();entry.label.material.dispose();resources.delete(entry.label.material.map);resources.delete(entry.label.material);}const lm=new THREE.SpriteMaterial({map:creatorNameTexture(name),transparent:true,depthWrite:false});resources.add(lm);entry.label=new THREE.Sprite(lm);entry.label.scale.set(2.45,.46,1);entry.label.center.set(.5,0);entry.label.userData.creatorId=a.id;entry.label.userData.creatorLabel=true;scene.add(entry.label);entry.labelText=name;}if(entry.label){entry.label.visible=!!name;entry.label.position.set(a.x*CELL,.05+Math.min(2,labelRow)*.5,a.z*CELL+.08);entry.label.userData.interactive=a.interactive!==false;}

    }
    for(const [id,e]of creatorNodes)if(!seen.has(id)){if(e.label){scene.remove(e.label);e.label.material.map.dispose();e.label.material.dispose();resources.delete(e.label.material.map);resources.delete(e.label.material);}scene.remove(e.sprite);scene.remove(e.shadow);e.shadow.geometry.dispose();resources.delete(e.shadow.geometry);e.material.dispose();e.texture?.dispose();resources.delete(e.material);resources.delete(e.texture);creatorNodes.delete(id);}
  }
  function creatorPixelVisible(entry,uv){if(!uv)return true;const image=entry.image;let pixels=creatorAlphaCache.get(image);if(!pixels){try{const cv=document.createElement('canvas');cv.width=image.width;cv.height=image.height;const ctx=cv.getContext('2d');ctx.drawImage(image,0,0);pixels=ctx.getImageData(0,0,cv.width,cv.height);creatorAlphaCache.set(image,pixels);}catch{return true;}}
    const f=entry.source.frame||[0,0,image.width,image.height],xx=Math.max(0,Math.min(pixels.width-1,Math.floor(f[0]+uv.x*f[2]))),yy=Math.max(0,Math.min(pixels.height-1,Math.floor(f[1]+(1-uv.y)*f[3])));return pixels.data[(yy*pixels.width+xx)*4+3]>45;
  }
  function pickCreator(cssX,cssY){
    const w=canvas.clientWidth||canvas.width,h=canvas.clientHeight||canvas.height;if(!w||!h)return null;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);creatorRay.setFromCamera(new THREE.Vector2(cssX/w*2-1,1-cssY/h*2),camera);
    for(const hit of creatorRay.intersectObjects(scene.children,true)){
      const id=hit.object.userData.creatorId;if(id){const entry=creatorNodes.get(id);if(!entry||(!hit.object.userData.creatorLabel&&!creatorPixelVisible(entry,hit.uv)))continue;return hit.object.userData.interactive?id:null;}
      let cameraAttached=false;for(let p=hit.object;p;p=p.parent)if(p===camera)cameraAttached=true;if(cameraAttached)continue;const material=hit.object.material;if(hit.object.isPoints||hit.object.isLine||material?.transparent&&material.opacity<.2||hit.object===heldLantern)continue;
      // Lights, decorative mist and contact shadows never intercept a resident click.
      if(hit.object.userData.ignorePicking||material===contactMat)continue;
      return null;
    }return null;
  }
  // Thin volumetric-looking mist is a bounded transparent sheet, rather than a particle storm.
  const mistCv=document.createElement('canvas');mistCv.width=256;mistCv.height=128;const mistCtx=mistCv.getContext('2d');for(let i=0;i<6;i++){const xx=35+i*39,yy=63+Math.sin(i)*12,g=mistCtx.createRadialGradient(xx,yy,3,xx,yy,61);g.addColorStop(0,'#c2cde21c');g.addColorStop(1,'#c2cde200');mistCtx.fillStyle=g;mistCtx.fillRect(xx-61,yy-61,122,122);}const mistTex=new THREE.CanvasTexture(mistCv);resources.add(mistTex);const mistMat=new THREE.MeshBasicMaterial({map:mistTex,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:.42});resources.add(mistMat);const mistSheets=[];
  for(const [x,z,w]of[[32,51,17],[32,16,13],[8,43,8]]){const sheet=mesh(new THREE.PlaneGeometry(w,3),mistMat,x,.3,z);sheet.rotation.x=-Math.PI/2;sheet.userData.ignorePicking=true;mistSheets.push({node:sheet,x,z});}
  let last=0,gateY=0,ambientTime=0;
  function resize(){const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;heldLantern.position.x=Math.min(.3,.3*camera.aspect);camera.updateProjectionMatrix();}
  function render({x=0,z=0,yaw=0,pitch=0,time=0,motion=true,unlocked=false,horrorAccepted=false,hasKey=false,collection=[],brightness=1,lantern=true,encounters=true,cleared=[],cameraDistance='normal',cameraZoom=1,facing='down',walking=false,walkPhase=0,creatorActors=[]}={}){
    const seconds=time*.001;const dt=Math.min(.05,Math.max(0,seconds-last));last=seconds;if(motion)ambientTime+=dt;const t=ambientTime;
    const distance=normalizeCameraDistance(cameraDistance),zoom=mazeCameraZoom(distance,cameraZoom);if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}
    const wide=distance!=='normal',hero=wide?playerPose(art,facing,walking,walkPhase):null;updateCreatorActors(hero?[...creatorActors,{id:'wide-view-owner',x:x/CELL,z:z/CELL,sprite:hero,heightWorld:2.38,interactive:false}]:creatorActors);
    folios.visible=Math.hypot(x-vaultPoint.x,z-vaultPoint.z)<(compactViewport?26:42);
    for(const [i,m]of mistSheets.entries()){m.node.position.x=m.x+(motion?Math.sin(t*.12+i)*.8:0);m.node.position.z=m.z+(motion?Math.cos(t*.09+i)*.5:0);}
    const level=Math.max(.75,Math.min(1.75,Number.isFinite(Number(brightness))?Number(brightness):1));
    renderer.toneMappingExposure=NIGHT_LIGHTING.exposure*level;
    if(wide){const pose=mazeWideCamera({x,z,yaw,unlocked,horrorAccepted},blocked,distance);camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(x-Math.sin(yaw)*1.2,1.1,z-Math.cos(yaw)*1.2);}else{camera.position.set(x,1.65,z);camera.rotation.set(pitch,yaw,0,'YXZ');}
    heldLantern.visible=!!lantern&&!wide;headlamp.visible=!!lantern;nearLamp.visible=!!lantern;
    for(const spirit of spirits){
      // Opening the scene does not wait for every enemy atlas. Install the same
      // original art as it arrives, retaining the existing model until then.
      const source=art?.images?.[spirit.id],image=source?.image||source;
      if(image&&image!==spirit.sourceImage){const texture=new THREE.Texture(image);texture.needsUpdate=true;const previous=spirit.sprite.material.map;if(spirit.installMonsterTexture(texture)){spirit.sourceImage=image;if(previous){previous.dispose();resources.delete(previous);}}}
      spirit.node.visible=encounters&&(!spirit.definition.optional||spirit.node.userData.originalArt)&&!cleared.includes(spirit.id)&&monsterAvailable(spirit.definition,{unlocked,horrorAccepted});
      const pose=monsterPose(spirit.definition,seconds,motion,{unlocked,horrorAccepted});
      const sampled=art&&monsterSprite(art,spirit.id,{time:seconds,motion,patrol:pose});
      if(sampled&&spirit.sprite.material.map){const uv=spriteTextureUV(sampled),texture=spirit.sprite.material.map,height=(spirit.id==='franken'?2.35:spirit.id==='bat'?1.85:2.15)*uv.heightScale;texture.repeat.set(uv.repeatX,uv.repeatY);texture.offset.set(uv.offsetX,uv.offsetY);spirit.sprite.center.set(uv.centerX,uv.centerY);spirit.sprite.scale.set(height*uv.aspect,height,1);}
      spirit.node.position.x=pose.x*CELL;spirit.node.position.z=pose.z*CELL;
      spirit.node.rotation.y=Math.atan2(x-spirit.node.position.x,z-spirit.node.position.z);
      if(!motion)spirit.node.position.y=spirit.baseY;
    }
    const nearest=lanternSources.slice().sort((a,b)=>(a.x-x)**2+(a.z-z)**2-((b.x-x)**2+(b.z-z)**2));
    lamps.forEach((lamp,i)=>{const p=nearest[i];if(p){lamp.position.set(p.x,p.y,p.z);lamp.color.set(p.color);lamp.intensity=(p.intensity||3.9)+(motion?Math.sin(t*2.7+i)*.14:0);lamp.distance=p.distance||8.5;}});
    gateY=motion?gateY+(unlocked?4.6-gateY:-gateY)*Math.min(1,dt*4):(unlocked?4.6:0);gate.position.y=gateY;
    const collected=Array.isArray(collection)?collection.some(v=>typeof v==='string'?v.includes('key'):v?.id?.includes('key')):!!collection?.key;
    key.visible=!collected&&!hasKey&&!unlocked;horrorDoor.position.y=horrorAccepted?5.5:0;keyLight.visible=key.visible;
    if(motion){heldLantern.rotation.z=Math.sin(t*.8)*.015;
      for(const spirit of spirits){spirit.node.position.y=spirit.baseY+(['zombie','franken'].includes(spirit.id)?Math.abs(Math.sin(t*.4))*.025:Math.sin(t*(spirit.id==='vampire'?.35:.55)+spirit.index)*.055);}
      key.rotation.y=t*.8;key.position.y=1.57+Math.sin(t*1.4)*.09;mobile.rotation.y=t*.085;mobile.rotation.z=Math.sin(t*.28)*.1;dust.rotation.y=Math.sin(t*.025)*.006;
      folios.rotation.y=Math.sin(t*.085)*.085;
      for(const f of folioMotion){f.node.position.y=f.baseY+Math.sin(t*.65+f.phase)*.12;f.node.rotation.x=f.baseX+Math.sin(t*.48+f.phase)*.035;f.node.rotation.z=f.baseZ+Math.cos(t*.4+f.phase)*.04;}
      for(const a of animated){if(a.kind==='lantern')a.node.rotation.z=Math.sin(t*.65+a.seed)*.045;else if(a.kind==='flag')a.node.rotation.x=Math.sin(t*.55+a.seed)*.1;else{a.node.rotation.y=t*.4+a.seed;a.node.position.y=a.base+Math.sin(t*.75+a.seed)*.09;}}
    }
    renderer.render(scene,camera);
  }
  function dispose(){if(disposed)return;disposed=true;exhibitResources.dispose();for(const r of resources)r.dispose?.();renderer.dispose();}
  // Instance static masonry by material. Thousands of architectural details
  // become a handful of GPU draw calls while movable objects remain separate.
  // Batch repeated pieces inside moving parents, retaining their local transforms.
  // In particular the moving iron gate no longer costs one draw per bar and finial.
  function batchLocalParts(group){const local=new Map();for(const node of [...group.children]){if(!node.isMesh||node.isInstancedMesh||!(node.geometry===boxGeo||node.geometry.type==='ConeGeometry'))continue;node.updateMatrix();const key=node.geometry.type+JSON.stringify(node.geometry.parameters)+node.material.uuid;if(!local.has(key))local.set(key,{geometry:node.geometry,material:node.material,nodes:[]});local.get(key).nodes.push(node);}for(const {geometry,material,nodes}of local.values()){if(nodes.length<2)continue;const batch=new THREE.InstancedMesh(geometry,material,nodes.length);nodes.forEach((node,index)=>{batch.setMatrixAt(index,node.matrix);group.remove(node);});batch.computeBoundingSphere();batch.frustumCulled=true;group.add(batch);}}
  batchLocalParts(gate);batchLocalParts(horrorDoor);batchLocalParts(heldLantern);for(const f of folioMotion)batchLocalParts(f.node);
  const batches=new Map(),batchable=[];
  scene.updateMatrixWorld(true);
  scene.traverse(node=>{if(!node.isMesh||node.isInstancedMesh||Array.isArray(node.material))return;let staticNode=node.parent===scene;for(let p=node.parent;p&&p!==scene;p=p.parent)if(p.userData.staticScenery)staticNode=true;if(staticNode)batchable.push(node);});
  for(const node of batchable){const reusable=['BoxGeometry','PlaneGeometry','SphereGeometry','CylinderGeometry','ConeGeometry','TorusGeometry','CircleGeometry'].includes(node.geometry.type),geometryKey=reusable?node.geometry.type+JSON.stringify(node.geometry.parameters):node.geometry.uuid,key=geometryKey+':'+node.material.uuid;if(!batches.has(key))batches.set(key,{geometry:node.geometry,material:node.material,matrices:[]});batches.get(key).matrices.push(node.matrixWorld.clone());node.parent.remove(node);}
  for(const {geometry,material,matrices} of batches.values()){const instanced=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((matrix,index)=>instanced.setMatrixAt(index,matrix));instanced.computeBoundingSphere();scene.add(instanced);}
  resize();onReady?.();return {render,resize,dispose,setExhibits,pickCreator,scene,camera};
}


