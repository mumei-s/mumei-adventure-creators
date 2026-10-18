/** A layered Gothic palace, painted once per canvas. Animated details stay separate. */
const TAU=Math.PI*2, caches=new WeakMap();
const palette={stone:'#8b8494',light:'#b8a5a7',dark:'#4c485f',mortar:'#39374d',roof:'#352442',roofLight:'#6b497d',gold:'#b9945b',goldLight:'#e3c386',glass:'#efb969'};
const hash=(a,b=0)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s);};
function path(c,points,fill,stroke=null,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function ellipse(c,x,y,rx,ry,color,stroke=null,width=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function gradient(c,x,y,w,h,stops){const g=c.createLinearGradient(x,y,x+w,y+h);for(const[offset,color]of stops)g.addColorStop(offset,color);return g;}
function halo(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function arch(c,x,y,w,h){const top=y-h,shoulder=top+w*.65;c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x+w/2,y);c.lineTo(x+w/2,shoulder);c.bezierCurveTo(x+w/2,top+w*.3,x+w*.16,top+w*.09,x,top);c.bezierCurveTo(x-w*.16,top+w*.09,x-w/2,top+w*.3,x-w/2,shoulder);c.closePath();}
function archFill(c,x,y,w,h,fill,stroke=null,lineWidth=1){arch(c,x,y,w,h);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
function masonry(c,x,y,w,h,row=17,curved=false){
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  for(let r=0;r<Math.ceil(h/row);r++){
    const yy=y+r*row,offset=r%2?row:0;
    line(c,x,yy,x+w,yy,'#29283c65',1);line(c,x,yy+1,x+w,yy+1,'#edc8b51a',1);
    for(let i=-1;i<w/(row*2)+1;i++){
      let xx=x+i*row*2+offset;if(curved){const f=(xx-x)/w;xx=x+w*(.5+Math.sin((f-.5)*Math.PI)*.5);}
      line(c,xx,yy,xx,yy+row,'#2e2c3e66',1);
      if(hash(r,i)>.7)rect(c,xx+2,yy+3,row*1.2,2,'#e9c9b010');
    }
  }c.restore();
}
function cornice(c,x,y,w,depth=8){
  path(c,[[x-3,y],[x+w+3,y],[x+w+8,y+depth*.5],[x+w+3,y+depth],[x-3,y+depth]],'#494555','#c9ad7b',1);
  rect(c,x-3,y,w+6,2,'#e3bd8333');rect(c,x,y+depth-1,w,3,'#242333aa');
  for(let i=8;i<w;i+=15)rect(c,x+i,y+depth,5,5,'#92808c');
}
function window(c,x,y,w=25,h=52,glass='#efb969',ornate=true){
  halo(c,x,y-h*.45,w*1.2,'#ffaf511c');archFill(c,x+2,y+3,w+12,h+10,'#262435');
  archFill(c,x,y,w+8,h+8,'#a48b78','#d1b384',1.2);archFill(c,x,y-3,w,h,gradient(c,0,y-h,0,h,[[0,'#995b3f'],[.58,glass],[1,'#8d5e48']]),'#413544',2);
  line(c,x,y-h+9,x,y-3,'#685145',1.8);line(c,x-w*.48,y-h*.37,x+w*.48,y-h*.37,'#685145',1.5);
  if(ornate){const yy=y-h*.66;line(c,x-w*.42,yy+10,x,yy-2,'#f0cb8311',1);line(c,x-w*.4,yy+10,x,yy-6,'#705544',1);line(c,x+w*.4,yy+10,x,yy-6,'#705544',1);ellipse(c,x,y-h*.37,w*.13,w*.13,null,'#806045',1);}
  rect(c,x-w/2-7,y+1,w+14,4,'#cfaf7a');rect(c,x-w/2-7,y+5,w+14,4,'#403749');
}
function roof(c,x,y,r,h){
  const left=x-r,right=x+r,top=y-h;
  path(c,[[left-3,y+3],[x,top],[right+3,y+3]],gradient(c,left,0,r*2,0,[[0,'#241e35'],[.2,'#554064'],[.48,'#765482'],[.67,'#45304f'],[1,'#231c32']]),'#b29264',1.6);
  path(c,[[x,top],[x+r*.18,y],[right,y]],'#17162b44');
  for(let row=1;row<12;row++){
    const f=row/12,yy=top+h*f,rr=r*f;
    line(c,x-rr,yy,x+rr,yy,'#151426aa',1.5);line(c,x-rr+1,yy+1,x+rr-1,yy+1,'#bb8ebf33',1);
    for(let tile=-5;tile<=5;tile++){
      const tx=x+(tile+(row%2?.5:0))*rr/5;if(Math.abs(tx-x)>rr)continue;
      line(c,tx,yy,tx+(tx-x)*.09,yy+h/12,'#241a3288',1);
    }
  }
  cornice(c,left-2,y+1,r*2+4,7);
  line(c,x,top-2,x,top-25,palette.gold,2);path(c,[[x,top-35],[x+4,top-26],[x,top-18],[x-4,top-26]],'#d7b575','#342c3c',1);
}
function tower(c,x,base,r,height,roofHeight,{balcony=false,rear=false}={}){
  const top=base-height,p=palette;
  path(c,[[x-r+7,base+1],[x+r-6,base+1],[x+r-2,top+4],[x+r-12,top-5],[x-r+10,top-5],[x-r-2,top+4]],gradient(c,x-r,0,r*2,0,[[0,'#454153'],[.12,'#736d7d'],[.33,rear?'#ad989c':'#bea8a6'],[.56,'#9c8993'],[.83,'#6c6276'],[1,'#433e53']]),'#292739',2);
  masonry(c,x-r+1,top,r*2-2,height,19,true);
  // Narrow vertical ribs distinguish dressed stone from a smooth cylinder.
  for(const side of[-1,1]){const xx=x+side*r*.7;rect(c,xx-2,top+7,3,height-13,side<0?'#c6b2aa55':'#3b344c66');}
  for(const yy of[base-8,base-height*.53,top+12]){cornice(c,x-r-4,yy,r*2+8,6);}
  for(const fraction of[.24,.58,.83]){const yy=base-height*fraction;if(yy>top+44)window(c,x-2,yy,Math.max(15,r*.39),Math.max(35,r*.82),'#f9d38b');}
  if(balcony){const yy=base-height*.54;ellipse(c,x,yy+12,r*1.28,12,'#383344');ellipse(c,x,yy+5,r*1.28,10,'#ad9998','#c6ad7f',1);for(let n=-5;n<=5;n++){const xx=x+n*r*.21,curve=Math.sqrt(Math.max(0,1-(n/6)**2));line(c,xx,yy+3+curve*8,xx,yy-25+curve*6,'#3b3343',3);ellipse(c,xx,yy-26+curve*6,2,2,'#c4a365');}c.beginPath();c.ellipse(x,yy-23,r*1.24,10,0,0,Math.PI);c.strokeStyle='#ccaa70';c.lineWidth=3;c.stroke();}
  roof(c,x,top-2,r*1.33,roofHeight);
  if(!rear){path(c,[[x-r-5,base],[x+r+5,base],[x+r+9,base+10],[x-r-9,base+10]],'#a08c91','#d1b280',1);rect(c,x-r-8,base+10,r*2+16,5,'#343344');}
}
function buttress(c,x,base,height){
  path(c,[[x-11,base],[x+13,base],[x+10,base-height*.5],[x+5,base-height],[x-6,base-height],[x-9,base-height*.5]],gradient(c,x-11,0,24,0,[[0,'#ba9f9c'],[.35,'#92808b'],[.7,'#696174'],[1,'#3c374f']]),'#413a4f',1);
  for(const yy of[base-15,base-height*.49,base-height*.84])cornice(c,x-13,yy,27,5);
  path(c,[[x-11,base-height],[x+1,base-height-22],[x+12,base-height]],'#48304f','#c2a071',1);
}
function foliage(c,x,y,mirror=1){
  c.save();c.translate(x,y);c.scale(mirror,1);
  c.strokeStyle='#65513b';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(15,-45,-16,-70,2,-122);c.stroke();
  for(let i=0;i<26;i++){const yy=-i*4.7,xx=Math.sin(i*.8)*11+(hash(i,3)-.5)*15;path(c,[[xx-4,yy-3],[xx,yy-9],[xx+6,yy-4],[xx+3,yy+4],[xx-3,yy+5]],['#a9683e','#b17c48','#73533b','#d1904a','#6e514b'][i%5]);}
  c.restore();
}
function gate(c,x,y){
  const p=palette;buttress(c,x-86,y-2,235);buttress(c,x+86,y-2,235);
  archFill(c,x+5,y,152,226,'#2b253b','#4b3d4f',5);
  archFill(c,x,y-1,148,225,gradient(c,x-74,0,148,0,[[0,'#7b6976'],[.25,'#d0b39d'],[.5,'#a18b89'],[1,'#5d5168']]),'#cba96f',2);
  archFill(c,x,y-3,126,208,'#343043','#e5bf7b',2);archFill(c,x,y-4,114,199,gradient(c,x-57,0,114,0,[[0,'#302633'],[.3,'#6b4939'],[.51,'#3b2b31'],[.8,'#72503c'],[1,'#312535']]),'#a7824c',2);
  for(const side of[-1,1]){
    const xx=x+side*28;archFill(c,xx,y-34,37,126,'#946e49','#c39a5e',2);archFill(c,xx,y-38,29,117,gradient(c,0,y-155,0,117,[[0,'#29394f'],[.5,side<0?'#378f95':'#a76488'],[1,'#34515e']]),'#d3ad67',1);
    for(let i=0;i<3;i++){const yy=y-62-i*30;path(c,[[xx,yy-15],[xx+10,yy],[xx,yy+15],[xx-10,yy]],null,'#dcc286',1.2);}
    line(c,xx,y-149,xx,y-40,'#d8b475',1);ellipse(c,x+side*8,y-67,3,4,'#efcf8d','#624737',1);
    rect(c,x+side*26-22,y-26,44,16,'#856046');rect(c,x+side*26-21,y-25,42,2,'#c9a369');
  }
  line(c,x,y-200,x,y-4,'#cfab6a',2);
  // Wedge-shaped voussoirs follow the pointed arch, including a proud keystone.
  for(let side of[-1,1])for(let i=0;i<6;i++){const f=i/6,xx=x+side*(70*(1-f*f)),yy=y-149-72*f;line(c,xx,yy,xx+side*(9-4*f),yy-5,'#5a4a5e',1.4);}
  path(c,[[x-9,y-229],[x,y-242],[x+9,y-229],[x+6,y-211],[x-6,y-211]],'#e2bf7d','#846647',1);
  for(let i=3;i>=0;i--){const yy=y+4+i*9,width=166+i*23;rect(c,x-width/2,yy,width,8,gradient(c,0,yy,0,8,[[0,'#ac9c95'],[.3,'#cfbaa1'],[.5,'#8a7d80'],[1,'#4a435a']])) ;line(c,x-width/2,yy,x+width/2,yy,'#ebcb9066');}
  // Carved curls and a small, jewel-like crest echo the entrance artwork.
  for(const side of[-1,1]){c.beginPath();c.moveTo(x+side*10,y-258);c.bezierCurveTo(x+side*60,y-290,x+side*83,y-241,x+side*47,y-247);c.bezierCurveTo(x+side*35,y-252,x+side*47,y-268,x+side*55,y-258);c.strokeStyle='#b9935c';c.lineWidth=4;c.stroke();}
  archFill(c,x,y-247,35,52,'#685247','#b9945b',3);path(c,[[x,y-293],[x+11,y-272],[x,y-252],[x-11,y-272]],'#e2b46a','#f6d99c',1.5);
}
function facade(c){
  const p=palette;
  // The rear keep and recessed side elevations are drawn before the gatehouse.
  path(c,[[48,-4],[843,-4],[877,17],[87,28]],'#07102055');
  tower(c,448,-177,45,360,148,{rear:true});
  for(const side of[-1,1])tower(c,448+side*198,-155,34,287,123,{rear:true});
  path(c,[[126,-188],[753,-188],[785,-224],[157,-224]],'#554b62','#aa9474',1);
  rect(c,126,-188,627,170,gradient(c,0,-188,0,170,[[0,'#736b80'],[1,'#4e4a60']]));
  // A pitched upper gallery, edged with small lantern dormers, gives real overlap.
  rect(c,304,-345,288,171,gradient(c,304,0,288,0,[[0,'#6a6277'],[.3,'#a08d98'],[1,'#554e68']]));masonry(c,304,-345,288,171,18);
  path(c,[[287,-339],[343,-418],[553,-418],[610,-339]],gradient(c,0,-418,0,79,[[0,'#664778'],[.45,'#47314f'],[1,'#241f36']]),'#b69767',1.5);
  for(let yy=-404;yy<-340;yy+=12)line(c,296+(yy+340)*-.6,yy,601-(yy+340)*-.6,yy,'#9c779d44');
  for(const xx of[351,398,498,545]){path(c,[[xx-16,-352],[xx,-385],[xx+16,-352]],'#493547','#b99b6b',1);window(c,xx,-319,15,43,'#e8bd79');}
  for(const xx of[351,401,495,545])window(c,xx,-224,23,61,'#f2c279');
  // Side wings have a visible dark return, bevelled courses and pointed arcades.
  for(const side of[-1,1]){
    const left=side<0?101:523,right=side<0?373:795;
    path(c,[[right,-219],[right+21,-239],[right+21,-15],[right,0]],'#403d53','#8e7a77',1);
    rect(c,left,-215,right-left,211,gradient(c,left,0,right-left,0,[[0,'#81778a'],[.32,'#a2919a'],[.8,'#766d82'],[1,'#514a62']]));masonry(c,left,-215,right-left,211,17);
    cornice(c,left-5,-219,right-left+9,10);cornice(c,left-3,-14,right-left+6,9);
    for(let xx=left+22;xx<right-5;xx+=40){rect(c,xx-8,-240,17,22,'#9b8891');rect(c,xx-9,-241,19,3,'#c3aa85');rect(c,xx-6,-235,13,3,'#38364c66');}
    for(let xx=left+44;xx<right-18;xx+=73){archFill(c,xx,-34,53,150,null,'#4d4357',3);archFill(c,xx,-32,59,157,null,'#b59c8d55',1);window(c,xx,-64,26,87,'#f4c382');}
    for(let xx=left+11;xx<right;xx+=73)buttress(c,xx,-6,196);
  }
  // The outer towers stand forward of both wings and the high central keep.
  for(const side of[-1,1])tower(c,448+side*353,4,49,285,139,{balcony:true});
  // A deep central gatehouse breaks the otherwise broad horizontal wall.
  path(c,[[343,-228],[548,-228],[566,-249],[359,-249]],'#5a4e65','#b99d79',1);rect(c,343,-228,205,225,gradient(c,343,0,205,0,[[0,'#9c8991'],[.24,'#baa099'],[.7,'#8f7c89'],[1,'#5a4f68']]));masonry(c,343,-228,205,225,19);cornice(c,338,-231,215,8);
  for(const side of[-1,1])tower(c,448+side*116,-24,19,221,80);
  gate(c,448,0);
  for(const side of[-1,1]){foliage(c,448+side*337,-23,-side);foliage(c,448+side*151,-25,side);}
  // Low threshold lanterns illuminate stone, not the whole facade.
  for(const xx of[315,581]){
    rect(c,xx-5,-41,10,28,'#342a37');rect(c,xx-10,-52,20,27,'#433742');rect(c,xx-7,-49,14,18,'#eec47c');path(c,[[xx-12,-52],[xx,-64],[xx+12,-52]],'#514044','#bc9a66',1);line(c,xx,-50,xx,-30,'#67503e',1.5);halo(c,xx,-41,33,'#ffbb5e30');
  }
}
function flags(c,time){
  for(const[x,y,phase]of[[448,-685,0],[250,-565,1.5],[646,-565,3],[95,-424,2],[801,-424,4]]){
    line(c,x,y,x,y-29,'#c3a66c',1.8);const wave=Math.sin(time*2.4+phase)*3;
    path(c,[[x+1,y-28],[x+28,y-24+wave],[x+22,y-13+wave],[x+1,y-12]],gradient(c,x,0,27,0,[[0,'#623d63'],[.5,'#936182'],[1,'#50334f']]),'#d1af78',.8);
  }
  halo(c,448,-272,28,'#ffcd77'+Math.round(34+Math.sin(time*1.4)*6).toString(16));ellipse(c,448,-271,3,7,'#ffe6ad88');
}
function cachedFacade(c){
  if(caches.has(c))return caches.get(c);
  let canvas=null;const doc=c.canvas?.ownerDocument;
  try{if(doc?.createElement)canvas=doc.createElement('canvas');else if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(1,1);else if(c.canvas?.constructor&&c.canvas.constructor.name==='CanvasElement')canvas=new c.canvas.constructor(1,1);}catch{}
  if(!canvas){caches.set(c,null);return null;}
  canvas.width=1008;canvas.height=792;const paint=canvas.getContext('2d');if(!paint){caches.set(c,null);return null;}
  paint.translate(56,744);facade(paint);caches.set(c,canvas);return canvas;
}
export function drawTownPalace2D(c,building,{tile=64,time=0,motion=true,cache=true}={}){
  const x=building.x*tile,y=(building.z+building.h)*tile,scale=building.w*tile/896;
  c.save();c.translate(x,y);c.scale(scale,scale);
  const painted=cache?cachedFacade(c):null;if(painted)c.drawImage(painted,-56,-744);else facade(c);
  flags(c,motion?time:0);c.restore();
}
