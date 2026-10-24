import {createTownSceneImages} from './scene-images.js';
import {createTownEyeCamera,townEyeLevel} from './eye-camera.js';
import {townControlOffset} from './camera-framing.js';
import {initDisplayMode,migrateDisplayMode} from '../display-mode.js?v=20261019-unified1';
import {createReadingJourney} from './reading-journey.js?v=20261019-journey1';
import {bindPinchZoom} from '../touch-camera.js?v=20261019-journey1';
import {readPadMode,savePadMode} from '../control-preferences.js?v=20261019-journey1';
import {createControlSettings} from '../control-settings.js?v=20261019-journey1';
import {createSceneNameOverlay} from '../scene-names.js?v=20261019-homes2';
import {CREATOR_HOMES,getCreatorHome} from './creator-homes.js?v=20261019-homes2';
import {readCameraDistance,saveCameraDistance,readCameraZoom,saveCameraZoom,normalizeCameraZoom,nextCameraDistance,cameraDistanceLabel} from '../camera-distance.js?v=20261019-journey1';
import {createReloadControl} from '../safe-page-reload.js?v=20261017-reload1';
import {createTownSession} from './controller.js?v=20261019-homes2';
import {createTownStore,importTownState,exportTownState} from './save-model.js?v=20261019-homes2';
import {initialTownState,townJournal,townInventory,townProgress,getTownMap,isTownWalkable,getNearbyTargets} from './town-model.js?v=20261019-homes2';
import {createTownRenderer,renderTownBattle} from './renderer.js?v=20261019-homes2';
import {createTownCharacterArt} from './character-art.js?v=20261019-homes2';
import {TOWN_BATTLE_ART_IDS} from './visual-data.js?v=20261019-scene1';
import {createTownViewController} from './view-mode.js?v=20261019-journey1';
import {createTownAudio} from './audio.js?v=20261017-palace-panel1';
import {TOWN_SPEEDS,readTownPreferences,saveTownPreferences,resolveTownLayout} from './preferences.js?v=20261019-homes2';
import {bindDirectionPad,bindHeldGameButton,protectGameSurface} from '../maze/game-input.js?v=20261019-journey1';
import {createFrameLoop} from '../maze/frame-loop.js?v=20261017-review1';
import {initViewport} from '../viewport.js?v=20261016-ios1';
import {initGameDisplay} from '../game-display.js?v=20261019-interior1';
import {withDeadline} from '../transition-effects.js?v=20261016-living1';
const $=id=>document.getElementById(id),panel=$('town-panel'),content=$('town-panel-content');
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const button=(text,action,cls)=>{const node=el('button',text,cls);node.type='button';node.onclick=action;return node;};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let settings=readTownPreferences().preferences;
let cameraDistance=readCameraDistance('town'),cameraZoom=readCameraZoom('town'),padMode=readPadMode(),padBinding=null;
const sceneNames=createSceneNameOverlay(document.querySelector('.town-world'));
const store=createTownStore();
let readingJourney=null;
let ready=false,renderer=null,characterArt=null,bootRequest=0,bootAbort=null,pageActive=true,returnFocus=null,panelKind='',panelRevision=0,dialogueTarget=null,minimapSignature='',hudSignature='',toastTimer=null,battleCanvas=null,battleRevision=-1,battleArtReady=false,battleArtFailed=false;
let sceneImages=createTownSceneImages();
let viewController=null,lastTownFrame=null,battleBackdropId=null,townWorldModule=null,homeRouteAt=0,homeRouteSignature='';
let eyeControlSignature=null;let cameraOffsetY=0;const eyeCamera=createTownEyeCamera();
let direction=null,canvasPointer=null,worldTime=0,displayPreferences=null,layoutPreferences=null,resizeFrame=null;const keys=new Set(),held=new Set(),bindings=[];
const audio=createTownAudio({onChange:updateAudioUI});
const session=createTownSession({store,onNotice:notify,onChange:snapshot=>{if(snapshot.save)saveStatus(snapshot.save);updateHUD();}});
function motion(){return settings.motion&&!reduced.matches;}
function notify(text){if(!text)return;$('town-toast').textContent=text;$('town-toast').dataset.visible='true';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('town-toast').dataset.visible='false',4200);}
function saveStatus(result){$('save-status').textContent=result.ok?'この端末に記録済み':'保存できません・メニューで確認';$('save-status').dataset.error=String(!result.ok);if(!result.ok&&panelKind==='save')$('town-save-message')?.replaceChildren(document.createTextNode(result.notice||'保存できませんでした。'));}
function persistSettings(){const result=saveTownPreferences(settings);settings=result.preferences;if(!result.ok)notify('表示設定を保存できません。この画面では変更を使えます。');applySettings();}
function applySettings(){layoutPreferences?.refresh();document.body.dataset.motion=String(motion());$('lantern-toggle').textContent=settings.lantern?'ランタン ON':'ランタン OFF';$('lantern-toggle').setAttribute('aria-pressed',String(settings.lantern));renderer?.invalidate?.();resize();}
function clearInput(){keys.clear();held.clear();direction=null;for(const binding of bindings)binding.reset();session.stop();const previous=canvasPointer;canvasPointer=null;if(previous)try{previous.surface.releasePointerCapture(previous.id);}catch{}}
function activeTownRenderer(){const view=viewController?.snapshot();return view?.active==='3d'?view.view:renderer;}
function updateViewUI(state){
 clearInput();const active=state.active==='3d',old=document.activeElement;
 if(returnFocus===$('town-canvas')||returnFocus===$('town-webgl'))returnFocus=active?$('town-webgl'):$('town-canvas');
 $('town-webgl').hidden=!active;$('town-canvas').hidden=active;
 const skip=document.querySelector('.skip-link');if(skip)skip.href=active?'#town-webgl':'#town-canvas';
 if(old===$('town-canvas')||old===$('town-webgl'))(active?$('town-webgl'):$('town-canvas')).focus({preventScroll:true});
 const status=$('town-view-status');if(status)status.textContent=state.status==='loading'?'3Dの街を準備中です。2Dで歩き続けられます。':state.status==='failed'?'3Dを使えませんでした。2Dで続きを遊べます。':active?(eyeView()?'目線の高さの3Dです。ドラッグで見回せます。':'3Dの見下ろし表示です。屋外の標準視点で目線の高さに戻ります。'):'2Dの見下ろし表示です。';
 const retry=$('town-view-retry');if(retry)retry.hidden=state.status!=='failed';
 const detail=state.failureReason||'3Dを使えませんでした。もう一度お試しください。';if(status&&state.status==='failed')status.textContent=detail;
 for(const mode of ['2d','3d']){const b=$('town-view-'+mode);if(b){b.setAttribute('aria-pressed',String(state.active===mode));b.disabled=mode==='3d'&&state.status==='loading';}}
 const banner=$('town-mode-banner'),message=$('town-mode-message'),again=$('town-mode-retry');if(banner){banner.hidden=!['loading','failed'].includes(state.status);message.textContent=state.status==='failed'?detail:'3Dを準備中です。2Dで歩き続けられます。';again.hidden=state.status!=='failed';}
 // The persistent retry banner already announces failures; do not cover the street with a duplicate toast.
 updateEyeControls();scheduleResize();
}
function updateEyeControls(){const eye=eyeView();if(eyeControlSignature===eye)return;eyeControlSignature=eye;const status=$('town-view-status');if(status&&viewController?.snapshot().status==='ready')status.textContent=eye?'目線の高さの3Dです。ドラッグで見回せます。':'3Dの見下ろし表示です。屋外の標準視点で目線の高さに戻ります。';const labels=eye?['前へ歩く','左を向く','右を向く','後ろへ歩く']:['北へ歩く','西へ歩く','東へ歩く','南へ歩く'];for(const [index,b]of [...$('town-pad').querySelectorAll('button')].entries())if(labels[index])b.setAttribute('aria-label',labels[index]);$('town-webgl').setAttribute('aria-label',eye?'目線の高さで街を探索。ドラッグで見回し、上下で前後、左右で向きを変えます。':'街の見下ろし探索。矢印キーかWASDで歩きます。');}
function resetTownView(){viewController?.destroy();viewController=null;$('town-webgl').hidden=true;$('town-canvas').hidden=false;const skip=document.querySelector('.skip-link');if(skip)skip.href='#town-canvas';if(returnFocus===$('town-webgl'))returnFocus=$('town-canvas');}
function prepareTownView(){
 viewController=createTownViewController({load:async({signal,onContextLost})=>{
  const module=await(townWorldModule||import('./world-3d.js?v=20261019-homes2'));if(!module)throw Error('Town renderer unavailable');
  if(signal.aborted)throw Error('Old town view request');
  return module.createTownWorld3D({canvas:$('town-webgl'),art:characterArt.art,onContextLost,loadImage:sceneImages.load});
 },onChange:updateViewUI});
 void viewController.setMode(settings.view);
}
function beginPanel(title,{kind='page',eyebrow='THE LANTERN TOWN'}={}){displayPreferences?.destroy();displayPreferences=null;panelRevision++;clearInput();panelKind=kind;if(kind==='battle')loop.start();else loop.stop();panel.classList.toggle('battle-mode',kind==='battle');battleCanvas=null;content.replaceChildren();const heading=el('h2',title);heading.id='town-panel-title';content.append(el('p',eyebrow,'eyebrow'),heading);if(!panel.open){returnFocus=document.activeElement;panel.showModal();}panel.scrollTop=0;content.scrollTop=0;}
function closePanel(){if(session.snapshot().battle){const result=session.leaveBattle();if(result?.notice)notify(result.notice);}panel.close();}
panel.addEventListener('close',()=>{displayPreferences?.destroy();displayPreferences=null;panelRevision++;clearInput();panelKind='';dialogueTarget=null;battleCanvas=null;battleRevision=-1;panel.classList.remove('battle-mode');returnFocus?.focus?.({preventScroll:true});loop.start();});
panel.addEventListener('cancel',event=>{event.preventDefault();closePanel();});$('panel-close').onclick=closePanel;
function applyInteraction(result,targetId){
 if(!result)return;if(result.creatorWorks){showCreatorHome(result.creatorWorks);return;}if(result.exit){showCastleReturn();return;}
 if(result.battle){const battle=session.beginBattle(result.battle);if(battle){battleArtReady=false;battleArtFailed=false;renderBattle();void prepareBattleArt();}return;}
 if(result.transition){eyeCamera.sync(result.state,{reset:true});const room=getTownMap(result.state.mapId);if(room.creatorHome)readingJourney?.visit(room.creatorHome.creatorId);renderer?.invalidate?.();panel.close();clearInput();notify(result.notice||room.name);return;}
 if(result.dialogue){showDialogue(result.dialogue,targetId);return;}
 if(result.notice)notify(result.notice);
}
function contextTarget(){const state=session.snapshot().state,ordinary=getNearbyTargets(state,1.65).filter(item=>!item.creatorHome||!characterArt?.isHomeResidentVisible?.(item.id,state)).map(item=>({...item,distance:Math.hypot(item.x-state.position.x,item.z-state.position.z)})).sort((a,b)=>a.distance-b.distance)[0],guest=characterArt?.nearbyVisitor(state);return guest&&(!ordinary||Math.hypot(guest.x-state.position.x,guest.z-state.position.z)<ordinary.distance)?{...guest,type:'visitor'}:ordinary;}
function interact(targetId,choiceId){if(!ready||session.snapshot().battle)return;const target=contextTarget(),id=targetId||target?.id,state=session.snapshot().state,map=getTownMap(state.mapId),item=[...(map.targets||[]),...(map.npcs||[])].find(item=>item.id===id);if(item&&(item.type==='creator-works'||item.creatorHome)&&Math.hypot(item.x-state.position.x,item.z-state.position.z)<=2.05){showCreatorHome(item.creatorId);return;}if(characterArt?.visitor(id)){showVisitor(id);return;}applyInteraction(session.interact(id,choiceId),id);}
function showDialogue(dialogue,targetId){
 dialogueTarget=targetId;beginPanel(dialogue.title||dialogue.speaker||'街の物語',{kind:'dialogue',eyebrow:dialogue.speaker||'街の物語'});
 content.append(el('p',dialogue.text||'','dialogue-text'));const choices=el('div',undefined,'dialogue-choices');
 for(const choice of dialogue.choices||[])choices.append(button(choice.label,()=>interact(targetId,choice.id),choice.primary?'primary':''));
 choices.append(button('クリエイターエリアへ',visitCreatorQuarter),button('クリエイター宅を選ぶ',showCreatorHomes),button('街を歩く',closePanel));content.append(choices);choices.querySelector('button')?.focus({preventScroll:true});
}
function showCastleReturn(){beginPanel('城へ戻りますか。');content.append(el('p','街の記録を保存して、宮殿の入口へ戻ります。城の中の冒険は、街とは別の記録で続けられます。'));const link=el('a','城へ戻る','button-link primary');link.href='../?return=palace';link.onclick=prepareExit;content.append(link,button('街歩きを続ける',closePanel));}
const pageReload=createReloadControl({save:()=>session.snapshot().battle?{ok:false,notice:'対戦を終えてから再読み込みしてください。'}:session.save(),beforeReload:()=>{clearInput();audio.stop({resetVolume:true});}});
function prepareReadingJourney(){
 const people=CREATOR_HOMES.filter(home=>home.creatorId!=='ss_yr').concat(CREATOR_HOMES.filter(home=>home.creatorId==='ss_yr')).map(home=>{const person=characterArt?.creatorPage?.(home.creatorId);return person?{...person,name:home.creatorName}:null;}).filter(Boolean);
 let storage;try{storage=localStorage;}catch{}if(readingJourney)readingJourney.setPeople(people);else readingJourney=createReadingJourney({people,storage,onChange:()=>{hudSignature='';updateHUD();}});
}
function readingProgress(state){
 const journey=readingJourney?.snapshot();if(!journey?.total)return townProgress(state);
 if(journey.complete)return {title:'終章　物語の灯りがつながった',objective:`${journey.readCount}人の作品を巡りました。好きな家を、また訪ねてみよう。`,completed:true};
 const person=journey.selected,home=getCreatorHome(person?.id),row=home?Math.floor((home.z-3)/11)+1:1,col=home?Math.floor((home.x-3)/11)+1:1;
 const room=getTownMap(state.mapId).creatorHome;
 const objective=room?`${room.creatorName}のアトリエです。本人や作品机を調べて記事へ。南の扉から家の前へ。小パネル「街へ戻る」で広場へ戻れます。`:state.mapId==='creator-quarter'?`北から${row}列目・西から${col}軒目の「${person.name}の家」へ。玄関で「家の中へ入る」を選ぼう。`:state.mapId==='lantern-town'?`金色の道案内「参加者の家 →」をたどって住宅街へ。「${person.name}の家」に招待状が届いています。`:'街の金色の道案内から、参加者の家へ向かおう。';
 return {title:`記事巡り　${journey.readCount}/${journey.total}人の物語`,objective,completed:false};
}
function appendReadingMark(creatorId,url,link){
 const person=readingJourney?.snapshot().people.find(person=>person.id===creatorId);if(!person?.works.some(work=>work.url===url))return;
 const marked=person.readURLs.includes(url),mark=button(marked?'読んだしるしを残しました':'読んだしるしを残す',()=>{
  if(!readingJourney.markRead(creatorId,url))return;mark.textContent='読んだしるしを残しました';mark.disabled=true;readingJourney.select(creatorId);readingJourney.next();const state=readingJourney.snapshot();notify(state.complete?'みんなの物語の灯りがつながりました。':`読んだしるしを残しました。次は${state.selected.name}の物語へ。`);updateHUD();
 });mark.className='reading-mark';mark.disabled=marked||!person.openedURLs.includes(url);
 link.addEventListener('click',()=>{readingJourney.openArticle(creatorId,url);const current=readingJourney.snapshot().people.find(person=>person.id===creatorId);mark.disabled=!current||current.readURLs.includes(url)||!current.openedURLs.includes(url);updateHUD();});content.append(mark);
}
function drawReadingWaypoint(canvas,state){
 const journey=readingJourney?.snapshot();if(!journey?.selected||journey.complete)return;const map=getTownMap(state.mapId),home=getCreatorHome(journey.selected.id),point=state.mapId==='creator-quarter'?home?.door:state.mapId==='lantern-town'?map.portals.find(portal=>portal.to==='creator-quarter'):map.portals[0];if(!point)return;
 const c=canvas.getContext('2d'),scale=Math.min((canvas.width-20)/map.width,(canvas.height-20)/map.height),x=(canvas.width-map.width*scale)/2+point.x*scale,y=(canvas.height-map.height*scale)/2+point.z*scale;c.save();c.strokeStyle='#ffe09b';c.lineWidth=canvas.width>300?4:2;c.beginPath();c.arc(x,y,canvas.width>300?12:5,0,Math.PI*2);c.stroke();c.restore();
}
function showJournal(){
 const journey=readingJourney?.snapshot();if(!journey?.total){showTownJournal();return;}
 beginPanel('招待状と物語の手帳',{kind:'reading',eyebrow:'A LETTER TO YOUR NEXT STORY'});content.append(el('p','街に届いた招待状を手がかりに、参加者の家から作品を読みに行く旅です。訪ねる順番は自由です。','dialogue-text'));
 const progress=el('progress');progress.max=journey.total;progress.value=journey.readCount;progress.setAttribute('aria-label',`読んだしるし ${journey.readCount}/${journey.total}`);content.append(progress,el('p',`${journey.readCount}/${journey.total}人の物語に、読んだしるしが灯りました。`));
 if(journey.complete)content.append(el('p','物語の灯りが、街をひと巡りしました。好きな作品をまた読みに行こう。','dialogue-text'));
 const list=el('div',undefined,'reading-list');for(const person of journey.people){const home=getCreatorHome(person.id),card=el('section',undefined,'town-card');card.dataset.status=person.read?'complete':person.selected?'active':'available';card.append(el('h3',person.name),el('p',home.homeLabel),el('p',person.read?'読んだしるしが灯っています。':person.visited?'家を訪ねました。次は参加作品を読みに行こう。':'招待状が届いています。'),button(person.selected?'いまの行き先':'この人の家を行き先にする',()=>{readingJourney.select(person.id);showJournal();}),button('作品のページをひらく',()=>showCreatorHome(person.id)));list.append(card);}content.append(list,el('p','記事を開いた後、読み終えたら「読んだしるしを残す」を選べます。作品準備中の方にも家とプロフィールがあります。','subtle'),button('街の地図を見る',showMap),button('街の依頼を見る',showTownJournal),button('街歩きに戻る',closePanel));
}
function showMenu(){
 beginPanel('メニュー',{kind:'menu',eyebrow:'星灯りの街'});const progress=readingProgress(session.snapshot().state);content.append(el('p',progress.title,'game-menu-progress'));
 const menu=el('div',undefined,'town-menu');menu.dataset.gameMenu='true';menu.setAttribute('aria-label','探索メニュー');
 const lanternButton=button(settings.lantern?'ランタン ON':'ランタン OFF',()=>{toggleLantern();lanternButton.textContent=settings.lantern?'ランタン ON':'ランタン OFF';lanternButton.setAttribute('aria-pressed',String(settings.lantern));});lanternButton.setAttribute('aria-pressed',String(settings.lantern));
 const cameraToggle=button('視点：'+cameraDistanceLabel(cameraDistance),()=>{$('camera-distance').click();cameraToggle.textContent='視点：'+cameraDistanceLabel(cameraDistance);});
 menu.append(button('地図',showMap),lanternButton,button('歩く速さ',showWalkingSpeed),cameraToggle,button('パッド・拡大縮小',showControlSettings),button('明るさ・音・表示',showSettings));
 for(const [label,action]of[['クリエイター宅を選ぶ',showCreatorHomes],['街の仲間',showVisitors],['物語の手帳',showJournal],['街の依頼（寄り道）',showTownJournal],['持ち物',showInventory],['記録・バックアップ',showSave]])menu.append(button(label,action));
 const compare=el('a','キャラ見比べ','button-link');compare.href='../characters/';compare.target='_blank';compare.rel='noopener noreferrer';menu.append(compare,button('操作と物語について',showHelp));
 const scenery=renderer?.status?.();if(scenery?.failed?.length)menu.append(button('街の景色を読み込み直す',()=>{closePanel();void renderer?.retry?.().then(()=>{renderer?.invalidate?.();notify(renderer?.status?.().failed?.length?'読み込めない景色があります。もう一度お試しください。':'街の景色を読み込み直しました。');});}));
 menu.append(button('画面レイアウト・パッド位置',showMenuLayoutSettings),pageReload.element,button('城へ戻る',showCastleReturn),button('探索に戻る',closePanel));content.append(menu);
}
function showMenuLayoutSettings(){
 beginPanel('画面レイアウト・パッド位置',{kind:'layout'});const controls=el('section');content.append(controls);const frame=initGameDisplay({controlsParent:controls,page:'town',onChange:scheduleResize}),layout=initDisplayMode({controlsParent:controls,page:'town'});displayPreferences={destroy(){frame?.destroy();layout?.destroy();}};content.append(button('メニューに戻る',showMenu));
}

