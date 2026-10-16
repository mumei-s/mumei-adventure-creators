import {drawArtSprite,playerPose} from './rpg-art.js?v=20261016-creator-rpg1';
import {drawCreature} from './stage-2d.js?v=20261016-creator-rpg1';
import {prankFor} from './encounter-model.js?v=20261016-creator-rpg1';
import {encounterStory} from './story-model.js?v=20261016-creator-rpg1';
const clamp=x=>Math.max(0,Math.min(1,x));
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function label(c,text,x,y,color,size=18,align='center'){c.font=`600 ${size}px "Yu Gothic",sans-serif`;c.textAlign=align;c.lineJoin='round';c.lineWidth=4;c.strokeStyle='#111421';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);}
function ring(c,x,y,rx,ry,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.stroke();}
function spriteAspect(sprite){return sprite?(sprite.frame?.[2]||sprite.width)/(sprite.frame?.[3]||sprite.height):.75;}
export function battleLayout(width,height,{enemyAspect=.75}={}){
  const w=Math.max(1,width),h=Math.max(1,height),safeAspect=Number.isFinite(enemyAspect)&&enemyAspect>0?enemyAspect:.75;
  return {px:w*.24,py:h*.87,ex:w*.73,ey:h*.87,heroSize:Math.min(h*.62,w*.39,310),enemySize:Math.min(h*.74,w*.46/safeAspect,370)};
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
  const won=battle.status==='won',enemy=art.images[battle.id],story=encounterStory(battle.id),intent=prankFor(battle);
  const {px,py,ex,ey,heroSize,enemySize}=battleLayout(w,h,{enemyAspect:spriteAspect(enemy)});
  const age=effect?Math.max(0,time-effect.started):99,phase=motion?age:99;
  const shine=effect?.type==='shine',attack=effect?.type==='attack',guard=effect?.type==='guard';
  const offensive=shine||attack;
  const lunge=offensive&&phase<.38?Math.sin(phase/.38*Math.PI)*(attack?Math.min(w*.05,30):10):0;
  const recoil=offensive&&phase>.25&&phase<.65?Math.sin((phase-.25)/.4*Math.PI)*7:0;
  const drift=motion?time:0;
  const hover=motion?(battle.id==='ghost'?Math.sin(drift*1.1)*4:battle.id==='bat'?Math.sin(drift*1.9)*5:battle.id==='vampire'?Math.sin(drift*.8):0):0;
  glow(c,px,py-heroSize*.35,heroSize*.8,'#edc47620');glow(c,ex,ey-enemySize*.4,enemySize*.8,won?'#efd79735':'#9b84b82b');
  ellipse(c,px,py+3,heroSize*.24,Math.max(6,heroSize*.035),'#05050cb3');ellipse(c,ex,ey+5,enemySize*.29,Math.max(7,enemySize*.035),'#080510b3');
  ring(c,px,py+5,Math.min(w*.16,95),12,'#e8c48855');ring(c,ex,ey+6,Math.min(w*.2,140),16,won?'#f7dc9766':'#ba9fd54a');
  if(battle.status==='playing'&&intent.damage>=3){
    const radius=Math.min(w*.17,110);ring(c,ex,ey+5,radius,14,'#bda2d858');
    if(motion)for(let i=0;i<3;i++){const a=drift*.55+i*Math.PI*2/3;ellipse(c,ex+Math.cos(a)*radius,ey+Math.sin(a)*13,2,2,'#d4b9ef88');}
  }
  const hero=playerPose(art,'right',motion&&offensive&&phase<.38,phase*12);
  if(!drawArtSprite(c,hero,px+lunge,py,heroSize))heroFallback(c,px+lunge,py,heroSize);
  const breathing=motion?1+Math.sin(drift*(battle.id==='franken'?.55:1.15))*.004:1;
  const rotation=motion?(battle.id==='bat'?Math.sin(drift*1.9)*.018:battle.id==='ghost'?Math.sin(drift*.8)*.01:0):0;
  if(!drawArtSprite(c,enemy,ex+recoil,ey+hover,enemySize,{alpha:won?.92:1,rotation,scaleY:breathing}))drawCreature(c,battle.id,ex+recoil,ey-enemySize*.45+hover,enemySize/75);
  if(effect&&motion&&age<1.2){
    const sx=px+heroSize*.18,sy=py-heroSize*.48,tx=ex,ty=ey-enemySize*.48;
    if(shine&&age<.6){
      const t=clamp(age/.38),x=sx+(tx-sx)*t,y=sy+(ty-sy)*t-Math.sin(t*Math.PI)*22;
      c.strokeStyle='#efc17388';c.lineWidth=3;c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+tx)/2,sy-32,x,y);c.stroke();glow(c,x,y,22,'#ffce7c80');ellipse(c,x,y,5,5,'#ffebba');
    }
    if(attack&&age<.6){
      const t=clamp(age/.45);c.save();c.translate(sx+(tx-sx)*t,sy+(ty-sy)*t);c.rotate(-.8+t*1.6);c.strokeStyle='#f4d3a5aa';c.lineWidth=4;c.beginPath();c.arc(0,0,Math.min(34,h*.1),-.9,.9);c.stroke();c.restore();
    }
    if(offensive&&age>.3&&age<.75){
      const burst=clamp((age-.3)/.45);for(let n=0;n<7;n++){const a=n*Math.PI*2/7;c.strokeStyle=`rgba(241,209,152,${(1-burst)*.7})`;c.lineWidth=2;c.beginPath();c.moveTo(tx+Math.cos(a)*burst*12,ty+Math.sin(a)*burst*12);c.lineTo(tx+Math.cos(a)*(12+burst*24),ty+Math.sin(a)*(12+burst*24));c.stroke();}
    }
    if(guard){c.save();c.translate(px,py-heroSize*.45);c.strokeStyle='#b1e9d4aa';c.fillStyle='#5da99727';c.lineWidth=2;c.beginPath();c.ellipse(0,0,heroSize*.33,heroSize*.51,0,0,Math.PI*2);c.fill();c.stroke();c.restore();}
    if(age>.38)label(c,guard?'守り · 灯り＋1':`${effect.weakness?'好機 ':''}影 −${effect.damage||1}`,guard?px:ex,Math.max(58,(guard?py-heroSize:ey-enemySize)-Math.min(15,(age-.38)*22)),guard?'#c1eedb':'#ffe0a6',w<500?12:16);
    if(offensive&&!won&&effect.retaliation>0&&age>.68){
      const t=clamp((age-.68)/.4),x=ex+(px-ex)*t,y=ty+(sy-ty)*t;glow(c,x,y,16,'#b9a2e25c');ellipse(c,x,y,3,3,'#cdb8ea');if(age>.95)label(c,`勇気 −${effect.retaliation}`,px,py-heroSize*.57,'#e2c5dc',w<500?12:15);
    }
  }
  const small=w<500;
  label(c,won?'灯を取り戻した':story?.location||'宮殿の住人',16,26,won?'#f4d897':'#e5d4b6',small?11:14,'left');
  label(c,won?'MEMORY RESTORED':battle.status==='rest'?'ひと休み':`TURN ${battle.turn+1}`,w-16,26,'#d0c1d6',small?10:12,'right');
  if(won){
    const dawn=c.createLinearGradient(0,0,w,0);dawn.addColorStop(0,'#e0b25a00');dawn.addColorStop(.5,'#e5ba6d0c');dawn.addColorStop(1,'#f9d9a21a');c.fillStyle=dawn;c.fillRect(0,40,w,h-40);
    label(c,story?.keepsake||'キャンディのしるし',w/2,h-12,'#f6deb3',small?12:16);
  }else{label(c,'宮殿の主',px,h-12,'#ead6aa',small?10:12);label(c,story?.role||'宮殿の住人',ex,h-12,'#e2d7e8',small?10:12);}
  c.strokeStyle='#d8ad6866';c.lineWidth=1;c.strokeRect(.5,.5,w-1,h-1);
}
