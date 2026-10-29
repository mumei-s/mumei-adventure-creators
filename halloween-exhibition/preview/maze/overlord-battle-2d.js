import {drawArtSprite,playerPose} from './rpg-art.js?v=20261019-unified1';
import {overlordBattleDirector} from './overlord-battle-director.js?v=20261030-art1';
import {getOverlordIdentityImage} from './overlord-materials.js?v=20261030-art1';

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const TAU=Math.PI*2;
function polygon(c,points,fill,stroke=null,lineWidth=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill,stroke=null,lineWidth=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function radial(c,x,y,r,inner,outer='#120b1900'){const g=c.createRadialGradient(x,y,0,x,y,Math.max(1,r));g.addColorStop(0,inner);g.addColorStop(1,outer);return g;}
function pointedArch(c,x,y,width,height,fill,stroke,lineWidth=1){const left=x-width/2,right=x+width/2,top=y-height;c.beginPath();c.moveTo(left,y);c.lineTo(left,top+height*.39);c.bezierCurveTo(left,top+height*.2,x-width*.18,top+height*.05,x,top);c.bezierCurveTo(x+width*.18,top+height*.05,right,top+height*.2,right,top+height*.39);c.lineTo(right,y);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
function diamond(c,x,y,rx,ry,color){polygon(c,[[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],color);}


// Registration uses the original reference pixels. A single similarity
// transform aligns the two eyes and preserves the source face proportions;
// only the curved outer boundary is feathered into the existing costume art.
export const OVERLORD_2D_FACE_REGISTRATION=Object.freeze({
 sourceEyes:Object.freeze([[584,501],[664,467]].map(Object.freeze)),
 targetEyes:Object.freeze([[562,314],[607,297]].map(Object.freeze)),
 sourceNose:Object.freeze([655,530]),sourceMouth:Object.freeze([657,562]),sourceChin:Object.freeze([660,605]),
});
function identityCanvas(width,height){
 if(typeof globalThis.OffscreenCanvas==='function')return new globalThis.OffscreenCanvas(width,height);
 const canvas=globalThis.document?.createElement?.('canvas');if(canvas){canvas.width=width;canvas.height=height;}return canvas||null;
}
/** Compose once, retaining the original queen's size, alpha, hair and outfit. */
export function composeOverlordIdentityArt(image,reference,{createCanvas=identityCanvas}={}){
 const width=image?.naturalWidth||image?.width,height=image?.naturalHeight||image?.height;
 if(!width||!height||!reference)return image;
 const output=createCanvas(width,height),c=output?.getContext?.('2d');if(!c)return image;
 const sx=width/1024,sy=height/1536,patchWidth=112,patchHeight=130,left=529,top=252;
 const patch=createCanvas(patchWidth,patchHeight),mask=createCanvas(patchWidth,patchHeight),pc=patch?.getContext?.('2d'),mc=mask?.getContext?.('2d');if(!pc||!mc)return image;
 const [[x0,y0],[x1,y1]]=OVERLORD_2D_FACE_REGISTRATION.sourceEyes,[[u0,v0],[u1,v1]]=OVERLORD_2D_FACE_REGISTRATION.targetEyes;
 const dx=x1-x0,dy=y1-y0,du=u1-u0,dv=v1-v0,den=dx*dx+dy*dy,a=(du*dx+dv*dy)/den,b=(dv*dx-du*dy)/den;
 pc.imageSmoothingEnabled=true;pc.imageSmoothingQuality='high';
 pc.setTransform(a,b,-b,a,u0-a*x0+b*y0-left,v0-b*x0-a*y0-top);pc.drawImage(reference,0,0);pc.setTransform(1,0,0,1,0,0);
 // Keep the forehead inside the existing parting and exclude the source hand.
 // The lower curve follows the registered original jaw, down into the neck.
 mc.translate(-left,-top);mc.beginPath();mc.moveTo(553,276);
 mc.bezierCurveTo(562,264,578,259,591,261);mc.bezierCurveTo(608,266,620,285,624,302);
 mc.bezierCurveTo(631,321,627,342,617,358);mc.bezierCurveTo(612,366,608,372,601,373);
 mc.bezierCurveTo(581,372,557,356,546,341);mc.bezierCurveTo(536,326,538,300,553,276);mc.closePath();mc.fillStyle='#fff';mc.fill();
 pc.globalCompositeOperation='destination-in';pc.filter='blur(1.25px)';pc.drawImage(mask,0,0);pc.filter='none';pc.globalCompositeOperation='source-over';
 c.drawImage(image,0,0);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.globalCompositeOperation='source-atop';c.drawImage(patch,left*sx,top*sy,patchWidth*sx,patchHeight*sy);c.globalCompositeOperation='source-over';
 return output;
}
const identityQueens=new WeakMap();let identityReference=null,identityPending=false,identityRetryAt=0;
function identityQueenSprite(sprite){
 const image=sprite?.image||sprite;
 if(!image||!image.width||!image.height||!(typeof globalThis.OffscreenCanvas==='function'||globalThis.document?.createElement))return sprite;
 let registered=identityQueens.get(image);
 if(!registered&&identityReference){registered=composeOverlordIdentityArt(image,identityReference);identityQueens.set(image,registered);}
 if(!identityReference&&!identityPending&&Date.now()>=identityRetryAt){
  identityPending=true;void getOverlordIdentityImage().then(reference=>{identityReference=reference;}).catch(()=>{identityRetryAt=Date.now()+30000;}).finally(()=>{identityPending=false;});
 }
 if(!registered)return sprite;
 return sprite?.image?{...sprite,image:registered}:registered;
}

function mix(a,b,t){
 const parse=value=>value.startsWith('#')?[...[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)),value.length>7?parseInt(value.slice(7,9),16)/255:1]:(value.match(/[\d.]+/g)||[]).map(Number),aa=parse(a),bb=parse(b),p=clamp(t);
 return `rgba(${aa.slice(0,3).map((v,i)=>Math.round(v+(bb[i]-v)*p)).join(',')},${aa[3]+(bb[3]-aa[3])*p})`;
}
function burst(c,x,y,size,power,color){
 if(power<=.001)return;
 for(let i=0;i<8;i++){const a=i*TAU/8+.18,r=size*(.30+power*.70);line(c,[[x+Math.cos(a)*r*.2,y+Math.sin(a)*r*.2],[x+Math.cos(a)*r,y+Math.sin(a)*r]],color,1.2+power);}
 ellipse(c,x,y,size*.17*power,size*.17*power,color);
}
function atmosphere(c,{w,h,queen},cue,clock,motion){
 if(!motion)return;
 const env=cue.environment,count=h<240?14:22;
 for(let i=0;i<count;i++){
  const seed=(i*.61803398875)%1,life=(seed+clock*env.emberSpeed*(.10+(i%3)*.025))%1,x=((i*.381966+Math.sin(clock*.16+i)*.012)%1)*w,y=h*(.92-life*.86),size=(.5+(i%3)*.35)*(1+env.rage*.35);
  ellipse(c,x,y,size,size,mix('#e0b77855','#ff526a99',env.rage));
 }
 if(env.portal>.01){for(let i=0;i<8;i++){const a=i*TAU/8+clock*.17,r=queen.height*(.27+env.portal*.08),x=queen.x+Math.cos(a)*r,y=h*.31+Math.sin(a)*r*.65;diamond(c,x,y,1.2+env.portal*1.2,2.3+env.portal*2,mix('#b3485d66','#ed738bbb',env.portal));}}
}

/** The room gives way to an astral corridor for the attack, then returns.
 * Ribbons and streaks are batched paths: the background moves substantially
 * without a full-screen blur, filter pass or hundreds of individual particles. */
function astralBackdrop(c,{w,h,queen},cue,clock,motion){
 const env=cue.environment,rift=clamp(env.rift||0),stream=motion?clamp(env.stream||0):0,gold=clamp(env.gold||0);
 const cx=queen.x,cy=h*.38,span=Math.max(w,h)*.78;
 if(rift>.001){
  c.fillStyle=`rgba(5,5,21,${rift*.90})`;c.fillRect(0,0,w,h);
  const depth=c.createRadialGradient(cx,cy,2,cx,cy,span);
  depth.addColorStop(0,`rgba(255,87,152,${rift*.50})`);depth.addColorStop(.16,`rgba(131,31,127,${rift*.68})`);depth.addColorStop(.52,`rgba(26,19,73,${rift*.92})`);depth.addColorStop(1,'#05071200');c.fillStyle=depth;c.fillRect(0,0,w,h);
  c.save();c.globalCompositeOperation='lighter';c.lineCap='round';c.lineJoin='round';c.shadowColor='#d731a9';c.shadowBlur=7*rift;
  c.beginPath();
  for(let i=0;i<6;i++){
   const start=i*TAU/6+(motion?clock*.48:0);
   for(let j=0;j<80;j++){
    const p=.07+j/79*1.25,a=start+p*3.9,r=p*span,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.62;
    if(j)c.lineTo(x,y);else c.moveTo(x,y);
   }
  }
  c.strokeStyle=`rgba(151,57,207,${rift*.12})`;c.lineWidth=6+rift*9;c.stroke();
  c.strokeStyle=`rgba(231,117,226,${rift*.45})`;c.lineWidth=.8+rift*1.1;c.stroke();
  c.shadowBlur=0;c.strokeStyle=`rgba(169,196,255,${rift*.34})`;c.lineWidth=.55;c.stroke();
  for(let i=0;i<3;i++){const pulse=motion?(clock*.36+i/3)%1:i/3,r=span*(.07+pulse*.52);ellipse(c,cx,cy,r,r*.54,null,`rgba(246,154,227,${rift*(1-pulse)*.22})`,.7+rift);}
  c.restore();
 }
 if(stream>.001){
  c.save();c.globalCompositeOperation='lighter';c.beginPath();
  for(let i=0;i<24;i++){
   const a=i*TAU/24+.11,flight=(i*.381966+clock*(.52+stream*.64))%1,r=span*(.14+flight*1.15),tail=span*Math.max(.05,.14+flight*1.15-.12-stream*.16);
   c.moveTo(cx+Math.cos(a)*tail,cy+Math.sin(a)*tail*.73);c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.73);
  }
  c.strokeStyle=`rgba(210,218,255,${stream*.68})`;c.lineWidth=.7+stream*1.3;c.shadowColor='#a347ff';c.shadowBlur=5*stream;c.stroke();c.restore();
 }
 if(gold>.001){
  c.save();c.globalCompositeOperation='lighter';
  const rays=motion?clamp(env.victoryRays||gold)*.22:gold*.13;
  c.beginPath();
  for(let i=0;i<9;i++){
   const a=i*TAU/9+(motion?clock*.035:0),edge=a+.075,r=span*1.6;
   c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);c.lineTo(cx+Math.cos(edge)*r,cy+Math.sin(edge)*r);c.closePath();
  }
  c.fillStyle=`rgba(255,213,126,${rays})`;c.fill();c.restore();
 }
}

