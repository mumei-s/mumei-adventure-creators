import {battleCinematicCue,drawBattleCinematicBackground,drawBattleCinematicForeground,drawBattleArenaArtwork} from './battle-cinematic-2d.js?v=20261030-sprite1';
import {monsterSprite} from './monster-motion.js?v=20261019-unified1';
import {drawArtSprite,playerPose} from './rpg-art.js?v=20261019-unified1';
import {drawCreature} from './stage-2d.js?v=20261030-actions1';
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
function shineEffect(c,{w,h,age,motion}){
 if(!motion){label(c,'灯の必殺技',w/2,Math.max(49,h*.16),'#ffe3a2',w<500?14:20,'center',w-16);return;}
 if(age>=.5&&age<1.86){c.save();c.globalAlpha=Math.min(1,(age-.5)*5)*(age>1.86?1-clamp((age-1.86)/.54):1);label(c,'灯の必殺技',w/2,Math.max(49,h*.16),'#ffe3a2',w<500?15:23,'center',w-16);c.restore();}
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
  if(bg){drawBattleArenaArtwork(c,bg,{w,h,clock:motion?time:0,depth:.55,anchor:.42});}else{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#102838');g.addColorStop(1,'#342437');c.fillStyle=g;c.fillRect(0,0,w,h);}
  const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#070b19c9');shade.addColorStop(.26,'#080f1b2b');shade.addColorStop(.7,'#090d1c11');shade.addColorStop(1,'#080b17d9');c.fillStyle=shade;c.fillRect(0,0,w,h);
  const effectAge=effect?Math.max(0,time-effect.started):99;
  const won=battle.status==='won'&&!(effect?.type==='shine'&&motion&&effectAge<1.28),enemy=monsterSprite(art,battle.id,{time,motion,battle:true,facing:'left'}),story=encounterStory(battle.id),intent=prankFor(battle);
  const {px,py,ex,ey,heroSize,enemySize}=battleLayout(w,h,{enemyAspect:spriteAspect(enemy)});
  const age=effect?Math.max(0,time-effect.started):99,phase=motion?age:99;
  const shine=effect?.type==='shine',attack=effect?.type==='attack',guard=effect?.type==='guard';
  const offensive=shine||attack;
  const seq=shineSequence(age,motion);
  const cinematic=battleCinematicCue({action:effect?.type,age,duration:battleEffectDuration(effect?.type,true),retaliation:effect?.retaliation||0,victory:won,motion,scope:'maze'}),arena={w,h,heroX:px,enemyX:ex,floorY:py,heroSize,enemySize,images:art.images};
  drawBattleCinematicBackground(c,arena,cinematic,time);
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
    if(age>(shine&&motion?1.28:.18))label(c,guard?'守り · 灯り＋1':`${effect.weakness?'好機 ':''}影 −${effect.damage||1}`,w<=180?w/2:guard?px:ex,Math.max(w<=180?70:58,(guard?py-heroSize:ey-enemySize)-(motion?Math.min(15,(age-(shine&&motion?1.28:.18))*22):0)),guard?'#c1eedb':'#ffe0a6',w<500?12:16,'center',w<=180?w-16:null);
    const counterStart=shine?1.9:.68;
    if(motion&&offensive&&!won&&effect.retaliation>0&&age>counterStart){
      if(age>counterStart+.27)label(c,`勇気 −${effect.retaliation}`,w<=180?w/2:px,py-heroSize*.57,'#e2c5dc',w<500?12:15,'center',w<=180?w-16:null);
    }
  }
  drawBattleCinematicForeground(c,arena,cinematic);
  const small=w<500,tiny=w<=180;
  if(!tiny||won)label(c,won?'灯を取り戻した':story?.location||'宮殿の住人',tiny?w/2:16,26,won?'#f4d897':'#e5d4b6',small?11:14,tiny?'center':'left',tiny?w-16:null);
  if(!tiny||!won)label(c,won?'MEMORY RESTORED':battle.status==='rest'?'ひと休み':`TURN ${battle.turn+1}`,tiny?w/2:w-16,26,'#d0c1d6',small?10:12,tiny?'center':'right',tiny?w-16:null);
  if(won){
    const dawn=c.createLinearGradient(0,0,w,0);dawn.addColorStop(0,'#e0b25a00');dawn.addColorStop(.5,'#e5ba6d0c');dawn.addColorStop(1,'#f9d9a21a');c.fillStyle=dawn;c.fillRect(0,40,w,h-40);
    label(c,story?.keepsake||'キャンディのしるし',w/2,h-12,'#f6deb3',small?12:16,'center',w-16);
  }else{label(c,'無名S note',tiny?w/2:px,h-12,'#ead6aa',small?10:12,'center',tiny?w-16:null);if(!tiny)label(c,story?.role||'宮殿の住人',ex,h-12,'#e2d7e8',small?10:12);}
  c.strokeStyle='#d8ad6866';c.lineWidth=1;c.strokeRect(.5,.5,w-1,h-1);
}
