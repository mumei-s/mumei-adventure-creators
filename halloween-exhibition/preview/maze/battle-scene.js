import {monsterSprite} from './monster-motion.js?v=20261016-living1';
import {drawArtSprite,playerPose} from './rpg-art.js?v=20261017-startup1';
import {drawCreature} from './stage-2d.js?v=20261019-journey1';
import {prankFor} from './encounter-model.js?v=20261016-living1';
import {encounterStory} from './story-model.js?v=20261016-living1';
const clamp=x=>Math.max(0,Math.min(1,x));
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function label(c,text,x,y,color,size=18,align='center',maxWidth=null){c.font=`600 ${size}px "Yu Gothic",sans-serif`;c.textAlign=align;c.lineJoin='round';c.lineWidth=4;c.strokeStyle='#111421';if(maxWidth)c.strokeText(text,x,y,maxWidth);else c.strokeText(text,x,y);c.fillStyle=color;if(maxWidth)c.fillText(text,x,y,maxWidth);else c.fillText(text,x,y);}
function ring(c,x,y,rx,ry,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.stroke();}
function spriteAspect(sprite){return sprite?(sprite.frame?.[2]||sprite.width)/(sprite.contentHeight||sprite.frame?.[3]||sprite.height):.75;}
export function battleLayout(width,height,{enemyAspect=.75}={}){
  const w=Math.max(1,width),h=Math.max(1,height),safeAspect=Number.isFinite(enemyAspect)&&enemyAspect>0?enemyAspect:.75;
  return {px:w*.24,py:h*.87,ex:w*.73,ey:h*.87,heroSize:Math.max(1,Math.min(h*.62,w*.39,310,h*.87-42)),enemySize:Math.max(1,Math.min(h*.74,w*.46/safeAspect,370,h*.87-42))};
}
export function battleEffectDuration(type,motion=true){return motion?(type==='shine'?2.4:1.2):.65;}
export function shineSequence(age,motion=true){
  const t=Math.max(0,Number.isFinite(age)?age:0);
  if(!motion)return {stage:t<.65?'impact':'done',charge:0,travel:1,impact:clamp(t/.65),lunge:0};
  return {stage:t<.5?'charge':t<.86?'circle':t<1.28?'release':t<1.86?'impact':t<2.4?'settle':'done',charge:clamp(t/.5),travel:clamp((t-.86)/.42),impact:clamp((t-1.28)/.58),lunge:t>.76&&t<1.48?Math.sin((t-.76)/.72*Math.PI):0};
}
function magicCircle(c,x,y,r,progress,time,motion){
  c.save();c.translate(x,y);c.scale(1,.36);c.rotate(motion?time*.55:0);c.globalAlpha=.75*progress;c.lineWidth=2;c.strokeStyle='#f8d995';
  for(const radius of [r,r*.78]){c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.stroke();}
  c.beginPath();for(let n=0;n<=6;n++){const a=n*Math.PI*2/6;c[n?'lineTo':'moveTo'](Math.cos(a)*r*.88,Math.sin(a)*r*.88);}c.stroke();
  for(let n=0;n<8;n++){const a=n*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*r*.95,Math.sin(a)*r*.95);c.lineTo(Math.cos(a)*r*1.12,Math.sin(a)*r*1.12);c.stroke();}c.restore();
}
function shineEffect(c,{px,py,ex,ey,heroSize,enemySize,w,h,age,motion,seq}){
  const sx=px+heroSize*.2,sy=py-heroSize*.52,tx=ex,ty=ey-enemySize*.48;
  if(!motion){glow(c,tx,ty,Math.min(70,h*.24),'#ffd68545');ring(c,tx,ty,Math.min(38,w*.1),Math.min(38,w*.1),'#ffe4aa');label(c,'灯の必殺技',w/2,Math.max(49,h*.16),'#ffe3a2',w<500?14:20,'center',w-16);return;}
  const fade=age>1.86?1-clamp((age-1.86)/.54):1;
  magicCircle(c,px,py-3,Math.min(w*.19,heroSize*.58),seq.charge*fade,age,motion);
  if(age<1.28){
    glow(c,sx,sy,heroSize*(.13+.22*seq.charge),'#ffcf7750');
    for(let n=0;n<9;n++){const a=n*Math.PI*2/9+age*1.7,r=heroSize*(.4-.26*seq.charge);ellipse(c,sx+Math.cos(a)*r,sy+Math.sin(a)*r,2,2,'#ffe3a8');}
  }
  if(age>=.5&&age<1.86){c.save();c.globalAlpha=Math.min(1,(age-.5)*5)*fade;label(c,'灯の必殺技',w/2,Math.max(49,h*.16),'#ffe3a2',w<500?15:23,'center',w-16);c.restore();}
  if(seq.stage==='release'){
    const t=seq.travel,x=sx+(tx-sx)*t,y=sy+(ty-sy)*t-Math.sin(t*Math.PI)*h*.09;
    c.lineCap='round';for(const [width,color]of [[15,'#ffbd5230'],[6,'#ffd47aaa'],[2,'#fff2c6']]){c.lineWidth=width;c.strokeStyle=color;c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+x)/2,sy-h*.1,x,y);c.stroke();}
    glow(c,x,y,Math.min(44,h*.16),'#ffd27d99');ellipse(c,x,y,8,8,'#fff1c2');
  }
  if(age>=1.28&&age<2.4){
    const t=clamp((age-1.28)/1.12),r=Math.min(h*.26,w*.16)*( .25+t);c.save();c.globalAlpha=1-t;
    glow(c,tx,ty,r*1.5,'#fbd48c55');ring(c,tx,ty,r,r,'#ffe6ae');ring(c,tx,ty,r*.7,r*.7,'#ffe6ae88');
    for(let n=0;n<12;n++){const a=n*Math.PI/6; c.strokeStyle=n%2?'#c0e7dc':'#ffdc8e';c.lineWidth=2;c.beginPath();c.moveTo(tx+Math.cos(a)*r*.65,ty+Math.sin(a)*r*.65);c.lineTo(tx+Math.cos(a)*r*1.25,ty+Math.sin(a)*r*1.25);c.stroke();}c.restore();
  }
}
function heroFallback(c,x,y,size){
  // A human lantern-keeper silhouette stays usable if an image cannot load.
  ellipse(c,x,y-size*.83,size*.095,size*.11,'#dec3a0');c.fillStyle='#66517a';c.beginPath();c.moveTo(x,y-size*.75);c.lineTo(x-size*.2,y-size*.12);c.lineTo(x+size*.2,y-size*.12);c.closePath();c.fill();
  c.fillStyle='#372c35';c.fillRect(x-size*.11,y-size*.13,size*.075,size*.13);c.fillRect(x+size*.04,y-size*.13,size*.075,size*.13);glow(c,x+size*.2,y-size*.4,size*.22,'#ffd4847a');ellipse(c,x+size*.2,y-size*.4,size*.045,size*.065,'#f1cc80');
}
export function renderBattleScene({canvas,art,battle,effect=null,time=0,motion=true,pixelRatio=1}){
  const c=canvas.getContext('2d');if(!c)return;
  const ratio=Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1,w=canvas.width/ratio,h=canvas.height/ratio;
  c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
  const bg=art.images.battle;
  if(bg){const scale=Math.max(w/bg.width,h/bg.height);c.drawImage(bg,(w-bg.width*scale)/2,(h-bg.height*scale)*.42,bg.width*scale,bg.height*scale);}else{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#102838');g.addColorStop(1,'#342437');c.fillStyle=g;c.fillRect(0,0,w,h);}
  const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#070b19c9');shade.addColorStop(.26,'#080f1b2b');shade.addColorStop(.7,'#090d1c11');shade.addColorStop(1,'#080b17d9');c.fillStyle=shade;c.fillRect(0,0,w,h);
  const effectAge=effect?Math.max(0,time-effect.started):99;
  const won=battle.status==='won'&&!(effect?.type==='shine'&&motion&&effectAge<1.28),enemy=monsterSprite(art,battle.id,{time,motion,battle:true,facing:'left'}),story=encounterStory(battle.id),intent=prankFor(battle);
  const {px,py,ex,ey,heroSize,enemySize}=battleLayout(w,h,{enemyAspect:spriteAspect(enemy)});
  const age=effect?Math.max(0,time-effect.started):99,phase=motion?age:99;
  const shine=effect?.type==='shine',attack=effect?.type==='attack',guard=effect?.type==='guard';
  const offensive=shine||attack;
  const seq=shineSequence(age,motion);
  const lunge=shine?seq.lunge*Math.min(w*.065,36):offensive&&phase<.38?Math.sin(phase/.38*Math.PI)*(attack?Math.min(w*.05,30):10):0;
  const recoil=shine?(motion&&age>1.28&&age<1.86?Math.sin((age-1.28)/.58*Math.PI)*Math.min(14,w*.025):0):offensive&&phase>.25&&phase<.65?Math.sin((phase-.25)/.4*Math.PI)*7:0;
  const drift=motion?time:0;
  const hover=motion?(battle.id==='ghost'?Math.sin(drift*1.1)*4:battle.id==='bat'?Math.sin(drift*1.9)*5:battle.id==='vampire'?Math.sin(drift*.8):0):0;
  glow(c,px,py-heroSize*.35,heroSize*.8,'#edc47620');glow(c,ex,ey-enemySize*.4,enemySize*.8,won?'#efd79735':'#9b84b82b');
  ellipse(c,px,py+3,heroSize*.24,Math.max(6,heroSize*.035),'#05050cb3');ellipse(c,ex,ey+5,enemySize*.29,Math.max(7,enemySize*.035),'#080510b3');
  ring(c,px,py+5,Math.min(w*.16,95),12,'#e8c48855');ring(c,ex,ey+6,Math.min(w*.2,140),16,won?'#f7dc9766':'#ba9fd54a');
  if(battle.status==='playing'&&intent.damage>=3){
    const radius=Math.min(w*.17,110);ring(c,ex,ey+5,radius,14,'#bda2d858');
    if(motion)for(let i=0;i<3;i++){const a=drift*.55+i*Math.PI*2/3;ellipse(c,ex+Math.cos(a)*radius,ey+Math.sin(a)*13,2,2,'#d4b9ef88');}
  }
  const hero=playerPose(art,'right',motion&&((shine&&seq.lunge>0)||(attack&&phase<.38)),phase*12);
  const casting=shine&&motion&&age<.86;
  if(!drawArtSprite(c,hero,px+lunge,py,heroSize,{rotation:casting?-.035*seq.charge:0,scaleY:casting?1-.025*seq.charge:1}))heroFallback(c,px+lunge,py,heroSize);
  const breathing=motion?1+Math.sin(drift*(battle.id==='franken'?.55:1.15))*.004:1;
  const rotation=motion?(battle.id==='bat'?Math.sin(drift*1.9)*.018:battle.id==='ghost'?Math.sin(drift*.8)*.01:0):0;
  if(!drawArtSprite(c,enemy,ex+recoil,ey+hover,enemySize,{alpha:won?.92:1,flip:enemy?.flip,rotation,scaleY:breathing}))drawCreature(c,battle.id,ex+recoil,ey-enemySize*.45+hover,enemySize/75);
  if(effect&&age<battleEffectDuration(effect.type,motion)){
    if(shine)shineEffect(c,{px,py,ex,ey,heroSize,enemySize,w,h,age,motion,seq});
    const sx=px+heroSize*.18,sy=py-heroSize*.48,tx=ex,ty=ey-enemySize*.48;
    if(motion&&attack&&age<.6){
      const t=clamp(age/.45);c.save();c.translate(sx+(tx-sx)*t,sy+(ty-sy)*t);c.rotate(-.8+t*1.6);c.strokeStyle='#f4d3a5aa';c.lineWidth=4;c.beginPath();c.arc(0,0,Math.min(34,h*.1),-.9,.9);c.stroke();c.restore();
    }
    if(motion&&attack&&age>.3&&age<.75){
      const burst=clamp((age-.3)/.45);for(let n=0;n<7;n++){const a=n*Math.PI*2/7;c.strokeStyle=`rgba(241,209,152,${(1-burst)*.7})`;c.lineWidth=2;c.beginPath();c.moveTo(tx+Math.cos(a)*burst*12,ty+Math.sin(a)*burst*12);c.lineTo(tx+Math.cos(a)*(12+burst*24),ty+Math.sin(a)*(12+burst*24));c.stroke();}
    }
    if(guard){c.save();c.translate(px,py-heroSize*.45);c.strokeStyle='#b1e9d4aa';c.fillStyle='#5da99727';c.lineWidth=2;c.beginPath();c.ellipse(0,0,heroSize*.33,heroSize*.51,0,0,Math.PI*2);c.fill();c.stroke();c.restore();}
    if(age>(shine&&motion?1.28:.18))label(c,guard?'守り · 灯り＋1':`${effect.weakness?'好機 ':''}影 −${effect.damage||1}`,w<=180?w/2:guard?px:ex,Math.max(w<=180?70:58,(guard?py-heroSize:ey-enemySize)-(motion?Math.min(15,(age-(shine&&motion?1.28:.18))*22):0)),guard?'#c1eedb':'#ffe0a6',w<500?12:16,'center',w<=180?w-16:null);
    const counterStart=shine?1.9:.68;
    if(motion&&offensive&&!won&&effect.retaliation>0&&age>counterStart){
      const t=clamp((age-counterStart)/.4),x=ex+(px-ex)*t,y=ty+(sy-ty)*t;glow(c,x,y,16,'#b9a2e25c');ellipse(c,x,y,3,3,'#cdb8ea');if(age>counterStart+.27)label(c,`勇気 −${effect.retaliation}`,w<=180?w/2:px,py-heroSize*.57,'#e2c5dc',w<500?12:15,'center',w<=180?w-16:null);
    }
  }
  const small=w<500,tiny=w<=180;
  if(!tiny||won)label(c,won?'灯を取り戻した':story?.location||'宮殿の住人',tiny?w/2:16,26,won?'#f4d897':'#e5d4b6',small?11:14,tiny?'center':'left',tiny?w-16:null);
  if(!tiny||!won)label(c,won?'MEMORY RESTORED':battle.status==='rest'?'ひと休み':`TURN ${battle.turn+1}`,tiny?w/2:w-16,26,'#d0c1d6',small?10:12,tiny?'center':'right',tiny?w-16:null);
  if(won){
    const dawn=c.createLinearGradient(0,0,w,0);dawn.addColorStop(0,'#e0b25a00');dawn.addColorStop(.5,'#e5ba6d0c');dawn.addColorStop(1,'#f9d9a21a');c.fillStyle=dawn;c.fillRect(0,40,w,h-40);
    label(c,story?.keepsake||'キャンディのしるし',w/2,h-12,'#f6deb3',small?12:16,'center',w-16);
  }else{label(c,'無名S note',tiny?w/2:px,h-12,'#ead6aa',small?10:12,'center',tiny?w-16:null);if(!tiny)label(c,story?.role||'宮殿の住人',ex,h-12,'#e2d7e8',small?10:12);}
  c.strokeStyle='#d8ad6866';c.lineWidth=1;c.strokeRect(.5,.5,w-1,h-1);
}
