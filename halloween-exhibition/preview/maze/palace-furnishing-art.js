/** Readable local furniture when an illustrated palace cutout has not arrived. */
const TAU=Math.PI*2,wood='#50372f',edge='#bd9763',dark='#292530',cream='#c1ad94';
export const FURNISHING_KINDS=Object.freeze(['bookcase','cabinet','moonWindow','tapestry','palaceColumn','planter','chaise','harvest','candelabra','armchair','writingDesk','armillary']);
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function poly(c,points,color,stroke=null,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function ellipse(c,x,y,rx,ry,color,stroke=null,width=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function box(c,x,y,w,h,fill,stroke=null){rect(c,x,y,w,h,fill);if(stroke){c.strokeStyle=stroke;c.lineWidth=1.3;c.strokeRect(x,y,w,h);}}
function arch(c,x,y,w,h,fill,stroke=null,width=1){c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x+w/2,y);c.lineTo(x+w/2,y-h+w*.65);c.quadraticCurveTo(x+w/2,y-h+w*.32,x,y-h);c.quadraticCurveTo(x-w/2,y-h+w*.32,x-w/2,y-h+w*.65);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function volume(c,x,y,w,h,fill=wood){poly(c,[[x,y],[x+w,y],[x+w+7,y-6],[x+7,y-6]],'#82634b',edge);poly(c,[[x+w,y],[x+w+7,y-6],[x+w+7,y+h-5],[x+w,y+h]],'#352a2c','#7f6449');box(c,x,y,w,h,fill,edge);}
function tinyBook(c,x,y,w,h,color){box(c,x,y-h,w,h,color,'#2b2830');line(c,x+1,y-h+5,x+w-1,y-h+5,'#bc9b60');line(c,x+1,y-4,x+w-1,y-4,'#bc9b60');}
function candle(c,x,y,scale=1){
  c.save();c.translate(x,y);c.scale(scale,scale);box(c,-3,-15,6,15,'#d6bd8b','#6f543c');poly(c,[[-3,-19],[0,-28],[3,-20],[1,-16]],'#edbb62');ellipse(c,0,-20,1.3,3,'#fbe5ae');c.restore();
}
function carvedLeg(c,x,y,h=14){poly(c,[[x-3,y-h],[x+3,y-h],[x+2,y-3],[x+5,y],[x-4,y]],'#775138',edge);}
function bookcase(c){
  volume(c,-39,-92,78,86,'#573c32');box(c,-33,-85,66,72,'#29282f');
  for(let row=0;row<4;row++){
    const yy=-68+row*18;for(let i=0;i<8;i++)tinyBook(c,-30+i*8,yy,6,11+(i*3+row)%5,['#6b4651','#456468','#8a704d','#615777'][(i+row)%4]);
    box(c,-35,yy+1,70,3,'#8e6949',edge);
  }
  box(c,-43,-96,86,6,'#7c5a41',edge);box(c,-43,-7,86,6,'#77533c',edge);
}
function cabinet(c){
  volume(c,-46,-63,92,54);for(const x of[-23,23]){box(c,x-19,-57,38,39,'#332c31','#a18154');box(c,x-15,-53,30,31,'#5c3d31','#9f815b');ellipse(c,x+(x<0?11:-11),-37,1.8,1.8,'#e1bd76');}
  box(c,-49,-68,98,6,'#94714b',edge);for(const x of[-38,38])carvedLeg(c,x,0,10);
  for(let i=0;i<4;i++)tinyBook(c,-38+i*6,-69,5,14+i%2*4,['#625176','#49666a','#8d694a','#705052'][i]);
  candle(c,32,-69,.6);box(c,-3,-77,21,6,'#594a64',edge);
}
function moonWindow(c){
  arch(c,0,-3,65,94,'#ad9c87','#50453f',2);arch(c,0,-7,53,82,'#182d43',edge,1.5);
  // The crescent and mountain silhouette identify an actual view through the glass.
  ellipse(c,5,-65,10,10,'#e4d3a0');ellipse(c,9,-68,8.5,8.5,'#182d43');
  poly(c,[[-24,-9],[-24,-30],[-9,-41],[1,-25],[13,-48],[25,-29],[25,-9]],'#3d4a61');
  for(const[x,y]of[[-16,-61],[17,-49],[-9,-79],[12,-31]])ellipse(c,x,y,.9,.9,'#a7b7be');
  line(c,0,-86,0,-8,edge,2);line(c,-24,-37,24,-37,edge,1.5);
  for(const side of[-1,1])poly(c,[[side*32,-81],[side*23,-77],[side*22,-31],[side*31,-7],[side*35,-6]],'#36545d','#8e886c');
  box(c,-36,-5,72,5,'#b4a18b','#756450');
}
function tapestry(c){
  line(c,-40,-94,40,-94,edge,3);for(const x of[-42,42])ellipse(c,x,-94,2.5,2.5,edge);
  poly(c,[[-34,-91],[34,-91],[32,-15],[0,0],[-32,-15]],'#533b5c',edge,2);
  poly(c,[[-27,-85],[27,-85],[25,-20],[0,-8],[-25,-20]],null,'#b19a6577');
  ellipse(c,1,-52,18,22,'#c4a369');ellipse(c,10,-58,17,21,'#533b5c');
  for(const [x,y,r]of[[-17,-72,2],[19,-29,2],[-15,-28,3],[16,-76,2]])poly(c,[[x,y-r*2],[x+r,y],[x,y+r*2],[x-r,y]],'#d0b87b');
  for(const x of[-27,-14,0,14,27])line(c,x,-7-Math.abs(x)*.31,x,-2-Math.abs(x)*.31,'#a88b58');
}
function palaceColumn(c){
  box(c,-20,-7,40,7,'#aa977e','#6c5b4e');box(c,-16,-15,32,7,'#c6b296','#84705b');
  poly(c,[[-12,-80],[12,-80],[15,-16],[-15,-16]],'#bca68c','#756755',1.3);
  rect(c,-10,-79,5,62,'#d9c4a4');rect(c,9,-79,4,62,'#827563');
  for(const x of[-4,2,7])line(c,x,-77,x+1,-20,'#9b8a73',1);
  box(c,-17,-86,34,7,'#a48d72',edge);box(c,-22,-94,44,8,'#c0a88c','#70604f');
  for(const side of[-1,1]){ellipse(c,side*13,-82,5,5,null,'#c9ab7b',2);line(c,side*14,-76,side*9,-69,'#c9ab7b',2);}
}
function planter(c){
  poly(c,[[-21,-35],[21,-35],[15,-9],[8,-5],[8,-1],[-8,-1],[-8,-5],[-15,-9]],'#94734a','#c1a36e',1.5);
  ellipse(c,0,-35,23,7,'#b18c56','#d0b076');ellipse(c,0,-36,17,4,'#3d3c2d');box(c,-13,-2,26,3,'#a38250',edge);
  for(const x of[-12,-5,5,12])line(c,x,-30,x*.6,-11,'#d1ad6a77');
  for(let i=0;i<15;i++){
    const yy=-47-(i%5)*9,xx=Math.sin(i*2.4)*(11+(i%3)*4);line(c,0,-34,xx,yy,'#68734c',1.4);ellipse(c,xx,yy,8,5,['#4a6247','#64734d','#7c8055'][i%3]);
    if(i%4===0){for(let p=0;p<5;p++)ellipse(c,xx+Math.cos(p*TAU/5)*3,yy+Math.sin(p*TAU/5)*3,2.7,2.3,'#cdbd8f');ellipse(c,xx,yy,1.8,1.8,'#af9358');}
  }
}
function chair(c,arm=false){
  arch(c,0,-32,arm?54:43,61,arm?'#365456':'#6a4258',edge,2);
  arch(c,0,-40,arm?42:33,45,arm?'#284044':'#4e3448','#8b7960',1);
  for(const side of[-1,1]){carvedLeg(c,side*(arm?22:18),0,20);poly(c,[[side*29,-38],[side*22,-37],[side*22,-18],[side*28,-16]],'#815d40',edge);}
  volume(c,arm?-25:-22,-31,arm?50:44,16,arm?'#3c5b5b':'#765265');
  for(const x of[-10,10])ellipse(c,x,-62,1.6,1.6,'#a68a5f');
}
function chaise(c){
  for(const side of[-1,1])carvedLeg(c,side*43,0,17);
  poly(c,[[-48,-49],[-48,-80],[-40,-85],[-33,-60],[-15,-47],[33,-49],[43,-62],[49,-61],[49,-18],[-48,-18]],'#68465b',edge,2);
  volume(c,-46,-36,93,21,'#755568');poly(c,[[-41,-40],[-28,-59],[-6,-47],[12,-44],[41,-43],[43,-31],[-42,-31]],'#976d7d','#b79273');
  for(const x of[-34,37])ellipse(c,x,-50,7,9,'#b48a5b','#dcc394');
  line(c,-45,-15,46,-15,edge,2);
}
function pumpkin(c,x,y,r,color='#c27a32'){
  ellipse(c,x,y,r,r*.76,'#84502c');for(const f of[-.53,0,.53])ellipse(c,x+r*f,y,r*.44,r*.74,color,'#825126',.7);rect(c,x-2,y-r*.86,4,r*.3,'#69714c');
}
function harvest(c){
  box(c,-30,-13,60,12,'#61432c',edge);line(c,-26,-9,25,-9,'#967346');
  ellipse(c,0,-18,39,13,'#3d573f');pumpkin(c,0,-39,24);pumpkin(c,-26,-22,14,'#d9c39b');pumpkin(c,26,-18,14,'#a95d2e');
  for(let i=0;i<6;i++){const xx=(i-2.5)*12;ellipse(c,xx,-10-Math.abs(i-2.5)*2,6,3,'#7f8750');}
  candle(c,29,-37,.6);box(c,-35,-45,22,6,'#695169',edge);
}
function candelabra(c){
  box(c,-17,-5,34,5,'#967345',edge);box(c,-11,-12,22,7,'#b18d55');line(c,0,-13,0,-67,edge,6);line(c,-1,-13,-1,-67,'#e1c18b',1);
  for(const side of[-1,1]){c.beginPath();c.moveTo(0,-35);c.bezierCurveTo(side*24,-35,side*22,-44,side*22,-62);c.strokeStyle=edge;c.lineWidth=4;c.stroke();candle(c,side*22,-61,.8);ellipse(c,side*22,-60,7,2,'#b5945a');}
  candle(c,0,-69,.9);ellipse(c,0,-68,7,2,'#c9a96c');
}
function writingDesk(c){
  for(const x of[-40,40])carvedLeg(c,x,0,33);volume(c,-44,-48,88,20);box(c,-49,-54,98,6,'#8f6946',edge);
  for(const x of[-27,0,27]){box(c,x-11,-43,22,10,'#583d31','#a58053');ellipse(c,x,-38,1.4,1.4,'#d4b779');}
  poly(c,[[-27,-55],[-8,-59],[-4,-45],[-24,-43]],'#c6b596','#6b4d37');poly(c,[[-8,-59],[12,-56],[11,-42],[-4,-45]],'#d9c9a6','#6b4d37');
  for(let i=0;i<3;i++)line(c,-22,-53+i*3,-10,-55+i*3,'#7a6e5b',.7);
  box(c,26,-62,8,8,'#35383c',edge);line(c,29,-62,37,-80,'#d5c7a6',2);line(c,37,-80,32,-74,'#d5c7a6',3);
  tinyBook(c,-40,-56,9,15,'#6e4965');
}
function armillary(c){
  box(c,-25,-6,50,6,'#6e5138',edge);for(const side of[-1,1])line(c,side*18,-6,side*10,-37,'#a78757',4);line(c,0,-6,0,-42,edge,5);
  ellipse(c,0,-62,29,29,'#2b414b','#b59359',2);ellipse(c,0,-62,29,10,null,'#ad955f',2);
  c.save();c.translate(0,-62);c.rotate(-.6);ellipse(c,0,0,15,32,null,'#d0ad69',2);line(c,0,-39,0,38,'#bc9a5b',2);c.restore();
  for(const[x,y]of[[-13,-70],[12,-53],[10,-76],[-9,-47]])ellipse(c,x,y,1,1,'#c8b88c');
  poly(c,[[-5,-90],[0,-98],[5,-90],[0,-86]],'#c8a364');
}
const painters={bookcase,cabinet,moonWindow,tapestry,palaceColumn,planter,chaise,harvest,candelabra,armchair:c=>chair(c,true),writingDesk,armillary,column:palaceColumn,window:moonWindow,pumpkins:harvest};
/** Origin is the exact illustrated sprite foot position. Missing images never become anonymous capsules. */
export function drawFurnishingFallback(c,object){
  const paint=Object.hasOwn(painters,object?.kind)?painters[object.kind]:null;if(!paint||!Number.isFinite(object.x)||!Number.isFinite(object.y))return false;
  const size=Number.isFinite(object.size)&&object.size>0?object.size:100;
  c.save();c.translate(object.x,object.y);c.scale(size/100,size/100);paint(c);c.restore();return true;
}
