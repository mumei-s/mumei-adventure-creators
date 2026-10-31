import {VERSION,ARTICLE,SCENES,EMPHASIS,LINKS,sceneNumber,returnTarget,escapeHTML,linked,headingCode,emphasisCode} from './journey-data.js?v=20261031-return-3';
import {COPY_VERSION,copyForNote,installCopyChecks} from './note-copy.js?v=20261031-copy-3';
const root=document.getElementById('app');
const sceneID=sceneNumber(location.search);
let engine=null,phase='loading',leaving=false,watchdog=0,remaining=0,loadTimer=0;
const paragraph=(text,copy=false)=>`<p${text.startsWith('〔')?' class="insert-note"':''}>${EMPHASIS.has(text)?(copy?escapeHTML(emphasisCode(text)):'<strong>'+linked(text)+'</strong>'):linked(text)}</p>`;
const sceneParagraphs=s=>s.paragraphs.map(p=>paragraph(p)+(s.image&&p===s.image.after?`<figure class="scene-illustration"><div class="illustration-crop"><img src="${escapeHTML(s.image.src)}" alt="${escapeHTML(s.image.alt)}" width="1080" height="1249" decoding="async"></div><figcaption class="image-fallback" hidden>挿絵を読み込めませんでした。本文はこのまま読めます。</figcaption></figure>`:'')).join('');
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
function stopWatch(){clearTimeout(watchdog);watchdog=0;}
function startWatch(){stopWatch();watchdog=setTimeout(()=>showPassage('移動表示を続けられないため、この場面の本文を表示します。'),40000);}
function showPassage(message=''){
 if(phase==='reading'||phase==='leaving')return;phase='reading';stopWatch();engine?.pause();
 const s=SCENES[sceneID-1];document.body.classList.add('passage-open');
 document.getElementById('status').textContent=message||'到着しました。この場面の本文を読み、記事の続きへ戻ってください。';
 const box=document.getElementById('scene-passage');box.hidden=false;box.innerHTML=`<h2 tabindex="-1">${s.title}</h2>${sceneParagraphs(s)}${s.insert?paragraph(s.insert):''}`;
 engine?.revealCast?.();
 box.querySelectorAll('img').forEach(img=>{img.addEventListener('error',()=>{img.closest('figure').querySelector('.image-fallback').hidden=false;});});
 const action=document.getElementById('primary-action');const destination=returnTarget(sceneID,location.search);action.disabled=!destination;action.textContent=destination?'noteの記事へ戻る →':'元のnoteタブで続き'+s.roman+'を読んでください';
 document.getElementById('early-return').hidden=true;
 box.scrollIntoView({block:'start',behavior:'instant'});box.querySelector('h2').focus({preventScroll:true});
}
async function loadTown(){
 loadTimer=setTimeout(()=>{if(phase!=='loading'||leaving)return;phase='fallback';const b=document.getElementById('primary-action');b.disabled=false;b.textContent='この場面の本文を読む';document.getElementById('status').textContent='街の読み込みが完了していません。本文は読めます。';},30000);
 try{const {createStoryTown}=await import('./town.js?v=20261031-cast-1');if(leaving)return;
  engine=await createStoryTown({canvas3d:document.getElementById('scene3d'),canvas2d:document.getElementById('scene2d'),root:document.getElementById('world'),view:'2d',muted:true,
   onNear:near=>{if(near&&phase==='moving')queueMicrotask(()=>showPassage());},
   onProgress:d=>{remaining=d;if(phase==='moving')document.getElementById('status').textContent=`自動で進んでいます… 目的地まで${Math.ceil(d)}歩分`;},
   onNotice:message=>{if(/見つかりません|見つけられません|表示を続けられません/.test(message)&&phase==='moving')showPassage('移動表示を続けられないため、この場面の本文を表示します。');}
  });
  clearTimeout(loadTimer);if(leaving||phase!=='loading'){engine.destroy();return;}await engine.enter(sceneID-1,null);if(leaving)return;
  phase='ready';const action=document.getElementById('primary-action');action.disabled=false;action.textContent=SCENES[sceneID-1].button;document.getElementById('status').textContent='見下ろし視点・自動移動。下のボタンで進みます。';
 }catch(error){clearTimeout(loadTimer);console.error('Halloween scene load:',error);if(leaving||phase!=='loading')return;engine?.destroy();engine=null;phase='fallback';const action=document.getElementById('primary-action');action.disabled=false;action.textContent='この場面の本文を読む';document.getElementById('status').textContent='街の読み込みに失敗しました。本文は読めます。';}
}
function renderGame(){
 const s=SCENES[sceneID-1],destination=returnTarget(sceneID,location.search);
 root.innerHTML=`<section class="game"><header class="game-header"><p>HALLOWEEN ATELIER · ゲーム${s.roman} / 3</p><h1>${s.title}</h1>${destination?`<a id="early-return" href="${escapeHTML(destination)}">← noteの記事へ戻る</a>`:'<span id="early-return" class="small">noteの戻り先は未設定です。元のnoteタブを開いてください。</span>'}</header><div id="world" class="world"><canvas id="scene2d" aria-label="通常の見下ろし視点で自動移動する街"></canvas><canvas id="scene3d" hidden aria-hidden="true"></canvas><div class="scene-shade" aria-hidden="true"></div></div><p id="status" class="status" role="status" aria-live="polite">街を開いています…</p><article id="scene-passage" class="reading scene-passage" hidden></article><div class="action-dock"><button id="primary-action" type="button" disabled>準備中…</button><p class="small">${destination?'戻り先：noteの記事（続き'+s.roman+'をお読みください）':'この記事は未公開のため戻り先は未設定です。ゲームを閉じて元のnoteタブの「続き'+s.roman+'」へ進んでください。'} · 音なし</p></div></section>`;
 document.body.classList.add('game-page');
 document.getElementById('primary-action').onclick=()=>{
  if(phase==='reading'){if(!destination)return;phase='leaving';leaving=true;engine?.pause();location.assign(destination);return;}
  if(phase==='fallback'){showPassage('街の代わりに、この場面の本文を表示しています。');return;}
  if(phase!=='ready')return;phase='moving';document.getElementById('primary-action').disabled=true;document.getElementById('primary-action').textContent='自動で移動中…';
  if(!engine?.toggleAuto()){showPassage();return;}startWatch();
 };
 void loadTown();
 window.addEventListener('resize',()=>engine?.resize());
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopWatch();engine?.pause();}else if(phase==='moving'){engine?.resume();if(!engine?.toggleAuto())showPassage();else startWatch();}else if(phase==='ready')engine?.resume();});
 window.addEventListener('pagehide',()=>{stopWatch();engine?.pause();});
 window.addEventListener('pageshow',event=>{if(event.persisted){leaving=false;if(phase==='leaving')phase='reading';if(phase==='ready')engine?.resume();if(phase==='moving'){engine?.resume();if(!engine?.toggleAuto())showPassage();else startWatch();}}});
}
window.__HALLOWEEN_READING_NIGHT__={version:VERSION,copyVersion:COPY_VERSION,snapshot:()=>({scene:sceneID,phase,view:'2d',camera:'normal',returnTo:sceneID?returnTarget(sceneID,location.search):null})};
if(sceneID)renderGame();else renderArticle();

