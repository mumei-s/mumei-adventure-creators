import {drawCreatorHomeMotif2D} from './creator-home-painter.js?v=20261019-rooms1';

const TAU=Math.PI*2;
export function creatorInteriorPalette(map){
 const home=map.creatorHome||{},p=map.interiorPalette||{},source=home.homePalette||map.homePalette||{};
 return {wall:p.wall||source.wall||'#c8c1a8',floor:p.floor||'#8c705a',wood:p.wood||'#604b40',accent:p.accent||source.roof||'#586a7a',trim:p.trim||source.trim||'#d9bd83',paper:'#eee4ca',ink:'#253543',glass:'#b8d5d1'};
}
const line=(c,x,y,xx,yy,color,width=1)=>{c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function box(c,x,y,w,h,color,stroke=null,r=3){c.beginPath();c.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.4;c.stroke();}}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fillStyle=color;c.fill();}
function poly(c,points,color,stroke=null){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.2;c.stroke();}}
function text(c,value,x,y,size,color,max){c.font=`600 ${size}px "Yu Gothic",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(String(value||''),x,y,max);}
function paper(c,x,y,w,h,p){box(c,x,y,w,h,p.paper,p.trim,1);for(let n=0;n<4;n++)line(c,x+w*.13,y+h*(.23+n*.16),x+w*.84,y+h*(.23+n*.16),p.wood,.8);}
function plant(c,x,y,size,p,flowers=false){box(c,x-size*.2,y-size*.26,size*.4,size*.28,p.accent,p.trim,3);for(let n=0;n<6;n++){const a=n*2.4,xx=x+Math.sin(a)*size*.25,yy=y-size*(.42+(n%3)*.13);line(c,x,y-size*.2,xx,yy,'#71885e',2);ellipse(c,xx,yy,size*.14,size*.07,['#82976b','#a2b27e','#5e7f66'][n%3]);if(flowers){for(let i=0;i<5;i++)ellipse(c,xx+Math.cos(i*TAU/5)*size*.06,yy+Math.sin(i*TAU/5)*size*.06,size*.055,size*.05,p.paper);ellipse(c,xx,yy,size*.035,size*.035,p.trim);}}}
function framedMotif(c,x,y,w,h,map,p){box(c,x-w/2-4,y-h/2-4,w+8,h+8,p.wood,p.trim,2);box(c,x-w/2,y-h/2,w,h,p.accent,p.trim,1);drawCreatorHomeMotif2D(c,map.creatorHome?.motif||map.motif||'lantern',x,y,Math.min(w,h)*.31,p.trim);}

/** Floors, rugs and window light match each creator rather than the palace carpet. */
export function drawCreatorInteriorFloor2D(c,map,{tile=64}={}){
 if(!map.creatorHome)return false;const p=creatorInteriorPalette(map),w=map.width*tile,h=map.height*tile;
 const rx=w*.3,ry=h*.47,rw=w*.4,rh=h*.31;box(c,rx,ry,rw,rh,p.accent,p.trim,10);
 for(const inset of[7,13]){c.strokeStyle=inset===7?p.trim:p.paper;c.lineWidth=1.5;c.strokeRect(rx+inset,ry+inset,rw-inset*2,rh-inset*2);}
 const motif=map.creatorHome.motif||'lantern';drawCreatorHomeMotif2D(c,motif,w*.5,ry+rh*.48,Math.min(rw,rh)*.21,p.trim);
 for(let i=0;i<7;i++){line(c,rx-5,ry+20+i*(rh-40)/6,rx,ry+20+i*(rh-40)/6,p.trim,3);line(c,rx+rw,ry+20+i*(rh-40)/6,rx+rw+5,ry+20+i*(rh-40)/6,p.trim,3);}
 // Side light is a floor reflection, leaving the central walking aisle open.
 c.save();c.globalAlpha=.12;poly(c,[[w*.17,tile],[w*.32,tile],[w*.55,h*.45],[w*.24,h*.45]],p.paper);c.restore();
 const exit=(map.portals||[])[0];if(exit){const x=exit.x*tile,y=exit.z*tile;box(c,x-46,y-20,92,29,p.wood,p.trim,4);text(c,'街へ戻る ↓',x,y-5,12,p.paper,82);}
 return true;
}

export function drawCreatorInteriorWalls2D(c,map,{tile=64}={}){
 if(!map.creatorHome)return false;const p=creatorInteriorPalette(map),left=tile,right=(map.width-1)*tile,yy=1.4*tile,height=160;
 const g=c.createLinearGradient(0,yy-height,0,yy);g.addColorStop(0,p.wall);g.addColorStop(.68,p.wall);g.addColorStop(1,p.wood);box(c,left,yy-height,right-left,height,g,p.trim,2);
 for(let x=left+10;x<right;x+=70){line(c,x,yy-47,x,yy-2,p.trim,2);rect(c,x+4,yy-39,58,30,p.wood);}
 for(const y of[yy-47,yy-3])line(c,left,y,right,y,p.trim,4);
 for(const xx of[map.width*.22*tile,map.width*.78*tile]){
  box(c,xx-39,yy-139,78,92,p.wood,p.trim,12);box(c,xx-32,yy-133,64,79,p.glass,p.trim,9);
  c.save();c.globalAlpha=.45;poly(c,[[xx-31,yy-130],[xx-11,yy-130],[xx+30,yy-72],[xx+30,yy-55],[xx+17,yy-55]],p.paper);c.restore();
  line(c,xx,yy-131,xx,yy-55,p.wood,3);line(c,xx-30,yy-96,xx+30,yy-96,p.wood,3);box(c,xx-44,yy-48,88,8,p.trim,p.wood,1);
  for(const side of[-1,1])poly(c,[[xx+side*41,yy-141],[xx+side*59,yy-141],[xx+side*54,yy-52],[xx+side*42,yy-53]],p.accent,p.trim);
 }
 const cx=map.width*tile*.5;box(c,cx-164,yy-144,328,79,p.wood,p.trim,5);drawCreatorHomeMotif2D(c,map.creatorHome.motif,cx-132,yy-105,18,p.trim);
 text(c,map.creatorHome.creatorName,cx+15,yy-119,20,p.paper,274);text(c,map.roomLabel||map.creatorHome.homeLabel,cx+15,yy-91,13,p.trim,274);
 framedMotif(c,left+40,yy-95,44,50,map,p);framedMotif(c,right-40,yy-95,44,50,map,p);
 return true;
}

/** Native furniture follows the same collision footprints supplied by the map. */
export function drawCreatorFurniture2D(c,item,map,{tile=64}={}){
 if(!map.creatorHome)return false;const p=creatorInteriorPalette(map),w=(item.w||1)*tile,h=(item.h||1)*tile,x=item.x*tile,y=(item.z+item.h)*tile,k=item.kind,ink=p.wood,accent=item.color||p.accent;
 ellipse(c,x+w*.54,y+3,w*.53,Math.min(14,h*.12),'#111a2a39');
 const legs=(top=35)=>{for(const dx of[.08,.84])box(c,x+w*dx,y-top,w*.065,top,ink,p.trim,1);};
 const table=(lift=54)=>{legs(lift-8);poly(c,[[x-6,y-lift-h*.2],[x+w-1,y-lift-h*.2],[x+w+9,y-lift+6],[x+1,y-lift+6]],p.floor,p.trim);box(c,x-3,y-lift+5,w+8,9,ink,p.trim,1);};
 if(k==='bookshelf'||k==='shelf'||k==='display-case'){
  const high=k==='bookshelf'?Math.max(102,Math.min(175,w*.82)):90;box(c,x,y-high,w,high,ink,p.trim,2);
  const rows=k==='bookshelf'?4:2;for(let row=0;row<rows;row++){const yy=y-high+10+(row+1)*(high-15)/rows;box(c,x+6,yy-(high-20)/rows,w-12,(high-24)/rows,'#202c354f');
   if(k==='bookshelf'){const count=Math.min(19,Math.max(5,Math.floor(w/11)));for(let n=0;n<count;n++){const hh=20+(n*7+row*3)%16;box(c,x+10+n*(w-20)/count,yy-hh-4,(w-24)/count-2,hh,[p.accent,p.trim,p.wall,'#93717e'][n%4],null,1);line(c,x+12+n*(w-20)/count,yy-hh+2,x+12+n*(w-20)/count,yy-7,p.paper,.6);}}
   else for(let n=0;n<3;n++){const xx=x+w*(.2+n*.3);if(map.creatorHome.motif==='bread-loaf'){ellipse(c,xx,yy-11,13,8,'#d6a56d');line(c,xx-4,yy-14,xx+2,yy-8,p.paper,2);}else framedMotif(c,xx,yy-16,22,26,map,p);}
   box(c,x+3,yy-3,w-6,5,p.trim,ink,0);
  }
 }else if(k==='sofa'||k==='chair'||k==='pet-bed'||k==='bed'){
  const pet=k==='pet-bed',bed=k==='bed',high=pet?20:bed?26:43;box(c,x,y-h*.22-high,w,h*.22+high,ink,p.trim,8);box(c,x+6,y-h*.3-high+4,w-12,h*.3,accent,p.trim,8);box(c,x+8,y-high,w-16,high-7,p.wall,p.trim,5);
  if(!pet)for(const dx of[0,w-16])box(c,x+dx,y-h*.2-high,16,h*.2+high-8,accent,p.trim,5);
  if(bed)box(c,x+15,y-h*.3-high+7,w-30,24,p.paper,p.trim,7);else if(!pet){box(c,x+w*.16,y-high-9,w*.22,24,p.paper,p.trim,4);box(c,x+w*.63,y-high-9,w*.2,24,p.trim,p.wood,4);}
  if(pet){ellipse(c,x+w*.5,y-21,w*.23,12,p.accent);poly(c,[[x+w*.32,y-26],[x+w*.35,y-42],[x+w*.45,y-30],[x+w*.57,y-30],[x+w*.67,y-42],[x+w*.68,y-25]],p.accent);}
 }else if(k==='plant'||k==='flower')plant(c,x+w*.5,y,Math.min(w,h)*1.25,p,k==='flower'||['flower','iris-flower'].includes(map.creatorHome.motif));
 else if(k==='easel'){
  const xx=x+w*.5,hh=Math.max(100,w*.9);for(const side of[-1,1])line(c,xx+side*w*.42,y,xx+side*w*.13,y-hh,ink,7);line(c,xx,y,xx+10,y-hh*.8,p.trim,5);box(c,x+4,y-hh+14,w-8,hh*.64,p.paper,p.trim,2);
  framedMotif(c,xx,y-hh*.56,w*.7,hh*.45,map,{...p,accent});box(c,x-5,y-hh*.23,w+10,7,ink,p.trim,0);
 }else if(k==='instrument'||k==='piano'){
  legs(43);box(c,x,y-71,w,56,ink,p.trim,4);poly(c,[[x,y-71],[x+w,y-71],[x+w-10,y-95],[x+12,y-95]],accent,p.trim);box(c,x-3,y-29,w+6,20,p.paper,p.trim,1);
  for(let n=0;n<14;n++){const xx=x+n*w/14;line(c,xx,y-29,xx,y-10,ink,.8);if(n%7!==2&&n%7!==6)rect(c,xx+w/24,y-29,w/28,11,ink);}line(c,x+w*.4,y-100,x+w*.4,y-134,p.trim,3);ellipse(c,x+w*.35,y-104,6,4,p.trim);
 }else if(k==='monitor'||k==='video'||k==='camera'){
  table();const xx=x+w*.5;box(c,xx-w*.35,y-130,w*.7,60,ink,p.trim,5);box(c,xx-w*.31,y-124,w*.62,47,accent,p.glass,2);drawCreatorHomeMotif2D(c,map.creatorHome.motif,xx,y-101,14,p.trim);line(c,xx,y-70,xx,y-54,ink,7);box(c,xx-20,y-57,40,4,p.trim);box(c,x+w*.17,y-51,w*.56,7,p.ink,p.trim,1);
  box(c,x+w*.02,y-102,18,42,ink,p.trim,2);for(const yy of[y-91,y-74])ellipse(c,x+w*.02+9,yy,4,4,p.accent);
 }else if(k==='oven'||k==='bakery'){
  box(c,x,y-104,w,105,p.wall,p.trim,7);box(c,x+9,y-91,w-18,57,ink,p.trim,18);box(c,x+16,y-82,w-32,40,'#d99755',p.trim,14);for(let n=0;n<3;n++)ellipse(c,x+w*(.25+n*.25),y-57,Math.max(7,w*.11),7,'#e5bd78');box(c,x-5,y-28,w+10,13,ink,p.trim,1);box(c,x+w*.65,y-145,w*.2,42,p.wood,p.trim,1);
 }else if(k==='loom'||k==='knit'){
  legs(104);box(c,x-5,y-115,w+10,13,ink,p.trim,1);box(c,x-5,y-33,w+10,12,ink,p.trim,1);for(let n=0;n<12;n++)line(c,x+8+n*(w-16)/11,y-102,x+8+n*(w-16)/11,y-36,p.paper,1.3);
  for(let n=0;n<13;n++)line(c,x+8,y-85+n*3,x+w-8,y-85+n*3,n%2?accent:p.trim,2);ellipse(c,x+w*.3,y-14,13,10,accent);ellipse(c,x+w*.7,y-14,13,10,p.trim);
 }else if(k==='telescope'||k==='globe'){
  const xx=x+w*.5;for(const side of[-1,1])line(c,xx+side*w*.45,y,xx,y-71,ink,4);line(c,xx,y-12,xx,y-70,p.trim,4);line(c,xx-w*.27,y-61,xx+w*.35,y-105,p.accent,23);line(c,xx-w*.27,y-61,xx+w*.35,y-105,p.trim,12);ellipse(c,xx+w*.35,y-105,13,14,p.glass);
 }else{
  table();paper(c,x+w*.13,y-72,w*.33,29,p);box(c,x+w*.66,y-79,w*.17,26,accent,p.trim,2);for(let n=0;n<4;n++)line(c,x+w*(.68+n*.03),y-80,x+w*(.67+n*.03),y-100,p.trim,1.4);box(c,x+w*.46,y-48,w*.22,10,p.wall,p.trim,2);
 }
 if(item.label&&w>90){box(c,x+w*.5-51,y+7,102,21,'#162532ce',p.trim,3);text(c,item.label,x+w*.5,y+18,10,p.paper,94);}
 return true;
}

/** Repeated inlaid arrows plus an actual sign establish the route without a menu. */
export function drawCreatorRoute2D(c,map,{tile=64}={}){
 const path=map.routePath||[];if(path.length<2)return false;
 for(let i=1;i<path.length;i++){
  const from=path[i-1],to=path[i],dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),angle=Math.atan2(dz,dx);
  for(let d=.4;d<length;d+=1.05){const f=d/length,x=(from.x+dx*f)*tile,y=(from.z+dz*f)*tile;c.save();c.translate(x,y);c.rotate(angle);poly(c,[[-15,-10],[-3,-10],[10,0],[-3,10],[-15,10],[-2,0]],'#f5d899','#5f693f');c.restore();}
 }
 return true;
}
export function drawCreatorRouteSign2D(c,sign,{tile=64}={}){
 const x=sign.x*tile,y=sign.z*tile,scale=tile/64;c.save();c.translate(x,y);c.scale(scale,scale);
 if(sign.openPath){box(c,-3,-80,6,83,'#493a36','#d4b578',1);box(c,-87,-102,174,44,'#1a3e46','#edcf87',5);text(c,sign.label,0,-86,14,'#fff1c3',164);text(c,sign.sublabel,0,-69,9,'#cfdfd5',164);c.restore();return true;}
 for(const xx of[-70,70]){box(c,xx-4,-99,8,102,'#493a36','#d4b578',1);box(c,xx-9,-4,18,7,'#9e9982','#d6c18c',1);}
 box(c,-119,-117,238,66,'#1a3e46','#edcf87',7);box(c,-114,-112,228,56,null,'#b9d0b2',5);
 text(c,sign.label||'参加者の家・アトリエ',0,-93,18,'#fff1c3',217);text(c,sign.sublabel||'光る道をたどって、作者に会いに',0,-69,12,'#cfdfd5',217);
 for(const xx of[-107,107]){ellipse(c,xx,-110,4,4,'#ffe9a6');ellipse(c,xx,-57,3,3,'#ffe9a6');}
 c.restore();return true;
}
