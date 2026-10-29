/** Sculpted native hair, a restrained crown, and a fully curved closed cloak.
 * All geometry belongs to this attachment; supplied materials stay caller-owned.
 * Points below use the anatomical body's bind coordinates (+Z front, +Y up).
 */
const HEAD=[0,2.058189,.057015],TORSO=[0,1.699733,.01743];
const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function createOverlordHairCloth(THREE,{head,torso,materials}){
 const geometries=new Set(),masses=[];let dead=false,lastCloth='';
 const headGroup=new THREE.Group(),torsoGroup=new THREE.Group();
 headGroup.name='sculpted-golden-hair-and-crown';torsoGroup.name='floorlength-crimson-cloak';
 head.add(headGroup);torso.add(torsoGroup);
 const V=p=>new THREE.Vector3(...p);
 const local=(point,anchor)=>point.map((x,i)=>x-anchor[i]);
 function mesh(parent,geometry,material,name=''){
  const uv=geometry.attributes.uv;if(uv)for(let i=0;i<uv.count;i++)uv.setXY(i,clamp(uv.getX(i),0,1),clamp(uv.getY(i),0,1));
  geometries.add(geometry);const object=new THREE.Mesh(geometry,material);object.name=name;
  object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
 }
 function geometry(positions,uvs,indices){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 function tube(parent,points,radius,material,segments=20,sides=5){
  const curve=new THREE.CatmullRomCurve3(points.map(V));
  return mesh(parent,new THREE.TubeGeometry(curve,segments,radius,sides,false),material);
 }
 function pearl(parent,world,radius,material,scale=[1,1,1]){
  const o=mesh(parent,new THREE.SphereGeometry(radius,10,6),material);o.position.set(...local(world,HEAD));o.scale.set(...scale);return o;
 }
 // A shaped scalp dome leaves an open forehead and temples. Unlike a full
 // sphere it never projects a straight sheet of hair across the facial plane.
 {
  const cols=48,rows=20,p=[],uv=[],idx=[],stride=cols+1,layer=(rows+1)*stride;
  for(let inside=0;inside<2;inside++)for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const theta=i/cols*Math.PI*2,front=(1+Math.cos(theta))/2;
   const maxPolar=2.13-1.12*Math.pow(front,3),phi=j/rows*maxPolar;
   const r=inside?.955:1;
   const part=.0025*Math.cos(theta*2)*Math.sin(phi);
   p.push(Math.sin(theta)*Math.sin(phi)*.126*r,
    2.103+Math.cos(phi)*.154*r-HEAD[1],
    .071+Math.cos(theta)*Math.sin(phi)*.151*r+part-HEAD[2]);
   uv.push(i/cols,1-j/rows);
   if(j<rows&&i<cols){const a=inside*layer+j*stride+i,b=a+1,c=a+stride,d=c+1;
    if(inside)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d);
   }
  }
  for(let i=0;i<cols;i++){const a=rows*stride+i,b=a+1,c=a+layer,d=b+layer;idx.push(a,b,c,b,d,c);}
  mesh(headGroup,geometry(p,uv,idx),materials.hair,'parted-scalp-volume');
 }
 // Closed elliptical strands have a readable curved silhouette from any yaw.
 // Their sections taper to points; none is a camera-facing ribbon or card.
 function curl(name,worldPoints,width,depth,highlight,phase){
  const anchor=worldPoints[0],g=new THREE.Group();g.name=name;g.position.set(...local(anchor,HEAD));headGroup.add(g);
  const points=worldPoints.map(p=>V(local(p,anchor))),curve=new THREE.CatmullRomCurve3(points);
  const steps=40,sides=8,frames=curve.computeFrenetFrames(steps,false),p=[],uv=[],idx=[];
  for(let i=0;i<=steps;i++){
   const t=i/steps,center=curve.getPointAt(t),taper=(.78+.28*Math.sin(t*Math.PI))*Math.pow(1-t,.48)+.035;
   for(let j=0;j<=sides;j++){
    const angle=j/sides*Math.PI*2,q=center.clone()
     .addScaledVector(frames.normals[i],Math.cos(angle)*width*taper)
     .addScaledVector(frames.binormals[i],Math.sin(angle)*depth*taper);
    p.push(q.x,q.y,q.z);uv.push(j/sides,1-t);
    if(i<steps&&j<sides){const a=i*(sides+1)+j,b=a+1,c=a+sides+1,d=c+1;idx.push(a,b,c,b,d,c);}
   }
  }
  const start=p.length/3;p.push(...points[0].toArray());uv.push(.5,1);
  const end=p.length/3;p.push(...points.at(-1).toArray());uv.push(.5,0);
  for(let j=0;j<sides;j++){idx.push(start,j+1,j);const a=steps*(sides+1)+j;idx.push(end,a,a+1);}
  mesh(g,geometry(p,uv,idx),materials.hair,name+'-solid');
  if(highlight){
   const line=[];for(let i=0;i<=30;i++){const t=i/30,k=Math.round(t*steps),q=curve.getPointAt(t),taper=(.78+.28*Math.sin(t*Math.PI))*Math.pow(1-t,.48)+.035;
    q.addScaledVector(frames.normals[k],width*taper*.58).addScaledVector(frames.binormals[k],depth*taper*.84);line.push(q.toArray());}
   tube(g,line,.0023,materials.hairLight,30,4);
  }
  masses.push({group:g,phase});return g;
 }
 // Six different long S-curves per side. Wider lower curls blow sideways and
 // backwards, leaving the eyes, cheeks, jaw and breastplate unobstructed.
 for(const side of[-1,1])for(let i=0;i<6;i++){
  const front=i<2,rootY=2.218-i*.018,rootX=side*(.052+i*.014),rootZ=front?.127-i*.018:.054-(i-2)*.033;
  const length=.86+(i%3)*.12+(side>0?.075:0),spread=.18+i*.025;
  const points=[
   [rootX,rootY,rootZ],
   [side*(.137+i*.012),rootY-.095,rootZ+(front?.019:-.010)],
   [side*(.171+i*.022),rootY-.255,front?.105:-.035-i*.015],
   [side*(spread+.095),rootY-.43,-.055-i*.025],
   [side*(spread+.045),rootY-.60,-.092-i*.029],
   [side*(spread+.159),rootY-.77,-.060-i*.027],
   [side*(spread+.115),rootY-length,-.085-i*.028],
  ];
  curl('flowing-S-curl-'+side+'-'+i,points,.032+(i%3)*.006,.024+(i%2)*.006,i===0||i===3,.7*i+side*.4);
 }
 // Swept shorter locks start at the part, clear the brow, then curl beside
 // the cheek. Their upper arc follows the skull rather than crossing the eye.
 for(const side of[-1,1])for(let i=0;i<2;i++){
  curl('swept-face-curl-'+side+'-'+i,[
   [side*.008,2.250-i*.012,.090+i*.020],
   [side*.063,2.231-i*.011,.157+i*.006],
   [side*.119,2.184-i*.019,.180],
   [side*(.151+i*.020),2.090-i*.038,.176-i*.006],
   [side*(.143+i*.028),1.998-i*.053,.190],
   [side*(.204+i*.026),1.910-i*.074,.174],
   [side*(.187+i*.020),1.840-i*.070,.131],
  ],.025-i*.004,.019-i*.002,true,2.4+i+side*.7);
 }
 // Selected small scalp highlights describe the side part without dense wires.
 for(const side of[-1,1])for(let i=0;i<3;i++){
  const points=[[side*.006,2.252-i*.003,.089+i*.012],
   [side*(.054+i*.006),2.230,.145+i*.005],[side*(.102+i*.005),2.191,.174-i*.002],
   [side*(.130+i*.006),2.127,.143-i*.007]].map(p=>local(p,HEAD));
  tube(headGroup,points,.0017,materials.hairLight,18,4);
 }
 // One connected crown silhouette, with short pointed leaves rather than
 // disconnected antennae. Its highest point stays below world y=2.42.
 {
  const n=112,p=[],uv=[],idx=[];
  for(let ring=0;ring<4;ring++)for(let i=0;i<=n;i++){
   const a=i/n*Math.PI*2,outer=ring<2,top=ring%2===1,rx=outer?.127:.118,rz=outer?.116:.107;
   const front=Math.max(0,Math.cos(a)),leaf=Math.pow(Math.max(0,Math.cos(a*7)),9);
   const y=top?2.245+leaf*(.077+.036*front):2.213;
   p.push(Math.sin(a)*rx,y-HEAD[1],.068+Math.cos(a)*rz-HEAD[2]);uv.push(i/n,top?1:0);
  }
  const stride=n+1;
  for(let i=0;i<n;i++){
   const a=i,b=i+1,c=stride+i,d=c+1,e=2*stride+i,f=e+1,g=3*stride+i,h=g+1;
   idx.push(a,b,c,b,d,c,e,g,f,f,g,h,c,d,g,d,h,g,a,e,b,b,e,f);
  }
  mesh(headGroup,geometry(p,uv,idx),materials.gold,'connected-ruby-crown');
  for(let i=0;i<7;i++){
   const a=i/7*Math.PI*2,world=[Math.sin(a)*.129,2.238,.068+Math.cos(a)*.118];
   const jewel=mesh(headGroup,new THREE.OctahedronGeometry(.0105,0),materials.gem);jewel.position.set(...local(world,HEAD));jewel.scale.set(.72,1.25,.6);jewel.rotation.y=a;
  }
  for(const side of[-1,1]){
   const points=[[0,2.252,.192],[side*.039,2.282,.184],[side*.071,2.256,.171],[side*.095,2.239,.148]].map(p=>local(p,HEAD));
   tube(headGroup,points,.0037,materials.goldLight,18,5);
  }
  pearl(headGroup,[0,2.258,.189],.009,materials.gem,[.75,1.3,.60]);
 }
 // The cape is a closed curved cloth volume. Its flared, scalloped hem and
 // asymmetric folds retain depth in frontal, oblique and side-on views.
 const cols=32,rows=40,stride=cols+1,layer=(rows+1)*stride,p=[],uv=[],clothIndices=[[],[]];
 for(let side=0;side<2;side++)for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  p.push(0,0,0);uv.push(i/cols,1-j/rows);
  if(j<rows&&i<cols){const a=side*layer+j*stride+i,b=a+1,c=a+stride,d=c+1;
   const bucket=i===0||i===cols-1||j===rows-1?clothIndices[1]:clothIndices[0];
   if(side)bucket.push(a,b,c,b,d,c);else bucket.push(a,c,b,b,c,d);
  }
 }
 for(let i=0;i<cols;i++){
  let a=i,b=i+1,c=a+layer,d=b+layer;clothIndices[1].push(a,b,c,b,d,c);
  a=rows*stride+i;b=a+1;c=a+layer;d=b+layer;clothIndices[1].push(a,c,b,b,c,d);
 }
 for(let j=0;j<rows;j++)for(const i of[0,cols]){
  const a=j*stride+i,b=a+stride,c=a+layer,d=b+layer;if(i===0)clothIndices[1].push(a,c,b,b,c,d);else clothIndices[1].push(a,b,c,b,d,c);
 }
 const capeGeo=geometry(p,uv,[...clothIndices[0],...clothIndices[1]]);
 capeGeo.clearGroups();capeGeo.addGroup(0,clothIndices[0].length,0);capeGeo.addGroup(clothIndices[0].length,clothIndices[1].length,1);
 const cape=mesh(torsoGroup,capeGeo,[materials.red,materials.gold],'animated-crimson-cape');
 cape.frustumCulled=false;
 const capePositions=capeGeo.attributes.position;
 const clasps=[];
 for(const side of[-1,1]){
  const clasp=mesh(torsoGroup,new THREE.SphereGeometry(.022,12,8),materials.gold);clasp.position.set(...local([side*.212,1.818,-.050],TORSO));clasp.scale.set(1,.78,.45);clasps.push(clasp);
  const ruby=mesh(torsoGroup,new THREE.OctahedronGeometry(.013,0),materials.gem);ruby.position.set(...local([side*.212,1.818,-.040],TORSO));ruby.scale.set(.75,1,.48);
 }
 function update({time=0,motion=true,strike=0,wind=0,defeat=0}={}){
  if(dead)return;
  const t=motion?finite(time):0,s=motion?clamp(finite(strike),0,1):0,w=motion?clamp(finite(wind),-1,1):0,d=clamp(finite(defeat),0,1);
  for(const {group,phase}of masses){
   group.rotation.x=Math.sin(t*1.28+phase)*.014+(s*.07+w*.025)*(1-d*.7);
   group.rotation.y=Math.sin(t*.93+phase)*.012+w*.016;
   group.rotation.z=Math.sin(t*1.05+phase)*.016+w*.024+s*Math.sin(phase)*.025;
  }
  const key=[t,s,w,d].join(',');if(key===lastCloth)return;lastCloth=key;
  for(let side=0;side<2;side++)for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const u=i/cols*2-1,v=j/rows,edge=Math.abs(u),bell=.246+.37*v+.085*Math.sin(v*Math.PI),asym=.052*Math.max(0,u)*v;
   const fold=Math.cos(u*Math.PI*5.1+v*.68)*(.020+.029*v)*Math.sin(v*Math.PI*.86);
   const flutter=motion?Math.sin(t*1.65+v*5.4+u*2.0)*.030*v*v:0;
   const x=u*(bell+asym)+(.075*w+.065*s)*v*v+Math.sin(t*.85+v*3)*.014*v*v;
   const y=1.842-v*1.778+.042*Math.cos(u*Math.PI*3+.4)*Math.pow(v,5)+.028*edge*edge*(1-v)-.05*d*v*(1-v);
   const z=-.086-.167*v-.090*Math.sin(v*Math.PI)+.227*Math.pow(edge,2.2)*Math.pow(v,.8)+fold-flutter-s*.095*v+w*.035*u*v-side*.006;
   const index=side*layer+j*stride+i;capePositions.setXYZ(index,x-TORSO[0],y-TORSO[1],z-TORSO[2]);
  }
  capePositions.needsUpdate=true;capeGeo.computeVertexNormals();
 }
 update({motion:false});
 // Merge only static, same-material meshes. Curl groups retain independent
 // pivots for cheap movement; no shared material is cloned or disposed here.
 function batchStatic(group){
  const buckets=new Map();for(const object of [...group.children])if(object.isMesh&&!Array.isArray(object.material)){
   const list=buckets.get(object.material)||[];list.push(object);buckets.set(object.material,list);
  }
  for(const [material,objects]of buckets){if(objects.length<2)continue;
   const positions=[],normals=[],uvs=[];
   for(const object of objects){object.updateMatrix();const g=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();g.applyMatrix4(object.matrix);
    positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);uvs.push(...g.attributes.uv.array);g.dispose();group.remove(object);
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));mesh(group,g,material,'sculpted-static-details');
  }
 }
 batchStatic(headGroup);batchStatic(torsoGroup);
 function dispose(){if(dead)return;dead=true;headGroup.removeFromParent();torsoGroup.removeFromParent();for(const g of geometries)g.dispose();geometries.clear();}
 return {headGroup,torsoGroup,cape,update,dispose,metadata:{curlMasses:masses.length,crownMaxY:2.358,capeFloorY:.02,geometryOwned:true,materialsOwned:false}};
}
