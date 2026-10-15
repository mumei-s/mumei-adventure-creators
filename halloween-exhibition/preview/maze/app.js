import {createSoundCheck} from './sound-check.js?v=20261015-music-garden1';
import { initVisitorPreferences } from '../visitor-preferences.js?v=20261015-return1';
import { initDisplayMode } from '../display-mode.js?v=20261014-adventure2';
import { normalizeLighting } from './lighting-model.js?v=20261014-adventure2';
import { MAP, CELL, FEATURES, toWorld, collectionAt, move, nearby, initialState, visibleArticles } from './maze-model.js?v=20261014-adventure2';
import { MONSTERS, nearestMonster, newBattle, battleTurn, intentFor, monsterAvailable, prankFor, monsterPose, guidePoint } from './encounter-model.js?v=20261014-adventure2';
import { chooseView, movementVector } from './view-model.js?v=20261014-adventure2';
import { createStageRenderer, EXIT } from './stage-2d.js?v=20261014-adventure2';
import {createArtLibrary,ART_FILES} from './rpg-art.js?v=20261014-adventure2';
import {renderBattleScene} from './battle-scene.js?v=20261014-adventure2';
import {directionFromMovement,moveAroundFurniture} from './rpg-model.js?v=20261014-adventure2';
import {protectGameSurface,bindHeldGameButton,bindDirectionPad} from './game-input.js?v=20261015-touch3';
const rpgArt=createArtLibrary();
let stageRenderer,battleCanvas=null,battleEffect=null,visualTime=0;
let facing='down',walking=false,walkPhase=0,padDirection=null;
const $=id=>document.getElementById(id),panel=$('panel'),content=$('panel-content');
const names={horror:'物語の書庫'},keys=new Set(),held=new Set(),heldControls=[];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
let catalog,world,state=initialState(),year=2026,activeCollection='horror',motion=!reducedMotion.matches,frame=0,last=0,time=0,toastTimer,returnFocus,gameReady=false,storageOK=true;
let encounters=true,cleared=[],battle=null,look=null,view='3d',viewRequest=0,worldFailed=false;
let {brightness,lantern}=normalizeLighting(null),legacyBrightness;
const lightKey='halloween-exhibition:horror-light:v1',viewKey='halloween-exhibition:horror-view:v1',storageKey='halloween-exhibition:labyrinth:v1';
let progress={};
try{const saved=JSON.parse(localStorage.getItem(lightKey)||'{}');({brightness,lantern}=normalizeLighting(saved));if(Number.isFinite(saved?.brightness))legacyBrightness=brightness*100;}catch{}
try{view=chooseView(localStorage.getItem(viewKey),reducedMotion.matches);const p=JSON.parse(localStorage.getItem(storageKey)||'{}');if(p&&typeof p==='object'&&!Array.isArray(p))progress=p;}catch{storageOK=false;view=chooseView(null,reducedMotion.matches);}
const queryView=new URLSearchParams(location.search).get('view');if(['2d','3d'].includes(queryView))view=queryView;
const visitorSection=element('section');
const visitorSettings=initVisitorPreferences({container:visitorSection,legacyBrightness,onBrightness:percent=>{brightness=percent/100;}});
initDisplayMode({controlsParent:visitorSection,page:'maze'});
const soundCheckButton=element('button','確認音を鳴らす（約1秒）');soundCheckButton.type='button';
const soundCheckStatus=element('p','');soundCheckStatus.setAttribute('role','status');
const soundCheck=createSoundCheck({onState:(playing,message)=>{soundCheckButton.textContent=playing?'確認音を停止':'確認音を鳴らす（約1秒）';soundCheckButton.dataset.playing=String(playing);soundCheckStatus.textContent=message;}});
soundCheckButton.onclick=()=>{if(soundCheckButton.dataset.playing==='true')soundCheck.stop();else if(!document.hidden)soundCheck.play(visitorSettings.getPreferences().volume);};
visitorSection.append(soundCheckButton,soundCheckStatus);
const finishButton=element('a','終了・お城へ','visit-finish-button');finishButton.href='../?return=palace';
finishButton.addEventListener('click',()=>{clearInput();soundCheck.stop('');visitorSettings.stopMusic();save();});
visitorSection.append(finishButton);
document.querySelector('.exit-link')?.addEventListener('click',()=>{clearInput();soundCheck.stop('');visitorSettings.stopMusic();save();});

window.addEventListener('pagehide',()=>soundCheck.stop(''));
document.addEventListener('visibilitychange',()=>{if(document.hidden)soundCheck.stop('');});

