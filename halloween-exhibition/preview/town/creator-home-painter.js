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
  box(c,x-w/2,y-h,w,h,gradient(c,0,y-h,0,h,[[0,'#92734f'],[.55,'#e1ba75'],[1,'#bb915f']]),'#564a3d',2);
  line(c,x,y-h,x,y,trim,2);line(c,x-w/2,y-h*.48,x+w/2,y-h*.48,trim,2);
  for(const side of[-1,1]){const xx=x+side*(w/2+9);box(c,xx-5,y-h-1,10,h+3,open?shade(trim,.08):shade(trim,-.08),shade(trim,.22));for(let i=0;i<4;i++)line(c,xx-3,y-h+7+i*10,xx+3,y-h+7+i*10,shade(trim,-.22));}
  box(c,x-w/2-8,y+3,w+16,5,shade(trim,.1),shade(trim,.3));
}
function planter(c,x,y,palette,motifKind){
  box(c,x-20,y-3,40,12,shade(palette.trim,-.22),palette.trim,2);line(c,x-19,y+4,x+19,y+4,shade(palette.trim,.16));
  for(let i=0;i<5;i++){const xx=x+(i-2)*8,yy=y-7-(i%2)*4;line(c,xx,y,xx+1,yy-8,'#6f8059',1.3);ellipse(c,xx,yy,7,3,'#738961');flower(c,xx,yy-5,4,motifKind==='flower'?'#ebdbb0':motifKind==='iris-flower'?'#b0a0c4':'#c99b91','#c7a86e');}
}
function roofTiles(c,points,left,right,top,bottom,color){
  c.save();poly(c,points,gradient(c,left,top,right-left,bottom-top,[[0,shade(color,.1)],[.3,color],[1,shade(color,-.18)]]),shade(color,-.26),2);c.clip();
  let n=0;for(let y=top+9;y<bottom+12;y+=11){line(c,left,y,right,y,shade(color,-.22),1.5);line(c,left,y+1,right,y+1,shade(color,.13),.7);for(let x=left+(n%2?9:0);x<right;x+=19)line(c,x,y,x-2,y+11,shade(color,-.25));n++;}
  c.restore();
}
function nameplate(c,b,x,y,trim){
  const creator=String(b.creatorName||'クリエイター').trim(),label=String(b.homeLabel||'創作の家').trim();
  box(c,x-87,y-15,174,34,shade(trim,-.25),shade(trim,.25),3);line(c,x-80,y-11,x+80,y-11,shade(trim,.33));
  c.fillStyle='#eadfc4';c.textAlign='center';c.textBaseline='middle';c.font='600 11px "Yu Gothic","Hiragino Kaku Gothic ProN",sans-serif';c.fillText(creator.length>18?creator.slice(0,17)+'…':creator,x,y-4,158);
  c.fillStyle='#cbb68b';c.font='10px "Yu Gothic","Hiragino Kaku Gothic ProN",sans-serif';c.fillText(label,x,y+10,158);
}
function architecture(c,b,door,entry){
  const p={wall:'#bcb3a0',roof:'#576a75',trim:'#806342',...b.homePalette},trim=woodTone(p.trim),kind=b.motif||'lantern',index=Math.max(0,CREATOR_HOME_MOTIFS.indexOf(kind)),variant=index%3;
  poly(c,[[0,0],[307,-7],[343,17],[25,27]],'#0a172b42');
  // Rear wall, bevelled plinth and timber posts all show their side planes.
  poly(c,[[284,-151],[318,-174],[318,-22],[284,0]],gradient(c,284,0,34,0,[[0,shade(p.wall,-.22)],[1,shade(p.wall,-.32)]]),shade(trim,-.18),2);
  box(c,12,-150,272,150,gradient(c,12,0,272,0,[[0,shade(p.wall,-.04)],[.4,p.wall],[1,shade(p.wall,-.13)]]),shade(trim,-.2),1);
  for(let row=0;row<10;row++){const yy=-143+row*14;line(c,15,yy,283,yy,shade(p.wall,-.08),.6);for(let col=0;col<9;col++){const xx=18+col*31+(row%2?15:0);if(xx<281)line(c,xx,yy,xx,yy+14,shade(p.wall,-.06),.5);}}
  for(let i=0;i<8;i++){const yy=-144+i*19;line(c,288,yy,316,yy-18,shade(p.wall,-.35));}
  box(c,9,-11,279,11,shade(p.trim,-.2),shade(p.trim,.03));poly(c,[[288,-11],[321,-31],[321,-20],[288,1]],shade(p.trim,-.3),shade(p.trim,-.1));
  for(const xx of[16,81,215,280]){box(c,xx-3,-149,6,138,trim,shade(p.trim,.12));}
  box(c,10,-150,280,7,trim,shade(p.trim,-.1));line(c,22,-144,77,-91,trim,4);line(c,220,-92,276,-144,trim,4);
  // Distinct roofs retain the same warm town vocabulary: gable, hipped, and dormered.
  if(variant===0){
    poly(c,[[11,-150],[146,-243],[286,-150]],shade(p.wall,.025),shade(trim,-.1),2);
    line(c,146,-238,146,-153,trim,6);for(const side of[-1,1])line(c,146,-225,146+side*77,-153,trim,4);
    roofTiles(c,[[146,-251],[180,-275],[332,-174],[289,-149]],145,333,-275,-147,p.roof);
    poly(c,[[-7,-152],[146,-258],[157,-250],[3,-145]],shade(p.roof,-.1),shade(p.roof,.18),2);
    line(c,146,-258,181,-280,shade(p.trim,.15),3);line(c,2,-145,147,-248,shade(p.trim,.05),2);
    ellipse(c,146,-186,24,24,shade(p.trim,-.23),shade(p.trim,.26),2);motif(c,kind,146,-186,19,p.trim);
  }else{
    roofTiles(c,[[-5,-150],[64,-245],[250,-260],[328,-176],[291,-147]],-5,328,-261,-144,p.roof);
    poly(c,[[64,-245],[93,-268],[250,-281],[250,-260]],shade(p.roof,.08),shade(p.roof,.2));
    line(c,93,-268,250,-281,shade(p.trim,.13),3);line(c,-6,-150,292,-146,shade(p.trim,.04),4);
    if(variant===2){
      box(c,114,-204,65,55,shade(p.wall,-.05),shade(trim,-.05),2);roofTiles(c,[[103,-204],[146,-252],[191,-208],[181,-203],[146,-238],[111,-200]],103,192,-253,-200,p.roof);
      window(c,146,-159,30,34,p.trim,true);
    }else{
      box(c,116,-220,60,40,shade(p.wall,-.03),trim,1);poly(c,[[109,-218],[146,-248],[183,-218]],shade(p.roof,-.08),shade(p.roof,.22),1.5);motif(c,kind,146,-201,17,p.trim);
    }
  }
  // Chimney masonry is local geometry; no art download changes the house's identity.
  const chimX=variant===0?251:266;poly(c,[[chimX,-215],[chimX+20,-216],[chimX+26,-223],[chimX+26,-263],[chimX+5,-259],[chimX,-254]],'#776b68','#393c45');box(c,chimX-2,-267,29,7,'#9d8a75','#514c49');
  for(let i=0;i<3;i++){line(c,chimX+2,-252+i*12,chimX+20,-255+i*12,'#49484d');line(c,chimX+10+(i%2?7:0),-252+i*12,chimX+10+(i%2?7:0),-241+i*12,'#49484d');}
  // The actual door coordinate controls both the doorway and the path endpoint.
  box(c,door-25,-80,50,80,shade(trim,-.17),shade(p.trim,.13),11);box(c,door-19,-74,38,73,trim,shade(p.trim,-.05),8);
  for(const dx of[-9,0,9])line(c,door+dx,-60,door+dx,-5,shade(p.trim,-.23));box(c,door-11,-65,22,22,'#bac2ad',shade(p.trim,.2),6);line(c,door,-64,door,-43,trim,1.5);line(c,door-10,-54,door+10,-54,trim,1.5);ellipse(c,door+12,-29,2.2,2.2,'#e0bc72');
  for(const xx of[57,241])if(Math.abs(xx-door)>48){window(c,xx,-41,40,47,trim,true);planter(c,xx,-30,p,kind);}
  nameplate(c,b,Math.max(105,Math.min(215,door)),-109,trim);
  // Emblems also appear at the threshold, readable from the player's usual viewpoint.
  const signX=door>160?door-43:door+43;ellipse(c,signX,-54,15,17,shade(trim,-.15),shade(p.trim,.12),1.2);motif(c,kind,signX,-54,11,p.trim);
  poly(c,[[door-25,1],[door+25,1],[door+29,entry+8],[door-29,entry+8]],'#8d8d81','#606c6c');
  for(let yy=4;yy<entry+8;yy+=10)line(c,door-25,yy,door+25,yy,'#b4ad8e',1);box(c,door-29,-1,58,6,'#b8ac91','#736d68');
  // Theme-colored front gardens are decorative, never participant artwork substitutes.
  for(const xx of[26,280]){planter(c,xx,4,p,kind);for(let i=0;i<3;i++)ellipse(c,xx+(i-1)*7,17,4,2,['#717a58','#8d835c','#806357'][i]);}
  if(kind==='lantern'||kind==='moon-cat'){for(const xx of[door-34,door+34]){line(c,xx,-4,xx,-29,shade(p.trim,-.2),2);motif(c,'lantern',xx,-29,9,p.trim);}}
}
function cached(c,key,paint){
  let cache=cacheByContext.get(c);if(!cache){cache=new Map();cacheByContext.set(c,cache);}if(cache.has(key))return cache.get(key);
  let cv=null;try{if(c.canvas?.ownerDocument?.createElement)cv=c.canvas.ownerDocument.createElement('canvas');else if(typeof OffscreenCanvas!=='undefined')cv=new OffscreenCanvas(1,1);else if(c.canvas?.constructor?.name==='CanvasElement')cv=new c.canvas.constructor(1,1);}catch{}
  if(!cv)return null;cv.width=384;cv.height=368;const ctx=cv.getContext('2d');if(!ctx)return null;ctx.translate(24,304);paint(ctx);cache.set(key,cv);while(cache.size>24)cache.delete(cache.keys().next().value);return cv;
}
export function drawCreatorHome2D(c,b,{tile=64}={}){
  if(!c||!Number.isFinite(tile)||tile<=0||!b||!Number.isFinite(b.x)||!Number.isFinite(b.z)||!Number.isFinite(b.w)||b.w<=0||!Number.isFinite(b.h))return false;
  const scale=b.w*tile/320,x=b.x*tile,y=(b.z+b.h)*tile,door=((b.door?.x??b.x+b.w/2)-b.x)*320/b.w,entry=((b.door?.z??b.z+b.h)-(b.z+b.h))*320/b.w;
  const key=JSON.stringify([b.creatorId,b.creatorName,b.homeLabel,b.homeTheme,b.motif,b.homePalette,door,entry]);
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
