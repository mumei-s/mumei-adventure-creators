import {initTransitionEffects} from './transition-effects.js?v=20261016-living1';
import {initViewport} from './viewport.js?v=20261016-ios1';
import { initAppExit } from './app-exit.js?v=20261017-live-street1';
import { createDoorRevealClock } from './door-reveal-clock.js?v=20261015-playful1';
import { initFestivalScene } from './festival-scene.js?v=20261017-cauldron1';
import { initCreatorCauldron } from './creator-cauldron.js?v=20261017-cauldron1';
import { loadArtworkImage } from './magical-loading.js?v=20261015-journey1';
import { initPalaceStartup } from './palace-startup.js?v=20261017-readable1';
import { createDoorPalettePicker } from './door-palette.js?v=20261015-festival1';
import { installGalleryGesture } from './gallery-gesture.js?v=20261016-ios1';
import { initPalaceEntrance } from './palace-entrance.js?v=20261014-palace2';
import { initDisplayMode } from './display-mode.js?v=20261014-layout1';
import { createSlideshowController } from './slideshow.js?v=20261015-festival1';
import { initVisitorPreferences } from './visitor-preferences.js?v=20261016-ios1';
import { initSceneMotion } from './scene-motion.js?v=20261015-glamour1';
import { validateArchive, safeURL, normalizeSearch, doorIdFor } from './data-model.js?v=20261014-doors1';
const $=id=>document.getElementById(id), root=$('theater');
initViewport();
let palaceVisualReady;
let cancelArtworkLoad=()=>{};
const profiles={
 host:{kicker:'THE FIRST INVITATION',color:'#b88551',tint:'#6b4a2f',image:'./assets/manor-hero.webp',position:'center'},
 moon:{kicker:'THE MOONLIT ATELIER',color:'#b0a2d8',tint:'#594b79',atlas:2},
 forest:{kicker:'THE ALCHEMIST’S CONSERVATORY',color:'#8ab9a5',tint:'#355e51',atlas:1},
 star:{kicker:'THE ASTRAL OBSERVATORY',color:'#95bbd8',tint:'#36546f',atlas:0},
 ghost:{kicker:'THE MIDNIGHT TEA HOUSE',color:'#d3c7a3',tint:'#676449',atlas:3},
 pumpkin:{kicker:'THE MASQUERADE WARDROBE',color:'#d6a271',tint:'#815333',atlas:2},
 violet:{kicker:'THE NOCTURNE SALON',color:'#b497c9',tint:'#644770',atlas:3},
 letter:{kicker:'THE HOUSE OF LOST LETTERS',color:'#88b9ba',tint:'#36595d',image:'./assets/manor-hero.webp',position:'82% center'}
};
const ROSTER_PAGE_SIZE=5;
let rosterPage=0;
let palace=null;
let archive,currentYear,currentIndex=0,busy=false,search='',activeTag='',timer,loadVersion=0,turnVersion=0,returnTarget=null,suppressClickUntil=0;
let progress={stamps:{},stars:{},seals:{}};let storageOK=true;const storageKey='halloween-yearbook:night-doors:v1';
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');if(saved&&saved.stamps&&typeof saved.stamps==='object'&&!Array.isArray(saved.stamps)&&saved.stars&&typeof saved.stars==='object'&&!Array.isArray(saved.stars))progress=saved;}catch{storageOK=false;}
if(!progress.doorStamps||typeof progress.doorStamps!=='object'||Array.isArray(progress.doorStamps))progress.doorStamps={};
if(!progress.seals||typeof progress.seals!=='object'||Array.isArray(progress.seals))progress.seals={};
const sealIDs=['light-1','light-2','light-3'];
function seals(){return [...new Set((Array.isArray(progress.seals[key()])?progress.seals[key()]:[]).filter(id=>sealIDs.includes(id)))];}
function refreshSeals(){root.dataset.seals=JSON.stringify(seals());}
let rouletteVersion=0,rouletteTimer=null,rouletteRunning=false,slideshow=null;
let displayMode='halloween';const modeStorageKey='halloween-yearbook:display-mode:v1';try{if(localStorage.getItem(modeStorageKey)==='normal')displayMode='normal';}catch{}
try{if(new URLSearchParams(location.search).get('mode')==='halloween'||new URLSearchParams(location.search).get('return')==='palace')displayMode='halloween';}catch{}
const returnStateKey='halloween-yearbook:theatre-return:v1';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const transitions=initTransitionEffects({motion:()=>document.body.dataset.ambientPaused!=='true'});
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function year(){return archive?.years.find(y=>y.year===currentYear);}
function ordered(list){return list.map((value,index)=>({value,index})).sort((a,b)=>(Number.isFinite(a.value.order)?a.value.order:a.index)-(Number.isFinite(b.value.order)?b.value.order:b.index)||a.index-b.index).map(item=>item.value);}
function publicEntry(entry){
 const profile=archive.creators.find(c=>c.id===entry.creatorId),doorId=doorIdFor(entry,key());
 if(entry.visible===false)return {doorId,creatorId:entry.creatorId,theme:entry.theme,order:entry.order,submissionStatus:'pending',title:'作品準備中',tags:[],links:profile?.profileURL?[{title:'noteプロフィールを見る',url:profile.profileURL}]:[]};
 return {...entry,doorId,works:ordered((entry.works||[]).filter(item=>item.visible!==false)),links:ordered((entry.links||[]).filter(item=>item.visible!==false))};
}
function entries(){
 if(!archive)return [];
 const defaults=archive.creators.flatMap((c,i)=>{
  const own=(archive.evergreenEntries||[]).filter(e=>e.creatorId===c.id);
  return own.length?own:[{creatorId:c.id,theme:['moon','violet','star','forest','ghost','pumpkin','letter'][i%7],submissionStatus:'pending',title:'通常作品は準備中',tags:[],links:c.profileURL?[{title:'noteプロフィールを見る',url:c.profileURL}]:[]}];
 });
 return ordered(displayMode==='halloween'?(year()?.entries||[]):defaults).map(publicEntry);
}
function participantCount(list=entries()){return new Set(list.map(e=>e.creatorId)).size;}
function legacyDoorIndex(creatorId){const list=entries(),legacy=doorIdFor({creatorId},key()),exact=list.findIndex(e=>e.doorId===legacy);return exact>=0?exact:list.findIndex(e=>e.creatorId===creatorId);}
function viewedDoors(){
 if(!Object.prototype.hasOwnProperty.call(progress.doorStamps,key())){
  // A legacy creator visit maps only to that creator's original door, never extras.
  progress.doorStamps[key()]=validStamps().map(id=>entries().find(e=>e.doorId===doorIdFor({creatorId:id},key()))?.doorId).filter(Boolean);
 }
 const saved=progress.doorStamps[key()];return [...new Set((Array.isArray(saved)?saved:[]).filter(id=>entries().some(e=>e.doorId===id)))];
}
function navigateDoor(doorId,options){const index=entries().findIndex(e=>e.doorId===doorId);if(index>=0)return navigate(index,options);}
function adjacentDoor(delta,options){const list=entries();if(list.length)return navigateDoor(list[(currentIndex+delta+list.length)%list.length].doorId,options);}
function current(){return entries()[currentIndex];}
function creator(entry){return archive.creators.find(c=>c.id===entry.creatorId);}
function key(){return displayMode==='normal'?'evergreen':`archive:${currentYear}`;}
function stamps(){const value=progress.stamps[key()];return Array.isArray(value)?value:[];}
function validStamps(){return [...new Set(stamps().filter(id=>entries().some(e=>e.creatorId===id)))];}
function plannedSlots(){return 0;}
function doorCaption(entry){return entry.role==='host'?`主催者の企画紹介記事 · ${entryHeading(entry)}`:entry.creatorId==='ss_yr'&&entry.submissionStatus==='pending'?'主催者の個人作品 · 作品準備中':entryHeading(entry);}
function avatar(entry){return safeURL(creator(entry).avatar,{image:true});}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(progress));}catch{storageOK=false;}}
function theme(entry){return entry.role==='host'?'host':profiles[entry.theme]?entry.theme:'moon';}
function displayProfile(entry){return profiles[theme(entry)];}
function label(entry){const c=creator(entry);return c.provisional?'架空の参加者 · 展示サンプル':entry.role==='host'?'主催者の企画紹介記事':entry.submissionStatus==='pending'?(entry.creatorId==='ss_yr'?'個人作品 · 作品準備中':'プロフィール画像 · 作品準備中'):'参加者の展示';}
function palette(entry){const p=displayProfile(entry);return {image:entry.role==='host'?'./assets/manor-hero.webp':`./assets/paper-rooms/${theme(entry)}.svg`,position:'center',size:'cover'};}
function applyScene(el,entry){const p=palette(entry);el.style.backgroundImage=`url("${p.image}")`;el.style.backgroundPosition=p.position;el.style.backgroundSize=p.size;}
function entryHeading(entry){return entry.submissionStatus!=='pending'&&entry.title?.trim()?entry.title:`@${creator(entry).id}`;}
function pendingCopy(){return displayMode==='halloween'?'ハロウィン作品は準備中です。まずはnoteのプロフィールから、この参加者に会いにいけます。':'作品の掲載は準備中です。まずはnoteのプロフィールから、この参加者に会いにいけます。';}
function refreshModeCopy(){root.dataset.mode=displayMode;document.body.dataset.mode=displayMode;$('mode-halloween').setAttribute('aria-pressed',String(displayMode==='halloween'));$('mode-normal').setAttribute('aria-pressed',String(displayMode==='normal'));for(const id of ['horror-entrance','town-entrance','palace-town-entrance','palace-maze-entrance'])$(id).hidden=displayMode!=='halloween';$('year-open').hidden=displayMode==='normal';$('roster-title').textContent=displayMode==='halloween'?'今夜のアトリエをめぐる':'参加者一覧';$('site-title').replaceChildren(node('span','無名S note'),node('strong',displayMode==='halloween'?'🎃Halloween Atelier':'みんなのアトリエ'),node('small',displayMode==='halloween'?'魔法の入口🚪':'作品との出会い'));document.title=displayMode==='halloween'?'無名S note / 🎃Halloween Atelier / 魔法の入口🚪':'無名S note / みんなのアトリエ / 作品との出会い';$('roulette-open').hidden=displayMode!=='halloween';if(currentYear){$('edition-text').textContent=displayMode==='halloween'?`${currentYear} · HALLOWEEN YEARBOOK`:'CREATORS’ YEARBOOK · 通年';$('invitation-year').textContent=displayMode==='halloween'?`HALLOWEEN ${currentYear}`:'CREATORS’ COLLECTION';}const pending=document.querySelector('.pending-copy');if(pending)pending.textContent=pendingCopy();}
function setMode(value,{save=true}={}){cancelStoryOpening();if(value!=='normal'&&value!=='halloween')return;cancelRoulette();slideshow?.manualNavigation();const previous=displayMode,selectedId=current()?.creatorId,selectedDoor=current()?.doorId;displayMode=value;palace?.setMode(value);refreshModeCopy();if(archive&&previous!==value){turnVersion++;busy=false;root.classList.remove('turning-in','turning-out');currentIndex=Math.max(0,entries().findIndex(e=>e.doorId===selectedDoor));if(!entries().some(e=>e.doorId===selectedDoor))currentIndex=Math.max(0,legacyDoorIndex(selectedId));$('stage').hidden=!entries().length;for(const id of['previous','next','artwork-open'])$(id).disabled=!entries().length;activeTag='';search='';rosterPage=0;$('search').value='';root.dataset.sealRooms=JSON.stringify(entries().length?[0,1,2].map(i=>entries()[Math.floor(i*entries().length/3)].creatorId):[]);refreshSeals();paint();if(!entries().length){$('room-dots').replaceChildren();$('current-index').textContent='00';$('total-index').textContent='00';renderProgress();}renderTags();renderRoster();$('sample-notice').textContent=`参加者${participantCount()}人 · 扉${entries().length}枚`;if($('detail').open)$('detail').close();}slideshow?.setBlocked('empty',entries().length<2);if(save)try{localStorage.setItem(modeStorageKey,displayMode);}catch{};}
function notice(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('visible'),3300);}
function record(entry){
 const seen=viewedDoors();if(seen.includes(entry.doorId))return;
 progress.doorStamps[key()]=[...seen,entry.doorId];
 if(!stamps().includes(entry.creatorId))progress.stamps[key()]=[...stamps(),entry.creatorId];
 persist();renderProgress();
}
function renderProgress(){const valid=validStamps(),seen=viewedDoors(),count=participantCount();root.style.setProperty('--journey-progress',String(count?valid.length/count:0));root.classList.toggle('complete',displayMode==='halloween'&&count>0&&valid.length===count);for(const dot of $('room-dots').children)dot.classList.toggle('visited',seen.includes(dot.dataset.doorId));}
function renderDots(){const area=$('room-dots');area.replaceChildren();entries().forEach((entry,i)=>{const c=creator(entry),button=node('button',undefined,'room-dot face-dot');button.dataset.creatorId=entry.creatorId;button.dataset.doorId=entry.doorId;button.dataset.creatorName=c.name;button.dataset.creatorColor=displayProfile(entry).color;if(displayMode==='halloween'){button.setAttribute('aria-keyshortcuts','Shift+Enter');button.setAttribute('aria-description','下の魔法ツボへドラッグ、またはShiftとEnterで魔法をかける');}button.setAttribute('aria-label',`${i+1}枚目、${c.name} · ${doorCaption(entry)}の扉へ`);button.setAttribute('aria-current',String(i===currentIndex));button.title=`${c.name} · ${doorCaption(entry)}`;button.append(node('span',Array.from(c.name).slice(0,1).join(''),'face-initial'));const url=avatar(entry);if(url){const img=node('img');img.src=url;img.alt='';img.addEventListener('error',()=>img.remove(),{once:true});button.append(img);}button.addEventListener('click',()=>navigateDoor(entry.doorId,{immediate:true}));area.append(button);});renderProgress();}
const pickDoorPalette=createDoorPalettePicker();let paintedPaletteKey='';
let storyVersion=0,storyOpening=false;
function cancelStoryOpening(){storyVersion++;storyOpening=false;root.classList.remove('story-opening');slideshow?.setBlocked('story-opening',false);}
const doorClock=createDoorRevealClock({setBlocked:value=>slideshow?.setBlocked('door-opening',value)});
function revealDoor(){doorClock.cancel();root.classList.remove('door-reveal');void $('artwork-open').offsetWidth;if(displayMode==='halloween'&&!reduced.matches&&root.dataset.motionPaused!=='true'){root.classList.add('door-reveal');doorClock.start();}}

