/** Layered native curls, a pierced ruby diadem, and a fully curved closed cloak.
 * All geometry belongs to this attachment; supplied materials stay caller-owned.
 * Points below use the anatomical body's bind coordinates (+Z front, +Y up).
 */
const HEAD=[0,2.058189,.057015],TORSO=[0,1.699733,.01743];
const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function createOverlordHairCloth(THREE,{head,torso,materials,fineHair=false}){
 if(fineHair&&!materials.hairFiber)throw new Error('Fine Overlord hair requires its untextured hairFiber material');
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
 if(!fineHair){
  const cols=48,rows=20,p=[],uv=[],idx=[],stride=cols+1,layer=(rows+1)*stride;
  for(let inside=0;inside<2;inside++)for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const theta=i/cols*Math.PI*2,front=(1+Math.cos(theta))/2;
   const maxPolar=2.13-.85*Math.pow(front,3),phi=j/rows*maxPolar;
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
 function curl(name,worldPoints,width,depth,highlight,phase,{steps=40,sides=8}={}){
  const anchor=worldPoints[0],g=new THREE.Group();g.name=name;g.position.set(...local(anchor,HEAD));headGroup.add(g);
  const points=worldPoints.map(p=>V(local(p,anchor))),curve=new THREE.CatmullRomCurve3(points);
  if(fineHair){
   const count=name.startsWith('flowing-S-curl')?12:name.startsWith('swept-face-curl')?8:3;
   const segments=28,radial=3,frames=curve.computeFrenetFrames(segments,false),p=[],uv=[],colors=[],idx=[];
   const palette=[0xf1d296,0xe6bf7c,0xd3a562,0xbe8d49,0xf6dfaf,0xdcb472].map(hex=>new THREE.Color(hex));
   for(let fiber=0;fiber<count;fiber++){
    const angle=fiber*2.3999632297+phase,spread=Math.sqrt((fiber+.35)/count)*.84;
    const nx=Math.cos(angle)*width*spread,bz=Math.sin(angle)*depth*spread;
    const radius=.0008+.0004*(.5+.5*Math.sin(fiber*1.73+phase)),color=palette[(fiber+Math.floor(Math.abs(phase)*3))%palette.length];
    const start=p.length/3;
    for(let j=0;j<=segments;j++){
     const t=j/segments,c=curve.getPointAt(t),n=frames.normals[j],b=frames.binormals[j];
     const taper=(.88+.12*Math.sin(t*Math.PI))*Math.pow(1-t,.40)+.035;
     const envelope=Math.sin(t*Math.PI),wave=Math.sin(t*Math.PI*4+fiber*.67+phase)*.00075*envelope;
     const center=c.clone().addScaledVector(n,nx*taper+wave).addScaledVector(b,bz*taper+Math.cos(t*Math.PI*3+angle)*.00045*envelope);
     const r=radius*(.94*Math.pow(1-t,.35)+.045),shade=.90+.10*Math.sin(t*Math.PI);
     for(let k=0;k<=radial;k++){
      const a=k/radial*Math.PI*2,q=center.clone().addScaledVector(n,Math.cos(a)*r).addScaledVector(b,Math.sin(a)*r);
      p.push(q.x,q.y,q.z);uv.push(k/radial,1-t);colors.push(color.r*shade,color.g*shade,color.b*shade);
      if(j<segments&&k<radial){const a=start+j*(radial+1)+k,b=a+1,c=a+radial+1,d=c+1;idx.push(a,b,c,b,d,c);}
     }
    }
    const root=p.length/3,tip=root+1;
    const first=new THREE.Vector3(),last=new THREE.Vector3();
    for(let k=0;k<radial;k++){
     first.add(new THREE.Vector3(p[(start+k)*3],p[(start+k)*3+1],p[(start+k)*3+2]));
     const e=start+segments*(radial+1)+k;last.add(new THREE.Vector3(p[e*3],p[e*3+1],p[e*3+2]));
    }
    first.multiplyScalar(1/radial);last.multiplyScalar(1/radial);
    p.push(...first.toArray(),...last.toArray());uv.push(.5,1,.5,0);
    colors.push(color.r*.9,color.g*.9,color.b*.9,color.r*.9,color.g*.9,color.b*.9);
    for(let k=0;k<radial;k++){idx.push(root,start+k+1,start+k);const e=start+segments*(radial+1)+k;idx.push(tip,e,e+1);}
   }
   const bundle=geometry(p,uv,idx);bundle.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
   mesh(g,bundle,materials.hairFiber,name+'-opaque-fiber-bundle');masses.push({group:g,phase});return g;
  }
  const frames=curve.computeFrenetFrames(steps,false),p=[],uv=[],idx=[];
  // Each lock samples only a slender part of the existing hair map. Mapping
  // the full sheet around every lock produced repeated broad white stripes.
  const mapU=.19+(.5+.5*Math.sin(phase*2.17))*.50,mapWidth=.016;
  for(let i=0;i<=steps;i++){
   const t=i/steps,center=curve.getPointAt(t),taper=(.78+.28*Math.sin(t*Math.PI))*Math.pow(1-t,.48)+.035;
   for(let j=0;j<=sides;j++){
    const angle=j/sides*Math.PI*2,q=center.clone()
     .addScaledVector(frames.normals[i],Math.cos(angle)*width*taper)
     .addScaledVector(frames.binormals[i],Math.sin(angle)*depth*taper);
    p.push(q.x,q.y,q.z);uv.push(mapU+(j/sides-.5)*mapWidth,.07+.88*(1-t));
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
   tube(g,line,.00045,materials.hairLight,30,4);
  }
  masses.push({group:g,phase});return g;
 }
 // Ten finer closed curls per side replace the former few thick ropes.
 // The front layer follows the outer jaw; the back layers keep real volume.
 for(const side of[-1,1])for(let i=0;i<10;i++){
  const front=i<3,rootY=2.230-i*.010,rootX=side*(.025+i*.009),rootZ=front?.145-i*.012:.065-(i-3)*.020;
  const length=.91+(i%4)*.075+(side>0?.035:0),spread=.145+i*.014;
  const points=[
   [rootX,rootY,rootZ],
   [side*(front?.095+i*.010:.123+i*.009),rootY-.095,front?.185:rootZ-.010],
   [side*(front?.112+i*.012:.158+i*.014),rootY-.245,front?.195:-.025-i*.012],
   [side*(spread+.040+(i%2)*.012),rootY-.43,front?.130:-.045-i*.017],
   [side*(spread+.012),rootY-.61,front?.055:-.072-i*.020],
   [side*(spread+.078-(i%3)*.009),rootY-.80,front?.010:-.050-i*.018],
   [side*(spread+.039),rootY-length,-.052-i*.018],
  ];
  curl('flowing-S-curl-'+side+'-'+i,points,.0075+(i%4)*.0010,.0045+(i%3)*.0008,false,.7*i+side*.4,{steps:32,sides:6});
 }
 // Swept shorter locks start at the part, clear the brow, then curl beside
 // the cheek. Their upper arc follows the skull rather than crossing the eye.
 for(const side of[-1,1])for(let i=0;i<4;i++){
  curl('swept-face-curl-'+side+'-'+i,[
   [side*(.008+i*.005),2.246-i*.008,.110+i*.010],
   [side*(.051+i*.008),2.221-i*.008,.165+i*.004],
   [side*(.088+i*.009),2.167-i*.009,.193],
   [side*(.105+i*.009),2.077-i*.020,.205-i*.003],
   [side*(.111+i*.012),1.996-i*.033,.203-i*.004],
   [side*(.145+i*.014),1.910-i*.044,.169],
   [side*(.132+i*.015),1.825-i*.041,.118],
  ],.0065+(i%2)*.0012,.0040+(i%2)*.0008,false,2.4+i+side*.7,{steps:32,sides:6});
 }
 // Fine independent outer curls break up the smooth tube silhouette and
 // end at different lengths. Their roots follow the major locks, not the face.
 for(const side of[-1,1])for(let i=0;i<4;i++){
  const phase=i*1.31+side*.42,rootX=side*(.086+i*.019),rootY=2.196-i*.025;
  const z=.068-i*.028,length=.73+i*.105;
  curl('tapered-flyaway-'+side+'-'+i,[
   [rootX,rootY,z],
   [side*(.153+i*.022),rootY-.16,z-.015],
   [side*(.227+i*.022),rootY-.34,z-.043],
   [side*(.199+i*.027),rootY-.48,z-.055],
   [side*(.278+i*.023),rootY-.64,z-.063],
   [side*(.252+i*.021),rootY-length,z-.080],
  ],.0035+i*.0006,.0025,false,phase,{steps:30,sides:6});
 }
 // Selected small scalp highlights describe the side part without dense wires.
 for(const side of[-1,1])for(let i=0;i<3;i++){
  const points=[[side*.006,2.252-i*.003,.089+i*.012],
   [side*(.054+i*.006),2.230,.145+i*.005],[side*(.102+i*.005),2.191,.174-i*.002],
   [side*(.130+i*.006),2.127,.143-i*.007]].map(p=>local(p,HEAD));
  tube(headGroup,points,.00065,materials.hairLight,18,4);
 }
 // A pierced circlet carries pointed leaf loops, ruby bezels and tiny
 // finials. The gaps between the gold curves keep it a light diadem rather
 // than a broad solid helmet. Every motif joins the two continuous rails.
 {
  const at=(a,y,rx=.129,rz=.119)=>[Math.sin(a)*rx,y,.068+Math.cos(a)*rz];
  const rail=(y,rx,rz,radius)=>{
   const points=[];for(let i=0;i<=80;i++)points.push(local(at(i/80*Math.PI*2,y,rx,rz),HEAD));
   tube(headGroup,points,radius,materials.gold,80,6);
  };
  rail(2.228,.128,.118,.0032);rail(2.246,.130,.120,.0026);
  for(let i=0;i<13;i++){
   const a=i/13*Math.PI*2,front=Math.max(0,Math.cos(a)),height=.065+.075*front;
   const half=Math.PI/13*.84,base=2.236,tip=base+height;
   const leaf=[at(a-half,base),at(a-half*.62,base+height*.39),at(a,tip),at(a+half*.62,base+height*.39),at(a+half,base)].map(p=>local(p,HEAD));
   tube(headGroup,leaf,.0025,materials.goldLight,24,5);
   // An inner pointed arch leaves the central ruby surrounded by open gold.
   const inner=[at(a-half*.58,base+.012,.131,.121),at(a,base+height*.70,.135,.125),at(a+half*.58,base+.012,.131,.121)].map(p=>local(p,HEAD));
   tube(headGroup,inner,.0017,materials.gold,16,5);
   const jewel=mesh(headGroup,new THREE.OctahedronGeometry(.0095+front*.002,0),materials.gem);
   jewel.position.set(...local(at(a,base+height*.35,.135,.125),HEAD));
   jewel.scale.set(.65,1.35,.53);jewel.rotation.y=a;
   const bezel=[at(a-half*.31,base+height*.35,.136,.126),at(a,base+height*.35+.018,.136,.126),at(a+half*.31,base+height*.35,.136,.126),at(a,base+height*.35-.018,.136,.126),at(a-half*.31,base+height*.35,.136,.126)].map(p=>local(p,HEAD));
   tube(headGroup,bezel,.0017,materials.goldLight,20,5);
   pearl(headGroup,at(a,tip+.002,.129,.119),.0034,materials.goldLight);
  }
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
 function update({time=0,motion=true,strike=0,wind=0,defeat=0,groundLift=0}={}){
  if(dead)return;
  const t=motion?finite(time):0,s=motion?clamp(finite(strike),0,1):0,w=motion?clamp(finite(wind),-1,1):0,d=clamp(finite(defeat),0,1),lift=clamp(finite(groundLift),0,1);
  for(const {group,phase}of masses){
   group.rotation.x=Math.sin(t*1.28+phase)*.014+(s*.07+w*.025)*(1-d*.7);
   group.rotation.y=Math.sin(t*.93+phase)*.012+w*.016;
   group.rotation.z=Math.sin(t*1.05+phase)*.016+w*.024+s*Math.sin(phase)*.025;
  }
  const key=[t,s,w,d,lift].join(',');if(key===lastCloth)return;lastCloth=key;
  for(let side=0;side<2;side++)for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const u=i/cols*2-1,v=j/rows,edge=Math.abs(u),bell=.246+.37*v+.085*Math.sin(v*Math.PI),asym=.052*Math.max(0,u)*v;
   const fold=Math.cos(u*Math.PI*5.1+v*.68)*(.020+.029*v)*Math.sin(v*Math.PI*.86);
   const flutter=motion?Math.sin(t*1.65+v*5.4+u*2.0)*.030*v*v:0;
   const x=u*(bell+asym)+(.075*w+.065*s)*v*v+Math.sin(t*.85+v*3)*.014*v*v;
   // A seated torso lowers the collar. Shorten the hanging cloth towards its
   // hem instead of translating the whole cape away from that collar. The
   // first 15% stays anchored; the hem receives the complete floor correction.
   const lower=clamp((v-.15)/.85,0,1),grounding=lift*lower*lower*(3-2*lower);
   const y=1.842-v*1.778+.042*Math.cos(u*Math.PI*3+.4)*Math.pow(v,5)+.028*edge*edge*(1-v)-.05*d*v*(1-v)+grounding;
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
 return {headGroup,torsoGroup,cape,update,dispose,metadata:{curlMasses:masses.length,crownMaxY:2.382,capeFloorY:.02,geometryOwned:true,materialsOwned:false}};
}
