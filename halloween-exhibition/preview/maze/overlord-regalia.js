/** Fitted, sculpted regalia for the continuous anatomical actor.
 * Meshes are made in the body's neutral world coordinates, then converted to
 * the exact bone rest frame. Materials remain owned by the actor. */
export function createOverlordRegalia(THREE,{joints,materials,positions}){
 const group=new THREE.Group();group.name='five-native-gilded-blades';
 const resources=new Set(),attachments=[],swords=[],inverse=new Map();let disposed=false;
 const V=(x,y,z)=>new THREE.Vector3(x,y,z),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const bodyPoints=[];for(let i=0;i<positions.length;i+=3)if(positions[i+1]>.70&&positions[i+1]<1.93&&Math.abs(positions[i])<.29&&positions[i+2]>0)bodyPoints.push([positions[i],positions[i+1],positions[i+2]]);
 function front(x,y){
  const close=[];for(const point of bodyPoints){const d=(point[0]-x)**2+(point[1]-y)**2;if(close.length===8&&d>=close[7][0])continue;let index=close.length;while(index>0&&d<close[index-1][0])index--;close.splice(index,0,[d,point[2]]);if(close.length>8)close.pop();}const near=close[0]?.[0]||0;
  let value=0,weight=0;for(const [distance,z]of close){const w=1/(.00002+distance-near*.65);value+=z*w;weight+=w;}
  return (weight?value/weight:.12)+.011;
 }
 function worldInverse(parent){if(!inverse.has(parent)){parent.updateWorldMatrix(true,false);inverse.set(parent,parent.matrixWorld.clone().invert());}return inverse.get(parent);}
 function geometry(parent,g,material,{local=false,name='gilded-fitted-armour'}={}){
  if(!g.attributes.uv){const p=g.attributes.position,a=[];for(let i=0;i<p.count;i++)a.push(.5,.5);g.setAttribute('uv',new THREE.Float32BufferAttribute(a,2));}
  if(!local)g.applyMatrix4(worldInverse(parent));resources.add(g);const mesh=new THREE.Mesh(g,materials[material]);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);attachments.push(mesh);return mesh;
 }
 function tube(parent,points,r=.004,material='gold',segments=16,local=false){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p));
  return geometry(parent,new THREE.TubeGeometry(curve,segments,r,5,false),material,{local});
 }
 function gem(parent,point,size=.023,local=false){const g=new THREE.OctahedronGeometry(size,0);g.scale(.72,1.35,.55);g.translate(...point);return geometry(parent,g,'gem',{local});}
 function leaf(parent,points,width=.012,material='gold',local=false){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p)),steps=12,frames=curve.computeFrenetFrames(steps,false),p=[],ix=[];
  for(let i=0;i<=steps;i++){const center=curve.getPointAt(i/steps),r=Math.sin(i/steps*Math.PI)*width+.0006;for(let j=0;j<5;j++){const angle=j/4*Math.PI*2,point=center.clone().addScaledVector(frames.normals[i],Math.cos(angle)*r).addScaledVector(frames.binormals[i],Math.sin(angle)*r*.25);p.push(point.x,point.y,point.z);if(i<steps&&j<4){const a=i*5+j;ix.push(a,a+1,a+5,a+1,a+6,a+5);}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return geometry(parent,g,material,{local});
 }
 const onSurface=(x,y,offset=0)=>[x,y,front(x,y)+offset];
 function scroll(parent,centerX,centerY,scale=1){
  const curve=[];for(let i=0;i<=22;i++){const p=i/22,angle=p*Math.PI*1.5,r=(1-p*.68)*.032*scale;curve.push(onSurface(centerX+Math.cos(angle)*r,centerY+Math.sin(angle)*r,.003));}tube(parent,curve,.0032*scale,'gold',22);
 }
 // The continuous black armour remains fully covered. Raised, fitted borders
 // describe a corseted cuirass and curved metal leaves over the engraved body.
 const torso=joints.torso,pelvis=joints.pelvis;
 const neckline=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI;neckline.push(onSurface(Math.cos(a)*.092,1.847+Math.sin(a)*.027,.005));}tube(torso,neckline,.006,'gold',24);
 tube(torso,[onSurface(-.082,1.862),onSurface(-.058,1.822),onSurface(0,1.790),onSurface(.058,1.822),onSurface(.082,1.862)],.0055,'gold',24);
 for(const side of[-1,1]){
  tube(torso,[[side*.171,1.787],[side*.199,1.720],[side*.164,1.606],[side*.138,1.478],[side*.160,1.355]].map(([x,y])=>onSurface(x,y,.003)),.005,'gold',24);
  tube(torso,[[0,1.791],[side*.042,1.737],[side*.087,1.705],[side*.147,1.731],[side*.178,1.774]].map(([x,y])=>onSurface(x,y,.003)),.0043,'gold',24);
  leaf(torso,[[side*.040,1.743],[side*.077,1.774],[side*.126,1.774]].map(([x,y])=>onSurface(x,y,.008)),.011);
  leaf(torso,[[side*.038,1.550],[side*.078,1.580],[side*.110,1.623]].map(([x,y])=>onSurface(x,y,.008)),.010);
  scroll(torso,side*.093,1.639,.84);scroll(torso,side*.078,1.465,.66);
  const breastBorder=[[.018,1.777],[.078,1.802],[.148,1.766],[.189,1.692],[.152,1.608],[.061,1.599],[.018,1.657]];
  tube(torso,[...breastBorder,breastBorder[0]].map(([x,y])=>onSurface(side*x,y,.015)),.0046,'gold',36);
  tube(torso,[[side*.164,1.611],[side*.123,1.547],[side*.112,1.448],[side*.149,1.357],[side*.201,1.302]].map(([x,y])=>onSurface(x,y,.016)),.006,'gold',30);
  tube(torso,[[side*.155,1.590],[side*.074,1.558],[side*.045,1.499],[side*.091,1.452],[side*.112,1.487],[side*.076,1.506]].map(([x,y])=>onSurface(x,y,.021)),.0031,'goldLight',27);
  leaf(torso,[[side*.040,1.409],[side*.083,1.380],[side*.137,1.346]].map(([x,y])=>onSurface(x,y,.021)),.009,'gold');
 }
 tube(torso,[[0,1.790],[0,1.716],[0,1.604],[0,1.493],[0,1.365]].map(([x,y])=>onSurface(x,y,.005)),.0045,'gold',24);
 gem(torso,onSurface(0,1.775,.018),.025);gem(torso,onSurface(0,1.500,.016),.019);
 // The belt follows the real waist rather than a floating horizontal torus.
 const belt=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,x=Math.sin(a)*.175;belt.push([x,1.307,Math.cos(a)>0?front(x,1.307)+.006:Math.cos(a)*.117]);}tube(pelvis,belt,.008,'gold',48);
 gem(pelvis,onSurface(0,1.302,.022),.029);
 // Six overlapping, swept metal petals flare from the hips. Their pointed
 // lower edges and curved volume replace the two short round-ended flaps;
 // the continuous under-armour remains in place beneath every petal.
 function tasset(parent,side){
  for(let petal=2;petal>=0;petal--){
   const rows=14,cols=8,p=[],ix=[],edgeL=[],edgeR=[],top=[],length=[.470,.409,.350][petal],start=1.304+petal*.014;
   const sample=(t,u=0)=>{const center=side*(.057+petal*.068+t*(.026+petal*.029)),width=(.048+.027*Math.sin(t*Math.PI))*(1-Math.pow(t,2.4))+.0008,x=center+u*width,y=start-t*length+(u*u)*.014*Math.sin(t*Math.PI),z=front(x,y)+.026+(2-petal)*.008+Math.sin((u+1)*Math.PI/2)*(.018+.016*Math.sin(t*Math.PI));return[x,y,z];};
   for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
    const t=row/rows,u=col/cols*2-1,point=sample(t,u);p.push(...point);if(col===0)edgeL.push(point);if(col===cols)edgeR.push(point);if(row===0)top.push(point);
    if(row<rows&&col<cols){const a=row*(cols+1)+col;ix.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
   }
   // A second inner surface closes the petal and gives its sharp rim thickness.
   const count=p.length/3;for(let i=0;i<count;i++)p.push(p[i*3],p[i*3+1],p[i*3+2]-.005);
   const frontIx=ix.slice();for(let i=0;i<frontIx.length;i+=3)ix.push(frontIx[i]+count,frontIx[i+2]+count,frontIx[i+1]+count);
   const seal=(a,b)=>ix.push(a,b,a+count,b,b+count,a+count);
   for(let col=0;col<cols;col++){seal(col,col+1);seal(rows*(cols+1)+col+1,rows*(cols+1)+col);}
   for(let row=0;row<rows;row++){seal((row+1)*(cols+1),row*(cols+1));seal(row*(cols+1)+cols,(row+1)*(cols+1)+cols);}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();geometry(parent,g,'armor',{name:'swept-pointed-hip-petal-'+petal});
   tube(parent,[...top,...edgeR,...edgeL.slice().reverse(),top[0]],.0038,'gold',34);
   tube(parent,[sample(.035,0),sample(.25,-side*.35),sample(.54,side*.34),sample(.78,-side*.12),sample(.995,0)],.0033,'goldLight',22);
   for(const sign of[-1,1])leaf(parent,[sample(.07,sign*.48),sample(.20,sign*.39),sample(.34,0)],.0075,'gold');
   if(petal!==1)gem(parent,sample(.14,0),.0125);
  }
 }
 for(const leg of joints.legs)tasset(leg.hip,leg.side);
 // Closed metal sleeves are constructed around each actual limb axis.
 function rest(bone){return joints.rest?.get(bone)?.clone()||bone.getWorldPosition(new THREE.Vector3());}
 function limbFrame(a,b){const origin=rest(a),end=rest(b),axis=end.clone().sub(origin).normalize(),face=V(0,0,1).addScaledVector(axis,-axis.z).normalize(),across=new THREE.Vector3().crossVectors(axis,face).normalize();return {origin,end,axis,face,across,length:origin.distanceTo(end)};}
 function at(frame,d,angle,r,depth=1){return frame.origin.clone().addScaledVector(frame.axis,d).addScaledVector(frame.across,Math.sin(angle)*r).addScaledVector(frame.face,Math.cos(angle)*r*depth);}
 function sleeve(parent,frame,profile,material='armor',segments=16){
  const p=[],ix=[];for(let row=0;row<profile.length;row++){const [d,r,depth=1]=profile[row];for(let col=0;col<=segments;col++){const point=at(frame,d,col/segments*Math.PI*2,r,depth);p.push(point.x,point.y,point.z);if(row<profile.length-1&&col<segments){const a=row*(segments+1)+col;ix.push(a,a+1,a+segments+1,a+1,a+segments+2,a+segments+1);}}}
  // Seal the cuff interiors as well as their exterior silhouette.
  for(const row of[0,profile.length-1]){const center=frame.origin.clone().addScaledVector(frame.axis,profile[row][0]),index=p.length/3;p.push(center.x,center.y,center.z);for(let col=0;col<segments;col++){const a=row*(segments+1)+col;row===0?ix.push(index,a+1,a):ix.push(index,a,a+1);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return geometry(parent,g,material);
 }
 function ring(parent,frame,d,r,depth=1,width=.004){const points=[];for(let i=0;i<=32;i++)points.push(at(frame,d,i/32*Math.PI*2,r,depth));tube(parent,points,width,'gold',32);}
 function limbLace(parent,frame,start,end,rTop,rBottom,depth=1){
  const sample=(t,angle=0)=>at(frame,start+(end-start)*t,angle,rTop+(rBottom-rTop)*t+.004,depth);
  // A raised central spear and paired swept scrolls are read as metalwork in
  // profile, rather than a texture pattern repeated around a cylinder.
  for(const side of[-1,1]){
   tube(parent,[sample(0,0),sample(.15,side*.72),sample(.40,side*.38),sample(.62,side*.73),sample(.86,side*.26),sample(1,0)],.0032,'gold',26);
   tube(parent,[sample(.20,side*.68),sample(.28,side*.24),sample(.39,side*.32),sample(.43,side*.56),sample(.35,side*.67)],.0026,'goldLight',16);
   leaf(parent,[sample(.57,side*.64),sample(.71,side*.47),sample(.91,0)],.0068,'gold');
  }
 }
 // Overlapping curved steel leaves provide an angular silhouette with real
 // thickness. Each lower plate emerges under the preceding one and ends in
 // a pointed, gilt-edged centre instead of a round cylindrical shoulder.
 function pauldronLeaf(parent,frame,start,radius,layer,side){
  const cols=18,rows=7,p=[],ix=[],edgeTop=[],edgeBottom=[],edgeLeft=[],edgeRight=[],stride=cols+1,layerSize=(rows+1)*stride;
  for(let back=0;back<2;back++)for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
   const u=col/cols*2-1,t=row/rows,angle=u*1.78;
   const upper=start-.014*(1-u*u),lower=start+.050+.039*Math.pow(1-Math.abs(u),1.4),d=upper+(lower-upper)*t;
   const r=radius+.009*Math.sin(t*Math.PI)+.012*Math.pow(Math.abs(u),5)-(back?.0045:0),point=at(frame,d,angle,r,1.06);
   p.push(...point.toArray());
   if(!back){if(row===0)edgeTop.push(point);if(row===rows)edgeBottom.push(point);if(col===0)edgeLeft.push(point);if(col===cols)edgeRight.push(point);}
   if(row<rows&&col<cols){const a=back*layerSize+row*stride+col,b=a+1,c=a+stride,e=c+1;if(back)ix.push(a,c,b,b,c,e);else ix.push(a,b,c,b,e,c);}
  }
  const seal=(a,b)=>ix.push(a,a+layerSize,b,b,a+layerSize,b+layerSize);
  for(let col=0;col<cols;col++){seal(col,col+1);seal(rows*stride+col+1,rows*stride+col);}
  for(let row=0;row<rows;row++){seal((row+1)*stride,row*stride);seal(row*stride+cols,(row+1)*stride+cols);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();geometry(parent,g,'armor',{name:'layered-pointed-pauldron-'+layer});
  tube(parent,[...edgeTop,...edgeRight.slice(1),...edgeBottom.slice(0,-1).reverse(),...edgeLeft.slice(1,-1).reverse(),edgeTop[0]],.0035,'gold',40);
  const centre=at(frame,start+.031,0,radius+.016,1.06),tip=at(frame,start+.089,0,radius+.006,1.06);
  leaf(parent,[at(frame,start-.006,-.45,radius+.009,1.06),centre,tip],.008,'goldLight');
  leaf(parent,[at(frame,start-.006,.45,radius+.009,1.06),centre,tip],.008,'gold');
  // Small outward swept spines continue the plate's material, avoiding the
  // disconnected gold rods that made the earlier crown-like shoulders read flat.
  const base=at(frame,start+.016,-side*1.22,radius+.010,1.02),tipPoint=base.clone().add(V(side*(.070-layer*.011),.085-layer*.013,-.008));
  const spine=base.clone().lerp(tipPoint,.58).add(V(0,.008,.009));
  leaf(parent,[base,spine,tipPoint],.017,'armor');
  for(const sign of[-1,1])tube(parent,[base.clone().add(V(0,0,sign*.010)),spine.clone().add(V(0,0,sign*.005)),tipPoint],.0027,'gold',12);
  if(layer===0)gem(parent,at(frame,start+.026,-side*.56,radius+.027,1.06).toArray(),.016);
 }
 for(const {shoulder,elbow,hand,side}of joints.arms){
  const upper=limbFrame(shoulder,elbow),lower=limbFrame(elbow,hand);
  sleeve(shoulder,upper,[[-.050,.025,.9],[-.025,.074,.94],[.025,.086,.98],[.105,.078,1],[.174,.058,.95]],'armor',18);
  for(const [layer,start,radius]of[[0,-.016,.109],[1,.040,.106],[2,.092,.094]])pauldronLeaf(shoulder,upper,start,radius,layer,side);
  sleeve(elbow,lower,[[.035,.059,1.04],[.060,.062,1.02],[.125,.057,1.03],[lower.length-.055,.043,1.01],[lower.length-.018,.047,1.02]],'armor',18);
  ring(elbow,lower,.050,.063,1.04,.005);ring(elbow,lower,lower.length-.025,.047,1.03,.005);
  const line=[];for(let i=0;i<=18;i++){const t=i/18,d=.056+t*(lower.length-.09),r=.062-t*.016;line.push(at(lower,d,0,r,1.04));}tube(elbow,line,.0045,'gold',20);
  for(const sign of[-1,1])leaf(elbow,[at(lower,.09,sign*.6,.062,1.04),at(lower,.145,sign*.35,.059,1.04),at(lower,.20,0,.055,1.04)],.010);
  gem(elbow,at(lower,.116,0,.066,1.04).toArray(),.012);
  limbLace(elbow,lower,.066,lower.length-.032,.063,.047,1.05);
  // Wrist seal and small knuckle ridges connect glove to the continuous hand.
  for(let k=0;k<3;k++){const point=lower.end.clone().addScaledVector(lower.across,(k-1)*.014).addScaledVector(lower.face,.027);tube(hand,[point,point.clone().addScaledVector(lower.axis,.027)],.004,'gold',5);}
 }
 for(const {hip,knee,ankle,side}of joints.legs){
  const lower=limbFrame(knee,ankle);
  sleeve(knee,lower,[[-.043,.026,1.01],[-.015,.069,1.10],[.045,.077,1.11],[.140,.069,1.02],[.280,.052,1.03],[lower.length-.012,.043,1.08]],'armor',18);
  ring(knee,lower,.038,.078,1.12,.005);ring(knee,lower,lower.length-.024,.046,1.10,.0045);
  const shin=[];for(let i=0;i<=20;i++){const t=i/20,d=.025+t*(lower.length-.045),r=.078-t*.033;shin.push(at(lower,d,0,r,1.12));}tube(knee,shin,.005,'gold',24);
  for(const sign of[-1,1])leaf(knee,[at(lower,.090,sign*.72,.074,1.11),at(lower,.148,sign*.42,.069,1.11),at(lower,.205,0,.064,1.11)],.010);
  // The red knee jewel and swept paired prongs echo the shoulder design.
  gem(knee,at(lower,.048,0,.086,1.12).toArray(),.023);
  for(const sign of[-1,1]){
   const a=at(lower,.081,sign*.72,.079,1.10),b=at(lower,.031,sign*.88,.085,1.10),c=at(lower,-.034,sign*.98,.086,1.10);
   leaf(knee,[a,b,c],.009,'gold');
   tube(knee,[at(lower,.047,0,.088,1.12),b,c],.0034,'goldLight',15);
  }
  limbLace(knee,lower,.073,lower.length-.029,.077,.046,1.13);
  gem(knee,at(lower,lower.length-.071,0,.050,1.13).toArray(),.013);
  // The foot has a closed toe box, upper, sole and heel instead of a tiny peg.
  const footOrigin=rest(ankle),front=V(footOrigin.x+side*.010,footOrigin.y-.049,footOrigin.z+.175),foot=new THREE.SphereGeometry(1,18,10);foot.scale(.064,.052,.205);foot.translate(front.x,front.y,front.z);geometry(ankle,foot,'armor');
  const sole=new THREE.BoxGeometry(.116,.018,.380,1,1,1);sole.translate(front.x,Math.max(.012,footOrigin.y-.090),front.z+.006);geometry(ankle,sole,'armor');
  const heel=new THREE.BoxGeometry(.046,.066,.048);heel.translate(footOrigin.x,footOrigin.y-.063,footOrigin.z-.031);geometry(ankle,heel,'armor');
  const arch=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI;arch.push([front.x+Math.cos(a)*.058,front.y+Math.sin(a)*.052,front.z+.054]);}tube(ankle,arch,.0045,'gold',22);
  tube(ankle,[[front.x-.060,front.y-.016,front.z+.080],[front.x-.045,front.y-.005,front.z+.172],[front.x,front.y,front.z+.202],[front.x+.045,front.y-.005,front.z+.172],[front.x+.060,front.y-.016,front.z+.080]],.0045,'gold',22);
 }
 // Five distinct closed blades. Dark blade faces and a ruby channel leave the
 // gold silhouette readable at mobile size without ornamental wallpaper.
 function bladePlate(parent,points,material,z,depth=.018){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,steps:1});g.translate(0,0,z);return geometry(parent,g,material,{local:true});}
 for(let index=0;index<5;index++){
  const sword=new THREE.Group();sword.name='native-floating-blade-'+(index+1);group.add(sword);
  const outline=[[0,-.780],[-.039,-.650],[-.061,-.180],[-.047,.065],[-.079,.123],[-.036,.180],[.036,.180],[.079,.123],[.047,.065],[.061,-.180],[.039,-.650]];
  bladePlate(sword,outline,'armor',-.018,.036);tube(sword,[...outline,outline[0]].map(([x,y])=>[x,y,.027]),.0045,'gold',38,true);
  const channel=[[0,-.729],[-.017,-.570],[-.023,-.130],[-.015,.105],[0,.142],[.015,.105],[.023,-.130],[.017,-.570]];
  bladePlate(sword,channel,'gem',.023,.012);tube(sword,[[0,-.700,.040],[0,-.350,.045],[0,.105,.041]],.0033,'glow',14,true);
  for(const sign of[-1,1]){
   tube(sword,[[0,.177,0],[sign*.076,.222,-.002],[sign*.141,.185,-.005],[sign*.183,.241,-.007]],.011,'gold',18,true);
   leaf(sword,[[sign*.046,.192,.010],[sign*.104,.267,.005],[sign*.151,.296,0]],.016,'gold',true);
   tube(sword,[[sign*.041,-.060,.040],[sign*.026,-.027,.044],[sign*.012,-.055,.044],[sign*.026,-.088,.043]],.003,'gold',12,true);
  }
  const grip=new THREE.CylinderGeometry(.016,.020,.186,10);grip.translate(0,.290,0);geometry(sword,grip,'armor',{local:true});
  for(let band=0;band<4;band++){const ring=[];for(let j=0;j<=16;j++){const angle=j/16*Math.PI*2;ring.push([Math.cos(angle)*.020,.221+band*.043,Math.sin(angle)*.020]);}tube(sword,ring,.0034,'gold',16,true);}
  gem(sword,[0,.172,.041],.026,true);gem(sword,[0,.408,0],.018,true);
  const spiral=[];for(let i=0;i<=34;i++){const t=i/34,a=t*Math.PI*3+index;spiral.push([Math.cos(a)*.073,-.53+t*.70,Math.sin(a)*.073]);}tube(sword,spiral,.003,'energy',34,true);
  swords.push(sword);
 }
 // Batch only meshes owned by this helper; the anatomical SkinnedMesh and
 // other accessories on the same bones must remain untouched.
 const buckets=new Map();for(const mesh of attachments){const key=mesh.parent.uuid+':'+mesh.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(mesh);}
 for(const items of buckets.values())if(items.length>1){const parent=items[0].parent,p=[],n=[],uv=[];for(const mesh of items){const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();p.push(...g.attributes.position.array);n.push(...g.attributes.normal.array);uv.push(...g.attributes.uv.array);g.dispose();mesh.removeFromParent();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));resources.add(g);const mesh=new THREE.Mesh(g,items[0].material);mesh.name='batched-fitted-regalia';mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);attachments.push(mesh);}
 function update({time=0,motion=true,state='idle',attackProgress=0,swordSpread=1,blades}={}){
  if(disposed)return;const clock=motion&&Number.isFinite(time)?time:0,p=clamp(attackProgress),spread=clamp(swordSpread,.57,1.12),dead=state==='defeat';
  swords.forEach((sword,index)=>{
   const angle=(index-2)*.49,x=(Math.sin(angle)*.91+(index===2?.13:0))*spread,y=1.86+Math.cos(angle)*.37+(index===2?.18:0),z=-.178+Math.cos(angle)*.035-(index===2?.12:0);
   const authored=motion&&blades?.[index],active=!!authored?.active;
   const fallback=motion&&!blades&&(state==='special'||state==='attack')&&(state==='special'||index===2)?Math.sin(p*Math.PI):0;
   const travel=active?clamp(authored.travel):fallback,flight=active?clamp(authored.launch):fallback;
   sword.position.set(x*(1-travel*.86),y+(1.10-y)*travel+(motion?Math.sin(clock*1.7+index*.63)*.021:0),z+(1.72-z)*travel);
   if(dead){sword.position.y-=.58;sword.position.z-=.08;}
   sword.rotation.set(-1.17*flight,Math.sin(angle)*.12*(1-travel),-angle*.27*(1-travel));sword.scale.setScalar(.93);
  });
 }
 update();
 function dispose(){if(disposed)return;disposed=true;for(const mesh of attachments)mesh.removeFromParent();group.removeFromParent();resources.forEach(g=>g.dispose());}
 return {group,swords,update,dispose};
}