function paint({redisplay=false}={}){transitions.enter($('stage'),{kind:'scene'});cancelStoryOpening();const entry=current();if(!entry)return;const paletteKey=`${displayMode}:${currentYear}:${entry.doorId}`;if(redisplay||paintedPaletteKey!==paletteKey){const colors=pickDoorPalette(paletteKey);['--door-color','--door-edge','--door-shadow'].forEach((name,i)=>root.style.setProperty(name,colors[i]));paintedPaletteKey=paletteKey;}const c=creator(entry),p=displayProfile(entry),scene=palette(entry),real=safeURL(entry.image,{image:true}),portrait=avatar(entry);root.dataset.entryKind=entry.role==='host'&&entry.submissionStatus==='introduction'?'introduction':'article';$('host-magazine').hidden=!(root.dataset.entryKind==='introduction'&&displayMode==='halloween'&&currentYear===2026);$('host-illustration-tool').hidden=$('host-magazine').hidden;root.dataset.theme=theme(entry);root.dataset.creatorId=entry.creatorId;root.dataset.doorId=entry.doorId;root.dataset.roomIndex=String(currentIndex);root.dataset.roomCount=String(entries().length);root.dataset.portrait=String(!real);root.style.setProperty('--glow',p.color);root.style.setProperty('--tint',p.tint);root.style.setProperty('--room-image',`url("${scene.image}")`);const architecture=entry.role==='host'?'./assets/manor-hero.webp':`./assets/stage-rooms/${theme(entry)}.svg`;for(const el of[$('world-backdrop'),...document.querySelectorAll('.wall-wing,.back-wall')]){el.style.backgroundImage=`url("${architecture}")`;el.style.backgroundPosition='center';el.style.backgroundSize='cover';}
 const image=$('artwork-image'),mat=document.querySelector('.artwork-mat');cancelArtworkLoad();image.onerror=null;image.hidden=true;$('artwork-fallback').hidden=true;$('artwork-loading').hidden=true;mat.style.backgroundImage='none';mat.style.backgroundColor='#25162e';mat.removeAttribute('role');mat.removeAttribute('aria-label');const source=real||portrait;
 $('artwork-fallback').replaceChildren(node('span',Array.from(c.name).slice(0,2).join('')),node('small',real?'画像を表示できません · タップで記事へ':'プロフィール画像 · 読み込めませんでした'));
 if(source){image.alt=real?(entry.imageAlt||entry.title||c.name):`${c.name}のnoteプロフィール画像`;image.referrerPolicy='no-referrer';cancelArtworkLoad=loadArtworkImage(image,source,{onState:state=>{root.dataset.artworkState=state;image.hidden=state!=='ready';$('artwork-loading').hidden=state!=='loading';$('artwork-fallback').hidden=state!=='error';mat.setAttribute('aria-busy',String(state==='loading'));}});}else{image.removeAttribute('src');image.alt='';root.dataset.artworkState='error';mat.setAttribute('aria-busy','false');$('artwork-fallback').hidden=false;}
 const hostAvatar=$('host-avatar');hostAvatar.hidden=entry.role!=='host'||!portrait;if(!hostAvatar.hidden){hostAvatar.src=portrait;hostAvatar.alt=`${c.name}のnoteプロフィール画像`;hostAvatar.onerror=()=>hostAvatar.hidden=true;}else hostAvatar.removeAttribute('src');
 $('room-title').textContent=c.name;$('room-title').classList.toggle('long-creator-name',Array.from(c.name).length>32);$('room-kicker').textContent=entry.role==='host'?'主催者からの招待状':'';$('creator-name').replaceChildren(node('span',entry.submissionStatus==='pending'?'作品準備中':entryHeading(entry)),node('small',label(entry)));$('current-index').textContent=String(currentIndex+1).padStart(2,'0');$('total-index').textContent=String(entries().length).padStart(2,'0');$('invitation-year').textContent=`HALLOWEEN ${currentYear}`;$('invitation-number').textContent='WELCOME TO THE ATELIER';$('artwork-open').setAttribute('aria-label',`${c.name} · ${doorCaption(entry)}の扉をひらく`);$('stage-status').textContent=`${currentIndex+1} / ${entries().length}、${c.name}、${label(entry)}`;renderDots();refreshModeCopy();revealDoor();}
