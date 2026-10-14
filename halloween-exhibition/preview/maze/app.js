import { initVisitorPreferences } from '../visitor-preferences.js';
import { normalizeLighting } from './lighting-model.js';
import { MAP, CELL, FEATURES, toWorld, collectionAt, move, nearby, initialState, visibleArticles } from './maze-model.js';
import { MONSTERS, nearestMonster, newBattle, battleTurn, intentFor } from './encounter-model.js';
import { chooseView, movementVector } from './view-model.js';
import { createStageRenderer, EXIT } from './stage-2d.js';
let stageRenderer;
const $=id=>document.getElementById(id),panel=$('panel'),content=$('panel-content');
const names={horror:'ホラーの別室'},keys=new Set(),held=new Set();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
let catalog,world,state=initialState(),year=2026,activeCollection='horror',motion=!reducedMotion.matches,frame=0,last=0,time=0,toastTimer,returnFocus,gameReady=false,storageOK=true;
let encounters=false,cleared=[],battle=null,look=null,view='3d',viewRequest=0,worldFailed=false;
let {brightness,lantern}=normalizeLighting(null),legacyBrightness;
const lightKey='halloween-exhibition:horror-light:v1',viewKey='halloween-exhibition:horror-view:v1',storageKey='halloween-exhibition:labyrinth:v1';
let progress={};
try{const saved=JSON.parse(localStorage.getItem(lightKey)||'{}');({brightness,lantern}=normalizeLighting(saved));if(Number.isFinite(saved?.brightness))legacyBrightness=brightness*100;}catch{}
try{view=chooseView(localStorage.getItem(viewKey),reducedMotion.matches);const p=JSON.parse(localStorage.getItem(storageKey)||'{}');if(p&&typeof p==='object'&&!Array.isArray(p))progress=p;}catch{storageOK=false;view=chooseView(null,reducedMotion.matches);}
const queryView=new URLSearchParams(location.search).get('view');if(['2d','3d'].includes(queryView))view=queryView;
const visitorSection=element('section');
initVisitorPreferences({container:visitorSection,legacyBrightness,onBrightness:percent=>{brightness=percent/100;}});
function saveLight(){try{localStorage.setItem(lightKey,JSON.stringify({lantern}));}catch{}}
function save(){progress[year]={hasKey:state.hasKey,unlocked:state.unlocked,visited:progress[year]?.visited||[]};try{localStorage.setItem(storageKey,JSON.stringify(progress));}catch{storageOK=false;}}
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function clearInput(){keys.clear();held.clear();look=null;for(const b of document.querySelectorAll('.move-pad .active'))b.classList.remove('active');}
function openPanel(){clearInput();if(!panel.open){returnFocus=document.activeElement;panel.showModal();}}
function title(kicker,name){const heading=element('h2',name);heading.id='panel-title';content.replaceChildren(element('p',kicker,'eyebrow'),heading);}
function toggleLantern(){lantern=!lantern;$('lantern').textContent=lantern?'ランタン ON':'ランタン OFF';$('lantern').setAttribute('aria-pressed',String(lantern));saveLight();}
function showLighting(){title('YOUR LIGHT & SOUND','夜の暗さと、手元の灯り。');content.append(visitorSection,element('p','夜の回廊は暗く、ランタンを点けると足元と前方が暖かく照らされます。暗すぎるときは明るさを上げるか、2D表示へ。文字・操作・地図の明るさは変わりません。'),element('p','音楽は自分でONにしたときだけ流れます。モンスターとの対戦に音・点滅・時間制限はありません。'));openPanel();}
function safeURL(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function articles(collection=activeCollection){return visibleArticles(catalog.articles,collection);}
function articlePanel(article){title(`${names[article.collection]} · ${article.year||'常設'}`,article.title);const person=catalog.creators.find(c=>c.id===article.creatorId);content.append(element('p',`${person?.name||''} · ${article.kind}`));if(article.image){const image=element('img',undefined,'article-image');image.src=article.image;image.alt=article.title;image.onerror=()=>image.remove();content.append(image);}if(article.description)content.append(element('p',article.description));content.append(element('p','noteの元記事を新しいタブで読みます。展示から戻ると、同じ場所から探索を続けられます。'));const url=safeURL(article.url);if(url){const a=element('a','noteで記事を読む ↗','primary');a.href=url;a.target='_blank';a.rel='noopener noreferrer';content.append(a);}const visited=Array.isArray(progress[year]?.visited)?progress[year].visited:[];progress[year]={...progress[year],visited:[...new Set([...visited,article.id])]};save();if(!panel.open)openPanel();}
function renderCatalog(collection=activeCollection){activeCollection=collection;title('HORROR ARTICLES',names[collection]);const tabs=element('div',undefined,'tabs');for(const id of['horror']){const b=element('button',names[id]);b.setAttribute('aria-pressed',String(id===collection));b.onclick=()=>renderCatalog(id);tabs.append(b);}content.append(tabs);const list=articles(collection);if(!list.length){const empty=element('div',undefined,'empty');empty.append(element('strong','ホラーイラストの記事を、ここに。'),element('p','この区画の確認済み記事は、まだ登録されていません。参加者のプロフィール画像を作品として代用せず、記事の到着を待っています。'));content.append(empty);}for(const a of list){const b=element('button',undefined,'article-card');b.append(element('strong',a.title),element('span',catalog.creators.find(c=>c.id===a.creatorId)?.name||''));b.onclick=()=>articlePanel(a);content.append(b);}content.append(element('h2',`名鑑の参加者 ${catalog.creators.length}人`),element('p','以下は名鑑の参加者一覧です。ホラー記事の投稿者一覧ではありません。','subtle'));const people=element('div',undefined,'creators');for(const c of catalog.creators){const a=element('a',undefined,'creator');a.href=safeURL(c.profileURL)||'#';a.target='_blank';a.rel='noopener noreferrer';const im=element('img');im.src=c.avatar;im.alt='';im.onerror=()=>im.remove();a.append(im,element('span',c.name));people.append(a);}content.append(people,element('p','記事の掲載・追加は主催者が管理します。','subtle'));}
function showCatalog(){renderCatalog();openPanel();}
function restore(){const p=progress[year]||{};state={...initialState(),hasKey:p.hasKey===true,unlocked:p.unlocked===true};if(state.unlocked)state.hasKey=true;world?.setExhibits(articles('horror').length?articles('horror').slice(0,1).map(a=>({title:a.title,subtitle:catalog.creators.find(c=>c.id===a.creatorId)?.name,image:a.image,position:FEATURES.article})):[{title:'ホラー記事を待つ額縁',subtitle:'記事未登録 · 舞台装飾',position:FEATURES.article}]);updateHUD();}
function askHorror(){title('AN INNER CHAMBER','肖像の回廊へ、入りますか。');content.append(element('p','ここはホラー別室の奥にある、肖像の回廊です。暗い回廊と揺れる額縁があります。大きな音・点滅・突然驚かす演出はありません。'),element('p','現在は記事未登録の空展示です。舞台の装飾は、参加者の作品ではありません。'));const b=element('button','回廊の扉をひらく','primary');b.onclick=()=>{state.horrorAccepted=true;panel.close();notify('肖像の回廊の扉がひらいた。中へ歩いて進めます。');};content.append(b);openPanel();}
function interact(){if(Math.hypot(state.x-EXIT.x*CELL,state.z-EXIT.z*CELL)<3.2){showExit();return;}const kind=nearby(state);if(kind==='key'){state.hasKey=true;save();notify('書庫の鍵を手に入れた。中央の奥にある格子扉へ。');}else if(kind==='gate'){if(!state.hasKey)notify('格子扉には鍵が必要です。東の鍵の間を探してください。');else{state.unlocked=true;save();notify('鍵が回り、書庫の扉がひらく。浮かぶ本の奥へ進めます。');}}else if(kind==='article'){const a=articles('horror')[0];if(a&&articles('horror').length===1)articlePanel(a);else{renderCatalog('horror');openPanel();}}else if(kind==='horror')askHorror();else if(kind==='horror-art'){renderCatalog('horror');openPanel();}else if(kind==='vault'){title('THE LIVING ARCHIVE','あなたがひらいた、物語の書庫。');content.append(element('p','分かれ道で鍵を見つけ、扉を開いて、この書庫までたどり着きました。ここはホラーイラストの記事を収める、名鑑とは別の部屋です。'),element('p','この別室のホラー記事は、まだ登録されていません。記事の追加に合わせて、実際の展示が増えていきます。'));const b=element('button','ホラー記事を見る','primary');b.onclick=()=>renderCatalog('horror');content.append(b);openPanel();}updateHUD();}
function showMap(){title('EXPLORE AT YOUR PACE','迷宮の見取り図');const cv=element('canvas',undefined,'bigmap');cv.width=510;cv.height=510;drawMap(cv,true);content.append(cv,element('p','三角が現在位置です。3Dでは向きも表示します。右の鍵の間で鍵を見つけ、北の格子扉に使います。青い点は記事の額縁。歩かずに記事一覧から直接読むこともできます。'));const tabs=element('div',undefined,'tabs');for(const [label,point,yaw]of[['入口へ',FEATURES.spawn,0],['鍵の間へ',{x:13,z:10},Math.PI/2],['肖像の扉へ',{x:5,z:10},Math.PI/2]]){const b=element('button',label);b.onclick=()=>{state={...state,...toWorld(point),yaw,pitch:0};panel.close();updateHUD();};tabs.append(b);}content.append(tabs);openPanel();}
function resetPosition(){state={...state,...toWorld(FEATURES.spawn),yaw:0,pitch:0};keys.clear();held.clear();updateHUD();notify('入口に戻りました。手に入れた鍵は、そのままです。');}
function showExit(){title('RETURN TO HALLOWEEN','名鑑へ戻りますか。');content.append(element('p','鍵と記事の記録は保存されています。住人とのミニ対戦は、次の訪問でリセットされます。'));const back=element('a','Halloweenの名鑑へ戻る','primary');back.href='../?mode=halloween';content.append(back);openPanel();}
function showExploreMenu(){
  title('EXPLORE AT YOUR PACE','探索メニュー');
  content.append(element('p','大きなステージで、ランタンを持って歩こう。矢印・WASDで移動、Eで調べる、Bで対戦。画面は自分が歩いた分だけ動き、回転や揺れはありません。'));
  const menu=element('div',undefined,'explore-menu');
  for(const [label,action]of[['記事一覧',()=>{showCatalog();panel.querySelector('.close').focus();}],['迷宮全体の地図',()=>{showMap();panel.querySelector('.close').focus();}],['明るさ・音楽',()=>{showLighting();panel.querySelector('.close').focus();}],['モンスターと遊ぶ',()=>{showEncounters();panel.querySelector('.close').focus();}],['迷宮の入口へ',()=>{panel.close();resetPosition();}],['演出の動きを切り替え',()=>{$('pause').click();}]]){const button=element('button',label);button.onclick=action;menu.append(button);}
  const back=element('a','Halloweenの名鑑へ戻る','primary');back.href='../?mode=halloween';menu.append(back);content.append(menu);openPanel();
}

function updateHUD(){
  $('wing').textContent='HORROR ANNEX · 名鑑とは別の部屋';
  $('place-title').textContent=state.x<18?'肖像の回廊':state.x>50?'鍵の間':state.z<24?'浮遊書庫':'灯りの交差廊';
  $('objective').textContent=state.unlocked?'封印が解けた。北の浮遊書庫へ進もう。':state.hasKey?'鍵を持って、北の格子扉へ。':'東の鍵の間で鍵を見つけ、奥の書庫をひらく。';
  $('key-state').textContent=state.unlocked?'✦ 書庫の扉を解錠':state.hasKey?'⚿ 書庫の鍵を入手':'◇ 鍵を探す';
  const n=nearby(state),copy={key:['台座に、金色の鍵が浮かんでいる。','鍵を手に取る'],gate:['奥へ続く、書庫の格子扉。',state.hasKey?'鍵で扉をひらく':'鍵のかかった扉'],article:['ホラー記事の展示場所。','ホラー記事を見る'],horror:['奥の肖像の回廊へ続く扉。','肖像の回廊へ'],'horror-art':['怪異画廊の展示場所。','怪異画廊の記事を見る'],vault:['本が漂う、封印の書庫。','書庫を調べる']}[n];
  $('object-label').textContent=copy?.[0]||'ランタンを持って、夜の回廊を歩こう。';
  const nearExit=Math.hypot(state.x-EXIT.x*CELL,state.z-EXIT.z*CELL)<3.2;
  $('interact').textContent=nearExit?'出口をひらく':copy?.[1]||'近づいて調べる';$('interact').disabled=!n&&!nearExit;
  const monster=encounters?nearestMonster(state,cleared):null;
  $('battle-open').hidden=!encounters;$('battle-open').disabled=!monster;
  $('battle-open').textContent=monster?`${monster.icon} ${monster.name}と対戦 [B]`:`🎃 住人を探す · ${cleared.length}/3`;
  $('creatures-open').textContent=encounters?`🎃 モンスター ${cleared.length}/3`:'🎃 モンスターと遊ぶ';
}
function showEncounters(){
  title('TRICK OR TREAT','迷宮の住人と、光のミニ対戦。');
  content.append(element('p','カボチャ・おばけ・コウモリは、この舞台だけの架空のモンスターです。参加者や投稿作品とは無関係です。対戦は任意で、鍵・記事・出口をふさぎません。'));
  const roster=element('div',undefined,'monster-roster');
  for(const m of MONSTERS){const card=element('div',undefined,'monster-card');card.append(element('span',m.icon,'monster-icon'),element('strong',m.name),element('small',`${m.hint}${cleared.includes(m.id)?' · クリア済み':''}`));roster.append(card);}
  content.append(roster,element('p','近づいて「対戦」を押すとスタート。光を当てる／守るを選ぶだけ。守ると次の光が2倍になります。いつでも逃げて探索に戻れます。'));
  const actions=element('div',undefined,'tabs');
  const enable=element('button',encounters?'モンスターをOFFにする':'モンスターをONにする','primary');
  enable.id='encounters-toggle';enable.onclick=()=>{encounters=!encounters;battle=null;panel.close();updateHUD();notify(encounters?'住人たちが待っています。入口の少し先にカボチャの番人。':'モンスターをOFFにしました。探索はそのまま続けられます。');};
  const visit=element('button','入口のカボチャに会う');visit.onclick=()=>{encounters=true;resetPosition();panel.close();updateHUD();notify('目の前のカボチャに近づき「対戦」を押してください。');};
  const reset=element('button','対戦だけリセット');reset.onclick=()=>{cleared=[];battle=null;showEncounters();$('encounters-toggle')?.focus();notify('住人との対戦をリセットしました。鍵と記事の記録はそのままです。');};
  actions.append(enable,visit,reset);content.append(actions,element('p','遭遇は再読み込みでOFFになります。対戦の記録は今回の訪問中だけ。','subtle'));openPanel();
}
function startBattle(){if(!encounters)return;const monster=nearestMonster(state,cleared);if(!monster)return;battle=newBattle(monster.id);renderBattle();openPanel();}
function renderBattle(){
  const m=MONSTERS.find(m=>m.id===battle.id);title('LANTERN DUEL · 時間制限なし',m.name);
  const portrait=element('div',m.icon,'duel-portrait');portrait.setAttribute('aria-hidden','true');content.append(portrait);
  const status=element('p',battle.message,'duel-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');content.append(status);
  const stats=element('div',undefined,'duel-stats');stats.append(element('span',`あなたの勇気 ${'♥'.repeat(battle.energy)}${'♡'.repeat(4-battle.energy)}`),element('span',`住人のいたずら ${battle.spirit}/3`));content.append(stats);
  const actions=element('div',undefined,'tabs');
  if(battle.status==='playing'){
    content.append(element('p',`次の相手の手：${intentFor(battle)}。${battle.charged?'次の光は2倍！':'守るといたずらを防ぎ、次の光が2倍。'}`));
    const shine=element('button',battle.charged?'光を当てる ×2 [1]':'光を当てる [1]','primary');shine.id='battle-shine';shine.onclick=()=>actBattle('shine');
    const guard=element('button','ランタンを守る [2]');guard.id='battle-guard';guard.onclick=()=>actBattle('guard');actions.append(shine,guard);
  }else{
    if(battle.status==='won'){if(!cleared.includes(m.id))cleared.push(m.id);content.append(element('p',`🍬 キャンディのしるし ${cleared.length}/3。鍵や記事の閲覧に影響しません。`));}
    const again=element('button','この対戦をやり直す');again.id='battle-retry';again.onclick=()=>{cleared=cleared.filter(id=>id!==m.id);battle=newBattle(m.id);renderBattle();$('battle-shine')?.focus();};actions.append(again);
  }
  const exit=element('button',battle.status==='playing'?'逃げて探索に戻る [Esc]':'探索に戻る','primary');exit.id='battle-exit';exit.onclick=()=>panel.close();actions.append(exit);content.append(actions);
}
function actBattle(action){if(!battle)return;battle=battleTurn(battle,action);renderBattle();$(battle.status==='playing'?(action==='guard'?'battle-guard':'battle-shine'):'battle-exit')?.focus();updateHUD();}
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
  if(encounters){c.textAlign='center';c.textBaseline='middle';c.font=`${Math.max(11,s*.75)}px sans-serif`;for(const m of MONSTERS){if(m.needsKey&&!state.unlocked)continue;c.globalAlpha=cleared.includes(m.id)?.5:1;c.fillText(cleared.includes(m.id)?'🍬':m.icon,(m.x+.5)*s,(m.z+.5)*s);}c.globalAlpha=1;}
  c.save();c.translate(px,pz);if(view!=='2d')c.rotate(-state.yaw);c.fillStyle='#fff2cb';c.strokeStyle='#1b1025';c.lineWidth=2;c.beginPath();c.moveTo(0,-s*.36);c.lineTo(-s*.27,s*.28);c.lineTo(s*.27,s*.28);c.closePath();c.fill();c.stroke();c.restore();
  if(large){c.font=`${Math.max(11,s*.33)}px sans-serif`;c.textAlign='center';c.fillStyle='#e8d7c2';c.fillText('西：肖像の回廊　 北：書庫　 東：鍵の間',s*8.5,s*16.4);}
  c.restore();
}
function resizeFlat(){stageRenderer?.invalidate();const c=$('fallback'),ratio=Math.min(devicePixelRatio||1,2);c.width=Math.max(1,Math.round(c.clientWidth*ratio));c.height=Math.max(1,Math.round(c.clientHeight*ratio));}
function updateViewUI(){
  document.body.dataset.view=view;$('world').hidden=view!=='3d';$('fallback').hidden=view!=='2d';
  $('view-2d').setAttribute('aria-pressed',String(view==='2d'));$('view-3d').setAttribute('aria-pressed',String(view==='3d'));
  $('look-hint').textContent=view==='2d'?'↑ 北へ · ← 西へ · → 東へ':'LOOK · 画面をドラッグ';
  $('controls-hint').textContent=view==='2d'?'WASD・矢印で移動 · Eで調べる · Bで対戦':'WASDで移動 · ドラッグで視点 · Eで調べる';
  if(view==='2d')resizeFlat();else world?.resize();
}
async function setView(next,{persist=true,quiet=false}={}){
  const request=++viewRequest;let failed=false;clearInput();view=next;state.pitch=0;updateViewUI();
  if(next==='3d'&&!world){
    $('view-3d').disabled=true;
    try{if(worldFailed)throw Error('WebGL unavailable');const {createWorld}=await import('./world.js');if(request!==viewRequest)return;world=createWorld({canvas:$('world')});restoreExhibits();}
    catch(e){if(request!==viewRequest)return;failed=true;worldFailed=true;view='2d';console.warn('3D unavailable; 2D remains fully playable.',e);if(!quiet)notify('3Dを利用できないため、2Dで探索できます。対戦と記事もそのまま使えます。');}
    finally{$('view-3d').disabled=false;}
  }
  if(request!==viewRequest)return;updateViewUI();
  if(persist)try{localStorage.setItem(viewKey,view);}catch{}
  if(!quiet&&!failed)notify(view==='2d'?'2Dに切り替えました。矢印キーで東西南北へ。':'3Dに切り替えました。位置・鍵・対戦の記録はそのままです。');
}
function restoreExhibits(){if(!catalog||!world)return;world.setExhibits(articles('horror').length?articles('horror').slice(0,1).map(a=>({title:a.title,subtitle:catalog.creators.find(c=>c.id===a.creatorId)?.name,image:a.image,position:FEATURES.article})):[{title:'ホラー記事を待つ額縁',subtitle:'記事未登録 · 舞台装飾',position:FEATURES.article}]);}
function step(dt){
  const f=(keys.has('w')||keys.has('arrowup')||held.has('forward')?1:0)-(keys.has('s')||keys.has('arrowdown')||held.has('back')?1:0);
  const r=(keys.has('d')||held.has('right')||(view==='2d'&&keys.has('arrowright'))?1:0)-(keys.has('a')||held.has('left')||(view==='2d'&&keys.has('arrowleft'))?1:0);
  if(view==='3d'){if(keys.has('arrowleft')||held.has('turn-left'))state.yaw+=dt*1.6;if(keys.has('arrowright')||held.has('turn-right'))state.yaw-=dt*1.6;}
  const {dx,dz}=movementVector(view,state.yaw,f,r,6.8*dt);state=move(state,dx,dz);
}
function tick(now){
  frame=0;if(document.hidden)return;const dt=Math.min((now-(last||now))/1000,.05);last=now;
  if(!panel.open){step(dt);if(motion)time+=dt;if(view==='3d')world?.render({...state,time:time*1000,motion:motion&&!reducedMotion.matches,brightness,lantern,encounters,cleared});else {stageRenderer??=createStageRenderer();stageRenderer.render({canvas:$('fallback'),state,brightness,lantern,encounters,cleared,pixelRatio:Math.min(devicePixelRatio||1,2)});}drawMap($('mini'));updateHUD();}
  frame=requestAnimationFrame(tick);
}
function start(){if(!frame&&gameReady){last=0;frame=requestAnimationFrame(tick);}}
window.addEventListener('resize',()=>{world?.resize();if(view==='2d')resizeFlat();});
$('world').addEventListener('pointerdown',e=>{if(panel.open||view!=='3d')return;look={id:e.pointerId,x:e.clientX,y:e.clientY};$('world').setPointerCapture(e.pointerId);});
$('world').addEventListener('pointermove',e=>{if(!look||look.id!==e.pointerId||view!=='3d')return;state.yaw-=(e.clientX-look.x)*.005;state.pitch=Math.max(-.6,Math.min(.6,state.pitch-(e.clientY-look.y)*.004));look={id:e.pointerId,x:e.clientX,y:e.clientY};});
for(const type of['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(type,()=>look=null);
for(const button of document.querySelectorAll('[data-move],#turn-left,#turn-right')){
  const name=button.dataset.move||button.id;button.addEventListener('pointerdown',e=>{if(panel.open)return;button.setPointerCapture(e.pointerId);held.add(name);button.classList.add('active');});
  for(const type of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{held.delete(name);button.classList.remove('active');});
  button.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();held.add(name);}});button.addEventListener('keyup',()=>held.delete(name));
}
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(panel.open){if(battle?.status==='playing'&&!e.repeat&&['1','2'].includes(k)){e.preventDefault();actBattle(k==='1'?'shine':'guard');}return;}
  if(!gameReady||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k);}
  if(e.repeat)return;if(k==='e')interact();if(k==='b')startBattle();if(k==='l')toggleLantern();if(k==='escape')resetPosition();
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;clearInput();}else start();});
$('tools-open').onclick=showLighting;$('lantern').onclick=toggleLantern;$('lantern').textContent=lantern?'ランタン ON':'ランタン OFF';$('lantern').setAttribute('aria-pressed',String(lantern));
$('interact').onclick=interact;$('list-open').onclick=()=>{if(catalog)showCatalog();};$('map-open').onclick=()=>{if(catalog)showMap();};$('home').onclick=resetPosition;
$('menu-open').onclick=showExploreMenu;$('creatures-open').onclick=showEncounters;$('battle-open').onclick=startBattle;
$('view-2d').onclick=()=>setView('2d');$('view-3d').onclick=()=>setView('3d');
function updateMotion(){const enabled=motion&&!reducedMotion.matches;$('pause').textContent=enabled?'演出停止':reducedMotion.matches?'動きを抑制中':'演出再開';$('pause').setAttribute('aria-pressed',String(!enabled));}
$('pause').onclick=()=>{if(reducedMotion.matches){notify('端末の「動きを減らす」設定を優先しています。2D表示も選べます。');return;}motion=!motion;updateMotion();};
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){motion=false;setView('2d',{persist:false});}updateMotion();});updateMotion();
panel.querySelector('.close').onclick=()=>panel.close();panel.addEventListener('close',()=>{battle=null;clearInput();returnFocus?.focus();last=0;});
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();worldFailed=true;world?.dispose();world=null;setView('2d',{persist:false});notify('3D描画が止まったため、同じ場所から2D表示で続けられます。');});
async function init(){
  try{const response=await fetch('./data/catalog.json');if(!response.ok)throw Error('catalog fetch failed');catalog=await response.json();if(catalog.schemaVersion!==2||!Array.isArray(catalog.creators)||!Array.isArray(catalog.articles))throw Error('invalid catalog');year=Math.max(...catalog.years);restore();await setView(view,{persist:false,quiet:true});gameReady=true;$('loading').hidden=true;start();}
  catch(e){$('loading').textContent='記事データを読み込めませんでした。';const back=element('a','Halloweenの名鑑へ戻る','primary');back.href='../?mode=halloween';const retry=element('button','再読み込み');retry.onclick=()=>location.reload();$('loading').append(back,retry);console.error(e);}
}
updateViewUI();init();

