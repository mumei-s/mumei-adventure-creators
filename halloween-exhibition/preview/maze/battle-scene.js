import {drawArtSprite,playerPose} from './rpg-art.js?v=20261014-adventure2';
import {drawCreature} from './stage-2d.js?v=20261014-adventure2';
const clamp=x=>Math.max(0,Math.min(1,x));
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function label(c,text,x,y,color,size=18){c.font=`700 ${size}px "Yu Gothic",sans-serif`;c.textAlign='center';c.fillStyle='#16101b';c.lineWidth=4;c.strokeStyle='#16101b';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);}
export function renderBattleScene({canvas,art,battle,effect=null,time=0,motion=true,pixelRatio=1}){
  const c=canvas.getContext('2d'),w=canvas.width/pixelRatio,h=canvas.height/pixelRatio;
  c.setTransform(pixelRatio,0,0,pixelRatio,0,0);c.clearRect(0,0,w,h);
  const bg=art.images.battle;
  if(bg){const scale=Math.max(w/bg.width,h/bg.height);c.drawImage(bg,(w-bg.width*scale)/2,(h-bg.height*scale)/2,bg.width*scale,bg.height*scale);}else{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#102838');g.addColorStop(1,'#342437');c.fillStyle=g;c.fillRect(0,0,w,h);}
  const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#0908171a');shade.addColorStop(.7,'#080e1800');shade.addColorStop(1,'#08091799');c.fillStyle=shade;c.fillRect(0,0,w,h);
  const px=w*.24,py=h*.83,ex=w*.72,ey=h*.72,heroSize=Math.min(h*.57,128),enemySize=Math.min(h*.65,150);
  const age=effect?Math.max(0,time-effect.started):99,phase=motion?age:99;
  const attack=effect?.type==='shine',guard=effect?.type==='guard';
  const lunge=attack&&phase<.35?Math.sin(phase/.35*Math.PI)*9:0;
  const recoil=attack&&phase>.25&&phase<.65?Math.sin((phase-.25)/.4*Math.PI)*7:0;
  const hover=motion?(battle.id==='franken'?Math.abs(Math.sin(time*.65))*1.1:battle.id==='zombie'?Math.abs(Math.sin(time*.8))*.8:battle.id==='vampire'?Math.sin(time*.9)*1.3:Math.sin(time*1.7)*2):0;
  glow(c,px,py-heroSize*.4,heroSize,'#edc47630');glow(c,ex,ey-enemySize*.4,enemySize,'#9f7fe02e');
  ellipse(c,px,py+3,heroSize*.29,8,'#06060ba6');ellipse(c,ex,ey+4,enemySize*.37,10,'#08051099');
  const hero=playerPose(art,'right',motion&&attack&&phase<.35,phase*12);
  if(!drawArtSprite(c,hero,px+lunge,py,heroSize)){drawCreature(c,'ghost',px,py-30,.8);}
  const won=battle.status==='won';
  const alpha=won&&phase>.9?.72:1;
  if(!drawArtSprite(c,art.images[battle.id],ex+recoil,ey+hover,enemySize,{alpha,rotation:motion?Math.sin(time*(battle.id==='zombie'?.8:1.2))*(battle.id==='zombie'?.025:.012):0}))drawCreature(c,battle.id,ex+recoil,ey-35+hover,enemySize/75);
  if(effect&&motion&&age<1.2){
    if(attack&&age<.58){const t=clamp(age/.38),sx=px+heroSize*.23,sy=py-heroSize*.5,tx=ex,ty=ey-enemySize*.46,x=sx+(tx-sx)*t,y=sy+(ty-sy)*t-Math.sin(t*Math.PI)*17;
      c.strokeStyle='#efc17399';c.lineWidth=3;c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+tx)/2,sy-28,x,y);c.stroke();glow(c,x,y,24,'#ffce7ca6');ellipse(c,x,y,5,5,'#fff2bd');
      if(age>.3){const burst=clamp((age-.3)/.28);for(let n=0;n<9;n++){const a=n*Math.PI*2/9;c.strokeStyle=`rgba(255,210,133,${(1-burst)*.8})`;c.lineWidth=2;c.beginPath();c.moveTo(tx+Math.cos(a)*burst*12,ty+Math.sin(a)*burst*12);c.lineTo(tx+Math.cos(a)*(12+burst*24),ty+Math.sin(a)*(12+burst*24));c.stroke();}}
    }
    if(guard){c.save();c.translate(px,py-heroSize*.42);c.strokeStyle='#b1e9d4';c.fillStyle='#5da99736';c.lineWidth=3;c.beginPath();c.ellipse(0,0,heroSize*.39,heroSize*.54,0,0,Math.PI*2);c.fill();c.stroke();c.restore();label(c,'GUARD',px,py-heroSize-9,'#b4e8d9',14);}
    if(age>.42)label(c,guard?'光をためた':`−${effect.damage||1}`,guard?px:ex,(guard?py-heroSize:ey-enemySize)-Math.min(18,(age-.42)*25),guard?'#b9ebd1':'#ffe0a6',16);
    if(attack&&!won&&effect.retaliation!==0&&age>.68){const t=clamp((age-.68)/.4),x=ex+(px-ex)*t,y=ey-enemySize*.5+(py-heroSize*.45-(ey-enemySize*.5))*t;glow(c,x,y,19,'#b9a2e273');ellipse(c,x,y,4,4,'#cdb8ea');}
  }
  if(won){label(c,'TRICK TAMED',w/2,27,'#efd092',17);if(motion)for(let i=0;i<8;i++){const a=i*2.4+time*.25,x=w/2+Math.sin(a)*w*.3,y=45+(i*31%Math.max(30,h-70));ellipse(c,x,y,2,2,'#e0bc7155');}}
  c.strokeStyle='#d8ad6877';c.lineWidth=1;c.strokeRect(.5,.5,w-1,h-1);
}
