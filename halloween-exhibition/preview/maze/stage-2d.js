import {palace2DLighting} from './lighting-model.js?v=20261019-interior1';
import {drawFurnishingFallback} from './palace-furnishing-art.js?v=20261019-interior1';
import {cameraDistanceScale,normalizeCameraZoom} from '../camera-distance.js?v=20261019-journey1';
import {monsterSprite} from './monster-motion.js?v=20261019-unified1';
import { MAP, CELL, FEATURES, OVERLORD_ROOM, blocked, nearby } from './maze-model.js?v=20261014-adventure2';
import { ALL_MONSTERS as MONSTERS, nearestMonster, monsterAvailable, monsterPose } from './encounter-model.js?v=20261016-living1';

// Canvas illustration authored for this room; no participant art or remote assets.
import {drawArtSprite,playerPose,loadArtImage} from './rpg-art.js?v=20261019-unified1';
import {OVERLORD_CHARACTER_PREVIEW} from './overlord-character-preview.js?v=20261030-art1';
import {getOverlordArtAtlas,overlordArtSource} from './overlord-art-source.js?v=20261030-body1';
import {drawOverlordArtRig} from './overlord-art-rig.js?v=20261030-body1';
import {followCamera,depthOrder,clampSceneCamera} from './rpg-model.js?v=20261014-adventure2';
const TILE=72,TAU=Math.PI*2;
export const EXIT={x:8,z:14};
export function stageCamera(state,width,height,cameraDistance='normal',cameraZoom=1){
  // A close, player-led view, not a scaled-down overview of the entire maze.
  const tile=Math.max(52,Math.min(86,width/6.2))*cameraDistanceScale(cameraDistance)*normalizeCameraZoom(cameraZoom);
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
export function palaceRoom(x,z){return x>18?'overlord':x<4.5?'veil':x>11.5?'lantern':z<6.5?'archive':'gallery';}
// Furniture lives on perimeter plinths. The two existing solid shelves keep their original feet.
export const PALACE_FURNISHINGS=Object.freeze([
 ['bookcase',6.2,11.2,149],['bookcase',9.8,11.2,149],
 ['cabinet',5.65,6.68,95],['cabinet',10.35,6.68,95],
 ['bookcase',5.65,.62,155],['bookcase',10.35,.62,155],['moonWindow',8,.62,176],
 ['tapestry',6.8,.65,98],['tapestry',9.2,.65,98],
 ['moonWindow',5,9.1,143],['moonWindow',11,9.1,143],
 ['palaceColumn',4.53,7.25,124],['palaceColumn',11.47,7.25,124],
 ['palaceColumn',4.53,13.72,124],['palaceColumn',11.47,13.72,124],
 ['planter',4.7,12.6,95],['planter',11.3,12.6,95],
 ['chaise',5.15,14.36,61],['chaise',10.85,14.36,61],
 ['harvest',5.95,14.38,73],['harvest',10.05,14.38,73],
 ['candelabra',6.2,11.16,80],['candelabra',9.8,11.16,80],
 ['armchair',4.72,8.3,70],['armchair',11.28,8.3,70],
 ['writingDesk',6.25,4.9,76],['armillary',9.9,4.9,91],
 ['planter',4.67,3.5,93],['planter',11.33,3.5,93],
 ['harvest',5,1.1,68],['harvest',11,1.1,68],
 ['cabinet',14,7.6,94],['moonWindow',14,7.52,146],
 ['palaceColumn',12.55,8.1,113],['palaceColumn',15.45,8.1,113],
 ['planter',12.65,11.85,77],['harvest',15.25,12.4,76],
 ['armchair',15.31,9.2,71],['writingDesk',13.25,12.46,68],
 ['tapestry',2,7.5,121],['cabinet',2,7.6,92],
 ['palaceColumn',.55,8.1,110],['palaceColumn',3.45,8.1,110],
 ['harvest',.75,12.3,79],['armillary',3.35,11.8,80],
 ['planter',.66,9.7,87],['chaise',2,12.42,58],
].map(([kind,x,z,size])=>Object.freeze({kind,x:x*TILE,y:z*TILE,depth:z*TILE,size})));
function floorClip(c){c.beginPath();for(let z=0;z<MAP.length;z++)for(let x=0;x<MAP[z].length;x++)if(MAP[z][x]==='.')c.rect(x*TILE-36,z*TILE-36,72,72);c.clip();}
function carpet(c,art,x,y,w,h,tint=null){
 c.save();rounded(c,x-w/2,y-h/2,w,h,8,'#0b303b');c.clip();
 const img=art?.images.carpet;if(img){for(let yy=y-h/2;yy<y+h/2;yy+=156)for(let xx=x-w/2;xx<x+w/2;xx+=156)c.drawImage(img,xx,yy,156,156);}
 if(tint){c.globalCompositeOperation='source-atop';c.fillStyle=tint;c.fillRect(x-w/2,y-h/2,w,h);c.globalCompositeOperation='source-over';}
 for(const [inset,width,color] of [[3,3,'#291e22'],[7,2,'#d1ad69'],[11,1,'#ffe1a36e'],[17,1,'#a58d5b']]){c.strokeStyle=color;c.lineWidth=width;c.strokeRect(x-w/2+inset,y-h/2+inset,w-inset*2,h-inset*2);}
 for(let a=0;a<8;a++){const px=x-w/2+23+a*(w-46)/7;c.strokeStyle='#e0bf7b70';c.lineWidth=1;for(const yy of[y-h/2+4,y+h/2-4]){c.beginPath();c.moveTo(px-3,yy-3);c.lineTo(px,yy);c.lineTo(px+3,yy-3);c.stroke();}}
 c.restore();
 // Fine fringe distinguishes the textile from the stone floor.
 c.strokeStyle='#d5ae7199';c.lineWidth=1;for(let xx=x-w/2+7;xx<x+w/2-7;xx+=5)for(const sy of[-1,1]){c.beginPath();c.moveTo(xx,y+sy*h/2);c.lineTo(xx+1,y+sy*(h/2+5));c.stroke();}
}
function medallion(c,x,y,r,color='#dfbb74'){
 c.save();c.translate(x,y);c.strokeStyle=color;c.globalAlpha=.65;
 for(const rr of[r,r-5,r*.7]){c.lineWidth=rr===r?2:1;c.beginPath();c.ellipse(0,0,rr,rr*.72,0,0,TAU);c.stroke();}
 for(let i=0;i<12;i++){const a=i*TAU/12;c.beginPath();c.moveTo(Math.cos(a)*(r-6),Math.sin(a)*(r-6)*.72);c.lineTo(Math.cos(a)*(r-15),Math.sin(a)*(r-15)*.72);c.stroke();}
 path(c,p=>{for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,rr=i%2?r*.18:r*.54;i?p.lineTo(Math.cos(a)*rr,Math.sin(a)*rr*.72):p.moveTo(Math.cos(a)*rr,Math.sin(a)*rr*.72);}p.closePath();},'#d4ac6255',color,1);
 c.restore();
}
function createArchitecture(makeCanvas,art){
 const cols=Math.max(...MAP.map(r=>r.length)),rows=MAP.length,cv=makeCanvas(cols*TILE,rows*TILE),c=cv.getContext('2d'),objects=[],lights=[];cv.width=cols*TILE;cv.height=rows*TILE;
 const walk=(x,z)=>MAP[z]?.[x]==='.';
 const exterior=c.createLinearGradient(0,0,cv.width,cv.height);exterior.addColorStop(0,'#202538');exterior.addColorStop(1,'#2c2532');c.fillStyle=exterior;c.fillRect(0,0,cv.width,cv.height);
 // The silhouette is a genuine palace plan; opaque wall mass makes routes legible.
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++)if(walk(x,z)){
   const px=x*TILE,py=z*TILE,room=palaceRoom(x,z),surface=room==='veil'?'marble':room==='lantern'||z>13?'limestone':'parquet';
   c.save();c.beginPath();c.rect(px-36,py-36,72,72);c.clip();
   if(room==='overlord'){if(art?.images.marble)c.drawImage(art.images.marble,(x%3)*170,(z%3)*170,170,170,px-36,py-36,72,72);else floorTile(c,x,z);c.fillStyle=(x+z)%2?'#25172588':'#17121e99';c.fillRect(px-36,py-36,72,72);c.strokeStyle='#c59d5755';c.strokeRect(px-35,py-35,70,70);if((x+z)%3===0)medallion(c,px,py,19,'#c4a46666');}else if(art?.images[surface])c.drawImage(art.images[surface],(x%3)*170,(z%3)*170,170,170,px-36,py-36,72,72);else floorTile(c,x,z);
   c.fillStyle=room==='archive'?'#40305512':room==='gallery'?'#26374f12':'#26374f08';c.fillRect(px-36,py-36,72,72);
   c.restore();
   for(const [dx,dz,kind]of[[0,-1,'north'],[0,1,'south'],[-1,0,'side'],[1,0,'side']])if(!walk(x+dx,z+dz)){
     objects.push({kind:'wall',x:px+dx*36,y:py+dz*36,depth:py+dz*36+(kind==='side'?36:0),orientation:kind,side:dx,room,seed:x*7+z*11});
     c.save();c.beginPath();c.rect(px-36,py-36,72,72);c.clip();
     const shadow=c.createLinearGradient(px+dx*36,py+dz*36,px+dx*2,py+dz*2);shadow.addColorStop(0,'#0b091d99');shadow.addColorStop(1,'#0b091d00');c.fillStyle=shadow;c.fillRect(px-36,py-36,72,72);c.restore();
   }
 }
 c.save();floorClip(c);
 carpet(c,art,8*TILE,11.1*TILE,186,360);medallion(c,8*TILE,12.2*TILE,70);
 carpet(c,art,8*TILE,3*TILE,250,223,'#38224055');medallion(c,8*TILE,3*TILE,83);
 carpet(c,art,14*TILE,10*TILE,119,247,'#82501e33');
 carpet(c,art,2*TILE,10*TILE,119,242,'#632d5a66');
 carpet(c,art,8*TILE,6*TILE,100,164);c.restore();
 carpet(c,art,23*TILE,6.7*TILE,96,590,'#9b003c99');
 objects.push({kind:'overlord-throne',x:23*TILE,y:2.4*TILE,depth:2.4*TILE});
 for(const z of[4,7,10])for(const x of[19.6,26.4]){objects.push({kind:'overlord-column',x:x*TILE,y:z*TILE,depth:z*TILE});lights.push({x:x*TILE,y:z*TILE-25,r:135,color:'#ff824c',power:.5,kind:'candle'});}
 for(const o of PALACE_FURNISHINGS)objects.push({...o});
 // Four architectural windows supply cool light, independently from the hand lantern.
 for(const [x,z]of[[5,9],[11,9],[8,.8],[14,7.7]]){
   lights.push({x:x*TILE,y:z*TILE-35,r:160,color:'#adc6ed',power:.28,kind:'moon'});
   c.save();floorClip(c);const gx=x*TILE,gy=z*TILE;
   const light=c.createLinearGradient(gx,gy,gx+52,gy+190);light.addColorStop(0,'#c2d6e944');light.addColorStop(1,'#b1cbe900');
   path(c,p=>{p.moveTo(gx-25,gy-14);p.lineTo(gx+26,gy-14);p.lineTo(gx+122,gy+180);p.lineTo(gx+4,gy+180);p.closePath();},light);
   c.strokeStyle='#16243448';c.lineWidth=4;for(let i=0;i<3;i++){c.beginPath();c.moveTo(gx-16+i*17,gy+20);c.lineTo(gx+24+i*29,gy+160);c.stroke();}c.restore();
 }
 for(const [x,z]of[[5.25,7.2],[10.75,7.2],[5,13.6],[11,13.6],[6.2,11.1],[9.8,11.1],[5.3,1.25],[10.7,1.25],[13,8.25],[15,11.9],[1,8.25],[3,11.9]]){
   objects.push({kind:'sconce',x:x*TILE,y:z*TILE,depth:z*TILE,size:40});lights.push({x:x*TILE,y:z*TILE-31,r:112,color:'#ffd08a',power:.43,kind:'candle',seed:x+z});
 }
 for(const [x,z]of[[7.2,4.2],[8.7,2.8],[14.65,11.8],[1.5,11.9]]){book(c,x*TILE,z*TILE,.23,'#70405a');book(c,x*TILE+15,z*TILE+7,-.1,'#3e5d66');}
 for(const [x,z]of[[5,7],[11,7],[1,8],[15,8],[5,1],[11,1]])objects.push({kind:'web',x:x*TILE,y:z*TILE-65,depth:z*TILE-80,flip:x%2?1:-1});
 return {ground:cv,objects,lights};
}
function drawWall(c,o,player,art){
 const {x,y,orientation,room}=o,cool=room==='veil',warm=room==='gallery'||room==='archive';c.save();
 if(orientation==='south'&&Math.abs(player.x-x)<55&&player.y<y&&y-player.y<58)c.globalAlpha=.34;
 const body=warm?'#a79a81':cool?'#685d78':'#9baca5',wood=warm?'#493022':cool?'#38293e':'#365054',trim=warm?'#b38a55':'#a9a083';
 if(room==='overlord'){rounded(c,x-37,y-94,74,101,2,'#21192a','#b78b47');c.fillStyle='#640f2b';c.fillRect(x-27,y-88,54,65);c.restore();return;}
 if(art.images.wallPanel){
   const im=art.images.wallPanel,side=orientation==='side',height=side?114:orientation==='north'?85:29,xx=x-(side?13:37),yy=y-(side?76:height),ww=side?26:74;
   if(side)c.drawImage(im,0,0,im.width*.24,im.height,xx,yy,ww,height);
   else if(orientation==='north')c.drawImage(im,0,0,im.width,im.height,xx,yy,ww,height+7);
   else c.drawImage(im,0,im.height*.6,im.width,im.height*.4,xx,yy,ww,height+7);
   if(cool||!warm){c.fillStyle=cool?'#34244840':'#23414924';c.fillRect(xx,yy,ww,height+7);}
   const shadow=c.createLinearGradient(side?xx:0,side?0:yy,side?xx+ww:0,side?0:yy+height);shadow.addColorStop(0,side?'#0a112a77':'#fff1c225');shadow.addColorStop(.35,'#1b152400');shadow.addColorStop(1,'#100d2540');c.fillStyle=shadow;c.fillRect(xx,yy,ww,height+7);c.strokeStyle='#b6a77d88';c.lineWidth=1;c.beginPath();c.moveTo(xx,yy+1);c.lineTo(xx+ww,yy+1);c.stroke();c.restore();return;
 }

 if(orientation==='side'){
   const g=c.createLinearGradient(x-13,0,x+13,0);g.addColorStop(0,'#262334');g.addColorStop(.45,body);g.addColorStop(1,'#3c3541');rounded(c,x-13,y-76,26,115,2,g,'#191a2666');
   if(art.images.limestone){c.save();c.globalAlpha*=.38;c.drawImage(art.images.limestone,(o.seed%3)*140,0,140,480,x-11,y-74,22,110);c.restore();}c.fillStyle=wood;c.fillRect(x-12,y-15,24,53);c.fillStyle=trim;c.fillRect(x-13,y-20,26,5);c.fillRect(x-13,y+33,26,5);c.fillStyle='#efdab24f';c.fillRect(x-10,y-73,3,109);
   for(let i=-3;i<=1;i++){c.strokeStyle='#2524355a';c.lineWidth=1;c.beginPath();c.moveTo(x-10,y+i*17);c.lineTo(x+10,y+i*17);c.stroke();}
 }else{
   const height=orientation==='north'?85:29,g=c.createLinearGradient(0,y-height,0,y+7);g.addColorStop(0,body);g.addColorStop(.57,warm?'#8b806e':cool?'#514458':'#7b8b86');g.addColorStop(1,wood);rounded(c,x-37,y-height,74,height+7,2,g,'#262131');
   if(art.images.limestone){c.save();c.globalAlpha*=.33;c.drawImage(art.images.limestone,(o.seed%3)*140,0,140,240,x-35,y-height+2,70,height-3);c.restore();}c.fillStyle='#211b28';c.fillRect(x-37,y-height-4,74,7);c.fillStyle=trim;c.fillRect(x-37,y-height-4,74,3);c.fillStyle='#efdab257';c.fillRect(x-35,y-height+4,70,2);
   if(orientation==='north'){
     for(let row=0;row<3;row++){const yy=y-height+13+row*14;c.fillStyle='#463d4338';c.fillRect(x-35,yy,70,1);c.fillRect(x+(row%2?-16:16),yy-12,1,12);}
     c.fillStyle=wood;c.fillRect(x-36,y-28,72,32);c.strokeStyle=trim;c.lineWidth=1;for(const ox of[-18,18]){c.strokeRect(x+ox-14,y-23,28,22);c.strokeStyle='#d5b77744';c.strokeRect(x+ox-11,y-20,22,16);c.strokeStyle=trim;}
     c.fillStyle=trim;c.fillRect(x-37,y-30,74,4);
   }
   c.fillStyle='#211824';c.fillRect(x-37,y+3,74,5);c.fillStyle=trim;c.fillRect(x-37,y+1,74,2);
 }
 c.restore();
}

