/** Shared combat-clock staging. Authored battle art supplies detailed surfaces;
 * deterministic, bounded transforms add depth without downloads or filters. */
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function polygon(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function ellipse(c,x,y,rx,ry,color,width=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function glow(c,x,y,r,inner){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,'#05071200');return g;}

/** The throne room opens into a monumental eclipse vault. The foreground floor,
 * distant spires, orbital seal and moving aurora sheets have separate depths. */
export function drawCinematicArena(c,{w,h,queen},cue,clock,motion){
 const env=cue.environment,rift=clamp(env.rift||0),gold=clamp(env.gold||0),player=cue.player||{};
 const charging=motion?clamp(player.charge||0):0,kind=player.kind;
 const cx=queen.x,cy=h*.30,horizon=h*.70,span=Math.max(w,h),special=cue.counter?.special;
 if(rift>.001){
  c.save();c.globalAlpha*=rift;
  const sky=c.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#050715');sky.addColorStop(.38,special?'#3c081d':'#160d32');sky.addColorStop(.7,'#13081b');sky.addColorStop(1,'#080d19');c.fillStyle=sky;c.fillRect(0,0,w,h);
  c.fillStyle=glow(c,cx,cy,span*.72,special?'#b30d4e99':'#6e2ec799');c.fillRect(0,0,w,h);
  // Broad translucent curtains bend as surfaces rather than disconnected lines.
  for(let i=0;i<5;i++){
   const x=w*(i/4-.16),phase=clock*(.19+i*.016)+i*.93,travel=Math.sin(phase)*w*.075;
   c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+w*.32+travel,h*.23,x-w*.21,h*.42,x+w*.36,horizon);c.lineTo(x+w*.43,horizon);c.bezierCurveTo(x-w*.06,h*.4,x+w*.41+travel,h*.19,x+w*.12,0);c.closePath();
   const sheet=c.createLinearGradient(x,0,x+w*.4,horizon);sheet.addColorStop(0,'#d45a8b00');sheet.addColorStop(.4,special?'#d9226238':'#8c69ff3c');sheet.addColorStop(.7,'#ffa17012');sheet.addColorStop(1,'#d45a8b00');c.fillStyle=sheet;c.fill();
  }
  // Distant castle walls cross behind the eclipse; separate parallax is small.
  c.beginPath();
  for(let i=0;i<17;i++){
   const x=w*(i/16)+Math.sin(clock*.08)*w*.012,base=horizon-h*.08,peak=h*(.29+((i*7)%9)*.027),half=w*(i%3===0?.026:.016);
   c.moveTo(x-half,base);c.lineTo(x-half,peak+h*.06);c.lineTo(x-half*.3,peak+h*.06);c.lineTo(x,peak);c.lineTo(x+half*.3,peak+h*.06);c.lineTo(x+half,peak+h*.06);c.lineTo(x+half,base);c.closePath();
  }
  c.fillStyle='#160b22';c.fill();c.strokeStyle='#79304460';c.lineWidth=.7;c.stroke();
  const eclipseR=Math.min(w*.27,h*.235),eclipseY=cy-h*.035;
  c.fillStyle=glow(c,cx,eclipseY,eclipseR*1.8,special?'#ff286a88':'#9667ff66');c.fillRect(cx-eclipseR*1.8,eclipseY-eclipseR*1.8,eclipseR*3.6,eclipseR*3.6);
  c.beginPath();c.ellipse(cx,eclipseY,eclipseR,eclipseR,0,0,TAU);c.fillStyle='#0b0714';c.fill();c.strokeStyle='#f7798877';c.lineWidth=2;c.stroke();
  c.save();c.translate(cx,eclipseY);c.rotate(clock*(special?.075:.035));
  for(let ring=0;ring<3;ring++){
   const r=eclipseR*(1.14+ring*.18);ellipse(c,0,0,r,r,special?'#e66e8e88':'#c499ef77',ring===1?1.4:.65);
   const ticks=ring===1?24:12;
   c.beginPath();for(let i=0;i<ticks;i++){const a=i*TAU/ticks+(ring%2?.05:0),inner=r-(i%3?2:5);c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);c.lineTo(Math.cos(a)*(r+3),Math.sin(a)*(r+3));}c.strokeStyle='#efc2c066';c.lineWidth=.7;c.stroke();
  }
  c.beginPath();for(let i=0;i<5;i++){const a=i*TAU/5-Math.PI/2,r=eclipseR*1.31,x=Math.cos(a)*r,y=Math.sin(a)*r;c.moveTo(x,y-5);c.lineTo(x+3,y);c.lineTo(x,y+5);c.lineTo(x-3,y);c.closePath();}c.fillStyle='#f1b7a5aa';c.fill();
  c.restore();
  // Mirror the eclipse on a deep, moving floor; the opaque actor stays legible.
  const floor=c.createLinearGradient(0,horizon,0,h);floor.addColorStop(0,'#431021aa');floor.addColorStop(.25,'#160d23');floor.addColorStop(1,'#080d19');polygon(c,[[0,horizon],[w,horizon],[w,h],[0,h]],floor);
  const depth=motion?(clock*.16)%1:0;
  c.beginPath();for(let i=0;i<9;i++){const t=(i+depth)/9,y=horizon+(h-horizon)*t*t;c.moveTo(0,y);c.lineTo(w,y);}c.strokeStyle='#c34b6626';c.lineWidth=.65;c.stroke();
  c.beginPath();for(let i=-4;i<=4;i++){const x=cx+i*w*.19;c.moveTo(cx+i*w*.018,horizon);c.lineTo(x,h);}c.strokeStyle='#b6778c30';c.lineWidth=.7;c.stroke();
  c.save();c.translate(cx,horizon+h*.14);c.scale(1,.22);c.rotate(-clock*.1);
  for(let r=0;r<3;r++)ellipse(c,0,0,eclipseR*(.82+r*.25),eclipseR*(.82+r*.25),'#d98c9b55',1.4);
  c.beginPath();for(let i=0;i<10;i++){const a=i*TAU/10;c.moveTo(Math.cos(a)*eclipseR*.65,Math.sin(a)*eclipseR*.65);c.lineTo(Math.cos(a)*eclipseR*1.4,Math.sin(a)*eclipseR*1.4);}c.strokeStyle='#eec6a666';c.lineWidth=1;c.stroke();
  c.restore();
  // Two near marble fragments slide past the frame, establishing camera depth.
  for(const sign of[-1,1]){
   const drift=Math.sin(clock*.32+sign)*h*.025,x=sign<0?-w*.04:w*1.04,y=h*.61+drift;
   polygon(c,[[x-sign*w*.02,y],[x+sign*w*.11,y-h*.07],[x+sign*w*.16,y+h*.16],[x-sign*w*.02,y+h*.22]],'#151222','#795b7366',1);
   line(c,[[x,y],[x+sign*w*.105,y-h*.055],[x+sign*w*.14,y+h*.16]],'#c5a48a55',1.1);
  }
  c.restore();
 }
 const stream=motion?clamp(env.stream||0):0;
 if(stream>.001){
  c.save();c.globalCompositeOperation='lighter';c.beginPath();
  for(let i=0;i<24;i++){const a=i*TAU/24+.11,flight=(i*.381966+clock*(.52+stream*.64))%1,r=span*(.14+flight*1.15),tail=span*Math.max(.05,.14+flight*1.15-.12-stream*.16);c.moveTo(cx+Math.cos(a)*tail,cy+Math.sin(a)*tail*.73);c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.73);}
  c.strokeStyle=`rgba(210,218,255,${stream*.24})`;c.lineWidth=.6+stream*.8;c.stroke();c.restore();
 }
 // The player's three commands establish different planes and colors, before
 // the queen's counter takes over. No extra travelling sprites are fabricated.
 if(charging>.001){
  c.save();c.globalCompositeOperation='lighter';
  const px=w*.19,py=h*.80,r=Math.min(w,h)*(.22+charging*.13),blue=kind==='guard';
  c.fillStyle=glow(c,px,py,r,blue?`rgba(78,179,222,${charging*.32})`:`rgba(255,189,93,${charging*.35})`);c.fillRect(px-r,py-r,r*2,r*2);
  c.save();c.translate(px,py);c.scale(1,.32);c.rotate((blue?-1:1)*clock*.35);
  for(let i=0;i<2;i++)ellipse(c,0,0,r*(.63+i*.15),r*(.63+i*.15),blue?`rgba(154,231,255,${charging*.75})`:`rgba(255,220,160,${charging*.75})`,1.2);
  for(let i=0;i<6;i++){const a=i*TAU/6,x=Math.cos(a)*r*.78,y=Math.sin(a)*r*.78;polygon(c,[[x,y-6],[x+3,y],[x,y+6],[x-3,y]],blue?'#b3efff99':'#ffe3b599');}c.restore();c.restore();
 }
 if(gold>.001){
  c.save();c.globalCompositeOperation='lighter';
  const rays=gold*(motion?.18:.10);c.beginPath();
  for(let i=0;i<7;i++){const a=i*TAU/7+(motion?clock*.025:0),edge=a+.10,r=span*1.6;c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);c.lineTo(cx+Math.cos(edge)*r,cy+Math.sin(edge)*r);c.closePath();}c.fillStyle=`rgba(255,213,126,${rays})`;c.fill();c.restore();
 }
}