function impactAtmosphere(c,{w,h},cue,targetX,targetY){
 const env=cue.environment,shock=clamp(env.shock||0),flash=clamp(env.flash||0);
 if(shock>.001){
  const progress=clamp(env.shockTravel||0),radius=Math.min(w,h)*(.08+progress*.60);
  c.save();c.globalCompositeOperation='lighter';
  for(let i=0;i<3;i++)ellipse(c,targetX,targetY,radius*(1+i*.31),radius*(.54+i*.12),null,`rgba(255,221,191,${shock*(.66-i*.16)})`,1.2+shock*(3-i));
  c.restore();
 }
 if(flash>.001){c.fillStyle=`rgba(255,239,221,${flash*.20})`;c.fillRect(0,0,w,h);}
}

/** Coordinates remain in CSS pixels; actors are fitted by their actual atlas frame. */
export function overlordBattle2DLayout(width,height,queen){
 const w=Math.max(1,width),h=Math.max(1,height),wide=w/h>2.2;
 const image=queen?.image||queen,frame=queen?.frame||[0,0,image?.width||2,image?.height||3];
 const aspect=frame[2]/Math.max(1,frame[3]);
 const queenHeight=Math.min(h*.88,w*.82/Math.max(.1,aspect)),queenWidth=queenHeight*aspect;
 const qx=Math.max(queenWidth/2+8,Math.min(w-queenWidth/2-8,w*(wide?.59:.61)));
 const heroHeight=Math.min(h*.35,w*.33),heroX=w*(wide?.28:.19);
 return {w,h,queen:{x:qx,y:h*.955,height:queenHeight,width:queenWidth},hero:{x:heroX,y:h*.965,height:heroHeight}};
}

