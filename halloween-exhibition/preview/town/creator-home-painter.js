/** Offline, cached houses for the creator quarter. Profile and artwork pixels are never textures. */
const TAU=Math.PI*2,cacheByContext=new WeakMap();
export const CREATOR_HOME_MOTIFS=Object.freeze(['lantern','bat-wing','wave-star','candy','open-book','bread-loaf','twin-stars','moon-cat','cat-leaf','flower','hedgehog','shiba','woven-diamond','three-stars','iris-flower','lion']);
const woodTone=color=>{const hex=/^#[a-f\d]{6}$/i.test(color)?color.slice(1):'886850',base=[78,59,50];return '#'+[0,2,4].map((offset,i)=>Math.round(parseInt(hex.slice(offset,offset+2),16)*.3+base[i]*.7).toString(16).padStart(2,'0')).join('');};
const shade=(color,amount)=>{const hex=/^#[a-f\d]{6}$/i.test(color)?color.slice(1):'886850';return '#'+[0,2,4].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)+amount*255))).toString(16).padStart(2,'0')).join('');};
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function poly(c,points,color,stroke=null,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function ellipse(c,x,y,rx,ry,color,stroke=null,width=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function box(c,x,y,w,h,color,stroke=null,r=0){c.beginPath();c.roundRect(x,y,w,h,r);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function gradient(c,x,y,w,h,stops){const g=c.createLinearGradient(x,y,x+w,y+h);for(const[at,color]of stops)g.addColorStop(at,color);return g;}
// All material marks are deterministic and baked into the existing small cache.
// Directional light comes from the upper left; dark joints stay below the lit lip.
const surfaceSeed=value=>Array.from(String(value)).reduce((seed,char)=>Math.imul(seed^char.codePointAt(0),16777619)>>>0,2166136261);
const grain=(seed,x,y)=>{let value=Math.imul(seed^(x+31),374761393)^Math.imul(y+17,668265263);value=Math.imul(value^(value>>>13),1274126177);return((value^(value>>>16))>>>0)/4294967295;};
function timber(c,x,y,w,h,color,seed=0){
  rect(c,x,y,w,h,gradient(c,x,y,w,0,[[0,shade(color,-.17)],[.16,shade(color,.13)],[.4,shade(color,.03)],[1,shade(color,-.17)]]));
  const vertical=h>w;
  for(let i=1;i<=3;i++){
    const offset=(vertical?w:h)*(i/4),bend=(grain(seed,i,3)-.5)*2.4;
    c.beginPath();c.moveTo(x+(vertical?offset:2),y+(vertical?2:offset));
    c.bezierCurveTo(x+(vertical?offset+bend:w*.3),y+(vertical?h*.33:offset+bend),x+(vertical?offset-bend:w*.66),y+(vertical?h*.66:offset-bend),x+(vertical?offset:w-2),y+(vertical?h-2:offset));
    c.strokeStyle=i===2?shade(color,.15):shade(color,-.15);c.lineWidth=.55;c.stroke();
  }
  if(w>5&&h>15)for(const end of[5,h-5])ellipse(c,x+w*.5,y+end,.8,.8,'#332d29');
}
function masonry(c,x,y,w,h,color,seed=0,{side=false,construction='plaster'}={}){
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  rect(c,x,y,w,h,gradient(c,x,y,w,h*.2,[[0,shade(color,.08)],[.38,color],[1,shade(color,side?-.24:-.12)]]));
  // Fine lime plaster, dressed stone, or fired brick share the same fixed facade.
  for(let i=0;i<74;i++){const xx=x+grain(seed,i,0)*w,yy=y+grain(seed,i,1)*h;rect(c,xx,yy,.5+grain(seed,i,2)*1.2,.45,grain(seed,i,4)>.5?'#f7edd31a':'#352d2716');}
  const brick=construction==='brick',stone=construction==='stone',blockW=side?23:brick?29:stone?41:34,blockH=brick?12:stone?22:14,start=brick||stone?y:y+h-38,rows=Math.ceil((y+h-start)/blockH);
  for(let row=0;row<rows;row++){
   const yy=start+row*blockH;
   for(let col=-1;col<Math.ceil(w/blockW)+1;col++){
    const xx=x+col*blockW+(row%2)*blockW/2,variation=(grain(seed,col+9,row+12)-.5)*.1,block=shade(color,variation-(brick?.09:.12));
    rect(c,xx+1,yy+1,blockW-2,blockH-2,block);
    if(!brick){line(c,xx+2,yy+2,xx+blockW-2,yy+2,shade(block,.12),.8);line(c,xx+1,yy+blockH-1,xx+blockW-1,yy+blockH-1,shade(block,-.16),1.1);}
    line(c,xx+blockW-1,yy+2,xx+blockW-1,yy+blockH-1,shade(block,-.11),.8);
   }
   if(brick){line(c,x,yy,w+x,yy,shade(color,-.18),.9);line(c,x,yy+1,w+x,yy+1,shade(color,.12),.6);}
  }
  rect(c,x,y,w,20,gradient(c,x,y,0,20,[[0,'#17191f69'],[1,'#17191f00']]));
  rect(c,x,y+h-9,w,9,gradient(c,x,y+h-9,0,9,[[0,'#19212900'],[1,'#19212940']]));
  c.restore();
}
function stoneSill(c,x,y,w,color){
  rect(c,x-w/2-7,y+9,w+14,5,gradient(c,0,y+9,0,5,[[0,'#1c1c2540'],[1,'#1c1c2500']]));
  poly(c,[[x-w/2-7,y+3],[x+w/2+5,y+3],[x+w/2+9,y+7],[x-w/2-9,y+7]],shade(color,.17),shade(color,-.12),.7);
  rect(c,x-w/2-9,y+7,w+18,4,gradient(c,0,y+7,0,4,[[0,shade(color,-.04)],[1,shade(color,-.23)]]));
  line(c,x-w/2-8,y+7,x+w/2+8,y+7,shade(color,.27),.65);
}
function glazing(c,path,x,y,w,h,trim,tint){
  c.save();path();c.clip();
  rect(c,x-w/2,y-h,w,h,gradient(c,x-w/2,y-h,w*.35,h,[[0,shade(tint,-.39)],[.3,shade(tint,-.19)],[.73,shade(tint,.04)],[1,shade(tint,-.14)]]));
  // Broad sky reflection and narrow secondary streak stay inside each real opening.
  poly(c,[[x-w*.6,y-h],[x-w*.16,y-h],[x+w*.5,y-h*.2],[x+w*.5,y+h*.1],[x+w*.28,y]],'#e1effb40');
  poly(c,[[x-w*.2,y-h],[x-w*.1,y-h],[x+w*.52,y-h*.26],[x+w*.52,y-h*.1]],'#f5f5e72c');
  rect(c,x-w/2,y-h,w,8,gradient(c,0,y-h,0,8,[[0,'#181c286e'],[1,'#181c2800']]));
  rect(c,x-w/2,y-h,5,h,gradient(c,x-w/2,0,5,0,[[0,'#13172267'],[1,'#13172200']]));
  c.restore();path();c.strokeStyle=shade(trim,-.27);c.lineWidth=6;c.stroke();
  path();c.strokeStyle=gradient(c,x-w/2,y-h,w,h,[[0,shade(trim,.19)],[.45,trim],[1,shade(trim,-.14)]]);c.lineWidth=3;c.stroke();
}
function star(c,x,y,r,color,stroke=null){poly(c,Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.44:r;return[x+Math.cos(a)*rr,y+Math.sin(a)*rr];}),color,stroke);}
function crescent(c,x,y,r,color){c.beginPath();c.moveTo(x+r*.6,y-r*.8);c.bezierCurveTo(x-r*.9,y-r*1.35,x-r*1.2,y+r*.9,x+r*.75,y+r*.7);c.bezierCurveTo(x-r*.1,y+r*.6,x-r*.25,y-r*.55,x+r*.6,y-r*.8);c.closePath();c.fillStyle=color;c.fill();}
function cat(c,x,y,r,color,outline){poly(c,[[x-r,y+r*.1],[x-r*.9,y-r],[x-r*.27,y-r*.45],[x+r*.29,y-r*.45],[x+r*.94,y-r],[x+r,y+r*.1]],color,outline);ellipse(c,x,y+r*.09,r,r*.73,color,outline);for(const side of[-1,1]){ellipse(c,x+side*r*.33,y+r*.04,r*.075,r*.11,'#2b313a');line(c,x+side*r*.7,y+r*.35,x+side*r*1.1,y+r*.27,outline,.7);}poly(c,[[x-r*.1,y+r*.3],[x+r*.1,y+r*.3],[x,y+r*.42]],outline);}
function flower(c,x,y,r,color,center){for(let i=0;i<7;i++){const a=i*TAU/7;ellipse(c,x+Math.cos(a)*r*.64,y+Math.sin(a)*r*.64,r*.43,r*.39,color);}ellipse(c,x,y,r*.3,r*.3,center);}
function motif(c,kind,x,y,size,trim){
  c.save();c.translate(x,y);c.scale(size/24,size/24);const gold='#ebcf89',ink=shade(trim,-.27),warm='#cda15f';
  switch(kind){
    case'lantern':box(c,-8,-12,16,22,'#8d6c42',gold,2);box(c,-5,-9,10,14,'#edc77d');line(c,0,-9,0,5,ink);c.beginPath();c.arc(0,-14,5,Math.PI,TAU);c.strokeStyle=gold;c.lineWidth=1.5;c.stroke();poly(c,[[-10,-12],[0,-19],[10,-12]],warm,gold);break;
    case'bat-wing':poly(c,[[-2,-3],[-22,-15],[-17,2],[-11,-1],[-6,7],[0,2],[6,7],[11,-1],[17,2],[22,-15],[2,-3],[0,-9]],'#6a506e',gold,1.2);break;
    case'wave-star':for(let row=0;row<3;row++){c.beginPath();c.moveTo(-21,3+row*5);c.bezierCurveTo(-7,-9+row*5,4,15+row*5,21,1+row*5);c.strokeStyle=row===1?'#9bd8d3':gold;c.lineWidth=2;c.stroke();}star(c,6,-10,7,gold);break;
    case'candy':poly(c,[[-11,-5],[-22,-10],[-19,1],[-23,10],[-11,6]],'#d2a1aa',gold);poly(c,[[11,-5],[22,-10],[19,1],[23,10],[11,6]],'#d2a1aa',gold);box(c,-12,-9,24,18,'#f2d3c2',gold,7);for(const x of[-7,2,11])line(c,x-4,-6,x+3,6,'#b7637b',3);break;
    case'open-book':poly(c,[[-21,-12],[-3,-9],[0,-4],[3,-9],[21,-12],[20,12],[3,14],[0,17],[-3,14],[-20,12]],'#d6c39b',gold);line(c,0,-4,0,15,ink);for(let n=0;n<4;n++){line(c,-17,-5+n*4,-5,-3+n*4,'#856c4e');line(c,5,-3+n*4,17,-5+n*4,'#856c4e');}break;
    case'bread-loaf':c.beginPath();c.moveTo(-22,9);c.lineTo(-22,-1);c.bezierCurveTo(-22,-19,22,-19,22,-1);c.lineTo(22,9);c.closePath();c.fillStyle='#c6914e';c.fill();c.strokeStyle=gold;c.lineWidth=1.5;c.stroke();for(const x of[-12,0,12])line(c,x-4,-7,x+2,2,'#efd397',3);line(c,-18,6,18,6,'#9f6a3d');break;
    case'twin-stars':star(c,-10,-4,12,'#dfd7ad',ink);star(c,11,5,10,'#bfc5df',ink);break;
    case'moon-cat':crescent(c,-5,-2,20,gold);cat(c,8,6,8,'#7e849a','#dccb9c');break;
    case'cat-leaf':cat(c,-4,2,13,'#a5b2a0',ink);poly(c,[[11,14],[10,-4],[25,-15],[26,0]],'#809b68',gold);line(c,12,13,23,-10,ink);break;
    case'flower':flower(c,0,0,19,'#e1d2aa','#cba35f');break;
    case'hedgehog':poly(c,Array.from({length:19},(_,i)=>{const a=-Math.PI+i*Math.PI/18,r=i%2?19:25;return[Math.cos(a)*r,9+Math.sin(a)*r];}), '#8e7057',gold);ellipse(c,-1,6,18,10,'#b89d78',gold);poly(c,[[13,-1],[27,8],[13,12]],'#d5bd95',gold);ellipse(c,19,4,1.5,1.5,ink);ellipse(c,27,8,2,2,ink);break;
    case'shiba':poly(c,[[-18,-3],[-18,-21],[-5,-11],[6,-11],[19,-21],[20,-1],[12,16],[-10,16]],'#b88a51',gold);poly(c,[[-18,-2],[-9,3],[0,11],[10,3],[20,-1],[11,17],[-10,17]],'#ddd1af');for(const side of[-1,1])ellipse(c,side*8,-1,1.6,2,ink);poly(c,[[-4,7],[4,7],[0,11]],ink);break;
    case'woven-diamond':for(const dx of[-7,7])poly(c,[[dx,-19],[dx+14,0],[dx,19],[dx-14,0]],null,dx<0?'#e5c69d':'#b7c1c8',2.5);for(const yy of[-7,0,7])line(c,-14,yy,14,yy,shade(trim,.19),1);break;
    case'three-stars':for(const[x,y,r]of[[-14,6,9],[0,-8,11],[15,6,9]])star(c,x,y,r,gold,ink);break;
    case'iris-flower':line(c,0,20,0,-5,'#93a276',2);for(const side of[-1,1]){poly(c,[[0,20],[side*12,3],[side*5,20]],'#8c9e6f');poly(c,[[0,-2],[side*19,-21],[side*20,-2],[side*6,9]],'#ab9bc0','#e0cbb0');}poly(c,[[0,-23],[9,-11],[0,2],[-9,-11]],'#c3b1ce',gold);poly(c,[[-5,1],[0,-6],[5,1],[0,9]],gold);break;
    case'lion':for(let i=0;i<12;i++){const a=i*TAU/12;ellipse(c,Math.cos(a)*16,Math.sin(a)*16,7,7,'#a97f46',gold,.5);}ellipse(c,0,0,15,17,'#d7b771',gold);for(const side of[-1,1])ellipse(c,side*6,-3,1.6,2,ink);ellipse(c,0,7,9,6,'#ead3a0');poly(c,[[-3,3],[3,3],[0,7]],ink);line(c,0,7,0,10,ink);break;
    default:star(c,0,0,18,gold,ink);
  }c.restore();
}
function window(c,x,y,w=41,h=51,trim='#795b43',open=false){
  box(c,x-w/2-5,y-h-5,w+10,h+11,shade(trim,-.2),shade(trim,.2),2);
  const path=()=>{c.beginPath();c.roundRect(x-w/2,y-h,w,h,2);};glazing(c,path,x,y,w,h,trim,'#d4be91');
  line(c,x,y-h,x,y,trim,2);line(c,x-w/2,y-h*.48,x+w/2,y-h*.48,trim,2);
  for(const side of[-1,1]){const xx=x+side*(w/2+9);timber(c,xx-5,y-h-1,10,h+3,open?shade(trim,.08):shade(trim,-.08));for(let i=0;i<4;i++)line(c,xx-3,y-h+7+i*10,xx+3,y-h+7+i*10,shade(trim,-.22));}
  stoneSill(c,x,y,w,'#a79e89');
}
function planter(c,x,y,palette,motifKind){
  box(c,x-20,y-3,40,12,shade(palette.trim,-.22),palette.trim,2);line(c,x-19,y+4,x+19,y+4,shade(palette.trim,.16));
  for(let i=0;i<5;i++){const xx=x+(i-2)*8,yy=y-7-(i%2)*4;line(c,xx,y,xx+1,yy-8,'#6f8059',1.3);ellipse(c,xx,yy,7,3,'#738961');flower(c,xx,yy-5,4,motifKind==='flower'?'#ebdbb0':motifKind==='iris-flower'?'#b0a0c4':'#c99b91','#c7a86e');}
}
function roofTiles(c,points,left,right,top,bottom,color){
  c.save();poly(c,points,gradient(c,left,top,right-left,bottom-top,[[0,shade(color,.16)],[.3,color],[1,shade(color,-.21)]]),shade(color,-.26),2);c.clip();
  let n=0;for(let y=top+9;y<bottom+12;y+=11){
    for(let x=left-19+(n%2?9:0);x<right;x+=19){const tone=shade(color,(grain(13,Math.round(x),n)-.5)*.1);rect(c,x+1,y+2,17,8,tone);line(c,x,y,x-2,y+11,shade(color,-.23),.7);}
    line(c,left,y,right,y,shade(color,-.27),1.8);line(c,left,y+1.5,right,y+1.5,shade(color,.17),.7);n++;
  }
  rect(c,left,bottom-12,right-left,12,gradient(c,0,bottom-12,0,12,[[0,'#10182400'],[1,'#10182470']]));
  c.restore();
}
function curvedRoofMaterial(c,left,right,top,bottom,color){
  // The caller's original roof path clips the material, preserving its silhouette.
  c.save();c.clip();
  rect(c,left,top,right-left,bottom-top,gradient(c,left,top,(right-left)*.5,bottom-top,[[0,shade(color,.22)],[.4,shade(color,.06)],[.72,color],[1,shade(color,-.25)]]));
  for(let row=0,y=top+8;y<bottom;row++,y+=14){
    c.beginPath();c.moveTo(left,y);c.bezierCurveTo(left+(right-left)*.28,y-11,left+(right-left)*.73,y-11,right,y);c.strokeStyle=shade(color,-.2);c.lineWidth=1.7;c.stroke();
    for(let x=left+(row%2?15:0);x<right;x+=31)line(c,x,y,x+2,y+13,shade(color,-.13),.7);
  }
  c.restore();
}
function nameplate(c,b,x,y,trim){
  const creator=String(b.creatorName||'クリエイター').trim(),label=String(b.homeLabel||'創作の家').trim();
  box(c,x-86,y-12,174,34,'#10182142',null,3);
  box(c,x-87,y-15,174,34,gradient(c,x,y-15,0,34,[[0,shade(trim,-.06)],[1,shade(trim,-.3)]]),shade(trim,.25),3);line(c,x-80,y-11,x+80,y-11,shade(trim,.33));
  for(const dx of[-81,81])ellipse(c,x+dx,y+2,1,1,'#d1b981');
  c.fillStyle='#f0e6cd';c.textAlign='center';c.textBaseline='middle';c.font='600 13px "Yu Gothic","Hiragino Kaku Gothic ProN",sans-serif';c.fillText(Array.from(creator).length>18?Array.from(creator).slice(0,17).join('')+'…':creator,x,y-4,158);
  c.fillStyle='#cbb68b';c.font='10px "Yu Gothic","Hiragino Kaku Gothic ProN",sans-serif';c.fillText(label,x,y+10,158);
}
// These are architectural stage designs, rather than claims about a creator's real home.
const themeByMotif=Object.freeze({'lantern':'lantern-cat','bat-wing':'devil','wave-star':'tide','candy':'candy','open-book':'story','bread-loaf':'bread','twin-stars':'companions','moon-cat':'moon','cat-leaf':'cat-garden','flower':'chamomile','hedgehog':'hedgehog','shiba':'shiba','woven-diamond':'violet-knit','three-stars':'trio','iris-flower':'iris','lion':'lion'});
function archedWindow(c,x,y,w,h,trim,glass='#d8bb7d'){
  const path=()=>{c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2,y-h+w/2);c.bezierCurveTo(x-w/2,y-h-6,x+w/2,y-h-6,x+w/2,y-h+w/2);c.lineTo(x+w/2,y);c.closePath();};
  glazing(c,path,x,y,w,h,trim,glass);
  line(c,x+1,y-h+3,x+1,y,shade(trim,-.2),3);line(c,x,y-h+3,x,y,shade(trim,.13),1.2);line(c,x-w/2+2,y-h*.4,x+w/2-2,y-h*.4,trim,2);stoneSill(c,x,y,w,'#a89e89');
}
function roundWindow(c,x,y,r,trim,glass='#e4c387',spokes=4){
  ellipse(c,x,y,r+4,r+4,shade(trim,-.19),shade(trim,.28),2);
  const path=()=>{c.beginPath();c.ellipse(x,y,r,r,0,0,TAU);};glazing(c,path,x,y+r,r*2,r*2,trim,glass);
  for(let i=0;i<spokes;i++){const a=i*TAU/spokes;line(c,x,y,x+Math.cos(a)*r,y+Math.sin(a)*r,trim,1.8);}ellipse(c,x,y,3,3,shade(trim,.3));
}
function catWindow(c,x,y,trim,glass){
  const path=()=>poly(c,[[x-26,y+18],[x-26,y-15],[x-22,y-31],[x-9,y-22],[x+9,y-22],[x+22,y-31],[x+26,y-15],[x+26,y+18]],null);
  glazing(c,path,x,y+18,52,49,trim,glass);
  line(c,x,y-22,x,y+17,trim,2);line(c,x-23,y-1,x+23,y-1,trim,2);stoneSill(c,x,y+18,52,'#a79d88');
}
function awning(c,x,y,w,p,{stripes=7,scallop=true}={}){
  poly(c,[[x-w/2,y],[x+w/2,y],[x+w/2+9,y+23],[x-w/2-9,y+23]],shade(p.trim,-.05),shade(p.roof,-.25),1.5);
  for(let i=0;i<stripes;i++){const a=x-w/2+i*w/stripes,b=a+w/stripes;poly(c,[[a,y+1],[b,y+1],[b+9,y+22],[a-9,y+22]],i%2?p.wall:shade(p.roof,.23));}
  if(scallop)for(let i=0;i<stripes;i++)ellipse(c,x-w/2+(i+.5)*w/stripes,y+23,w/stripes*.54,6,i%2?p.wall:shade(p.roof,.23),shade(p.roof,-.1));
  line(c,x-w/2-9,y+23,x+w/2+9,y+23,shade(p.trim,-.1),2);
}
function gable(c,cx,width,peak,p,trim,base=-150){
  poly(c,[[cx-width/2,base],[cx,peak],[cx+width/2,base]],shade(p.wall,.04),trim,2);
  c.save();c.clip();rect(c,cx-width/2,peak,width,base-peak,gradient(c,cx-width/2,peak,width,base-peak,[[0,shade(p.wall,-.13)],[.4,shade(p.wall,.07)],[1,shade(p.wall,-.08)]]));
  for(let i=0;i<23;i++)rect(c,cx-width/2+grain(7,i,0)*width,peak+grain(7,i,1)*(base-peak),1,.6,'#ece1bd24');c.restore();
  roofTiles(c,[[cx,peak-8],[cx+24,peak-23],[cx+width/2+23,base-17],[cx+width/2,base]],cx,cx+width/2+25,peak-25,base,p.roof);
  poly(c,[[cx-width/2-6,base-2],[cx,peak-9],[cx+7,peak-3],[cx-width/2,base+5]],shade(p.roof,-.05),shade(p.trim,.14),2);
  timber(c,cx-2,peak+7,4,base-peak-7,trim);line(c,cx-width/2+8,base-2,cx+width/2-6,base-2,shade(trim,-.2),3);
}
function homeRoof(c,theme,p,trim){
  const roof=(points,top=-280,bottom=-146)=>roofTiles(c,points,-12,336,top,bottom,p.roof);
  switch(theme){
    case 'lantern-cat':
      gable(c,147,282,-247,p,trim);for(const x of[58,236])poly(c,[[x-21,-189],[x-18,-247],[x+18,-219],[x+29,-194]],p.roof,shade(p.trim,.16),3);
      catWindow(c,147,-184,trim,'#b7ba9d');break;
    case 'devil':
      gable(c,147,246,-244,p,trim);for(const x of[35,274]){box(c,x-20,-222,40,74,shade(p.wall,-.13),trim);roof([[x-31,-220],[x,-293],[x+31,-220]],-294,-218);archedWindow(c,x,-162,12,36,trim,'#cc9b88');}
      poly(c,[[88,-178],[106,-207],[126,-184],[148,-213],[170,-184],[190,-207],[209,-178]],shade(p.roof,-.07),p.trim,2);break;
    case 'tide':
      roof([[-9,-148],[49,-226],[274,-226],[331,-174],[289,-147]],-228);box(c,117,-259,61,110,shade(p.wall,.05),trim,3);
      poly(c,[[107,-257],[147,-294],[189,-258]],p.roof,shade(p.trim,.16),2);box(c,111,-260,73,9,shade(p.trim,.15),trim);archedWindow(c,147,-190,29,50,trim,'#d3e7d9');
      for(const y of[-244,-181])line(c,119,y,176,y,shade(p.roof,.19),4);break;
    case 'candy':
      c.beginPath();c.moveTo(-6,-148);c.bezierCurveTo(15,-219,58,-271,135,-270);c.bezierCurveTo(225,-287,294,-239,329,-172);c.lineTo(286,-148);c.closePath();c.fillStyle=gradient(c,0,-270,0,125,[[0,shade(p.roof,.2)],[1,p.roof]]);c.fill();c.strokeStyle=trim;c.lineWidth=3;c.stroke();
      curvedRoofMaterial(c,-6,330,-278,-148,p.roof);
      for(let i=0;i<9;i++){const x=12+i*34;ellipse(c,x,-150,18,11,i%2?'#e8d2a6':shade(p.roof,.2),trim);}
      for(const [x,y]of[[63,-220],[116,-244],[170,-246],[226,-225],[273,-192]]){ellipse(c,x,y,7,7,'#f1dcc1',shade(p.trim,-.12));line(c,x-3,y-4,x+3,y+4,p.roof,3);}break;
    case 'story':
      roof([[-10,-151],[54,-270],[146,-247],[238,-284],[329,-173],[287,-147]],-286);
      poly(c,[[54,-270],[146,-247],[238,-284],[239,-274],[147,-236],[55,-260]],'#d9cfae',trim,2);
      for(let i=0;i<4;i++)poly(c,[[58,-265+i*5],[146,-242+i*5],[234,-279+i*5]],null,shade(p.trim,.1),1);
      line(c,146,-243,146,-151,trim,6);poly(c,[[145,-239],[164,-247],[164,-174],[154,-181],[145,-171]],'#9f7753',p.trim);break;
    case 'bread':
      c.beginPath();c.moveTo(-8,-148);c.bezierCurveTo(-2,-278,284,-282,329,-173);c.lineTo(287,-147);c.closePath();c.fillStyle=p.roof;c.fill();c.strokeStyle=trim;c.lineWidth=4;c.stroke();
      curvedRoofMaterial(c,-8,330,-280,-147,p.roof);
      for(let x=25;x<296;x+=37){c.beginPath();c.moveTo(x,-151);c.bezierCurveTo(x-12,-183,x+2,-228,x+25,-249);c.strokeStyle=shade(p.roof,.2);c.lineWidth=4;c.stroke();}
      ellipse(c,149,-206,36,19,'#d7a75e',shade(p.trim,-.15),3);for(const x of[131,149,167])line(c,x-5,-216,x+4,-199,'#f6d495',3);break;
    case 'companions':
      gable(c,78,161,-248,{...p,roof:'#34466e'},trim);gable(c,222,160,-261,{...p,roof:'#a77086'},trim);
      roundWindow(c,77,-191,21,trim,'#bfc8df');roundWindow(c,222,-195,21,trim,'#e5c2ca');line(c,109,-166,190,-166,trim,3);break;
    case 'moon':
      roof([[-8,-148],[50,-223],[273,-228],[331,-172],[288,-147]],-231);box(c,213,-257,59,110,shade(p.wall,.07),trim,3);
      roof([[199,-256],[242,-296],[284,-256]],-297,-253);archedWindow(c,242,-180,18,61,trim,'#bac8dc');crescent(c,242,-276,12,'#e6d09c');
      box(c,205,-263,76,7,shade(p.trim,.08),trim);break;
    case 'cat-garden':
      gable(c,147,282,-231,p,trim);poly(c,[[44,-211],[53,-266],[88,-235]],p.roof,trim,3);poly(c,[[202,-235],[239,-266],[250,-210]],p.roof,trim,3);
      for(const x of[43,266]){line(c,x,-145,x,-21,'#637d54',3);for(let y=-135;y<-25;y+=17){ellipse(c,x-4,y,10,4,'#819966');ellipse(c,x+5,y+6,10,4,'#92a66e');}}break;
    case 'chamomile':
      poly(c,[[-9,-150],[148,-270],[332,-173],[288,-146]],'#9cae91',trim,4);
      for(let i=0;i<7;i++){const x=12+i*44;line(c,148,-266,x,-151,'#d3d3ac',3);line(c,148,-266,321-i*19,-173,'#d3d3ac',2);}
      for(const y of[-224,-189,-157])line(c,13+(-y-150)*1.27,y,287-(-y-150)*1.35,y,'#d9d6b7',3);
      box(c,134,-267,26,8,trim,p.trim);flower(c,147,-278,12,'#eee3b8','#bb954c');break;
    case 'hedgehog':
      c.beginPath();c.moveTo(-9,-147);c.bezierCurveTo(-7,-253,300,-257,332,-170);c.lineTo(286,-146);c.closePath();c.fillStyle=p.roof;c.fill();c.strokeStyle=trim;c.lineWidth=4;c.stroke();
      curvedRoofMaterial(c,-9,333,-258,-146,p.roof);
      for(let i=0;i<14;i++){const x=4+i*23,y=-148-Math.sin((i+.5)*Math.PI/14)*83;poly(c,[[x-12,y+10],[x,y-14],[x+12,y+8]],shade(p.roof,.1),shade(p.roof,-.2));}
      roundWindow(c,147,-190,22,trim,'#d1b58d',6);break;
    case 'shiba':
      gable(c,147,286,-259,p,trim);poly(c,[[28,-167],[61,-223],[90,-182]],shade(p.roof,-.08),p.trim,3);poly(c,[[204,-183],[234,-225],[266,-167]],shade(p.roof,-.08),p.trim,3);
      archedWindow(c,147,-165,39,43,trim,'#dfc393');break;
    case 'violet-knit':
      roof([[-11,-152],[145,-289],[333,-174],[288,-146]],-291);poly(c,[[145,-289],[178,-294],[333,-174],[307,-160]],shade(p.roof,-.13),trim,2);
      for(let i=0;i<6;i++){const y=-253+i*19,d=(y+289)*1.13;poly(c,[[145,y-17],[145+d*.31,y],[145,y+17],[145-d*.31,y]],null,shade(p.trim,.2),1.5);}break;
    case 'trio':
      for(const [x,peak]of[[52,-230],[148,-268],[244,-238]]){gable(c,x,111,peak,p,trim);roundWindow(c,x,-181,13,trim,['#c5cadd','#e5c394','#c6d9cb'][Math.floor(x/95)]);}
      line(c,-4,-146,302,-146,shade(p.trim,.12),4);break;
    case 'iris':
      for(const [x,peak]of[[72,-249],[147,-290],[225,-259]]){c.beginPath();c.moveTo(x-74,-149);c.bezierCurveTo(x-67,-211,x-19,peak-4,x,peak);c.bezierCurveTo(x+24,peak+9,x+62,-215,x+76,-149);c.closePath();c.fillStyle=x===147?shade(p.roof,.12):p.roof;c.fill();c.strokeStyle=shade(p.trim,.13);c.lineWidth=3;c.stroke();curvedRoofMaterial(c,x-74,x+76,peak,-149,x===147?shade(p.roof,.12):p.roof);line(c,x,peak+8,x,-153,shade(p.trim,.12),2);}
      break;
    case 'lion':
      roof([[-11,-148],[55,-244],[255,-259],[332,-174],[288,-146]],-260);poly(c,[[55,-244],[89,-268],[255,-283],[255,-259]],shade(p.roof,.18),trim,2);
      for(let i=0;i<7;i++){const x=79+i*24;poly(c,[[x,-260],[x+12,-282],[x+24,-262]],'#c49a52',shade(p.trim,-.12));}
      roundWindow(c,147,-204,30,trim,'#f2d58d',12);break;
    default:gable(c,147,282,-247,p,trim);
  }
}
function homeWindows(c,theme,p,trim,door){
  const sides=[57,241].filter(x=>Math.abs(x-door)>48);
  for(const x of sides){
    switch(theme){
      case 'lantern-cat':catWindow(c,x,-64,trim,'#c9c99f');break;
      case 'devil':archedWindow(c,x,-35,34,51,trim,'#ce949a');poly(c,[[x-32,-83],[x-43,-62],[x-18,-68]],p.roof,p.trim);poly(c,[[x+32,-83],[x+43,-62],[x+18,-68]],p.roof,p.trim);break;
      case 'tide':roundWindow(c,x,-62,23,trim,'#b5d7dc',8);for(let i=0;i<2;i++){c.beginPath();c.moveTo(x-33,-26+i*6);c.bezierCurveTo(x-11,-40+i*6,x+10,-11+i*6,x+34,-29+i*6);c.strokeStyle=shade(p.roof,.1);c.lineWidth=2;c.stroke();}break;
      case 'candy':archedWindow(c,x,-31,45,54,trim,'#e8bdc1');awning(c,x,-90,61,p,{stripes:5});break;
      case 'story':
        box(c,x-30,-87,60,59,shade(trim,-.08),p.trim,2);for(let row=0;row<2;row++){for(let i=0;i<7;i++){const xx=x-24+i*7;box(c,xx,-79+row*24,5,17+(i%3),['#91856e','#65796b','#956b66','#756c85'][i%4],shade(p.trim,-.12));}line(c,x-28,-55+row*25,x+28,-55+row*25,p.trim,3);}break;
      case 'bread':archedWindow(c,x,-34,42,47,trim,'#e6be79');awning(c,x,-91,68,p,{stripes:7,scallop:false});break;
      case 'companions':archedWindow(c,x,-35,37,49,trim,x<100?'#c1c9df':'#e4b9cb');star(c,x,-65,11,x<100?'#e0e2ed':'#f0d5c9',trim);break;
      case 'moon':archedWindow(c,x,-31,32,57,trim,'#bac4da');crescent(c,x,-62,15,'#dfcf99');break;
      case 'cat-garden':poly(c,[[x-33,-31],[x-33,-78],[x-16,-90],[x+15,-90],[x+33,-78],[x+33,-31]],shade(p.wall,.06),trim,3);catWindow(c,x,-60,trim,'#c8d6af');planter(c,x,-23,p,'cat-leaf');break;
      case 'chamomile':
        archedWindow(c,x,-31,53,57,trim,'#bbcda2');for(const side of[-1,1])line(c,x+side*17,-77,x+side*17,-34,trim,2);flower(c,x,-59,15,'#f2e4b4','#be9749');planter(c,x,-23,p,'flower');break;
      case 'hedgehog':roundWindow(c,x,-58,24,trim,'#d9c1a0',6);box(c,x-31,-27,62,5,shade(p.trim,.12),trim);break;
      case 'shiba':archedWindow(c,x,-31,37,52,trim,'#e6cea2');poly(c,[[x-33,-76],[x,-101],[x+33,-76]],p.roof,p.trim,2);break;
      case 'violet-knit':
        poly(c,[[x,-91],[x+29,-58],[x,-25],[x-29,-58]],'#babed2',trim,5);
        for(const offset of[-14,0,14]){line(c,x-14+offset*.4,-73+offset*.5,x+14+offset*.4,-45+offset*.5,trim,1.5);line(c,x-14+offset*.4,-45-offset*.5,x+14+offset*.4,-73-offset*.5,trim,1.5);}break;
      case 'trio':for(const dx of[-19,0,19])archedWindow(c,x+dx,-32,13,48,trim,['#c7d5c8','#e5c797','#bdc4dc'][(dx+19)/19]);break;
      case 'iris':
        for(const dx of[-16,0,16]){archedWindow(c,x+dx,-31,12,dx?44:57,trim,dx<0?'#a9bbcf':dx>0?'#cdb0cd':'#cbbfe0');line(c,x+dx,-39,x+dx,-65,'#e1c988',1.5);}break;
      case 'lion':roundWindow(c,x,-59,25,trim,'#efd092',12);for(let i=0;i<10;i++){const a=i*TAU/10;line(c,x+Math.cos(a)*31,-59+Math.sin(a)*31,x+Math.cos(a)*36,-59+Math.sin(a)*36,p.trim,2);}break;
      default:window(c,x,-41,40,47,trim,true);
    }
  }
}
function atelierFrontage(c,b,p,trim,door){
  const use=b.homeUse,sides=[57,241].filter(x=>Math.abs(x-door)>48);
  if(!['illustration-studio','writing-garden','shop-atelier','recording-studio'].includes(use))return;
  for(const x of sides){
    const w=use==='illustration-studio'?71:67;
    // Added bays live on the wall, behind the existing motif-shaped opening.
    const path=()=>{c.beginPath();c.roundRect(x-w/2,-96,w,68,2);};
    glazing(c,path,x,-28,w,68,trim,use==='recording-studio'?'#7d8d9d':use==='shop-atelier'?'#c1b5c6':'#acc0c5');
    stoneSill(c,x,-28,w,shade(p.wall,-.1));
    for(const side of[-1,1])timber(c,x+side*(w/2+1)-2,-99,4,75,trim);
    if(use==='writing-garden'){
      for(const side of[-1,1])for(let i=0;i<3;i++){const xx=x+side*39,yy=-42-i*13;line(c,xx,-23,xx,yy-9,'#637956',1);ellipse(c,xx+side*4,yy,6,2.5,'#7e956c');}
    }
    if(use==='shop-atelier')awning(c,x,-104,78,p,{stripes:5,scallop:false});
    if(use==='recording-studio'){
      // Deep timber jambs and three absorptive strips suggest a listening booth.
      for(const side of[-1,1])for(let i=0;i<3;i++)line(c,x+side*(w/2-5+i*2),-88,x+side*(w/2-5+i*2),-36,'#45494c',1);
    }
  }
  if(use==='recording-studio'){
    const x=door>160?36:273;
    box(c,x-10,-124,20,29,gradient(c,x-10,-124,20,29,[[0,'#a58a58'],[1,'#594b39']]),'#ceba87',2);
    line(c,x-3,-104,x-3,-118,'#e9dbb0',1.6);line(c,x+5,-107,x+5,-121,'#e9dbb0',1.6);line(c,x-3,-118,x+5,-121,'#e9dbb0',2);
    ellipse(c,x-5,-104,3,2,'#e9dbb0');ellipse(c,x+3,-107,3,2,'#e9dbb0');
  }
}
function homeGarden(c,theme,p,trim,door){
  // Every garden stays beside the doorstep; none covers the walkable entrance.
  switch(theme){
    case 'lantern-cat':for(const xx of[26,280]){line(c,xx,7,xx,-31,trim,3);motif(c,'lantern',xx,-34,14,p.trim);cat(c,xx+15,12,8,'#303744','#b69a67');}break;
    case 'devil':for(const x of[28,280]){box(c,x-16,-4,32,15,'#72646d',trim,3);for(const dx of[-9,0,9]){line(c,x+dx,-3,x+dx,-31,trim,2);poly(c,[[x+dx-4,-27],[x+dx,-35],[x+dx+4,-27]],p.roof,p.trim);}}break;
    case 'tide':for(const x of[29,281]){box(c,x-22,1,44,13,'#809e9d',trim,3);line(c,x-23,-10,x+23,-10,trim,3);for(const dx of[-18,0,18])line(c,x+dx,-10,x+dx,8,trim,2);ellipse(c,x,11,10,3,'#b8c4b4');}break;
    case 'candy':for(const x of[25,282]){line(c,x,11,x,-17,trim,3);ellipse(c,x,-23,15,15,'#d8a5ae',p.trim,2);c.beginPath();c.arc(x,-23,8,0,Math.PI*1.5);c.strokeStyle='#f2d8bd';c.lineWidth=4;c.stroke();}break;
    case 'story':for(const x of[28,283]){box(c,x-20,-4,40,18,trim,p.trim,2);for(const dx of[-11,4]){ellipse(c,x+dx,0,9,10,'#bb824e',p.trim);line(c,x+dx,-9,x+dx+2,-15,'#70865b',2);}}break;
    case 'bread':
      poly(c,[[245,12],[296,12],[296,-16],[287,-35],[259,-35],[245,-16]],'#a78060',trim,2);archedWindow(c,271,7,25,29,trim,'#9d6943');ellipse(c,271,1,9,4,'#d3a85f');
      box(c,15,-4,42,20,trim,p.trim,3);for(const x of[24,37,48]){ellipse(c,x,-4,6,11,'#c59a5e',p.trim);line(c,x-2,-8,x+2,-2,'#e8c78b',1.5);}break;
    case 'companions':for(const [x,color]of[[26,'#a7b3d4'],[280,'#d8acbc']]){planter(c,x,3,p,'flower');star(c,x,13,9,color,trim);}break;
    case 'moon':for(const x of[27,282]){box(c,x-20,0,40,13,'#747c8e',p.trim,3);crescent(c,x,-8,14,'#d8c58d');for(const dx of[-14,14])star(c,x+dx,9,4,'#e6d6ad');}break;
    case 'cat-garden':for(const x of[27,282]){box(c,x-23,0,46,12,trim,p.trim,3);for(const dx of[-15,0,15]){line(c,x+dx,2,x+dx,-18,'#7d9463',2);ellipse(c,x+dx-4,-10,8,4,'#8fa16b');ellipse(c,x+dx+4,-17,8,4,'#8fa16b');}cat(c,x,8,9,'#899b87',trim);}break;
    case 'chamomile':for(const x of[27,281]){box(c,x-25,1,50,12,'#8d9870',p.trim,3);for(const dx of[-17,-5,9,21]){line(c,x+dx,4,x+dx,-12,'#7e8e5f',1.5);flower(c,x+dx,-14,7,'#eee3b2','#ba954b');}}break;
    case 'hedgehog':for(const x of[27,281]){ellipse(c,x,8,25,10,'#6d7857',p.trim);for(const dx of[-16,0,16]){box(c,x+dx-4,-1,8,11,'#b19c79',trim,2);ellipse(c,x+dx,-4,9,6,dx?'#9b7658':'#bb9a67',p.trim);}}break;
    case 'shiba':for(const x of[28,282]){ellipse(c,x,8,18,8,'#82916d',trim);ellipse(c,x,9,5,4,p.trim);for(const dx of[-8,0,8])ellipse(c,x+dx,2-Math.abs(dx)*.15,3,3,p.trim);}break;
    case 'violet-knit':for(const x of[28,281]){box(c,x-22,0,44,13,'#857791',trim,3);for(const dx of[-13,0,13]){ellipse(c,x+dx,-2,8,8,['#b2a5bb','#a6b4be','#c8b29b'][(dx+13)/13],p.trim);for(let yy=-7;yy<5;yy+=4)line(c,x+dx-6,yy,x+dx+6,yy+2,trim,.8);}}break;
    case 'trio':for(const x of[28,281]){box(c,x-25,0,50,13,trim,p.trim,3);for(const dx of[-16,0,16]){line(c,x+dx,1,x+dx,-14,trim,1.5);star(c,x+dx,-15,7,['#bdcbd4','#e9c382','#bad1ba'][(dx+16)/16],trim);}}break;
    case 'iris':for(const x of[27,281]){box(c,x-23,1,46,12,trim,p.trim,3);for(const dx of[-14,0,14]){line(c,x+dx,2,x+dx,-15,'#829064',2);poly(c,[[x+dx,-28],[x+dx+7,-14],[x+dx,-10],[x+dx-7,-14]],'#b8a4c9',p.trim);poly(c,[[x+dx,-11],[x+dx-9,-21],[x+dx-11,-10]],'#9587b6',p.trim);}}break;
    case 'lion':for(const x of[29,281]){box(c,x-14,0,28,13,'#a9926a',trim,2);motif(c,'lion',x,-16,16,p.trim);}break;
    default:for(const x of[26,280])planter(c,x,4,p,'flower');
  }
}
function architecture(c,b,door,entry){
  const p={wall:'#bcb3a0',roof:'#576a75',trim:'#806342',...b.homePalette},trim=woodTone(p.trim),kind=b.motif||'lantern',theme=b.homeTheme||themeByMotif[kind]||'lantern-cat',seed=surfaceSeed(b.creatorId||theme);
  for(let i=0;i<4;i++)ellipse(c,164,8,166-i*4,21-i*3,'#0813220c');
  poly(c,[[0,0],[307,-7],[343,17],[25,27]],'#0a172b42');
  poly(c,[[284,-151],[318,-174],[318,-22],[284,0]],gradient(c,284,0,34,0,[[0,shade(p.wall,-.22)],[1,shade(p.wall,-.32)]]),shade(trim,-.18),2);
  c.save();c.clip();masonry(c,284,-174,34,174,shade(p.wall,-.17),seed,{side:true,construction:b.homeConstruction});
  for(let i=0;i<8;i++){const yy=-144+i*19;line(c,288,yy,316,yy-18,shade(p.wall,-.35),.7);}c.restore();
  masonry(c,12,-150,272,150,p.wall,seed,{construction:b.homeConstruction});
  // Raised corner stones have beveled edges and irregular, shallow mortar joints.
  for(const xx of[16,270])for(let i=0;i<7;i++){const yy=-136+i*18,ww=i%2?12:16;rect(c,xx,yy,ww,16,shade(p.wall,-.07+(i%3)*.025));line(c,xx,yy,xx+ww,yy,shade(p.wall,.16),.7);line(c,xx+ww,yy+1,xx+ww,yy+16,shade(p.wall,-.22),.8);}
  box(c,9,-11,279,11,shade(p.trim,-.2),shade(p.trim,.03));poly(c,[[288,-11],[321,-31],[321,-20],[288,1]],shade(p.trim,-.3),shade(p.trim,-.1));
  timber(c,9,-11,279,11,shade(trim,-.03),seed);
  for(const xx of[16,280]){rect(c,xx+2,-146,7,135,'#22202b22');timber(c,xx-3,-149,6,138,trim,seed+xx);}
  timber(c,10,-150,280,7,trim,seed);
  if(['story','bread','companions','shiba','violet-knit'].includes(theme)){for(const xx of[83,213]){rect(c,xx+2,-146,6,135,'#241d2522');timber(c,xx-3,-148,6,137,trim,seed+xx);}line(c,23,-141,78,-88,'#26202c33',6);line(c,22,-144,77,-91,trim,4);line(c,221,-89,277,-141,'#26202c33',6);line(c,220,-92,276,-144,trim,4);}
  homeRoof(c,theme,p,trim);
  rect(c,20,-143,258,15,gradient(c,0,-143,0,15,[[0,'#11152561'],[1,'#11152500']]));
  atelierFrontage(c,b,p,trim,door);
  homeWindows(c,theme,p,trim,door);
  // The actual game coordinate controls the doorway and its clear path endpoint.
  if(theme==='lion'){archedWindow(c,door,-1,66,92,shade(p.trim,-.17),shade(p.wall,.05));motif(c,'lion',door,-88,12,p.trim);}
  if(theme==='shiba')poly(c,[[door-35,-73],[door,-104],[door+35,-73]],p.roof,p.trim,3);
  box(c,door-27,-77,54,79,'#131a244d',null,11);
  box(c,door-25,-80,50,80,gradient(c,door-25,-80,50,80,[[0,shade(trim,.14)],[.2,shade(trim,-.22)],[1,shade(trim,-.34)]]),shade(p.trim,.13),11);
  box(c,door-19,-74,38,73,trim,shade(p.trim,-.05),8);
  c.save();c.clip();for(let i=0;i<4;i++)timber(c,door-19+i*9.5,-74,9.5,73,shade(trim,(i%2)*.025),seed+i);c.restore();
  for(const dx of[-9,0,9])line(c,door+dx,-60,door+dx,-5,shade(p.trim,-.23),.7);
  for(const yy of[-34,-12]){line(c,door-15,yy,door-4,yy,shade(trim,-.32),2.8);for(const dx of[-15,-5])ellipse(c,door+dx,yy,.9,.9,shade(p.trim,.03));}
  const doorGlass=()=>{c.beginPath();c.roundRect(door-11,-65,22,22,6);};glazing(c,doorGlass,door,-43,22,22,trim,'#bac2ad');
  line(c,door,-64,door,-43,trim,1.5);line(c,door-10,-54,door+10,-54,trim,1.5);ellipse(c,door+12,-28,3.1,3.1,'#161c295c');ellipse(c,door+12,-29,2.2,2.2,gradient(c,door+10,-31,4,4,[[0,'#f6d68c'],[1,'#856534']]));
  nameplate(c,b,Math.max(105,Math.min(215,door)),-109,trim);
  const signX=door>160?door-43:door+43;ellipse(c,signX,-54,15,17,shade(trim,-.15),shade(p.trim,.12),1.2);motif(c,kind,signX,-54,11,p.trim);
  homeGarden(c,theme,p,trim,door);
  poly(c,[[door-25,1],[door+25,1],[door+29,entry+8],[door-29,entry+8]],gradient(c,door-25,1,58,entry+7,[[0,'#77766b'],[.3,'#a29b84'],[1,'#8c8e7b']]),'#606c6c');
  for(let row=0,yy=4;yy<entry+8;row++,yy+=10){line(c,door-25,yy,door+25,yy,'#c2b99d',.8);line(c,door-25,yy+1,door+25,yy+1,'#5b625a',.8);line(c,door+(row%2?-9:9),yy,door+(row%2?-9:9),yy+9,'#61675c',.7);}
  box(c,door-29,-1,58,6,gradient(c,0,-1,0,6,[[0,'#d4c8aa'],[.3,'#aaa086'],[1,'#79766b']]),'#736d68');
}
function cached(c,key,paint){
  let cache=cacheByContext.get(c);if(!cache){cache=new Map();cacheByContext.set(c,cache);}if(cache.has(key))return cache.get(key);
  let cv=null;try{if(c.canvas?.ownerDocument?.createElement)cv=c.canvas.ownerDocument.createElement('canvas');else if(typeof OffscreenCanvas!=='undefined')cv=new OffscreenCanvas(1,1);else if(c.canvas?.constructor?.name==='CanvasElement')cv=new c.canvas.constructor(1,1);}catch{}
  if(!cv)return null;cv.width=384;cv.height=368;const ctx=cv.getContext('2d');if(!ctx)return null;ctx.translate(24,304);paint(ctx);cache.set(key,cv);while(cache.size>24)cache.delete(cache.keys().next().value);return cv;
}
export function drawCreatorHome2D(c,b,{tile=64}={}){
  if(!c||!Number.isFinite(tile)||tile<=0||!b||!Number.isFinite(b.x)||!Number.isFinite(b.z)||!Number.isFinite(b.w)||b.w<=0||!Number.isFinite(b.h))return false;
  const scale=b.w*tile/320,x=b.x*tile,y=(b.z+b.h)*tile,door=((b.door?.x??b.x+b.w/2)-b.x)*320/b.w,entry=((b.door?.z??b.z+b.h)-(b.z+b.h))*320/b.w;
  const key=JSON.stringify([b.creatorId,b.creatorName,b.homeLabel,b.homeTheme,b.homeUse,b.homeConstruction,b.motif,b.homePalette,door,entry]);
  c.save();c.translate(x,y);c.scale(scale,scale);const image=cached(c,key,ctx=>architecture(ctx,b,door,entry));if(image)c.drawImage(image,-24,-304);else architecture(c,b,door,entry);c.restore();return true;
}

/** A small open gate identifies map travel while leaving the walking path visible. */
export function drawCreatorQuarterGate2D(c,portal,{tile=64}={}){
  if(!c||!Number.isFinite(tile)||tile<=0||!portal||!Number.isFinite(portal.x)||!Number.isFinite(portal.z))return false;
  const outbound=portal.to==='creator-quarter',label=outbound?'参加者の住宅街 →':'← 星灯りの街',x=portal.x*tile,y=portal.z*tile,scale=tile/64;
  c.save();c.translate(x,y);c.scale(scale,scale);
  for(const side of[-1,1]){
    const xx=side*69;poly(c,[[xx-6,3],[xx+6,3],[xx+5,-95],[xx-5,-95]],'#5b4637','#bb9a65',1.5);box(c,xx-9,-98,18,7,'#806044','#c2a775');
    poly(c,[[xx-13,-99],[xx,-111],[xx+13,-99]],'#495964','#ac976f');box(c,xx-10,-5,20,8,'#8e8a76','#b4a384');
    const lampX=xx-side*15;line(c,xx,-72,lampX,-72,'#b09a6b',2);motif(c,'lantern',lampX,-58,11,'#9d865d');
    // Low rails stop at each post; the passage between them remains open.
    for(const yy of[-38,-20])line(c,xx,yy,xx+side*25,yy+4,'#806a4d',3);
  }
  box(c,-84,-93,168,28,'#3c382f','#c3a66d',3);line(c,-77,-89,77,-89,'#d7bd8177');
  c.font='600 14px "Yu Gothic","Hiragino Kaku Gothic ProN",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f1e3bf';c.fillText(label,0,-79,156);
  // Direction is repeated as an inlaid arrow at the actual travel coordinate.
  poly(c,outbound?[[-12,4],[3,4],[3,-2],[15,9],[3,20],[3,14],[-12,14]]:[[12,4],[-3,4],[-3,-2],[-15,9],[-3,20],[-3,14],[12,14]],'#bba26b88');
  c.restore();return true;
}