/** A curved flight varies by sword while retaining a shared exact arrival. */
export function cinematicBladePoint(sx,sy,tx,ty,progress,{index=2,special=false}={}){
 const p=clamp(progress),dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy)||1;
 const spread=special?(index-2)*.16:.07,arc=Math.sin(Math.PI*p)*d*spread;
 return {x:mix(sx,tx,p)-dy/d*arc,y:mix(sy,ty,p)+dx/d*arc};
}
export function drawCinematicBladeWake(c,sx,sy,tx,ty,progress,index=2,special=false){
 const p=clamp(progress),head=cinematicBladePoint(sx,sy,tx,ty,p,{index,special}),tail=Math.max(0,p-(special?.28:.20)),left=[],right=[];
 for(let i=0;i<=12;i++){
  const t=tail+(p-tail)*i/12,q=cinematicBladePoint(sx,sy,tx,ty,t,{index,special}),next=cinematicBladePoint(sx,sy,tx,ty,Math.min(1,t+.005),{index,special}),dx=next.x-q.x,dy=next.y-q.y,d=Math.hypot(dx,dy)||1,width=Math.sin(i/12*Math.PI*.87)*(special?8:4);
  left.push([q.x-dy/d*width,q.y+dx/d*width]);right.push([q.x+dy/d*width,q.y-dx/d*width]);
 }
 c.save();c.globalCompositeOperation='lighter';
 polygon(c,[...left,...right.reverse()],special?'#ee174d50':'#f67d6250');
 const path=[];for(let i=0;i<=12;i++){const q=cinematicBladePoint(sx,sy,tx,ty,tail+(p-tail)*i/12,{index,special});path.push([q.x,q.y]);}
 line(c,path,special?'#ff476acb':'#ffb4a5bb',special?3.1:2);
 const middle=path[6],start=path[0],finish=path[12];c.beginPath();c.moveTo(...start);c.quadraticCurveTo(middle[0]*2-(start[0]+finish[0])*.5,middle[1]*2-(start[1]+finish[1])*.5,...finish);c.strokeStyle='#ffe4d8dd';c.lineWidth=.7;c.stroke();
 c.restore();return head;
}

