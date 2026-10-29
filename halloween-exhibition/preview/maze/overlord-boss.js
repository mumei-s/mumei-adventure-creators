/** Articulated, genuinely volumetric Overlord S. +Z forward; Y up.
 * Geometry and materials are owned here; supplied surface textures stay caller-owned.
 * Texture installation needs no loaders, network or DOM and is safe after creation. */
export function overlordFaceUV(x,y,{atlasWarp=true}={}){
  const clamp=v=>Math.max(0,Math.min(1,v));let u=clamp(x/.23+.5),top=1-clamp((y+.17)/.33);
  if(atlasWarp){
    u=clamp(.5+(u-.5)*1.20);
    // Match the generated facial albedo's measured eyes, nose and mouth to
    // the anatomical surface, without stretching its feature spacing globally.
    const landmarks=[[0,0],[.36,.18],[.43,.25],[.46,.31],[.49,.38],[.62,.60],[.72,.70],[.74,.78],[.77,.86],[1,1]];
    for(let i=1;i<landmarks.length;i++)if(top<=landmarks[i][0]){const [a,b]=[landmarks[i-1],landmarks[i]],t=(top-a[0])/(b[0]-a[0]);top=a[1]+(b[1]-a[1])*t;break;}
  }
  return [u,1-top];
}
export function createOverlordBoss(THREE, options = {}) {
  const root = new THREE.Group(); root.name = 'Overlord S — volumetric articulated character';
  const body = new THREE.Group(); root.add(body);
  const mats = {
    armor: new THREE.MeshStandardMaterial({color:0x18131e,metalness:.78,roughness:.28,emissive:0x110c14,emissiveIntensity:.12}),
    gold: new THREE.MeshStandardMaterial({color:0xd9aa48,metalness:.82,roughness:.24,emissive:0x55390b,emissiveIntensity:.09}),
    goldLight: new THREE.MeshStandardMaterial({color:0xf5d98a,metalness:.65,roughness:.28}),
    skin: new THREE.MeshStandardMaterial({color:0xf0bea5,roughness:.56}),
    face: new THREE.MeshStandardMaterial({color:0xf0bea5,roughness:.65}),
    hair: new THREE.MeshStandardMaterial({color:0xba8b42,metalness:.08,roughness:.49}),
    hairLight: new THREE.MeshStandardMaterial({color:0xf2ce86,metalness:.08,roughness:.42}),
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
  function ensureUV(geo,force=false){
    if(geo.attributes.uv&&!force){
      const uv=geo.attributes.uv;
      // Sphere poles intentionally extend their UV seam by half a segment;
      // packed atlas regions need those tiny extensions clamped locally too.
      for(let i=0;i<uv.count;i++)uv.setXY(i,THREE.MathUtils.clamp(uv.getX(i),0,1),THREE.MathUtils.clamp(uv.getY(i),0,1));
      return geo;
    }
    geo.computeBoundingBox();const b=geo.boundingBox,dx=Math.max(.001,b.max.x-b.min.x),dy=Math.max(.001,b.max.y-b.min.y),uv=[];
    const pos=geo.attributes.position;for(let i=0;i<pos.count;i++)uv.push((pos.getX(i)-b.min.x)/dx,(pos.getY(i)-b.min.y)/dy);
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geo;
  }
  function mesh(parent, geo, material, p=[0,0,0], s=[1,1,1]) { ensureUV(geo);resources.add(geo); const m=new THREE.Mesh(geo,mats[material]); m.position.set(...p);m.scale.set(...s);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
  function joint(parent,name,p) { const g=new THREE.Group();g.name=name;g.position.set(...p);parent.add(g);return g; }
  const sphereGeo=new THREE.SphereGeometry(1,20,14);
  const ell=(p,m,pos,scale)=>mesh(p,sphereGeo,m,pos,scale);
  function tube(parent,points,radius,material,segments=14,sides=4) { const curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p)));return mesh(parent,new THREE.TubeGeometry(curve,segments,material==='gold'?radius*.57:radius,sides,false),material); }
  function taper(parent,points,width,material) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p))), n=28, sides=6;
    const frames=curve.computeFrenetFrames(n,false), positions=[],uv=[],idx=[];
    for(let i=0;i<=n;i++){const p=curve.getPointAt(i/n),r=width*(1-.96*Math.pow(i/n,2.3));for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;const v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r*.70);positions.push(v.x,v.y,v.z);uv.push(j/sides,1-i/n);if(i<n&&j<sides){const k=i*(sides+1)+j,l=k+1;idx.push(k,l,k+sides+1,l,l+sides+1,k+sides+1);}}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(parent,g,material);
  }
  function gem(parent,p,s=.04) {const m=mesh(parent,new THREE.OctahedronGeometry(s,0),'gem',p);m.scale.set(.75,1.3,.55);return m;}
  // Closed bevelled armour plates keep the silhouette angular at every view.
  function plate(parent,points,material,p=[0,0,0],depth=.018,bevel=.007) {
    const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1});
    // ExtrudeGeometry's default side/front coordinates may leave 0..1, which
    // would cross into another quadrant of the shared material atlas.
    ensureUV(g,true);
    return mesh(parent,g,material,p);
  }
  function shell(parent,profile,material,p=[0,0,0],segments=28) {
    const pos=[],uv=[],idx=[],y0=profile[0][0],dy=Math.max(.001,profile.at(-1)[0]-y0);
    profile.forEach(([y,rx,rz])=>{for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;pos.push(Math.sin(a)*rx,y,Math.cos(a)*rz);uv.push(i/segments,(y-y0)/dy);}});
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+1;idx.push(a,b,a+segments+1,b,b+segments+1,a+segments+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(parent,g,material,p);
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
  // The covered cuirass has its own rounded depth. Relief follows that depth
  // instead of decorating a paper-thin front panel.
  for(const sign of[-1,1])ell(torso,'armor',[sign*.106,.347,.080],[.132,.137,.119]);
  const cuirassDepth=(x,y)=>Math.max(.163,.080+.119*Math.sqrt(Math.max(.02,1-Math.pow((Math.abs(x)-.106)/.132,2)-Math.pow((y-.347)/.137,2))))+.008;
  for(const sign of [-1,1]) {
    const contour=[[sign*.018,.43],[sign*.15,.47],[sign*.235,.38],[sign*.21,.25],[sign*.12,.20],[sign*.025,.24]];
    plate(torso,contour,'armor',[0,0,.137],.027,.012);tube(torso,[...contour,contour[0]].map(([x,y])=>[x,y,cuirassDepth(x,y)]),.010,'gold',24);
    tube(torso,[[sign*.21,.46,.08],[sign*.24,.32,.14],[sign*.135,.12,.155],[sign*.16,-.04,.14]],.014,'gold');
    for(let i=0;i<4;i++)flourish(torso,sign*(.067+(i%2)*.025),.01+i*.113,.169-i*.003,.71);
    tube(torso,[[sign*.025,.40,.192],[sign*.09,.36,.195],[sign*.14,.29,.192],[sign*.105,.245,.193]],.006,'gold',10);
    for(let row=0;row<3;row++){
      const yy=.28+row*.052,xx=sign*(.065+(row%2)*.045),curve=[];
      for(let j=0;j<=12;j++){const a=j/12*Math.PI*1.65,x=xx+Math.cos(a)*.030,y=yy+Math.sin(a)*.024;curve.push([x,y,cuirassDepth(x,y)+.003]);}
      tube(torso,curve,.0045,'gold',18);
    }
    for(let i=0;i<3;i++)ell(torso,'gold',[sign*(.035+i*.022),.12-i*.04,.167],[.008,.018,.006]);
  }
  plate(torso,[[0,.48],[-.026,.36],[-.032,.16],[0,-.06],[.032,.16],[.026,.36]],'gold',[0,0,.166],.014,.003);
  gem(torso,[0,.21,.204],.052);
  ell(torso,'armor',[0,.49,0],[.115,.065,.11]);band(torso,.51,.115,.11);gem(torso,[0,.50,.116],.032);
  const neck=joint(torso,'neck',[0,.53,0]);ell(neck,'skin',[0,.045,0],[.075,.10,.07]);
  const head=joint(neck,'head',[0,.18,.005]);head.scale.setScalar(.94);
  // Smooth cranial volume with a separate sculpted facial surface. The face is
  // a curved half-head with nose/cheek relief, never a portrait plane.
  const cranialProfile=[[-.172,.014,.030],[-.155,.043,.050],[-.130,.070,.069],[-.095,.090,.083],[-.050,.107,.092],[0,.114,.095],[.060,.111,.092],[.115,.095,.083],[.150,.061,.059],[.166,.017,.024]];
  const cranialCurve=new THREE.CatmullRomCurve3(cranialProfile.map(([y,rx,rz])=>V(rx,y,rz)));
  const cranialRows=[];for(let i=0;i<=32;i++){const p=cranialCurve.getPoint(i/32);cranialRows.push([p.y,Math.max(.006,p.x),Math.max(.01,p.z)]);}
  // Only the rear half uses plain skin. A second untextured front would cover
  // the recessed eye sockets once the facial albedo is installed.
  {const pos=[],uv=[],idx=[],cols=48;
    cranialRows.forEach(([y,rx,rz])=>{for(let i=0;i<=cols;i++){const angle=Math.PI/2+i/cols*Math.PI;pos.push(Math.sin(angle)*rx,y,Math.cos(angle)*rz);uv.push(i/cols,(y+.172)/.338);}});
    for(let j=0;j<cranialRows.length-1;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1;idx.push(a,b,a+cols+1,b,b+cols+1,a+cols+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const rear=mesh(head,g,'skin');rear.name='cranial-rear-volume';
  }
  const gauss=(x,c,w)=>Math.exp(-Math.pow((x-c)/w,2));
  const faceDepth=(x,y,rx,rz)=>{
    const front=rz*Math.sqrt(Math.max(0,1-Math.pow(x/rx,2)));
    const bridge=.014*gauss(x,0,.014)*gauss(y,-.015,.047);
    const tip=.015*gauss(x,0,.021)*gauss(y,-.048,.016);
    const cheeks=.0045*(gauss(x,-.065,.029)+gauss(x,.065,.029))*gauss(y,-.026,.027);
    const sockets=.003*(gauss(x,-.047,.023)+gauss(x,.047,.023))*gauss(y,.009,.017);
    const lips=.003*gauss(x,0,.030)*gauss(y,-.086,.015);
    return front+bridge+tip+cheeks-sockets+lips+.001;
  };
  function facialZ(x,y){
    let pair=cranialRows.findIndex(p=>p[0]>=y);pair=Math.max(1,pair<0?cranialRows.length-1:pair);
    const a=cranialRows[pair-1],b=cranialRows[pair],t=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
    return faceDepth(x,y,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t);
  }
  {const pos=[],uv=[],idx=[],cols=48;
    cranialRows.forEach(([y,rx,rz])=>{for(let i=0;i<=cols;i++){const angle=(i/cols-.5)*Math.PI,x=Math.sin(angle)*rx;pos.push(x,y,faceDepth(x,y,rx,rz));const mapped=typeof options.faceUVTransform==='function'?options.faceUVTransform(x,y):overlordFaceUV(x,y,{atlasWarp:options.faceUVTransform!==false});uv.push(...mapped);}});
    for(let j=0;j<cranialRows.length-1;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1;idx.push(a,b,a+cols+1,b,b+cols+1,a+cols+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const face=mesh(head,g,'face');face.name='sculpted-face-surface';
  }
  const facialFeatures=joint(head,'procedural-facial-details',[0,0,0]);
  for(const sign of [-1,1]){
    ell(head,'skin',[sign*.109,-.025,-.005],[.017,.036,.023]);
    const pts=[[.018,.008],[.035,.018],[.054,.018],[.073,.010],[.055,-.001],[.036,-.002]];
    const positions=[],indices=[];for(const [x,y]of pts)positions.push(sign*x,y,facialZ(sign*x,y)+.002);
    positions.push(sign*.047,.008,facialZ(sign*.047,.008)+.003);
    for(let i=0;i<pts.length;i++){if(sign<0)indices.push(6,i,(i+1)%pts.length);else indices.push(6,(i+1)%pts.length,i);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();mesh(facialFeatures,geo,'eye');
    const iz=facialZ(sign*.047,.008)+.005;
    ell(facialFeatures,'iris',[sign*.047,.008,iz],[.0085,.009,.002]);ell(facialFeatures,'dark',[sign*.047,.008,iz+.002],[.0032,.006,.001]);ell(facialFeatures,'eye',[sign*.044,.012,iz+.003],[.0018,.0018,.001]);
    const lid=pts.slice(0,4).map(([x,y])=>[sign*x,y,facialZ(sign*x,y)+.004]);tube(facialFeatures,lid,.0022,'dark',12);
    const brow=[[.022,.034],[.043,.041],[.063,.036],[.076,.029]].map(([x,y])=>[sign*x,y,facialZ(sign*x,y)+.003]);tube(facialFeatures,brow,.0027,'hair',12);
    gem(head,[sign*.114,-.083,.005],.013);tube(head,[[sign*.112,-.030,.002],[sign*.116,-.068,.005]],.0025,'gold',6);
  }
  const upper=[[-.025,-.084],[-.010,-.080],[0,-.083],[.011,-.080],[.025,-.084]],lower=[[-.023,-.086],[0,-.091],[.023,-.086]];
  tube(facialFeatures,upper.map(([x,y])=>[x,y,facialZ(x,y)+.002]),.0024,'lip',14);
  tube(facialFeatures,lower.map(([x,y])=>[x,y,facialZ(x,y)+.002]),.0025,'lip',14);
  // A continuous back-hair volume supports the silhouette. Thick flowing
  // curls sit on that mass, so oblique views never reveal a cage of thin wires.
  ell(head,'hair',[0,.062,-.038],[.128,.116,.097]);
  const hairProfile=[[-.94,.005,.010],[-.88,.105,.048],[-.72,.184,.076],[-.52,.226,.082],[-.30,.208,.078],[-.10,.166,.077],[.075,.119,.082],[.145,.025,.022]];
  const hairCurve=new THREE.CatmullRomCurve3(hairProfile.map(([y,rx,rz])=>V(rx,y,rz))),hairRows=[];
  for(let i=0;i<=28;i++){const p=hairCurve.getPoint(i/28);hairRows.push([p.y,Math.max(.005,p.x),Math.max(.01,p.z)]);}
  const backHair=shell(head,hairRows,'hair',[0,0,-.095],36);backHair.name='flowing-hair-volume';
  const hairLocks=[];
  for(let i=0;i<26;i++){
    const a=.25*Math.PI+i/25*1.5*Math.PI,x=Math.sin(a)*.107,z=Math.cos(a)*.086-.025;
    const lock=joint(head,'hair-lock-'+i,[x,.115-(i%3)*.011,z]);
    const side=x>=0?1:-1,length=.88+(i%5)*.028,points=[];
    for(let j=0;j<10;j++){
      const t=j/9,phase=i*.63;
      points.push([side*(.10*t+.071*Math.sin(t*3.2*Math.PI+phase)*t),-length*t,-.012*t+.042*Math.cos(t*3.3*Math.PI+phase)*t]);
    }
    taper(lock,points,.027+(i%4)*.003,i%4===0?'hairLight':'hair');hairLocks.push(lock);
  }
  for(const side of [-1,1])for(let i=0;i<6;i++){
    const lock=joint(head,'face-curl-'+side+'-'+i,[-.016+side*i*.005,.142-i*.006,.033+i*.004]);
    const points=[[0,0,0],[side*(.068+i*.010),-.030,.067],[side*(.130+i*.010),-.125,.058],[side*(.125+i*.013),-.275,.069],[side*(.197+i*.012),-.421,.085],[side*(.162+i*.011),-.580,.092],[side*(.231+i*.009),-.728,.040],[side*(.188+i*.010),-.884,.025]];
    taper(lock,points,.024+(i%3)*.003,i%3===0?'hairLight':'hair');hairLocks.push(lock);
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
  for(const side of[-1,1]){
    tube(head,[[side*.015,.174,.098],[side*.034,.230,.100],[side*.069,.260,.081],[side*.091,.216,.071],[side*.067,.188,.087]],.005,'gold',20);
    tube(head,[[side*.022,.183,.106],[side*.048,.204,.102],[side*.068,.184,.090]],.004,'goldLight',14);
    gem(head,[side*.067,.237,.088],.010);
  }
  const arms=[],legs=[];
  for(const s of [-1,1]){
    const shoulder=joint(torso,s<0?'left-shoulder':'right-shoulder',[s*.275,.40,0]);
    ell(shoulder,'armor',[s*.018,-.025,0],[.135,.090,.123]);
    for(let j=0;j<3;j++){
      const points=[[-.095,-.035-j*.028],[-.12,.026-j*.02],[0,.065-j*.022],[.12,.026-j*.02],[.095,-.035-j*.028],[0,-.067-j*.025]];
      plate(shoulder,points,'armor',[s*.025,0,.075-j*.008],.025,.007);edge(shoulder,[...points,points[0]],.108-j*.008,.007);
    }
    const fin=plate(shoulder,[[0,.055],[s*.14,.12],[s*.095,-.055],[0,-.07]],'armor',[s*.07,0,-.015],.08,.008);fin.rotation.y=s*.22;
    tube(shoulder,[[s*.07,.06,.07],[s*.21,.12,.04],[s*.166,-.03,.06]],.008,'gold',8);
    for(let spike=0;spike<3;spike++){
      const prong=mesh(shoulder,new THREE.ConeGeometry(.017,.075+spike*.014,6),'gold',[s*(.10+spike*.036),.050+spike*.009,-.030+spike*.026]);prong.rotation.z=-s*(.36+spike*.10);
    }
    shell(shoulder,[[-.30,.050,.052],[-.20,.060,.060],[-.07,.062,.061]],'armor');
    for(const yy of[-.09,-.17,-.25])band(shoulder,yy,.061,.061,'gold',.007);
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
    tube(ankle,[[-.065,-.03,.14],[0,.005,.225],[.065,-.03,.14]],.011,'gold');
    mesh(ankle,new THREE.CylinderGeometry(.021,.015,.09,8),'armor',[0,-.067,-.048]);
    legs.push({hip,knee,ankle,side:s});
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
    for(const [material,items] of buckets){if(items.length<2)continue;const positions=[],normals=[],uvs=[];for(const m of items){m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);uvs.push(...g.attributes.uv.array);g.dispose();group.remove(m);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));resources.add(g);const m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;group.add(m);}
  }
  if(options.batch!==false)batch(root);
  root.scale.setScalar(options.scale ?? 1);
  let state='idle',elapsed=0,time=0,disposed=false;
  const valid=new Set(['idle','seated','stand','walk','attack','special','hit','defeat']);
  function setTextures(textures={}){
    if(disposed)return false;
    const install=(names,texture,tint)=>{for(const name of names){const m=mats[name];m.map=texture||null;if(tint!==undefined)m.color.set(texture?0xffffff:tint);m.needsUpdate=true;}};
    if(Object.prototype.hasOwnProperty.call(textures,'face')){
      install(['face'],textures.face,0xf0bea5);facialFeatures.visible=!textures.face;
    }
    if(Object.prototype.hasOwnProperty.call(textures,'armor'))install(['armor'],textures.armor,0x18131e);
    if(Object.prototype.hasOwnProperty.call(textures,'hair')){
      install(['hair'],textures.hair,0xba8b42);install(['hairLight'],textures.hair,0xf2ce86);
      if(textures.hair)mats.hairLight.color.set(0xffedc3);
    }
    if(Object.prototype.hasOwnProperty.call(textures,'cape'))install(['red'],textures.cape,0x790c25);
    return true;
  }
  function setState(next,{restart=false}={}){if(!valid.has(next))throw new Error('Unknown Overlord animation: '+next);if(next!==state||restart){state=next;elapsed=0;}}
  function update(dt, input={}) {
    if(disposed)return;dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;
    const reduced=input.motion===false;
    if(input.state&&input.state!==state)setState(input.state);time=reduced?0:Number.isFinite(input.time)?input.time:time+dt;elapsed+=dt;
    const seated=state==='seated'?1:state==='stand'&&!reduced?1-Math.min(1,elapsed/1.25):0;
    const walk=state==='walk',attack=state==='attack',special=state==='special',hit=state==='hit',dead=state==='defeat';
    const gaitRate=THREE.MathUtils.clamp(Number.isFinite(input.speed)?input.speed:1,.45,1.45);
    const cycle=time*6.7*gaitRate,stride=walk&&!reduced?.43:0,breath=Math.sin(time*2)*.006;
    const p=Math.max(0,Math.min(1,Number.isFinite(input.attackProgress)?input.attackProgress:elapsed/(special?2.4:.9)));
    const strike=!reduced&&(attack||special)?Math.sin(p*Math.PI):0,fall=dead?(reduced?1:Math.min(1,elapsed/1.5)):0;
    body.position.set(hit&&!reduced?Math.sin(elapsed*55)*.035*Math.max(0,1-elapsed/.5):0,breath+(walk?Math.abs(Math.sin(cycle))*.025:0)-fall*.36-seated*.37,special?-.07*strike:0);
    body.rotation.set(fall*-.46+(hit&&!reduced?-.12*Math.max(0,1-elapsed/.5):0),attack&&!reduced?Math.sin(p*Math.PI*2)*.18:0,fall*.12);
    pelvis.rotation.z=walk?Math.sin(cycle)*.018:seated?0:-.025;
    torso.rotation.y=walk?Math.sin(cycle)*.07:-.045-strike*.12;torso.rotation.x=special?-.08*strike:0;torso.rotation.z=walk?0:seated?0:.025;
    head.rotation.y=.045+Math.sin(time*.55)*.035;head.rotation.x=fall*.3-strike*.08-.018;
    arms.forEach(({shoulder,elbow,hand,side:s})=>{shoulder.rotation.set(-Math.sin(cycle)*stride*s-strike*(special?1.5:1.1)-(walk||seated?0:s<0?.12:-.045),0,s*.10+s*strike*(special?.65:.12));elbow.rotation.x=-(s<0?.25:.12)-strike*.45-seated*.65;hand.rotation.x=-strike*.35;hand.rotation.z=s*(.06+strike*.10);});
    legs.forEach(({hip,knee,ankle,side:s})=>{hip.rotation.x=Math.sin(cycle)*stride*s-fall*.85-seated*Math.PI*.48;knee.rotation.x=walk?Math.max(0,-Math.sin(cycle)*s)*.65:fall*1.5+seated*Math.PI*.48;ankle.rotation.x=walk?-Math.max(0,Math.sin(cycle)*s)*.2:0;});
    hairLocks.forEach((h,i)=>{h.rotation.x=Math.sin(time*1.8+i*.6)*.023+strike*.11;h.rotation.z=Math.sin(time*1.3+i*.4)*.021;});
    for(let i=0;i<capePos.count;i++){const x=capeBase[i*3],y=capeBase[i*3+1],z=capeBase[i*3+2],v=(.43-y)/1.43;capePos.setXYZ(i,x+Math.sin(time*2+v*5)*.035*v,y,z-(Math.sin(time*3+v*7+x*5)*.065+strike*.28)*v);}
    capePos.needsUpdate=true;capeGeo.computeVertexNormals();
    const swordSpread=THREE.MathUtils.clamp(Number.isFinite(input.swordSpread)?input.swordSpread:1,.55,1.1);
    swords.forEach((s,i)=>{const a=(i-2)*.53;const x=Math.sin(a)*1.13*swordSpread,y=1.65+Math.cos(a)*.46,z=-.34+Math.cos(a)*.05;
      const launch=reduced?0:attack?(i===Math.floor(p*4.99)?Math.sin((p*5%1)*Math.PI)*1.35:0):special?Math.pow(Math.sin(p*Math.PI),5)*2.0:0;
      s.position.set(x*(1+strike*.13),y+Math.sin(time*2+i)*.045-fall*1.25,z+launch);
      s.rotation.set(launch?-.9*launch:Math.sin(time+i)*.04,0,(-a*.38+(special?strike*a*.35:0))*swordSpread);s.scale.set(.65*(1-fall*.25),1.1*(1-fall*.25),1-fall*.25);
    });
    mats.glow.emissiveIntensity=dead?.2:1.7+strike*2+Math.sin(time*4)*.25;
    mats.energy.opacity=dead?.05:.24+strike*.50+Math.sin(time*3)*.06;
    return {state,elapsed,attackProgress:p};
  }
  if(options.textures)setTextures(options.textures);
  update(0);
  function dispose(){if(disposed)return;disposed=true;root.removeFromParent();resources.forEach(g=>g.dispose());Object.values(mats).forEach(m=>m.dispose());}
  return {group:root,root,update,setState,setTextures,dispose,materials:mats,joints:{body,pelvis,torso,head,arms,legs},swords,
    metadata:{name:'無名から頂点へ至る覇王 S',special:'無名神話・覇天絶滅斬',height:2.55,bodyHeight:2.45,seatHeight:.75,standDuration:1.25,swordCount:5,forward:'+Z',style:'original articulated volumetric queen with sculpted face and caller-owned surface textures',textureUV:{face:{x:[-.115,.115],y:[-.17,.16],baseU:'x/.23+.5',baseV:'(y+.17)/.33',atlasWarp:options.faceUVTransform!==false,eyeTop:[.46,.31],noseTop:[.62,.60],mouthTop:[.74,.78]},armor:'cylindrical or planar local 0..1',hair:'strand width u; length v',cape:'cloth 0..1'},states:[...valid]}};
}
