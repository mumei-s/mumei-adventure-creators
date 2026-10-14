import * as THREE from './vendor/three.module.js';
import { MAP, CELL, FEATURES, toWorld } from './maze-model.js';

// All architectural objects live in world space. Camera motion, collision and
// interaction remain in the controller, making the gallery usable with keys,
// touch controls, and pointer-lock alike.
export function createWorld({ canvas, onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#39464b');
  scene.fog = new THREE.FogExp2('#526468', .010);
  const camera = new THREE.PerspectiveCamera(69, 1, .075, 115);
  camera.rotation.order = 'YXZ';
  const resources = new Set(), animated = [], lamps = [], lanternSources = [], exhibitGroup = new THREE.Group();
  scene.add(exhibitGroup);
  const map = MAP.map(row => typeof row === 'string' ? [...row] : row);
  const cols = Math.max(...map.map(r => r.length)), rows = map.length;
  const walk = (x,z) => z >= 0 && z < rows && x >= 0 && x < (map[z]?.length || 0) && !['#',1].includes(map[z][x]);
  const mat = (color, extra={}) => { const m = new THREE.MeshStandardMaterial({color, roughness:.82, ...extra}); resources.add(m); return m; };
  const gold = mat('#a37e40', {metalness:.7, roughness:.32});
  const brass = mat('#d9b775', {metalness:.72, roughness:.25});
  const dark = mat('#293d40');
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
  // Floor insets, wainscoting and piers define real navigable space, not a panorama.
  const wallHeight=7.3;
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++) {
    if(!walk(x,z))continue;
    const wx=x*CELL, wz=z*CELL, zi=zone(x);
    box(CELL,.15,CELL,wx,-.12,wz,floor[zi]);
    box(CELL-.25,.016,CELL-.25,wx,-.028,wz,zi===2?matFloorLight:dark);
    const tile=box(CELL*.63,.012,CELL*.63,wx,-.013,wz,floor[zi]);tile.rotation.y=Math.PI/4;
    box(.035,.017,CELL,wx-CELL/2+.16,-.008,wz,trim[zi]);
    box(CELL,.017,.035,wx,-.008,wz-CELL/2+.16,trim[zi]);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if(walk(x+dx,z+dz))continue;
      const horizontal=!!dz, px=wx+dx*CELL/2,pz=wz+dz*CELL/2;
      box(horizontal?CELL:.22,wallHeight,horizontal?.22:CELL,px,wallHeight/2,pz,wall[zi]);
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
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
    for(const s of [-1,1]){box(.2,3.55,.33,s*(CELL/2-.22),1.775,0,trim[zi],g);box(.4,.18,.48,s*(CELL/2-.22),.1,0,gold,g);}
    const curve=new THREE.EllipseCurve(0,0,CELL/2-.22,1.0,0,Math.PI,false,0);
    const points=curve.getPoints(28).map(p=>new THREE.Vector3(p.x,3.5+p.y,0));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),28,.105,6,false),trim[zi],0,0,0,g);
    box(.25,.45,.42,0,4.43,0,gold,g);
  }
  function addLantern(x,y,z,color,seed=0){
    const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
    const em=mat(color,{emissive:color,emissiveIntensity:1.8,roughness:.3});
    mesh(new THREE.CylinderGeometry(.16,.21,.43,6),em,0,0,0,g);
    mesh(new THREE.ConeGeometry(.27,.22,6),gold,0,.3,0,g);
    box(.035,.44,.035,0,.57,0,gold,g);
    for(let i=0;i<4;i++){let a=i*Math.PI/2;box(.025,.46,.025,Math.cos(a)*.18,0,Math.sin(a)*.18,dark,g);}
    mesh(new THREE.CylinderGeometry(.26,.16,.1,6),gold,0,-.26,0,g);
    // A small bounded pool of real lamps; all lanterns remain emissive.
    lanternSources.push({x,y:y-.1,z,color});
    if(lamps.length<8){const l=new THREE.PointLight(color,13,12,2);l.position.set(x,y-.1,z);scene.add(l);lamps.push(l);}
    animated.push({node:g,kind:'lantern',seed,base:y});return g;
  }
  const ambient=new THREE.HemisphereLight('#e4f5ed','#8a818e',2.5);scene.add(ambient);
  const moon=new THREE.DirectionalLight('#e5f3ef',1.7);moon.position.set(5,12,4);scene.add(moon);
  // The hand lamp is attached to the camera, and OFF disables both its geometry
  // and beam. Independent architectural light keeps navigation readable.
  scene.add(camera);
  const heldLantern=new THREE.Group();heldLantern.name='Handheld lantern';
  heldLantern.position.set(.36,-.34,-.7);heldLantern.scale.setScalar(.42);camera.add(heldLantern);
  const lampGlass=mat('#ffe7ab',{emissive:'#ffcc76',emissiveIntensity:1.3,roughness:.3});
  mesh(new THREE.CylinderGeometry(.19,.23,.42,8),lampGlass,0,0,0,heldLantern);
  mesh(new THREE.ConeGeometry(.29,.2,8),brass,0,.3,0,heldLantern);
  mesh(new THREE.CylinderGeometry(.27,.27,.09,8),gold,0,-.27,0,heldLantern);
  mesh(new THREE.TorusGeometry(.15,.022,6,22),gold,0,.54,0,heldLantern);
  for(let n=0;n<4;n++){const a=n*Math.PI/2;box(.024,.51,.024,Math.cos(a)*.2,0,Math.sin(a)*.2,gold,heldLantern);}
  const headlamp=new THREE.SpotLight('#ffe2ae',30,24,Math.PI*.28,.72,1.4);
  headlamp.position.set(.3,-.15,-.25);camera.add(headlamp);
  const beamTarget=new THREE.Object3D();beamTarget.position.set(0,-.2,-9);camera.add(beamTarget);headlamp.target=beamTarget;
  // Frosted high windows read as moonlight throughout the haunted chambers.
  const moonGlass=mat('#a8c2d7',{emissive:'#859fb9',emissiveIntensity:.35});
  for(const zz of [34,40,46]){
    box(.09,2.7,1.8,61.78,4.5,zz,moonGlass);
    for(const dy of [-1.45,0,1.45])box(.17,.09,2,61.68,4.5+dy,zz,trim[2]);
    box(.17,3,.08,61.67,4.5,zz,trim[2]);
  }
  const chamberFill=new THREE.PointLight('#c6d7f1',35,24,1.6);chamberFill.position.set(56,5.9,40);scene.add(chamberFill);
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
  // Optional fictional lantern spirits stay beside the route. Their soft,
  // proximity-driven appearance never blocks collision or controls an exit.
  const spirits=[];
  for(const [index,tx,tz] of [[0,1,8.4],[1,3,11.6],[2,6,8],[3,14,11.6]]){
    const g=new THREE.Group();g.position.set(tx*CELL,1.2,tz*CELL);scene.add(g);
    const body=mat(index?'#93abae':'#b8abc8',{transparent:true,opacity:0,depthWrite:false,roughness:1});
    const eye=mat('#e6c692',{emissive:'#b69255',emissiveIntensity:.35,transparent:true,opacity:0,depthWrite:false});
    const cloak=mesh(new THREE.ConeGeometry(.44,1.25,9),body,0,0,0,g);cloak.scale.z=.68;
    mesh(new THREE.SphereGeometry(.29,12,9),body,0,.68,0,g);
    for(const side of [-1,1]){mesh(new THREE.SphereGeometry(.035,8,6),eye,side*.1,.72,.27,g);const horn=mesh(new THREE.ConeGeometry(.07,.28,5),body,side*.2,.97,0,g);horn.rotation.z=-side*.3;}
    spirits.push({node:g,materials:[body,eye],reveal:0,baseY:1.2,index});
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
  const vaultGlow=new THREE.PointLight('#ffcc82',22,16,2);vaultGlow.position.set(vaultPoint.x,4.4,vaultPoint.z);scene.add(vaultGlow);
  sign('THE FLOATING ARCHIVE','An installation of unwritten pages',vaultPoint.x,1.75,vaultPoint.z+5.6,0,2.8);
  const particles=new THREE.BufferGeometry(),positions=[];
  for(let i=0;i<150;i++){const x=1+((i*17)%Math.max(1,cols-2)),z=1+((i*13)%Math.max(1,rows-2));if(walk(x,z))positions.push(x*CELL+Math.sin(i)*1.5,.5+(i%29)/9,z*CELL+Math.cos(i)*1.5);}
  particles.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));resources.add(particles);
  const pm=new THREE.PointsMaterial({color:'#cfc29b',size:.024,transparent:true,opacity:.48,depthWrite:false});resources.add(pm);const dust=new THREE.Points(particles,pm);scene.add(dust);
  const featureSigns=[['entrance','THE HAUNTED ARCHIVE','A maze of stories, still becoming'],['normal','THE LANTERN CHAMBER','The old collection awaits'],['halloween','THE ECHO HALL','Follow the warm light'],['horror','BEYOND THE VEIL','An open room for future work']];
  for(const [name,title,sub] of featureSigns){if(FEATURES[name]){const p=point(FEATURES[name]);sign(title,sub,p.x,2.55,p.z-CELL/2+.2,0,2.8);}}
  // Exhibits are only populated from parent-provided real collection records.
  const textureLoader=new THREE.TextureLoader();
  function setExhibits(items=[]){
    while(exhibitGroup.children.length)exhibitGroup.remove(exhibitGroup.children[0]);
    items.forEach((item,i)=>{
      const f=item.position||FEATURES[item.feature]||(i===0?FEATURES.article:null);if(!f)return;
      const p=point(f),g=new THREE.Group();g.position.set(p.x,f.y||2.1,p.z);g.rotation.y=f.yaw||item.yaw||0;exhibitGroup.add(g);
      box(3.58,1.94,.12,0,0,-.09,gold,g);
      const m=new THREE.MeshBasicMaterial({map:textTexture(item.title||'Archive in progress',item.subtitle||'A place for a real memory')});resources.add(m);
      mesh(new THREE.PlaneGeometry(3.42,1.79),m,0,0,0,g);
      const src=item.image||item.imageUrl||item.src;
      if(src)textureLoader.load(src,t=>{t.colorSpace=THREE.SRGBColorSpace;resources.add(t);m.map=t;m.needsUpdate=true;},undefined,()=>{});
    });
  }
  let last=0,gateY=0,ambientTime=0;
  function resize(){const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;heldLantern.position.x=Math.min(.36,.36*camera.aspect);camera.updateProjectionMatrix();}
  function render({x=0,z=0,yaw=0,pitch=0,time=0,motion=true,unlocked=false,horrorAccepted=false,hasKey=false,collection=[],brightness=1,lantern=true,encounters=false}={}){
    const seconds=time*.001;const dt=Math.min(.05,Math.max(0,seconds-last));last=seconds;if(motion)ambientTime+=dt;const t=ambientTime;
    const level=Math.max(.75,Math.min(1.75,Number.isFinite(Number(brightness))?Number(brightness):1));
    renderer.toneMappingExposure=1.38*level;
    camera.position.set(x,1.65,z);camera.rotation.set(pitch,yaw,0,'YXZ');
    heldLantern.visible=!!lantern;headlamp.visible=!!lantern;
    for(const spirit of spirits){
      const distance=Math.hypot(x-spirit.node.position.x,z-spirit.node.position.z);
      const target=encounters?THREE.MathUtils.smoothstep(12-distance,0,7)*.8:0;
      spirit.reveal=motion?THREE.MathUtils.lerp(spirit.reveal,target,Math.min(1,dt*1.4)):target;
      if(!encounters)spirit.reveal=0;
      spirit.node.visible=spirit.reveal>.005;spirit.materials.forEach(m=>{m.opacity=spirit.reveal;});
    }
    const nearest=lanternSources.slice().sort((a,b)=>(a.x-x)**2+(a.z-z)**2-((b.x-x)**2+(b.z-z)**2));
    lamps.forEach((lamp,i)=>{const p=nearest[i];if(p){lamp.position.set(p.x,p.y,p.z);lamp.color.set(p.color);}});
    gateY=motion?gateY+(unlocked?4.6-gateY:-gateY)*Math.min(1,dt*4):(unlocked?4.6:0);gate.position.y=gateY;
    const collected=Array.isArray(collection)?collection.some(v=>typeof v==='string'?v.includes('key'):v?.id?.includes('key')):!!collection?.key;
    key.visible=!collected&&!hasKey&&!unlocked;horrorDoor.position.y=horrorAccepted?5.5:0;keyLight.visible=key.visible;
    if(motion){heldLantern.rotation.z=Math.sin(t*.8)*.015;
      for(const spirit of spirits){spirit.node.position.y=spirit.baseY+Math.sin(t*.55+spirit.index)*.055;}
      key.rotation.y=t*.8;key.position.y=1.57+Math.sin(t*1.4)*.09;mobile.rotation.y=t*.085;mobile.rotation.z=Math.sin(t*.28)*.1;dust.rotation.y=Math.sin(t*.025)*.006;
      folios.rotation.y=Math.sin(t*.085)*.085;
      for(const f of folioMotion){f.node.position.y=f.baseY+Math.sin(t*.65+f.phase)*.12;f.node.rotation.x=f.baseX+Math.sin(t*.48+f.phase)*.035;f.node.rotation.z=f.baseZ+Math.cos(t*.4+f.phase)*.04;}
      for(const a of animated){if(a.kind==='lantern')a.node.rotation.z=Math.sin(t*.65+a.seed)*.045;else if(a.kind==='flag')a.node.rotation.x=Math.sin(t*.55+a.seed)*.1;else{a.node.rotation.y=t*.4+a.seed;a.node.position.y=a.base+Math.sin(t*.75+a.seed)*.09;}}
    }
    renderer.render(scene,camera);
  }
  function dispose(){for(const r of resources)r.dispose?.();renderer.dispose();}
  // Instance static masonry by material. Thousands of architectural details
  // become a handful of GPU draw calls while movable objects remain separate.
  const batches=new Map();
  for(const node of [...scene.children])if(node.isMesh&&node.geometry===boxGeo){
    if(!batches.has(node.material))batches.set(node.material,[]);
    node.updateMatrix();batches.get(node.material).push(node.matrix.clone());scene.remove(node);
  }
  for(const [material,matrices] of batches){const instanced=new THREE.InstancedMesh(boxGeo,material,matrices.length);matrices.forEach((matrix,index)=>instanced.setMatrixAt(index,matrix));instanced.computeBoundingSphere();scene.add(instanced);}
  resize();onReady?.();return {render,resize,dispose,setExhibits,scene,camera};
}