async function navigate(index,{immediate=false,fromRoulette=false,automatic=false,isCurrent=()=>true}={}){cancelStoryOpening();if(!automatic)palace?.enter({immediate:true,focus:false});if(!automatic)slideshow?.manualNavigation();if(!fromRoulette)cancelRoulette();if(!entries().length||!isCurrent())return;const next=(index+entries().length)%entries().length;if(next===currentIndex&&!immediate)return;turnVersion++;busy=false;root.classList.remove('turning-in','turning-out');currentIndex=next;paint({redisplay:true});}
function showDialog(dialog){cancelStoryOpening();cancelRoulette();slideshow?.setBlocked('dialog',true);returnTarget=document.activeElement;dialog.showModal();transitions.enter(dialog);}
async function openStory(){if(Date.now()<suppressClickUntil||$('detail').open)return;const entry=current();if(!entry)return;cancelStoryOpening();record(entry);const c=creator(entry),area=$('detail-content');$('detail').dataset.entryKind=root.dataset.entryKind;area.replaceChildren();const real=safeURL(entry.image,{image:true}),portrait=avatar(entry),source=real||portrait;if(source){const img=node('img',undefined,real?'detail-art':'detail-art detail-portrait');img.alt=real?(entry.imageAlt||entry.title||c.name):`${c.name}のnoteプロフィール画像`;img.referrerPolicy='no-referrer';const wait=node('div','作品を招いています…','detail-image-loading');wait.setAttribute('role','status');area.append(wait,img);const cancel=loadArtworkImage(img,source,{onState:state=>{img.hidden=state!=='ready';wait.hidden=state==='ready';wait.dataset.state=state;if(state==='error'){wait.textContent='画像を表示できません。下の記事リンクからご覧ください。';const fallback=node('div',Array.from(c.name).slice(0,2).join(''),'detail-art profile-fallback');img.replaceWith(fallback);}}});$('detail').addEventListener('close',cancel,{once:true});}else area.append(node('div',Array.from(c.name).slice(0,2).join(''),'detail-art profile-fallback'));
 area.append(node('p',`${displayMode==='normal'?'通年':currentYear} · ${label(entry)}`,'eyebrow'));const title=node('h2',c.name);title.id='detail-title';area.append(title,node('p',doorCaption(entry),'detail-creator'));if(entry.submissionStatus==='pending')area.append(node('p',pendingCopy(),'detail-copy pending-copy'));if(c.bio)area.append(node('p',c.bio,'detail-copy'));if(entry.message)area.append(node('p',entry.message,'detail-copy'));
 const detailLinks=[...(entry.works||[]),...(entry.links||[])];if(c.profileURL&&!detailLinks.some(item=>item.url===c.profileURL))detailLinks.push({title:'noteプロフィールを見る',url:c.profileURL});
 for(const item of detailLinks){const url=safeURL(item.url);if(!url)continue;const a=node('a',`${item.title} ↗`,'work-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.append(node('small','新しいタブでひらきます'));area.append(a);}
 if(displayMode==='halloween'&&currentYear===2026){const magazine=node('a','共同マガジンを見る 🔗','work-link magazine-link');magazine.href='https://note.com/ss_yr/m/m642b82518aeb';magazine.target='_blank';magazine.rel='noopener noreferrer';magazine.append(node('small','2026年の共同マガジン · 新しいタブでひらきます'));area.append(magazine);}
 const next=node('button','次の扉へ →','secondary');next.addEventListener('click',()=>{$('detail').close();adjacentDoor(1);});area.append(next);showDialog($('detail'));}
function filterEntries(){return entries().filter(e=>(!activeTag||(e.tags||[]).includes(activeTag))&&(!search||normalizeSearch([creator(e).name,`@${creator(e).id}`,e.title||'',...(e.tags||[]),...(e.works||[]).map(w=>w.title)].join(' ')).includes(search)));}
function renderRoster(){
 const host=displayMode==='halloween'?entries().find(e=>e.role==='host'&&e.submissionStatus==='introduction'):null;
 const fixed=$('roster-host-fixed');fixed.replaceChildren();fixed.hidden=!host;
 if(host){const card=node('button',undefined,'roster-host-project');card.dataset.doorId=host.doorId;card.setAttribute('aria-label','主催者の企画記事をひらく');const image=safeURL(host.image,{image:true});if(image){const img=node('img');img.src=image;img.alt='';card.append(img);}const title=node('span');title.append(node('small','固定 · 企画記事'),node('strong',host.title||'Halloween Atelier'),node('span','企画記事へ →'));card.append(title);card.addEventListener('click',()=>{returnTarget=$('artwork-open');$('roster').close();navigateDoor(host.doorId,{immediate:true});$('artwork-open').focus();});fixed.append(card);}
 const rosterEntries=entries().filter(e=>!host||e.doorId!==host.doorId);
 const area=$('roster-grid'),list=filterEntries().filter(e=>!host||e.doorId!==host.doorId),pages=Math.ceil(list.length/ROSTER_PAGE_SIZE);
 rosterPage=Math.max(0,Math.min(rosterPage,Math.max(0,pages-1)));
 const start=rosterPage*ROSTER_PAGE_SIZE,visible=list.slice(start,start+ROSTER_PAGE_SIZE);
 area.replaceChildren();
 $('results').textContent=`扉 ${list.length} / ${rosterEntries.length}枚 · ${list.length?start+1:0}〜${start+visible.length}枚目を表示 · 参加者${participantCount(list)}人`;
 $('roster-page-status').textContent=`${pages?rosterPage+1:0} / ${pages} ページ`;
 $('roster-previous').disabled=rosterPage===0;
 $('roster-next').disabled=rosterPage>=pages-1;
 for(const [index,entry]of visible.entries()){
  const c=creator(entry),button=node('button',undefined,'roster-card');button.dataset.creatorId=entry.creatorId;button.dataset.doorId=entry.doorId;
  const thumb=node('span',Array.from(c.name).slice(0,1).join(''),'roster-thumb'),portrait=avatar(entry);
  if(portrait){const img=node('img');img.src=portrait;img.alt='';img.addEventListener('error',()=>img.remove(),{once:true});thumb.append(img);}
  const text=node('div');text.append(node('span',label(entry),'sample-label'),node('strong',c.name),node('small',doorCaption(entry)),node('span',displayMode==='halloween'?'このとびらへ →':'この扉へ →','roster-invitation'));
  button.style.setProperty('--card-order',String(index));button.append(thumb,text);
  button.addEventListener('click',()=>{returnTarget=$('artwork-open');$('roster').close();navigateDoor(entry.doorId,{immediate:true});$('artwork-open').focus();});area.append(button);
 }
 if(!list.length)area.append(node('p','見つかりませんでした。検索やタグを変えてみてください。','privacy'));
}
function changeRosterPage(delta){rosterPage+=delta;renderRoster();$('roster-page-status').focus();}
$('roster-previous').addEventListener('click',()=>changeRosterPage(-1));
$('roster-next').addEventListener('click',()=>changeRosterPage(1));
function renderTags(){const area=$('tags');area.replaceChildren();for(const tag of['',...new Set(entries().flatMap(e=>e.tags||[]))]){const button=node('button',tag||'すべて','tag');button.setAttribute('aria-pressed',String(tag===activeTag));button.addEventListener('click',()=>{activeTag=tag;rosterPage=0;for(const item of area.children)item.setAttribute('aria-pressed',String(item===button));renderRoster();});area.append(button);}}
function setYear(value){cancelStoryOpening();cancelRoulette();slideshow?.manualNavigation();turnVersion++;currentYear=value;root.dataset.sealRooms=JSON.stringify(entries().length?[0,1,2].map(i=>entries()[Math.floor(i*entries().length/3)].creatorId):[]);refreshSeals();currentIndex=0;busy=false;root.classList.remove('turning-out','turning-in');$('year-label').textContent=String(value);$('edition-text').textContent=`${value} · HALLOWEEN YEARBOOK`;const fictional=entries().filter(e=>creator(e).provisional).length;$('sample-notice').textContent=fictional?`仮展示 · 紹介${entries().length-fictional}件 + 架空の${fictional}人`:`参加者${participantCount()}人 · 扉${entries().length}枚`;if(stamps().includes('ss-yr')&&entries().some(e=>e.creatorId==='ss_yr')&&!stamps().includes('ss_yr')){progress.stamps[key()]=[...stamps(),'ss_yr'];persist();}activeTag='';search='';rosterPage=0;$('search').value='';if(entries().length){paint();$('stage').hidden=false;}else{root.dataset.creatorId='';root.dataset.roomCount='0';$('stage').hidden=true;$('current-index').textContent='00';$('total-index').textContent='00';$('stage-status').textContent='この年度の参加者はまだ登録されていません。';$('sample-notice').textContent='この年度の参加者はまだ登録されていません。';renderDots();}for(const id of['previous','next','artwork-open'])$(id).disabled=!entries().length;renderTags();renderRoster();refreshModeCopy();$('roulette-open').disabled=!rouletteCandidates().length;slideshow?.setBlocked('empty',entries().length<2);}
async function load(){root.dataset.archiveState='loading';const abort=new AbortController();const loadDeadline=setTimeout(()=>abort.abort(),12000);cancelStoryOpening();cancelRoulette();slideshow?.setBlocked('loading',true);$('palace-gate').disabled=true;const attempt=++loadVersion;$('load-error').hidden=true;for(const id of['previous','next','artwork-open','year-open','list-open','roulette-open'])$(id).disabled=true;try{const response=await fetch('./data/archive.json',{cache:'no-store',signal:abort.signal});if(!response.ok)throw Error('fetch');const data=validateArchive(await response.json());if(displayMode==='halloween')await palaceVisualReady;if(attempt!==loadVersion)return;archive=data;root.dataset.archiveState='ready';let restored=null,returnToPalace=false;try{const params=new URLSearchParams(location.search);returnToPalace=params.get('return')==='palace';if(params.get('mode')==='halloween'||returnToPalace)restored=JSON.parse(sessionStorage.getItem(returnStateKey)||'null');}catch{}if(displayMode!=='halloween'||!restored||typeof restored!=='object'||Array.isArray(restored))restored=null;if(returnToPalace&&restored&&!archive.years.some(y=>y.year===restored.year&&y.entries.some(e=>e.creatorId===restored.creatorId&&doorIdFor(e,`archive:${y.year}`)===restored.doorId)))restored=null;setYear(archive.years.some(y=>y.year===restored?.year)?restored.year:Math.max(...archive.years.map(y=>y.year)));if(restored&&typeof restored==='object'){let index=entries().findIndex(e=>e.doorId===restored.doorId);if(index<0)index=legacyDoorIndex(restored.creatorId);if(index>=0){currentIndex=index;paint();if(!returnToPalace)palace?.enter({immediate:true,focus:false});}search=typeof restored.search==='string'?normalizeSearch(restored.search):'';activeTag=typeof restored.activeTag==='string'?restored.activeTag:'';$('search').value=search;rosterPage=Number.isInteger(restored.rosterPage)?Math.max(0,restored.rosterPage):0;renderTags();renderRoster();}try{const returnURL=new URL(location.href);if(returnURL.searchParams.get('mode')==='halloween'){returnURL.searchParams.delete('mode');history.replaceState(null,'',returnURL.pathname+returnURL.search+returnURL.hash);}}catch{}for(const id of['previous','next','artwork-open','year-open','list-open'])$(id).disabled=false;if(!entries().length)for(const id of['artwork-open','previous','next'])$(id).disabled=true;$('roulette-open').disabled=!rouletteCandidates().length;slideshow?.setBlocked('empty',entries().length<2);slideshow?.setBlocked('loading',false);palaceVisualReady.then(()=>{if(attempt===loadVersion)$('palace-gate').disabled=false;});if(root.dataset.palaceState==='gallery'&&!reduced.matches&&root.dataset.motionPaused!=='true')root.classList.add('turning-in');const entranceToken=turnVersion;setTimeout(()=>{if(entranceToken===turnVersion&&attempt===loadVersion)root.classList.remove('turning-in');},900);}catch{if(attempt===loadVersion){root.dataset.archiveState='error';$('load-error').hidden=false;}}finally{clearTimeout(loadDeadline);}}
// Roulette lands only on verified creator rooms in the active public collection.
// It never invents an article and never opens an external tab on a timer.
function rouletteCandidates(){return entries().filter(entry=>{const c=creator(entry);return c&&!c.provisional&&(safeURL(c.profileURL)||[...(entry.works||[]),...(entry.links||[])].some(item=>safeURL(item.url)));});}
function cancelRoulette(){slideshow?.setBlocked('roulette',false);rouletteVersion++;clearTimeout(rouletteTimer);rouletteTimer=null;rouletteRunning=false;root.classList.remove('roulette-running');$('roulette-reel').hidden=true;$('roulette-open').setAttribute('aria-pressed','false');$('roulette-label').textContent='運命のとびら';$('roulette-reel').dataset.phase='idle';$('fate-gates').replaceChildren();}
function spinRoulette(){
 if(rouletteRunning){cancelRoulette();notice('とびら選びを中止しました。');return;}
 if(displayMode!=='halloween'||!archive)return;
 let pool=rouletteCandidates();if(pool.length>1)pool=pool.filter(entry=>entry.doorId!==current()?.doorId);if(!pool.length){notice('今は選べる参加者がいません。');return;}
 cancelRoulette();const token=rouletteVersion,target=pool[Math.floor(Math.random()*pool.length)],finish=()=>{if(token!==rouletteVersion)return;const index=entries().findIndex(entry=>entry.doorId===target.doorId);cancelRoulette();if(index<0)return;turnVersion++;busy=false;navigate(index,{immediate:reduced.matches||root.dataset.motionPaused==='true',fromRoulette:true});notice(`${creator(target).name}のとびらへ。紹介をひらいて会いにいきましょう。`);};
 if(reduced.matches||root.dataset.motionPaused==='true'){finish();return;}
 rouletteRunning=true;slideshow?.setBlocked('roulette',true);root.classList.add('roulette-running');$('roulette-open').setAttribute('aria-pressed','true');$('roulette-label').textContent='選ぶのをやめる';$('roulette-reel').hidden=false;$('roulette-reel').dataset.phase='circling';$('roulette-name').textContent='運命のとびらが巡っています…';
 // Decorative gates carry no invented creator identity. Exactly one destination
 // is chosen above; its name is announced only after the constellation settles.
 for(let i=0;i<5;i++){const gate=node('div',undefined,'fate-gate');gate.style.setProperty('--gate-index',String(i));gate.style.setProperty('--gate-hue',String([24,268,171,325,210][i]));gate.append(node('i',undefined,'fate-carving'),node('b',undefined,'fate-keyhole'),node('i',undefined,'fate-step'));$('fate-gates').append(gate);}
 rouletteTimer=setTimeout(()=>{
  if(token!==rouletteVersion)return;
  $('roulette-reel').dataset.phase='chosen';$('fate-gates').children[0]?.classList.add('fate-chosen');$('roulette-name').textContent=creator(target).name;
  rouletteTimer=setTimeout(finish,650);
 },1850);
}
$('roulette-open').addEventListener('click',spinRoulette);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&rouletteRunning){cancelRoulette();$('roulette-open').focus();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelRoulette();});
$('previous').addEventListener('click',()=>adjacentDoor(-1));$('next').addEventListener('click',()=>adjacentDoor(1));$('artwork-open').addEventListener('click',openStory);$('list-open').addEventListener('click',()=>{renderRoster();showDialog($('roster'));});$('search').addEventListener('input',e=>{search=normalizeSearch(e.target.value);rosterPage=0;renderRoster();});$('year-open').addEventListener('click',()=>{const area=$('year-list');area.replaceChildren();for(const year of[...archive.years].sort((a,b)=>b.year-a.year)){const button=node('button',String(year.year),'year-option');button.append(node('small',`${year.entries.length}枚の扉${year.year===currentYear?' · 表示中':''}`));button.addEventListener('click',()=>{$('years').close();setYear(year.year);});area.append(button);}showDialog($('years'));});