function saveLight(){try{localStorage.setItem(lightKey,JSON.stringify({lantern}));}catch{}}
function save(){progress[year]={hasKey:state.hasKey,unlocked:state.unlocked,visited:progress[year]?.visited||[]};try{localStorage.setItem(storageKey,JSON.stringify(progress));}catch{storageOK=false;}}
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function clearInput(){walking=false;keys.clear();for(const control of heldControls)control.reset();held.clear();look=null;for(const b of document.querySelectorAll('.move-pad .active'))b.classList.remove('active');}
function openPanel(){clearInput();if(!panel.open){returnFocus=document.activeElement;panel.showModal();}}
function title(kicker,name){panel.classList.remove('battle-mode','library-mode');const heading=element('h2',name);heading.id='panel-title';content.replaceChildren(element('p',kicker,'eyebrow'),heading);}
function toggleLantern(){lantern=!lantern;$('lantern').textContent=lantern?'ランタン ON':'ランタン OFF';$('lantern').setAttribute('aria-pressed',String(lantern));saveLight();}
function showLighting(){title('YOUR LIGHT & SOUND','夜の暗さと、手元の灯り。');content.append(visitorSection,element('p','夜の回廊は暗く、ランタンを点けると足元と前方が暖かく照らされます。暗すぎるときは明るさを上げるか、2D表示へ。文字・操作・地図の明るさは変わりません。'),element('p','音楽は自分でONにしたときだけ流れます。モンスターとの対戦に音・点滅・時間制限はありません。'));content.append(element('p','冒険室の表示バージョン：20261015-music-garden1','build-label'));openPanel();}
function safeURL(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function displayArticleKind(kind){return ({'ホラー記事':'記事','ホラーイラスト':'イラスト','ホラー作品':'作品'})[kind]||kind||'作品';}
function articles(collection=activeCollection){return visibleArticles(catalog.articles,collection);}
function articlePanel(article){title(`${names[article.collection]} · ${article.year||'常設'}`,article.title);const person=catalog.creators.find(c=>c.id===article.creatorId);content.append(element('p',`${person?.name||''} · ${displayArticleKind(article.kind)}`));if(article.image){const image=element('img',undefined,'article-image');image.src=article.image;image.alt=article.title;image.onerror=()=>image.remove();content.append(image);}if(article.description)content.append(element('p',article.description));content.append(element('p','noteの元記事を新しいタブで読みます。展示から戻ると、同じ場所から探索を続けられます。'));const url=safeURL(article.url);if(url){const a=element('a','noteで記事を読む ↗','primary');a.href=url;a.target='_blank';a.rel='noopener noreferrer';content.append(a);}const visited=Array.isArray(progress[year]?.visited)?progress[year].visited:[];progress[year]={...progress[year],visited:[...new Set([...visited,article.id])]};save();const back=element('button','← 記事一覧に戻る');back.onclick=()=>renderCatalog(article.collection);content.append(back);if(!panel.open)openPanel();}
function renderCatalog(collection=activeCollection){
  activeCollection=collection;title('THE STORY LIBRARY','物語の書庫');panel.classList.add('library-mode');
  const hero=element('section',undefined,'library-hero');hero.append(element('p','A LIGHT BETWEEN ADVENTURES','eyebrow'),element('h3','冒険の合間に、物語をひらこう。'),element('p','イラスト、物語、エッセイ。ジャンルを問わず、ここで出会う作品を大切に並べます。'));content.append(hero);
  const list=articles(collection),shelf=element('p',list.length?`書庫の展示 ${list.length}件`:'書庫への掲載を準備中です。記事が届くと、この棚に並びます。','library-shelf-status');content.append(shelf);
  for(const a of list){const b=element('button',undefined,'article-card');b.append(element('strong',a.title),element('span',catalog.creators.find(c=>c.id===a.creatorId)?.name||''));b.onclick=()=>articlePanel(a);content.append(b);}
  content.append(element('h3','冒険に集まった仲間たち','library-section-title'),element('p','参加者のプロフィールから、それぞれのnoteへ。記事の掲載状況とは別の一覧です。','subtle'));
  const people=element('div',undefined,'creators library-creators');
  for(const [index,c] of catalog.creators.entries()){
    const a=element('a',undefined,'creator library-creator');a.href=safeURL(c.profileURL)||'#';a.target='_blank';a.rel='noopener noreferrer';a.style.setProperty('--card-order',String(index));
    const portrait=element('div',undefined,'library-portrait'),im=element('img');im.src=c.avatar;im.alt='';im.onerror=()=>im.remove();portrait.append(im);
    const copy=element('span',undefined,'library-person');copy.append(element('small',`PROFILE ${String(index+1).padStart(2,'0')}`),element('strong',c.name),element('small','noteをひらく ↗'));a.append(portrait,copy);people.append(a);
  }
  content.append(people,element('p','記事の掲載・追加は主催者が管理します。参加者の写真を作品として代用しません。','subtle'));
}

function showCatalog(){renderCatalog();openPanel();}
function restore(){const p=progress[year]||{};state={...initialState(),hasKey:p.hasKey===true,unlocked:p.unlocked===true};if(state.unlocked)state.hasKey=true;world?.setExhibits(articles('horror').length?articles('horror').slice(0,1).map(a=>({title:a.title,subtitle:catalog.creators.find(c=>c.id===a.creatorId)?.name,image:a.image,position:FEATURES.article})):[{title:'展示記事を待つ額縁',subtitle:'記事未登録 · 舞台装飾',position:FEATURES.article}]);updateHUD();}
function askHorror(){title('AN INNER CHAMBER','肖像の回廊へ、入りますか。');content.append(element('p','ここは冒険室の奥にある、肖像の回廊です。暗い回廊と揺れる額縁があります。大きな音・点滅・突然驚かす演出はありません。'),element('p','現在は記事未登録の空展示です。舞台の装飾は、参加者の作品ではありません。'));const b=element('button','回廊の扉をひらく','primary');b.onclick=()=>{state.horrorAccepted=true;panel.close();notify('肖像の回廊の扉がひらいた。中へ歩いて進めます。');};content.append(b);openPanel();}
function interact(){if(Math.hypot(state.x-EXIT.x*CELL,state.z-EXIT.z*CELL)<3.2){showExit();return;}const kind=nearby(state);if(kind==='key'){state.hasKey=true;save();notify('書庫の鍵を手に入れた。中央の奥にある格子扉へ。');}else if(kind==='gate'){if(!state.hasKey)notify('格子扉には鍵が必要です。東の鍵の間を探してください。');else{state.unlocked=true;save();notify('鍵が回り、書庫の扉がひらく。浮かぶ本の奥へ進めます。');}}else if(kind==='article'){const a=articles('horror')[0];if(a&&articles('horror').length===1)articlePanel(a);else{renderCatalog('horror');openPanel();}}else if(kind==='horror')askHorror();else if(kind==='horror-art'){renderCatalog('horror');openPanel();}else if(kind==='vault'){title('THE LIVING ARCHIVE','あなたがひらいた、物語の書庫。');content.append(element('p','分かれ道で鍵を見つけ、扉を開いて、この書庫までたどり着きました。ここはジャンルを問わない記事を収める、名鑑とは別の部屋です。'),element('p','この別室の展示記事は、まだ登録されていません。記事の追加に合わせて、実際の展示が増えていきます。'));const b=element('button','展示記事を見る','primary');b.onclick=()=>renderCatalog('horror');content.append(b);openPanel();}updateHUD();}
function showMap(){title('EXPLORE AT YOUR PACE','迷宮の見取り図');const cv=element('canvas',undefined,'bigmap');cv.width=510;cv.height=510;drawMap(cv,true);content.append(cv,element('p','三角が現在位置です。3Dでは向きも表示します。右の鍵の間で鍵を見つけ、北の格子扉に使います。青い点は記事の額縁。歩かずに記事一覧から直接読むこともできます。'));const hints=element('ul',undefined,'resident-hint-list');for(const m of MONSTERS)hints.append(element('li',`${m.icon} ${m.name}：${m.hint}${monsterAvailable(m,state)?'':' · 扉をひらくと会えます'}`));content.append(hints);const tabs=element('div',undefined,'tabs');for(const [label,point,yaw]of[['入口へ',FEATURES.spawn,0],['鍵の間へ',{x:13,z:10},Math.PI/2],['肖像の扉へ',{x:5,z:10},Math.PI/2]]){const b=element('button',label);b.onclick=()=>{state={...state,...toWorld(point),yaw,pitch:0};panel.close();updateHUD();};tabs.append(b);}content.append(tabs);openPanel();}
function resetPosition(){state={...state,...toWorld(FEATURES.spawn),yaw:0,pitch:0};clearInput();updateHUD();notify('入口に戻りました。手に入れた鍵は、そのままです。');}
function showExit(){title('RETURN TO HALLOWEEN','名鑑へ戻りますか。');content.append(element('p','鍵と記事の記録は保存されています。住人とのミニ対戦は、次の訪問でリセットされます。'));const back=element('a','Halloweenの名鑑へ戻る','primary');back.href='../?return=palace';back.textContent='終了・お城へ';back.addEventListener('click',()=>{clearInput();soundCheck.stop('');visitorSettings.stopMusic();save();});content.append(back);openPanel();}
function showExploreMenu(){
  title('EXPLORE AT YOUR PACE','探索メニュー');
  content.append(element('p','円形パッドは、押したまま指を動かして方向を変えられます。2Dは東西南北へ移動。3Dは左右で向きを変え、上下で前進・後退します。3Dの画面ドラッグとWASDも使えます。Eで調べる、Bで話しかける。動きを減らす設定では住人の歩行や装飾の動きを止めます。'));
  const menu=element('div',undefined,'explore-menu');
  for(const [label,action]of[['記事一覧',()=>{showCatalog();panel.querySelector('.close').focus();}],['迷宮全体の地図',()=>{showMap();panel.querySelector('.close').focus();}],['明るさ・音楽',()=>{showLighting();panel.querySelector('.close').focus();}],['モンスターと遊ぶ',()=>{showEncounters();panel.querySelector('.close').focus();}],['迷宮の入口へ',()=>{panel.close();resetPosition();}]]){const button=element('button',label);button.onclick=action;menu.append(button);}
  const motionButton=element('button');motionButton.id='menu-motion-toggle';motionButton.onclick=()=>{$('pause').click();};menu.append(motionButton);
  const motionStatus=element('p',motion?'住人の歩行・光の揺らぎ：再生中':'住人の歩行・光の揺らぎ：停止中');motionStatus.id='menu-motion-status';motionStatus.setAttribute('role','status');menu.append(motionStatus);
  const back=element('a','Halloweenの名鑑へ戻る','primary');back.href='../?mode=halloween';menu.append(back);content.append(menu);updateMotion();openPanel();
}

function updateHUD(){
  $('wing').textContent='HALLOWEEN ADVENTURE · 名鑑とは別のゲーム';
  $('place-title').textContent=state.x<18?'肖像の回廊':state.x>50?'鍵の間':state.z<24?'浮遊書庫':'灯りの交差廊';
  $('objective').textContent=state.unlocked?'封印が解けた。北の浮遊書庫へ進もう。':state.hasKey?'鍵を持って、北の格子扉へ。':'東の鍵の間で鍵を見つけ、奥の書庫をひらく。';
  $('key-state').textContent=state.unlocked?'✦ 書庫の扉を解錠':state.hasKey?'⚿ 書庫の鍵を入手':'◇ 鍵を探す';
  const n=nearby(state),copy={key:['台座に、金色の鍵が浮かんでいる。','鍵を手に取る'],gate:['奥へ続く、書庫の格子扉。',state.hasKey?'鍵で扉をひらく':'鍵のかかった扉'],article:['物語の書庫につながる展示場所。','展示記事を見る'],horror:['奥の肖像の回廊へ続く扉。','肖像の回廊へ'],'horror-art':['肖像の回廊の展示場所。','物語の書庫を見る'],vault:['本が漂う、封印の書庫。','書庫を調べる']}[n];
  $('object-label').textContent=copy?.[0]||'ランタンを持って、夜の回廊を歩こう。';
  const nearExit=Math.hypot(state.x-EXIT.x*CELL,state.z-EXIT.z*CELL)<3.2;
  $('interact').textContent=nearExit?'出口をひらく':copy?.[1]||'近づいて調べる';$('interact').disabled=!n&&!nearExit;
  const monster=encounters?nearestMonster(state,cleared,{time,motion:motion&&!reducedMotion.matches}):null;
  $('battle-open').hidden=!encounters;$('battle-open').disabled=!monster;
  $('battle-open').textContent=monster?`${monster.icon} 話しかける [B]`:'住人に近づこう';
  $('creatures-open').textContent=`${MONSTERS.length}種の居場所`; 
}
function showEncounters(){
  title('MEET THE RESIDENTS','モンスターに出会ったら。');
  content.append(element('p','6種の架空の住人が部屋をゆっくり歩いています。近づいて話しかけ、対戦するか立ち去るかを選べます。突然戦闘にはなりません。参加者や投稿作品とは無関係です。'));
  const roster=element('div',undefined,'monster-roster');
  for(const m of MONSTERS){const card=element('div',undefined,'monster-card');const portrait=element('img',undefined,'monster-portrait');portrait.src=new URL(`./assets/rpg/${ART_FILES[m.id]}`,import.meta.url).href;portrait.alt='';card.append(portrait,element('strong',m.name),element('small',`${m.hint}${cleared.includes(m.id)?' · クリア済み':''}`));const guide=element('button','近くへ案内','monster-guide-button');guide.onclick=()=>{const p=guidePoint(m,state);encounters=true;state={...state,...toWorld(p),yaw:p.yaw,pitch:0};panel.close();clearInput();updateHUD();notify(p.hint);};card.append(guide);roster.append(card);}
  content.append(roster,element('p','「話しかける」のあと「対戦する」を選ぶとスタート。光を当てる／守るを選ぶだけ。守ると次の光が2倍になります。いつでも逃げて探索に戻れます。'));
  const actions=element('div',undefined,'tabs');
  const enable=element('button',encounters?'住人を一時的に隠す':'住人を表示する','primary');
  enable.id='encounters-toggle';enable.onclick=()=>{encounters=!encounters;battle=null;panel.close();updateHUD();notify(encounters?'住人たちが待っています。入口の少し先にカボチャの番人。':'モンスターをOFFにしました。探索はそのまま続けられます。');};
  const visit=element('button','入口のカボチャに会う');visit.onclick=()=>{encounters=true;resetPosition();panel.close();updateHUD();notify('目の前のカボチャに近づき「対戦」を押してください。');};
  const reset=element('button','対戦だけリセット');reset.onclick=()=>{cleared=[];battle=null;showEncounters();$('encounters-toggle')?.focus();notify('住人との対戦をリセットしました。鍵と記事の記録はそのままです。');};
  actions.append(enable,visit,reset);content.append(actions,element('p','住人は最初から表示されます。ここで一時的に隠すこともできます。対戦の記録は今回の訪問中だけ。','subtle'));openPanel();
}
function startBattle(){
  if(!encounters)return;const monster=nearestMonster(state,cleared,{time,motion:motion&&!reducedMotion.matches});if(!monster)return;
  title('A FRIENDLY ENCOUNTER',monster.name);const portrait=element('img',undefined,'encounter-portrait');portrait.src=new URL(`./assets/rpg/${ART_FILES[monster.id]}`,import.meta.url).href;portrait.alt='';content.append(portrait,element('p','住人がこちらを見ています。光のミニ対戦で遊ぶ？ そのまま立ち去っても大丈夫。音や時間制限はありません。'));
  const actions=element('div',undefined,'tabs'),fight=element('button','対戦する','primary'),leave=element('button','立ち去る');fight.id='encounter-confirm';fight.onclick=()=>{battle=newBattle(monster.id);battleEffect=null;renderBattle();$('battle-shine')?.focus();};leave.id='encounter-leave';leave.onclick=()=>panel.close();actions.append(fight,leave);content.append(actions);openPanel();
}
function renderBattle(){
  const m=MONSTERS.find(m=>m.id===battle.id);title('LANTERN DUEL · 時間制限なし',m.name);panel.classList.add('battle-mode');
  battleCanvas=element('canvas',undefined,'battle-scene');battleCanvas.id='battle-scene';battleCanvas.setAttribute('aria-label',`${m.name}とのランタン対戦。操作は下のコマンドから。`);content.append(battleCanvas);
  const status=element('p',battle.message,'duel-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');content.append(status);
  const stats=element('div',undefined,'duel-stats');
  for(const [name,value,max,kind]of[['あなたの勇気',battle.energy,4,'courage'],['住人のいたずら',battle.spirit,3,'mischief']]){const item=element('div',undefined,'duel-stat');item.append(element('span',`${name} ${value}/${max}`));const bar=element('meter',undefined,kind);bar.min=0;bar.max=max;bar.value=value;bar.setAttribute('aria-label',name);item.append(bar);stats.append(item);}content.append(stats);
  const actions=element('div',undefined,'tabs battle-commands');
  if(battle.status==='playing'){
    content.append(element('p',`次の相手：${intentFor(battle)}。${battle.charged?'次の光は2倍！':'守ると防御＋次の光が2倍。'}`,'battle-intent'));
    const shine=element('button',battle.charged?'✧ 光を放つ ×2 [1]':'✧ 光を放つ [1]','primary');shine.id='battle-shine';shine.onclick=()=>actBattle('shine');
    const guard=element('button','◇ ランタンを守る [2]');guard.id='battle-guard';guard.onclick=()=>actBattle('guard');actions.append(shine,guard);
  }else{
    if(battle.status==='won'){if(!cleared.includes(m.id))cleared.push(m.id);content.append(element('p',`キャンディのしるし ${cleared.length}/${MONSTERS.length}。住人と仲直りしました。`,'battle-reward'));}
    const again=element('button','もう一度対戦');again.id='battle-retry';again.onclick=()=>{cleared=cleared.filter(id=>id!==m.id);battle=newBattle(m.id);battleEffect=null;renderBattle();$('battle-shine')?.focus();};actions.append(again);
  }
  const exit=element('button',battle.status==='playing'?'探索に戻る [Esc]':'探索を続ける','battle-exit');exit.id='battle-exit';exit.onclick=()=>panel.close();actions.append(exit);content.append(actions);
  drawBattleVisual();
}
function drawBattleVisual(){
  if(!battle||!battleCanvas)return;const ratio=Math.min(devicePixelRatio||1,2),width=battleCanvas.clientWidth||360,height=battleCanvas.clientHeight||210;
  if(battleCanvas.width!==Math.round(width*ratio)||battleCanvas.height!==Math.round(height*ratio)){battleCanvas.width=Math.round(width*ratio);battleCanvas.height=Math.round(height*ratio);}
  renderBattleScene({canvas:battleCanvas,art:rpgArt,battle,effect:battleEffect,time:visualTime,motion:motion&&!reducedMotion.matches,pixelRatio:ratio});
}
function actBattle(action){if(!battle||battle.status!=='playing')return;const damage=battle.charged?2:1;battleEffect={type:action,damage,retaliation:prankFor(battle).damage,started:visualTime};battle=battleTurn(battle,action);renderBattle();$(battle.status==='playing'?(action==='guard'?'battle-guard':'battle-shine'):'battle-exit')?.focus();updateHUD();}

function drawMap(canvas,large=false,night=false){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const s=Math.min(w,h)/17,ox=(w-17*s)/2,oz=(h-17*s)/2;
  c.clearRect(0,0,w,h);c.fillStyle='#090a15';c.fillRect(0,0,w,h);c.save();c.translate(ox,oz);
  const px=(state.x/CELL+.5)*s,pz=(state.z/CELL+.5)*s;
  for(let z=0;z<17;z++)for(let x=0;x<17;x++)if(MAP[z][x]==='.'){
    c.fillStyle=x<5?'#473450':x>11?'#53432f':z<6?'#343e57':'#3d374a';c.fillRect(x*s+.5,z*s+.5,s-1,s-1);
    c.strokeStyle='#ac795333';c.strokeRect(x*s+3,z*s+3,s-6,s-6);
  }
  if(night){
    c.fillStyle=`rgba(2,3,12,${Math.max(.26,.76-(brightness-1)*.24)})`;c.fillRect(0,0,s*17,s*17);
    if(lantern){const gradient=c.createRadialGradient(px,pz,0,px,pz,s*3.7);gradient.addColorStop(0,'#ffd58c90');gradient.addColorStop(.45,'#eeab5842');gradient.addColorStop(1,'#f4b75500');c.fillStyle=gradient;c.fillRect(0,0,s*17,s*17);}
  }
  // Route hints, articles, key and player remain readable with the lantern OFF.
  for(const [x,z]of[[5,8],[11,8],[5,13],[11,13],[13,9],[15,12],[7,2]]){c.fillStyle='#db833e';c.beginPath();c.ellipse((x+.5)*s,(z+.5)*s,s*.16,s*.13,0,0,Math.PI*2);c.fill();}
  c.fillStyle=state.unlocked?'#80c9ad':'#dfa34d';c.fillRect(7*s,6*s,3*s,s*.22);
  if(!state.horrorAccepted){c.fillStyle='#b695ce';c.fillRect(4*s,10*s,s*.22,s);}
  for(const [f,color]of[[FEATURES.article,'#9be0f2'],[FEATURES.key,state.hasKey?'#66574b':'#ffdc77'],[FEATURES.horrorArt,'#d498dc'],[FEATURES.vault,'#80c9ad']]){c.fillStyle=color;c.beginPath();c.arc((f.x+.5)*s,(f.z+.5)*s,s*.18,0,Math.PI*2);c.fill();}
  if(encounters){c.textAlign='center';c.textBaseline='middle';c.font=`${Math.max(11,s*.75)}px sans-serif`;for(const m of MONSTERS){c.globalAlpha=!monsterAvailable(m,state)?.4:cleared.includes(m.id)?.5:1;c.fillText(cleared.includes(m.id)?'🍬':m.icon,(m.x+.5)*s,(m.z+.5)*s);}c.globalAlpha=1;}
  c.save();c.translate(px,pz);if(view!=='2d')c.rotate(-state.yaw);c.fillStyle='#fff2cb';c.strokeStyle='#1b1025';c.lineWidth=2;c.beginPath();c.moveTo(0,-s*.36);c.lineTo(-s*.27,s*.28);c.lineTo(s*.27,s*.28);c.closePath();c.fill();c.stroke();c.restore();
  if(large){c.font=`${Math.max(11,s*.33)}px sans-serif`;c.textAlign='center';c.fillStyle='#e8d7c2';c.fillText('西：肖像の回廊　 北：書庫　 東：鍵の間',s*8.5,s*16.4);}
  c.restore();
}
function resizeFlat(){stageRenderer?.invalidate();const c=$('fallback'),ratio=Math.min(devicePixelRatio||1,2);c.width=Math.max(1,Math.round(c.clientWidth*ratio));c.height=Math.max(1,Math.round(c.clientHeight*ratio));}
function updateViewUI(){
  document.body.dataset.view=view;$('world').hidden=view!=='3d';$('fallback').hidden=view!=='2d';
  $('view-2d').setAttribute('aria-pressed',String(view==='2d'));$('view-3d').setAttribute('aria-pressed',String(view==='3d'));
  $('look-hint').textContent=view==='2d'?'↑ 北へ · ← 西へ · → 東へ':'LOOK · 画面をドラッグ';
  $('controls-hint').textContent=view==='2d'?'WASD・矢印で移動 · Eで調べる · Bで話しかける':'WASDで移動 · ドラッグで視点 · Eで調べる';
  $('pad-mode-hint').textContent=view==='2d'?'2D：↑↓←→で東西南北へ':'3D：↑前進 ↓後退 · ←→方向転換';for(const b of document.querySelectorAll('[data-move]')){const labels=view==='2d'?{forward:'北へ移動',back:'南へ移動',left:'西へ移動',right:'東へ移動'}:{forward:'前へ進む',back:'後ろへ下がる',left:'左を向く',right:'右を向く'};b.setAttribute('aria-label',labels[b.dataset.move]);}
  if(view==='2d')resizeFlat();else world?.resize();
}
async function setView(next,{persist=true,quiet=false}={}){
  const request=++viewRequest;let failed=false;clearInput();view=next;state.pitch=0;updateViewUI();
  if(next==='3d'&&!world){
    $('view-3d').disabled=true;
    try{if(worldFailed)throw Error('WebGL unavailable');const {createWorld}=await import('./world.js?v=20261014-adventure2');if(request!==viewRequest)return;world=createWorld({canvas:$('world')});restoreExhibits();}
    catch(e){if(request!==viewRequest)return;failed=true;worldFailed=true;view='2d';console.warn('3D unavailable; 2D remains fully playable.',e);if(!quiet)notify('3Dを利用できないため、2Dで探索できます。対戦と記事もそのまま使えます。');}
    finally{$('view-3d').disabled=false;}
  }
  if(request!==viewRequest)return;updateViewUI();
  if(persist)try{localStorage.setItem(viewKey,view);}catch{}
  if(!quiet&&!failed)notify(view==='2d'?'2Dに切り替えました。矢印キーで東西南北へ。':'3Dに切り替えました。位置・鍵・対戦の記録はそのままです。');
}
function restoreExhibits(){if(!catalog||!world)return;world.setExhibits(articles('horror').length?articles('horror').slice(0,1).map(a=>({title:a.title,subtitle:catalog.creators.find(c=>c.id===a.creatorId)?.name,image:a.image,position:FEATURES.article})):[{title:'展示記事を待つ額縁',subtitle:'記事未登録 · 舞台装飾',position:FEATURES.article}]);}
function step(dt){
  const down=name=>held.has(name)||padDirection===name;
  const f=(keys.has('w')||keys.has('arrowup')||down('forward')?1:0)-(keys.has('s')||keys.has('arrowdown')||down('back')?1:0);
  const r=(keys.has('d')||(view==='2d'&&down('right'))||(view==='2d'&&keys.has('arrowright'))?1:0)-(keys.has('a')||(view==='2d'&&down('left'))||(view==='2d'&&keys.has('arrowleft'))?1:0);
  if(view==='3d'){if(keys.has('arrowleft')||held.has('turn-left')||down('left'))state.yaw+=dt*2.3;if(keys.has('arrowright')||held.has('turn-right')||down('right'))state.yaw-=dt*2.3;}
  const {dx,dz}=movementVector(view,state.yaw,f,r,6.8*dt);const old=state;state=view==='2d'?moveAroundFurniture(state,dx,dz):move(state,dx,dz);const mx=state.x-old.x,mz=state.z-old.z;walking=Math.hypot(mx,mz)>.0001;facing=directionFromMovement(dx,dz,facing);if(walking)walkPhase=(walkPhase+Math.hypot(mx,mz)*2.3)%(Math.PI*2);
}
function tick(now){
  frame=0;if(document.hidden)return;const dt=Math.min((now-(last||now))/1000,.05);last=now;if(motion&&!reducedMotion.matches)visualTime+=dt;
  if(panel.open&&battle)drawBattleVisual();
  if(!panel.open){step(dt);if(motion)time+=dt;if(view==='3d')world?.render({...state,time:time*1000,motion:motion&&!reducedMotion.matches,brightness,lantern,encounters,cleared});else {stageRenderer??=createStageRenderer({art:rpgArt});stageRenderer.render({canvas:$('fallback'),state,brightness,lantern,encounters,cleared,pixelRatio:Math.min(devicePixelRatio||1,2),time,dt,motion:motion&&!reducedMotion.matches,facing,walking,walkPhase});}drawMap($('mini'));updateHUD();}
  frame=requestAnimationFrame(tick);
}
function start(){if(!frame&&gameReady){last=0;frame=requestAnimationFrame(tick);}}
window.addEventListener('resize',()=>{world?.resize();if(view==='2d')resizeFlat();});
document.addEventListener('yearbook:layout-change',()=>requestAnimationFrame(()=>{if(view==='2d')resizeFlat();else world?.resize();if(battle)drawBattleVisual();}));
protectGameSurface($('game'));
$('world').addEventListener('pointerdown',e=>{if(panel.open||view!=='3d'||e.button>0)return;if(e.cancelable)e.preventDefault();look={id:e.pointerId,x:e.clientX,y:e.clientY};$('world').setPointerCapture(e.pointerId);});
$('world').addEventListener('pointermove',e=>{if(!look||look.id!==e.pointerId||view!=='3d')return;state.yaw-=(e.clientX-look.x)*.005;state.pitch=Math.max(-.6,Math.min(.6,state.pitch-(e.clientY-look.y)*.004));look={id:e.pointerId,x:e.clientX,y:e.clientY};});
for(const type of['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(type,()=>look=null);
for(const button of document.querySelectorAll('[data-move],#turn-left,#turn-right')){
  const name=button.dataset.move||button.id;
  heldControls.push(bindHeldGameButton(button,{blocked:()=>panel.open,pointer:!button.dataset.move,onChange:active=>{if(active)held.add(name);else held.delete(name);}}));
}
heldControls.push(bindDirectionPad($('direction-pad'),{blocked:()=>panel.open||!gameReady,onChange:direction=>{padDirection=direction;}}));
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(panel.open){if(battle?.status==='playing'&&!e.repeat&&['1','2'].includes(k)){e.preventDefault();actBattle(k==='1'?'shine':'guard');}return;}
  if(!gameReady||(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable))return;
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k);}
  if(e.repeat)return;if(k==='e')interact();if(k==='b')startBattle();if(k==='l')toggleLantern();if(k==='escape')resetPosition();
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;clearInput();}else start();});
$('tools-open').onclick=showLighting;$('lantern').onclick=toggleLantern;$('lantern').textContent=lantern?'ランタン ON':'ランタン OFF';$('lantern').setAttribute('aria-pressed',String(lantern));
$('interact').onclick=interact;$('list-open').onclick=()=>{if(catalog)showCatalog();};$('map-open').onclick=()=>{if(catalog)showMap();};$('home').onclick=resetPosition;
$('menu-open').onclick=showExploreMenu;$('creatures-open').onclick=showEncounters;$('battle-open').onclick=startBattle;
$('view-2d').onclick=()=>setView('2d');$('view-3d').onclick=()=>setView('3d');
function updateMotion(){const enabled=motion&&!reducedMotion.matches;
  $('pause').textContent=enabled?'演出を停止':reducedMotion.matches?'端末設定で演出停止中':'演出を再開';$('pause').setAttribute('aria-pressed',String(!enabled));
  const toggle=$('menu-motion-toggle');if(toggle){toggle.textContent=reducedMotion.matches?'端末設定で演出停止中':enabled?'演出：ON → 停止する':'演出：OFF → 再開する';toggle.setAttribute('aria-pressed',String(enabled));toggle.disabled=reducedMotion.matches;}
  const status=$('menu-motion-status');if(status)status.textContent=reducedMotion.matches?'端末の「動きを減らす」設定を優先しています。自分の移動操作は使えます。':enabled?'住人の歩行・光の揺らぎ：再生中。メニューを閉じると確認できます。':'住人の歩行・光の揺らぎ：停止中。自分の移動操作は使えます。';
}
$('pause').onclick=()=>{if(reducedMotion.matches){notify('端末の「動きを減らす」設定を優先しています。2D表示も選べます。');return;}motion=!motion;updateMotion();};
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){motion=false;setView('2d',{persist:false});}updateMotion();});updateMotion();
panel.querySelector('.close').onclick=()=>panel.close();panel.addEventListener('close',()=>{soundCheck.stop('');battle=null;battleCanvas=null;battleEffect=null;panel.classList.remove('battle-mode','library-mode');clearInput();returnFocus?.focus();last=0;});
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();worldFailed=true;world?.dispose();world=null;setView('2d',{persist:false});notify('3D描画が止まったため、同じ場所から2D表示で続けられます。');});
async function init(){
  try{const response=await fetch('./data/catalog.json');if(!response.ok)throw Error('catalog fetch failed');catalog=await response.json();if(catalog.schemaVersion!==2||!Array.isArray(catalog.creators)||!Array.isArray(catalog.articles))throw Error('invalid catalog');year=Math.max(...catalog.years);restore();await setView(view,{persist:false,quiet:true});gameReady=true;$('loading').hidden=true;start();}
  catch(e){$('loading').textContent='記事データを読み込めませんでした。';const back=element('a','Halloweenの名鑑へ戻る','primary');back.href='../?mode=halloween';const retry=element('button','再読み込み');retry.onclick=()=>location.reload();$('loading').append(back,retry);console.error(e);}
}
rpgArt.ready.then(()=>{document.body.dataset.art=rpgArt.failures.length?'partial':'ready';if(rpgArt.failures.length){console.warn('Some original RPG art could not load:',rpgArt.failures);notify('一部のイラストを読み込めず、簡易表示で続けています。再読み込みでお試しください。');}});
updateViewUI();init();