function drawFrame(c,x,y,ghost=false,art){
 ellipse(c,x,y+25,31,9,'#0b06177f');rounded(c,x-29,y-43,58,77,4,'#523727','#d7b276');rounded(c,x-24,y-38,48,66,2,'#182334','#9d7644');
 if(art?.images.battle){c.save();c.beginPath();c.rect(x-21,y-35,42,59);c.clip();c.drawImage(art.images.battle,ghost?530:160,30,ghost?460:500,670,x-21,y-35,42,59);c.restore();}else{book(c,x,y-3,0,'#315460');}
 for(const sx of[-1,1])for(const sy of[-1,1]){c.fillStyle='#eed39a';c.beginPath();c.moveTo(x+sx*25,y-5+sy*34);c.lineTo(x+sx*18,y-5+sy*34);c.lineTo(x+sx*25,y-5+sy*27);c.closePath();c.fill();}
 plaque(c,ghost?'舞台の肖像':'展示案内',x,y+46,92);
}
function drawGate(c,state){const x=FEATURES.gate.x*TILE,y=FEATURES.gate.z*TILE;
  glow(c,x,y,125,state.unlocked?'#60c1a124':'#d4a55820');
  if(!state.unlocked){for(let i=-5;i<=5;i++){rounded(c,x+i*18-3,y-20,6,45,2,'#bd9563','#392741');path(c,p=>{p.moveTo(x+i*18-6,y-20);p.lineTo(x+i*18,y-31);p.lineTo(x+i*18+6,y-20);p.closePath();},'#d6b27a');}rounded(c,x-101,y-2,202,5,2,'#c7a174');rounded(c,x-12,y-8,24,25,5,'#e4b365','#3c2943');ellipse(c,x,y+3,3,4,'#5d3f44');}
  plaque(c,state.unlocked?'解錠済み｜浮遊書庫':state.hasKey?'解錠できる｜浮遊書庫':'鍵が必要｜浮遊書庫',x,y-53,175);
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
export function createStageRenderer({makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},art={images:{},version:0},loadQueenPreview=loadArtImage}={}){
  let architecture=createArchitecture(makeCanvas,art),artVersion=art.version,camera=null;
  const shade=makeCanvas(1,1),alphaCanvas=makeCanvas(1,1);let lastCanvas=null,lastSignature='',hitItems=[],lastState=null;
  let queenRequested=false,queenPreview=null,queenFull=null;
  const validImage=value=>{const image=value?.image||value;return (image?.width||image?.naturalWidth)>0&&(image?.height||image?.naturalHeight)>0;};
  function ensureQueen(){
    if(queenRequested)return;queenRequested=true;
    void overlordArtSource.start();
    // Flat exploration does not construct the WebGL character, so it must start
    // its own lazy load. The embedded art decodes independently of slow/failed
    // network requests and remains installed when the full image cannot load.
    void Promise.resolve().then(()=>loadQueenPreview(OVERLORD_CHARACTER_PREVIEW)).then(image=>{if(validImage(image)){queenPreview=image;lastSignature='';}}).catch(()=>{});
    void Promise.resolve().then(()=>art.ensure?.('nameless_overlord')).then(image=>{if(validImage(image)){queenFull=image;lastSignature='';}}).catch(()=>{});
  }
  const alphaCache=new WeakMap();
  const spriteBox=(sprite,x,y,height)=>{const im=sprite.image||sprite,f=sprite.frame||[0,0,im.width,im.height],hh=height*f[3]/(sprite.contentHeight||f[3]),ww=hh*f[2]/f[3];return {x:x-ww*(sprite.anchorX??.5),y:y-hh*(sprite.anchorY??1),w:ww,h:hh,sprite};};
  function opaqueAt(item,x,y){if(!item.sprite)return true;const sp=item.sprite,im=sp.image||sp,f=sp.frame||[0,0,im.width,im.height],key=f.join(',');let cache=alphaCache.get(im);if(!cache){cache=new Map();alphaCache.set(im,cache);}let data=cache.get(key);if(!data){try{alphaCanvas.width=Math.max(1,Math.ceil(f[2]));alphaCanvas.height=Math.max(1,Math.ceil(f[3]));const ac=alphaCanvas.getContext('2d');ac.drawImage(im,...f,0,0,alphaCanvas.width,alphaCanvas.height);data=ac.getImageData(0,0,alphaCanvas.width,alphaCanvas.height);cache.set(key,data);}catch{return true;}}
   const xx=Math.max(0,Math.min(data.width-1,Math.floor((x-item.x)/item.w*data.width))),yy=Math.max(0,Math.min(data.height-1,Math.floor((y-item.y)/item.h*data.height)));return data.data[(yy*data.width+xx)*4+3]>45;
  }
  function pickCreator(x,y){for(let i=hitItems.length-1;i>=0;i--){const o=hitItems[i];if(x<o.x||y<o.y||x>o.x+o.w||y>o.y+o.h||!opaqueAt(o,x,y))continue;if(o.id){const steps=Math.max(2,Math.ceil(Math.hypot(o.worldX-lastState.x,o.worldZ-lastState.z)*2));for(let n=1;n<steps;n++){const a=n/steps;if(blocked(lastState.x+(o.worldX-lastState.x)*a,lastState.z+(o.worldZ-lastState.z)*a,lastState))return null;}return o.id;}return null;}return null;}
  return {pickCreator,invalidate(){lastSignature='';camera=null;hitItems=[];},render({canvas,state,brightness=1,lantern=true,encounters=false,cleared=[],pixelRatio=1,time=0,dt=.016,motion=true,facing='down',walking=false,walkPhase=0,cameraDistance='normal',cameraZoom=1,creatorActors=[]}){
    if(artVersion!==art.version){artVersion=art.version;architecture=createArchitecture(makeCanvas,art);lastSignature='';}
    // The RAF clock already paces frames. Rounding it to 24Hz made nearby
    // patrols and camera settling jump in alternating 33/50ms steps at 60Hz.
    const signature=[cameraDistance,cameraZoom,canvas.width,canvas.height,pixelRatio,state.x,state.z,state.hasKey,state.unlocked,state.horrorAccepted,state.overlordUnlocked,brightness,lantern,encounters,cleared.join(','),facing,artVersion,overlordArtSource.version,motion?time:0,walking?walkPhase:0,creatorActors.map(a=>[a.id,a.x,a.z,a.facing,a.walking,a.phase||0,a.sprite?.poseVersion,a.sprite?.frame?.join(',')].join(':')).join(';')].join('|');if(canvas===lastCanvas&&signature===lastSignature)return false;lastCanvas=canvas;lastSignature=signature;
    const c=canvas.getContext('2d'),w=canvas.width/pixelRatio,h=canvas.height/pixelRatio,cam=stageCamera(state,w,h,cameraDistance,cameraZoom);
    camera=followCamera(camera,{x:cam.x,y:cam.y},dt,!motion);cam.x=camera.x;cam.y=camera.y;
    const player={x:state.x/CELL*TILE,y:state.z/CELL*TILE};hitItems=[];lastState={...state};
    const addHit=(box,id=null,worldX=0,worldZ=0)=>hitItems.push({...box,x:cam.originX+(box.x-cam.x)*cam.scale,y:cam.originY+(box.y-cam.y)*cam.scale,w:box.w*cam.scale,h:box.h*cam.scale,id,worldX,worldZ});
    c.setTransform(pixelRatio,0,0,pixelRatio,0,0);c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.fillStyle='#101927';c.fillRect(0,0,w,h);
    c.save();c.translate(cam.originX,cam.originY);c.scale(cam.scale,cam.scale);c.translate(-cam.x,-cam.y);c.drawImage(architecture.ground,0,0);
    const nameTags=[];
    const objects=[...architecture.objects,{kind:'gate',x:FEATURES.gate.x*TILE,y:FEATURES.gate.z*TILE,depth:FEATURES.gate.z*TILE},
      {kind:'key',x:FEATURES.key.x*TILE,y:FEATURES.key.z*TILE,depth:FEATURES.key.z*TILE+20},
      {kind:'article',x:FEATURES.article.x*TILE,y:FEATURES.article.z*TILE,depth:FEATURES.article.z*TILE+10},
      {kind:'portrait',x:FEATURES.horrorArt.x*TILE,y:FEATURES.horrorArt.z*TILE,depth:FEATURES.horrorArt.z*TILE+10},
      {kind:'exit',x:EXIT.x*TILE,y:EXIT.z*TILE,depth:EXIT.z*TILE},
      {kind:'player',x:player.x,y:player.y,depth:player.y}];
    for(const actor of creatorActors)if(actor.sprite)objects.push({kind:'creator',x:actor.x*TILE,y:actor.z*TILE,depth:actor.z*TILE,actor});
    if(!state.horrorAccepted)objects.push({kind:'door',x:FEATURES.horrorDoor.x*TILE,y:FEATURES.horrorDoor.z*TILE,depth:FEATURES.horrorDoor.z*TILE});
    if(encounters)for(const m of MONSTERS)if(monsterAvailable(m,state)&&(!m.optional||m.nativeModel||art.images[m.id])){const p=monsterPose(m,time,motion,state);objects.push({kind:'enemy',id:m.id,pose:p,x:p.x*TILE,y:p.z*TILE,depth:p.z*TILE,cleared:cleared.includes(m.id)});}
    objects.push({kind:'overlord-door',x:18*TILE,y:3*TILE,depth:3*TILE});
    for(const o of depthOrder(objects)){
      if(Math.abs((o.x-cam.x)*cam.scale)>w*.7+150||Math.abs((o.y-cam.y)*cam.scale)>h*.7+180)continue;
      if(o.kind==='overlord-throne')drawOverlordThrone(c,o.x,o.y);
      else if(o.kind==='overlord-column'){rounded(c,o.x-15,o.y-123,30,127,3,'#292334','#b88c48');for(const yy of[-120,-105,-8])rounded(c,o.x-22,o.y+yy,44,6,1,'#c09650');drawPumpkin(c,o.x,o.y-12,.6);}
      else if(o.kind==='overlord-door'){if(!state.overlordUnlocked){rounded(c,o.x-12,o.y-85,24,105,4,'#330d25','#dfb05c');glow(c,o.x,o.y-35,70,'#f12e5540');}plaque(c,'第666階層への封印扉',o.x,o.y-105,165);}
      else if(o.kind==='wall'){drawWall(c,o,player,art);const side=o.orientation==='side',hh=side?115:o.orientation==='north'?92:40;addHit({x:o.x-(side?13:37),y:o.y-(side?76:o.orientation==='north'?89:33),w:side?26:74,h:hh});}
      else if(o.kind==='web')web(c,o.x,o.y,o.flip);
      else if(o.kind==='sconce'){const flicker=motion?Math.sin(time*3.4+o.x)*.025+Math.sin(time*5.3+o.y)*.012:0;ellipse(c,o.x,o.y-2,15,5,'#19111f99');rounded(c,o.x-9,o.y-31,18,28,3,'#654a36','#c9a363');candle(c,o.x,o.y-12,.73+flicker);}
      else if(o.kind==='creator'){const a=o.actor,step=motion&&a.walking?Math.sin(a.phase||0):0,idle=motion&&!a.walking?Math.sin(time*1.2+o.x)*.45:0,hh=a.heightPx||86,yy=o.y-Math.abs(step)*1.2+idle;ellipse(c,o.x,o.y+3,Math.min(24,hh*.23),7,'#10101a77');drawArtSprite(c,a.sprite,o.x,yy,hh);addHit(spriteBox(a.sprite,o.x,yy,hh),a.interactive===false?null:a.id,a.x*CELL,a.z*CELL);
        if(a.interactive!==false&&(a.label||a.name||a.characterName)){const label=String(a.label||a.name||a.characterName);c.font='600 11px "Yu Gothic", sans-serif';const ww=Math.min(124,Math.max(48,c.measureText(label).width+16)),row=Math.round(a.z);let left=Math.round(a.x),right=left;while(MAP[row]?.[left-1]==='.')left--;while(MAP[row]?.[right+1]==='.')right++;const viewLeft=cam.x+(10-cam.originX)/cam.scale,viewRight=cam.x+(w-10-cam.originX)/cam.scale,xx=Math.max(Math.max((left-.5)*TILE+18,viewLeft)+ww/2,Math.min(Math.min((right+.5)*TILE-18,viewRight)-ww/2,o.x)),yy=o.y+15,screenX=cam.originX+(o.x-cam.x)*cam.scale,screenY=cam.originY+(yy-cam.y)*cam.scale;if(screenX>=8&&screenX<=w-8&&screenY>=10&&screenY<=h-15){nameTags.push({label,xx,yy,ww,id:a.id,worldX:a.x*CELL,worldZ:a.z*CELL});}}
      }
      
      else if(o.kind==='gate')drawGate(c,state);
      else if(o.kind==='key')drawKey(c,state);
      else if(o.kind==='article'||o.kind==='portrait')drawFrame(c,o.x,o.y,o.kind==='portrait',art);
      else if(o.kind==='exit')drawExit(c);
      else if(o.kind==='door')rounded(c,o.x-11,o.y-65,22,70,4,'#684e73','#c2a1a6');
      else if(o.kind==='player'){
        const step=motion&&walking?Math.sin(walkPhase):0,breathe=motion&&!walking?Math.sin(time*1.7)*.6:0;
        ellipse(c,o.x,o.y+3,19-Math.abs(step),7,'#050b1499');
        const sprite=playerPose(art,facing,walking&&motion,walkPhase);
        if(sprite)addHit(spriteBox(sprite,o.x,o.y-Math.abs(step)*1.5+breathe,86));
        if(!drawArtSprite(c,sprite,o.x,o.y-Math.abs(step)*1.5+breathe,86,{scaleX:1+step*.008,scaleY:1-Math.abs(step)*.012}))drawPlayer(c,o.x,o.y-18,lantern);
      }else if(o.kind==='enemy'){
        if(o.cleared&&o.id!=='nameless_overlord'){ellipse(c,o.x,o.y,15,8,'#d2ac65');text(c,'✓',o.x,o.y,16,'#362b35');continue;}
        const idle=motion?(o.id==='franken'?Math.abs(Math.sin(time*.65))*1.1:o.id==='zombie'?Math.abs(Math.sin(time*.8))*.8:o.id==='vampire'?Math.sin(time*.9)*1.3:Math.sin(time*1.9+o.x)*2.2):0;ellipse(c,o.x,o.y+3,25,8,'#07091488');
        if(o.id==='nameless_overlord'){ensureQueen();drawOverlordFallback(c,o.x,o.y,time,motion,art.images.nameless_overlord||queenFull||queenPreview);continue;}
        const monster=monsterSprite(art,o.id,{time,motion,patrol:o.pose});
        if(!drawArtSprite(c,monster,o.x,o.y+(monster?.animated?0:idle),o.id==='bat'?92:100,{flip:monster?.flip,rotation:motion&&['zombie','franken'].includes(o.id)?Math.sin(time*(o.id==='franken'?.65:.8))*.018:0,scaleX:1+(motion?Math.sin(time*1.4)*.018:0),scaleY:1+(motion?Math.cos(time*1.4)*.012:0)}))drawCreature(c,o.id,o.x,o.y-25,1.1);
      }else{
        ellipse(c,o.x,o.y+2,o.size*.25,7,'#080b1477');
        const foregroundAlpha=o.y>player.y&&o.y-player.y<o.size*.85&&Math.abs(o.x-player.x)<o.size*.45?.35:1;
        if(art.images[o.kind]&&foregroundAlpha>.5)addHit(spriteBox(art.images[o.kind],o.x,o.y,o.size));
        if(!drawArtSprite(c,art.images[o.kind],o.x,o.y,o.size,{alpha:foregroundAlpha})){
          c.save();c.globalAlpha=foregroundAlpha;drawFurnishingFallback(c,o);c.restore();
        }
      }
    }
    // Nameplates are interaction affordances. They stay readable above furniture,
    // but are never drawn for a resident hidden by a wall or a closed door.
    const placedNameTags=[];
    for(const tag of nameTags){let visible=true;const steps=Math.max(2,Math.ceil(Math.hypot(tag.worldX-state.x,tag.worldZ-state.z)*2));for(let n=1;n<steps;n++){const a=n/steps;if(blocked(state.x+(tag.worldX-state.x)*a,state.z+(tag.worldZ-state.z)*a,state)){visible=false;break;}}if(!visible)continue;const {label,xx,ww}=tag;let yy=tag.yy;const topLimit=cam.y+(14-cam.originY)/cam.scale,bottomLimit=cam.y+(h-24-cam.originY)/cam.scale;for(const offset of[0,23,-23,46,-46,69,-69]){const candidate=Math.max(topLimit,Math.min(bottomLimit,tag.yy+offset));if(MAP[Math.round(candidate/TILE)]?.[Math.round(xx/TILE)]!=='.')continue;if(!placedNameTags.some(p=>Math.abs(p.x-xx)<(p.w+ww)/2+3&&Math.abs(p.y-candidate)<23)){yy=candidate;break;}}placedNameTags.push({x:xx,y:yy,w:ww});rounded(c,xx-ww/2,yy-9,ww,19,8,'#151d29ed','#b99e6877');c.font='600 11px "Yu Gothic", sans-serif';c.fillStyle='#f0e4c6';c.textAlign='center';c.textBaseline='middle';c.fillText(label,xx,yy,ww-12);addHit({x:xx-ww/2,y:yy-9,w:ww,h:19},tag.id,tag.worldX,tag.worldZ);}
    // Slow, broad mist bands keep the room alive without particle noise or camera motion.
    if(motion){c.save();floorClip(c);for(const [z,seed]of[[13.5,0],[4.4,2],[10.8,5]]){const yy=z*TILE+Math.sin(time*.12+seed)*9,xx=8*TILE+Math.sin(time*.065+seed)*65;const mist=c.createRadialGradient(xx,yy,12,xx,yy,210);mist.addColorStop(0,'#b3bfd010');mist.addColorStop(1,'#b3bfd000');c.save();c.translate(xx,yy);c.scale(1,.19);c.fillStyle=mist;c.translate(-xx,-yy);c.fillRect(xx-230,yy-230,460,460);c.restore();}c.restore();}
    c.restore();
    // Ray-clipped handheld light: walls and locked gates cast real 2D occlusion.
    if(shade.width!==Math.ceil(w)||shade.height!==Math.ceil(h)){shade.width=Math.ceil(w);shade.height=Math.ceil(h);}
    const sc=shade.getContext('2d');sc.clearRect(0,0,w,h);const lightProfile=palace2DLighting(brightness),darkness=lightProfile.darkness;sc.fillStyle=`rgba(4,9,23,${darkness})`;sc.fillRect(0,0,w,h);
    const px=cam.originX+(player.x-cam.x)*cam.scale,py=cam.originY+(player.y-cam.y)*cam.scale;
    for(const light of architecture.lights){const lx=cam.originX+(light.x-cam.x)*cam.scale,ly=cam.originY+(light.y-cam.y)*cam.scale,rr=light.r*cam.scale;if(lx+rr<0||ly+rr<0||lx-rr>w||ly-rr>h)continue;const strength=(light.kind==='candle'?lightProfile.candlePower:lightProfile.moonPower)*(motion&&light.kind==='candle'?1+Math.sin(time*2.4+(light.seed||0))*.045:1);sc.save();sc.globalCompositeOperation='destination-out';const pool=sc.createRadialGradient(lx,ly,3,lx,ly,rr);pool.addColorStop(0,`rgba(0,0,0,${strength})`);pool.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=pool;sc.fillRect(lx-rr,ly-rr,rr*2,rr*2);sc.restore();}
    if(lantern){sc.save();sc.beginPath();for(let i=0;i<=128;i++){const a=i*TAU/128;let r=0;for(;r<270;r+=7){const xx=player.x+Math.cos(a)*r,yy=player.y+Math.sin(a)*r;if(blocked(xx/TILE*CELL,yy/TILE*CELL,state))break;}const xx=px+Math.cos(a)*r*cam.scale,yy=py+Math.sin(a)*r*cam.scale;if(i===0)sc.moveTo(xx,yy);else sc.lineTo(xx,yy);}sc.closePath();sc.clip();sc.globalCompositeOperation='destination-out';const light=sc.createRadialGradient(px,py-12,12,px,py-12,230*cam.scale);light.addColorStop(0,'rgba(0,0,0,.94)');light.addColorStop(.4,'rgba(0,0,0,.72)');light.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=light;sc.fillRect(0,0,w,h);sc.restore();}
    c.drawImage(shade,0,0,w,h);
    for(const light of architecture.lights){const lx=cam.originX+(light.x-cam.x)*cam.scale,ly=cam.originY+(light.y-cam.y)*cam.scale;if(light.kind==='candle')glow(c,lx,ly,58*cam.scale,'#ffc4720f');}
    const edge=c.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.3,w*.5,h*.48,Math.max(w,h)*.73);edge.addColorStop(0,'#0b101c00');edge.addColorStop(1,'#0b101c55');c.fillStyle=edge;c.fillRect(0,0,w,h);
    if(lantern)glow(c,px+18*cam.scale,py-36*cam.scale,85*cam.scale,'#e8ad5933');
    if(motion&&lantern)for(let i=0;i<7;i++){const angle=i*2.39996+time*.035,rad=30+(i*31%130),x=px+Math.cos(angle)*rad*cam.scale,y=py-20+Math.sin(angle*.8)*rad*cam.scale+Math.sin(time*.4+i)*4;ellipse(c,x,y,.8+(i%2)*.5,.8+(i%2)*.5,'#d8cb9e45');}
    // The DOM context action is the single interaction prompt in both modes.
    if(!state.hasKey)drawWayfinder(c,FEATURES.key,'鍵の間','#efd09b',cam,w,h);else if(!state.unlocked)drawWayfinder(c,FEATURES.gate,'書庫の扉','#efd09b',cam,w,h);else drawWayfinder(c,FEATURES.overlordDoor,'第666階層','#a9d1b3',cam,w,h);
    c.strokeStyle='#c6a77255';c.lineWidth=1;c.strokeRect(5.5,5.5,w-11,h-11);return true;
  }};
}