/** Radial ground fracture follows each timed arrival. It grows into perspective
 * before fading, rather than filling the stage with uncorrelated spark noise. */
export function drawCinematicImpact(c,{w,h},cue,targetX,targetY){
 const env=cue.environment,shock=clamp(env.shock||0),travel=clamp(env.shockTravel||0),flash=clamp(env.flash||0);
 if(shock>.001){
  const r=Math.min(w,h)*(.07+travel*.65),groundY=Math.min(h*.96,targetY+h*.13);
  c.save();c.globalCompositeOperation='lighter';
  for(let ring=0;ring<3;ring++)ellipse(c,targetX,groundY,r*(1+ring*.28),r*(.18+ring*.065),`rgba(255,221,191,${shock*(.65-ring*.15)})`,1+shock*(2.5-ring*.5));
  c.beginPath();for(let i=0;i<9;i++){
   const a=i*TAU/9+.21,cos=Math.cos(a),sin=Math.sin(a),start=r*.12,middle=r*(.46+(i%3)*.07),end=r*(.86+(i%2)*.15),bend=(i%2?1:-1)*r*.09;
   c.moveTo(targetX+cos*start,groundY+sin*start*.25);c.lineTo(targetX+cos*middle-sin*bend,groundY+sin*middle*.25+cos*bend*.25);c.lineTo(targetX+cos*end,groundY+sin*end*.25);
  }c.strokeStyle=`rgba(255,121,139,${shock*.62})`;c.lineWidth=.65+shock;c.stroke();
  // A narrow impact incision is directional; its dim edges do not bleach faces.
  const slash=r*(.68+shock*.4);polygon(c,[[targetX-slash*.6,targetY+slash*.3],[targetX+slash*.55,targetY-slash*.38],[targetX+slash*.34,targetY-slash*.16],[targetX-slash*.42,targetY+slash*.34]],`rgba(255,223,185,${shock*.64})`);
  c.restore();
 }
 if(flash>.001){c.fillStyle=`rgba(255,239,221,${flash*.10})`;c.fillRect(0,0,w,h);}
}

