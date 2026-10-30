/** A continuous deformation field for complete painted character poses.
 * Nothing is cut into body parts. This adds breathing, weight shifts and cloth follow-through;
 * it does not manufacture missing directional walk or authored attack frames. */
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
const smooth=(lo,hi,value)=>ease((value-lo)/(hi-lo));

// Place one intact grid rectangle across the face. Its four corners receive
// exactly the same rigid transform, rather than independently wobbling eyes.
export const OVERLORD_DEFORM_U=Object.freeze([0,.22,.40,.60,.78,1]);
export const OVERLORD_DEFORM_V=Object.freeze([0,.07,.28,.45,.63,.82,1]);
export const OVERLORD_DEFORM_TRIANGLES=Object.freeze(Array.from({length:30},(_,index)=>{
 const x=index%5,y=Math.floor(index/5),a=y*6+x,b=a+1,c=a+6,d=c+1;
 return [[a,c,b],[b,c,d]];
}).flat().map(triangle=>Object.freeze(triangle)));

/** Coordinates are measured in painted-body-height units: +y points down and
 * y=0 is the planted floor. The crown is approximately at -1. */
export function sampleOverlordDeformation(sprite,input={}){
 const [,,width,height]=sprite.frame,bodyHeight=sprite.contentHeight||height;
 const aspect=width/bodyHeight,vertical=height/bodyHeight,ax=sprite.anchorX??.5,ay=sprite.anchorY??1;
 const motion=input.motion!==false,time=motion?finite(input.time,finite(input.elapsed,finite(input.stateElapsed))):0;
 const progress=motion?clamp(finite(input.attackProgress,finite(input.progress,input.body?.progress??0))):0;
 const state=input.state||sprite.state||'idle',acting=state==='attack'||state==='special';
 const bump=(start,peak,end,t)=>t<peak?ease((t-start)/(peak-start)):1-ease((t-peak)/(end-peak));
 const wind=motion&&acting?bump(0,.17,.39,progress):0;
 const release=motion&&acting?bump(.16,.43,.91,progress):0;
 const recovery=motion&&acting?bump(.52,.76,1,progress):0;
 const recoil=motion&&state==='hit'?Math.sin(progress*Math.PI):0;
 const bow=motion&&state==='defeat'?ease(progress):0;
 const drive=Math.max(wind,release,recoil,bow*.65);
 const sway=motion?Math.sin(time*1.13)*.0035:0,breath=motion?Math.sin(time*1.71)*.002:0;
 // All three phases return to the same planted rest; a resolved hit has an
 // upper-body/hip dip, while defeat is an honest bow, not a fabricated kneel.
 const lean=motion?Math.sin(time*.83)*.0035+wind*.060-release*.075+recovery*.015+recoil*.080-bow*.085:0;
 const waistShift=motion?wind*.012-release*.016+recoil*.018:0;
 const dip=motion?release*.006+recoil*.022+bow*.028:0;
 const headAngle=motion?Math.sin(time*.97)*.0025+wind*.012-release*.020+recoil*.016+bow*.020:0;
 const cs=Math.cos(lean),sn=Math.sin(lean);
 const headX=sway+waistShift-sn*(.17-.63),headQ=.63+cs*(.17-.63)+dip-breath*.55;

 const points=[];
 for(const v of OVERLORD_DEFORM_V)for(const u of OVERLORD_DEFORM_U){
  const x=(u-ax)*aspect,y=(v-ay)*vertical,q=1+y;
  let dx=0,dy=0;
  if(motion){
   // The spine bends continuously around the waist. Upper points move as a
   // rigid section, then the weight tapers toward the fixed ankles.
   const upper=1-smooth(.49,.92,q),body=1-smooth(.15,.34,Math.abs(x));
   const spine=1-smooth(.43,.76,q);
   dx=(sway+waistShift)*upper+(cs*x-sn*(q-.63)-x)*spine;
   dy=(sn*x+cs*(q-.63)-(q-.63))*spine+dip*upper-breath*upper*body;
   // Hair and cape lag behind the release, rather than the whole illustration
   // breathing in and out. Idle secondary motion remains deliberately small.
   const outer=smooth(.10,.26,Math.abs(x)),hair=(1-smooth(.49,.64,q))*smooth(.08,.24,q)*outer;
   const cape=smooth(.24,.46,q)*(1-smooth(.86,1.06,q))*outer;
   dx+=hair*Math.sin(time*1.51+q*5+x*2)*(.0075+drive*.018);
   dy+=hair*Math.sin(time*1.28+q*4-x*2)*(.0024+drive*.006);
   dx+=cape*(Math.sin(time*1.32+q*5-x*2)*(.010+drive*.020)-release*.007*Math.sin(q*5));
   dy+=cape*Math.sin(time*1.48+q*3+x*3)*(.0035+drive*.007);
   // Cast drawings already contain a connected shoulder/arm. Rotate a soft
   // field around that shoulder for the release and wrist follow-through.
   // The image remains intact: no cut joint or newly invented arm is exposed.
   if(acting){
    const drawnCast=sprite.frameIndex!==0;
    const arm=(1-smooth(drawnCast ? .39 : .56,drawnCast ? .57 : .76,q))*smooth(.17,drawnCast ? .27 : .43,q)*smooth(.10,.27,-x);
    const armAngle=drawnCast?release*.16-wind*.06+recovery*.08:wind*.05;
    const ac=Math.cos(armAngle),as=Math.sin(armAngle),px=x+.09,py=q-.30;
    dx+=arm*(ac*px-as*py-px);dy+=arm*(as*px+ac*py-py);
   }
   // Every vertex inside the head rectangle receives the same rigid transform.
   // The surrounding hair is blended gently into it, with no eye/mouth warp.
   const head=1-smooth(.28,.37,q),face=1-smooth(.10,.19,Math.abs(x));
   const rigid=head*face;
   const cx=x,cy=q-.17,c=Math.cos(lean+headAngle),s=Math.sin(lean+headAngle);
   const rdx=headX+c*cx-s*cy-x,rdy=headQ+s*cx+c*cy-q;
   dx=dx*(1-rigid)+rdx*rigid;dy=dy*(1-rigid)+rdy*rigid;
   // The sole is never translated by breathing or cloth motion.
   const planted=smooth(.91,1.005,q)*(1-smooth(.12,.23,Math.abs(x)));
   dx*=1-planted;dy*=1-planted;
  }
  points.push({u,v,x:x+dx,y:y+dy,dx,dy});
 }
 return {points,triangles:OVERLORD_DEFORM_TRIANGLES,aspect,vertical,bodyHeight,motion};
}

