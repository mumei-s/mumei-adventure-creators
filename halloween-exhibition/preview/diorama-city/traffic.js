const rail=[[-62,590],[72,333],[178,158],[296,-46]];
// Both ends extend past the visible street so a new trip enters from off screen.
const road=[[546,718],[527,482],[520,383],[515,327],[495,327],[502,384],[509,484],[527,718]];
const reflectedRoad=road.map(([x,y])=>[x-6,y]);

const interpolate=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
const gap=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function measure(points,slowForTurn=false) {
  const line=[points[0]];
  for(let i=1;i<points.length-1;i++){
    const a=points[i-1],b=points[i],c=points[i+1];
    const radius=Math.min(15,gap(a,b)*.45,gap(b,c)*.45);
    const entry=interpolate(b,a,radius/gap(a,b)),exit=interpolate(b,c,radius/gap(b,c));
    line.push(entry);
    for(let j=1;j<=12;j++){
      const t=j/12;
      line.push(interpolate(interpolate(entry,b,t),interpolate(b,exit,t),t));
    }
  }
  line.push(points.at(-1));
  let duration=0;
  const segments=line.slice(1).map((to,i)=>{
    const from=line[i],length=gap(from,to);
    const approach=Math.max(0,Math.min(1,((from[1]+to[1])*.5-325)/48));
    const speed=slowForTurn ? .55+.45*approach : 1;
    const span=length/speed;
    duration+=span;
    return {from,to,span,end:duration};
  });
  return {segments,duration};
}

function pointAt(track,at){
  const t=Math.max(0,Math.min(track.duration,at));
  const segment=track.segments.find(s=>s.end>=t)??track.segments.at(-1);
  return interpolate(segment.from,segment.to,1-(segment.end-t)/segment.span);
}

function along(track,phase) {
  const t=track.duration*phase;
  const [x,y]=pointAt(track,t),a=pointAt(track,t-2),b=pointAt(track,t+2);
  const length=gap(a,b);
  return {x,y,dx:(b[0]-a[0])/length,dy:(b[1]-a[1])/length};
}

function face(ctx,points,fill) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle=fill;
  ctx.fill();
}
function lamp(ctx,[x,y],radius,color) {
  const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
  gradient.addColorStop(0,color);
  gradient.addColorStop(1,'#0000');
  ctx.fillStyle=gradient;
  ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
}
function vehicle(ctx,position,{length,width,roof,height,night,train=false}) {
  if (!position) return;
  const {x,y,dx,dy}=position;
  const scale=.53+y/970;
  const l=length*scale/2,w=width*scale/2,h=height*scale;
  const point=(along,across,up=0)=>[x+dx*along+dy*across,y+dy*along-dx*across-up];
  const roofPoint=(a,b)=>point(a,b,h);
  const lRoof=train ? l*.89 : l*.57;
  const shade=ctx.createLinearGradient(x,y-h-7,x,y+7);
  shade.addColorStop(0,roof);
  shade.addColorStop(.43,roof);
  shade.addColorStop(1,'#637078');
  face(ctx,[point(-l,-w),point(l,-w),point(l,w),point(-l,w)],'#0a0e1290');
  face(ctx,[point(-l,-w),point(l,-w),roofPoint(lRoof,-w*.8),roofPoint(-lRoof,-w*.8)],'#363f43');
  face(ctx,[point(-l,w),point(l,w),roofPoint(lRoof,w*.8),roofPoint(-lRoof,w*.8)],train?'#778084':'#33454c');
  face(ctx,[point(l,-w),point(l,w),roofPoint(lRoof,w*.8),roofPoint(lRoof,-w*.8)],'#1b292e');
  face(ctx,[roofPoint(-lRoof,-w*.8),roofPoint(lRoof,-w*.8),roofPoint(lRoof,w*.8),roofPoint(-lRoof,w*.8)],shade);
  face(ctx,[point(l*.95,-w*.85,h*.32),point(l*.95,w*.85,h*.32),roofPoint(lRoof,w*.75),roofPoint(lRoof,-w*.75)],'#264656');
  if (train) {
    for (const side of [-1,1]) {
      for (let i=-2;i<=2;i++) {
        const a=l*i*.28,b=l*(i+.65)*.28;
        face(ctx,[point(a,w*side,h*.3),point(b,w*side,h*.3),point(b,w*side,h*.66),point(a,w*side,h*.66)],night>.38?'#b4dddf':'#415860');
      }
    }
  }
  for (const side of [-1,1]) {
    const projected=point(l+5,w*.72*side,-1);
    if (night>.29) lamp(ctx,projected,12*scale,'#e9ffff86');
    const [fx,fy]=point(l,w*.72*side,1);
    const [bx,by]=point(-l,w*.72*side,1);
    ctx.fillStyle='#eef7e5';ctx.fillRect(fx-1,fy-1,2,2);
    ctx.fillStyle='#d85a4e';ctx.fillRect(bx-1,by-1,2,2);
  }
}

const tracks=measure(rail),loop=measure(road,true),lane=measure(reflectedRoad,true);

export function streetVehiclesAt(seconds){
  return {
    shuttle:along(loop,(seconds/20+.1)%1),
    taxi:along(lane,(seconds/26+.47)%1),
  };
}

export function districtTraffic(canvas) {
  const context=canvas.getContext('2d');
  if (!context) return ()=>{};
  return (seconds,night)=>{
    context.clearRect(0,0,canvas.width,canvas.height);
    const {shuttle,taxi}=streetVehiclesAt(seconds);
    vehicle(context,taxi,{length:27,width:12,height:5,roof:'#52686c',night});
    vehicle(context,shuttle,{length:31,width:13,height:7,roof:'#b8aca2',night});
    const start=(seconds/25+.22)%1.25;
    for (let i=2;i>=0;i--) {
      const phase=start-i*.066;
      if (phase<0 || phase>1) continue;
      const position=along(tracks,phase);
      if (position.y>158 && position.y<277) context.globalAlpha=.7;
      vehicle(context,position,{length:46,width:18,height:8,roof:'#c2cccb',night,train:true});
      context.globalAlpha=1;
    }
  };
}