const smooth=p=>{const n=clamp(p);return n*n*(3-2*n);};
const bell=(age,start,end)=>age<start||age>end?0:Math.sin((age-start)/(end-start)*Math.PI);
/** Normal encounters and town use their own existing command durations. This
 * adapter never adds a gameplay delay or keeps an effect alive after unlock. */
export function battleCinematicCue({action=null,age=99,duration=1.2,retaliation=0,victory=false,motion=true,guarded=false,scope='maze'}={}){
 const t=Number.isFinite(age)?Math.max(0,age):99,span=Number.isFinite(duration)&&duration>0?duration:1.2;
 const light=['shine','spark','light'].includes(action),guard=action==='guard',enemy=action==='enemy',strike=action==='attack',support=action==='tonic';
 const live=!!action&&t<span,hit=light?span*(scope==='town'?.55:.533):span*(enemy?.52:.375),release=light?span*.358:span*.10;
 const counterStart=scope==='maze'?(light?1.9:.68):span+1,counter=live&&retaliation>0&&!victory&&t>=counterStart;
 const active=motion&&live,protect=guard||(enemy&&guarded);
 return {kind:light?'light':guard?'guard':enemy?'enemy':strike?'attack':support?'support':'idle',live:active,victory:!!victory,
  charge:active&&(light||strike)?bell(t,0,release):0,
  release:active&&(light||strike)&&t>=release&&t<=hit?clamp((t-release)/(hit-release)):null,
  impact:active&&(light||strike||enemy)?bell(t,hit,Math.min(span,hit+span*.30)):0,
  impactProgress:active?clamp((t-hit)/(span*.30)):0,
  shield:active&&protect?smooth(t/Math.min(.16,span*.25))*(1-smooth((t-span*.82)/(span*.18))):0,
  returnTravel:counter?clamp((t-counterStart)/Math.min(.4,span-counterStart)):enemy&&active?clamp(t/hit):null,
  returnImpact:counter?bell(t,counterStart+.25,Math.min(span,counterStart+.5)):enemy&&active?bell(t,hit,span):0,
  support:active&&support?bell(t,0,span):0,
  light,guard:protect,enemy,motion:!!motion,clock:motion?t:0,progress:active?clamp(t/span):0,
  arenaBlend:active&&!victory?(light?.86:enemy?.62:strike?.20:guard?.10:0)*smooth(t/Math.max(.04,span*.13))*(1-smooth((t-span*.78)/(span*.22))):0};
}

/** Draw an authored energy cell without per-frame allocation or canvas filters.
 * Each asset has three independently padded cells: slash, impact, then aura. */
export function drawBattleEnergy(c,image,cell,{x,y,width,height=width,rotation=0,alpha=1,blend='lighter'}={}){
 const iw=image?.naturalWidth||image?.width||0,ih=image?.naturalHeight||image?.height||0;
 if(!iw||!ih||!Number.isFinite(x)||!Number.isFinite(y)||!(width>0)||!(height>0)||!(alpha>0))return false;
 const index=Math.max(0,Math.min(2,Math.floor(cell))),sw=iw/3;
 c.save();c.globalAlpha*=clamp(alpha);c.globalCompositeOperation=blend;c.translate(x,y);c.rotate(rotation);
 c.drawImage(image,index*sw,0,sw,ih,-width*.5,-height*.5,width,height);c.restore();return true;
}

/** Overscanned artwork supplies depth during camera travel. Light changes come
 * from the combat clock, so repeated renders and motion-off stay deterministic. */
export function drawBattleArenaArtwork(c,image,{w,h,amount=1,clock=0,depth=1,anchor=.48}={}){
 const iw=image?.naturalWidth||image?.width||0,ih=image?.naturalHeight||image?.height||0;
 if(!iw||!ih||!(amount>0))return false;
 const zoom=1.07+Math.sin(clock*.39)*.008*depth,scale=Math.max(w/iw,h/ih)*zoom,dw=iw*scale,dh=ih*scale;
 const x=(w-dw)*.5+Math.sin(clock*.23)*w*.009*depth,y=(h-dh)*anchor+Math.cos(clock*.17)*h*.006*depth;
 c.save();c.globalAlpha*=clamp(amount);c.drawImage(image,x,y,dw,dh);c.restore();return true;
}

