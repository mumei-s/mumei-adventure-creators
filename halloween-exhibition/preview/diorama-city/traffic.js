const rail=[[-38,550],[72,333],[178,158],[277,-11]];
const road=[[538,618],[527,482],[520,383],[515,327],[495,327],[502,384],[509,484],[519,618]];
const reflectedRoad=[[532,618],[521,482],[514,383],[509,327],[489,327],[496,384],[503,484],[513,618]];

function measure(points) {
  const segments=points.slice(1).map(([x,y],i)=>{
    const from=points[i];
    const length=Math.hypot(x-from[0],y-from[1]);
    return {from,length,direction:[(x-from[0])/length,(y-from[1])/length]};
  });
  return {segments,length:segments.reduce((total,item)=>total+item.length,0)};
}
function along(track,phase) {
  let remaining=track.length*phase;
  for (const {from,length,direction:[dx,dy]} of track.segments) {
    if (remaining <= length) return {x:from[0]+dx*remaining,y:from[1]+dy*remaining,dx,dy};
    remaining-=length;
  }
  return null;
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

export function districtTraffic(canvas) {
  const context=canvas.getContext('2d');
  if (!context) return ()=>{};
  const tracks=measure(rail),loop=measure(road),lane=measure(reflectedRoad);
  return (seconds,night)=>{
    context.clearRect(0,0,canvas.width,canvas.height);
    const shuttle=along(loop,(seconds/20+.1)%1);
    const taxi=along(lane,(seconds/26+.47)%1);
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