function hall(c,{w,h,queen},environment,clock){
 const {rage,gold,portal,wind,pulse}=environment,qx=queen.x,horizon=h*.7,top=c.createLinearGradient(0,0,w,h);top.addColorStop(0,mix('#14131c','#352b1b',gold));top.addColorStop(.48,mix(mix('#1e101b','#481222',rage),'#4a3421',gold));top.addColorStop(1,'#070d17');c.fillStyle=top;c.fillRect(0,0,w,h);
 c.fillStyle=radial(c,qx,h*.32,h*.82,mix('#9f244536','#e6b45b55',gold));c.fillRect(0,0,w,h);
 // Deep arched niches sit behind the actors; all detail is drawn in this canvas.
 const windowWidth=Math.min(w*.5,h*.89),archHeight=h*.76;
 pointedArch(c,qx,horizon,windowWidth,archHeight,'#360f27','#a7834566',2);
 pointedArch(c,qx,horizon-2,windowWidth*.91,archHeight*.94,mix('#2e0e1d','#77552a',gold),'#e1b66c66',1);
 if(portal>.001){const radius=Math.min(windowWidth*.39,h*.30),cy=h*.30;c.fillStyle=radial(c,qx,cy,radius,'#f92e5966');c.fillRect(qx-radius,cy-radius,radius*2,radius*2);for(let i=0;i<3;i++)ellipse(c,qx,cy,radius*(.73+i*.12),radius*(.58+i*.08),null,mix('#b51e4377','#ff6a7aaa',portal),.8+portal*.8);}
 const moonX=qx+windowWidth*.17,moonY=h*.17,moonR=Math.min(h*.105,windowWidth*.24);
 ellipse(c,moonX,moonY,moonR,moonR,'#da786c','#e7bc7c88',1);
 ellipse(c,moonX+moonR*.3,moonY-moonR*.1,moonR*.88,moonR*.95,'#52152a');
 for(const sign of[-1,1])line(c,[[qx+sign*windowWidth*.18,horizon],[qx+sign*windowWidth*.18,h*.23]],'#e1b56a55',1);
 line(c,[[qx-windowWidth*.4,h*.43],[qx+windowWidth*.4,h*.43]],'#d6b47766',1);
 for(const sign of[-1,1]){
  const x=qx+sign*windowWidth*.67;
  pointedArch(c,x,horizon,windowWidth*.42,h*.62,'#110e1c','#b9934d77',1.2);
  const ripple=Math.sin(clock*.85+sign)*wind*w*.012;
  polygon(c,[[x-windowWidth*.11,h*.13],[x+windowWidth*.11,h*.13],[x+windowWidth*.11+ripple,h*.57],[x+ripple*.7,h*.64],[x-windowWidth*.11+ripple*.4,h*.57]],mix('#4e152a99','#7e512588',gold),'#d0a35e55',1);
  diamond(c,x,h*.35,windowWidth*.045,h*.047,'#d2a45799');
 }
 // Perspective marble, shallow gilded steps and a woven crimson aisle.
 const floor=c.createLinearGradient(0,horizon,0,h);floor.addColorStop(0,'#252335');floor.addColorStop(1,'#0e1622');polygon(c,[[0,horizon],[w,horizon],[w,h],[0,h]],floor);
 for(const x of[-w*.1,w*.15,w*.4,w*.66,w*.92,w*1.2])line(c,[[qx+(x-qx)*.05,horizon],[x,h]],'#a3a6b016',.7);
 for(const t of[.14,.42,.8]){const y=horizon+(h-horizon)*t*t;line(c,[[0,y],[w,y]],'#c8ac7830',.8);}
 const runner=c.createLinearGradient(0,horizon,0,h);runner.addColorStop(0,mix('#431020','#65431e',gold));runner.addColorStop(1,mix('#731a31','#8b5d2a',gold));polygon(c,[[qx-w*.055,horizon],[qx+w*.055,horizon],[qx+w*.25,h],[qx-w*.27,h]],runner,'#cea35f99',1);
 for(const sign of[-1,1])line(c,[[qx+sign*w*.045,horizon],[qx+sign*w*.224,h]],'#e0bd7988',.7);
 for(const y of[.79,.86,.95])for(const sign of[-1,1]){const t=(y-.7)/.3;diamond(c,qx+sign*w*(.035+.17*t),h*y,1.4+1.4*t,2+2*t,'#d5ae6d99');}
 for(let i=0;i<3;i++){const y=h*(.77+i*.036),spread=w*(.15+i*.035);polygon(c,[[qx-spread*.8,y],[qx+spread*.8,y],[qx+spread,y+h*.025],[qx-spread,y+h*.025]],i%2?'#2a2130':'#171824','#d6a65d99',.7);}
 if(environment.floorGlow>.001){for(let i=0;i<7;i++){const x=qx+(i-3)*w*.039,y=h*(.77+(i%3)*.045);line(c,[[x,y],[x+(i%2?1:-1)*w*.018,y+h*.05],[x+(i-3)*w*.028,h*.985]],`rgba(255,55,82,${environment.floorGlow*(.22+pulse*.22)})`,1.2);}}
 // Fine throne silhouette gives the full-body artwork a grounded architectural setting.
 pointedArch(c,qx,h*.765,Math.min(w*.22,h*.41),h*.57,'#1b1323','#d3ad67aa',2);
 pointedArch(c,qx,h*.75,Math.min(w*.18,h*.34),h*.51,mix('#531428bb','#755125aa',gold),'#d3ad6755',.7);
 for(const sign of[-1,1]){
  const x=qx+sign*Math.min(w*.14,h*.255);line(c,[[x,h*.76],[x,h*.63],[x-sign*w*.025,h*.58]],'#cda35d',2);
  diamond(c,x,h*.62,2.5,4,'#dfbe7d');
 }
 // Foreground piers and candles frame the painting without covering the queen.
 for(const [side,x] of[[-1,w*.045],[1,w*.965]]){
  const column=c.createLinearGradient(x-w*.018,0,x+w*.018,0);column.addColorStop(0,'#070b13');column.addColorStop(.45,'#4a3644');column.addColorStop(.7,'#261b2b');column.addColorStop(1,'#080c15');
  c.fillStyle=column;c.fillRect(x-w*.023,0,w*.046,h*.74);line(c,[[x-w*.016,0],[x-w*.016,h*.72]],'#d0a65b55',1);line(c,[[x+w*.017,0],[x+w*.017,h*.72]],'#96764555',.7);
  for(const y of[.04,.67,.72])line(c,[[x-w*.035,h*y],[x+w*.035,h*y]],'#b68a4a88',2);
  const cx=x-side*w*.065,cy=h*.635;
  c.fillStyle=radial(c,cx,cy,h*.17,'#ffa55048');c.fillRect(cx-h*.18,cy-h*.18,h*.36,h*.36);
  line(c,[[cx,h*.79],[cx,cy+h*.025]],'#af8b51',1.4);line(c,[[cx-w*.03,cy+h*.04],[cx+w*.03,cy+h*.04]],'#c6a264',1.2);
  for(const dx of[-1,1]){const xx=cx+dx*w*.025;c.fillStyle='#ecd19b';c.fillRect(xx-1,cy+3,2,h*.057);polygon(c,[[xx,cy-5],[xx+2,cy+1],[xx,cy+4],[xx-2,cy+1]],'#ffe9ba');}
 }
 // Low-contrast chains add depth in the upper corners, never text over a face.
 for(const sign of[-1,1]){c.beginPath();c.moveTo(sign<0?0:w,h*.03);c.bezierCurveTo(w*.5,h*.18,w*.5,h*.04,qx+sign*windowWidth*.52,h*.02);c.strokeStyle='#b9934a44';c.lineWidth=1;c.stroke();}
 const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#05081644');shade.addColorStop(.24,'#07091600');shade.addColorStop(.8,'#0a0b1600');shade.addColorStop(1,'#05081655');c.fillStyle=shade;c.fillRect(0,0,w,h);
}