/** Painted realms open on the player's light spell and on hostile magic. The
 * calm room remains visible for swordplay and guarding; an eclipse becomes a
 * distinct, moving full environment during the powerful release. */
export function drawBattleCinematicBackground(c,layout,cue,time=0){
 const {w,h,heroX,enemyX,floorY,heroSize,enemySize,images={}}=layout,clock=cue.motion&&Number.isFinite(time)?time:0;
 const blend=cue.arenaBlend||0,texture=images.battleEnergy;
 if(blend>.001&&images.battleEclipse){
  drawBattleArenaArtwork(c,images.battleEclipse,{w,h,amount:blend,clock,depth:cue.light?1:.55});
  const veil=c.createLinearGradient(0,0,0,h);veil.addColorStop(0,'#0505114a');veil.addColorStop(.43,'#04071308');veil.addColorStop(1,'#0407123c');
  c.save();c.globalAlpha*=blend;c.fillStyle=veil;c.fillRect(0,0,w,h);c.restore();
 }
 const strength=cue.charge*.55+cue.impact*.3+cue.shield*.25+cue.returnImpact*.24;
 if(strength>.001){
  const cx=cue.guard?heroX:enemyX,cy=floorY-(cue.guard?heroSize:enemySize)*.45,r=Math.max(w,h)*.7;
  c.save();c.fillStyle=glow(c,cx,cy,r,cue.guard?`rgba(64,161,185,${strength*.22})`:cue.enemy?`rgba(115,74,172,${strength*.25})`:`rgba(255,172,79,${strength*.26})`);c.fillRect(0,0,w,h);c.restore();
 }
 if(cue.charge>.001){
  const amount=cue.charge,diameter=heroSize*(.8+amount*.4);
  if(!drawBattleEnergy(c,texture,2,{x:heroX,y:floorY-heroSize*.39,width:diameter,height:diameter*1.12,rotation:Math.sin(clock*.4)*.07,alpha:amount*.58})){
   c.save();c.globalCompositeOperation='lighter';const r=heroSize*(.35+amount*.16);ellipse(c,heroX,floorY,r,r*.27,`rgba(255,217,145,${amount*.6})`,1.2);c.restore();
  }
 }
 if(cue.shield>.001){
  drawBattleEnergy(c,texture,2,{x:heroX,y:floorY-heroSize*.46,width:heroSize*1.18,height:heroSize*1.28,rotation:-.12+Math.sin(clock*.4)*.04,alpha:cue.shield*.50});
 }
 if(cue.enemy&&cue.live){
  const p=cue.progress,a=Math.sin(p*Math.PI)*.38;
  drawBattleEnergy(c,texture,2,{x:enemyX,y:floorY-enemySize*.45,width:enemySize*(1.1+p*.2),height:enemySize*1.28,rotation:.15-clock*.16,alpha:a});
 }
 if(cue.support>.001){
  drawBattleEnergy(c,texture,2,{x:heroX,y:floorY-heroSize*.43,width:heroSize*.95,height:heroSize*1.16,rotation:clock*.18,alpha:cue.support*.48});
 }
 if(cue.victory){
  c.save();const amber=c.createLinearGradient(0,0,w,h);amber.addColorStop(0,'#f3c77700');amber.addColorStop(.65,'#f6c67e0b');amber.addColorStop(1,'#ffdf9b24');c.fillStyle=amber;c.fillRect(0,0,w,h);c.restore();
  // A single distant, detailed star dissolves into the restored room.
  drawBattleEnergy(c,texture,1,{x:enemyX,y:floorY-enemySize*.70,width:enemySize*1.7,height:enemySize*1.7,rotation:clock*.015,alpha:.16});
 }
}

