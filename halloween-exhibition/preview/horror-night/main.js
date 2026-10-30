import {loadSave,writeSave,routeFrom,noteReturn,STAGES,complete} from './model.js';
import {TITLE,CHAPTERS,EVENTS} from './story.js';
const $=id=>document.getElementById(id);
let storage;try{storage=localStorage;}catch{}
let state={...loadSave(storage),...routeFrom(location.search)},engine=null,engineTask=null,pending=false,noticeTimer,bootSerial=0;
const returnURL=noteReturn(location.search,document.referrer);
function save(){const ok=writeSave(storage,state);$('save-status').textContent=ok?'この端末だけに進行を保存':'この端末では保存できません。本文は読めます';}
function clearKeys(){engine?.stop();}
function read(){bootSerial++;pending=false;engine?.pause();state.mode='read';document.body.classList.remove('walking');$('exploration').hidden=true;$('reading').hidden=false;$('page-footer').hidden=false;const c=CHAPTERS[state.chapter];$('chapter-label').textContent=c.label+' / HALLOWEEN NIGHT';$('chapter-heading').textContent=c.heading;$('paragraphs').replaceChildren(...c.paragraphs.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));$('story-title').hidden=state.chapter>0;document.querySelector('.intro-caption').hidden=state.chapter>0;$('enter').textContent=(c.button||'')+' →';document.querySelector('.reading-actions').hidden=state.chapter===3;$('ending').hidden=state.chapter!==3;save();window.scrollTo({top:0,behavior:'instant'});$('chapter-heading').tabIndex=-1;$('chapter-heading').focus({preventScroll:true});}
function notice(text){$('walk-notice').textContent=text;clearTimeout(noticeTimer);if(text)noticeTimer=setTimeout(()=>$('walk-notice').textContent='',6500);}
function resize(){engine?.resize();}
async function walk(){
 const serial=++bootSerial;state.mode='walk';save();document.body.classList.add('walking');$('reading').hidden=true;$('exploration').hidden=false;$('page-footer').hidden=true;window.scrollTo({top:0,behavior:'instant'});
 const stage=STAGES[state.chapter];$('walk-label').textContent='街の場面 '+stage.id+' / 3';$('objective').textContent=stage.objective;$('interact').textContent=stage.action;$('interact').disabled=true;$('world').dataset.scene=stage.id;$('loading').hidden=false;$('loading-copy').textContent='街と参加者を開いています…';$('retry').hidden=true;$('goal-marker').hidden=true;
 try{
  if(!engineTask)engineTask=import('./town.js?v=1').then(m=>m.createStoryTown({canvas3d:$('scene3d'),canvas2d:$('scene2d'),root:$('world'),onNear:near=>{$('interact').disabled=!near;},onProgress:d=>{$('distance').textContent=d<1.55?'到着しました。調べてください':'目的地まで '+Math.ceil(d)+'歩分';},onPosition:p=>{state.position=p;save();},onNotice:notice,onView:mode=>{state.view=mode;$('view-switch').textContent=mode==='3d'?'見下ろしに変更':'立体表示に変更';save();},onMarker:p=>{const marker=$('goal-marker');marker.hidden=!p;if(p){marker.style.left=p.x+'px';marker.style.top=p.y+'px';}},view:state.view,muted:state.muted}));
  engine=await engineTask;if(serial!==bootSerial||state.mode!=='walk')return;await engine.enter(state.chapter,state.position);if(serial!==bootSerial||state.mode!=='walk'){engine.pause();return;}$('loading').hidden=true;pending=false;resize();updateSound();
 }catch(error){console.error('Halloween story town:',error);engineTask=null;engine?.destroy();engine=null;if(serial!==bootSerial)return;$('loading-copy').textContent='街を読み込めませんでした。再試行するか、文章で続きを読めます。';$('retry').hidden=false;}
}
function showEvent(){if(pending||state.chapter>=3)return;pending=true;engine?.pause();const item=EVENTS[state.chapter];$('event-title').textContent=item.title;$('event-text').textContent=item.text;const image=$('event-image');image.hidden=true;image.removeAttribute('src');$('mask-shadow').hidden=false;
 if(state.chapter===0){const picture=engine?.capture();if(picture){image.src=picture;image.hidden=false;$('mask-shadow').hidden=true;}}
 if(state.chapter===2){image.src='./assets/visitor.avif';image.hidden=false;$('mask-shadow').hidden=true;image.onerror=()=>{image.hidden=true;$('mask-shadow').hidden=false;};}
 $('return-note').hidden=!returnURL;if(returnURL)$('return-note').href=returnURL;$('event-dialog').showModal();$('event-next').focus();}
