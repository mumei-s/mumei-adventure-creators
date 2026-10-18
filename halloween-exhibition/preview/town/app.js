import {CREATOR_HOMES,getCreatorHome} from './creator-homes.js?v=20261019-homes1';
import {readCameraDistance,saveCameraDistance} from '../camera-distance.js?v=20261019-scene1';
import {createReloadControl} from '../safe-page-reload.js?v=20261017-reload1';
import {createTownSession} from './controller.js?v=20261019-homes1';
import {createTownStore,importTownState,exportTownState} from './save-model.js?v=20261019-homes1';
import {initialTownState,townJournal,townInventory,townProgress,getTownMap,isTownWalkable} from './town-model.js?v=20261019-homes1';
import {createTownRenderer,renderTownBattle} from './renderer.js?v=20261019-homes1';
import {createTownCharacterArt} from './character-art.js?v=20261019-homes1';
import {TOWN_BATTLE_ART_IDS} from './visual-data.js?v=20261019-scene1';
import {createTownViewController} from './view-mode.js?v=20261019-scene1';
import {createTownAudio} from './audio.js?v=20261017-palace-panel1';
import {TOWN_SPEEDS,readTownPreferences,saveTownPreferences,resolveTownLayout} from './preferences.js?v=20261019-homes1';
import {bindDirectionPad,bindHeldGameButton,protectGameSurface} from '../maze/game-input.js?v=20261016-ios1';
import {createFrameLoop} from '../maze/frame-loop.js?v=20261017-review1';
import {initViewport} from '../viewport.js?v=20261016-ios1';
import {initGameDisplay} from '../game-display.js?v=20261019-interior1';
import {withDeadline} from '../transition-effects.js?v=20261016-living1';
const $=id=>document.getElementById(id),panel=$('town-panel'),content=$('town-panel-content');
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const button=(text,action,cls)=>{const node=el('button',text,cls);node.type='button';node.onclick=action;return node;};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let settings=readTownPreferences().preferences;
let cameraDistance=readCameraDistance('town');
const store=createTownStore();
let ready=false,renderer=null,characterArt=null,bootRequest=0,bootAbort=null,pageActive=true,returnFocus=null,panelKind='',panelRevision=0,dialogueTarget=null,minimapSignature='',hudSignature='',toastTimer=null,battleCanvas=null,battleRevision=-1,battleArtReady=false,battleArtFailed=false;
let viewController=null,lastTownFrame=null,battleBackdropId=null,townWorldModule=null;
let direction=null,canvasPointer=null,worldTime=0,displayPreferences=null,resizeFrame=null;const keys=new Set(),held=new Set(),bindings=[];
const audio=createTownAudio({onChange:updateAudioUI});
const session=createTownSession({store,onNotice:notify,onChange:snapshot=>{if(snapshot.save)saveStatus(snapshot.save);updateHUD();}});
function motion(){return settings.motion&&!reduced.matches;}
function notify(text){if(!text)return;$('town-toast').textContent=text;$('town-toast').dataset.visible='true';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('town-toast').dataset.visible='false',4200);}
function saveStatus(result){$('save-status').textContent=result.ok?'この端末に記録済み':'保存できません・メニューで確認';$('save-status').dataset.error=String(!result.ok);if(!result.ok&&panelKind==='save')$('town-save-message')?.replaceChildren(document.createTextNode(result.notice||'保存できませんでした。'));}
function persistSettings(){const result=saveTownPreferences(settings);settings=result.preferences;if(!result.ok)notify('表示設定を保存できません。この画面では変更を使えます。');applySettings();}
function applySettings(){document.body.dataset.layout=resolveTownLayout(settings.layout,innerWidth);document.body.dataset.motion=String(motion());$('lantern-toggle').textContent=settings.lantern?'ランタン ON':'ランタン OFF';$('lantern-toggle').setAttribute('aria-pressed',String(settings.lantern));renderer?.invalidate?.();resize();}
function clearInput(){keys.clear();held.clear();direction=null;for(const binding of bindings)binding.reset();session.stop();const previous=canvasPointer;canvasPointer=null;if(previous)try{previous.surface.releasePointerCapture(previous.id);}catch{}}
function activeTownRenderer(){const view=viewController?.snapshot();return view?.active==='3d'?view.view:renderer;}
function updateViewUI(state){
 clearInput();const active=state.active==='3d',old=document.activeElement;
 if(returnFocus===$('town-canvas')||returnFocus===$('town-webgl'))returnFocus=active?$('town-webgl'):$('town-canvas');
 $('town-webgl').hidden=!active;$('town-canvas').hidden=active;
 const skip=document.querySelector('.skip-link');if(skip)skip.href=active?'#town-webgl':'#town-canvas';
 if(old===$('town-canvas')||old===$('town-webgl'))(active?$('town-webgl'):$('town-canvas')).focus({preventScroll:true});
 const status=$('town-view-status');if(status)status.textContent=state.status==='loading'?'3Dの街を準備中です。2Dで歩き続けられます。':state.status==='failed'?'3Dを使えませんでした。2Dで続きを遊べます。':active?'3Dの見下ろし表示です。':'2Dの見下ろし表示です。';
 const retry=$('town-view-retry');if(retry)retry.hidden=state.status!=='failed';
 if(state.status==='failed')notify('3Dを準備できませんでした。2Dで続けられます。表示設定から再試行できます。');
 scheduleResize();
}
function resetTownView(){viewController?.destroy();viewController=null;$('town-webgl').hidden=true;$('town-canvas').hidden=false;const skip=document.querySelector('.skip-link');if(skip)skip.href='#town-canvas';if(returnFocus===$('town-webgl'))returnFocus=$('town-canvas');}
function prepareTownView(){
 viewController=createTownViewController({load:async({signal,onContextLost})=>{
  const module=await(townWorldModule||import('./world-3d.js?v=20261019-homes1'));if(!module)throw Error('Town renderer unavailable');
  if(signal.aborted)throw Error('Old town view request');
  return module.createTownWorld3D({canvas:$('town-webgl'),art:characterArt.art,onContextLost});
 },onChange:updateViewUI});
 void viewController.setMode(settings.view);
}
function beginPanel(title,{kind='page',eyebrow='THE LANTERN TOWN'}={}){displayPreferences?.destroy();displayPreferences=null;panelRevision++;clearInput();panelKind=kind;if(kind==='battle')loop.start();else loop.stop();panel.classList.toggle('battle-mode',kind==='battle');battleCanvas=null;content.replaceChildren();const heading=el('h2',title);heading.id='town-panel-title';content.append(el('p',eyebrow,'eyebrow'),heading);if(!panel.open){returnFocus=document.activeElement;panel.showModal();}panel.scrollTop=0;content.scrollTop=0;}
function closePanel(){if(session.snapshot().battle){const result=session.leaveBattle();if(result?.notice)notify(result.notice);}panel.close();}
panel.addEventListener('close',()=>{displayPreferences?.destroy();displayPreferences=null;panelRevision++;clearInput();panelKind='';dialogueTarget=null;battleCanvas=null;battleRevision=-1;panel.classList.remove('battle-mode');returnFocus?.focus?.({preventScroll:true});loop.start();});
panel.addEventListener('cancel',event=>{event.preventDefault();closePanel();});$('panel-close').onclick=closePanel;
function applyInteraction(result,targetId){
 if(!result)return;if(result.exit){showCastleReturn();return;}
 if(result.battle){const battle=session.beginBattle(result.battle);if(battle){battleArtReady=false;battleArtFailed=false;renderBattle();void prepareBattleArt();}return;}
 if(result.transition){renderer?.invalidate?.();panel.close();clearInput();notify(result.notice||getTownMap(result.state.mapId).name);return;}
 if(result.dialogue){showDialogue(result.dialogue,targetId);return;}
 if(result.notice)notify(result.notice);
}
function contextTarget(){const ordinary=session.target(),guest=characterArt?.nearbyVisitor(session.snapshot().state);return guest&&(!ordinary||Math.hypot(guest.x-session.snapshot().state.position.x,guest.z-session.snapshot().state.position.z)<ordinary.distance)?{...guest,type:'visitor'}:ordinary;}
function interact(targetId,choiceId){if(!ready||session.snapshot().battle)return;const target=contextTarget(),id=targetId||target?.id;const home=CREATOR_HOMES.find(item=>item.id===id);if(home){const state=session.snapshot().state;if(state.mapId==='creator-quarter'&&Math.hypot(home.door.x-state.position.x,home.door.z-state.position.z)<=2.05)showCreatorHome(home.creatorId);return;}if(characterArt?.visitor(id)){showVisitor(id);return;}applyInteraction(session.interact(id,choiceId),id);}
function showDialogue(dialogue,targetId){
 dialogueTarget=targetId;beginPanel(dialogue.title||dialogue.speaker||'街の物語',{kind:'dialogue',eyebrow:dialogue.speaker||'街の物語'});
 content.append(el('p',dialogue.text||'','dialogue-text'));const choices=el('div',undefined,'dialogue-choices');
 for(const choice of dialogue.choices||[])choices.append(button(choice.label,()=>interact(targetId,choice.id),choice.primary?'primary':''));
 choices.append(button('街を歩く',closePanel));content.append(choices);choices.querySelector('button')?.focus({preventScroll:true});
}
function showCastleReturn(){beginPanel('城へ戻りますか。');content.append(el('p','街の記録を保存して、宮殿の入口へ戻ります。城の中の冒険は、街とは別の記録で続けられます。'));const link=el('a','城へ戻る','button-link primary');link.href='../?return=palace';link.onclick=prepareExit;content.append(link,button('街歩きを続ける',closePanel));}
const pageReload=createReloadControl({save:()=>session.snapshot().battle?{ok:false,notice:'対戦を終えてから再読み込みしてください。'}:session.save(),beforeReload:()=>{clearInput();audio.stop({resetVolume:true});}});
function showMenu(){
 beginPanel('街歩きのメニュー');content.append(pageReload.element);const progress=townProgress(session.snapshot().state);content.append(el('p',progress.title,'subtle'));const menu=el('div',undefined,'town-menu');
 for(const [label,action]of[['参加者の家',showCreatorHomes],['街の仲間',showVisitors],['旅の手帳',showJournal],['持ち物',showInventory],['街の地図',showMap],['歩く速さ',showWalkingSpeed],['明るさ・音・表示',showSettings],['記録・バックアップ',showSave],['操作と物語について',showHelp]])menu.append(button(label,action));
 const compare=el('a','キャラ見比べ','button-link');compare.href='../characters/';compare.target='_blank';compare.rel='noopener noreferrer';menu.append(compare,button('城へ戻る',showCastleReturn));const scenery=renderer?.status?.();if(scenery?.failed?.length)menu.append(button('街の景色を読み込み直す',()=>{closePanel();void renderer?.retry?.().then(()=>{renderer?.invalidate?.();notify(renderer?.status?.().failed?.length?'読み込めない景色があります。もう一度お試しください。':'街の景色を読み込み直しました。');});}));content.append(menu);
}
function showVisitor(id){
 const visitor=characterArt?.visitor(id);if(!visitor||visitor.interactive===false)return;beginPanel(visitor.name,{kind:'visitor',eyebrow:'FRIENDS OF THE ATELIER'});if(visitor.label!==visitor.name)content.append(el('h3',visitor.label));content.append(el('p',visitor.greeting,'dialogue-text'),el('p',characterArt.fictionNotice,'subtle'));
 const guest=visitor.participationRole==='profile-guest';if(guest)content.append(el('p','参加作品は投稿待ちです。公式プロフィールからご覧ください。','subtle'));
 const links=guest?[]:visitor.articleLinks||[];const unique=new Set();for(const item of links){if(unique.has(item.url))continue;unique.add(item.url);const link=el('a',item.title||'参加記事を読む ↗','button-link');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';content.append(link);}
 if(visitor.profileURL){try{const url=new URL(visitor.profileURL);if(url.protocol==='https:'&&url.hostname==='note.com'&&!url.port&&!url.username&&!url.password){const link=el('a','公式プロフィールを見る ↗','button-link');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';content.append(link);}}catch{}}
 content.append(button('街の仲間を見る',showVisitors),button('街を歩く',closePanel));
}
function showCreatorHome(creatorId){
 const home=getCreatorHome(creatorId),person=characterArt?.creatorPage(creatorId);if(!home||!person)return;
 beginPanel(`${home.creatorName}のクリエイターページ`,{kind:'creator-home',eyebrow:home.homeLabel});
 const identity=el('section',undefined,'creator-home-identity');
 if(person.avatar){const image=el('img');image.src=new URL(person.avatar,new URL('../',import.meta.url)).href;image.alt=`${person.name}のプロフィール画像`;image.width=96;image.height=96;image.decoding='async';image.onerror=()=>image.remove();identity.append(image);}
 identity.append(el('h3',person.name));content.append(identity,el('p',home.description||home.homeLabel,'dialogue-text'));
 if(person.profileURL){const link=el('a','公式noteのクリエイターページを開く ↗','button-link primary');link.href=person.profileURL;link.target='_blank';link.rel='noopener noreferrer';content.append(link);}
 content.append(el('h3','参加作品'));
 if(person.pending)content.append(el('p','参加作品は準備中です。公式noteから、その人の発信をご覧いただけます。','subtle'));
 for(const work of person.works){const card=el('a',undefined,'town-card creator-home-work');card.href=work.url;card.target='_blank';card.rel='noopener noreferrer';
  if(work.image){const image=el('img');image.src=new URL(work.image,new URL('../',import.meta.url)).href;image.alt=work.imageAlt;image.loading='lazy';image.decoding='async';image.onerror=()=>image.remove();card.append(image);}
  card.append(el('strong',work.title),el('span',work.introduction?'企画紹介をnoteで読む ↗':'作品をnoteで読む ↗'));content.append(card);
 }
 content.append(el('p','家の名前や飾りは、この街のために作った演出です。','subtle'),button('ほかの参加者の家を見る',showCreatorHomes),button('街歩きに戻る',closePanel));
}
function showCreatorHomes(){
 beginPanel('参加者の家',{kind:'homes',eyebrow:'CREATORS’ QUARTER'});content.append(el('p',`${CREATOR_HOMES.length}人それぞれの家を訪ねる住宅街。玄関で「ページを開く」を選ぶと、本人の紹介と参加作品が開きます。`,'dialogue-text'));
 const list=el('div',undefined,'inventory-list');for(const home of CREATOR_HOMES){const card=el('section',undefined,'town-card');card.style.setProperty('--home-color',home.homePalette?.roof||'#bca56b');card.append(el('h3',home.creatorName),el('p',home.homeLabel));const available=!!characterArt?.creatorPage(home.creatorId);const page=button('クリエイターページを見る',()=>showCreatorHome(home.creatorId));page.disabled=!available;card.append(page);list.append(card);}content.append(list,el('p','街の南側にある「参加者の住宅街」の入口から歩いて訪ねられます。','subtle'),button('現在地の地図を見る',showMap),button('街歩きに戻る',closePanel));
}
function showVisitors(){
 beginPanel('街に集まった仲間');content.append(el('p','無名S noteは、あなたが動かす主人公です。街の通りでは、企画に集まった仲間たちに会えます。','subtle'));const groups=new Map();for(const visitor of characterArt?.visitors()||[]){if(!groups.has(visitor.creatorId))groups.set(visitor.creatorId,[]);groups.get(visitor.creatorId).push(visitor);}
 const list=el('div',undefined,'inventory-list');for(const members of groups.values()){const card=el('section',undefined,'town-card');card.append(el('h3',members[0].name));if(members[0].participationRole==='profile-guest')card.append(el('p','作品は投稿待ち・公式プロフィールから参加','subtle'));for(const visitor of members.filter(person=>person.interactive!==false))card.append(button(visitor.label+'と話す',()=>showVisitor(visitor.id)));list.append(card);}const status=characterArt?.status();if(status?.failed)content.append(el('p','一部の仲間の姿を読み込めませんでした。名前から会話と記事・プロフィールを開けます。','subtle'),button('仲間の姿を読み込み直す',()=>{characterArt.retryVisitors();closePanel();notify('近くの仲間の姿をもう一度準備します。');}));content.append(list,el('p',characterArt?.fictionNotice||'会話はゲーム内の創作です。','subtle'),button('メニューに戻る',showMenu));
}
function showJournal(){
 beginPanel('旅の手帳');const state=session.snapshot().state,progress=townProgress(state);content.append(el('p',progress.objective));
 const labels={complete:'達成',active:'進行中',available:'街で見つける',locked:'これからの物語'};
 for(const quest of townJournal(state)){const card=el('section',undefined,'town-card');card.dataset.status=quest.status;card.append(el('span',labels[quest.status]||quest.status,'status'),el('h3',quest.title||quest.name),el('p',quest.objective||quest.description));content.append(card);}
 content.append(button('メニューに戻る',showMenu));
}
function showInventory(){
 beginPanel('持ち物');const state=session.snapshot().state;content.append(el('p',`体力 ${state.hp}/${state.maxHp}　灯り ${state.energy}/3　${state.coins} ルーメン`));
 const list=el('div',undefined,'inventory-list');for(const item of townInventory(state)){const card=el('section',undefined,'town-card');card.append(el('h3',item.name),el('strong',`× ${item.count}`,'inventory-count'),el('p',item.description));list.append(card);}if(!list.children.length)list.append(el('p','今は、身軽な旅支度です。'));content.append(list,el('p','星蜜の小瓶は戦闘中に使えます。街の宿屋やベンチでは、休んで体力を戻せます。','subtle'),button('メニューに戻る',showMenu));
}
function showMap(){
 const state=session.snapshot().state,map=getTownMap(state.mapId);beginPanel(map.name||'街の地図');const canvas=el('canvas',undefined,'town-map-large');canvas.width=960;canvas.height=720;canvas.setAttribute('aria-label',`${map.name}の地図。三角が現在位置です。`);content.append(canvas);renderer?.drawMap(canvas,state);content.append(el('p',state.mapId==='creator-quarter'?'参加者の家が並ぶ住宅街です。玄関に近づき、クリエイターページを開けます。南の入口から星灯りの街へ戻れます。':state.mapId==='lantern-town'?'城門は北。西に市場、中央に噴水の広場、東に書庫、南東に月映し庭園。建物の扉に近づき「入る」を選ぶと室内へ進めます。':'現在いる建物の見取り図です。出口の扉へ近づき、調べると通りへ戻れます。','subtle'),button('旅の手帳を開く',showJournal),button('街を歩く',closePanel));
}
function showWalkingSpeed(){
 beginPanel('歩く速さ',{kind:'speed'});const label=el('label','歩く速さを選ぶ');label.htmlFor='town-walking-speed';const range=el('input');Object.assign(range,{id:'town-walking-speed',type:'range',min:'.5',max:'2',step:'.25',value:String(settings.speed)});const output=el('output',`${settings.speed}倍`);output.htmlFor=range.id;
 const update=value=>{settings.speed=Number(value);persistSettings();range.value=String(settings.speed);output.textContent=`${settings.speed}倍`;range.setAttribute('aria-valuetext',`${settings.speed}倍`);};range.oninput=()=>update(range.value);range.setAttribute('aria-valuetext',`${settings.speed}倍`);
 const presets=el('div',undefined,'button-row');for(const [value,name]of[[.5,'ゆっくり'],[1,'標準'],[1.5,'速い'],[2,'最速']])presets.append(button(`${name} ${value}倍`,()=>update(value)));
 const section=el('section',undefined,'settings-grid');range.className='full';label.className='full';section.append(label,range,output);content.append(section,presets,el('p','0.5〜2倍を0.25刻みで選べます。この端末に保存し、次回も同じ速さで歩きます。','subtle'),button('標準の1倍に戻す',()=>update(1)),button('メニューに戻る',showMenu));
}
function showSettings(){
 beginPanel('街の明るさ・音・画面',{kind:'settings'});const displayControls=el('section');content.append(displayControls);displayPreferences=initGameDisplay({controlsParent:displayControls,page:'town',onChange:scheduleResize});const grid=el('div',undefined,'settings-grid');
 const viewLabel=el('label','街の見え方','full');viewLabel.htmlFor='town-view-mode';const viewSelect=el('select');viewSelect.id='town-view-mode';
 for(const [value,label]of[['3d','3D・立体の街'],['2d','2D・軽い表示']]){const option=el('option',label);option.value=value;viewSelect.append(option);}viewSelect.value=settings.view;
 viewSelect.onchange=()=>{clearInput();settings.view=viewSelect.value;persistSettings();void viewController?.setMode(settings.view);};
 const viewStatus=el('p',undefined,'subtle full');viewStatus.id='town-view-status';viewStatus.setAttribute('role','status');
 const retryView=button('3Dをもう一度準備する',()=>{settings.view='3d';viewSelect.value='3d';persistSettings();void viewController?.setMode('3d',{retry:true});},'full');retryView.id='town-view-retry';retryView.hidden=true;
 grid.append(viewLabel,viewSelect,viewStatus,retryView);
 const currentView=viewController?.snapshot();if(currentView){viewStatus.textContent=currentView.status==='loading'?'3Dを準備中です。2Dで歩き続けられます。':currentView.status==='failed'?'3Dを使えませんでした。2Dで続きを遊べます。':currentView.active==='3d'?'3Dの見下ろし表示です。':'2Dの見下ろし表示です。';retryView.hidden=currentView.status!=='failed';}
 const label=el('label','明るさ');label.htmlFor='town-brightness';const output=el('output',`${settings.brightness}`);output.id='town-brightness-value';const range=el('input');Object.assign(range,{id:'town-brightness',type:'range',min:'0',max:'100',step:'1',value:String(settings.brightness)});range.oninput=()=>{settings.brightness=Number(range.value);output.textContent=range.value;persistSettings();};grid.append(label,output,range,el('p','75で本来の色。文章と操作の明るさは変わりません。','subtle full'));
 const music=button('音楽をON',()=>{if(audio.snapshot().enabled)audio.stop();else void audio.start({gesture:true});},'full');music.id='town-music';music.setAttribute('aria-pressed','false');const volumeLabel=el('label','音量');volumeLabel.htmlFor='town-volume';const volumeOutput=el('output','0');volumeOutput.id='town-volume-value';const volume=el('input');Object.assign(volume,{id:'town-volume',type:'range',min:'0',max:'100',step:'1',value:String(audio.snapshot().volume)});volume.oninput=()=>audio.setVolume(volume.value);volume.onpointerup=()=>audio.resumeFromGesture();volume.onchange=()=>audio.resumeFromGesture();const status=el('p',undefined,'subtle full');status.id='town-audio-status';status.setAttribute('role','status');grid.append(music,volumeLabel,volumeOutput,volume,status);
 const movement=button(motion()?'動き：ON → 減らす':'動き：減らす → ON',()=>{if(reduced.matches){notify('端末の「動きを減らす」を優先しています。');return;}settings.motion=!settings.motion;persistSettings();showSettings();},'full');movement.setAttribute('aria-pressed',String(motion()));if(reduced.matches){movement.disabled=true;movement.textContent='端末の設定で動きを減らしています';}grid.append(movement);
 const layoutLabel=el('label','画面レイアウト','full');layoutLabel.htmlFor='town-layout';const select=el('select');select.id='town-layout';for(const [value,name]of[['auto','自動'],['phone','スマホ用'],['tablet','タブレット用'],['desktop','PC用']]){const option=el('option',name);option.value=value;select.append(option);}select.value=settings.layout;select.onchange=()=>{settings.layout=select.value;persistSettings();};grid.append(layoutLabel,select);
 const speedLabel=el('label','歩く速さ','full');speedLabel.htmlFor='town-speed';const speed=el('select');speed.id='town-speed';for(const value of TOWN_SPEEDS){const option=el('option',`${value}倍`);option.value=String(value);speed.append(option);}speed.value=String(settings.speed);speed.onchange=()=>{settings.speed=Number(speed.value);persistSettings();};grid.append(speedLabel,speed);content.append(grid,el('p','音は起動時とページに戻った時にOFF・音量0です。再生は自分でONにした時だけ始まります。','subtle'),button('メニューに戻る',showMenu));updateAudioUI(audio.snapshot());
}
function updateAudioUI(state){const toggle=$('town-music');if(toggle){toggle.textContent=state.enabled?'音楽をOFF':'音楽をON';toggle.setAttribute('aria-pressed',String(state.enabled));}const volume=$('town-volume');if(volume)volume.value=String(state.volume);if($('town-volume-value'))$('town-volume-value').textContent=String(state.volume);if($('town-audio-status'))$('town-audio-status').textContent=state.message;}
function showSave(){
 beginPanel('街歩きの記録',{kind:'save'});const state=session.snapshot().state,message=el('p','ここでは街だけの記録を扱います。');message.id='town-save-message';message.setAttribute('role','status');content.append(message);
 const controls=el('div',undefined,'button-row');controls.append(button('今の続きを保存',()=>{const result=session.save();message.textContent=result.ok?'続きを保存しました。':result.notice;}));content.append(controls);
 const box=el('section',undefined,'save-controls'),label=el('label','バックアップと復元');label.htmlFor='town-save-text';const text=el('textarea');text.id='town-save-text';text.spellcheck=false;text.setAttribute('aria-label','街のバックアップ本文');const current=()=>exportTownState(session.snapshot().state);text.value=current();
 const row=el('div',undefined,'button-row');row.append(button('今の記録を本文に出す',()=>{text.value=current();message.textContent='本文を出しました。コピーかファイル保存ができます。';}),button('端末に保存された原文を出す',()=>{const raw=store.readRaw?.();text.value=typeof raw==='string'?raw:current();message.textContent='端末の原文です。壊れた保存でも、そのまま取り出せます。';}),button('本文をコピー',async()=>{try{await navigator.clipboard.writeText(text.value);message.textContent='バックアップ本文をコピーしました。';}catch{text.focus();text.select();message.textContent='本文を選択しました。端末のコピー操作を使ってください。';}}),button('ファイルに保存',()=>{const url=URL.createObjectURL(new Blob([text.value],{type:'application/json'}));const a=el('a');a.href=url;a.download='mumei-town-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
 const review=el('div');row.append(button('貼り付けた本文を確認',()=>{review.replaceChildren();const parsed=importTownState(text.value);if(!parsed.ok){message.textContent=parsed.notice||'この街のバックアップ形式ではありません。今の記録は変更していません。';return;}const next=parsed.state,progress=townProgress(next);review.append(el('p',`${progress.title}／体力${next.hp}/${next.maxHp}／${next.coins}ルーメン。この記録で街歩きの続きを置き換えます。`),button('確認した記録を復元する',()=>{const result=store.replace?store.replace(next):store.save(next);if(!result.ok){message.textContent=result.notice;return;}session.replace(next);message.textContent='街の記録を復元しました。';review.replaceChildren();renderer?.invalidate?.();},'primary'));message.textContent='内容を確認し、復元するボタンを押してください。';}));
 box.append(label,text,row,review,el('p','復元は街の記録だけを変更します。宮殿・展示・城の中の進行は対象外です。','subtle'));content.append(box,button('最初から歩く…',()=>{review.replaceChildren(el('p','街の物語と持ち物を最初からにします。今の続きを残す場合は、先にバックアップを保存してください。'),button('街を最初から始める',()=>{const next=initialTownState(),result=store.replace?store.replace(next):store.save(next);if(!result.ok){message.textContent=result.notice;return;}session.replace(next);renderer?.invalidate?.();closePanel();notify('街で新しい旅を始めました。');}));}),button('メニューに戻る',showMenu));
}
function showHelp(){beginPanel('星灯りの街へ');content.append(el('p','無名S noteと黒猫が、消えた街の灯りをたどります。人に話しかけ、店や書庫へ入り、小さな約束を届けてください。今の目的は画面上の手帳から、いつでも読み返せます。','dialogue-text'));const keys=el('dl',undefined,'help-keys');for(const [key,text]of[['矢印 / WASD','東西南北へ歩く'],['E / Enter','目の前の人と話す・扉や物を調べる'],['M','街の地図'],['J / I','旅の手帳 / 持ち物'],['L','ランタンのON / OFF'],['Esc','メニューを開く・街へ戻る'],['戦闘 1〜5','攻撃・守る・灯り・星蜜・退く']])keys.append(el('dt',key),el('dd',text));content.append(keys,el('p','街の住人と物語はゲーム内のフィクションです。展示の参加者本人の発言や経歴を表すものではありません。音・点滅・時間制限で驚かす演出はありません。','subtle'),button('街を歩く',closePanel,'primary'));}
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
function updateHUD(){const snapshot=session.snapshot(),state=snapshot.state,progress=townProgress(state),map=getTownMap(state.mapId),target=contextTarget(),signature=[map.id,progress.title,progress.objective,target?.id,ready].join('|');if(signature===hudSignature)return;hudSignature=signature;$('area-name').textContent=map.name;$('quest-title').textContent=progress.title;$('journal-open').title=progress.title+'：'+progress.objective;$('quest-objective').textContent=progress.objective;$('interact').disabled=!ready||!target;$('interact').textContent=target?(target.type==='creator-home'?`${getCreatorHome(target.creatorId)?.creatorName||'参加者'}のページを開く`:target.type==='portal'?`${target.name||target.label||'扉'}へ`:target.name||target.label||'調べる'):'周りを歩く';$('interact').setAttribute('aria-label',target?`${target.name||target.label||'近くの対象'}を調べる`:'近くに調べる対象はありません');}
function fitCanvas(canvas){const ratio=Math.min(devicePixelRatio||1,2),width=Math.max(1,Math.round(canvas.clientWidth*ratio)),height=Math.max(1,Math.round(canvas.clientHeight*ratio));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}}
function resize(){if(!$('town-canvas').hidden)fitCanvas($('town-canvas'));renderer?.invalidate?.();viewController?.snapshot().view?.invalidate?.();if(battleCanvas)drawBattle();}
function scheduleResize(){clearInput();if(resizeFrame!==null)return;resizeFrame=requestAnimationFrame(()=>{resizeFrame=null;const main=$('town-main'),{width,height}=main.getBoundingClientRect();main.dataset.townOrientation=width>=350&&width>height?'landscape':'portrait';main.dataset.townNarrow=String(width<340);main.dataset.townShort=String(height<300);resize();});}
function inputVector(){const has=name=>held.has(name)||direction===name;return {x:(keys.has('d')||keys.has('arrowright')||has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||has('left')?1:0),z:(keys.has('s')||keys.has('arrowdown')||has('back')?1:0)-(keys.has('w')||keys.has('arrowup')||has('forward')?1:0)};}
function tick(_now,dt){const snapshot=session.tick(dt,{...inputVector(),paused:panel.open,motion:motion(),speed:3.05*settings.speed});if(panel.open){if(snapshot.battle){if(snapshot.revision!==battleRevision)renderBattle();drawBattle();}return;}if(motion())worldTime+=dt;const view3D=viewController?.snapshot().active==='3d',projection={worldPixelsPerUnit:view3D?1:64,groundDepthScale:view3D?Math.sin(55*Math.PI/180):.78};const visitors=characterArt?.visitorActors({state:snapshot.state,time:worldTime,clock:snapshot.time,motion:motion(),dt,view3D})||[];const actors=characterArt?.companionActors({state:snapshot.state,walking:snapshot.walking&&motion(),dt,time:worldTime,motion:motion(),view3D,canStand:point=>isTownWalkable(snapshot.state.mapId,point.x,point.z)})||[];characterArt?.art.rigs.update('owner',{position:snapshot.state.position,dt,time:worldTime,facing:snapshot.state.facing,moving:snapshot.walking,motion:motion(),mapId:snapshot.state.mapId,...projection,displayHeightPx:view3D?1.6:76});for(const resident of getTownMap(snapshot.state.mapId).npcs||[])characterArt?.art.rigs.update('resident:'+resident.id,{position:resident,dt,time:worldTime,facing:'down',moving:false,motion:motion(),mapId:snapshot.state.mapId,...projection,displayHeightPx:(view3D?1.6:76)*(resident.appearance==='cat'?.62:1)});const frame={canvas:$('town-canvas'),state:snapshot.state,time:worldTime,dt,motion:motion(),pixelRatio:Math.min(devicePixelRatio||1,2),walking:snapshot.walking,walkPhase:snapshot.walkPhase,facing:snapshot.state.facing,brightness:settings.brightness,lantern:settings.lantern,cameraDistance,creatorActors:[...visitors,...actors]};lastTownFrame=frame;try{activeTownRenderer()?.render(frame);}catch(error){if(viewController?.snapshot().active!=='3d')throw error;viewController.reportFailure();renderer?.render(frame);}const mapSignature=[snapshot.state.mapId,Math.floor(snapshot.state.position.x*4),Math.floor(snapshot.state.position.z*4),snapshot.state.facing,JSON.stringify(snapshot.state.flags)].join('|');if(mapSignature!==minimapSignature){renderer?.drawMap($('town-minimap'),snapshot.state);minimapSignature=mapSignature;}updateHUD();}
const loop=createFrameLoop({shouldRun:()=>ready&&pageActive&&!document.hidden&&(!panel.open||!!session.snapshot().battle),onFrame:tick});
protectGameSurface($('town-main'));
for(const node of document.querySelectorAll('[data-move]')){const name=node.dataset.move;bindings.push(bindHeldGameButton(node,{pointer:false,blocked:()=>!ready||panel.open,onChange:active=>{if(active)held.add(name);else held.delete(name);}}));}
bindings.push(bindDirectionPad($('town-pad'),{blocked:()=>!ready||panel.open,onChange:value=>direction=value}));
document.addEventListener('keydown',event=>{if(event.target?.matches?.('input,textarea,select,[contenteditable=true]'))return;const key=event.key.toLowerCase();if(panel.open){if(!event.repeat&&session.snapshot().battle&&['1','2','3','4','5'].includes(key)){event.preventDefault();actBattle(battleCommands[Number(key)-1][0]);}return;}if(!ready)return;if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)){event.preventDefault();keys.add(key);}if(event.repeat)return;if(key==='e'||key==='enter'&&(event.target===document.body||[ $('town-canvas'),$('town-webgl') ].includes(event.target))){event.preventDefault();interact();}if(key==='m')showMap();if(key==='j')showJournal();if(key==='i')showInventory();if(key==='l')toggleLantern();if(key==='escape')showMenu();});
document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
for(const surface of[$('town-canvas'),$('town-webgl')]){
surface.addEventListener('pointerdown',event=>{if(!ready||panel.open||event.button>0||canvasPointer)return;try{surface.setPointerCapture(event.pointerId);}catch{return;}canvasPointer={surface,id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now()};});
surface.addEventListener('pointerup',event=>{if(canvasPointer?.id!==event.pointerId)return;const start=canvasPointer;canvasPointer=null;try{surface.releasePointerCapture(event.pointerId);}catch{}if(Math.hypot(start.x-event.clientX,start.y-event.clientY)>8||performance.now()-start.time>650)return;const rect=surface.getBoundingClientRect(),point=activeTownRenderer()?.screenToWorld?.(event.clientX-rect.left,event.clientY-rect.top),target=contextTarget();const picked=activeTownRenderer()?.pickVisitor?.(event.clientX-rect.left,event.clientY-rect.top);if(picked&&characterArt?.visitor(picked)){const visitor=characterArt.visitor(picked),near=characterArt.reachableVisitor(picked,session.snapshot().state);if(near){showVisitor(visitor.id);return;}}if(point&&target&&target.type!=='visitor'&&Math.hypot(point.x-target.x,point.z-target.z)<1.1)interact(target.id);});
for(const type of['pointercancel','lostpointercapture'])surface.addEventListener(type,event=>{if(canvasPointer?.id===event.pointerId)canvasPointer=null;});
}
function toggleLantern(){settings.lantern=!settings.lantern;persistSettings();}
$('lantern-toggle').onclick=toggleLantern;$('interact').onclick=()=>interact();$('menu-open').onclick=showMenu;$('journal-open').onclick=showJournal;$('inventory-open').onclick=showInventory;$('map-open').onclick=showMap;$('minimap-open').onclick=showMap;
function prepareExit(){clearInput();audio.stop({resetVolume:true});session.save();}
$('castle-return').addEventListener('click',prepareExit);
window.addEventListener('blur',()=>{clearInput();audio.stop({resetVolume:true});});window.addEventListener('orientationchange',scheduleResize);
window.addEventListener('pagehide',()=>{pageActive=false;if(!ready)bootAbort?.abort();loop.stop();clearInput();audio.stop({resetVolume:true});session.save();});
window.addEventListener('pageshow',()=>{pageActive=true;clearInput();audio.stop({resetVolume:true});resize();if(!ready&&bootAbort?.signal.aborted)void boot();else if(!document.hidden)loop.start();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){loop.stop();clearInput();audio.stop({resetVolume:true});}else loop.start();});
window.addEventListener('resize',()=>{clearInput();applySettings();scheduleResize();});reduced.addEventListener('change',()=>{clearInput();applySettings();});initViewport({onChange:scheduleResize});
if(typeof ResizeObserver==='function'){const displayObserver=new ResizeObserver(scheduleResize);displayObserver.observe($('town-main'));displayObserver.observe(document.querySelector('.town-world'));}
// Keep the page-lifetime observer independent of temporary settings panels.
const pageDisplayPreferences=initGameDisplay({page:'town',onChange:scheduleResize});scheduleResize();
async function boot(){
 const request=++bootRequest,revision=panelRevision;bootAbort?.abort();const abort=new AbortController();bootAbort=abort;ready=false;loop.stop();clearInput();resetTownView();renderer?.destroy?.();characterArt?.destroy();$('town-loading').hidden=false;$('town-loading').querySelector('p').textContent='街の灯りをともしています…';$('loading-retry').hidden=true;
 if(settings.view==='3d'&&!townWorldModule)townWorldModule=import('./world-3d.js?v=20261019-homes1').catch(()=>{townWorldModule=null;return null;});
 try{characterArt=createTownCharacterArt({initialState:session.snapshot().state,signal:abort.signal,onState:status=>{if(status==='retry'&&request===bootRequest&&!abort.signal.aborted)$('town-loading').querySelector('p').textContent='通信を確かめて、主人公と黒猫の姿をもう一度準備しています…';}});renderer=createTownRenderer({art:characterArt.art});const scenery=renderer;void scenery.ready?.then(()=>{if(request!==bootRequest||abort.signal.aborted)return;scenery.invalidate?.();if(scenery.status?.().failed?.length)notify('一部の景色を準備できませんでした。メニューから読み込み直せます。');});await withDeadline(characterArt.ready,{timeout:40000,signal:abort.signal});if(request!==bootRequest||abort.signal.aborted)return;resize();tick(0,0);ready=true;$('town-loading').hidden=true;prepareTownView();updateHUD();loop.start();const snapshot=session.snapshot();if(snapshot.notice)notify(snapshot.notice);if(!snapshot.state.flags.intro&&!panel.open&&panelRevision===revision)showHelp();}
 catch(error){if(request!==bootRequest||abort.signal.aborted)return;abort.abort();ready=false;$('town-loading').querySelector('p').textContent='街と主人公の支度を完了できませんでした。記録は消えていません。再試行できます。';$('loading-retry').hidden=false;console.warn('Town loading failed',error);}
}
$('loading-retry').onclick=boot;applySettings();updateHUD();boot();

const cameraButton=$('camera-distance');function updateCameraButton(){cameraButton.textContent=cameraDistance==='wide'?'視点：引き':'視点：標準';cameraButton.setAttribute('aria-pressed',String(cameraDistance==='wide'));}cameraButton.onclick=()=>{clearInput();cameraDistance=cameraDistance==='wide'?'normal':'wide';saveCameraDistance('town',cameraDistance);updateCameraButton();resize();if(ready)tick(0,0);};updateCameraButton();
