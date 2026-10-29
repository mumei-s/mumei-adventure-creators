/** Original, texture-free, articulated interpretation of the supplied Overlord S references.
 * Not a photogrammetry/likeness asset. +Z forward, Y up, feet Y=0, crown ~2.6.
 * No loaders/network/DOM; works with the host's THREE revision. */
export function createOverlordBoss(THREE, options = {}) {
  const root = new THREE.Group(); root.name = 'Overlord S — volumetric articulated character';
  const body = new THREE.Group(); root.add(body);
  const mats = {
    armor: new THREE.MeshStandardMaterial({color:0x161722,metalness:.84,roughness:.26}),
    gold: new THREE.MeshStandardMaterial({color:0xd9aa48,metalness:.82,roughness:.29}),
    goldLight: new THREE.MeshStandardMaterial({color:0xf5d98a,metalness:.65,roughness:.32}),
    skin: new THREE.MeshStandardMaterial({color:0xf0bea5,roughness:.56}),
    hair: new THREE.MeshStandardMaterial({color:0xb48034,metalness:.12,roughness:.43}),
    hairLight: new THREE.MeshStandardMaterial({color:0xf2ce86,metalness:.18,roughness:.36}),
    red: new THREE.MeshStandardMaterial({color:0x790c25,roughness:.72,side:THREE.DoubleSide}),
    gem: new THREE.MeshStandardMaterial({color:0xc6002c,metalness:.25,roughness:.18,emissive:0x810015,emissiveIntensity:.6}),
    glow: new THREE.MeshStandardMaterial({color:0xff4563,emissive:0xff0835,emissiveIntensity:2.1,roughness:.3}),
    eye: new THREE.MeshStandardMaterial({color:0xefe6d8,roughness:.4}),
    iris: new THREE.MeshStandardMaterial({color:0x6d6b38,roughness:.3}),
    dark: new THREE.MeshStandardMaterial({color:0x23131b,roughness:.65}),
    lip: new THREE.MeshStandardMaterial({color:0xa9474b,roughness:.42}),
    energy: new THREE.MeshBasicMaterial({color:0xff2652,transparent:true,opacity:.38,blending:THREE.AdditiveBlending,depthWrite:false})
  };
  const resources = new Set();
  const V = (x,y,z) => new THREE.Vector3(x,y,z);
  function mesh(parent, geo, material, p=[0,0,0], s=[1,1,1]) { resources.add(geo); const m=new THREE.Mesh(geo,mats[material]); m.position.set(...p);m.scale.set(...s);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
  function joint(parent,name,p) { const g=new THREE.Group();g.name=name;g.position.set(...p);parent.add(g);return g; }
  const sphereGeo=new THREE.SphereGeometry(1,12,8);
  const ell=(p,m,pos,scale)=>mesh(p,sphereGeo,m,pos,scale);
  function tube(parent,points,radius,material,segments=14,sides=4) { const curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p)));return mesh(parent,new THREE.TubeGeometry(curve,segments,material==='gold'?radius*.57:radius,sides,false),material); }
  function taper(parent,points,width,material) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p))), n=20, sides=5;
    const frames=curve.computeFrenetFrames(n,false), positions=[],idx=[];
    for(let i=0;i<=n;i++){const p=curve.getPointAt(i/n),r=width*(1-.92*Math.pow(i/n,1.4));for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;const v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r*.55);positions.push(v.x,v.y,v.z);if(i<n){const k=i*sides+j,l=i*sides+(j+1)%sides;idx.push(k,l,k+sides,l,l+sides,k+sides);}}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(idx);g.computeVertexNormals();return mesh(parent,g,material);
  }
  function gem(parent,p,s=.04) {const m=mesh(parent,new THREE.OctahedronGeometry(s,0),'gem',p);m.scale.set(.75,1.3,.55);return m;}
  // Closed bevelled armour plates keep the silhouette angular at every view.
  function plate(parent,points,material,p=[0,0,0],depth=.018,bevel=.007) {
    const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1});
    return mesh(parent,g,material,p);
  }
  function shell(parent,profile,material,p=[0,0,0],segments=20) {
    const pos=[],idx=[];
    profile.forEach(([y,rx,rz])=>{for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;pos.push(Math.sin(a)*rx,y,Math.cos(a)*rz);}});
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){const a=j*segments+i,b=j*segments+(i+1)%segments;idx.push(a,b,a+segments,b,b+segments,a+segments);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return mesh(parent,g,material,p);
  }
  function edge(parent,points,z,width=.008){return tube(parent,points.map(([x,y])=>[x,y,z]),width,'gold',Math.max(8,points.length*3));}
  function band(parent,y,rx,rz,material='gold',r=.012) { const ps=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;ps.push([Math.cos(a)*rx,y,Math.sin(a)*rz]);}tube(parent,ps,r,material,32); }
  function flourish(parent,cx,cy,z,scale=1) {for(const sign of [-1,1])tube(parent,[[cx,cy-.09*scale,z],[cx+sign*.07*scale,cy-.025*scale,z+.012],[cx+sign*.055*scale,cy+.04*scale,z],[cx+sign*.018*scale,cy+.02*scale,z]],.007*scale,'gold',10);}
  // Adult silhouette: tapered cuirass, layered fauld, articulated plate limbs.
  const pelvis=joint(body,'pelvis',[0,1.22,0]);
  shell(pelvis,[[-.10,.22,.145],[0,.265,.18],[.12,.245,.172],[.19,.20,.14]],'armor');
  band(pelvis,.13,.246,.177);band(pelvis,.04,.263,.185);
  plate(pelvis,[[-.17,.075],[.17,.075],[.13,-.09],[0,-.20],[-.13,-.09]],'armor',[0,0,.17]);
  edge(pelvis,[[-.17,.075],[.17,.075],[.13,-.09],[0,-.20],[-.13,-.09],[-.17,.075]],.193,.010);gem(pelvis,[0,.04,.208],.038);
  pelvis.scale.x=.90;
  const torso=joint(pelvis,'spine',[0,.18,0]);torso.scale.set(.93,1,.91);
  shell(torso,[[-.07,.18,.135],[.04,.158,.137],[.16,.174,.16],[.29,.225,.18],[.40,.238,.16],[.48,.19,.12],[.51,.105,.095]],'armor');
  for(const sign of [-1,1]) {
    const contour=[[sign*.018,.43],[sign*.15,.47],[sign*.235,.38],[sign*.21,.25],[sign*.12,.20],[sign*.025,.24]];
    plate(torso,contour,'armor',[0,0,.137],.027,.012);edge(torso,[...contour,contour[0]],.182,.010);
    tube(torso,[[sign*.21,.46,.08],[sign*.24,.32,.14],[sign*.135,.12,.155],[sign*.16,-.04,.14]],.014,'gold');
    for(let i=0;i<4;i++)flourish(torso,sign*(.067+(i%2)*.025),.01+i*.113,.169-i*.003,.71);
    tube(torso,[[sign*.025,.40,.192],[sign*.09,.36,.195],[sign*.14,.29,.192],[sign*.105,.245,.193]],.006,'gold',10);
    for(let i=0;i<3;i++)ell(torso,'gold',[sign*(.035+i*.022),.12-i*.04,.167],[.008,.018,.006]);
  }
  plate(torso,[[0,.48],[-.026,.36],[-.032,.16],[0,-.06],[.032,.16],[.026,.36]],'gold',[0,0,.166],.014,.003);
  gem(torso,[0,.21,.204],.052);
  ell(torso,'armor',[0,.49,0],[.115,.065,.11]);band(torso,.51,.115,.11);gem(torso,[0,.50,.116],.032);
  const neck=joint(torso,'neck',[0,.53,0]);ell(neck,'skin',[0,.045,0],[.075,.10,.07]);
  const head=joint(neck,'head',[0,.18,.005]);head.scale.setScalar(.94);
  // Sculpted cheek / jaw profile, shaped almond eyes and recessed lids.
  shell(head,[[-.17,.024,.037],[-.148,.058,.061],[-.105,.092,.080],[-.050,.112,.090],[.015,.114,.094],[.08,.107,.089],[.13,.083,.074],[.16,.035,.033]],'skin',[0,0,0],28);
  for(const sign of [-1,1]){
    ell(head,'skin',[sign*.109,-.025,0],[.019,.040,.024]);
    // The outer corner recedes along the cheek rather than protruding as a bead.
    const eyePoints=[[sign*.018,.009,.091],[sign*.041,.019,.096],[sign*.061,.018,.092],[sign*.079,.010,.079],[sign*.059,.001,.091],[sign*.040,-.002,.095],[sign*.018,.009,.091]];
    const ep=[],ei=[];eyePoints.slice(0,-1).forEach(v=>ep.push(...v));ep.push(sign*.047,.008,.098);for(let i=0;i<6;i++)ei.push(6,i,(i+1)%6);
    if(sign>0)for(let i=0;i<ei.length;i+=3)[ei[i+1],ei[i+2]]=[ei[i+2],ei[i+1]];
    const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(ep,3));eg.setIndex(ei);eg.computeVertexNormals();mesh(head,eg,'eye');
    ell(head,'iris',[sign*.046,.008,.099],[.010,.010,.0035]);ell(head,'dark',[sign*.046,.008,.102],[.004,.0075,.0018]);ell(head,'eye',[sign*.043,.013,.104],[.0025,.0025,.001]);
    tube(head,eyePoints.slice(0,4).concat([[sign*.085,.013,.075]]),.0031,'dark',12);
    tube(head,eyePoints.slice(3),.0018,'lip',10);
    tube(head,[[sign*.023,.034,.094],[sign*.045,.042,.096],[sign*.071,.036,.084],[sign*.080,.030,.078]],.0039,'hair',10);
    gem(head,[sign*.115,-.09,.015],.017);tube(head,[[sign*.114,-.03,.01],[sign*.12,-.065,.015]],.003,'gold',4);
    ell(head,'skin',[sign*.010,-.044,.095],[.006,.004,.005]);
  }
  shell(head,[[-.051,.009,.008],[-.036,.013,.015],[-.019,.009,.011],[.025,.006,.005]],'skin',[0,0,.091],12);
  tube(head,[[-.025,-.082,.080],[-.009,-.078,.090],[0,-.082,.093],[.010,-.079,.090],[.026,-.081,.079]],.0039,'lip',12);
  tube(head,[[-.022,-.086,.082],[0,-.092,.091],[.023,-.085,.082]],.004,'lip',12);
  // Side-parted swept hair, with individually curled volumetric locks.
  ell(head,'hair',[0,.065,-.040],[.123,.113,.093]);
  const hairLocks=[];
  for(let i=0;i<20;i++){
    const a=.32*Math.PI+i/19*1.36*Math.PI,x=Math.sin(a)*.105,z=Math.cos(a)*.085-.015;
    const lock=joint(head,'hair-lock-'+i,[x,.12-(i%3)*.014,z]);
    const side=x>=0?1:-1,length=.81+(i%5)*.028,points=[];
    for(let j=0;j<9;j++){const t=j/8,phase=i*.72;points.push([side*(.035*t+.065*Math.sin(t*3.4*Math.PI+phase)*t)+x*.55*t,-length*t,-.025*t+.025*Math.cos(t*3.8*Math.PI+phase)*t]);}
    taper(lock,points,.018+(i%4)*.002,i%4===0?'hairLight':'hair');hairLocks.push(lock);
  }
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const lock=joint(head,'face-curl-'+side+'-'+i,[-.024+side*i*.005,.145-i*.007,.025+i*.006]);
    const points=[[0,0,0],[side*(.069+i*.011),-.042,.060],[side*(.145+i*.010),-.15,.035],[side*(.12+i*.013),-.30,.047],[side*(.196+i*.010),-.43,.060],[side*(.153+i*.012),-.59,.070],[side*(.225+i*.008),-.73,.032],[side*(.177+i*.010),-.85,.012]];
    taper(lock,points,.013+(i%2)*.002,i%2?'hair':'hairLight');hairLocks.push(lock);
  }
  // A woven circlet and connected pointed arches, rather than isolated spikes.
  band(head,.14,.117,.089,'gold',.016);band(head,.18,.125,.093,'gold',.010);
  for(let i=0;i<9;i++){
    const a=i/9*Math.PI*2,b=(i+1)/9*Math.PI*2,x=Math.sin(a)*.12,z=Math.cos(a)*.094,h=i%2?.075:.12;
    const spike=mesh(head,new THREE.ConeGeometry(.015,h,5),'gold',[x,.18+h*.5,z]);spike.rotation.z=-x*.8;
    gem(head,[x,.18+h,z],.012);
    const mid=(a+b)/2;tube(head,[[x,.17,z],[Math.sin(mid)*.13,.245,Math.cos(mid)*.10],[Math.sin(b)*.12,.17,Math.cos(b)*.094]],.007,'gold',10);
    ell(head,'gold',[x,.189,z],[.022,.023,.014]);gem(head,[x,.192,z+.01],.011);
  }
  gem(head,[0,.205,.106],.027);
  const arms=[],legs=[];
  for(const s of [-1,1]){
    const shoulder=joint(torso,s<0?'left-shoulder':'right-shoulder',[s*.275,.40,0]);
    ell(shoulder,'armor',[s*.018,-.025,0],[.12,.075,.10]);
    for(let j=0;j<3;j++){
      const points=[[-.095,-.035-j*.028],[-.12,.026-j*.02],[0,.065-j*.022],[.12,.026-j*.02],[.095,-.035-j*.028],[0,-.067-j*.025]];
      plate(shoulder,points,j===0?'gold':'armor',[s*.025,0,.075-j*.008],.025,.007);edge(shoulder,[...points,points[0]],.108-j*.008,.007);
    }
    const fin=plate(shoulder,[[0,.055],[s*.14,.12],[s*.095,-.055],[0,-.07]],'armor',[s*.07,0,-.015],.08,.008);fin.rotation.y=s*.22;
    tube(shoulder,[[s*.07,.06,.07],[s*.21,.12,.04],[s*.166,-.03,.06]],.008,'gold',8);
    shell(shoulder,[[-.30,.050,.052],[-.20,.060,.060],[-.07,.062,.061]],'armor');
    const elbow=joint(shoulder,'elbow',[0,-.30,0]);ell(elbow,'gold',[0,0,0],[.063,.045,.067]);shell(elbow,[[-.26,.047,.047],[-.17,.064,.060],[-.015,.066,.063]],'armor');
    plate(elbow,[[0,.015],[-.045,-.09],[0,-.245],[.045,-.09]],'armor',[0,0,.064],.016,.005);
    tube(elbow,[[0,0,.082],[s*.025,-.12,.084],[0,-.23,.07]],.011,'gold');flourish(elbow,0,-.11,.084,.6);
    const hand=joint(elbow,'hand',[0,-.265,0]);ell(hand,'armor',[0,-.03,0],[.053,.066,.036]);
    for(let j=0;j<4;j++){const x=(j-1.5)*.021,y=-.073-Math.abs(j-1.5)*.003;tube(hand,[[x,y,.010],[x,y-.030,.017],[x,y-.052,.029]],.008,'armor',4);ell(hand,'gold',[x,y-.014,.020],[.009,.009,.004]);}
    ell(hand,'gold',[-s*.057,-.035,.012],[.012,.036,.013]);arms.push({shoulder,elbow,hand,side:s});
    const hip=joint(pelvis,s<0?'left-hip':'right-hip',[s*.145,-.05,0]);hip.scale.set(.91,1.16,.92);ell(hip,'skin',[0,-.22,0],[.098,.245,.092]);
    // Separate bevelled tassets bend with the hips instead of a rounded skirt.
    const tasset=[[s*-.09,.035],[s*.10,.075],[s*.14,-.12],[s*.075,-.265],[s*-.065,-.19]];
    plate(hip,tasset,'armor',[s*.035,0,.079],.027,.009);edge(hip,[...tasset,tasset[0]],.117,.010);
    tube(hip,[[s*.085,.005,.131],[s*.10,-.09,.139],[s*.03,-.20,.132]],.005,'gold',10);
    plate(hip,[[s*-.067,-.17],[s*.065,-.18],[s*.074,-.32],[0,-.41],[s*-.075,-.32]],'armor',[0,0,.078],.015,.006);
    edge(hip,[[s*-.067,-.17],[s*.065,-.18],[s*.074,-.32],[0,-.41],[s*-.075,-.32],[s*-.067,-.17]],.099,.006);
    const knee=joint(hip,'knee',[0,-.43,0]);ell(knee,'armor',[0,-.04,.015],[.077,.080,.077]);
    plate(knee,[[0,.045],[-.080,-.02],[-.054,-.105],[0,-.155],[.054,-.105],[.080,-.02]],'armor',[0,0,.082],.025,.008);
    edge(knee,[[0,.045],[-.080,-.02],[-.054,-.105],[0,-.155],[.054,-.105],[.080,-.02],[0,.045]],.120,.008);gem(knee,[0,-.04,.134],.028);
    shell(knee,[[-.46,.048,.056],[-.37,.058,.060],[-.22,.077,.070],[-.10,.074,.070]],'armor');
    plate(knee,[[0,-.10],[-.062,-.17],[-.045,-.36],[0,-.455],[.045,-.36],[.062,-.17]],'armor',[0,0,.071],.019,.005);
    tube(knee,[[0,.025,.13],[s*.05,-.15,.10],[0,-.41,.09],[-s*.05,-.15,.10],[0,.025,.13]],.012,'gold');
    for(let j=0;j<3;j++)flourish(knee,0,-.12-j*.095,.093,.65);
    const ankle=joint(knee,'ankle',[0,-.46,0]);ell(ankle,'armor',[0,-.025,.048],[.065,.052,.145]);
    const toe=plate(ankle,[[-.058,0],[.058,0],[.045,.12],[0,.218],[-.045,.12]],'armor',[0,-.046,.075],.048,.006);toe.rotation.x=Math.PI/2;
    tube(ankle,[[-.075,-.03,.14],[0,.005,.225],[.075,-.03,.14]],.011,'gold');legs.push({hip,knee,ankle,side:s});
  }
  // Deforming cape: a real double-sided 3D cloth surface, inexpensive analytic wind.
  const capeGeo=new THREE.PlaneGeometry(1,1,12,16);resources.add(capeGeo);
  const cape=mesh(torso,capeGeo,'red');cape.name='animated-crimson-cape';
  const capePos=capeGeo.attributes.position;
  const capeBase=[];
  for(let i=0;i<capePos.count;i++){const u=capePos.getX(i),v=.5-capePos.getY(i);const x=u*(.52+v*.72),y=.43-v*1.43,z=-.10-.14*v-.06*Math.cos(u*8);capePos.setXYZ(i,x,y,z);capeBase.push(x,y,z);}
  capeGeo.computeVertexNormals();
  for(const s of [-1,1]){ell(torso,'gold',[s*.23,.41,-.06],[.043,.043,.025]);gem(torso,[s*.23,.41,-.09],.025);}
  // Five independently articulated floating blades, all actual closed extruded volumes.
  const swords=[];
  for(let i=0;i<5;i++){
    const sword=joint(root,'floating-sword-'+(i+1),[0,0,0]);
    const outline=[[0,-.94],[-.055,-.73],[-.084,-.36],[-.068,-.14],[-.119,.065],[-.060,.18],[-.038,.22],[.038,.22],[.060,.18],[.119,.065],[.068,-.14],[.084,-.36],[.055,-.73]];
    plate(sword,outline,'armor',[0,0,-.026],.052,.009);
    edge(sword,[...outline,outline[0]],.039,.009);
    const core=[[0,-.85],[-.027,-.62],[-.035,-.20],[-.018,.14],[0,.18],[.018,.14],[.035,-.20],[.027,-.62]];
    plate(sword,core,'gem',[0,0,.033],.012,.003);
    tube(sword,[[0,-.87,.052],[0,-.45,.058],[0,.10,.058]],.007,'glow',12);
    for(const sign of [-1,1]){
      tube(sword,[[0,.20,0],[sign*.11,.25,0],[sign*.20,.19,0],[sign*.26,.30,0],[sign*.29,.17,0],[sign*.19,.10,0]],.018,'gold',15);
      plate(sword,[[sign*.05,.22],[sign*.15,.30],[sign*.24,.40],[sign*.20,.22],[sign*.12,.16]],'armor',[0,0,-.02],.04,.005);
      tube(sword,[[sign*.05,.22,.033],[sign*.15,.30,.033],[sign*.24,.40,.033]],.008,'gold',8);
      for(let j=0;j<3;j++)flourish(sword,sign*.055,-.09-j*.18,.049,.34);
    }
    mesh(sword,new THREE.CylinderGeometry(.025,.030,.24,8),'armor',[0,.36,0]);
    for(let j=0;j<5;j++)band(sword,.27+j*.04,.029,.029,'gold',.008);
    gem(sword,[0,.22,.066],.043);ell(sword,'gold',[0,.52,0],[.030,.045,.025]);gem(sword,[0,.55,0],.027);
    const spiral=[];for(let j=0;j<=24;j++){const t=j/24,a=t*Math.PI*4+i;spiral.push([Math.sin(a)*(.13-.04*t),-.65+t*.95,Math.cos(a)*(.13-.04*t)]);}tube(sword,spiral,.006,'energy',24,4);
    swords.push(sword);
  }
  // Consolidate static meshes per rigid joint & material to keep draw calls modest.
  function batch(group) {
    [...group.children].filter(c=>c.isGroup).forEach(batch);
    const buckets=new Map();for(const m of [...group.children])if(m.isMesh&&m!==cape){const a=buckets.get(m.material)||[];a.push(m);buckets.set(m.material,a);}
    for(const [material,items] of buckets){if(items.length<2)continue;const positions=[],normals=[];for(const m of items){m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();group.remove(m);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));resources.add(g);const m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;group.add(m);}
  }
  if(options.batch!==false)batch(root);
  root.scale.setScalar(options.scale ?? 1);
  let state='idle',elapsed=0,time=0,disposed=false;
  const valid=new Set(['idle','seated','stand','walk','attack','special','hit','defeat']);
  function setState(next,{restart=false}={}){if(!valid.has(next))throw new Error('Unknown Overlord animation: '+next);if(next!==state||restart){state=next;elapsed=0;}}
  function update(dt, input={}) {
    if(disposed)return;dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;
    const reduced=input.motion===false;
    if(input.state&&input.state!==state)setState(input.state);time=reduced?0:Number.isFinite(input.time)?input.time:time+dt;elapsed+=dt;
    const seated=state==='seated'?1:state==='stand'&&!reduced?1-Math.min(1,elapsed/1.25):0;
    const walk=state==='walk',attack=state==='attack',special=state==='special',hit=state==='hit',dead=state==='defeat';
    const cycle=time*7*(input.speed ?? 1),stride=walk&&!reduced?.48:0,breath=Math.sin(time*2)*.008;
    const p=Math.max(0,Math.min(1,Number.isFinite(input.attackProgress)?input.attackProgress:elapsed/(special?2.4:.9)));
    const strike=!reduced&&(attack||special)?Math.sin(p*Math.PI):0,fall=dead?(reduced?1:Math.min(1,elapsed/1.5)):0;
    body.position.set(hit&&!reduced?Math.sin(elapsed*55)*.035*Math.max(0,1-elapsed/.5):0,breath+(walk?Math.abs(Math.sin(cycle))*.025:0)-fall*.36-seated*.37,special?-.07*strike:0);
    body.rotation.set(fall*-.46+(hit&&!reduced?-.12*Math.max(0,1-elapsed/.5):0),attack&&!reduced?Math.sin(p*Math.PI*2)*.18:0,fall*.12);
    pelvis.rotation.z=walk?Math.sin(cycle)*.018:seated?0:-.025;
    torso.rotation.y=walk?Math.sin(cycle)*.07:-.045-strike*.12;torso.rotation.x=special?-.08*strike:0;torso.rotation.z=walk?0:seated?0:.025;
    head.rotation.y=.045+Math.sin(time*.55)*.035;head.rotation.x=fall*.3-strike*.08-.018;
    arms.forEach(({shoulder,elbow,hand,side:s})=>{shoulder.rotation.set(-Math.sin(cycle)*stride*s-strike*(special?1.5:1.1)-(walk||seated?0:s<0?.12:-.045),0,s*.10+s*strike*(special?.65:.12));elbow.rotation.x=-(s<0?.25:.12)-strike*.45-seated*.65;hand.rotation.x=-strike*.35;hand.rotation.z=s*(.06+strike*.10);});
    legs.forEach(({hip,knee,ankle,side:s})=>{hip.rotation.x=Math.sin(cycle)*stride*s-fall*.85-seated*Math.PI*.48;knee.rotation.x=walk?Math.max(0,-Math.sin(cycle)*s)*.65:fall*1.5+seated*Math.PI*.48;ankle.rotation.x=walk?-Math.max(0,Math.sin(cycle)*s)*.2:0;});
    hairLocks.forEach((h,i)=>{h.rotation.x=Math.sin(time*2+i*.6)*.045+strike*.16;h.rotation.z=Math.sin(time*1.5+i*.4)*.035;});
    for(let i=0;i<capePos.count;i++){const x=capeBase[i*3],y=capeBase[i*3+1],z=capeBase[i*3+2],v=(.43-y)/1.43;capePos.setXYZ(i,x+Math.sin(time*2+v*5)*.035*v,y,z-(Math.sin(time*3+v*7+x*5)*.065+strike*.28)*v);}
    capePos.needsUpdate=true;capeGeo.computeVertexNormals();
    swords.forEach((s,i)=>{const a=(i-2)*.53;const x=Math.sin(a)*1.13,y=1.65+Math.cos(a)*.46,z=-.34+Math.cos(a)*.05;
      const launch=reduced?0:attack?(i===Math.floor(p*4.99)?Math.sin((p*5%1)*Math.PI)*1.35:0):special?Math.pow(Math.sin(p*Math.PI),5)*2.0:0;
      s.position.set(x*(1+strike*.13),y+Math.sin(time*2+i)*.045-fall*1.25,z+launch);
      s.rotation.set(launch?-.9*launch:Math.sin(time+i)*.04,0,-a*.38+(special?strike*a*.35:0));s.scale.set(.65*(1-fall*.25),1.1*(1-fall*.25),1-fall*.25);
    });
    mats.glow.emissiveIntensity=dead?.2:1.7+strike*2+Math.sin(time*4)*.25;
    mats.energy.opacity=dead?.05:.24+strike*.50+Math.sin(time*3)*.06;
    return {state,elapsed,attackProgress:p};
  }
  update(0);
  function dispose(){if(disposed)return;disposed=true;root.removeFromParent();resources.forEach(g=>g.dispose());Object.values(mats).forEach(m=>m.dispose());}
  return {group:root,root,update,setState,dispose,joints:{body,pelvis,torso,head,arms,legs},swords,
    metadata:{name:'無名から頂点へ至る覇王 S',special:'無名神話・覇天絶滅斬',height:2.55,seatHeight:.75,standDuration:1.25,swordCount:5,forward:'+Z',style:'original articulated sculpted plate-and-curl volumetric interpretation',states:[...valid]}};
}
