import {drawArtSprite,playerPose} from './rpg-art.js?v=20261019-unified1';

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const TAU=Math.PI*2;
function polygon(c,points,fill,stroke=null,lineWidth=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill,stroke=null,lineWidth=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function radial(c,x,y,r,inner,outer='#120b1900'){const g=c.createRadialGradient(x,y,0,x,y,Math.max(1,r));g.addColorStop(0,inner);g.addColorStop(1,outer);return g;}
function pointedArch(c,x,y,width,height,fill,stroke,lineWidth=1){const left=x-width/2,right=x+width/2,top=y-height;c.beginPath();c.moveTo(left,y);c.lineTo(left,top+height*.39);c.bezierCurveTo(left,top+height*.2,x-width*.18,top+height*.05,x,top);c.bezierCurveTo(x+width*.18,top+height*.05,right,top+height*.2,right,top+height*.39);c.lineTo(right,y);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
function diamond(c,x,y,rx,ry,color){polygon(c,[[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],color);}

/** Coordinates remain in CSS pixels; actors are fitted by their actual atlas frame. */
export function overlordBattle2DLayout(width,height,queen){
 const w=Math.max(1,width),h=Math.max(1,height),wide=w/h>2.2;
 const image=queen?.image||queen,frame=queen?.frame||[0,0,image?.width||2,image?.height||3];
 const aspect=frame[2]/Math.max(1,frame[3]);
 const queenHeight=Math.min(h*.88,w*.82/Math.max(.1,aspect)),queenWidth=queenHeight*aspect;
 const qx=Math.max(queenWidth/2+8,Math.min(w-queenWidth/2-8,w*(wide?.59:.61)));
 const heroHeight=Math.min(h*.35,w*.33),heroX=w*(wide?.28:.19);
 return {w,h,queen:{x:qx,y:h*.955,height:queenHeight,width:queenWidth},hero:{x:heroX,y:h*.965,height:heroHeight}};
}

function hall(c,{w,h,queen}){
 const qx=queen.x,horizon=h*.7,top=c.createLinearGradient(0,0,w,h);top.addColorStop(0,'#171320');top.addColorStop(.48,'#291221');top.addColorStop(1,'#070d17');c.fillStyle=top;c.fillRect(0,0,w,h);
 c.fillStyle=radial(c,qx,h*.32,h*.82,'#bf27464b');c.fillRect(0,0,w,h);
 // Deep arched niches sit behind the actors; all detail is drawn in this canvas.
 const windowWidth=Math.min(w*.5,h*.89),archHeight=h*.76;
 pointedArch(c,qx,horizon,windowWidth,archHeight,'#360f27','#a7834566',2);
 pointedArch(c,qx,horizon-2,windowWidth*.91,archHeight*.94,'#58142a','#e1b66c66',1);
 const moonX=qx+windowWidth*.17,moonY=h*.17,moonR=Math.min(h*.105,windowWidth*.24);
 ellipse(c,moonX,moonY,moonR,moonR,'#da786c','#e7bc7c88',1);
 ellipse(c,moonX+moonR*.3,moonY-moonR*.1,moonR*.88,moonR*.95,'#52152a');
 for(const sign of[-1,1])line(c,[[qx+sign*windowWidth*.18,horizon],[qx+sign*windowWidth*.18,h*.23]],'#e1b56a55',1);
 line(c,[[qx-windowWidth*.4,h*.43],[qx+windowWidth*.4,h*.43]],'#d6b47766',1);
 for(const sign of[-1,1]){
  const x=qx+sign*windowWidth*.67;
  pointedArch(c,x,horizon,windowWidth*.42,h*.62,'#110e1c','#b9934d77',1.2);
  polygon(c,[[x-windowWidth*.11,h*.13],[x+windowWidth*.11,h*.13],[x+windowWidth*.11,h*.57],[x,h*.64],[x-windowWidth*.11,h*.57]],'#7b173988','#d0a35e55',1);
  diamond(c,x,h*.35,windowWidth*.045,h*.047,'#d2a45799');
 }
 // Perspective marble, shallow gilded steps and a woven crimson aisle.
 const floor=c.createLinearGradient(0,horizon,0,h);floor.addColorStop(0,'#252335');floor.addColorStop(1,'#0e1622');polygon(c,[[0,horizon],[w,horizon],[w,h],[0,h]],floor);
 for(const x of[-w*.1,w*.15,w*.4,w*.66,w*.92,w*1.2])line(c,[[qx+(x-qx)*.05,horizon],[x,h]],'#a3a6b016',.7);
 for(const t of[.14,.42,.8]){const y=horizon+(h-horizon)*t*t;line(c,[[0,y],[w,y]],'#c8ac7830',.8);}
 const runner=c.createLinearGradient(0,horizon,0,h);runner.addColorStop(0,'#65112c');runner.addColorStop(1,'#af2548');polygon(c,[[qx-w*.055,horizon],[qx+w*.055,horizon],[qx+w*.25,h],[qx-w*.27,h]],runner,'#cea35f99',1);
 for(const sign of[-1,1])line(c,[[qx+sign*w*.045,horizon],[qx+sign*w*.224,h]],'#e0bd7988',.7);
 for(const y of[.79,.86,.95])for(const sign of[-1,1]){const t=(y-.7)/.3;diamond(c,qx+sign*w*(.035+.17*t),h*y,1.4+1.4*t,2+2*t,'#d5ae6d99');}
 for(let i=0;i<3;i++){const y=h*(.77+i*.036),spread=w*(.15+i*.035);polygon(c,[[qx-spread*.8,y],[qx+spread*.8,y],[qx+spread,y+h*.025],[qx-spread,y+h*.025]],i%2?'#2a2130':'#171824','#d6a65d99',.7);}
 // Fine throne silhouette gives the full-body artwork a grounded architectural setting.
 pointedArch(c,qx,h*.765,Math.min(w*.22,h*.41),h*.57,'#1b1323','#d3ad67aa',2);
 pointedArch(c,qx,h*.75,Math.min(w*.18,h*.34),h*.51,'#7d173bbb','#d3ad6755',.7);
 for(const sign of[-1,1]){
  const x=qx+sign*Math.min(w*.14,h*.255);line(c,[[x,h*.76],[x,h*.63],[x-sign*w*.025,h*.58]],'#cda35d',2);
  diamond(c,x,h*.62,2.5,4,'#dfbe7d');
 }
 // Foreground piers and candles frame the painting without covering the queen.
 for(const [side,x] of[[-1,w*.045],[1,w*.965]]){
  const column=c.createLinearGradient(x-w*.018,0,x+w*.018,0);column.addColorStop(0,'#070b13');column.addColorStop(.45,'#4a3644');column.addColorStop(.7,'#261b2b');column.addColorStop(1,'#080c15');
  c.fillStyle=column;c.fillRect(x-w*.023,0,w*.046,h*.74);line(c,[[x-w*.016,0],[x-w*.016,h*.72]],'#d0a65b55',1);line(c,[[x+w*.017,0],[x+w*.017,h*.72]],'#96764555',.7);
  for(const y of[.04,.67,.72])line(c,[[x-w*.035,h*y],[x+w*.035,h*y]],'#b68a4a88',2);
  const cx=x-side*w*.065,cy=h*.635;
  c.fillStyle=radial(c,cx,cy,h*.17,'#ffa55048');c.fillRect(cx-h*.18,cy-h*.18,h*.36,h*.36);
  line(c,[[cx,h*.79],[cx,cy+h*.025]],'#af8b51',1.4);line(c,[[cx-w*.03,cy+h*.04],[cx+w*.03,cy+h*.04]],'#c6a264',1.2);
  for(const dx of[-1,1]){const xx=cx+dx*w*.025;c.fillStyle='#ecd19b';c.fillRect(xx-1,cy+3,2,h*.057);polygon(c,[[xx,cy-5],[xx+2,cy+1],[xx,cy+4],[xx-2,cy+1]],'#ffe9ba');}
 }
 // Low-contrast chains add depth in the upper corners, never text over a face.
 for(const sign of[-1,1]){c.beginPath();c.moveTo(sign<0?0:w,h*.03);c.bezierCurveTo(w*.5,h*.18,w*.5,h*.04,qx+sign*windowWidth*.52,h*.02);c.strokeStyle='#b9934a44';c.lineWidth=1;c.stroke();}
 const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#05081644');shade.addColorStop(.24,'#07091600');shade.addColorStop(.8,'#0a0b1600');shade.addColorStop(1,'#05081655');c.fillStyle=shade;c.fillRect(0,0,w,h);
}

function boundedSprite(c,sprite,x,footY,actualHeight,{alpha=1,offsetX=0}={}){
 const image=sprite?.image||sprite;if(!image||!image.width||!image.height)return false;
 const frame=sprite.frame||[0,0,image.width,image.height],actualWidth=actualHeight*frame[2]/frame[3],requestedHeight=actualHeight*(sprite.contentHeight||frame[3])/frame[3];
 // Compensate atlas anchors so the complete frame remains inside the stage.
 const drawX=x+offsetX+actualWidth*((sprite.anchorX??.5)-.5),drawY=footY-actualHeight+actualHeight*(sprite.anchorY??1);
 return drawArtSprite(c,sprite,drawX,drawY,requestedHeight,{alpha,flip:sprite.flip??false});
}
function cut(c,sx,sy,tx,ty,progress,index=0,special=false){
 const p=smooth(progress),offset=(index-2)*3.8,x=sx+(tx-sx)*p,y=sy+(ty-sy)*p+offset,tail=Math.max(0,p-.36),tailX=sx+(tx-sx)*tail,tailY=sy+(ty-sy)*tail+offset;
 c.save();c.lineCap='round';c.shadowColor='#ff1749';c.shadowBlur=special?11:5;
 c.beginPath();c.moveTo(tailX,tailY);c.quadraticCurveTo((tailX+x)/2,(tailY+y)/2-12-index*2,x,y);c.strokeStyle=special?'#ee254a9c':'#ff73849c';c.lineWidth=special?4.6:2.7;c.stroke();
 c.shadowBlur=0;c.strokeStyle='#ffe0dc';c.lineWidth=1;c.stroke();c.restore();
}

/** Explicit 2D art renderer for unsupported WebGL; it never imitates native 3D. */
export function renderOverlordBattle2D({canvas,art,battle,effect,time=0,motion=true}){
 const c=canvas?.getContext?.('2d');if(!c)return false;
 const w=Math.max(1,canvas.clientWidth||canvas.width||360),h=Math.max(1,canvas.clientHeight||canvas.height||220),ratio=Math.min(1.5,Math.max(1,Number(globalThis.devicePixelRatio)||1));
 if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
 const queen=art?.images?.nameless_overlord,layout=overlordBattle2DLayout(w,h,queen),q=layout.queen,p=layout.hero;hall(c,layout);
 ellipse(c,q.x,q.y+h*.005,q.width*.3,Math.max(2,h*.014),'#050510a6');ellipse(c,q.x,q.y+h*.002,q.width*.45,Math.max(3,h*.022),null,'#d8af6e66',.8);
 const age=effect?Math.max(0,time-(effect.started||0)):99,active=motion&&effect&&age<3.2,counter=active&&age>1.4&&age<2.9&&!effect.finished&&(effect.retaliation>0||effect.blocked>0),counterProgress=clamp((age-1.4)/1.5);
 const hero=playerPose(art?.images?art:{...art,images:{}},'right',false,0,{battle:true,effect,time,motion}),heroMove=active&&effect.type==='attack'&&age<.7?Math.sin(age/.7*Math.PI)*Math.min(w*.06,24):0;
 const queenRecoil=active&&effect.damage&&age>.4&&age<1.1?Math.sin((age-.4)/.7*Math.PI)*Math.min(w*.018,7):0;
 const queenBreath=motion?Math.sin(time*.95)*h*.0014:0;
 c.fillStyle=radial(c,q.x,q.y-q.height*.4,q.height*.58,'#b0245030');c.fillRect(q.x-q.width*.7,q.y-q.height,q.width*1.4,q.height);
 const painted=boundedSprite(c,queen,q.x,q.y+queenBreath,q.height,{offsetX:queenRecoil,alpha:battle?.status==='won'?.94:1});
 if(!painted){c.fillStyle='#efd7aa';c.textAlign='center';c.font=`${Math.max(11,Math.min(15,w*.04))}px sans-serif`;c.fillText('覇王Sの姿を準備しています…',w*.56,h*.48);}
 ellipse(c,p.x,p.y+h*.004,p.height*.23,Math.max(2,h*.011),'#040813aa');boundedSprite(c,hero,p.x,p.y,p.height,{offsetX:heroMove});
 const targetX=p.x,targetY=p.y-p.height*.52,sourceX=q.x-q.width*.12,sourceY=q.y-q.height*.54;
 if(active&&effect.type==='shine'&&age<1.2){const t=smooth(age/1.1),x=targetX+(sourceX-targetX)*t,y=targetY+(sourceY-targetY)*t;c.fillStyle=radial(c,x,y,Math.min(h*.11,30),'#ffe8b8bd');c.fillRect(x-h*.12,y-h*.12,h*.24,h*.24);ellipse(c,x,y,2.3,2.3,'#fff1cc');}
 if(counter){
  const special=effect.counterSpecial,count=special?5:1;
  if(special){const radius=q.height*.28;ellipse(c,q.x,q.y-q.height*.55,radius,radius*.25,null,'#f2436577',1);}
  for(let i=0;i<count;i++){const delay=special?i*.075:0,t=clamp((counterProgress-delay)/.68);if(counterProgress>delay&&t<1)cut(c,sourceX+(i-2)*q.width*.11,sourceY-(i%2)*q.height*.16,targetX,targetY,t,i,special);}
 }
 if(effect?.type==='guard'&&battle?.charged){ellipse(c,p.x,p.y-p.height*.48,p.height*.31,p.height*.51,'#8cdcca12','#b6ead6bb',1.4);}
 if(battle?.status==='won'){c.fillStyle=radial(c,q.x,q.y-q.height*.25,q.height*.57,'#ffdc9030');c.fillRect(q.x-q.width*.8,q.y-q.height*.8,q.width*1.6,q.height*.8);}
 c.strokeStyle='#d1a65f88';c.lineWidth=.8;c.strokeRect(.5,.5,w-1,h-1);
 return {...layout,loading:!painted};
}