function eventNext(){if(!pending)return;$('event-dialog').close();pending=false;state=complete(state);read();}
function updateSound(){$('sound').textContent=state.muted?'音 OFF':'音 ON';$('sound').setAttribute('aria-pressed',String(!state.muted));engine?.setMuted(state.muted);}
$('enter').onclick=walk;$('read-next').onclick=()=>{state=complete(state);read();};$('back-reading').onclick=read;$('retry').onclick=walk;
$('fallback-read').onclick=showEvent;$('skip-scene').onclick=showEvent;$('interact').onclick=showEvent;$('event-next').onclick=eventNext;
$('event-dialog').addEventListener('cancel',e=>{e.preventDefault();eventNext();});
$('auto-walk').onclick=()=>{const active=engine?.toggleAuto()||false;$('auto-walk').setAttribute('aria-pressed',String(active));$('auto-walk').textContent=active?'自動歩きを止める':'道順をたどる';};
$('view-switch').onclick=async()=>{if(!engine)return;const button=$('view-switch');button.disabled=true;try{await engine.switchView();}catch{notice('立体表示を使えません。見下ろしで続けられます。');}finally{button.disabled=false;}};
$('sound').onclick=()=>{state.muted=!state.muted;updateSound();save();};
for(const b of $('pad').querySelectorAll('button')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);engine?.direction(Number(b.dataset.dx),Number(b.dataset.dz));$('auto-walk').textContent='道順をたどる';$('auto-walk').setAttribute('aria-pressed','false');});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,clearKeys);}
const keyMap={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]};
window.addEventListener('keydown',e=>{if(state.mode!=='walk'||$('event-dialog').open||$('contents').open)return;if(keyMap[e.key]){e.preventDefault();engine?.direction(...keyMap[e.key]);}if((e.key==='Enter'||e.key==='e')&&!$('interact').disabled){e.preventDefault();showEvent();}});
window.addEventListener('keyup',e=>{if(keyMap[e.key])clearKeys();});window.addEventListener('blur',clearKeys);window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{clearKeys();if(document.hidden)engine?.pause();else if(state.mode==='walk'&&!pending&&!$('contents').open)engine?.resume();});window.addEventListener('pagehide',()=>{engine?.pause();save();});window.addEventListener('pageshow',()=>{if(state.mode==='walk'&&!pending&&!document.hidden)engine?.resume();});
$('contents-open').onclick=()=>{engine?.pause();$('contents').showModal();};$('contents-close').onclick=()=>$('contents').close();$('contents').addEventListener('close',()=>{if(state.mode==='walk'&&!pending)engine?.resume();});
CHAPTERS.forEach((c,i)=>{const b=document.createElement('button');b.textContent=c.label+'　'+c.heading;b.onclick=()=>{state={...state,chapter:i,position:null};$('contents').close();read();};$('chapter-nav').append(b);});
$('restart').onclick=()=>{state={...state,chapter:0,position:null};read();};
window.__HALLOWEEN_READING_NIGHT__={version:1,snapshot:()=>({...state})};
if(state.mode==='walk')void walk();else read();