function showVisitor(id){
 const visitor=characterArt?.visitor(id);if(!visitor||visitor.interactive===false)return;beginPanel(visitor.name,{kind:'visitor',eyebrow:'FRIENDS OF THE ATELIER'});if(visitor.label!==visitor.name)content.append(el('h3',visitor.label));content.append(el('p',visitor.greeting,'dialogue-text'),el('p',characterArt.fictionNotice,'subtle'));
 const guest=visitor.participationRole==='profile-guest';if(guest)content.append(el('p','参加作品は投稿待ちです。公式プロフィールからご覧ください。','subtle'));
 const links=guest?[]:visitor.articleLinks||[];const unique=new Set();for(const item of links){if(unique.has(item.url))continue;unique.add(item.url);const link=el('a',item.title||'参加記事を読む ↗','button-link');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';content.append(link);appendReadingMark(visitor.creatorId,item.url,link);}
 if(visitor.profileURL){try{const url=new URL(visitor.profileURL);if(url.protocol==='https:'&&url.hostname==='note.com'&&!url.port&&!url.username&&!url.password){const link=el('a','公式プロフィールを見る ↗','button-link');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';content.append(link);}}catch{}}
 if(getCreatorHome(visitor.creatorId))content.append(button('この人の家・参加作品を見る',()=>showCreatorHome(visitor.creatorId)));
 content.append(button('街の仲間を見る',showVisitors),button('クリエイターエリアへ',visitCreatorQuarter),button('クリエイター宅を選ぶ',showCreatorHomes),button('街を歩く',closePanel));
}
function showCreatorHome(creatorId){
 const home=getCreatorHome(creatorId),person=characterArt?.creatorPage(creatorId);if(!home||!person)return;
 readingJourney?.visit(creatorId);beginPanel(`${home.creatorName}のクリエイターページ`,{kind:'creator-home',eyebrow:home.homeLabel});
 const identity=el('section',undefined,'creator-home-identity');
 if(person.avatar){const image=el('img');image.src=new URL(person.avatar,new URL('../',import.meta.url)).href;image.alt=`${person.name}のプロフィール画像`;image.width=96;image.height=96;image.decoding='async';image.onerror=()=>image.remove();identity.append(image);}
 identity.append(el('h3',person.name));content.append(identity,el('p',home.description||home.homeLabel,'dialogue-text'),button('この家へ行く',()=>visitCreatorHome(creatorId)));
 if(person.profileURL){const link=el('a','公式noteのクリエイターページを開く ↗','button-link primary');link.href=person.profileURL;link.target='_blank';link.rel='noopener noreferrer';content.append(link);}
 content.append(el('h3','参加作品'));
 if(person.pending)content.append(el('p','参加作品は準備中です。公式noteから、その人の発信をご覧いただけます。','subtle'));
 for(const work of person.works){const card=el('a',undefined,'town-card creator-home-work');card.href=work.url;card.target='_blank';card.rel='noopener noreferrer';
  if(work.image){const image=el('img');image.src=new URL(work.image,new URL('../',import.meta.url)).href;image.alt=work.imageAlt;image.loading='lazy';image.decoding='async';image.onerror=()=>image.remove();card.append(image);}
  card.append(el('strong',work.title),el('span',work.introduction?'企画紹介をnoteで読む ↗':'作品をnoteで読む ↗'));content.append(card);appendReadingMark(creatorId,work.url,card);
 }
 content.append(el('p','家の名前や飾りは、この街のために作った演出です。','subtle'),button('ほかの参加者の家を見る',showCreatorHomes),button('街歩きに戻る',closePanel));
}
function showCreatorHomes(){
 beginPanel('クリエイター宅へ',{kind:'homes',eyebrow:'CREATORS’ QUARTER'});content.append(el('p',`${CREATOR_HOMES.length}人それぞれの家とアトリエが並ぶ住宅街。「この家へ行く」で玄関前へ。扉から室内へ入って、本人や作品机を調べてみよう。`,'dialogue-text'),button('クリエイターエリアへ行く',visitCreatorQuarter, 'primary'));
 const search=el('input');search.type='search';search.placeholder='クリエイター名・家の名前で検索';search.setAttribute('aria-label','クリエイター宅を検索');const count=el('p',`${CREATOR_HOMES.length}件の家`,'subtle');count.setAttribute('role','status');content.append(search,count);
 const list=el('div',undefined,'inventory-list');for(const home of CREATOR_HOMES){const card=el('section',undefined,'town-card');card.style.setProperty('--home-color',home.homePalette?.roof||'#bca56b');card.append(el('h3',home.creatorName),el('p',home.homeLabel),button('この家へ行く',()=>visitCreatorHome(home.creatorId),'primary'));const available=!!characterArt?.creatorPage(home.creatorId);const page=button('クリエイターページを見る',()=>showCreatorHome(home.creatorId));page.disabled=!available;card.append(page);list.append(card);}search.oninput=()=>{const query=search.value.trim().normalize('NFKC').toLocaleLowerCase('ja');let matches=0;for(const [index,card]of Array.from(list.children).entries()){const home=CREATOR_HOMES[index];card.hidden=!`${home.creatorName} ${home.homeLabel}`.normalize('NFKC').toLocaleLowerCase('ja').includes(query);if(!card.hidden)matches++;}count.textContent=matches?`${matches}件の家`:'見つかりません。別の名前で検索してください。';};content.append(list,el('p','街中の「参加者の家 →」の門から、歩いて住宅街へ入ることもできます。','subtle'),button('現在地の地図を見る',showMap),button('街歩きに戻る',closePanel));
}
function visitCreatorQuarter(){
 if(!ready)return;const result=session.visitCreatorQuarter();if(!result)return;returnFocus=$('town-webgl').hidden?$('town-canvas'):$('town-webgl');applyInteraction(result);
 ($('town-webgl').hidden?$('town-canvas'):$('town-webgl')).focus({preventScroll:true});
}
function visitCreatorHome(creatorId=readingJourney?.snapshot().selected?.id||CREATOR_HOMES[0]?.creatorId){
 if(!ready)return;const result=session.visitCreatorHome(creatorId);if(!result)return;
 readingJourney?.select(creatorId);returnFocus=$('town-webgl').hidden?$('town-canvas'):$('town-webgl');applyInteraction(result);
 ($('town-webgl').hidden?$('town-canvas'):$('town-webgl')).focus({preventScroll:true});
}
function showVisitors(){
 beginPanel('街に集まった仲間');content.append(el('p','無名S noteは、あなたが動かす主人公です。街の通りでは、企画に集まった仲間たちに会えます。','subtle'));const groups=new Map();for(const visitor of characterArt?.visitors()||[]){if(!groups.has(visitor.creatorId))groups.set(visitor.creatorId,[]);const members=groups.get(visitor.creatorId),sourceId=visitor.sourceCharacterId||visitor.id;if(!members.some(member=>(member.sourceCharacterId||member.id)===sourceId))members.push(visitor);}
 const list=el('div',undefined,'inventory-list');for(const members of groups.values()){const card=el('section',undefined,'town-card');card.append(el('h3',members[0].name));if(members[0].participationRole==='profile-guest')card.append(el('p','作品は投稿待ち・公式プロフィールから参加','subtle'));for(const visitor of members.filter(person=>person.interactive!==false))card.append(button(visitor.label+'と話す',()=>showVisitor(visitor.id)));list.append(card);}const status=characterArt?.status();if(status?.failed)content.append(el('p','一部の仲間の姿を読み込めませんでした。名前から会話と記事・プロフィールを開けます。','subtle'),button('仲間の姿を読み込み直す',()=>{characterArt.retryVisitors();closePanel();notify('近くの仲間の姿をもう一度準備します。');}));content.append(list,el('p',characterArt?.fictionNotice||'会話はゲーム内の創作です。','subtle'),button('メニューに戻る',showMenu));
}
function showTownJournal(){
 beginPanel('街の依頼（寄り道）');const state=session.snapshot().state,progress=townProgress(state);content.append(el('p',progress.objective));
 const labels={complete:'達成',active:'進行中',available:'街で見つける',locked:'これからの物語'};
 for(const quest of townJournal(state)){const card=el('section',undefined,'town-card');card.dataset.status=quest.status;card.append(el('span',labels[quest.status]||quest.status,'status'),el('h3',quest.title||quest.name),el('p',quest.objective||quest.description));content.append(card);}
 content.append(button('メニューに戻る',showMenu));
}
function showInventory(){
 beginPanel('持ち物');const state=session.snapshot().state;content.append(el('p',`体力 ${state.hp}/${state.maxHp}　灯り ${state.energy}/3　${state.coins} ルーメン`));
 const list=el('div',undefined,'inventory-list');for(const item of townInventory(state)){const card=el('section',undefined,'town-card');card.append(el('h3',item.name),el('strong',`× ${item.count}`,'inventory-count'),el('p',item.description));list.append(card);}if(!list.children.length)list.append(el('p','今は、身軽な旅支度です。'));content.append(list,el('p','星蜜の小瓶は戦闘中に使えます。街の宿屋やベンチでは、休んで体力を戻せます。','subtle'),button('メニューに戻る',showMenu));
}
function showMap(){
 const state=session.snapshot().state,map=getTownMap(state.mapId);beginPanel(map.name||'街の地図');const canvas=el('canvas',undefined,'town-map-large');canvas.width=960;canvas.height=720;canvas.setAttribute('aria-label',`${map.name}の地図。三角が現在位置です。`);content.append(canvas);renderer?.drawMap(canvas,state);drawReadingWaypoint(canvas,state);content.append(el('p',state.mapId==='creator-quarter'?'参加者の家が並ぶ住宅街です。各玄関から室内へ入り、本人や作品机から作品を開けます。東・西・南の並木道から、歩いて星灯りの街へ戻れます。':state.mapId==='lantern-town'?'クリエイターエリアへは東・西・南の並木道を歩いて進めます。画面の「クリエイターエリアへ」でも広場へ移動できます。城門は北、従来の案内門は広場の西側です。建物の扉に近づき「入る」を選ぶと室内へ進めます。':'現在いる建物の見取り図です。出口の扉へ近づき、調べると通りへ戻れます。','subtle'),el('p','金色の輪は、次に訪ねる場所です。','subtle'),button('物語の手帳を開く',showJournal),button('クリエイターエリアへ',visitCreatorQuarter),button('クリエイター宅を選ぶ',showCreatorHomes),button('街を歩く',closePanel));
}
function setSceneZoom(value,{persist=true}={}){cameraZoom=normalizeCameraZoom(value);if(persist)saveCameraZoom('town',cameraZoom);updateCameraButton();renderer?.invalidate?.();viewController?.snapshot().view?.invalidate?.();}
function showControlSettings(){beginPanel('パッド・拡大縮小');content.append(createControlSettings({getMode:()=>padMode,setMode:value=>{clearInput();padMode=savePadMode(value).mode;padBinding?.refresh();},getZoom:()=>cameraZoom,setZoom:setSceneZoom}),button('街歩きに戻る',closePanel));}
function chooseTownView(mode,{retry=false}={}){clearInput();settings.view=mode;persistSettings();void viewController?.setMode(mode,{retry:retry||mode==='3d'&&viewController?.snapshot().status==='failed'});}
function showWalkingSpeed(){
 beginPanel('歩く速さ',{kind:'speed'});const label=el('label','歩く速さを選ぶ');label.htmlFor='town-walking-speed';const range=el('input');Object.assign(range,{id:'town-walking-speed',type:'range',min:'.5',max:'2',step:'.25',value:String(settings.speed)});const output=el('output',`${settings.speed}倍`);output.htmlFor=range.id;
 const update=value=>{settings.speed=Number(value);persistSettings();range.value=String(settings.speed);output.textContent=`${settings.speed}倍`;range.setAttribute('aria-valuetext',`${settings.speed}倍`);};range.oninput=()=>update(range.value);range.setAttribute('aria-valuetext',`${settings.speed}倍`);
 const presets=el('div',undefined,'button-row');for(const [value,name]of[[.5,'ゆっくり'],[1,'標準'],[1.5,'速い'],[2,'最速']])presets.append(button(`${name} ${value}倍`,()=>update(value)));
 const section=el('section',undefined,'settings-grid');range.className='full';label.className='full';section.append(label,range,output);content.append(section,presets,el('p','0.5〜2倍を0.25刻みで選べます。この端末に保存し、次回も同じ速さで歩きます。','subtle'),button('標準の1倍に戻す',()=>update(1)),button('メニューに戻る',showMenu));
}
function showSettings(){
 beginPanel('街の明るさ・音・画面',{kind:'settings'});const displayControls=el('section');content.append(displayControls);const frame=initGameDisplay({controlsParent:displayControls,page:'town',onChange:scheduleResize}),layout=initDisplayMode({controlsParent:displayControls,page:'town'});displayPreferences={destroy(){frame?.destroy();layout?.destroy();}};const grid=el('div',undefined,'settings-grid');
 const viewLabel=el('label','街の見え方','full');viewLabel.htmlFor='town-view-mode';const viewSelect=el('select');viewSelect.id='town-view-mode';
 for(const [value,label]of[['3d','3D・立体の街'],['2d','2D・軽い表示']]){const option=el('option',label);option.value=value;viewSelect.append(option);}viewSelect.value=settings.view;
 viewSelect.onchange=()=>{clearInput();settings.view=viewSelect.value;persistSettings();void viewController?.setMode(settings.view);};
 const viewStatus=el('p',undefined,'subtle full');viewStatus.id='town-view-status';viewStatus.setAttribute('role','status');
 const retryView=button('3Dをもう一度準備する',()=>{settings.view='3d';viewSelect.value='3d';persistSettings();void viewController?.setMode('3d',{retry:true});},'full');retryView.id='town-view-retry';retryView.hidden=true;
 grid.append(viewLabel,viewSelect,viewStatus,retryView);
 const currentView=viewController?.snapshot();if(currentView){viewStatus.textContent=currentView.status==='loading'?'3Dを準備中です。2Dで歩き続けられます。':currentView.status==='failed'?currentView.failureReason||'3Dを使えませんでした。もう一度お試しください。':currentView.active==='3d'?(eyeView()?'目線の高さの3Dです。ドラッグで見回せます。':'3Dの見下ろし表示です。屋外の標準視点で目線の高さに戻ります。'):'2Dの見下ろし表示です。';retryView.hidden=currentView.status!=='failed';}
 const label=el('label','明るさ');label.htmlFor='town-brightness';const output=el('output',`${settings.brightness}`);output.id='town-brightness-value';const range=el('input');Object.assign(range,{id:'town-brightness',type:'range',min:'0',max:'100',step:'1',value:String(settings.brightness)});range.oninput=()=>{settings.brightness=Number(range.value);output.textContent=range.value;persistSettings();};grid.append(label,output,range,el('p','75で本来の色。文章と操作の明るさは変わりません。','subtle full'));
 const music=button('音楽をON',()=>{if(audio.snapshot().enabled)audio.stop();else void audio.start({gesture:true});},'full');music.id='town-music';music.setAttribute('aria-pressed','false');const volumeLabel=el('label','音量');volumeLabel.htmlFor='town-volume';const volumeOutput=el('output','0');volumeOutput.id='town-volume-value';const volume=el('input');Object.assign(volume,{id:'town-volume',type:'range',min:'0',max:'100',step:'1',value:String(audio.snapshot().volume)});volume.oninput=()=>audio.setVolume(volume.value);volume.onpointerup=()=>audio.resumeFromGesture();volume.onchange=()=>audio.resumeFromGesture();const status=el('p',undefined,'subtle full');status.id='town-audio-status';status.setAttribute('role','status');grid.append(music,volumeLabel,volumeOutput,volume,status);
 const movement=button(motion()?'動き：ON → 減らす':'動き：減らす → ON',()=>{if(reduced.matches){notify('端末の「動きを減らす」を優先しています。');return;}settings.motion=!settings.motion;persistSettings();showSettings();},'full');movement.setAttribute('aria-pressed',String(motion()));if(reduced.matches){movement.disabled=true;movement.textContent='端末の設定で動きを減らしています';}grid.append(movement);
 
 const speedLabel=el('label','歩く速さ','full');speedLabel.htmlFor='town-speed';const speed=el('select');speed.id='town-speed';for(const value of TOWN_SPEEDS){const option=el('option',`${value}倍`);option.value=String(value);speed.append(option);}speed.value=String(settings.speed);speed.onchange=()=>{settings.speed=Number(speed.value);persistSettings();};grid.append(speedLabel,speed);content.append(grid,el('p','音は起動時とページに戻った時にOFF・音量0です。再生は自分でONにした時だけ始まります。','subtle'),button('メニューに戻る',showMenu));updateAudioUI(audio.snapshot());
}
function updateAudioUI(state){const toggle=$('town-music');if(toggle){toggle.textContent=state.enabled?'音楽をOFF':'音楽をON';toggle.setAttribute('aria-pressed',String(state.enabled));}const volume=$('town-volume');if(volume)volume.value=String(state.volume);if($('town-volume-value'))$('town-volume-value').textContent=String(state.volume);if($('town-audio-status'))$('town-audio-status').textContent=state.message;}
function showSave(){
 beginPanel('街歩きの記録',{kind:'save'});const state=session.snapshot().state,message=el('p','ここでは街だけの記録を扱います。');message.id='town-save-message';message.setAttribute('role','status');content.append(message);
 const controls=el('div',undefined,'button-row');controls.append(button('今の続きを保存',()=>{const result=session.save();message.textContent=result.ok?'続きを保存しました。':result.notice;}));content.append(controls);
 const box=el('section',undefined,'save-controls'),label=el('label','バックアップと復元');label.htmlFor='town-save-text';const text=el('textarea');text.id='town-save-text';text.spellcheck=false;text.setAttribute('aria-label','街のバックアップ本文');const current=()=>exportTownState(session.snapshot().state);text.value=current();
 const row=el('div',undefined,'button-row');row.append(button('今の記録を本文に出す',()=>{text.value=current();message.textContent='本文を出しました。コピーかファイル保存ができます。';}),button('端末に保存された原文を出す',()=>{const raw=store.readRaw?.();text.value=typeof raw==='string'?raw:current();message.textContent='端末の原文です。壊れた保存でも、そのまま取り出せます。';}),button('本文をコピー',async()=>{try{await navigator.clipboard.writeText(text.value);message.textContent='バックアップ本文をコピーしました。';}catch{text.focus();text.select();message.textContent='本文を選択しました。端末のコピー操作を使ってください。';}}),button('ファイルに保存',()=>{const url=URL.createObjectURL(new Blob([text.value],{type:'application/json'}));const a=el('a');a.href=url;a.download='mumei-town-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
 const review=el('div');row.append(button('貼り付けた本文を確認',()=>{review.replaceChildren();const parsed=importTownState(text.value);if(!parsed.ok){message.textContent=parsed.notice||'この街のバックアップ形式ではありません。今の記録は変更していません。';return;}const next=parsed.state,progress=townProgress(next);review.append(el('p',`${progress.title}／体力${next.hp}/${next.maxHp}／${next.coins}ルーメン。この記録で街歩きの続きを置き換えます。`),button('確認した記録を復元する',()=>{const result=store.replace?store.replace(next):store.save(next);if(!result.ok){message.textContent=result.notice;return;}session.replace(next);eyeCamera.sync(next,{reset:true});message.textContent='街の記録を復元しました。';review.replaceChildren();renderer?.invalidate?.();},'primary'));message.textContent='内容を確認し、復元するボタンを押してください。';}));
 box.append(label,text,row,review,el('p','復元は街の記録だけを変更します。宮殿・展示・城の中の進行は対象外です。','subtle'));content.append(box,button('最初から歩く…',()=>{review.replaceChildren(el('p','街の物語と持ち物を最初からにします。今の続きを残す場合は、先にバックアップを保存してください。'),button('街を最初から始める',()=>{const next=initialTownState(),result=store.replace?store.replace(next):store.save(next);if(!result.ok){message.textContent=result.notice;return;}session.replace(next);eyeCamera.sync(next,{reset:true});renderer?.invalidate?.();closePanel();notify('街で新しい旅を始めました。');}));}),button('メニューに戻る',showMenu));
}
function showHelp(){beginPanel('星灯りの街へ');content.append(button('参加者の家を見に行く',()=>visitCreatorHome(),'primary'),el('p','無名S noteと黒猫のもとに、物語への招待状が届きました。街中の金色の道案内から住宅街へ進み、参加者の家の中へ。キャラと話したり、各アトリエの作品机から記事を読みに行こう。次の行き先は、画面上の物語の手帳に載っています。街の住人の依頼やバトルも、寄り道で楽しめます。','dialogue-text'));const keys=el('dl',undefined,'help-keys');for(const [key,text]of[['屋外3Dの標準視点','目線の高さで歩きます。画面をドラッグして見回し、↑↓で前後、←→で旋回。W/Sで前後、A/Dで横移動。'],['2D・引き視点・屋内','矢印 / WASDで東西南北へ歩きます。屋内は家の全体が見える俯瞰です。'],['E / Enter','目の前の人と話す・扉や物を調べる'],['M','街の地図'],['J / I','旅の手帳 / 持ち物'],['L','ランタンのON / OFF'],['Esc','メニューを開く・街へ戻る'],['戦闘 1〜5','攻撃・守る・灯り・星蜜・退く']])keys.append(el('dt',key),el('dd',text));content.append(keys,el('p','街の住人と物語はゲーム内のフィクションです。展示の参加者本人の発言や経歴を表すものではありません。音・点滅・時間制限で驚かす演出はありません。','subtle'),button('街を歩く',closePanel,'primary'));}
const battleCommands=[['attack','灯杖で攻撃','灯り +1'],['guard','守る','次の攻撃を軽減・灯り +1'],['spark','星灯り','灯り 2・強い光'],['tonic','星蜜','体力 +28'],['escape','退く','街へ戻る']];
async function prepareBattleArt(){
 const current=session.snapshot().battle;if(!current)return;const id=current.id;battleArtReady=false;battleArtFailed=false;
 const ok=await characterArt.ensureMonster(TOWN_BATTLE_ART_IDS[current.enemyId]);if(session.snapshot().battle?.id!==id||!panel.open)return;battleArtReady=ok;battleArtFailed=!ok;renderBattle();
}
function renderBattle(){
 const {battle,effect,state}=session.snapshot();if(!battle)return;
 if(lastTownFrame&&battleBackdropId!==battle.id){const surface=$('town-canvas'),world=document.querySelector('.town-world'),ratio=Math.min(devicePixelRatio||1,2);surface.width=Math.max(1,Math.round(world.clientWidth*ratio));surface.height=Math.max(1,Math.round(world.clientHeight*ratio));renderer?.render({...lastTownFrame,canvas:surface,state,pixelRatio:ratio,walking:false});battleBackdropId=battle.id;}
 beginPanel(battle.enemy.name,{kind:'battle',eyebrow:'LANTERN ENCOUNTER · 時間制限なし'});const heading=el('div',undefined,'town-battle-heading');heading.append(...content.children);content.replaceChildren(heading);
 const view=el('section',undefined,'town-battle-view');battleCanvas=el('canvas');battleCanvas.id='town-battle-canvas';battleCanvas.setAttribute('aria-label',`${battle.enemy.name}との対戦。コマンドは画面下のボタンから。`);view.append(battleCanvas);const stats=el('div',undefined,'town-battle-stats');for(const [name,value,max]of[['体力',battle.playerHp,battle.maxHp],['影',battle.enemyHp,battle.enemy.maxHp],['灯り',battle.energy,battle.maxEnergy]]){const block=el('div');block.append(el('span',`${name} ${value}/${max}`));const bar=el('meter');bar.min=0;bar.max=max;bar.value=value;bar.setAttribute('aria-label',name);block.append(bar);stats.append(block);}view.append(stats);
 const controls=el('section',undefined,'town-battle-controls'),log=el('div',undefined,'town-battle-log');log.tabIndex=0;log.setAttribute('aria-label','戦闘の状況と説明');const status=el('p',battle.message);status.setAttribute('role','status');status.setAttribute('aria-live','polite');log.append(status);if(!battleArtReady){const loading=el('p',battleArtFailed?'相手の画像を準備できませんでした。再試行するか、街へ戻れます。':'相手の姿を準備しています…');loading.setAttribute('role','status');log.append(loading);if(battleArtFailed)log.append(button('画像の準備をやり直す',()=>{void prepareBattleArt();renderBattle();}));}if(battle.phase==='player'||battle.phase==='enemy')log.append(el('p',`次の合図：${battle.enemyIntent.label}`));const details=el('details');details.append(el('summary','合図と技の説明'),el('p',battle.enemyIntent.description),el('p','攻撃・守りで灯りをため、星灯りで影をほどきます。退くと安全な街の探索へ戻ります。'));log.append(details);
 const actions=el('div',undefined,'town-battle-actions'),busy=!!effect?.pending||battle.phase==='enemy'||!battleArtReady;if(['victory','defeat','escaped'].includes(battle.phase)&&!busy){const next=button(battle.phase==='victory'?'街の物語を続ける':'街へ戻る',closePanel,'primary');next.dataset.result='true';actions.append(next);}else{for(const [index,[action,label,hint]]of battleCommands.entries()){const node=button(`${label} [${index+1}]`,()=>actBattle(action),action==='spark'?'primary':'');node.id='town-battle-'+action;node.append(el('small',action==='tonic'?`残り ${battle.tonics}`:hint));node.disabled=busy||battle.phase!=='player'||action==='spark'&&battle.energy<2||action==='tonic'&&battle.tonics<1;actions.append(node);}}
 controls.append(log,actions);content.append(view,controls);battleRevision=session.snapshot().revision;drawBattle();if(!busy)actions.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}
function actBattle(action){if(!battleArtReady)return;if(session.actBattle(action,{motion:motion()}))renderBattle();}
function drawBattle(){if(!battleCanvas?.isConnected)return;const snapshot=session.snapshot();if(!snapshot.battle)return;fitCanvas(battleCanvas);renderTownBattle({renderer,canvas:battleCanvas,art:characterArt?.art,battle:snapshot.battle,effect:snapshot.effect,time:snapshot.time,motion:motion(),pixelRatio:Math.min(devicePixelRatio||1,2)});}
function returnToTown(){
 if(!ready||session.snapshot().battle)return;
 const result=session.returnToTown();if(!result)return;
 applyInteraction(result);updateHomeRoute(result.state);updateHUD();
 ($('town-webgl').hidden?$('town-canvas'):$('town-webgl')).focus({preventScroll:true});
}
function updateHomeRoute(state){
 const route=$('home-route');if(!route)return;const map=getTownMap(state.mapId),selected=readingJourney?.snapshot().selected?.id,home=getCreatorHome(selected)||CREATOR_HOMES[0];
 const canReturn=state.mapId==='creator-quarter'||!!map.creatorHome;
 route.dataset.returnToTown=String(canReturn);
 if(canReturn){
  route.hidden=!ready;route.removeAttribute('aria-haspopup');route.setAttribute('aria-label','街へ戻る。星灯りの街の広場へ移動');
  $('home-route-title').textContent='街へ戻る';$('home-route-detail').textContent='星灯りの街の広場へ';$('home-route-arrow').textContent='↩';$('home-route-arrow').style.transform='';homeRouteSignature='';return;
 }
 route.hidden=!ready;route.removeAttribute('aria-haspopup');
 $('home-route-arrow').textContent='⌂';$('home-route-arrow').style.transform='';
 $('home-route-title').textContent='クリエイターエリアへ';
 $('home-route-detail').textContent='広場へ移動 · 家を自由に巡る';
 route.setAttribute('aria-label','クリエイターエリアの広場へ移動');
}
function updateHUD(){const snapshot=session.snapshot(),state=snapshot.state,progress=readingProgress(state),map=getTownMap(state.mapId),target=contextTarget(),signature=[map.id,progress.title,progress.objective,target?.id,ready].join('|');if(signature===hudSignature)return;hudSignature=signature;$('panel-close').textContent=map.creatorHome?'← 室内に戻る':'← 街へ戻る';$('area-name').textContent=map.name;$('quest-title').textContent=progress.title;$('journal-open').title=progress.title+'：'+progress.objective;$('quest-objective').textContent=progress.objective;$('interact').disabled=!ready||!target;$('interact').textContent=target?(target.type==='creator-home'?`${getCreatorHome(target.creatorId)?.creatorName||'参加者'}の家の中へ入る`:target.type==='portal'?`${target.name||target.label||'扉'}へ`:target.name||target.label||'調べる'):'周りを歩く';$('interact').setAttribute('aria-label',target?`${target.name||target.label||'近くの対象'}を調べる`:'近くに調べる対象はありません');}
function fitCanvas(canvas){const ratio=Math.min(devicePixelRatio||1,2),width=Math.max(1,Math.round(canvas.clientWidth*ratio)),height=Math.max(1,Math.round(canvas.clientHeight*ratio));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}}
function resize(){cameraOffsetY=townControlOffset(document.querySelector('.town-world').getBoundingClientRect(),$('town-pad').getBoundingClientRect());if(!$('town-canvas').hidden)fitCanvas($('town-canvas'));renderer?.invalidate?.();viewController?.snapshot().view?.invalidate?.();if(battleCanvas)drawBattle();}
function scheduleResize(){clearInput();if(resizeFrame!==null)return;resizeFrame=requestAnimationFrame(()=>{resizeFrame=null;const main=$('town-main'),{width,height}=main.getBoundingClientRect();main.dataset.townOrientation=width>=350&&width>height?'landscape':'portrait';main.dataset.townNarrow=String(width<340);main.dataset.townShort=String(height<300);resize();});}
function eyeView(){return viewController?.snapshot().active==='3d'&&townEyeLevel(getTownMap(session.snapshot().state.mapId),cameraDistance);}
function inputVector(dt=0){return eyeCamera.input({keys,held,direction,dt,eye:eyeView()});}
function tick(_now,dt){eyeCamera.sync(session.snapshot().state);const snapshot=session.tick(dt,{...inputVector(panel.open?0:dt),paused:panel.open,motion:motion(),speed:3.05*settings.speed});eyeCamera.sync(snapshot.state);updateEyeControls();if(panel.open){if(snapshot.battle){if(snapshot.revision!==battleRevision)renderBattle();drawBattle();}return;}if(motion())worldTime+=dt;if(snapshot.time>=homeRouteAt){homeRouteAt=snapshot.time+.16;updateHomeRoute(snapshot.state);}const view3D=viewController?.snapshot().active==='3d',projection={worldPixelsPerUnit:view3D?1:64,groundDepthScale:view3D?Math.sin(55*Math.PI/180):.78};const visitors=characterArt?.visitorActors({state:snapshot.state,time:worldTime,clock:snapshot.time,motion:motion(),dt,view3D})||[];const actors=characterArt?.companionActors({state:snapshot.state,walking:snapshot.walking&&motion(),dt,time:worldTime,motion:motion(),view3D,canStand:point=>isTownWalkable(snapshot.state.mapId,point.x,point.z)})||[];characterArt?.art.rigs.update('owner',{position:snapshot.state.position,dt,time:worldTime,facing:snapshot.state.facing,moving:snapshot.walking,motion:motion(),mapId:snapshot.state.mapId,...projection,displayHeightPx:view3D?1.6:76});for(const resident of getTownMap(snapshot.state.mapId).npcs||[])characterArt?.art.rigs.update('resident:'+resident.id,{position:resident,dt,time:worldTime,facing:'down',moving:false,motion:motion(),mapId:snapshot.state.mapId,...projection,displayHeightPx:(view3D?1.6:76)*(resident.appearance==='cat'?.62:1)});const frame={canvas:$('town-canvas'),state:snapshot.state,time:worldTime,dt,motion:motion(),pixelRatio:Math.min(devicePixelRatio||1,2),walking:snapshot.walking,walkPhase:snapshot.walkPhase,facing:snapshot.state.facing,brightness:settings.brightness,lantern:settings.lantern,cameraDistance,cameraZoom,cameraOffsetY,cameraYaw:eyeCamera.snapshot().yaw,cameraPitch:eyeCamera.snapshot().pitch,creatorActors:[...visitors,...actors]};lastTownFrame=frame;try{activeTownRenderer()?.render(frame);}catch(error){if(viewController?.snapshot().active!=='3d')throw error;viewController.reportFailure(error);renderer?.render(frame);}sceneNames.update({map:getTownMap(snapshot.state.mapId),state:snapshot.state,actors:visitors,homes:CREATOR_HOMES,project:point=>activeTownRenderer()?.worldToScreen(point)});const mapSignature=[readingJourney?.snapshot().selectedId,readingJourney?.snapshot().readCount,snapshot.state.mapId,Math.floor(snapshot.state.position.x*4),Math.floor(snapshot.state.position.z*4),snapshot.state.facing,JSON.stringify(snapshot.state.flags)].join('|');if(mapSignature!==minimapSignature){renderer?.drawMap($('town-minimap'),snapshot.state);drawReadingWaypoint($('town-minimap'),snapshot.state);minimapSignature=mapSignature;}updateHUD();}
const loop=createFrameLoop({shouldRun:()=>ready&&pageActive&&!document.hidden&&(!panel.open||!!session.snapshot().battle),onFrame:tick});
protectGameSurface($('town-main'));
for(const node of document.querySelectorAll('[data-move]')){const name=node.dataset.move;bindings.push(bindHeldGameButton(node,{pointer:false,blocked:()=>!ready||panel.open,onChange:active=>{if(active)held.add(name);else held.delete(name);}}));}
padBinding=bindDirectionPad($('town-pad'),{mode:()=>padMode,blocked:()=>!ready||panel.open,onChange:value=>direction=value});bindings.push(padBinding);
document.addEventListener('keydown',event=>{if(event.target?.matches?.('input,textarea,select,[contenteditable=true]'))return;const key=event.key.toLowerCase();if(panel.open){if(!event.repeat&&session.snapshot().battle&&['1','2','3','4','5'].includes(key)){event.preventDefault();actBattle(battleCommands[Number(key)-1][0]);}return;}if(!ready)return;if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)){event.preventDefault();keys.add(key);}if(event.repeat)return;if(key==='e'||key==='enter'&&(event.target===document.body||[ $('town-canvas'),$('town-webgl') ].includes(event.target))){event.preventDefault();interact();}if(key==='m')showMap();if(key==='j')showJournal();if(key==='i')showInventory();if(key==='l')toggleLantern();if(key==='escape')showMenu();});
document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
for(const surface of[$('town-canvas'),$('town-webgl')]){
const pinch=bindPinchZoom(surface,{blocked:()=>!ready||panel.open,getZoom:()=>cameraZoom,onStart:clearInput,onChange:value=>setSceneZoom(value,{persist:false}),onEnd:()=>saveCameraZoom('town',cameraZoom)});bindings.push(pinch);
surface.addEventListener('pointerdown',event=>{if(!ready||panel.open||event.button>0||canvasPointer)return;try{surface.setPointerCapture(event.pointerId);}catch{return;}canvasPointer={surface,id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false,time:performance.now()};});
surface.addEventListener('pointermove',event=>{const pointer=canvasPointer;if(pointer?.id!==event.pointerId||pointer.surface!==surface)return;if(Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>8)pointer.moved=true;if(eyeView()){eyeCamera.look(event.clientX-pointer.lastX,event.clientY-pointer.lastY);pointer.lastX=event.clientX;pointer.lastY=event.clientY;}});
surface.addEventListener('pointerup',event=>{if(canvasPointer?.id!==event.pointerId)return;const start=canvasPointer;canvasPointer=null;try{surface.releasePointerCapture(event.pointerId);}catch{}if(start.moved||Math.hypot(start.x-event.clientX,start.y-event.clientY)>8||performance.now()-start.time>650)return;const rect=surface.getBoundingClientRect(),point=activeTownRenderer()?.screenToWorld?.(event.clientX-rect.left,event.clientY-rect.top),target=contextTarget();const picked=activeTownRenderer()?.pickVisitor?.(event.clientX-rect.left,event.clientY-rect.top);if(picked&&characterArt?.visitor(picked)){const visitor=characterArt.visitor(picked),near=characterArt.reachableVisitor(picked,session.snapshot().state);if(near){showVisitor(visitor.id);return;}}if(point&&target&&target.type!=='visitor'&&Math.hypot(point.x-target.x,point.z-target.z)<1.1)interact(target.id);});
for(const type of['pointercancel','lostpointercapture'])surface.addEventListener(type,event=>{if(canvasPointer?.id===event.pointerId)canvasPointer=null;});
}
function toggleLantern(){settings.lantern=!settings.lantern;persistSettings();}
$('town-view-2d').onclick=()=>chooseTownView('2d');$('town-view-3d').onclick=()=>chooseTownView('3d');$('town-mode-retry').onclick=()=>chooseTownView('3d',{retry:true});
$('lantern-toggle').onclick=toggleLantern;$('interact').onclick=()=>interact();$('menu-open').onclick=showMenu;$('journal-open').onclick=showJournal;$('inventory-open').onclick=showInventory;$('map-open').onclick=showMap;$('minimap-open').onclick=showMap;$('home-route').onclick=()=>{const map=getTownMap(session.snapshot().state.mapId);if(map.id==='creator-quarter'||map.creatorHome)returnToTown();else visitCreatorQuarter();};
function prepareExit(){clearInput();audio.stop({resetVolume:true});session.save();}
$('castle-return').addEventListener('click',prepareExit);
window.addEventListener('blur',()=>{clearInput();audio.stop({resetVolume:true});});window.addEventListener('orientationchange',scheduleResize);
window.addEventListener('pagehide',()=>{pageActive=false;if(!ready)bootAbort?.abort();loop.stop();clearInput();audio.stop({resetVolume:true});session.save();});
window.addEventListener('pageshow',()=>{pageActive=true;clearInput();padMode=readPadMode();padBinding?.refresh();audio.stop({resetVolume:true});resize();if(!ready&&bootAbort?.signal.aborted)void boot();else if(!document.hidden)loop.start();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){loop.stop();clearInput();audio.stop({resetVolume:true});}else loop.start();});
window.addEventListener('resize',()=>{clearInput();applySettings();scheduleResize();});reduced.addEventListener('change',()=>{clearInput();applySettings();});initViewport({onChange:scheduleResize});
if(typeof ResizeObserver==='function'){const displayObserver=new ResizeObserver(scheduleResize);displayObserver.observe($('town-main'));displayObserver.observe(document.querySelector('.town-world'));}
// Keep the page-lifetime observer independent of temporary settings panels.
let layoutStorage;try{layoutStorage=globalThis.localStorage;}catch{}migrateDisplayMode(settings.layout,layoutStorage);
layoutPreferences=initDisplayMode({page:'town',onChange:state=>{settings.layout=state.mode;scheduleResize();}});
const pageDisplayPreferences=initGameDisplay({page:'town',onChange:scheduleResize});scheduleResize();
async function boot(){
 const request=++bootRequest,revision=panelRevision;bootAbort?.abort();const abort=new AbortController();bootAbort=abort;ready=false;loop.stop();clearInput();resetTownView();renderer?.destroy?.();characterArt?.destroy();sceneImages.clear();sceneImages=createTownSceneImages();$('town-loading').hidden=false;$('town-loading').querySelector('p').textContent='街の灯りをともしています…';$('loading-retry').hidden=true;
 try{characterArt=createTownCharacterArt({deferEnhancements:true,initialState:session.snapshot().state,signal:abort.signal,onState:status=>{if(status==='retry'&&request===bootRequest&&!abort.signal.aborted)$('town-loading').querySelector('p').textContent='通信を確かめて、主人公と黒猫の姿をもう一度準備しています…';}});renderer=createTownRenderer({art:characterArt.art,deferAssets:true,loadImage:sceneImages.load});const scenery=renderer;void scenery.ready?.then(()=>{if(request!==bootRequest||abort.signal.aborted)return;scenery.invalidate?.();if(scenery.status?.().failed?.length)notify('一部の景色を準備できませんでした。メニューから読み込み直せます。');});await withDeadline(characterArt.ready,{timeout:40000,signal:abort.signal});if(request!==bootRequest||abort.signal.aborted)return;if(typeof characterArt.creatorPage==='function')prepareReadingJourney();resize();tick(0,0);ready=true;$('town-loading').hidden=true;updateHUD();loop.start();requestAnimationFrame(()=>requestAnimationFrame(()=>{if(request!==bootRequest||abort.signal.aborted)return;prepareTownView();characterArt.startEnhancements?.();void scenery.start?.();}));const snapshot=session.snapshot();if(snapshot.notice)notify(snapshot.notice);if(!snapshot.state.flags.intro&&!panel.open&&panelRevision===revision)showHelp();}
 catch(error){if(request!==bootRequest||abort.signal.aborted)return;abort.abort();ready=false;$('town-loading').querySelector('p').textContent='街と主人公の支度を完了できませんでした。記録は消えていません。再試行できます。';$('loading-retry').hidden=false;console.warn('Town loading failed',error);}
}
$('loading-retry').onclick=boot;applySettings();updateHUD();boot();

const cameraButton=$('camera-distance');function updateCameraButton(){cameraButton.textContent='視点：'+cameraDistanceLabel(cameraDistance)+(cameraZoom!==1?` ${Math.round(cameraZoom*100)}%`:'');cameraButton.setAttribute('aria-pressed',String(cameraDistance!=='normal'));cameraButton.setAttribute('aria-description','標準、引き、遠景の3段階。指で調整した拡大率は保ちます。');}cameraButton.onclick=()=>{clearInput();cameraDistance=nextCameraDistance(cameraDistance);saveCameraDistance('town',cameraDistance);updateCameraButton();resize();if(ready)tick(0,0);};updateCameraButton();
