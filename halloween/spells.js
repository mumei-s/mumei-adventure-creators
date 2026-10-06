import {icons} from './halloween-icons.js?v=10';
export const studioIcons=[
 '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="m32 3 8 20 21 9-21 9-8 20-9-20L3 32l20-9Z" fill="#ffdc75" stroke="#8350a8" stroke-width="2"/><circle cx="32" cy="32" r="7" fill="#fff8dd"/></svg>',
 '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g fill="#eda6ca" stroke="#7758a5" stroke-width="2"><ellipse cx="32" cy="16" rx="10" ry="14"/><ellipse cx="48" cy="32" rx="14" ry="10"/><ellipse cx="32" cy="48" rx="10" ry="14"/><ellipse cx="16" cy="32" rx="14" ry="10"/></g><circle cx="32" cy="32" r="11" fill="#ffdb65"/></svg>',
 '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="32" rx="31" ry="11" fill="none" stroke="#ffda78" stroke-width="4" transform="rotate(-24 32 32)"/><circle cx="32" cy="32" r="19" fill="#84cfdf"/><path d="M16 32q17 10 33 0M20 23q12 6 25 0" fill="none" stroke="#7253a5" stroke-width="3"/></svg>',
 '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M8 47 43 9q8-8 13 0t-1 14L22 55Z" fill="#ba88d9" stroke="#493068" stroke-width="2"/><path d="m8 47-4 14 18-6Z" fill="#f4c78c"/><path d="m4 61 4-8 5 5Z" fill="#493068"/><path d="m43 9 12 14" stroke="#fff0cc" stroke-width="4"/></svg>'
];
export function createSpells({layer,active}){
 let last=-1,sequence=0,bag=[];const animations=new Set();
 const names=['星のシャワー','オーロラのリボン','しゃぼん玉の噴水','小さな銀河','墨の花びら','紙吹雪のパレード','仲間たちの大行進'];
 function animate(node,frames,options){layer.append(node);const a=node.animate(frames,options);animations.add(a);a.finished.catch(()=>{}).finally(()=>{animations.delete(a);node.remove();});}
 function cast(force){if(!active())return null;const everyday=document.body.dataset.collection==='everyday',set=everyday?studioIcons:icons;animations.forEach(a=>a.cancel());animations.clear();if(!bag.length){bag=names.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}}let kind=force??bag.pop();if(force===undefined&&kind===last)kind=(kind+1)%names.length;last=kind;sequence++;document.getElementById('play-spell').dataset.spell=String(kind);document.getElementById('spell-status').textContent=names[kind]+' ✦ '+sequence+'回目';const host=document.body;if(layer.parentElement!==host)host.append(layer);const w=innerWidth,h=innerHeight;
  const count=kind===1?5:kind===3?12:kind===6?10:30;
  for(let i=0;i<count;i++){
   const n=document.createElement('i');n.className='spell-piece spell-kind-'+kind;const colors=everyday?['#5dcdda','#ec8ec3','#ffcd69','#a78aef']:['#ff9b2c','#ffc653','#a063ef','#ee71ac'];n.style.setProperty('--spell-color',colors[i%4]);const x=Math.random()*w,y=Math.random()*h;
   let frames,duration=1700+Math.random()*900;
   if(kind===0){n.textContent='✦';n.style.left=x+'px';n.style.top='-50px';frames=[{transform:'translate(0,0) rotate(0)',opacity:0},{offset:.15,opacity:1},{transform:'translate('+(-w*.18)+'px,'+(h+100)+'px) rotate(240deg)',opacity:0}];}
   else if(kind===1){n.style.left=(i*w/5)+'px';n.style.top=(h*.2+i*35)+'px';frames=[{transform:'translateX(-'+w+'px) rotate(-25deg) scaleX(.3)',opacity:0},{offset:.4,opacity:.8},{transform:'translateX('+w+'px) rotate(35deg) scaleX(1.3)',opacity:0}];}
   else if(kind===2){n.style.left=(w/2)+'px';n.style.top=h+'px';frames=[{transform:'translate(-50%,0) scale(.2)',opacity:0},{offset:.2,opacity:.9},{transform:'translate('+((x-w/2))+'px,-'+(h*.5+Math.random()*h*.5)+'px) scale(1.5)',opacity:0}];}
   else if(kind===3){const angle=i*Math.PI*2/count,r=Math.min(w,h)*.35;n.innerHTML=set[2];n.style.left=w/2+'px';n.style.top=h*.4+'px';frames=[{transform:'translate(-50%,-50%) scale(.1)',opacity:0},{offset:.4,transform:'translate('+Math.cos(angle)*r+'px,'+Math.sin(angle)*r+'px) scale(1)',opacity:1},{transform:'translate('+Math.cos(angle+1.6)*r+'px,'+Math.sin(angle+1.6)*r+'px) scale(.2)',opacity:0}];}
   else if(kind===4){n.style.left=x+'px';n.style.top=y+'px';frames=[{transform:'scale(0) rotate(0)',opacity:0},{offset:.45,transform:'scale(1.8) rotate(45deg)',opacity:.75},{transform:'scale(2.6) rotate(140deg)',opacity:0}];}
   else if(kind===5){n.style.left=x+'px';n.style.top='-40px';frames=[{transform:'translateY(0) rotate(0)',opacity:0},{offset:.15,opacity:1},{transform:'translate('+Math.sin(i)*80+'px,'+(h+80)+'px) rotate('+(i%2?-660:720)+'deg)',opacity:0}];}
   else{n.innerHTML=set[i%set.length];n.style.left='-80px';n.style.top=(h*.25+i%4*65)+'px';frames=[{transform:'translateX(0) rotate(-15deg)',opacity:0},{offset:.15,opacity:1},{transform:'translateX('+(w+180)+'px) rotate(25deg)',opacity:0}];duration=2200;}
   animate(n,frames,{duration,delay:i*35,easing:kind===2?'cubic-bezier(.18,.7,.32,1)':'ease-out'});
  }
  return names[kind];
 }
 return {cast,stop(){animations.forEach(a=>a.cancel());animations.clear();}};
}
