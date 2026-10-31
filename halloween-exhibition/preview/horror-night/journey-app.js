import {canOfferBrowserBack} from './return-navigation.js?v=20261031-back-1';
import {VERSION,ARTICLE,SCENES,EMPHASIS,LINKS,sceneNumber,returnTarget,escapeHTML,linked,headingCode,emphasisCode} from './journey-data.js?v=20261031-compact-1';
import {COPY_VERSION,copyForNote,installCopyChecks} from './note-copy.js?v=20261031-copy-3';
const root=document.getElementById('app');
const sceneID=sceneNumber(location.search);
let engine=null,phase='loading',leaving=false,watchdog=0,remaining=0,loadTimer=0,returnTimer=0;
const browserBackHint=canOfferBrowserBack(typeof history==='undefined'?0:history.length);
const paragraph=(text,copy=false)=>`<p${text.startsWith('〔')?' class="insert-note"':''}>${EMPHASIS.has(text)?(copy?escapeHTML(emphasisCode(text)):'<strong>'+linked(text)+'</strong>'):linked(text)}</p>`;
const sceneParagraphs=s=>s.paragraphs.map(p=>paragraph(p)+(s.image&&p===s.image.after?`<figure class="scene-illustration"><div class="illustration-crop"><img src="${escapeHTML(s.image.src)}" alt="${escapeHTML(s.image.alt)}" width="${s.image.width||1080}" height="${s.image.height||1249}" decoding="async"></div><figcaption class="image-fallback" hidden>挿絵を読み込めませんでした。本文はこのまま読めます。</figcaption></figure>`:'')).join('');
const sceneLink=n=>new URL(`./?scene=${n}&v=${VERSION}`,location.href).href;
function articleHTML(copy=false){
 return ARTICLE.map((section,i)=>{
  const [marker,subtitle]=section.title.split("｜");
  const heading=copy?`${subtitle?"<h2>"+escapeHTML(marker)+"</h2>":""}<p>${escapeHTML(headingCode(subtitle||marker))}</p>`:`<h2 tabindex="-1">${escapeHTML(section.title)}</h2>`;
  let html=`<section id="${section.id}" class="article-section">${heading}${section.paragraphs.map(p=>paragraph(p,copy)).join('')}`;
  if(i<3){const s=SCENES[i];html+=`<div class="portal" id="before-${s.id}"><a class="portal-link" style="text-decoration:underline" href="${sceneLink(s.id)}">🚪 ゲーム${s.roman}へ――${s.title}</a><p class="route-help">この場面の本文はゲーム内で読みます。終わったら「続き${s.roman}」へ戻ります。</p></div>`;
   if(!copy)html+=`<details class="text-alternative"><summary>ゲームを開かず、この場面を読む</summary>${s.paragraphs.map(p=>paragraph(p)).join('')}${s.insert?paragraph(s.insert):''}<a href="#${s.after}">記事の続き${s.roman}へ</a></details>`;
  }
  return html+'</section>';
 }).join('');
}
function jumpToFragment(){const raw=location.hash.slice(1);if(!/^(start|after-[123]|before-[123])$/.test(raw))return;const el=document.getElementById(raw);if(!el)return;document.querySelectorAll('details').forEach(d=>d.open=false);requestAnimationFrame(()=>{el.scrollIntoView({block:'start',behavior:'instant'});(el.querySelector('h2')||el).focus?.({preventScroll:true});});}
async function copyArticle(){
 await copyForNote({sourceHTML:articleHTML(true),button:document.getElementById('copy-article'),status:document.getElementById('copy-status'),source:document.getElementById('copy-source')});
}
function renderArticle(){
 document.body.classList.add('reading-page');
 root.innerHTML=`<div class="article-tools"><p>無名S note / Halloween Atelier</p><button id="copy-article" type="button">note用本文をコピー（リンク・段落付き）</button><p id="copy-status" class="small" role="status">本文・名前リンク・段落をまとめてコピーします。「続きⅠ〜Ⅲ」は通常の見出し、装飾箇所はnote用数式コードです。コピー修正版 ${COPY_VERSION}</p></div><article class="reading">${articleHTML()}</article><div id="copy-source" class="reading" hidden></div><footer class="reading small">CNA運営さんのリンク先はプロフィールです。ほかの名前は登録参加記事へリンクしています。<br>各ゲームは一場面のみ。記事の続きへ戻るまで次のゲームは始まりません。<br>noteへの戻り先は、公開記事にある「続きⅠ〜Ⅲ」の実際の見出しリンクを確認して設定する必要があります。未設定時に専用本文ページをnoteの戻り先として表示することはありません。</footer>`;
 document.getElementById('copy-article').onclick=copyArticle;
 installCopyChecks({getHTML:()=>articleHTML(true),tools:document.querySelector('.article-tools'),source:document.getElementById('copy-source')});
 window.addEventListener('hashchange',jumpToFragment);jumpToFragment();
}
function updateReturnAction(){
 const action=document.getElementById('primary-action'),destination=returnTarget(sceneID,location.search);
 const canBack=browserBackHint;
 action.disabled=false;
 action.textContent=canBack?'前の画面へ戻る':destination?'noteの記事へ戻る →':'このゲームを閉じる';
}
function resetReturnAttempt(message){
 clearTimeout(returnTimer);returnTimer=0;leaving=false;phase='reading';
 updateReturnAction();document.getElementById('status').textContent=message;
}
function leavePassage(destination){
 if(leaving)return;
 if(browserBackHint){
  phase='leaving';leaving=true;engine?.pause();document.getElementById('primary-action').disabled=true;
  returnTimer=setTimeout(()=>resetReturnAttempt(destination?'このタブでは戻れませんでした。元のnoteタブを開くか、設定済みの記事リンクを選んでください。':'このタブでは戻れませんでした。タブ一覧から元のnoteタブを開いてください。'),1800);
  try{history.back();}catch{resetReturnAttempt('ブラウザーの戻るを実行できませんでした。元のnoteタブを開いてください。');}
  return;
 }
 if(destination){
  phase='leaving';leaving=true;engine?.pause();document.getElementById('primary-action').disabled=true;
  returnTimer=setTimeout(()=>resetReturnAttempt('記事を開けませんでした。設定済みの記事リンクを選ぶか、元のnoteタブを開いてください。'),1800);
  try{location.assign(destination);}catch{resetReturnAttempt('記事を開けませんでした。元のnoteタブを開いてください。');}
  return;
 }
 phase='leaving';leaving=true;engine?.pause();document.getElementById('primary-action').disabled=true;
 returnTimer=setTimeout(()=>resetReturnAttempt('自動では閉じられませんでした。ブラウザーのタブ一覧でこのゲームを閉じ、元の記事タブを選んでください。'),1800);
 try{window.close();}catch{resetReturnAttempt('このタブを閉じられませんでした。ブラウザーのタブ一覧で元の記事タブを選んでください。');}
}
function stopWatch(){clearTimeout(watchdog);watchdog=0;}
function startWatch(){stopWatch();watchdog=setTimeout(()=>showPassage('移動表示を続けられないため、この場面の本文を表示します。'),40000);}
function showPassage(message=''){
 if(phase==='reading'||phase==='leaving')return;phase='reading';stopWatch();clearTimeout(loadTimer);engine?.pause();
 const s=SCENES[sceneID-1];document.body.classList.add('passage-open');document.body.classList.remove('game-moving');
 document.getElementById('status').textContent=message||'到着しました。この場面の本文を読み、記事の続きへ戻ってください。';
 const box=document.getElementById('scene-passage');box.hidden=false;box.innerHTML=`<h2 tabindex="-1">${s.title}</h2>${sceneParagraphs(s)}${s.insert?paragraph(s.insert):''}`;
 engine?.resize?.();engine?.revealCast?.();
 box.querySelectorAll('img').forEach(img=>{img.addEventListener('error',()=>{img.closest('figure').querySelector('.image-fallback').hidden=false;});});
 updateReturnAction();
 document.getElementById('early-return').hidden=true;document.getElementById('read-now').hidden=true;
 box.scrollIntoView({block:'start',behavior:'instant'});box.querySelector('h2').focus({preventScroll:true});
}
async function loadTown(){
 loadTimer=setTimeout(()=>{if(phase!=='loading'||leaving)return;phase='fallback';const b=document.getElementById('primary-action');b.disabled=false;b.textContent='この場面の本文を読む';document.getElementById('status').textContent='街の読み込みが完了していません。本文は読めます。';},30000);
 try{const {createStoryTown}=await import('./town.js?v=20261031-performance-1');if(leaving)return;
  engine=await createStoryTown({canvas3d:document.getElementById('scene3d'),canvas2d:document.getElementById('scene2d'),root:document.getElementById('world'),view:'2d',muted:true,
   onCastStatus:info=>{const el=document.getElementById('cast-status'),pending=document.getElementById('cast-pending');if(el)el.textContent=info.ready===info.total?'参加者 '+info.total+'/'+info.total:`参加者 ${info.ready}/${info.total}${info.failed?'・一部失敗':''}`;if(pending)pending.textContent=info.pendingNames?.length?'未表示：'+info.pendingNames.join('、'):'全員の姿を表示できます。';},
   onNear:near=>{if(near&&phase==='moving')queueMicrotask(()=>showPassage());},
   onProgress:d=>{remaining=d;if(phase==='moving')document.getElementById('status').textContent=`移動中 · あと${Math.ceil(d)}歩分`;},
   onNotice:message=>{if(/見つかりません|見つけられません|表示を続けられません/.test(message)&&phase==='moving')showPassage('移動表示を続けられないため、この場面の本文を表示します。');}
  });
  if(leaving||phase!=='loading'){engine.destroy();return;}await engine.enter(sceneID-1,null);if(leaving||phase!=='loading'){engine.destroy();return;}clearTimeout(loadTimer);
  phase='ready';const action=document.getElementById('primary-action');action.disabled=false;action.textContent=SCENES[sceneID-1].button;document.getElementById('status').textContent='ボタンで自動移動します。';
 }catch(error){clearTimeout(loadTimer);console.error('Halloween scene load:',error);if(leaving||phase!=='loading')return;engine?.destroy();engine=null;phase='fallback';const action=document.getElementById('primary-action');action.disabled=false;action.textContent='この場面の本文を読む';document.getElementById('status').textContent='街の読み込みに失敗しました。本文は読めます。';}
}
function renderGame(){
 const s=SCENES[sceneID-1],destination=returnTarget(sceneID,location.search);
 root.innerHTML=`<section class="game"><header class="game-header"><p>ゲーム${s.roman} / 3 · 音なし</p><h1>${s.title}</h1><span id="early-return" hidden></span></header><div id="world" class="world"><canvas id="scene2d" aria-label="通常の見下ろし視点で自動移動する街"></canvas><canvas id="scene3d" hidden aria-hidden="true"></canvas><div class="scene-shade" aria-hidden="true"></div></div><p id="status" class="status" role="status" aria-live="polite">街を開いています…</p><article id="scene-passage" class="reading scene-passage" hidden></article><div class="action-dock"><div class="action-row"><button id="primary-action" type="button" disabled>準備中…</button><button id="read-now" type="button">先にこの場面を読む</button></div><div class="game-options"><details class="return-help"><summary>戻り方</summary><p>${browserBackHint?'読み終えたら「前の画面へ戻る」。ブラウザーの戻ると同じ操作です。前の画面がnote以外の場合もあります。読み位置の復元はブラウザーによります。':destination?'読み終えたら「noteの記事へ戻る」で、続き'+s.roman+'をお読みください。':'読み終えたら「このゲームを閉じる」。閉じられない場合はブラウザーのタブ一覧で閉じ、元のnoteタブの「続き'+s.roman+'」へ進んでください。'}</p>${destination?`<a href="${escapeHTML(destination)}">設定済みのnote記事リンクを開く</a>`:''}</details><details class="cast-details"><summary id="cast-status" role="status">参加者 読込中</summary><p id="cast-pending"></p></details></div></div></section>`;
 document.body.classList.add('game-page');
 document.getElementById('read-now').onclick=()=>showPassage('この場面の本文を表示しています。街の読み込みを待つ必要はありません。');
 document.getElementById('primary-action').onclick=()=>{
  if(phase==='reading'){leavePassage(destination);return;}
  if(phase==='fallback'){showPassage('街の代わりに、この場面の本文を表示しています。');return;}
  if(phase!=='ready')return;phase='moving';document.body.classList.add('game-moving');document.getElementById('primary-action').disabled=true;document.getElementById('primary-action').textContent='自動で移動中…';
  if(!engine?.toggleAuto()){showPassage();return;}startWatch();
 };
 void loadTown();
 window.addEventListener('resize',()=>{engine?.resize?.();if(phase==='reading')engine?.revealCast?.();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopWatch();engine?.pause();}else if(phase==='moving'){engine?.resume();if(!engine?.toggleAuto())showPassage();else startWatch();}else if(phase==='ready')engine?.resume();});
 window.addEventListener('pagehide',()=>{clearTimeout(returnTimer);returnTimer=0;stopWatch();engine?.pause();});
 window.addEventListener('popstate',()=>{if(leaving&&returnTimer)resetReturnAttempt('このページ内の履歴へ戻りました。元のnoteタブを開くか、記事リンクを選んでください。');});
 window.addEventListener('pageshow',event=>{if(event.persisted){clearTimeout(returnTimer);returnTimer=0;leaving=false;if(phase==='leaving')phase='reading';if(phase==='reading')updateReturnAction();if(phase==='ready')engine?.resume();if(phase==='moving'){engine?.resume();if(!engine?.toggleAuto())showPassage();else startWatch();}}});
}
window.__HALLOWEEN_READING_NIGHT__={version:VERSION,copyVersion:COPY_VERSION,snapshot:()=>({scene:sceneID,phase,view:'2d',camera:'normal',returnTo:sceneID?returnTarget(sceneID,location.search):null})};
if(sceneID)renderGame();else renderArticle();

