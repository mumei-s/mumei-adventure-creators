import { MAP, CELL, FEATURES, blocked, nearby } from './maze-model.js?v=20261014-adventure2';
import { MONSTERS, nearestMonster, monsterAvailable, monsterPose } from './encounter-model.js?v=20261014-adventure2';

// Canvas illustration authored for this room; no participant art or remote assets.
import {drawArtSprite,playerPose} from './rpg-art.js?v=20261014-adventure2';
import {followCamera,depthOrder,clampSceneCamera} from './rpg-model.js?v=20261014-adventure2';
const TILE=72,TAU=Math.PI*2;
export const EXIT={x:8,z:14};
export function stageCamera(state,width,height){
  // A close, player-led view, not a scaled-down overview of the entire maze.
  const tile=Math.max(52,Math.min(86,width/6.2));
  const scale=tile/TILE,originY=height*.55,target=clampSceneCamera({x:state.x/CELL*TILE,y:state.z/CELL*TILE},width,height,scale,originY);
  return {scale,...target,originX:width*.5,originY,tile};
}
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
function path(c,points,fill,stroke,width=1){c.beginPath();points(c);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function rounded(c,x,y,w,h,r,fill,stroke){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function text(c,value,x,y,size=14,color='#f6dab5',align='center'){c.font=`600 ${size}px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(value,x,y);}
function plaque(c,label,x,y,width=120){rounded(c,x-width/2,y-13,width,26,7,'#171322eF','#9f7258');text(c,label,x,y,12);}
function candle(c,x,y,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);glow(c,0,-14,35,'#efad4c40');ellipse(c,0,7,13,6,'#09071188');rounded(c,-5,-13,10,20,3,'#e9bc80','#6e4837');path(c,p=>{p.moveTo(0,-30);p.bezierCurveTo(-12,-16,-7,-10,0,-12);p.bezierCurveTo(8,-14,8,-19,0,-30);},'#ffbc4b');ellipse(c,0,-17,3,7,'#fff3bb');c.restore();}
export function drawPumpkin(c,x,y,scale=1,friendly=false){
  c.save();c.translate(x,y);c.scale(scale,scale);ellipse(c,0,12,31,12,'#09041188');glow(c,0,0,48,'#f79b2c20');
  ellipse(c,0,0,28,24,'#a33d19');for(const a of[-15,-7,5,15]){const skin=c.createLinearGradient(a-12,-22,a+12,22);skin.addColorStop(0,'#f3a140');skin.addColorStop(.45,a<0?'#e47a27':'#d66520');skin.addColorStop(1,'#a8431e');ellipse(c,a,0,13,23,skin);}
  path(c,p=>{p.moveTo(-4,-20);p.quadraticCurveTo(-7,-33,2,-34);p.lineTo(8,-31);p.quadraticCurveTo(-1,-29,2,-21);p.closePath();},'#668751','#213c35',2);
  path(c,p=>{p.moveTo(-20,-5);p.lineTo(-7,-9);p.lineTo(-8,2);p.closePath();p.moveTo(20,-5);p.lineTo(7,-9);p.lineTo(8,2);p.closePath();},'#ffdc79');
  path(c,p=>{p.moveTo(-15,9);p.quadraticCurveTo(0,24,16,8);p.lineTo(8,11);p.lineTo(8,16);p.lineTo(2,13);p.lineTo(-6,16);p.lineTo(-8,10);p.closePath();},'#ffca69');
  if(friendly){ellipse(c,-22,1,5,3,'#ffb851');ellipse(c,22,1,5,3,'#ffb851');}
  c.restore();
}
function book(c,x,y,angle=0,color='#6b4165'){c.save();c.translate(x,y);c.rotate(angle);rounded(c,-12,-17,24,34,3,color,'#b18c62');c.fillStyle='#e1c7a0';c.fillRect(-8,-13,16,3);c.fillStyle='#bd965f';c.fillRect(-7,-1,14,2);c.fillRect(-7,4,9,1);c.restore();}
function shelf(c,x,y,width=100){rounded(c,x-width/2,y-19,width,38,4,'#281c2b','#986649');for(let i=0;i<Math.floor(width/11)-1;i++){const xx=x-width/2+9+i*11,h=19+(i*7%10);rounded(c,xx,y+12-h,8,h,1,['#72525e','#49676d','#8b684b','#5a527a'][i%4]);c.fillStyle='#c1a16a';c.fillRect(xx,y+6,8,2);}c.fillStyle='#ad7952';c.fillRect(x-width/2,y+14,width,4);}
function web(c,x,y,flip=1){c.save();c.translate(x,y);c.scale(flip,1);c.strokeStyle='#b2a5ce55';c.lineWidth=1;for(let i=0;i<=4;i++){const a=i*Math.PI/8;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*60,Math.sin(a)*60);c.stroke();}for(const r of[18,37,57]){c.beginPath();c.arc(0,0,r,0,Math.PI/2);c.stroke();}c.restore();}
function floorTile(c,x,z){const px=x*TILE,py=z*TILE,zone=x<5?0:x>11?2:z<6?3:1;const colors=[['#49384e','#352b42'],['#454154','#343243'],['#4b464c','#353b47'],['#383c50','#2b3045']][zone];c.fillStyle=colors[(x+z)%2];c.fillRect(px-36,py-36,72,72);c.strokeStyle='#b09b8460';c.lineWidth=1;c.strokeRect(px-33,py-33,66,66);c.strokeStyle='#aca1ad13';for(let i=0;i<5;i++){c.beginPath();c.moveTo(px-27,py-24+i*12);c.lineTo(px+26,py-22+i*12);c.stroke();}path(c,p=>{p.moveTo(px,py-23);p.lineTo(px+23,py);p.lineTo(px,py+23);p.lineTo(px-23,py);p.closePath();},null,'#c7b38b19');for(const s of[-1,1])ellipse(c,px+s*28,py-28,1.6,1.6,'#bba17855');}
function createArchitecture(makeCanvas,art){
  const cv=makeCanvas(17*TILE,17*TILE),c=cv.getContext('2d'),objects=[];cv.width=17*TILE;cv.height=17*TILE;
  const walk=(x,z)=>MAP[z]?.[x]==='.';
  const exterior=c.createLinearGradient(0,0,cv.width,cv.height);exterior.addColorStop(0,'#172435');exterior.addColorStop(1,'#261e32');c.fillStyle=exterior;c.fillRect(0,0,cv.width,cv.height);
  for(let z=0;z<17;z++)for(let x=0;x<17;x++)if(walk(x,z)){
    const px=x*TILE,py=z*TILE;c.save();c.beginPath();c.rect(px-36,py-36,72,72);c.clip();
    if(art?.images.floor)c.drawImage(art.images.floor,(x%4)*128,(z%4)*128,128,128,px-36,py-36,72,72);
    else{const g=c.createLinearGradient(px-36,py-36,px+36,py+36);g.addColorStop(0,(x+z)%2?'#535b65':'#62616c');g.addColorStop(1,'#303c4e');c.fillStyle=g;c.fillRect(px-36,py-36,72,72);}
    // Irregular inset joints and worn hairline cracks, not a diagram grid.
    c.strokeStyle='#121a2a66';c.lineWidth=1.5;c.strokeRect(px-35,py-35,70,70);c.strokeStyle='#a5a8a32c';c.lineWidth=1;c.strokeRect(px-32,py-32,64,64);
    for(let i=0;i<14;i++){const seed=x*17+z*31+i*19,xx=px-30+(seed*7%59),yy=py-29+(seed*13%59);c.strokeStyle=i%2?'#b8b7a10b':'#07112419';c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+8+(seed%6),yy+(seed%3));c.stroke();}
    if((x*3+z)%7===0){c.strokeStyle='#17203266';c.beginPath();c.moveTo(px-31,py+8);c.lineTo(px-18,py+1);c.lineTo(px-9,py+5);c.stroke();}c.restore();
    for(const [dx,dz,kind]of[[0,-1,'north'],[0,1,'south'],[-1,0,'side'],[1,0,'side']])if(!walk(x+dx,z+dz))objects.push({kind:'wall',x:px+dx*36,y:py+dz*36,depth:py+dz*36+(kind==='side'?36:0),orientation:kind,side:dx});
  }
  const rugX=8*TILE,rugY=12*TILE;
  if(art?.images.battle){c.save();c.beginPath();c.ellipse(rugX,rugY+5,100,64,0,0,TAU);c.clip();c.drawImage(art.images.battle,500,615,560,330,rugX-110,rugY-65,220,135);c.restore();}
  for(const r of [66,87,99]){c.strokeStyle='#c9ab735c';c.lineWidth=1;c.beginPath();c.ellipse(rugX,rugY+5,r,r*.64,0,0,TAU);c.stroke();}
  const mx=8*TILE,my=9.3*TILE;for(const r of[45,65,71]){c.strokeStyle='#d3b88a40';c.beginPath();c.arc(mx,my,r,0,TAU);c.stroke();}ellipse(c,mx,my,22,22,'#b5c1b653');ellipse(c,mx+10,my-6,20,20,'#394458');
  // Environmental art is anchored to the wall line, outside walkable corridors.
  for(const [kind,x,z,size]of[['bookcase',6.2,11.2,160],['bookcase',9.8,11.2,160],['bookcase',5.7,6.55,153],['bookcase',10.3,6.55,153],['bookcase',6.4,.8,150],['bookcase',9.6,.8,150],['bookcase',14,7.6,145],['window',4.55,11.5,160],['window',11.45,11.5,160],['column',4.65,13.2,130],['column',11.35,13.2,130],['column',12.6,11,125],['column',15.4,11,125],['pumpkins',5.1,13.8,73],['pumpkins',10.9,13.8,73],['pumpkins',13.1,12,63],['pumpkins',14.9,12,68]])objects.push({kind,x:x*TILE,y:z*TILE,depth:z*TILE,size});
  for(const [x,z]of[[7.5,3],[8.4,2.8],[14.5,9.1]])book(c,x*TILE,z*TILE,.2,'#6d5263');
  // Quiet moonlight fans across the masonry and is clipped to the real floor.
  c.save();c.beginPath();for(let z=0;z<17;z++)for(let x=0;x<17;x++)if(walk(x,z))c.rect(x*TILE-36,z*TILE-36,72,72);c.clip();
  for(const side of[-1,1]){const sx=(side<0?4.6:11.4)*TILE,sy=11*TILE;const light=c.createLinearGradient(sx,sy,sx-side*180,sy+100);light.addColorStop(0,'#9ebfc53a');light.addColorStop(1,'#6a9fa300');path(c,p=>{p.moveTo(sx,sy-45);p.lineTo(sx-side*180,sy+65);p.lineTo(sx-side*140,sy+145);p.lineTo(sx,sy+15);p.closePath();},light);}c.restore();
  return {ground:cv,objects};
}
function drawWall(c,o,player){
  const {x,y,orientation}=o;c.save();
  if(orientation==='south'&&Math.abs(player.x-x)<50&&player.y<y&&y-player.y<53)c.globalAlpha=.58;
  if(orientation==='side'){const g=c.createLinearGradient(x-11,0,x+11,0);g.addColorStop(0,'#1c2835');g.addColorStop(.45,'#60616b');g.addColorStop(1,'#242634');rounded(c,x-12,y-54,24,94,3,g,'#78808155');for(let i=-3;i<=2;i++){c.fillStyle='#171d2e99';c.fillRect(x-10,y+i*16,20,2);}c.fillStyle='#b3a58b66';c.fillRect(x-10,y-54,3,90);}
  else{const height=orientation==='north'?53:34;const g=c.createLinearGradient(0,y-height,0,y+3);g.addColorStop(0,'#586277');g.addColorStop(.35,'#374456');g.addColorStop(1,'#182335');rounded(c,x-37,y-height,74,height+7,2,g,'#7e87985c');c.fillStyle='#a39a8b';c.fillRect(x-37,y-height,74,5);c.fillStyle='#111a29';c.fillRect(x-36,y-1,72,6);for(let row=0;row<3;row++){const yy=y-height+12+row*15;c.fillStyle='#222b3a';c.fillRect(x-35,yy,70,2);c.fillRect(x+(row%2?-15:12),yy-13,2,13);}c.fillStyle='#d0bca52f';c.fillRect(x-33,y-height+6,64,1);}
  c.restore();
}

function drawFrame(c,x,y,ghost=false){ellipse(c,x,y+25,31,9,'#0b06177f');rounded(c,x-27,y-37,54,70,5,'#7e5544','#e0ab66');rounded(c,x-21,y-31,42,57,2,'#29223f','#d0a37a');glow(c,x,y,37,'#9582df19');ellipse(c,x,y-9,10,12,'#a395be');path(c,p=>{p.moveTo(x-14,y+20);p.quadraticCurveTo(x-14,y,x,y-2);p.quadraticCurveTo(x+14,y,x+14,y+20);p.closePath();},'#746187');text(c,ghost?'舞台の肖像':'展示案内',x,y+43,12,'#ecd6b9');}
function drawGate(c,state){const x=FEATURES.gate.x*TILE,y=FEATURES.gate.z*TILE;
  glow(c,x,y,125,state.unlocked?'#60c1a124':'#d4a55820');
  if(!state.unlocked){for(let i=-5;i<=5;i++){rounded(c,x+i*18-3,y-20,6,45,2,'#bd9563','#392741');path(c,p=>{p.moveTo(x+i*18-6,y-20);p.lineTo(x+i*18,y-31);p.lineTo(x+i*18+6,y-20);p.closePath();},'#d6b27a');}rounded(c,x-101,y-2,202,5,2,'#c7a174');rounded(c,x-12,y-8,24,25,5,'#e4b365','#3c2943');ellipse(c,x,y+3,3,4,'#5d3f44');}
  plaque(c,state.unlocked?'OPEN · 浮遊書庫':'鍵でひらく · 浮遊書庫',x,y-53,175);
}
function drawKey(c,state){if(state.hasKey)return;const x=FEATURES.key.x*TILE,y=FEATURES.key.z*TILE;glow(c,x,y,58,'#ffd67555');ellipse(c,x,y+25,32,15,'#151024aa');ellipse(c,x,y+10,28,16,'#655565');ellipse(c,x,y+5,28,16,'#a17c6c');c.save();c.translate(x,y-10);c.rotate(-.55);c.strokeStyle='#ffe6a1';c.lineWidth=7;c.beginPath();c.arc(0,-16,11,0,TAU);c.stroke();c.beginPath();c.moveTo(0,-4);c.lineTo(0,24);c.lineTo(12,24);c.moveTo(0,15);c.lineTo(9,15);c.stroke();c.restore();plaque(c,'書庫の鍵',x,y+51,95);}
function drawExit(c){const x=EXIT.x*TILE,y=EXIT.z*TILE;glow(c,x,y-5,75,'#83bba333');rounded(c,x-36,y-20,72,55,11,'#18232a','#9abea5');rounded(c,x-28,y-14,56,43,7,'#31534d','#bad2a6');c.fillStyle='#c4b786';c.fillRect(x-2,y-14,3,43);ellipse(c,x+9,y+10,3,3,'#f6d992');plaque(c,'EXIT · 名鑑へ',x,y+51,124);}
export function drawCreature(c,id,x,y,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);
  if(id==='pumpkin'){drawPumpkin(c,0,0,1,true);ellipse(c,-15,26,10,5,'#5c3f63');ellipse(c,15,26,10,5,'#5c3f63');}
  else if(id==='ghost'){ellipse(c,0,28,29,9,'#10091c77');glow(c,0,-3,45,'#afd9e524');path(c,p=>{p.moveTo(-25,25);p.lineTo(-25,-4);p.bezierCurveTo(-25,-38,25,-38,25,-4);p.lineTo(29,26);p.quadraticCurveTo(17,14,10,27);p.quadraticCurveTo(0,14,-9,27);p.quadraticCurveTo(-19,15,-25,25);p.closePath();},'#ccddd9','#69849c',2);ellipse(c,-9,-3,3,6,'#33374b');ellipse(c,9,-3,3,6,'#33374b');ellipse(c,0,9,3,4,'#63778a');book(c,4,25,.15,'#637b8b');}
  else{ellipse(c,0,26,35,10,'#12091e77');path(c,p=>{p.moveTo(-8,4);p.lineTo(-43,-17);p.lineTo(-37,12);p.quadraticCurveTo(-27,3,-20,21);p.lineTo(0,12);p.lineTo(20,21);p.quadraticCurveTo(27,3,37,12);p.lineTo(43,-17);p.lineTo(8,4);p.closePath();},'#76598f','#be9cbe',2);path(c,p=>{p.moveTo(-16,-2);p.lineTo(-18,-29);p.lineTo(-4,-16);p.lineTo(5,-16);p.lineTo(19,-29);p.lineTo(16,0);p.closePath();},'#a085b3');ellipse(c,0,1,18,21,'#a085b3');ellipse(c,-7,-1,3,4,'#ffe5a5');ellipse(c,7,-1,3,4,'#ffe5a5');}
  c.restore();
}
function drawPlayer(c,x,y,lantern=true){c.save();c.translate(x,y);ellipse(c,0,22,21,8,'#06081099');
  // A readable little lantern keeper, not a triangle on a diagram.
  ellipse(c,-8,19,7,8,'#35283d');ellipse(c,8,19,7,8,'#35283d');
  path(c,p=>{p.moveTo(-20,15);p.quadraticCurveTo(-15,-5,0,-7);p.quadraticCurveTo(15,-5,20,15);p.quadraticCurveTo(0,27,-20,15);p.closePath();},'#79a3a0','#223c4e',3);
  ellipse(c,0,-12,18,20,'#add1bd');ellipse(c,0,-10,12,12,'#f4d4aa');path(c,p=>{p.moveTo(-17,-12);p.quadraticCurveTo(-14,-35,5,-31);p.quadraticCurveTo(22,-23,17,-8);p.quadraticCurveTo(8,-24,-17,-12);},'#82b4ad','#305b65',2);
  ellipse(c,-4,-11,1.8,2,'#4d3843');ellipse(c,5,-11,1.8,2,'#4d3843');
  path(c,p=>{p.moveTo(-14,0);p.quadraticCurveTo(0,9,17,-1);p.lineTo(12,7);p.lineTo(-9,9);p.closePath();},'#da8c58');
  c.strokeStyle='#e4b879';c.lineWidth=3;c.beginPath();c.moveTo(15,6);c.lineTo(26,4);c.stroke();
  rounded(c,21,2,14,21,3,'#5f453a','#e6b66c');rounded(c,24,6,8,13,2,lantern?'#ffe0a2':'#60515b');c.strokeStyle='#e9bd76';c.beginPath();c.arc(28,2,5,Math.PI,TAU);c.stroke();c.restore();
}
function drawWayfinder(c,feature,label,color,cam,w,h){const px=cam.originX+(feature.x*TILE-cam.x)*cam.scale,py=cam.originY+(feature.z*TILE-cam.y)*cam.scale;if(px>27&&px<w-27&&py>30&&py<h-30)return;const dx=px-w/2,dy=py-h/2;const ratio=Math.min((w/2-62)/Math.max(1,Math.abs(dx)),(h/2-30)/Math.max(1,Math.abs(dy)));const x=w/2+dx*ratio,y=h/2+dy*ratio;rounded(c,x-47,y-13,94,26,13,'#171321eD',color);text(c,`${Math.abs(dx)>Math.abs(dy)?dx>0?'→':'←':dy>0?'↓':'↑'} ${label}`,x,y,12,color);}
export function createStageRenderer({makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},art={images:{},version:0}}={}){
  let architecture=createArchitecture(makeCanvas,art),artVersion=art.version,camera=null;
  const shade=makeCanvas(1,1);let lastCanvas=null,lastSignature='';
  return {invalidate(){lastSignature='';camera=null;},render({canvas,state,brightness=1,lantern=true,encounters=false,cleared=[],pixelRatio=1,time=0,dt=.016,motion=true,facing='down',walking=false,walkPhase=0}){
    if(artVersion!==art.version){artVersion=art.version;architecture=createArchitecture(makeCanvas,art);lastSignature='';}
    const signature=[canvas.width,canvas.height,pixelRatio,state.x,state.z,state.hasKey,state.unlocked,state.horrorAccepted,brightness,lantern,encounters,cleared.join(','),facing,artVersion,motion?Math.floor(time*24):0,walking?Math.floor(walkPhase*10):0].join('|');if(canvas===lastCanvas&&signature===lastSignature)return false;lastCanvas=canvas;lastSignature=signature;
    const c=canvas.getContext('2d'),w=canvas.width/pixelRatio,h=canvas.height/pixelRatio,cam=stageCamera(state,w,h);
    camera=followCamera(camera,{x:cam.x,y:cam.y},dt,!motion);cam.x=camera.x;cam.y=camera.y;
    const player={x:state.x/CELL*TILE,y:state.z/CELL*TILE};
    c.setTransform(pixelRatio,0,0,pixelRatio,0,0);c.clearRect(0,0,w,h);c.fillStyle='#101927';c.fillRect(0,0,w,h);
    c.save();c.translate(cam.originX,cam.originY);c.scale(cam.scale,cam.scale);c.translate(-cam.x,-cam.y);c.drawImage(architecture.ground,0,0);
    const objects=[...architecture.objects,{kind:'gate',x:FEATURES.gate.x*TILE,y:FEATURES.gate.z*TILE,depth:FEATURES.gate.z*TILE},
      {kind:'key',x:FEATURES.key.x*TILE,y:FEATURES.key.z*TILE,depth:FEATURES.key.z*TILE+20},
      {kind:'article',x:FEATURES.article.x*TILE,y:FEATURES.article.z*TILE,depth:FEATURES.article.z*TILE+10},
      {kind:'portrait',x:FEATURES.horrorArt.x*TILE,y:FEATURES.horrorArt.z*TILE,depth:FEATURES.horrorArt.z*TILE+10},
      {kind:'exit',x:EXIT.x*TILE,y:EXIT.z*TILE,depth:EXIT.z*TILE},
      {kind:'player',x:player.x,y:player.y,depth:player.y}];
    if(!state.horrorAccepted)objects.push({kind:'door',x:FEATURES.horrorDoor.x*TILE,y:FEATURES.horrorDoor.z*TILE,depth:FEATURES.horrorDoor.z*TILE});
    if(encounters)for(const m of MONSTERS)if(monsterAvailable(m,state)){const p=monsterPose(m,time,motion,state);objects.push({kind:'enemy',id:m.id,x:p.x*TILE,y:p.z*TILE,depth:p.z*TILE,cleared:cleared.includes(m.id)});}
    for(const o of depthOrder(objects)){
      if(Math.abs((o.x-cam.x)*cam.scale)>w*.7+150||Math.abs((o.y-cam.y)*cam.scale)>h*.7+180)continue;
      if(o.kind==='wall')drawWall(c,o,player);
      else if(o.kind==='gate')drawGate(c,state);
      else if(o.kind==='key')drawKey(c,state);
      else if(o.kind==='article'||o.kind==='portrait')drawFrame(c,o.x,o.y,o.kind==='portrait');
      else if(o.kind==='exit')drawExit(c);
      else if(o.kind==='door')rounded(c,o.x-11,o.y-65,22,70,4,'#684e73','#c2a1a6');
      else if(o.kind==='player'){
        const step=motion&&walking?Math.sin(walkPhase):0,breathe=motion&&!walking?Math.sin(time*1.7)*.6:0;
        ellipse(c,o.x,o.y+3,19-Math.abs(step),7,'#050b1499');
        const sprite=playerPose(art,facing,walking&&motion,walkPhase);
        if(!drawArtSprite(c,sprite,o.x,o.y-Math.abs(step)*1.5+breathe,86,{scaleX:1+step*.008,scaleY:1-Math.abs(step)*.012}))drawPlayer(c,o.x,o.y-18,lantern);
      }else if(o.kind==='enemy'){
        if(o.cleared){ellipse(c,o.x,o.y,15,8,'#d2ac65');text(c,'✓',o.x,o.y,16,'#362b35');continue;}
        const idle=motion?(o.id==='franken'?Math.abs(Math.sin(time*.65))*1.1:o.id==='zombie'?Math.abs(Math.sin(time*.8))*.8:o.id==='vampire'?Math.sin(time*.9)*1.3:Math.sin(time*1.9+o.x)*2.2):0;ellipse(c,o.x,o.y+3,25,8,'#07091488');
        if(!drawArtSprite(c,art.images[o.id],o.x,o.y+idle,o.id==='bat'?92:100,{rotation:motion&&['zombie','franken'].includes(o.id)?Math.sin(time*(o.id==='franken'?.65:.8))*.018:0,scaleX:1+(motion?Math.sin(time*1.4)*.018:0),scaleY:1+(motion?Math.cos(time*1.4)*.012:0)}))drawCreature(c,o.id,o.x,o.y-25,1.1);
      }else{
        ellipse(c,o.x,o.y+2,o.size*.25,7,'#080b1477');
        const foregroundAlpha=o.kind==='bookcase'&&o.y>player.y&&o.y-player.y<o.size*.9&&Math.abs(o.x-player.x)<o.size*.4?.4:1;
        if(!drawArtSprite(c,art.images[o.kind],o.x,o.y,o.size,{alpha:foregroundAlpha})){
          if(o.kind==='pumpkins')drawPumpkin(c,o.x,o.y-20,.9);
          else if(o.kind==='bookcase')shelf(c,o.x,o.y-20,110);
          else if(o.kind==='column'){rounded(c,o.x-14,o.y-100,28,100,4,'#4b4c5f','#a1a0a0');candle(c,o.x,o.y-90,.9);}
          else{rounded(c,o.x-27,o.y-125,54,105,22,'#26384d','#8b93a2');glow(c,o.x,o.y-65,65,'#88a6c343');}
        }
      }
    }
    c.restore();
    // Ray-clipped handheld light: walls and locked gates cast real 2D occlusion.
    if(shade.width!==Math.ceil(w)||shade.height!==Math.ceil(h)){shade.width=Math.ceil(w);shade.height=Math.ceil(h);}
    const sc=shade.getContext('2d');sc.clearRect(0,0,w,h);const darkness=Math.max(.29,Math.min(.8,.66-(brightness-1)*.34));sc.fillStyle=`rgba(4,9,23,${darkness})`;sc.fillRect(0,0,w,h);
    const px=cam.originX+(player.x-cam.x)*cam.scale,py=cam.originY+(player.y-cam.y)*cam.scale;
    if(lantern){sc.save();sc.beginPath();for(let i=0;i<=128;i++){const a=i*TAU/128;let r=0;for(;r<270;r+=7){const xx=player.x+Math.cos(a)*r,yy=player.y+Math.sin(a)*r;if(blocked(xx/TILE*CELL,yy/TILE*CELL,state))break;}const xx=px+Math.cos(a)*r*cam.scale,yy=py+Math.sin(a)*r*cam.scale;if(i===0)sc.moveTo(xx,yy);else sc.lineTo(xx,yy);}sc.closePath();sc.clip();sc.globalCompositeOperation='destination-out';const light=sc.createRadialGradient(px,py-12,12,px,py-12,230*cam.scale);light.addColorStop(0,'rgba(0,0,0,.94)');light.addColorStop(.4,'rgba(0,0,0,.72)');light.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=light;sc.fillRect(0,0,w,h);sc.restore();}
    c.drawImage(shade,0,0,w,h);
    if(lantern)glow(c,px+18*cam.scale,py-36*cam.scale,85*cam.scale,'#e8ad5933');
    if(motion&&lantern)for(let i=0;i<19;i++){const angle=i*2.39996+time*.035,rad=30+(i*31%130),x=px+Math.cos(angle)*rad*cam.scale,y=py-20+Math.sin(angle*.8)*rad*cam.scale+Math.sin(time*.4+i)*4;ellipse(c,x,y,.8+(i%2)*.5,.8+(i%2)*.5,'#d8cb9e45');}
    const n=nearby(state),nearMonster=encounters?nearestMonster(state,cleared,{time,motion}):null;
    const cue={key:'E · 鍵を手に取る',gate:state.hasKey?'E · 書庫をひらく':'E · 鍵が必要です',article:'E · 展示を見る',horror:'E · 肖像の扉','horror-art':'E · 展示を見る',vault:'E · 書庫を調べる'}[n];
    const nearExit=Math.hypot(state.x-EXIT.x*CELL,state.z-EXIT.z*CELL)<3.2;
    const hint=nearExit?'E · 名鑑へ戻る':cue||(nearMonster?'B · 話しかける':null);
    if(hint){const yy=Math.min(h-28,py+35*cam.scale),ww=Math.min(w-24,150);rounded(c,Math.max(12,Math.min(w-ww-12,px-ww/2)),yy-14,ww,28,9,'#101523ef','#c8ad6c');text(c,hint,Math.max(12+ww/2,Math.min(w-12-ww/2,px)),yy,12,'#f1dcae');}
    if(!state.hasKey)drawWayfinder(c,FEATURES.key,'鍵の間','#efd09b',cam,w,h);else if(!state.unlocked)drawWayfinder(c,FEATURES.gate,'書庫の扉','#efd09b',cam,w,h);else drawWayfinder(c,FEATURES.vault,'浮遊書庫','#a9d1b3',cam,w,h);
    c.strokeStyle='#c6a77255';c.lineWidth=1;c.strokeRect(5.5,5.5,w-11,h-11);return true;
  }};
}
