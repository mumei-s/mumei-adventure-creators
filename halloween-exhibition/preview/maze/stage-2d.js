import { MAP, CELL, FEATURES } from './maze-model.js';
import { MONSTERS } from './encounter-model.js';

// Canvas illustration authored for this room; no participant art or remote assets.
const TILE=72,TAU=Math.PI*2;
export const EXIT={x:8,z:14};
export function stageCamera(state,width,height){
  // A close, player-led view, not a scaled-down overview of the entire maze.
  const tile=Math.max(52,Math.min(86,width/6.2));
  return {scale:tile/TILE,x:state.x/CELL*TILE,y:state.z/CELL*TILE,originX:width*.5,originY:height*.55,tile};
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
function createArchitecture(makeCanvas){
  const cv=makeCanvas(17*TILE,17*TILE),c=cv.getContext('2d');cv.width=17*TILE;cv.height=17*TILE;
  const walk=(x,z)=>MAP[z]?.[x]==='.';
  // Exterior slate and illustrated drifting mist remain visible around room edges.
  const exterior=c.createLinearGradient(0,0,cv.width,cv.height);exterior.addColorStop(0,'#242138');exterior.addColorStop(.5,'#181728');exterior.addColorStop(1,'#272034');c.fillStyle=exterior;c.fillRect(0,0,cv.width,cv.height);
  for(let i=0;i<100;i++){const x=(i*197)%cv.width,y=(i*337)%cv.height;ellipse(c,x,y,30+i%29,9+i%13,'#3e324817');}
  for(let z=0;z<17;z++)for(let x=0;x<17;x++)if(walk(x,z))floorTile(c,x,z);
  // Woven entry rug with a golden path woven into it.
  const rugX=8*TILE,rugY=12*TILE;rounded(c,rugX-80,rugY-68,160,158,9,'#603d56','#be8f62');rounded(c,rugX-69,rugY-57,138,136,6,'#4c304d','#bd885b');
  for(let i=-5;i<=5;i++){c.strokeStyle='#c38b5b';c.beginPath();c.moveTo(rugX+i*13,rugY+91);c.lineTo(rugX+i*13,rugY+99);c.stroke();}
  path(c,p=>{p.moveTo(rugX,rugY-38);p.lineTo(rugX+37,rugY+12);p.lineTo(rugX,rugY+60);p.lineTo(rugX-37,rugY+12);p.closePath();},null,'#d0a368',2);
  // The main hall's quiet lunar inlay has no animated pulses.
  const mx=8*TILE,my=9.4*TILE;c.strokeStyle='#ad8c6677';c.lineWidth=2;for(const r of[45,62,68]){c.beginPath();c.arc(mx,my,r,0,TAU);c.stroke();}
  for(let i=0;i<8;i++){const a=i*TAU/8;path(c,p=>{p.moveTo(mx+Math.cos(a)*40,my+Math.sin(a)*40);p.lineTo(mx+Math.cos(a)*60,my+Math.sin(a)*60);},null,'#bda27688',2);}
  ellipse(c,mx,my,21,21,'#c4b38d55');ellipse(c,mx+9,my-5,18,18,'#393648');
  // Raised masonry is drawn around passable geometry, preserving the true maze.
  for(let z=0;z<17;z++)for(let x=0;x<17;x++)if(walk(x,z)){
    const px=x*TILE,py=z*TILE;
    if(!walk(x,z-1)){rounded(c,px-37,py-49,74,26,3,'#171625','#6d5a77');c.fillStyle='#74617f';c.fillRect(px-36,py-49,72,7);c.fillStyle='#b29b9255';c.fillRect(px-33,py-47,64,2);for(let i=0;i<3;i++){c.fillStyle='#80718b55';c.fillRect(px-29+i*24,py-37,19,1);}c.fillStyle='#04030a55';c.fillRect(px-36,py-22,72,9);}
    if(!walk(x,z+1)){rounded(c,px-36,py+27,72,24,3,'#211c30','#4b405c');c.fillStyle='#79677e';c.fillRect(px-36,py+25,72,7);c.fillStyle='#c3a09355';c.fillRect(px-32,py+27,64,2);}
    for(const d of[-1,1])if(!walk(x+d,z)){rounded(c,px+d*36-9,py-35,18,73,3,'#292337','#736076');c.fillStyle='#9a7e83';c.fillRect(px+d*36-7,py-33,3,67);}
  }
  // Tall pillars, worn library furnishings, and amber lanterns establish scale.
  for(const [x,z]of[[5,7.4],[11,7.4],[5,11.8],[11,11.8],[13,8.1],[15,8.1],[5,1.5],[11,1.5]]){const xx=x*TILE,yy=z*TILE;ellipse(c,xx,yy+15,19,10,'#09071477');rounded(c,xx-12,yy-30,24,49,5,'#4b3a51','#967466');rounded(c,xx-17,yy-32,34,11,4,'#8f6c69','#c59a73');candle(c,xx,yy-32,.8);}
  for(const [x,z,w]of[[6,1.2,120],[10,1.2,120],[8,4.6,130],[14,8.1,106],[2,8.2,90]])shelf(c,x*TILE,z*TILE,w);
  for(const [x,z,s]of[[5.6,13.5,.9],[10.4,13.6,.72],[5.7,8.1,.65],[10.3,8,.8],[13.2,11.9,.75],[14.9,11.9,.9],[1.2,11.7,.8],[3,11.9,.7],[6,4.5,.8],[10.3,4.6,.8]])drawPumpkin(c,x*TILE,z*TILE,s);
  for(const [x,z]of[[5.1,7],[10.9,7],[13,8],[1,8],[5,1]])web(c,x*TILE,z*TILE,x>8?-1:1);
  for(const [x,z,a]of[[7.8,2.5,.2],[8.5,3,-.4],[7.1,4,.6],[14.7,9.1,-.3]])book(c,x*TILE,z*TILE,a);
  // Drapery and botanical silhouettes soften the cut stone into a haunted salon.
  for(const [x,z,flip]of[[4.55,11,1],[11.45,11,-1],[12.6,9.3,1],[15.4,9.3,-1]]){const xx=x*TILE,yy=z*TILE;c.save();c.translate(xx,yy);c.scale(flip,1);path(c,p=>{p.moveTo(-12,-64);p.bezierCurveTo(36,-50,18,-10,30,45);p.lineTo(3,57);p.bezierCurveTo(13,10,-10,-15,-12,-64);p.closePath();},'#56364f','#a77662',2);path(c,p=>{p.moveTo(0,-53);p.quadraticCurveTo(17,-11,17,44);p.moveTo(8,-49);p.quadraticCurveTo(24,-10,24,40);},null,'#ae776145');c.strokeStyle='#d4a45f';c.lineWidth=4;c.beginPath();c.moveTo(6,8);c.lineTo(26,3);c.stroke();c.restore();}
  for(const [x,z]of[[5.2,13],[10.8,13],[13,12.2],[15,12.2]]){const xx=x*TILE,yy=z*TILE;rounded(c,xx-10,yy-4,20,19,4,'#5c4149','#a77c61');for(let i=0;i<6;i++){const a=(i-3)*.45;path(c,p=>{p.moveTo(xx,yy);p.quadraticCurveTo(xx+Math.sin(a)*30,yy-30,xx+Math.sin(a)*19,yy-42);},null,i%2?'#729482':'#547569',4);}}
  // Painted signposts guide people even before an interactive object is close.
  // Direction plaques are placed during rendering only if fully on-screen.
  return cv;
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
export function createStageRenderer({makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;}}={}){
  const architecture=createArchitecture(makeCanvas);let lastCanvas=null,lastSignature='';
  return {invalidate(){lastSignature='';},render({canvas,state,brightness=1,lantern=true,encounters=false,cleared=[],pixelRatio=1}){
    const signature=[canvas.width,canvas.height,pixelRatio,state.x,state.z,state.hasKey,state.unlocked,state.horrorAccepted,brightness,lantern,encounters,cleared.join(',')].join('|');if(canvas===lastCanvas&&signature===lastSignature)return false;lastCanvas=canvas;lastSignature=signature;
    const c=canvas.getContext('2d'),w=canvas.width/pixelRatio,h=canvas.height/pixelRatio,cam=stageCamera(state,w,h);
    c.setTransform(pixelRatio,0,0,pixelRatio,0,0);c.clearRect(0,0,w,h);c.fillStyle='#11121f';c.fillRect(0,0,w,h);
    c.save();c.translate(cam.originX,cam.originY);c.scale(cam.scale,cam.scale);c.translate(-cam.x,-cam.y);c.drawImage(architecture,0,0);
    for(const [label,x,y]of[['EAST · 鍵の間',10.9*TILE,10*TILE-38],['WEST · 肖像',5.2*TILE,10*TILE-38]]){const sx=cam.originX+(x-cam.x)*cam.scale,sy=cam.originY+(y-cam.y)*cam.scale;if(sx-56*cam.scale>8&&sx+56*cam.scale<w-8&&sy-14*cam.scale>8&&sy+14*cam.scale<h-8)plaque(c,label,x,y,111);}
    drawGate(c,state);drawKey(c,state);drawFrame(c,FEATURES.article.x*TILE,FEATURES.article.z*TILE);drawFrame(c,FEATURES.horrorArt.x*TILE,FEATURES.horrorArt.z*TILE,true);drawExit(c);
    if(!state.horrorAccepted){const x=FEATURES.horrorDoor.x*TILE,y=FEATURES.horrorDoor.z*TILE;rounded(c,x-12,y-34,24,68,5,'#735275','#cea4b1');ellipse(c,x+2,y,3,3,'#e7c184');}
    for(const m of MONSTERS)if(encounters&&(!m.needsKey||state.unlocked)){if(cleared.includes(m.id)){ellipse(c,m.x*TILE,m.z*TILE,13,9,'#dfb669');text(c,'✓',m.x*TILE,m.z*TILE,16,'#453044');}else drawCreature(c,m.id,m.x*TILE,m.z*TILE,1.04);}
    c.restore();
    // The low-light veil is local to scene pixels. HUD controls are never dimmed.
    const dark=Math.max(.28,Math.min(.76,.63-(brightness-1)*.35));
    const light=c.createRadialGradient(cam.originX+16,cam.originY-8,lantern?16:0,cam.originX,cam.originY,lantern?Math.max(w,h)*.65:75);
    light.addColorStop(0,`rgba(5,7,20,${lantern?.03:dark*.7})`);light.addColorStop(lantern?.48:.4,`rgba(5,7,20,${lantern?dark*.35:dark})`);light.addColorStop(1,`rgba(5,7,20,${dark})`);c.fillStyle=light;c.fillRect(0,0,w,h);
    if(lantern)glow(c,cam.originX+21,cam.originY+8,Math.min(w,h)*.36,'#ffc37230');
    c.save();c.translate(cam.originX,cam.originY);c.scale(cam.scale,cam.scale);c.scale(1.12,1.12);drawPlayer(c,0,0,lantern);c.restore();
    // Objective markers remain legible at the edges of the close-up view.
    if(!state.hasKey)drawWayfinder(c,FEATURES.key,'鍵の間','#f2c477',cam,w,h);else if(!state.unlocked)drawWayfinder(c,FEATURES.gate,'書庫の扉','#f2c477',cam,w,h);else drawWayfinder(c,FEATURES.vault,'浮遊書庫','#a9d1b3',cam,w,h);
    // An engraved frame makes the viewport feel like a stage, without a HUD layer.
    c.strokeStyle='#ad82534d';c.lineWidth=1;c.strokeRect(5.5,5.5,w-11,h-11);for(const [x,y,sx,sy]of[[10,10,1,1],[w-10,10,-1,1],[10,h-10,1,-1],[w-10,h-10,-1,-1]]){c.strokeStyle='#d3a56a9c';c.beginPath();c.moveTo(x,y+sy*19);c.lineTo(x,y);c.lineTo(x+sx*19,y);c.stroke();}
    return true;
  }};
}
