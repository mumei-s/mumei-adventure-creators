import {comparisonEntries,portraitURL,spriteURL} from './model.js';
import {characterSprite} from '../maze/creator-runtime.js';
import {fetchStartupJSON} from '../maze/startup-assets.js';
const $=id=>document.getElementById(id),canvas=$('character'),context=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let entries=[],selected=0,request=0,image=null,facing='down',walking=!reduced.matches,frame=0,last=0,elapsed=0,loadAbort=null,stopImage=()=>{};
function clear(){context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle='#0c17265c';context.beginPath();context.ellipse(180,365,94,14,0,0,Math.PI*2);context.fill();}
function draw(){clear();const entry=entries[selected];if(!image||!entry?.asset)return;const sprite=characterSprite(entry.asset,image,facing,walking&&!reduced.matches,elapsed*7),height=300*sprite.frame[3]/sprite.contentHeight,width=height*sprite.frame[2]/sprite.frame[3];context.drawImage(image,...sprite.frame,180-width*sprite.anchorX,365-height*sprite.anchorY,width,height);}
function tick(now){frame=0;if(document.hidden)return;elapsed+=Math.min(.05,(now-(last||now))/1000);last=now;draw();if(walking&&!reduced.matches)frame=requestAnimationFrame(tick);}
function redraw(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;draw();if(walking&&!reduced.matches&&!document.hidden)frame=requestAnimationFrame(tick);}
function setMotion(){const active=walking&&!reduced.matches;$('walking').setAttribute('aria-pressed',String(active));$('walking').textContent=active?'歩行を止める':'歩行を見る';$('walking').disabled=reduced.matches||!entries[selected]?.ready;redraw();}
function loadSprite(entry,token){
 stopImage();image=null;clear();$('sprite-retry').hidden=true;
 if(!entry.ready){$('sprite-status').textContent='キャラクター制作中です。プロフィールから作者をご覧いただけます。';return;}
 $('sprite-status').textContent='キャラクターを読み込み中…';const url=spriteURL(entry.asset,import.meta.url);if(!url){$('sprite-status').textContent='キャラクターの画像を準備中です。';return;}
 const im=new Image();let active=true;const timer=setTimeout(()=>finish(false),12000);
 function finish(ok){if(!active)return;active=false;clearTimeout(timer);im.onload=im.onerror=null;if(token!==request)return;if(ok){image=im;$('sprite-status').textContent='';redraw();}else{$('sprite-status').textContent='画像を読み込めませんでした。再読み込みできます。';$('sprite-retry').hidden=false;}}
 stopImage=()=>{active=false;clearTimeout(timer);im.onload=im.onerror=null;im.removeAttribute('src');};im.decoding='async';im.fetchPriority='high';im.onload=()=>finish(im.naturalWidth===entry.asset.width&&im.naturalHeight===entry.asset.height);im.onerror=()=>finish(false);im.src=url;
}
function select(index){
 selected=(index+entries.length)%entries.length;const token=++request,entry=entries[selected];$('character-select').value=entry.id;$('character-name').textContent=entry.label;$('creator-name').textContent=entry.label===entry.name?'':entry.name;$('position').textContent=`${selected+1} / ${entries.length}`;
 const profile=$('profile-link');profile.hidden=!entry.profileURL;if(entry.profileURL)profile.href=entry.profileURL;
 const portrait=$('portrait'),url=portraitURL(entry.avatar,import.meta.url);portrait.hidden=!url;portrait.alt=entry.name+'のプロフィール画像';if(url)portrait.src=url;else portrait.removeAttribute('src');
 for(const button of document.querySelectorAll('[data-facing]'))button.disabled=!entry.ready;setMotion();loadSprite(entry,token);
}
async function boot(){
 loadAbort?.abort();const abort=new AbortController();loadAbort=abort;$('retry').hidden=true;$('load-status').hidden=false;$('load-status').textContent='仲間の一覧を読み込んでいます…';
 try{const [archive,manifest]=await Promise.all([fetchStartupJSON(new URL('../data/archive.json',import.meta.url),{signal:abort.signal}),fetchStartupJSON(new URL('../maze/data/creator-characters.json?v=f80bc02199db',import.meta.url),{signal:abort.signal})]);if(abort.signal.aborted)return;entries=comparisonEntries(archive,manifest);if(!entries.length)throw Error('Empty character roster');$('character-select').replaceChildren(...entries.map(entry=>{const option=document.createElement('option');option.value=entry.id;option.textContent=entry.label+(entry.ready?'':'（制作中）');return option;}));$('comparison').hidden=false;$('load-status').hidden=true;select(0);}catch{if(abort.signal.aborted)return;$('load-status').textContent='一覧を読み込めませんでした。もう一度試せます。';$('retry').hidden=false;}
}
$('character-select').onchange=()=>select(entries.findIndex(entry=>entry.id===$('character-select').value));$('previous').onclick=()=>select(selected-1);$('next').onclick=()=>select(selected+1);$('retry').onclick=boot;$('sprite-retry').onclick=()=>loadSprite(entries[selected],++request);$('walking').onclick=()=>{walking=!walking;setMotion();};
for(const button of document.querySelectorAll('[data-facing]'))button.onclick=()=>{facing=button.dataset.facing;for(const item of document.querySelectorAll('[data-facing]'))item.setAttribute('aria-pressed',String(item===button));redraw();};
document.addEventListener('visibilitychange',()=>{last=0;redraw();});reduced.addEventListener('change',setMotion);addEventListener('pagehide',()=>{loadAbort?.abort();stopImage();if(frame)cancelAnimationFrame(frame);});void boot();
