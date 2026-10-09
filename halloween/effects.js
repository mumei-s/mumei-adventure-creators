import {decorationProfile} from './decoration-effects.js?v=28.4.5';
import {studioAppearance,refreshNightStudio} from './night-studio.js?v=28.4.5';
import {createSpells} from './spells.js?v=28.4.5';
import {nightIcons} from './halloween-icons.js?v=28.4.5';
export function setupEffects(){
 let appearanceKey='';
 function refresh(){const appearance=studioAppearance(document.body.dataset.collection,document.body.dataset.lights),daily=appearance.everyday,key=(daily?'everyday':'halloween')+':'+document.body.dataset.lights;if(appearanceKey&&appearanceKey!==key)stopGame();appearanceKey=key;for(const id of ['play-ghosts','ghost-title'])document.getElementById(id).textContent=appearance.gameTitle;document.getElementById('ghost-arena')?.setAttribute('aria-label',daily?'身近なモチーフをあつめる場所':'Halloweenの仲間をあつめる場所');document.getElementById('spell-status').textContent=decorationProfile(document.body.dataset.decoration,daily).status;document.querySelectorAll('#magic-scene .ornament').forEach((n,i)=>{n.innerHTML=appearance.icons[i];n.setAttribute('aria-label',appearance.labels[i]+'の飾りで遊ぶ');});const creatures=document.querySelector('.night-creatures');if(creatures){creatures.replaceChildren();if(!daily)for(const icon of nightIcons.slice(0,3)){const n=document.createElement('i');n.innerHTML=icon;creatures.append(n);}}refreshNightStudio();}
 const creatures=document.createElement('div');creatures.className='night-creatures';creatures.setAttribute('aria-hidden','true');document.querySelector('.studio-hero')?.append(creatures);
 refresh();
 const layer=document.createElement('div');layer.id='effect-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
 const canvas=document.createElement('canvas');canvas.id='magic-sky';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);const ctx=canvas.getContext('2d');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),active=()=>document.body.dataset.motion==='on'&&!reduced.matches&&!document.hidden;
 const spells=createSpells({layer,active});
 let frame=0,last=0,w=0,h=0,pointerAt=0,score=0,time=0,timer=0;
 const motes=Array.from({length:48},(_,i)=>({x:Math.random(),y:Math.random(),r:2+i%4,v:.000012+(i%4)*.000006}));
 function resize(){w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=w*d;canvas.height=h*d;ctx?.setTransform(d,0,0,d,0,0);}resize();addEventListener('resize',resize,{passive:true});
 function drawMote(x,y,p,i,t,profile){
  const r=p.r,phase=t*.0007+i;ctx.save();ctx.translate(x,y);
  if(profile.shape==='star'){ctx.rotate(Math.sin(phase)*.2);ctx.beginPath();ctx.moveTo(-r*2,0);ctx.quadraticCurveTo(0,0,0,-r*2);ctx.quadraticCurveTo(0,0,r*2,0);ctx.quadraticCurveTo(0,0,0,r*2);ctx.quadraticCurveTo(0,0,-r*2,0);ctx.fill();}
  else if(profile.shape==='petal'){ctx.rotate(phase);ctx.beginPath();ctx.ellipse(0,0,r*1.8,r*.8,Math.PI/4,0,Math.PI*2);ctx.fill();}
  else{ctx.rotate(-.3);ctx.beginPath();ctx.moveTo(0,-r*2.2);ctx.lineTo(r*1.5,0);ctx.lineTo(0,r*2.2);ctx.lineTo(-r*1.5,0);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(0,-r*2.2);ctx.lineTo(0,r*2.2);ctx.moveTo(-r*1.5,0);ctx.lineTo(r*1.5,0);ctx.stroke();}
  ctx.restore();
 }
 function paint(t){frame=0;if(!active()||!ctx)return;if(t-last>34){last=t;ctx.clearRect(0,0,w,h);const daily=document.body.dataset.collection==='everyday',profile=decorationProfile(document.body.dataset.decoration,daily),points=[];
  motes.forEach((p,i)=>{if(document.body.dataset.lights!=='night'&&i>=24)return;const fall=profile.motion==='fall';p.y+=(fall?1:-1)*p.v*34;if(p.y<-.05)p.y=1.05;if(p.y>1.05)p.y=-.05;let x=p.x*w+Math.sin(t*.0004+i)*(fall?45:22),y=p.y*h;
   if(profile.motion==='orbit'){x+=Math.cos(t*.0002+i)*28;y+=Math.sin(t*.0002+i)*28;}
   ctx.fillStyle=profile.colors[i%4];ctx.globalAlpha=document.body.dataset.lights==='night'?.28+.34*(1+Math.sin(t*.001+i))/2:.12+.19*(1+Math.sin(t*.001+i))/2;drawMote(x,y,p,i,t,profile);points.push({x,y});
   if(profile.shape==='prism'&&i%6===0){ctx.strokeStyle=profile.colors[i%4];ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-28,y+15);ctx.lineTo(x+35,y-22);ctx.stroke();}
  });
  if(profile.shape==='star'){ctx.strokeStyle=profile.colors[0];ctx.globalAlpha=.13;ctx.lineWidth=.6;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(Math.hypot(a.x-b.x,a.y-b.y)<160){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}}
  ctx.globalAlpha=1;}frame=requestAnimationFrame(paint);
 }
 function sync(){spells.stop();cancelAnimationFrame(frame);frame=0;layer.replaceChildren();if(ctx)ctx.clearRect(0,0,w,h);if(active())frame=requestAnimationFrame(paint);else stopGame();}
 function burst(x,y,big=false){if(!active())return;const host=[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;if(layer.parentElement!==host)host.append(layer);const profile=decorationProfile(document.body.dataset.decoration,document.body.dataset.collection==='everyday'),count=big?22:10;
  for(let i=0;i<count;i++){const spark=document.createElement('i');spark.className='fx-'+profile.shape;spark.style.left=x+'px';spark.style.top=y+'px';spark.style.setProperty('--spark-color',profile.colors[i%4]);layer.append(spark);const angle=Math.PI*2*i/count,radius=(big?155:70)+(i%3)*18;
   let dx=Math.cos(angle)*radius,dy=Math.sin(angle)*radius;if(profile.motion==='fall'){dx=Math.sin(i)*radius;dy=radius*.8+30;}else if(profile.motion==='rise'){dx=Math.cos(angle)*radius*.8;dy=-Math.abs(Math.sin(angle)*radius)-40;}
   const a=spark.animate([{opacity:1,transform:'translate(-50%,-50%) scale(.5)'},{opacity:0,transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) rotate('+i*(profile.shape==='petal'?75:20)+'deg) scale(1.8)'}],{duration:big?1150:700,easing:'cubic-bezier(.18,.68,.2,1)'});a.finished.catch(()=>{}).finally(()=>spark.remove());
  }while(layer.children.length>66)layer.firstElementChild.remove();
 }
 document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button||button.disabled)return;const box=button.getBoundingClientRect();burst(e.clientX||box.left+box.width/2,e.clientY||box.top+box.height/2,button.id==='generate'||button.id==='propose');});
 document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||!active()||performance.now()-pointerAt<110||e.target.closest('input,textarea'))return;pointerAt=performance.now();const star=document.createElement('i');const profile=decorationProfile(document.body.dataset.decoration,document.body.dataset.collection==='everyday');star.className='fx-'+profile.shape;star.style.setProperty('--spark-color',profile.colors[Math.floor(pointerAt/110)%4]);star.style.left=e.clientX+'px';star.style.top=e.clientY+'px';const host=[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;if(layer.parentElement!==host)host.append(layer);layer.append(star);star.animate([{opacity:.9,transform:'scale(1.4)'},{opacity:0,transform:'translateY(-28px) scale(.1)'}],{duration:600}).finished.catch(()=>{}).finally(()=>star.remove());},{passive:true});
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('entered');observer.unobserve(entry.target);}),{threshold:.12});document.querySelectorAll('.desk,.stage,.mode-panel,.history-section,.direction-card,.playground').forEach(e=>observer.observe(e));
 const game=document.getElementById('ghost-game'),arena=document.getElementById('ghost-arena'),status=document.getElementById('ghost-status');
 function stopGame(){clearInterval(timer);timer=0;arena?.replaceChildren();}
 function moveGhost(b){b.style.left=(8+Math.random()*72)+'%';b.style.top=(8+Math.random()*60)+'%';b.style.setProperty('--float-delay',(-Math.random()*3)+'s');}
 function startGame(){stopGame();const appearance=studioAppearance(document.body.dataset.collection,document.body.dataset.lights),item=appearance.item;if(!active()){status.textContent='演出をONにすると遊べます。';return;}score=0;time=20;status.textContent='残り20秒 ／ '+item+'0個';for(let i=0;i<4;i++){const b=document.createElement('button');b.className='ghost-target';b.innerHTML=appearance.gameIcons[i];b.setAttribute('aria-label',appearance.gameLabels[i]+(appearance.everyday?'をあつめる':'をつかまえる'));moveGhost(b);b.onclick=()=>{score++;status.textContent='残り'+time+'秒 ／ '+item+score+'個';moveGhost(b);};arena.append(b);}timer=setInterval(()=>{time--;status.textContent='残り'+time+'秒 ／ '+item+score+'個';if(time<=0){stopGame();status.textContent=item+score+'個！もう一度、遊んでみる？';burst(innerWidth/2,innerHeight*.4,true);}},1000);}
 document.getElementById('play-ghosts')?.addEventListener('click',()=>{game.showModal();startGame();});document.getElementById('ghost-restart')?.addEventListener('click',startGame);game?.addEventListener('close',stopGame);
 document.getElementById('play-spell')?.addEventListener('click',()=>spells.cast());document.querySelectorAll('#magic-scene .ornament').forEach((b,i)=>b.addEventListener('click',()=>spells.cast(i===0?6:i===1?4:i===2?3:2)));

 const appearanceObserver=new MutationObserver(()=>refresh());appearanceObserver.observe(document.body,{attributes:true,attributeFilter:['data-decoration','data-collection','data-lights']});
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);sync();
 return {sync,refresh,celebrate(){burst(innerWidth/2,innerHeight*.35,true);}};
}