function boundedSprite(c,sprite,x,footY,actualHeight,{alpha=1,offsetX=0}={}){
 const image=sprite?.image||sprite;if(!image||!image.width||!image.height)return false;
 const frame=sprite.frame||[0,0,image.width,image.height],actualWidth=actualHeight*frame[2]/frame[3],requestedHeight=actualHeight*(sprite.contentHeight||frame[3])/frame[3];
 // Compensate atlas anchors so the complete frame remains inside the stage.
 const drawX=x+offsetX+actualWidth*((sprite.anchorX??.5)-.5),drawY=footY-actualHeight+actualHeight*(sprite.anchorY??1);
 return drawArtSprite(c,sprite,drawX,drawY,requestedHeight,{alpha,flip:sprite.flip??false});
}
function cut(c,sx,sy,tx,ty,progress,index=0,special=false){
 const p=clamp(progress),offset=(index-2)*3.8,x=sx+(tx-sx)*p,y=sy+(ty-sy)*p+offset,tail=Math.max(0,p-.36),tailX=sx+(tx-sx)*tail,tailY=sy+(ty-sy)*tail+offset;
 c.save();c.lineCap='round';c.shadowColor='#ff1749';c.shadowBlur=special?11:5;
 c.beginPath();c.moveTo(tailX,tailY);c.quadraticCurveTo((tailX+x)/2,(tailY+y)/2-12-index*2,x,y);c.strokeStyle=special?'#e5235f66':'#ff738466';c.lineWidth=special?12:7;c.stroke();
 c.shadowBlur=0;c.strokeStyle=special?'#ff577dbb':'#ffbcabb9';c.lineWidth=special?5.2:3.3;c.stroke();c.strokeStyle='#fff0e8';c.lineWidth=1.3;c.stroke();ellipse(c,x,y,special?3.5:2.5,special?3.5:2.5,'#fff0e9');c.restore();
}