function curvedLight(c,sx,sy,tx,ty,progress,{red=false,size=1,texture}={}){
 const p=clamp(progress),control={x:(sx+tx)*.5,y:Math.min(sy,ty)-Math.abs(tx-sx)*.22},point=t=>({x:(1-t)*(1-t)*sx+2*(1-t)*t*control.x+t*t*tx,y:(1-t)*(1-t)*sy+2*(1-t)*t*control.y+t*t*ty});
 const head=point(p),tail=point(Math.max(0,p-.18)),angle=Math.atan2(head.y-tail.y,head.x-tail.x),r=44*size;
 if(drawBattleEnergy(c,texture,red?0:2,{x:head.x,y:head.y,width:r*(red?2.1:1.65),height:r*(red?1.45:1.65),rotation:red?angle-.65:p*2.4,alpha:.86})){
  drawBattleEnergy(c,texture,1,{x:head.x,y:head.y,width:r*.78,height:r*.78,rotation:p*.8,alpha:.40});return;
 }
 c.save();c.globalCompositeOperation='lighter';c.lineCap='round';c.beginPath();c.moveTo(tail.x,tail.y);c.lineTo(head.x,head.y);c.strokeStyle=red?'#d7b9ffbb':'#ffe1a9d9';c.lineWidth=3*size;c.stroke();
 c.fillStyle=glow(c,head.x,head.y,24*size,red?'#c7a6f455':'#ffd89470');c.fillRect(head.x-24*size,head.y-24*size,48*size,48*size);c.restore();
}
export function drawBattleCinematicForeground(c,layout,cue){
 const {w,h,heroX,enemyX,floorY,heroSize,enemySize,images={}}=layout,sx=Number.isFinite(layout.sourceX)?layout.sourceX:heroX+heroSize*.18,sy=Number.isFinite(layout.sourceY)?layout.sourceY:floorY-heroSize*.49,tx=enemyX,ty=floorY-enemySize*.48,texture=images.battleEnergy;
 if(!cue.motion)return;
 if(cue.release!==null){
  if(cue.light)curvedLight(c,sx,sy,tx,ty,cue.release,{size:Math.min(1.2,h/240),texture});
  else{
   const p=cue.release,travel=smooth(p),cx=mix(sx,tx,travel),cy=mix(sy,ty,travel),r=Math.min(w*.16,h*.30);
   if(!drawBattleEnergy(c,texture,0,{x:cx,y:cy,width:r*2.1,height:r*1.9,rotation:-.52+p*.65,alpha:Math.sin(p*Math.PI)*.92})){
    c.save();c.globalCompositeOperation='lighter';c.beginPath();c.arc(cx,cy,r*.55,-1.8+p*.5,.45+p*.5);c.strokeStyle='#ffe4b7bb';c.lineWidth=3;c.stroke();c.restore();
   }
  }
 }
 if(cue.impact>.001&&!cue.enemy){
  const power=cue.impact,p=cue.impactProgress,r=Math.min(w*.24,h*.38)*(.48+p*.62);
  if(!drawBattleEnergy(c,texture,1,{x:tx,y:ty,width:r*2.2,height:r*2.2,rotation:-.25+p*.12,alpha:power*.81})){
   c.save();c.globalCompositeOperation='lighter';ellipse(c,tx,ty,r,r*.83,`rgba(255,224,174,${power*.65})`,1.4);c.restore();
  }
  drawBattleEnergy(c,texture,0,{x:tx,y:floorY+2,width:r*2.6,height:r*.6,rotation:0,alpha:power*.35});
 }
 if(cue.shield>.001){
  const power=cue.shield,cx=heroX,cy=floorY-heroSize*.48,r=heroSize*.45;
  // The authored filaments form the shield; its thin inner rim gives contact
  // feedback without a hexagon obscuring the character's face and costume.
  c.save();c.globalCompositeOperation='lighter';ellipse(c,cx,cy,r*.67,r*.94,`rgba(177,241,238,${power*.32})`,.9);c.restore();
  if(cue.returnImpact>.001)drawBattleEnergy(c,texture,1,{x:heroX+heroSize*.24,y:sy,width:heroSize*.84,height:heroSize*.84,rotation:.8,alpha:cue.returnImpact*.66});
 }
 if(cue.returnTravel!==null&&cue.returnTravel<1)curvedLight(c,tx,ty,heroX,sy,cue.returnTravel,{red:true,size:Math.min(1,h/260),texture});
 if(cue.returnImpact>.001&&!cue.shield){
  const r=heroSize*(.6+cue.returnImpact*.2);
  if(!drawBattleEnergy(c,texture,1,{x:heroX,y:sy,width:r,height:r,rotation:.7,alpha:cue.returnImpact*.70})){c.save();c.globalCompositeOperation='lighter';ellipse(c,heroX,sy,r*.4,r*.35,`rgba(196,170,235,${cue.returnImpact*.58})`,1.3);c.restore();}
 }
 if(cue.support>.001){
  const p=cue.progress;
  for(let i=0;i<3;i++)drawBattleEnergy(c,texture,1,{x:heroX+heroSize*(i-1)*.23,y:floorY-heroSize*(.18+p*.62+(i%2)*.12),width:heroSize*.22,height:heroSize*.22,rotation:.2,alpha:cue.support*.40});
 }
}
