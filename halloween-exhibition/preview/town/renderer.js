import {getTownMap} from './story-data.js';
import {TOWN_TILE as TILE,followTownCamera,townCameraTarget,townVisibleBounds,townWorldToScreen,townScreenToWorld} from './motion.js';
import {TOWN_BUDGET,TOWN_PROP_CELLS,TOWN_BATTLE_ART_IDS,townVisualSeed as seed,buildingArtKind,townPropSprite} from './visual-data.js';
import {drawArtSprite,playerPose,loadArtImage,PALACE_ART} from '../maze/rpg-art.js?v=20261017-review1';
import {monsterSprite} from '../maze/monster-motion.js?v=20261017-review1';

const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const TOWN_DEPTH_SCALE=.78;
const renderersByArt=new WeakMap();
const defaultCanvas=(w,h)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;};
const ellipse=(c,x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fillStyle=color;c.fill();};
const poly=(c,points,fill,stroke=null,width=1)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
function box(c,x,y,w,h,r,fill,stroke=null){c.beginPath();c.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=1;c.strokeStyle=stroke;c.stroke();}}
function glow(c,x,y,r,color){if(r<=0)return;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function text(c,value,x,y,size=11,color='#f5e4ba',align='center',maxWidth=null){c.font=`600 ${size}px "Yu Gothic","Hiragino Kaku Gothic ProN",sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;if(maxWidth)c.fillText(value,x,y,maxWidth);else c.fillText(value,x,y);}

function lamp(c,x,y,on=true,time=0){
  ellipse(c,x,y+3,13,5,'#0c152755');box(c,x-4,y-7,8,9,2,'#545c63','#9d9b87');box(c,x-2,y-62,4,58,1,'#283542','#a7a17a');
  line(c,x,y-59,x+14,y-73,'#a7a17a',3);box(c,x+8,y-88,14,21,3,'#24323d','#d2b678');
  box(c,x+11,y-84,8,12,1,on?'#f9d78e':'#4a4f54');poly(c,[[x+6,y-87],[x+15,y-95],[x+24,y-87]],'#313d47','#d0b77c');
  if(on){glow(c,x+15,y-77,26,'#ffd3832b');ellipse(c,x+15,y-78,2,4,'#fff3c2');}
}
function timberWindow(c,x,y,w=23,h=29,on=true){
  box(c,x-w/2-3,y-h/2-3,w+6,h+6,4,'#252d38','#c2a87a');box(c,x-w/2,y-h/2,w,h,2,on?'#d1a45d':'#334757');
  if(on){const gradient=c.createLinearGradient(0,y-h/2,0,y+h/2);gradient.addColorStop(0,'#b98141');gradient.addColorStop(.6,'#f5d796');gradient.addColorStop(1,'#9c6f43');c.fillStyle=gradient;c.fillRect(x-w/2,y-h/2,w,h);}
  line(c,x,y-h/2,x,y+h/2,'#3b3030',2);line(c,x-w/2,y,x+w/2,y,'#3b3030',2);box(c,x-w/2-5,y+h/2+2,w+10,5,1,'#8c7c66','#252e38');
}
function drawFallbackBuilding(c,b){
  const x=b.x*TILE,y=(b.z+b.h)*TILE,w=b.w*TILE,hh=Math.min(b.h*TILE*.8,190),roofH=Math.min(115,b.w*15),kind=buildingArtKind(b);
  const color={bakery:'#965c3c',inn:'#64516e',magicShop:'#345e65',house:'#5a5d76',clocktower:'#4b586b'}[kind]||'#5a5d76';
  if(b.kind==='castle'){drawCastle(c,b);return;}
  const depth=26,side=28;
  poly(c,[[x,y],[x+w,y],[x+w+42,y+19],[x+38,y+25]],'#07122255');
  poly(c,[[x+w-side,y-hh],[x+w,y-hh-depth],[x+w,y-depth],[x+w-side,y]],'#3a414c','#222b37');
  box(c,x+8,y-hh,w-side-8,hh,2,'#908479','#29323d');
  const shade=c.createLinearGradient(x,0,x+w,0);shade.addColorStop(0,'#d4bd8d1c');shade.addColorStop(.6,'#25334511');shade.addColorStop(1,'#17233355');c.fillStyle=shade;c.fillRect(x+8,y-hh,w-side-8,hh);
  for(let row=0;row<hh/19;row++){const yy=y-hh+row*19;line(c,x+8,yy,x+w-side,yy,'#343c452e');for(let col=0;col<w/44;col++){const xx=x+8+col*44+(row%2?22:0);line(c,xx,yy,xx,yy+19,'#333a4536');}}
  for(const xx of[x+18,x+w-side-12,x+w*.49]){box(c,xx-3,y-hh,6,hh,0,'#493d3b','#a39272');}
  box(c,x+4,y-9,w-side+4,9,1,'#4c4b4b','#c5ad7d');
  const roofY=y-hh;
  poly(c,[[x-14,roofY+10],[x+w*.5,roofY-roofH],[x+w+6,roofY-depth],[x+w-side+8,roofY+13]],color,'#1c2939',3);
  poly(c,[[x+w*.5,roofY-roofH],[x+w+6,roofY-depth],[x+w+11,roofY-depth+13],[x+w*.52,roofY-roofH+11]],'#253344','#a7a08a55');
  // Roof courses follow the roof plane; their highlights establish actual height.
  for(let i=1;i<7;i++){const f=i/7,ax=x-14+(w*.5+14)*f,ay=roofY+10-roofH*f,bx=x+w-side+8+(side-2-w*.5)*f,by=roofY+13-(roofH+depth)*f;line(c,ax,ay,bx,by,'#d4bba233',2);for(let j=1;j<9;j++){const q=j/9;line(c,ax+(bx-ax)*q,ay+(by-ay)*q,ax+(bx-ax)*q-3,ay+(by-ay)*q+9,'#1422334d');}}
  const doorX=(b.door?.x??b.x+b.w/2)*TILE,doorH=Math.min(65,hh*.64);
  box(c,doorX-21,y-doorH,42,doorH,15,'#263341','#c0a574');box(c,doorX-17,y-doorH+4,34,doorH-4,12,'#4d3e3c');
  line(c,doorX,y-doorH+7,doorX,y,'#c0a574');ellipse(c,doorX+10,y-23,2,2,'#e9cd86');box(c,doorX-28,y+1,56,7,1,'#9c9b8b','#3a4750');
  for(const frac of[.22,.72]){const xx=x+w*frac;if(Math.abs(xx-doorX)>48)timberWindow(c,xx,y-hh*.55,29,35);}
  if(hh>115)for(const frac of[.25,.68])timberWindow(c,x+w*frac,y-hh*.8,22,27);
  if(kind==='bakery'){poly(c,[[x+16,y-58],[x+w*.39,y-58],[x+w*.42,y-40],[x+8,y-40]],'#bc8155','#403b3a');for(let i=0;i<7;i++)poly(c,[[x+16+i*19,y-58],[x+25+i*19,y-58],[x+23+i*20,y-40],[x+10+i*20,y-40]],i%2?'#dfc894':'#8b5e54');}
  if(kind==='clocktower'){const tx=x+w*.5;box(c,tx-35,roofY-roofH-110,70,130,3,'#868675','#273344');poly(c,[[tx-49,roofY-roofH-103],[tx,roofY-roofH-181],[tx+49,roofY-roofH-103]],'#38505e','#d0b67f');clockFace(c,tx,roofY-roofH-58,26,0);}
}
function drawCastle(c,b){
  const x=b.x*TILE,y=(b.z+b.h)*TILE,w=b.w*TILE,h=225;
  poly(c,[[x-24,y],[x+w+12,y],[x+w+57,y+35],[x+4,y+24]],'#07122266');
  box(c,x+56,y-h,w-112,h,2,'#899494','#26394b');
  const wall=c.createLinearGradient(0,y-h,0,y);wall.addColorStop(0,'#9baca6');wall.addColorStop(.5,'#76868d');wall.addColorStop(1,'#526478');c.fillStyle=wall;c.fillRect(x+56,y-h,w-112,h);
  for(let row=0;row<13;row++){const yy=y-h+row*18;line(c,x+56,yy,x+w-56,yy,'#263b514b');for(let col=0;col<w/47;col++){const xx=x+56+col*47+(row%2?23:0);line(c,xx,yy,xx,yy+18,'#263b5144');}}
  for(let i=0;i<Math.floor((w-112)/29);i++){box(c,x+57+i*29,y-h-17,19,25,1,'#a9b3a6','#43566a');box(c,x+59+i*29,y-h-17,15,3,0,'#d6d5b2');}
  const doorX=(b.door?.x||b.x+b.w/2)*TILE;
  box(c,doorX-57,y-135,114,135,54,'#b1ae8c','#303e52');box(c,doorX-47,y-125,94,125,45,'#17283d','#d1b57c');
  for(let i=-3;i<=3;i++)line(c,doorX+i*12,y-88,doorX+i*12,y-7,'#8e8066',3);box(c,doorX-50,y-39,100,5,0,'#b2a37d');
  box(c,doorX-70,y+1,140,10,1,'#b9b8a2','#455269');box(c,doorX-84,y+12,168,10,1,'#939c98','#455269');
  for(const fraction of[.12,.28,.72,.88]){const xx=x+w*fraction;timberWindow(c,xx,y-112,26,48);timberWindow(c,xx,y-183,21,30);}
  for(const fraction of[.05,.5,.95]){
    const tx=x+w*fraction,tw=fraction===.5?108:103,th=fraction===.5?338:275;
    const towerBottom=fraction===.5?y-157:y,towerHeight=towerBottom-y+th;
    box(c,tx-tw/2,y-th,tw,towerHeight,5,'#738b91','#293b51');
    const g=c.createLinearGradient(tx-tw/2,0,tx+tw/2,0);g.addColorStop(0,'#425c70');g.addColorStop(.34,'#a1afa5');g.addColorStop(.63,'#839a9c');g.addColorStop(1,'#40576c');c.fillStyle=g;c.fillRect(tx-tw/2+2,y-th+4,tw-4,towerHeight-6);
    for(let row=0;row<towerHeight/22;row++){line(c,tx-tw/2+2,towerBottom-row*22,tx+tw/2-2,towerBottom-row*22,'#2d435b44');}
    for(const at of[.27,.59,.84])if(y-th*at<towerBottom-24)timberWindow(c,tx,y-th*at,19,37);
    poly(c,[[tx-tw*.75,y-th+4],[tx,y-th-117],[tx+tw*.75,y-th+4]],'#33495f','#c4ba8f',2);
    for(let i=1;i<8;i++)line(c,tx-tw*.75*(1-i/8),y-th+4-121*i/8,tx+tw*.75*(1-i/8),y-th+4-121*i/8,'#8ca29f40');
    line(c,tx,y-th-117,tx,y-th-150,'#d1bc8a',2);poly(c,[[tx+1,y-th-148],[tx+40,y-th-143],[tx+24,y-th-126],[tx+1,y-th-128]],'#ad7a6d','#dec795');
    box(c,tx-tw/2-6,towerBottom-10,tw+12,12,2,'#b9b9a0','#263c51');
  }
  box(c,doorX-42,y-182,84,25,4,'#283d51','#ddc590');text(c,'星灯りの城',doorX,y-169,11,'#f6e5b6');
}
function clockFace(c,x,y,r,time){ellipse(c,x,y,r+4,r+4,'#384654');ellipse(c,x,y,r,r,'#e0d3aa');c.strokeStyle='#574d48';c.lineWidth=2;for(let i=0;i<12;i++){const a=i*TAU/12;line(c,x+Math.sin(a)*r*.79,y-Math.cos(a)*r*.79,x+Math.sin(a)*r*.92,y-Math.cos(a)*r*.92,'#574d48',1.5);}const a=time*.007;line(c,x,y,x+Math.sin(a)*r*.6,y-Math.cos(a)*r*.6,'#344050',2);line(c,x,y,x-r*.4,y-r*.23,'#344050',3);ellipse(c,x,y,3,3,'#574d48');}

function tree(c,x,y,size=140,autumn=false){
  ellipse(c,x+7,y+4,size*.29,size*.1,'#0a1c2b55');line(c,x,y,x+3,y-size*.6,'#514443',size*.09);line(c,x,y-size*.25,x-size*.21,y-size*.52,'#5e4d43',size*.035);
  const colors=autumn?['#805653','#a36c4c','#c29156','#bf7c50']:['#304a49','#3b5651','#57664e','#5e7557'];
  for(let i=0;i<12;i++){const a=i*2.3999,r=(i%4)*size*.07;ellipse(c,x+Math.cos(a)*r,y-size*.61+Math.sin(a)*r*.55,size*(.17+(i%3)*.03),size*(.2+(i%2)*.03),colors[i%4]);}
  for(let i=0;i<19;i++){const a=i*2.3999,r=seed(i,size)*size*.26;ellipse(c,x+Math.cos(a)*r,y-size*.64+Math.sin(a)*r*.6,2,1.4,autumn?'#e6c0877a':'#a6ba8270');}
}
function fountain(c,x,y,size=100,pool=false,time=0,motion=true){
  ellipse(c,x+8,y+9,size*.54,size*.25,'#0b1a2c55');ellipse(c,x,y,size*.51,size*.25,'#a7a38b');ellipse(c,x,y-5,size*.44,size*.2,'#283f50');ellipse(c,x,y-7,size*.41,size*.17,'#467385');
  c.save();c.beginPath();c.ellipse(x,y-7,size*.41,size*.17,0,0,TAU);c.clip();for(let i=0;i<5;i++){const age=((motion?time*.23:0)+i/5)%1;c.strokeStyle=`rgba(192,223,205,${(1-age)*.4})`;c.lineWidth=1;c.beginPath();c.ellipse(x,y-7,size*.41*age,size*.17*age,0,0,TAU);c.stroke();}c.restore();
  if(!pool){box(c,x-8,y-size*.59,16,size*.54,4,'#8caaa3','#4a6370');ellipse(c,x,y-size*.6,size*.22,size*.075,'#bac4ac');ellipse(c,x,y-size*.62,size*.16,size*.04,'#507b85');for(const s of[-1,1]){c.strokeStyle='#b3dfd6b0';c.lineWidth=2;c.beginPath();c.moveTo(x+s*7,y-size*.65);c.quadraticCurveTo(x+s*size*.36,y-size*.75,x+s*size*.34,y-size*.08);c.stroke();}}
}

/** The fictional town cast has its own wardrobe. Real creators are supplied as approved sprite actors. */
function drawResident(c,n,time=0){
  const x=n.x*TILE,y=n.z*TILE,appearance=n.appearance||'keeper';
  if(appearance==='cat'){ellipse(c,x,y+1,15,4,'#09172477');ellipse(c,x,y-9,11,8,'#26333e');ellipse(c,x+9,y-17,8,8,'#29333f');poly(c,[[x+3,y-22],[x+4,y-32],[x+10,y-25],[x+17,y-32],[x+17,y-20]],'#29333f');line(c,x-9,y-9,x-22,y-20,'#29333f',4);for(const dx of[6,13])ellipse(c,x+dx,y-17,1.3,2,'#d8b66a');return;}
  const palette={keeper:['#426971','#bc9870','#5c473a'],baker:['#b48a6a','#e6d6b3','#795640'],sailor:['#577486','#b5bca6','#4d4945'],gardener:['#5d7259','#c1b47b','#695247'],maskmaker:['#8d6586','#d7bc8b','#57413e'],merchant:['#727181','#bca365','#4b3d3d'],clocksmith:['#6c6560','#ac9f7b','#b3ada0'],archivist:['#6d6387','#b7ab9a','#60483b'],innkeeper:['#867052','#dcc6a2','#60433c']}[appearance]||['#547177','#c4b78d','#624a40'];
  ellipse(c,x,y+2,14,5,'#09172477');
  // Feet, trousers, layered coat, hands and head use stable bones. No whole-body bob or squash.
  box(c,x-10,y-17,8,15,3,'#384050');box(c,x+3,y-17,8,15,3,'#384050');box(c,x-12,y-5,11,6,2,'#2d3038','#716854');box(c,x+2,y-5,11,6,2,'#2d3038','#716854');
  const coat=c.createLinearGradient(x-18,0,x+18,0);coat.addColorStop(0,palette[0]);coat.addColorStop(.5,palette[0]);coat.addColorStop(1,'#303d4b');
  poly(c,[[x-12,y-52],[x+11,y-52],[x+18,y-21],[x-18,y-21]],coat,'#24343f',1.5);
  line(c,x-11,y-46,x-19,y-31,palette[0],8);line(c,x+11,y-46,x+19,y-31,palette[0],8);ellipse(c,x-19,y-29,4,5,'#c9a483');ellipse(c,x+19,y-29,4,5,'#d8b78e');
  poly(c,[[x-6,y-52],[x,y-45],[x+7,y-52],[x+5,y-36],[x-5,y-36]],palette[1]);line(c,x,y-42,x,y-22,'#c5ae7f',1);for(const dy of[33,26])ellipse(c,x+3,y-dy,1,1,'#e3c997');
  ellipse(c,x,y-62,13,16,palette[2]);ellipse(c,x,y-58,10,12,'#d9b78e');poly(c,[[x-12,y-65],[x-8,y-77],[x+7,y-77],[x+13,y-63],[x+2,y-69],[x-3,y-64]],palette[2]);
  line(c,x-5,y-60,x-2,y-60,'#38404a',1.5);line(c,x+3,y-60,x+6,y-60,'#38404a',1.5);line(c,x-2,y-53,x+2,y-53,'#9c6d64');
  if(['keeper','sailor','gardener','baker','clocksmith'].includes(appearance)){ellipse(c,x,y-74,appearance==='gardener'?21:16,4,palette[1]);box(c,x-12,y-84,24,10,4,palette[0],palette[1]);}
  if(appearance==='baker'||appearance==='innkeeper'){poly(c,[[x-8,y-42],[x+8,y-42],[x+12,y-21],[x-12,y-21]],'#d1c7aa','#6d7165');}
  if(appearance==='maskmaker'){ellipse(c,x+17,y-41,6,9,'#e4cf9c');ellipse(c,x+15,y-43,1.5,2,'#58494a');ellipse(c,x+19,y-43,1.5,2,'#58494a');}
  if(appearance==='clocksmith'||appearance==='archivist'){for(const dx of[-4,5]){c.strokeStyle='#d2c6a5';c.lineWidth=1;c.beginPath();c.arc(x+dx,y-60,4,0,TAU);c.stroke();}}
}

export function createTownRenderer({makeCanvas=defaultCanvas,art={images:{},version:0},loadImage=loadArtImage,fetcher=globalThis.fetch}={}){
  const scene={images:{},frames:null,residentFrames:null,version:0,failures:[],loaded:[]},chunks=new Map(),shade=makeCanvas(1,1),sceneSnapshot=makeCanvas(1,1);
  let camera=null,lastMap=null,lastView=null,lastSignature='',destroyed=false,hitItems=[],lastSurface=null,snapshotBattle=null;
  const alphaMasks=new WeakMap(),alphaCanvas=makeCanvas(1,1);
  async function image(key,file){try{const im=await loadImage(new URL(file,import.meta.url).href,{timeout:14000});if(!destroyed){scene.images[key]=im;scene.loaded.push(key);scene.version++;chunks.clear();}return im;}catch{if(!destroyed)scene.failures.push(key);return null;}}
  const ready=(async()=>{
    let manifest=null;try{if(fetcher){const response=await fetcher(new URL('./assets/props-manifest.json',import.meta.url));if(response.ok)manifest=await response.json();}}catch{}
    let residents=null;try{if(fetcher){const response=await fetcher(new URL('./assets/residents-manifest.json',import.meta.url));if(response.ok)residents=await response.json();}}catch{}
    if(manifest?.sprites)scene.frames=manifest.sprites;
    if(residents?.sprites)scene.residentFrames=residents.sprites;
    await Promise.all([image('props','./assets/'+(manifest?.file||'props-atlas.webp')),image('cobbles','./assets/cobblestone-dark.webp'),image('soil','./assets/stonepath-warm.webp'),image('residents','./assets/'+(residents?.file||'residents-atlas.webp'))]);
    return {loaded:[...scene.loaded],failures:[...scene.failures]};
  })();
  let interiorReady=null;
  function ensureInterior(){return interiorReady??=Promise.all([image('palace','../maze/assets/rpg/palace/props-atlas.webp'),image('parquet','../maze/assets/rpg/palace/parquet.webp'),image('wall','../maze/assets/rpg/palace/wainscot-wall.webp'),image('carpet','../maze/assets/rpg/palace/carpet.webp')]);}
  function prop(kind){return townPropSprite(scene.images.props,kind,scene.frames);}
  function drawProp(c,kind,x,y,height,options={}){return drawArtSprite(c,prop(kind),x,y,height,{...options,alpha:(options.alpha??1)*c.globalAlpha});}
  function spriteBox(sprite,x,y,height){const im=sprite.image||sprite,f=sprite.frame||[0,0,im.width,im.height],hh=height*f[3]/(sprite.contentHeight||f[3]),ww=hh*f[2]/f[3];return{x:x-ww*(sprite.anchorX??.5),y:y-hh*(sprite.anchorY??1),w:ww,h:hh,sprite};}
  function opaqueAt(item,x,y){
    const sprite=item.sprite,im=sprite.image||sprite,f=sprite.frame||[0,0,im.width,im.height],key=f.join(',');let masks=alphaMasks.get(im);if(!masks){masks=new Map();alphaMasks.set(im,masks);}let data=masks.get(key);
    if(!data){try{alphaCanvas.width=Math.ceil(f[2]);alphaCanvas.height=Math.ceil(f[3]);const ac=alphaCanvas.getContext('2d');ac.clearRect(0,0,alphaCanvas.width,alphaCanvas.height);ac.drawImage(im,...f,0,0,alphaCanvas.width,alphaCanvas.height);data=ac.getImageData(0,0,alphaCanvas.width,alphaCanvas.height);masks.set(key,data);while(masks.size>4)masks.delete(masks.keys().next().value);}catch{return true;}}
    const xx=clamp(Math.floor((x-item.x)/item.w*data.width),0,data.width-1),yy=clamp(Math.floor((y-item.y)/item.h*data.height),0,data.height-1);return data.data[(yy*data.width+xx)*4+3]>55;
  }
  function visibleFromPlayer(map,from,to){const count=Math.ceil(Math.hypot(from.x-to.x,from.z-to.z)*3);for(let i=1;i<count;i++){const f=i/count,tile=map.tiles[Math.floor(from.z+(to.z-from.z)*f)]?.[Math.floor(from.x+(to.x-from.x)*f)];if(tile==='b'||tile==='#')return false;}return true;}

  function groundTile(c,map,x,z){
    const tile=map.tiles[z]?.[x],px=x*TILE,py=z*TILE,r=seed(x,z),isInterior=map.id!=='lantern-town';
    if(tile==='~'){
      c.fillStyle='#183d4c';c.fillRect(px,py,TILE,TILE);const g=c.createLinearGradient(px,py,px+TILE,py);g.addColorStop(0,'#0d253cc9');g.addColorStop(.35,'#214c59');g.addColorStop(.72,'#1d4857');g.addColorStop(1,'#0d253caa');c.fillStyle=g;c.fillRect(px,py,TILE,TILE);return;
    }
    if(isInterior){
      c.fillStyle=tile==='#'?'#29313e':'#7a6956';c.fillRect(px,py,TILE,TILE);
      if(scene.images.parquet&&tile!=='#')c.drawImage(scene.images.parquet,(x%4)*110,(z%4)*110,110,110,px,py,TILE,TILE);
      if(tile!=='#'){for(let i=0;i<4;i++)line(c,px,py+i*16,px+TILE,py+i*16,'#281f273b');line(c,px+((z%2)*22+15),py,px+((z%2)*22+15),py+TILE,'#2c263236');}
      return;
    }
    const road='.=p'.includes(tile),grass='gf#'.includes(tile),bridgeCell=(xx,zz)=>map.id==='lantern-town'&&xx>=30&&xx<=33&&zz>=6&&zz<47&&'.=p'.includes(map.tiles[zz]?.[xx]||'?'),bridge=tile==='='||bridgeCell(x,z);
    c.fillStyle=road?'#65646b':tile==='b'?'#465052':'#425c45';c.fillRect(px,py,TILE,TILE);
    if(road&&scene.images.cobbles){const im=scene.images.cobbles,ss=im.width/4;c.drawImage(im,(x%4)*ss,(z%4)*ss,ss,ss,px,py,TILE,TILE);c.fillStyle=tile==='p'?'#caa87514':'#242d3a14';c.fillRect(px,py,TILE,TILE);}
    else if(road){for(let row=0;row<5;row++){for(let col=-1;col<5;col++){const xx=px+col*18+(row%2)*9,yy=py+row*13;box(c,xx+1,yy+1,16,11,2,['#5b6069','#6c6c72','#78767a','#626772'][Math.floor(seed(x*5+col,z*5+row)*4)],'#3f46533d');line(c,xx+3,yy+2,xx+14,yy+2,'#cac7b02b');}}}
    if(bridge){
      c.fillStyle='#88918b88';c.fillRect(px,py,TILE,TILE);for(let i=0;i<4;i++)line(c,px,py+i*16,px+TILE,py+i*16,'#37495899');
      if(!bridgeCell(x,z-1)){box(c,px,py-5,TILE,10,1,'#a6aa98','#364b5b');for(let i=0;i<4;i++)box(c,px+i*20,py-22,6,22,1,'#7c8c8a','#b6b69b');}
      if(!bridgeCell(x,z+1)){box(c,px,py+TILE-5,TILE,10,1,'#a6aa98','#364b5b');for(let i=0;i<4;i++)box(c,px+i*20,py+TILE-22,6,22,1,'#7c8c8a','#b6b69b');}
    }
    if(grass){
      if(scene.images.soil){c.save();c.globalAlpha=.11;const im=scene.images.soil,ss=im.width/4;c.drawImage(im,(x%4)*ss,(z%4)*ss,ss,ss,px,py,TILE,TILE);c.restore();}
      for(let i=0;i<13;i++){const gx=px+seed(x*19+i,z)*TILE,gy=py+seed(x,z*23+i)*TILE;ellipse(c,gx,gy,3+seed(i,z)*5,1+seed(x,i)*3,i%2?'#75916a1d':'#192f392b');line(c,gx,gy,gx+2,gy-3-(i%3),'#a0ad6d45');}
      if(tile==='f')for(let i=0;i<12;i++){const gx=px+seed(x*13+i,z)*TILE,gy=py+seed(x,z*17+i)*TILE;line(c,gx,gy,gx+1,gy-4,'#687f60',1);ellipse(c,gx,gy-4,2.4,1.5,['#c29d95','#d4c2a4','#aaa1b3'][i%3]);}
      if(tile==='#'){c.fillStyle='#14233350';c.fillRect(px,py,TILE,TILE);}
    }
    if(tile!=='~')for(const [dx,dz]of[[-1,0],[1,0],[0,-1],[0,1]]){
      const neighbor=map.tiles[z+dz]?.[x+dx];
      if(road&&neighbor&&'gf'.includes(neighbor)){const xx=px+(dx===1?TILE-5:0),yy=py+(dz===1?TILE-5:0);c.fillStyle='#d2c6a54d';c.fillRect(xx,yy,dx?5:TILE,dz?5:TILE);line(c,xx,yy,xx+(dx?0:TILE),yy+(dz?0:TILE),'#273c4855',1);}
      if(neighbor==='~'){const xx=px+(dx===1?TILE-9:0),yy=py+(dz===1?TILE-9:0);box(c,xx,yy,dx?9:TILE,dz?9:TILE,1,'#959f91','#344e60');for(let i=0;i<4;i++){const ox=dx?0:i*17,oz=dz?0:i*17;line(c,xx+ox,yy+oz,xx+ox+(dx?9:0),yy+oz+(dz?9:0),'#40576a',1);}}
    }
    if(tile==='p'&&x===27&&z===21){c.strokeStyle='#c6b18088';c.lineWidth=2;for(const radius of[24,19]){c.beginPath();c.ellipse(px+TILE/2,py+TILE/2,radius,radius,0,0,TAU);c.stroke();}poly(c,Array.from({length:10},(_,i)=>{const a=i*TAU/10-Math.PI/2,r=i%2?9:19;return[px+32+Math.cos(a)*r,py+32+Math.sin(a)*r];}),'#c6b18066');}
  }
  function chunk(map,cx,cz){
    const key=`${map.id}:${cx}:${cz}:${scene.version}`;if(chunks.has(key)){const cv=chunks.get(key);chunks.delete(key);chunks.set(key,cv);return cv;}
    const count=TOWN_BUDGET.chunkTiles,cv=makeCanvas(count*TILE,count*TILE),c=cv.getContext('2d');
    for(let z=0;z<count;z++)for(let x=0;x<count;x++){const tx=cx*count+x,tz=cz*count+z;if(tx>=map.width||tz>=map.height)continue;c.save();c.translate(-cx*count*TILE,-cz*count*TILE);groundTile(c,map,tx,tz);c.restore();}
    chunks.set(key,cv);while(chunks.size>TOWN_BUDGET.residentChunks)chunks.delete(chunks.keys().next().value);return cv;
  }
  function water(c,map,bounds,time,motion){
    const clock=motion?time:0;
    for(let z=bounds.top;z<=bounds.bottom;z++)for(let x=bounds.left;x<=bounds.right;x++)if(map.tiles[z]?.[x]==='~'){
      const px=x*TILE,py=z*TILE;c.save();c.beginPath();c.rect(px,py,TILE,TILE);c.clip();
      for(let i=0;i<7;i++){const xx=px+seed(x*11+i,z)*TILE,yy=py+((i*12+clock*8+seed(x,z)*15)%TILE),length=5+seed(x*3+i,z)*18;line(c,xx,yy,xx+length,yy,'#b5d0bd35',.8);}
      // Building and lantern reflections remain anchored while only the water distorts them.
      const reflect=(Math.sin(clock*.7+z*.6)+1)*.5;for(let i=0;i<5;i++){const yy=py+i*14,xx=px+TILE*.55+Math.sin(clock*1.2+i+z)*5;line(c,xx-3-i*.5,yy,xx+8,yy,'#d9b276'+(Math.round(20+reflect*20).toString(16)),2);}
      c.restore();
    }
  }
  function floorDetails(c,map,bounds){
    if(map.id!=='lantern-town'){
      const x=7*TILE,y=7.6*TILE,w=6*TILE,h=7.2*TILE;
      box(c,x,y,w,h,6,map.id==='inn'?'#6f414d':'#344c62','#c1ab76');
      if(scene.images.carpet){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.drawImage(scene.images.carpet,x,y,w,h);if(map.id==='inn'){c.fillStyle='#6b354748';c.fillRect(x,y,w,h);}c.restore();}
      for(const inset of[7,13]){c.strokeStyle='#ceb98788';c.lineWidth=2;c.strokeRect(x+inset,y+inset,w-inset*2,h-inset*2);}
      if(!scene.images.carpet)for(let i=0;i<10;i++){poly(c,[[x+w*.5,y+20+i*39],[x+w*.5+8,y+28+i*39],[x+w*.5,y+36+i*39],[x+w*.5-8,y+28+i*39]],'#d1b8806e');}
    }
  }
  function scenery(map){
    const objects=[];
    for(const b of map.buildings||[]){
      objects.push({kind:'building',x:(b.x+b.w/2)*TILE,y:(b.z+b.h)*TILE,depth:(b.z+b.h)*TILE,data:b});
      if(b.kind!=='castle')for(const side of[.08,.91])objects.push({kind:'flowerbed',x:(b.x+b.w*side)*TILE,y:(b.z+b.h-.04)*TILE,depth:(b.z+b.h)*TILE+1,data:{size:Math.min(64,b.w*12)}});
    }
    for(const d of map.decorations||[])objects.push({kind:d.kind,x:d.x*TILE,y:d.z*TILE,depth:d.z*TILE,data:d});
    if(map.id==='lantern-town'&&!map.decorations?.length){
      const trees=[[3,4,1],[10,4,0],[3,24,1],[11,26,0],[4,40,1],[10,43,0],[19,32,1],[23,37,0],[40,6,1],[40,15,0],[58,7,1],[60,28,0],[60,44,1],[44,34,0],[58,33,0],[43,43,1],[18,44,1],[24,44,0]];
      for(const[x,z,autumn]of trees)objects.push({kind:autumn?'autumnTree':'tree',x:(x+.5)*TILE,y:(z+.5)*TILE,depth:(z+.5)*TILE,data:{size:140+seed(x,z)*35}});
      for(const[x,z]of[[28,8],[35,8],[16,13],[24,13],[13,26],[35,26],[48,15],[46,38],[58,38],[29,43],[35,43]])objects.push({kind:'lamp',x:(x+.5)*TILE,y:(z+.5)*TILE,depth:(z+.5)*TILE,data:{}});
      for(const[x,z]of[[18,11],[23,11],[7,22],[9,22]])objects.push({kind:'market',x:(x+.5)*TILE,y:(z+.5)*TILE,depth:(z+.5)*TILE,data:{size:120}});
    }
    if(map.id!=='lantern-town'){
      for(const item of map.furniture||[])objects.push({kind:'furniture',x:(item.x+item.w/2)*TILE,y:(item.z+item.h)*TILE,depth:(item.z+item.h)*TILE,data:item});
      objects.push({kind:'interior-wall',x:map.width*TILE/2,y:1.4*TILE,depth:1.4*TILE,data:map});
      for(const x of[3.5,16.5])objects.push({kind:'lamp',x:x*TILE,y:9.2*TILE,depth:9.2*TILE,data:{}});
    }
    for(const t of map.targets||[])if(!['exit','star'].includes(t.kind))objects.push({kind:'target',x:t.x*TILE,y:t.z*TILE,depth:t.z*TILE,data:t});
    return objects;
  }
  function drawFurniture(c,o){
    const item=o.data,w=(item.w||3)*TILE,h=(item.h||3)*TILE,xx=o.x-w/2,yy=o.y;
    const key=item.kind==='bookshelf'?'cabinet':item.kind==='bed'?'chaise':'writingDesk',frame=PALACE_ART[key];
    if(scene.images.palace&&frame){drawArtSprite(c,{image:scene.images.palace,frame,anchorX:.5,anchorY:.95},o.x,yy,Math.min(h+60,280));return;}
    box(c,xx,yy-h,w,h,3,'#5b4640','#b29367');
    if(item.kind==='bookshelf'){for(let row=0;row<5;row++){box(c,xx+7,yy-h+10+row*50,w-14,43,1,'#332f36');for(let col=0;col<14;col++){const bh=25+seed(row,col)*15;box(c,xx+10+col*(w-20)/14,yy-h+50+row*50-bh,9,bh,1,['#7b6268','#617c75','#a18b68','#6f708e'][col%4]);}box(c,xx+4,yy-h+51+row*50,w-8,5,0,'#b2976a');}}
    else if(item.kind==='bed'){box(c,xx+10,yy-h+15,w-20,h-27,8,'#c5bd9d','#e1d0ac');box(c,xx+15,yy-h+20,w-30,48,8,'#ece2c5');box(c,xx+12,yy-h+80,w-24,h-94,7,'#866b87','#c8b387');}
    else{box(c,xx-5,yy-h+25,w+10,h*.55,3,'#9f8862','#d0b77e');for(let i=0;i<5;i++){box(c,xx+12+i*29,yy-h+38,18,15,3,'#8b6e5b','#c9bb96');}box(c,xx+7,yy-h*.35,w-14,h*.35,1,'#634b40','#bda16b');}
  }
  function drawTarget(c,t,time,motion,state){
    const x=t.x*TILE,y=t.z*TILE,on=state.flags?.lamps?.includes(t.id);
    if(t.kind==='lantern'){c.save();if(!on)c.filter='grayscale(1) brightness(.68)';if(!drawProp(c,'lamp',x,y,102))lamp(c,x,y,!!on,time);c.restore();return;}
    if(t.kind==='fountain'||t.kind==='pool'){if(!drawProp(c,'fountain',x,y,t.kind==='pool'?114:160))fountain(c,x,y,t.kind==='pool'?105:132,t.kind==='pool',time,motion);else{c.save();c.globalAlpha=.6;fountain(c,x,y,36,true,time,motion);c.restore();}return;}
    if(t.kind==='bench'){if(!drawProp(c,'bench',x,y,55)){box(c,x-35,y-36,70,17,2,'#7f6854','#c0a781');box(c,x-35,y-14,70,10,2,'#8e7558','#c0a781');line(c,x-26,y-4,x-26,y+6,'#33434b',4);line(c,x+26,y-4,x+26,y+6,'#33434b',4);}return;}
    if(t.kind==='sluice'){box(c,x-30,y-54,60,52,2,'#697b7e','#a2b39c');for(let i=0;i<5;i++)box(c,x-24+i*11,y-46,5,42,1,'#273c4d','#81968b');clockFace(c,x,y-50,16,0);return;}
    if(t.kind==='clock'){box(c,x-66,y-175,132,178,12,'#726954','#b4ab84');clockFace(c,x,y-121,47,state.flags?.clockVictory?time:0);box(c,x-26,y-66,52,62,15,'#243742','#ac956b');line(c,x,y-58,x+Math.sin(motion?time:0)*13,y-12,'#bea976',3);ellipse(c,x+Math.sin(motion?time:0)*13,y-12,12,12,'#c7b383');return;}
    if(t.kind==='console'){box(c,x-61,y-52,122,47,4,'#68574d','#c4ac7e');for(let i=0;i<3;i++){ellipse(c,x+(i-1)*36,y-39,12,7,['#9d727d','#7aaba4','#c5b276'][i]);ellipse(c,x+(i-1)*36,y-40,6,4,['#c6929b','#abdcce','#f2d89b'][i]);}return;}
    if(t.kind==='book'){box(c,x-28,y-37,56,34,3,'#443e47','#c5ac7d');poly(c,[[x-25,y-40],[x-2,y-43],[x,y-17],[x-24,y-19]],'#c5b99c','#604d43');poly(c,[[x+25,y-40],[x+2,y-43],[x,y-17],[x+24,y-19]],'#dfd0ac','#604d43');for(let i=0;i<4;i++){line(c,x-20,y-35+i*4,x-6,y-37+i*4,'#716454',1);line(c,x+6,y-37+i*4,x+20,y-35+i*4,'#716454',1);}return;}
  }
  function drawObject(c,o,player,time,motion,state){
    const{x,y}=o;
    if(o.kind==='building'){
      const b=o.data,kind=buildingArtKind(b),sp=prop(kind),height=sp?b.w*TILE*.96*sp.contentHeight/sp.contentWidth:b.w*TILE*.75;
      // Tall foreground architecture fades only when it actually covers the player.
      const overlaps=y>player.y&&(y-player.y)*TOWN_DEPTH_SCALE<Math.max(160,height)&&Math.abs(x-player.x)<b.w*TILE*.45;
      c.save();if(overlaps)c.globalAlpha=.18;
      if(b.kind==='castle'&&prop('gate')){
        const left=b.x*TILE,base=(b.z+b.h)*TILE,width=b.w*TILE;
        // One continuous stone rampart joins the painted towers and ornate portal.
        poly(c,[[left+25,base],[left+width-15,base],[left+width+36,base+27],[left+48,base+27]],'#081a2c66');
        box(c,left+35,base-162,width-70,164,2,'#5d6972','#c1b483');
        if(scene.images.cobbles){c.save();c.beginPath();c.rect(left+36,base-158,width-72,158);c.clip();c.globalAlpha=.59;for(let xx=left+35;xx<left+width-35;xx+=128)c.drawImage(scene.images.cobbles,xx,base-162,128,164);c.restore();}
        box(c,left+29,base-167,width-58,13,2,'#aaa58c','#d4c391');box(c,left+30,base-12,width-60,14,2,'#9d9d88','#d0bd8d');
        for(let i=0;i<Math.floor((width-70)/31);i++)box(c,left+37+i*31,base-183,20,23,2,'#92998c','#cbbd91');
        for(const fraction of[.25,.75]){drawProp(c,'inn',left+width*fraction,base-91,248);}
        for(const fraction of[.085,.915]){drawProp(c,'clocktower',left+width*fraction,base+1,393);}
        drawProp(c,'gate',(b.door?.x??b.x+b.w/2)*TILE,base+7,252);
        for(const fraction of[.36,.64]){drawProp(c,'statue',left+width*fraction,base+8,111);glow(c,left+width*fraction,base-42,49,'#f2c97522');}
        box(c,(b.door?.x??b.x+b.w/2)*TILE-84,base+11,168,9,1,'#b4b09a','#e2cc9b');
      }else if(!prop(kind))drawFallbackBuilding(c,b);
      else{poly(c,[[x-b.w*TILE*.42,y-8],[x+b.w*TILE*.4,y-8],[x+b.w*TILE*.53,y+20],[x-b.w*TILE*.3,y+28]],'#0a1c2d58');drawProp(c,kind,x,y,Math.max(150,height));}
      c.restore();return;
    }
    if(o.kind==='tree'||o.kind==='autumnTree'){
      const height=o.data.size||156,overlaps=y>player.y&&(y-player.y)*TOWN_DEPTH_SCALE<height&&Math.abs(x-player.x)<height*.32;c.save();if(overlaps)c.globalAlpha=.35;
      if(!drawProp(c,o.kind,x,y,height))tree(c,x,y,height,o.kind==='autumnTree');c.restore();return;
    }
    if(o.kind==='lamp'){if(!drawProp(c,'lamp',x,y,98))lamp(c,x,y,true,time);return;}
    if(o.kind==='market'){if(!drawProp(c,'market',x,y,o.data.size||124)){box(c,x-45,y-39,90,35,2,'#7c6550','#c6ad80');poly(c,[[x-52,y-42],[x-36,y-87],[x+36,y-87],[x+52,y-42]],'#9c7966','#d5bd91');for(let i=0;i<6;i++)line(c,x-43+i*17,y-44,x-30+i*12,y-85,i%2?'#d0ad89':'#6c5f68',9);line(c,x-41,y-4,x-41,y-44,'#4b4140',4);line(c,x+41,y-4,x+41,y-44,'#4b4140',4);}return;}
    if(o.kind==='interior-wall'){
      const map=o.data,w=(map.width-2)*TILE,xx=TILE,yy=1.4*TILE;box(c,xx,yy-135,w,138,2,'#6d7370','#c0ad80');
      if(scene.images.wall)c.drawImage(scene.images.wall,xx,yy-135,w,138);
      for(const wx of[5,10,15])timberWindow(c,wx*TILE,yy-64,40,61);
      box(c,xx-4,yy+1,w+8,10,1,'#352e32','#c3aa78');return;
    }
    if(o.kind==='furniture'){drawFurniture(c,o);return;}
    if(o.kind==='target'){drawTarget(c,o.data,time,motion,state);return;}
    if(TOWN_PROP_CELLS[o.kind]!==undefined)drawProp(c,o.kind,x,y,o.data.size||90);
  }

  function render({canvas,state,time=0,dt=.016,motion=true,pixelRatio=1,walking=false,walkPhase=0,facing=state?.facing||'down',brightness=75,lantern=true,creatorActors=[]}={}){
    if(destroyed||!canvas||!state?.position)return false;
    const ratio=clamp(pixelRatio||1,1,2),w=canvas.width/ratio,h=canvas.height/ratio,map=getTownMap(state.mapId),interior=map.id!=='lantern-town';
    if(interior)ensureInterior();
    const tile=w<550?52:w<900?61:70,scale=tile/TILE,target=townCameraTarget(state.position,map,w,h/TOWN_DEPTH_SCALE,tile);
    const switched=lastMap!==map.id;camera=followTownCamera(switched?null:camera,target,dt,{snap:!motion});lastMap=map.id;
    const cameraMoving=Math.hypot(camera.x-target.x,camera.y-target.y)>.03;
    const signature=[map.id,canvas.width,canvas.height,state.position.x,state.position.z,state.revision||0,JSON.stringify(state.flags||{}),state.battle?.phase,Math.floor(walkPhase*30),walking,facing,scene.version,art.version,brightness,lantern,motion?Math.floor(time*30):0,creatorActors.map(a=>[a.x,a.z,a.facing,a.sprite?.frame?.join(',')].join(':')).join(';')].join('|');
    if(!cameraMoving&&!switched&&lastSignature===signature)return false;lastSignature=signature;
    const c=canvas.getContext('2d');if(!c)return false;
    lastView={camera:{...camera},width:w,height:h,scale,map,pixelRatio:ratio,depthScale:TOWN_DEPTH_SCALE};hitItems=[];
    c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);c.fillStyle='#162536';c.fillRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    const bounds=townVisibleBounds(camera,w,h,scale,map,3,TOWN_DEPTH_SCALE),count=TOWN_BUDGET.chunkTiles;
    c.save();c.translate(w/2,h/2);c.scale(scale,scale*TOWN_DEPTH_SCALE);c.translate(-camera.x,-camera.y);
    for(let cz=Math.floor(bounds.top/count);cz<=Math.floor(bounds.bottom/count);cz++)for(let cx=Math.floor(bounds.left/count);cx<=Math.floor(bounds.right/count);cx++)c.drawImage(chunk(map,cx,cz),cx*count*TILE,cz*count*TILE);
    water(c,map,bounds,time,motion);floorDetails(c,map,bounds);
    const player={x:state.position.x*TILE,y:state.position.z*TILE};
    const addSpriteHit=(sprite,x,y,height,extra={})=>{if(!sprite)return;const bounds=spriteBox(sprite,x,y,height),foot=townWorldToScreen({x:x/TILE,z:y/TILE},camera,w,h,scale,TOWN_DEPTH_SCALE);hitItems.push({...bounds,x:foot.x+(bounds.x-x)*scale,y:foot.y+(bounds.y-y)*scale,w:bounds.w*scale,h:bounds.h*scale,kind:'occluder',...extra});};
    const objects=scenery(map),nameTags=[],namedGroups=new Set();for(const n of map.npcs||[])objects.push({kind:'resident',x:n.x*TILE,y:n.z*TILE,depth:n.z*TILE,data:n});
    for(const actor of creatorActors)if(actor.sprite)objects.push({kind:'creator',x:actor.x*TILE,y:actor.z*TILE,depth:actor.z*TILE,actor});
    objects.push({kind:'hero',x:player.x,y:player.y,depth:player.y});objects.sort((a,b)=>a.depth-b.depth||a.x-b.x);
    for(const o of objects){
      const radius=o.kind==='building'?Math.max(o.data.w*TILE,o.data.h*TILE):200;
      if(o.x+radius<bounds.left*TILE||o.x-radius>(bounds.right+1)*TILE||o.y+radius<bounds.top*TILE||o.y-radius>(bounds.bottom+1)*TILE)continue;
      c.save();c.translate(o.x,o.y);c.scale(1,1/TOWN_DEPTH_SCALE);c.translate(-o.x,-o.y);
      if(o.kind==='hero'){
        ellipse(c,o.x+2,o.y+2,15,5,'#07152d80');const sprite=playerPose(art,facing,walking&&motion,walkPhase);
        if(sprite){drawArtSprite(c,sprite,o.x,o.y,76);addSpriteHit(sprite,o.x,o.y,76);}
      }else if(o.kind==='creator'){
        ellipse(c,o.x+1,o.y+2,10,3.5,'#07152d80');drawArtSprite(c,o.actor.sprite,o.x,o.y,o.actor.heightPx||54);
        const a=o.actor;if(a.interactive!==false&&visibleFromPlayer(map,state.position,a)){
          addSpriteHit(a.sprite,o.x,o.y,a.heightPx||54,{id:a.id,kind:'visitor',worldX:a.x,worldZ:a.z});
          const group=a.groupId||a.creatorId||a.id,label=a.label||a.name||a.characterName;if(label&&!namedGroups.has(group)&&Math.hypot(a.x-state.position.x,a.z-state.position.z)<5){namedGroups.add(group);nameTags.push({x:o.x,y:o.y+14,label:String(label)});}
        }else addSpriteHit(a.sprite,o.x,o.y,a.heightPx||54);
      }else if(o.kind==='resident'){
        const frame=scene.residentFrames?.[o.data.appearance];
        if(frame&&scene.images.residents){ellipse(c,o.x+2,o.y+2,13,4,'#09172477');const sprite={image:scene.images.residents,...frame};drawArtSprite(c,sprite,o.x,o.y,76*(frame.heightRatio||1));addSpriteHit(sprite,o.x,o.y,76*(frame.heightRatio||1));}
        else drawResident(c,o.data,time);
        hitItems.push({id:o.data.id,worldX:o.data.x,worldZ:o.data.z,kind:'resident'});
      }else{
        drawObject(c,o,player,time,motion,state);
        if(o.kind==='building'&&o.data.kind!=='castle'){
          const b=o.data,sprite=prop(buildingArtKind(b));if(sprite){const height=b.w*TILE*.96*sprite.contentHeight/sprite.contentWidth,covered=o.y>player.y&&(o.y-player.y)*TOWN_DEPTH_SCALE<Math.max(160,height)&&Math.abs(o.x-player.x)<b.w*TILE*.45;if(!covered)addSpriteHit(sprite,o.x,o.y,Math.max(150,height));}
        }else if(o.kind==='tree'||o.kind==='autumnTree'){
          const height=o.data.size||156,covered=o.y>player.y&&(o.y-player.y)*TOWN_DEPTH_SCALE<height&&Math.abs(o.x-player.x)<height*.32;if(!covered)addSpriteHit(prop(o.kind),o.x,o.y,height);
        }
      }
      c.restore();
    }
    // Ground stars are collectible in-world inlays, never floating placeholder icons.
    for(const t of map.targets||[])if(t.kind==='star'&&!state.flags?.stamps?.includes(t.id)){
      const x=t.x*TILE,y=t.z*TILE;ellipse(c,x,y,16,8,'#5c6970');c.strokeStyle='#baa86f';c.lineWidth=1;c.beginPath();c.ellipse(x,y,16,8,0,0,TAU);c.stroke();poly(c,Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,rr=i%2?5:11;return[x+Math.cos(a)*rr,y+Math.sin(a)*rr*.6];}),'#ddc789');
    }
    c.restore();
    // The lighting pass lifts windows and lamps without flattening the facade art.
    const normalized=clamp(Number.isFinite(brightness)?brightness/100:.75,0,1),dark=clamp(.23-(normalized-.75)*.3,.035,.38);
    if(shade.width!==Math.ceil(w)||shade.height!==Math.ceil(h)){shade.width=Math.ceil(w);shade.height=Math.ceil(h);}
    const sc=shade.getContext('2d');sc.setTransform(1,0,0,1,0,0);sc.clearRect(0,0,w,h);sc.fillStyle=`rgba(9,18,39,${dark})`;sc.fillRect(0,0,w,h);
    const lights=[];for(const o of objects)if(o.kind==='lamp'||o.kind==='target'&&o.data.kind==='lantern'&&state.flags?.lamps?.includes(o.data.id))lights.push({x:o.x/TILE,z:o.y/TILE,height:67,r:110});
    for(const b of map.buildings||[])if(b.kind!=='castle')lights.push({x:b.door?.x??b.x+b.w/2,z:b.z+b.h,height:27,r:103});
    if(lantern)lights.push({x:state.position.x+.2,z:state.position.z-.42,height:0,r:155});
    for(const light of lights){const at=townWorldToScreen(light,camera,w,h,scale,TOWN_DEPTH_SCALE),yy=at.y-light.height*scale,r=light.r*scale;if(at.x+r<0||at.x-r>w||yy+r<0||yy-r>h)continue;
      sc.save();sc.globalCompositeOperation='destination-out';const g=sc.createRadialGradient(at.x,yy,0,at.x,yy,r);g.addColorStop(0,'rgba(0,0,0,.75)');g.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=g;sc.fillRect(at.x-r,yy-r,r*2,r*2);sc.restore();
    }
    c.drawImage(shade,0,0,w,h);
    for(const light of lights){const at=townWorldToScreen(light,camera,w,h,scale,TOWN_DEPTH_SCALE);glow(c,at.x,at.y-light.height*scale,light.r*scale*.55,'#eabe6822');}
    const vignette=c.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.27,w*.5,h*.48,Math.max(w,h)*.76);vignette.addColorStop(0,'#10203200');vignette.addColorStop(1,'#09192c55');c.fillStyle=vignette;c.fillRect(0,0,w,h);
    for(const tag of nameTags){const at=townWorldToScreen({x:tag.x/TILE,z:tag.y/TILE},camera,w,h,scale,TOWN_DEPTH_SCALE);if(at.x<15||at.x>w-15||at.y<8||at.y>h-15)continue;c.font='600 10px "Yu Gothic",sans-serif';const ww=Math.min(126,c.measureText(tag.label).width+14);box(c,clamp(at.x-ww/2,5,w-ww-5),at.y-8,ww,17,6,'#152b38eb','#c8b17b88');text(c,tag.label,clamp(at.x,ww/2+5,w-ww/2-5),at.y,10,'#f2e0b4','center',ww-10);}
    if(motion&&!interior){
      // Nearby drifting seed heads move through world space; the camera never bobs.
      c.save();for(let i=0;i<12;i++){const wx=(Math.sin(time*.018+i*9)*.5+.5)*w,wy=((i*67+time*(2+i%3))%(h+30))-15;c.globalAlpha=.12+(i%3)*.08;ellipse(c,wx,wy,1.4,.8,i%2?'#d5c49c':'#b9c6b1');}c.restore();
    }
    lastSurface=canvas;
    return true;
  }

  function drawMap(canvas,state){
    if(!canvas||!state?.position)return;const c=canvas.getContext('2d'),map=getTownMap(state.mapId),w=canvas.width,h=canvas.height,pad=10,scale=Math.min((w-pad*2)/map.width,(h-pad*2)/map.height),ox=(w-map.width*scale)/2,oy=(h-map.height*scale)/2;
    c.clearRect(0,0,w,h);box(c,0,0,w,h,12,'#142332','#9e916c77');
    const colors={'#':'#34464b','g':'#46594f','f':'#7e8167','.':'#9a9584','p':'#afa18b','=':'#c5b88e','~':'#3a7081','b':'#697185','i':'#8e785f'};
    for(let z=0;z<map.height;z++)for(let x=0;x<map.width;x++){c.fillStyle=colors[map.tiles[z][x]]||'#303d4a';c.fillRect(ox+x*scale,oy+z*scale,scale+.3,scale+.3);}
    for(const b of map.buildings||[]){c.strokeStyle='#b5ae8b';c.lineWidth=.7;c.strokeRect(ox+b.x*scale,oy+b.z*scale,b.w*scale,b.h*scale);}
    for(const n of map.npcs||[])ellipse(c,ox+n.x*scale,oy+n.z*scale,1.5,1.5,'#e9c793');
    ellipse(c,ox+state.position.x*scale,oy+state.position.z*scale,4.3,4.3,'#122f3d');ellipse(c,ox+state.position.x*scale,oy+state.position.z*scale,2.8,2.8,'#fff0c4');
  }

  function renderTownBattle({canvas,battle,time=0,effect=null,motion=true,pixelRatio=1}={}){
    if(!canvas||!battle)return;const c=canvas.getContext('2d'),ratio=clamp(pixelRatio||1,1,2),w=canvas.width/ratio,h=canvas.height/ratio;
    if(snapshotBattle!==battle.id&&lastSurface){snapshotBattle=battle.id;sceneSnapshot.width=lastSurface.width;sceneSnapshot.height=lastSurface.height;sceneSnapshot.getContext('2d').drawImage(lastSurface,0,0);}
    c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
    if(sceneSnapshot.width>1)c.drawImage(sceneSnapshot,0,0,w,h);else{c.fillStyle='#253c4c';c.fillRect(0,0,w,h);}
    const veil=c.createLinearGradient(0,0,0,h);veil.addColorStop(0,'#102235e8');veil.addColorStop(.5,'#0b2035a8');veil.addColorStop(1,'#11243ae8');c.fillStyle=veil;c.fillRect(0,0,w,h);
    const floorY=h*.85,heroX=w*.24,enemyX=w*.74,size=Math.min(h*.58,w*.32,255),enemySize=Math.min(h*.65,w*.43,300),enemyId=TOWN_BATTLE_ART_IDS[battle.enemyId]||'ghost';
    const age=effect?Math.max(0,time-(effect.started??time)):100,action=effect?.type||effect?.action||battle.lastAction,attack=['attack','spark','shine','light'].includes(action),lunge=motion&&attack&&age<.48?Math.sin(age/.48*Math.PI)*Math.min(28,w*.055):0;
    // The arena is a stone terrace with converging joints, retaining the town's height cues.
    poly(c,[[0,h*.65],[w,h*.65],[w,h],[0,h]],'#59616a44');for(let i=-4;i<8;i++)line(c,w*.5+i*w*.11,h*.65,w*.5+i*w*.25,h,'#a9b6a32c',1);for(let i=0;i<4;i++)line(c,0,h*.68+i*i*h*.025,w,h*.68+i*i*h*.025,'#a9b6a32c',1);
    ellipse(c,heroX,floorY+5,size*.22,11,'#071827b0');ellipse(c,enemyX,floorY+5,enemySize*.26,14,'#071827b0');
    const hero=playerPose(art,'right',motion&&lunge>0,age*14);if(hero)drawArtSprite(c,hero,heroX+lunge,floorY,size);
    const sprite=monsterSprite(art,enemyId,{time,motion,battle:true,facing:'left'});const victory=battle.phase==='victory';
    if(sprite)drawArtSprite(c,sprite,enemyX,floorY,enemySize,{alpha:victory?.55:1,flip:sprite.flip});
    else{
      // Readable mist silhouette remains while its original atlas decodes.
      glow(c,enemyX,floorY-enemySize*.48,enemySize*.45,'#b2c8da24');for(let i=0;i<5;i++)ellipse(c,enemyX+(i-2)*enemySize*.11,floorY-enemySize*.4-(i%2)*enemySize*.14,enemySize*.19,enemySize*.28,'#92afbd55');
    }
    if(effect&&age<1.3){
      if(action==='guard'){c.strokeStyle='#a8dfd0a0';c.lineWidth=2;c.beginPath();c.ellipse(heroX,floorY-size*.48,size*.33,size*.49,0,0,TAU);c.stroke();}
      if(attack){const progress=clamp((age-.2)/.45,0,1),x=heroX+size*.2+(enemyX-heroX-size*.2)*progress,y=floorY-size*.5-Math.sin(progress*Math.PI)*h*.12;glow(c,x,y,34,'#f4d88d88');ellipse(c,x,y,5,5,'#fff3c5');if(progress===1&&age<1.2){const a=clamp((age-.65)/.55,0,1);c.save();c.globalAlpha=1-a;for(let i=0;i<9;i++){const angle=i*TAU/9,r=20+a*65;line(c,enemyX+Math.cos(angle)*r*.4,floorY-enemySize*.5+Math.sin(angle)*r*.4,enemyX+Math.cos(angle)*r,floorY-enemySize*.5+Math.sin(angle)*r,'#f9dd9e',2);}c.restore();}}
    }
    text(c,battle.enemy?.name||'水鏡の影',w/2,25,w<500?13:18,'#f4dfb5');
    text(c,victory?'祭りの灯りが戻った':`TURN ${battle.turn||1}`,w/2,h-18,13,victory?'#f3d28e':'#c7d6d5');
  }

  const api={ready,render,drawMap,renderTownBattle,
    status:()=>({loaded:[...scene.loaded],failed:[...scene.failures],chunks:chunks.size,artVersion:scene.version}),
    worldToScreen(x,z){return lastView?townWorldToScreen(typeof x==='object'?x:{x,z},lastView.camera,lastView.width,lastView.height,lastView.scale,TOWN_DEPTH_SCALE):null;},
    screenToWorld(x,y){return lastView?townScreenToWorld(typeof x==='object'?x:{x,y},lastView.camera,lastView.width,lastView.height,lastView.scale,TOWN_DEPTH_SCALE):null;},
    pickVisitor(x,y){for(let i=hitItems.length-1;i>=0;i--){const item=hitItems[i];if(!item.sprite||x<item.x||x>item.x+item.w||y<item.y||y>item.y+item.h||!opaqueAt(item,x,y))continue;return item.kind==='visitor'?item.id:null;}return null;},
    pick(x,y){if(!lastView)return null;const p=townScreenToWorld({x,y},lastView.camera,lastView.width,lastView.height,lastView.scale,TOWN_DEPTH_SCALE);return hitItems.filter(n=>Math.hypot((n.worldX??0)-p.x,(n.worldZ??0)-p.z)<.6).sort((a,b)=>Math.hypot(a.worldX-p.x,a.worldZ-p.z)-Math.hypot(b.worldX-p.x,b.worldZ-p.z))[0]?.id||null;},
    invalidate(){lastSignature='';},destroy(){destroyed=true;chunks.clear();hitItems=[];camera=null;lastView=null;renderersByArt.delete(art);},
  };
  renderersByArt.set(art,api);return api;
}

/** Convenience export for a controller that retains its renderer across battle phases. */
export function renderTownBattle(options){return (options?.renderer||renderersByArt.get(options?.art))?.renderTownBattle(options);}