// Explicitly illustrated Canvas fallback, not presented as a 3D model.
function drawOverlordThrone(c,x,y){
 c.save();c.translate(x,y);glow(c,0,-116,118,'#e4b27e28');
 for(const [w,yy,h]of[[164,2,24],[144,-9,22],[121,-22,18]])rounded(c,-w/2,yy,w,h,2,'#221b29','#b68b48');
 path(c,p=>{p.moveTo(-61,0);p.lineTo(-61,-134);p.quadraticCurveTo(-61,-165,0,-204);p.quadraticCurveTo(61,-165,61,-134);p.lineTo(61,0);p.closePath();},'#241929','#cfa75c',3);
 path(c,p=>{p.moveTo(-44,-17);p.lineTo(-44,-128);p.quadraticCurveTo(-44,-153,0,-181);p.quadraticCurveTo(44,-153,44,-128);p.lineTo(44,-17);p.closePath();},'#6b1835','#e0bb72',2);
 for(let i=-2;i<=2;i++){const xx=i*19,yy=-176+Math.abs(i)*15;path(c,p=>{p.moveTo(xx-6,yy);p.lineTo(xx,yy-23);p.lineTo(xx+6,yy);},'#d7b26d','#ffdb94',1);}
 for(const sign of[-1,1]){for(let i=0;i<3;i++)rounded(c,sign*(49+i*6)-3,-143+i*12,6,134-i*12,2,'#342438','#c7a15e');rounded(c,sign*50-10,-47,20,43,4,'#2c2030','#d6ad65');ellipse(c,sign*50,-46,11,7,'#d8b56a');}
 for(let i=0;i<7;i++){const yy=-145+i*17;c.strokeStyle='#cfa66188';c.lineWidth=1;c.beginPath();c.moveTo(-28,yy);c.quadraticCurveTo(0,yy+11,28,yy);c.stroke();}
 medallion(c,0,-128,24,'#dab873');path(c,p=>{p.moveTo(0,-143);p.lineTo(8,-128);p.lineTo(0,-113);p.lineTo(-8,-128);p.closePath();},'#9f2643','#edbc86',1);
 rounded(c,-42,-25,84,20,4,'#a42c4c','#edc77d');c.restore();
}

function drawOverlordFallback(c,x,y,time,motion,sprite){
 c.save();ellipse(c,x,y+3,35,10,'#09091488');glow(c,x,y-62,75,'#b1263b18');
 const atlas=getOverlordArtAtlas();
 if(atlas)drawOverlordArtRig(c,atlas,{x,y,height:154,time,motion,state:'idle'});
 else if(sprite)drawArtSprite(c,sprite,x,y,154);
 c.restore();
}
