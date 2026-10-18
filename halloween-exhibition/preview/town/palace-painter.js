/** A layered Gothic palace, painted once per canvas. Animated details stay separate. */
const TAU=Math.PI*2, caches=new WeakMap();
const palette={stone:'#9a918e',light:'#c5b7a9',dark:'#56505c',mortar:'#45404a',roof:'#392b4b',roofLight:'#655274',gold:'#b99a61',goldLight:'#e5c98e',glass:'#deb579'};
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
      // Uneven mineral colour is trapped inside individual cut blocks, while
      // pitting and rain streaks remain far subtler than the mortar joints.
      const grain=hash(r+19,i+7);rect(c,xx+1,yy+2,row*2-3,row-3,grain>.6?'#e6d3b911':grain<.25?'#28232b0c':'#a99a8410');
      if(grain>.7)rect(c,xx+2,yy+3,row*1.2,2,'#ede0cb1b');
      for(let n=0;n<3;n++)rect(c,xx+3+hash(i*4+n,r)*row*1.6,yy+3+hash(r*3+n,i)*Math.max(1,row-5),.7,.6,n%2?'#efe4d01c':'#201b2b16');
    }
  }
  // Rain gathers under cornices and along the shaded base, with no repeated
  // opaque dirt decals and no work added to the animated frame.
  c.fillStyle=gradient(c,0,y,0,h,[[0,'#201d2d28'],[.12,'transparent'],[.78,'transparent'],[1,'#191a2738']]);c.fillRect(x,y,w,h);
  for(let n=0;n<w/19;n++){const xx=x+hash(n,7)*w,hh=7+hash(n,13)*h*.23;c.fillStyle=gradient(c,0,y,0,hh,[[0,'#28212b12'],[1,'transparent']]);c.fillRect(xx,y,1+hash(n,4)*2,hh);}
  c.restore();
}
function cornice(c,x,y,w,depth=8){
  path(c,[[x-3,y],[x+w+3,y],[x+w+8,y+depth*.5],[x+w+3,y+depth],[x-3,y+depth]],'#494555','#c9ad7b',1);
  rect(c,x-3,y,w+6,2,'#e3bd8333');rect(c,x,y+depth-1,w,3,'#242333aa');
  for(let i=8;i<w;i+=15)rect(c,x+i,y+depth,5,5,'#92808c');
}
function window(c,x,y,w=25,h=52,glass='#efb969',ornate=true){
  halo(c,x,y-h*.45,w*.9,'#ffaf510d');archFill(c,x+2,y+3,w+12,h+10,'#262435');
  archFill(c,x,y,w+8,h+8,gradient(c,x-w/2,0,w,0,[[0,'#c4b3a1'],[.3,'#b2a090'],[1,'#716771']]),'#b6a38d',1.2);archFill(c,x+1,y-3,w,h,gradient(c,0,y-h,0,h,[[0,'#995b3f'],[.58,glass],[1,'#8d5e48']]),'#413544',2);
  c.save();arch(c,x,y-3,w-2,h-2);c.clip();for(let n=0;n<3;n++){const yy=y-h+8+n*h*.28;path(c,[[x,yy-10],[x+w*.44,yy+5],[x,yy+20],[x-w*.44,yy+5]],['#649da57d','#bd84a978','#e5bf7080'][n], '#c9a86b88',.7);}c.restore();
  line(c,x,y-h+9,x,y-3,'#685145',1.8);line(c,x-w*.48,y-h*.37,x+w*.48,y-h*.37,'#685145',1.5);
  if(ornate){const yy=y-h*.66;line(c,x-w*.42,yy+10,x,yy-2,'#f0cb8311',1);line(c,x-w*.4,yy+10,x,yy-6,'#705544',1);line(c,x+w*.4,yy+10,x,yy-6,'#705544',1);ellipse(c,x,y-h*.37,w*.13,w*.13,null,'#806045',1);}
  rect(c,x-w/2-7,y+1,w+14,3,'#c4b19a');rect(c,x-w/2-7,y+4,w+14,5,'#36313f');line(c,x-w/2-4,y-h+6,x-w/2-4,y,'#e2ceae66',1);
}
function gildedScroll(c,x,y,size=1,flip=1){
  c.save();c.translate(x,y);c.scale(size*flip,size);c.beginPath();c.moveTo(-22,9);c.bezierCurveTo(-7,-4,2,0,15,-15);c.bezierCurveTo(26,-33,43,-11,28,-7);c.bezierCurveTo(16,-3,20,-19,29,-15);c.strokeStyle='#64503b';c.lineWidth=6;c.stroke();c.strokeStyle='#e0bc73';c.lineWidth=3;c.stroke();
  for(const[xx,yy,turn]of[[-8,2,-1],[7,-7,1],[17,-18,-1]]){c.save();c.translate(xx,yy);c.rotate(turn*.6);path(c,[[0,0],[-7,-14],[4,-10],[7,-3]],'#ceaa65','#f0d493',.8);c.restore();}c.restore();
}
function roseWindow(c,x,y,r){
  ellipse(c,x+3,y+4,r+9,r+9,'#302a40');ellipse(c,x,y,r+8,r+8,'#b69b7b','#ead093',2);ellipse(c,x,y,r+2,r+2,'#292b44','#755d49',2);
  for(let i=0;i<12;i++){
    const a=i*TAU/12,b=(i+1)*TAU/12;c.beginPath();c.moveTo(x,y);c.arc(x,y,r,a,b);c.closePath();c.fillStyle=['#7ab7bd','#b692bd','#e4b775','#bd859e'][i%4];c.fill();
    line(c,x+Math.cos(a)*r*.22,y+Math.sin(a)*r*.22,x+Math.cos(a)*r,y+Math.sin(a)*r,'#d0b06d',1.4);
    const xx=x+Math.cos(a+TAU/24)*r*.63,yy=y+Math.sin(a+TAU/24)*r*.63;ellipse(c,xx,yy,r*.14,r*.14,null,'#efcf8a',1.2);
  }
  for(const rr of[r*.2,r*.43,r*.9])ellipse(c,x,y,rr,rr,null,'#e8c67b',1.6);
  ellipse(c,x,y,r*.19,r*.19,'#f3d69c','#9d784d',1.5);
}
function royalBanner(c,x,y,flip=1){
  line(c,x-20,y,x+20,y,'#d1ac6f',3);path(c,[[x-16,y+2],[x+16,y+2],[x+14,y+62],[x,y+73],[x-14,y+62]],gradient(c,x-16,0,32,0,[[0,'#342439'],[.4,'#784966'],[.7,'#59324b'],[1,'#302338']]),'#d0ab68',1.5);
  path(c,[[x,y+15],[x+8,y+33],[x,y+51],[x-8,y+33]],'#c4a16b','#efd39a',1.2);line(c,x,y+19,x,y+47,'#714f45');
  for(const side of[-1,1])line(c,x+side*12,y+6,x+side*10,y+59,'#cfae683f');
}
function wallFountain(c,x,y){
  // Shallow lion masks and bowls are attached to the wall, clear of the walking path.
  archFill(c,x,y-11,58,102,'#544659','#d5b77a',2);archFill(c,x,y-16,46,91,'#807081','#ac956f',1);
  ellipse(c,x,y-77,18,20,'#b99460','#ebca89',1.5);
  for(let i=0;i<10;i++){const a=i*TAU/10;path(c,[[x+Math.cos(a)*12,y-77+Math.sin(a)*15],[x+Math.cos(a+.15)*22,y-77+Math.sin(a+.15)*22],[x+Math.cos(a+.35)*14,y-77+Math.sin(a+.35)*16]],'#b59465','#d8b574',.6);}
  ellipse(c,x,y-75,11,13,'#d3b982','#7f6449',1);for(const side of[-1,1])ellipse(c,x+side*4,y-79,1.3,1.4,'#534339');ellipse(c,x,y-69,6,4,'#8b6d4d');
  for(const dx of[-2,0,2])line(c,x+dx,y-65,x+dx*.6,y-30,'#8dc2cb'+(dx?'88':'dd'),1.1);
  path(c,[[x-30,y-29],[x+30,y-29],[x+21,y-12],[x-21,y-12]],'#887f91','#d2b67b',1.2);ellipse(c,x,y-29,30,9,'#c0ac9e','#e6c98e',1.2);ellipse(c,x,y-30,24,5,'#466975','#a7c8c5',1);ellipse(c,x,y-30,13,2.4,null,'#c5dbd0',.8);
}
function roof(c,x,y,r,h){
  const left=x-r,right=x+r,top=y-h;
  const silhouette=[[left-3,y+3]];for(let row=11;row>=1;row--){const f=row/12;silhouette.push([x-r*Math.pow(f,1.16),top+h*f]);}silhouette.push([x,top]);for(let row=1;row<12;row++){const f=row/12;silhouette.push([x+r*Math.pow(f,1.16),top+h*f]);}silhouette.push([right+3,y+3]);
  path(c,silhouette,gradient(c,left,0,r*2,0,[[0,'#241e35'],[.2,'#554064'],[.48,'#765482'],[.67,'#45304f'],[1,'#231c32']]),'#65546e',1.3);
  path(c,[[x,top],[x+r*.18,y],[right,y]],'#17162b44');
  for(let row=1;row<12;row++){
    const f=row/12,yy=top+h*f,rr=r*Math.pow(f,1.16);
    line(c,x-rr,yy,x+rr,yy,'#151426aa',1.5);line(c,x-rr+1,yy+1,x+rr-1,yy+1,'#bb8ebf33',1);
    for(let tile=-5;tile<=5;tile++){
      const tx=x+(tile+(row%2?.5:0))*rr/5;if(Math.abs(tx-x)>rr)continue;
      line(c,tx,yy,tx+(tx-x)*.09,yy+h/12,'#241a3288',1);
    }
  }
  for(const side of[-1,1]){line(c,x+side*2,top+5,x+side*r*.7,y-1,'#beb0b944',1);for(const f of[.24,.48,.72]){const xx=x+side*r*.7*f,yy=top+h*f;path(c,[[xx,yy-4],[xx+3,yy],[xx,yy+4],[xx-3,yy]],'#99836b','#5d4851',.6);}}
  cornice(c,left-2,y+1,r*2+4,7);
  line(c,x,top-2,x,top-25,palette.gold,2);path(c,[[x,top-35],[x+4,top-26],[x,top-18],[x-4,top-26]],'#d7b575','#342c3c',1);
}
function tower(c,x,base,r,height,roofHeight,{balcony=false,rear=false}={}){
  const top=base-height,p=palette;
  path(c,[[x-r+7,base+1],[x+r-6,base+1],[x+r-2,top+4],[x+r-12,top-5],[x-r+10,top-5],[x-r-2,top+4]],gradient(c,x-r,0,r*2,0,[[0,'#454153'],[.12,'#736d7d'],[.33,rear?'#ada297':'#c5b7aa'],[.56,'#a39791'],[.83,'#726a74'],[1,'#433e53']]),'#292739',2);
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
function cutStoneArch(c,x,y){
  const cubic=(a,b,cc,d,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*cc+t**3*d;
  const point=(width,height,t,side)=>[x+side*cubic(width*.5,width*.5,width*.16,0,t),y+cubic(-height+width*.65,-height+width*.3,-height+width*.09,-height,t)];
  for(const side of[-1,1]){
    for(let n=0;n<10;n++){
      const a=(n+.035)/10,b=(n+.965)/10,outerA=point(148,225,a,side),outerB=point(148,225,b,side),innerA=point(126,211,a,side),innerB=point(126,211,b,side);
      path(c,[outerA,outerB,innerB,innerA],gradient(c,outerA[0],outerA[1],side*13,10,[[0,'#c1aa92'],[.3,'#b4a08e'],[1,'#7d6d71']]),'#655864',.7);line(c,...outerA,...outerB,'#ebd4b145',.7);
    }
    for(let n=0;n<7;n++){const yy=y-2-n*18;path(c,[[x+side*63,yy],[x+side*74,yy],[x+side*74,yy-17],[x+side*63,yy-17]],side<0?'#c0aa93':'#968384','#655864',.7);}
  }
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
  line(c,x,y-200,x,y-4,'#cfab6a',2);cutStoneArch(c,x,y-1);
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
  rect(c,304,-345,288,171,gradient(c,304,0,288,0,[[0,'#6a6277'],[.3,'#ada198'],[1,'#5d5667']]));masonry(c,304,-345,288,171,18);
  path(c,[[287,-339],[343,-418],[553,-418],[610,-339]],gradient(c,0,-418,0,79,[[0,'#664778'],[.45,'#47314f'],[1,'#241f36']]),'#b69767',1.5);
  for(let yy=-404;yy<-340;yy+=12)line(c,296+(yy+340)*-.6,yy,601-(yy+340)*-.6,yy,'#9c779d44');
  for(const xx of[351,398,498,545]){path(c,[[xx-16,-352],[xx,-385],[xx+16,-352]],'#493547','#b99b6b',1);window(c,xx,-319,15,43,'#e8bd79');}
  for(const xx of[351,401,495,545])window(c,xx,-224,23,61,'#f2c279');
  // Side wings have a visible dark return, bevelled courses and pointed arcades.
  for(const side of[-1,1]){
    const left=side<0?101:523,right=side<0?373:795;
    path(c,[[right,-219],[right+21,-239],[right+21,-15],[right,0]],'#403d53','#8e7a77',1);
    rect(c,left,-215,right-left,211,gradient(c,left,0,right-left,0,[[0,'#81778a'],[.32,'#afa194'],[.8,'#817780'],[1,'#514a62']]));masonry(c,left,-215,right-left,211,17);
    cornice(c,left-5,-219,right-left+9,10);cornice(c,left-3,-14,right-left+6,9);
    for(let xx=left+22;xx<right-5;xx+=40){rect(c,xx-8,-240,17,22,'#9b8891');rect(c,xx-9,-241,19,3,'#c3aa85');rect(c,xx-6,-235,13,3,'#38364c66');}
    for(let xx=left+44;xx<right-18;xx+=73){archFill(c,xx,-34,53,150,null,'#4d4357',3);archFill(c,xx,-32,59,157,null,'#b59c8d55',1);window(c,xx,-64,26,87,'#f4c382');}
    for(let xx=left+11;xx<right;xx+=73)buttress(c,xx,-6,196);
  }
  // The outer towers stand forward of both wings and the high central keep.
  for(const side of[-1,1])tower(c,448+side*353,4,49,285,139,{balcony:true});
  // A deep central gatehouse breaks the otherwise broad horizontal wall.
  path(c,[[343,-228],[548,-228],[566,-249],[359,-249]],'#5a4e65','#b99d79',1);rect(c,343,-228,205,225,gradient(c,343,0,205,0,[[0,'#9c8991'],[.24,'#c4b09d'],[.7,'#998d89'],[1,'#5a4f68']]));masonry(c,343,-228,205,225,19);cornice(c,338,-231,215,8);
  for(const side of[-1,1])tower(c,448+side*116,-24,19,221,80);
  // A broad royal portal, an illuminated rose and carved acanthus read at a glance.
  roseWindow(c,448,-305,33);for(const side of[-1,1])royalBanner(c,448+side*121,-315);
  c.save();c.translate(448,0);c.scale(1.17,1.07);gate(c,0,0);c.restore();
  for(const side of[-1,1]){gildedScroll(c,448+side*104,-244,.9,side);gildedScroll(c,448+side*80,-329,.68,side);wallFountain(c,448+side*163,-2);}
  // Gilded pierced balustrades and repeating arches join the towers as a palace.
  for(const side of[-1,1]){const start=side<0?143:605;for(let n=0;n<5;n++){const xx=start+n*35;archFill(c,xx,-210,26,33,'#3d334c','#d5b478',1.8);ellipse(c,xx,-235,2,2,'#ecd091');}line(c,start-20,-248,start+160,-248,'#f0cf8b',3);line(c,start-20,-206,start+160,-206,'#b8935d',3);}
  for(const side of[-1,1]){const tx=448+side*353;gildedScroll(c,tx-13,-148,.42,1);gildedScroll(c,tx+13,-148,.42,-1);}

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
  halo(c,448,-291,28,'#ffcd77'+Math.round(34+Math.sin(time*1.4)*6).toString(16));ellipse(c,448,-290,3,7,'#ffe6ad88');
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