function drawTriangle(context,image,frame,source,target){
 const [a,b,c]=source,[p,q,r]=target;
 const den=a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y);
 if(Math.abs(den)<1e-8)return;
 const A=(p.x*(b.y-c.y)+q.x*(c.y-a.y)+r.x*(a.y-b.y))/den;
 const C=(p.x*(c.x-b.x)+q.x*(a.x-c.x)+r.x*(b.x-a.x))/den;
 const E=(p.x*(b.x*c.y-c.x*b.y)+q.x*(c.x*a.y-a.x*c.y)+r.x*(a.x*b.y-b.x*a.y))/den;
 const B=(p.y*(b.y-c.y)+q.y*(c.y-a.y)+r.y*(a.y-b.y))/den;
 const D=(p.y*(c.x-b.x)+q.y*(a.x-c.x)+r.y*(b.x-a.x))/den;
 const F=(p.y*(b.x*c.y-c.x*b.y)+q.y*(c.x*a.y-a.x*c.y)+r.y*(a.x*b.y-b.x*a.y))/den;
 context.save();context.beginPath();
 // Extend the clip by a subpixel toward each triangle's corners. The source
 // crop itself remains bounded, so atlas neighbours cannot leak into the mesh.
 const cx=(p.x+q.x+r.x)/3,cy=(p.y+q.y+r.y)/3;
 for(const [index,point]of target.entries()){
  const vx=point.x-cx,vy=point.y-cy,length=Math.hypot(vx,vy)||1;
  const x=point.x+vx/length*.25,y=point.y+vy/length*.25;
  if(index===0)context.moveTo(x,y);else context.lineTo(x,y);
 }
 context.closePath();context.clip();context.transform(A,B,C,D,E,F);
 context.drawImage(image,...frame,0,0,frame[2],frame[3]);context.restore();
}

export function drawDeformedOverlord(context,sprite,{x=0,y=0,height=1,alpha=1,...input}={}){
 if(!context||!sprite?.image||!Number.isFinite(height)||height<=0)return false;
 const sampled=sampleOverlordDeformation(sprite,input),[,,fw,fh]=sprite.frame;
 context.save();context.translate(x,y);context.globalAlpha=alpha;context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
 const source=sampled.points.map(point=>({x:point.u*fw,y:point.v*fh}));
 const target=sampled.points.map(point=>({x:point.x*height,y:point.y*height}));
 for(const indices of sampled.triangles)drawTriangle(context,sprite.image,sprite.frame,indices.map(index=>source[index]),indices.map(index=>target[index]));
 context.restore();return true;
}

/** THREE.Sprite already implements camera-facing vertices; it accepts the same
 * indexed grid as its ordinary quad. Retain SpriteMaterial and the public
 * Sprite/center/scale API, replacing only its private geometry. */
export function createOverlordDeformGeometry(THREE){
 const geometry=new THREE.BufferGeometry(),position=new Float32Array(42*3),uv=new Float32Array(42*2);
 let index=0;for(const v of OVERLORD_DEFORM_V)for(const u of OVERLORD_DEFORM_U){position[index*3]=u-.5;position[index*3+1]=.5-v;uv[index*2]=u;uv[index*2+1]=1-v;index++;}
 geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(OVERLORD_DEFORM_TRIANGLES.flat());
 geometry.computeBoundingSphere();geometry.computeBoundingBox();return geometry;
}

export function updateOverlordDeformGeometry(geometry,sprite,input={}){
 const sampled=sampleOverlordDeformation(sprite,input),attribute=geometry.attributes.position;
 sampled.points.forEach((point,index)=>attribute.setXYZ(index,point.u-.5+point.dx/sampled.aspect,.5-point.v-point.dy/sampled.vertical,0));
 attribute.needsUpdate=true;return sampled;
}