/** A sword has a blade, transverse guard and dark grip, not just a light trail.
 * Its point follows the same source-to-target flight as its luminous wake. */
export function overlordBattleSwordShape(x,y,targetX,targetY,length){
 const distance=Math.hypot(targetX-x,targetY-y)||1,dx=(targetX-x)/distance,dy=(targetY-y)/distance,px=-dy,py=dx;
 const point=(along,across=0)=>[x+dx*along*length+px*across*length,y+dy*along*length+py*across*length];
 return {
  blade:[point(0,-.058),point(.48,-.043),point(.73),point(.48,.043),point(0,.058),point(-.03)],
  guard:[point(-.01,-.17),point(.055,-.20),point(.02,-.07),point(.035),point(.02,.07),point(.055,.20),point(-.01,.17),point(-.065)],
  grip:[point(-.035,-.035),point(-.30,-.029),point(-.30,.029),point(-.035,.035)],
  pommel:[point(-.29),point(-.34,-.052),point(-.40),point(-.34,.052)],
  edge:[point(.035),point(.68)],tip:point(.73),hilt:point(-.34)
 };
}
export function overlordBattleSwordFlightShape(sourceX,sourceY,targetX,targetY,progress,length){
 const distance=Math.hypot(targetX-sourceX,targetY-sourceY)||1,dx=(targetX-sourceX)/distance,dy=(targetY-sourceY)/distance,p=clamp(progress),tipX=sourceX+(targetX-sourceX)*p,tipY=sourceY+(targetY-sourceY)*p;
 const x=tipX-dx*length*.73,y=tipY-dy*length*.73;
 return overlordBattleSwordShape(x,y,x+dx,y+dy,length);
}
function sword(c,shape,opacity){
 c.save();c.globalAlpha*=clamp(opacity);c.lineJoin='round';
 const metal=c.createLinearGradient(...shape.blade[0],...shape.tip);metal.addColorStop(0,'#780c31');metal.addColorStop(.38,'#eb2855');metal.addColorStop(.82,'#ffb4bd');metal.addColorStop(1,'#fff6ed');
 c.shadowColor='#ff245b';c.shadowBlur=7;
 polygon(c,shape.blade,metal,'#ffdda6',.85);c.shadowBlur=0;
 polygon(c,shape.grip,'#1b1425','#e6b865',.85);
 polygon(c,shape.guard,'#e6b865','#fff0bc',.75);
 polygon(c,shape.pommel,'#a4123d','#edc276',.75);
 line(c,shape.edge,'#fff2eb',1.1);c.restore();
}