for(const dialog of document.querySelectorAll('dialog')){if(dialog.classList.contains('pwa-guide'))continue;dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});dialog.addEventListener('close',()=>{slideshow?.setBlocked('dialog',Boolean(document.querySelector('dialog[open]')));if(returnTarget?.isConnected)returnTarget.focus({preventScroll:true});});}
document.addEventListener('keydown',e=>{if(!archive||root.dataset.palaceState!=='gallery'||document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();adjacentDoor(1);}if(e.key==='ArrowLeft'){e.preventDefault();adjacentDoor(-1);}});
installGalleryGesture($('stage'),{onNavigate:direction=>adjacentDoor(direction),onSuppressClick:()=>{suppressClickUntil=Date.now()+500;}});
$('palace-return').addEventListener('click',cancelStoryOpening);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelStoryOpening();});$('retry').addEventListener('click',load);$('mode-halloween').addEventListener('click',()=>setMode('halloween'));$('mode-normal').addEventListener('click',()=>setMode('normal'));function rememberGalleryReturn(){try{sessionStorage.setItem(returnStateKey,JSON.stringify({year:currentYear,creatorId:current()?.creatorId,doorId:current()?.doorId,search,activeTag,rosterPage}));}catch{}}
for(const id of ['horror-entrance','palace-maze-entrance','town-entrance','palace-town-entrance'])$(id).addEventListener('click',rememberGalleryReturn);setMode(displayMode,{save:false});
root.addEventListener('yearbook:seal-collected',event=>{const id=event.detail?.id;if(displayMode!=='halloween'||!currentYear||!sealIDs.includes(id)||seals().includes(id))return;progress.seals[key()]=[...seals(),id];persist();refreshSeals();});
const visitorSettings=initVisitorPreferences({brightnessRange:{min:0,max:100,defaultValue:75},preferenceKey:'halloween-exhibition:main-preferences:v2',migrateFromKey:'halloween-exhibition:visitor-preferences:v1',triggerParent:document.querySelector('.header-actions'),onBrightness:value=>{root.style.setProperty('--visitor-brightness',String(value/100));root.style.setProperty('--art-brightness',String(value/75));}});
// Returning to the castle is navigation only; app exit is a separate castle action.
function returnToCastle(){
 cancelStoryOpening();cancelRoulette();
 for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
 setMode('halloween',{save:false});palace?.home();
 notice('お城に戻りました。');
}
const returnPanel=node('div',undefined,'visit-return-panel');
const castleButton=node('button','お城に戻る','visit-finish-button');castleButton.type='button';castleButton.addEventListener('click',returnToCastle);
returnPanel.append(castleButton);document.querySelector('.visitor-preferences').append(returnPanel);
$('palace-return').textContent='← お城に戻る';
const colorNote=node('p','記事画像の明るさ75%が元の色です。背景の明るさを変えても、文字のコントラストは保たれます。','visitor-settings-note');document.querySelector('.visitor-preferences')?.append(colorNote);
const playback=document.querySelector('.gallery-playback');if(playback){document.querySelector('.visitor-preferences')?.append(playback);playback.append($('slideshow-status'));}
const installControl=$('atelier-install-open');if(installControl)document.querySelector('.visitor-preferences')?.append(installControl);
initDisplayMode({controlsParent:document.querySelector('.visitor-preferences'),page:'gallery'});
const displayPreferences=document.querySelector('.display-preferences');
if(displayPreferences){document.querySelector('.visitor-preferences').prepend(displayPreferences);const displayLabel=displayPreferences.querySelector('label');if(displayLabel)displayLabel.textContent='表示サイズ（この端末）';}
palaceVisualReady=initPalaceStartup(root);
const sceneMotion=initSceneMotion(root,{controlsParent:document.querySelector('.visitor-preferences')});
let motionPausedBeforeExit=false;
const appExit=initAppExit({root,triggerParent:document.querySelector('.header-actions'),entranceControl:$('palace-world-links'),onStop(){
 visitorSettings.stopMusic();slideshow?.setEnabled(false);cancelStoryOpening();cancelRoulette();doorClock.cancel();cancelArtworkLoad();
 turnVersion++;busy=false;root.classList.remove('turning-in','turning-out','door-reveal');
 motionPausedBeforeExit=sceneMotion?.isUserPaused()||false;sceneMotion?.setPaused(true);
},onResume(){
 setMode('halloween',{save:false});palace?.home({focus:false});sceneMotion?.setPaused(motionPausedBeforeExit);
}});
function updateSlideshowState(state){
 $('slideshow-toggle').textContent=state.enabled?'自動送り ON':'自動送り OFF';
 $('slideshow-toggle').setAttribute('aria-pressed',String(state.enabled));
 $('slideshow-speed').value=String(state.intervalSeconds);
 const reason=state.blockers||[];
 const status=state.error?'自動送りを停止しました。手動の左右ボタンでご覧ください。':!state.enabled?'自動送りはOFFです。':reason.includes('reduced-motion')?'端末の「動きを減らす」設定中は、自動送りも停止します。':reason.includes('dialog')?'詳細や設定を見ている間は、自動送りを一時停止します。':reason.includes('motion')?'演出を止めている間は、自動送りも一時停止します。':reason.length?'自動送りは一時停止中です。再開時は設定した間隔から始めます。':`扉が開いてから${state.intervalSeconds}秒間展示します。手動で移動すると数え直します。`;
 if($('slideshow-status').textContent!==status)$('slideshow-status').textContent=status;
}
palace=initPalaceEntrance({root,initialMode:displayMode,onViewChange:state=>{returnPanel.hidden=state.view!=='gallery';appExit?.refresh();slideshow?.setBlocked('palace',state.view!=='gallery'||state.opening);if(state.view==='gallery'&&!state.opening)revealDoor();if(state.view!=='gallery'){cancelStoryOpening();cancelRoulette();turnVersion++;busy=false;root.classList.remove('turning-in','turning-out');}}});
let slideshowStorage=null;try{slideshowStorage=localStorage;}catch{}
slideshow=createSlideshowController({timers:{setTimeout:(fn,delay)=>setTimeout(fn,delay),clearTimeout:id=>clearTimeout(id)},storage:slideshowStorage,onState:updateSlideshowState,onAdvance:async control=>{
 if(!archive||document.hidden||reduced.matches||root.dataset.motionPaused==='true'||document.querySelector('dialog[open]')||rouletteRunning)return;
 await adjacentDoor(1,{automatic:true,isCurrent:control.isCurrent});
}});
slideshow.setBlocked('loading',true);
slideshow.setBlocked('reduced-motion',reduced.matches);
slideshow.setBlocked('motion',root.dataset.motionPaused==='true');
slideshow.setBlocked('hidden',Boolean(document.hidden));
$('slideshow-toggle').addEventListener('click',()=>slideshow.setEnabled(!slideshow.getState().enabled));
$('slideshow-speed').addEventListener('change',e=>slideshow.setIntervalSeconds(Number(e.target.value)));
document.addEventListener('visibilitychange',()=>slideshow.setBlocked('hidden',Boolean(document.hidden)));
reduced.addEventListener?.('change',()=>{slideshow.setBlocked('reduced-motion',reduced.matches);if(reduced.matches)cancelRoulette();});
root.addEventListener('yearbook:motion-state',e=>{slideshow.setBlocked('motion',Boolean(e.detail?.paused));if(e.detail?.paused){cancelRoulette();doorClock.cancel();}});
if(typeof MutationObserver!=='undefined'){
 const dialogObserver=new MutationObserver(()=>slideshow.setBlocked('dialog',Boolean(document.querySelector('dialog[open]'))));
 document.querySelectorAll('dialog').forEach(dialog=>dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
}
if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{cancelRoulette();doorClock.cancel();slideshow.setEnabled(false);});

slideshow.setBlocked('palace',root.dataset.palaceState!=='gallery');
load();



// Scene-contained magic with native touch and keyboard controls.
const festivalScene = document.querySelector('.festival-scene');
initFestivalScene({ scene: festivalScene, root });
initCreatorCauldron({ strip: $('room-dots'), target: $('festival-play'), scene: festivalScene, root, onActivity: active => slideshow?.setBlocked('creator-drag', active) });