/** Explicit 2D art renderer for unsupported WebGL; native combat uses its own 3D scene. */
export function renderOverlordBattle2D({canvas,art,battle,effect,time=0,motion=true}){
 const c=canvas?.getContext?.('2d');if(!c)return false;
 const w=Math.max(1,canvas.clientWidth||canvas.width||360),h=Math.max(1,canvas.clientHeight||canvas.height||220),ratio=Math.min(1.5,Math.max(1,Number(globalThis.devicePixelRatio)||1));
 if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
 const queen=identityQueenSprite(art?.images?.nameless_overlord),layout=overlordBattle2DLayout(w,h,queen),q=layout.queen,p=layout.hero;
 const cue=overlordBattleDirector({battle,effect,time,motion}),clock=motion&&Number.isFinite(time)?Math.max(0,time):0,env=cue.environment;
 c.save();c.translate(cue.camera.shakeX*w,cue.camera.shakeY*h);
 const zoom=1+(motion?Math.max(0,cue.camera.push||0)*.55:0);c.translate(w*.5,h*.55);c.scale(zoom,zoom);c.translate(-w*.5,-h*.55);
 hall(c,layout,env,clock);astralBackdrop(c,layout,cue,clock,motion);atmosphere(c,layout,cue,clock,motion);
 ellipse(c,q.x,q.y+h*.005,q.width*.3,Math.max(2,h*.014),'#050510a6');ellipse(c,q.x,q.y+h*.002,q.width*.45,Math.max(3,h*.022),null,mix('#d8af6e66','#f5d99c88',env.gold),.8);
 const hero=playerPose(art?.images?art:{...art,images:{}},'right',false,0,{battle:true,effect,time,motion}),heroMove=(cue.actors.heroAdvance-cue.actors.heroRecoil)*w*.13,heroLift=cue.actors.heroLift*h*.12;
 const queenRecoil=cue.actors.bossRecoil*w*.13,queenBreath=motion?Math.sin(clock*.95)*h*.0014:0;
 c.fillStyle=radial(c,q.x,q.y-q.height*.4,q.height*.58,mix('#b0245030','#e9c68444',env.gold));c.fillRect(q.x-q.width*.7,q.y-q.height,q.width*1.4,q.height);
 const painted=boundedSprite(c,queen,q.x,q.y+queenBreath,q.height,{offsetX:queenRecoil,alpha:1-env.gold*.06});
 if(!painted){c.fillStyle='#efd7aa';c.textAlign='center';c.font=`${Math.max(11,Math.min(15,w*.04))}px sans-serif`;c.fillText('覇王Sの姿を準備しています…',w*.56,h*.48);}
 ellipse(c,p.x+heroMove,p.y+h*.004,p.height*.23,Math.max(2,h*.011),'#040813aa');boundedSprite(c,hero,p.x,p.y-heroLift,p.height,{offsetX:heroMove});
 const targetX=p.x+heroMove,targetY=p.y-p.height*.52-heroLift,sourceX=q.x-q.width*.12+queenRecoil,sourceY=q.y-q.height*.54;
 if(cue.player.kind==='shine'&&cue.player.active){
  const t=cue.player.travel,x=targetX+(sourceX-targetX)*t,y=targetY+(sourceY-targetY)*t,r=Math.min(h*.10,30)*(1+cue.player.charge*.4);
  c.fillStyle=radial(c,x,y,r,'#ffe8b8bd');c.fillRect(x-r,y-r,r*2,r*2);ellipse(c,x,y,2.3+cue.player.charge*2,2.3+cue.player.charge*2,'#fff1cc');
  if(t>0&&t<1)line(c,[[x-(sourceX-targetX)*.11,y-(sourceY-targetY)*.11],[x,y]],'#ffe4a688',2.2);
 }
 if(cue.player.kind==='attack'&&cue.player.active&&cue.player.travel>0){
  const t=cue.player.travel,x=targetX+(sourceX-targetX)*t,y=targetY+(sourceY-targetY)*t;line(c,[[x-w*.035,y-h*.04],[x+w*.025,y+h*.045]],'#fff0c9',2.6);
 }
 burst(c,sourceX,sourceY,Math.min(w*.07,h*.14),cue.player.impact,'#ffdf9cd9');
 if(cue.counter.charge>.001){const radius=q.height*(.22+cue.counter.charge*.07);ellipse(c,q.x,q.y-q.height*.55,radius,radius*.25,null,'#f2436577',1+cue.counter.charge);}
 cue.blades.forEach((blade,i)=>{
  const sx=sourceX+(i-2)*q.width*.21,sy=sourceY-q.height*.06-(Math.abs(i-2)%2)*q.height*.04,flight=clamp(blade.travel);
  if(blade.active){
   cut(c,sx,sy,targetX,targetY,flight,i,cue.counter.special);
   burst(c,targetX,targetY,Math.min(w*.06,h*.12),blade.impact,cue.player.kind==='guard'?'#bcffe1d9':'#ffb4bed9');
  }
  if(blade.visible??blade.active){
   const length=Math.min(w*.13,h*.14)*(.72+.28*clamp(blade.summon??1));
   sword(c,overlordBattleSwordFlightShape(sx,sy,targetX,targetY,flight,length),blade.opacity??1);
  }
 });
 if(cue.player.shield>.001){const glow=cue.player.shield+cue.counter.impact*.6;ellipse(c,targetX,targetY,p.height*(.28+glow*.025),p.height*(.49+glow*.025),'#8cdcca18',mix('#b6ead688','#f1fff5ee',cue.counter.impact),1.2+cue.counter.impact*1.6);}
 if(env.gold>.001){c.fillStyle=radial(c,q.x,q.y-q.height*.25,q.height*.57,`rgba(255,220,144,${env.gold*.19})`);c.fillRect(q.x-q.width*.8,q.y-q.height*.8,q.width*1.6,q.height*.8);}
 impactAtmosphere(c,layout,cue,targetX,targetY);
 c.restore();c.strokeStyle='#d1a65f88';c.lineWidth=.8;c.strokeRect(.5,.5,w-1,h-1);
 return {...layout,loading:!painted,phase:cue.phase};
}
