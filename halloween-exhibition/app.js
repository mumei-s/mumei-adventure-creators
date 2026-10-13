import { validateArchive, safeURL, normalizeSearch } from './data-model.js';
const $ = (id) => document.getElementById(id);
const themes = { moon:'☾', forest:'♧', star:'✦', ghost:'♧', pumpkin:'✧', violet:'♫' };
let archive, demo, currentYear, activeTag = '', query = '', preview = false, timer, returnFocus;
let progress = { stamps: {}, stars: {} }; let storageOK = true;
try { const saved = JSON.parse(localStorage.getItem('halloween-yearbook:night-doors:v1') || '{}'); if (saved && typeof saved.stamps === 'object' && saved.stamps && !Array.isArray(saved.stamps) && typeof saved.stars === 'object' && saved.stars && !Array.isArray(saved.stars)) progress = saved; } catch { storageOK = false; }
function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function notify(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(timer); timer = setTimeout(() => $('toast').classList.remove('visible'), 3800); }
function persist() { try { localStorage.setItem('halloween-yearbook:night-doors:v1', JSON.stringify(progress)); } catch { storageOK = false; } }
function key() { return `${preview ? 'demo':'archive'}:${currentYear}`; }
function stamps() { const list = progress.stamps[key()]; return Array.isArray(list) ? list : []; }
function data() { return preview ? demo : archive; }
function yearData() { return data().years.find(y => y.year === currentYear); }
function creator(id) { return data().creators.find(c => c.id === id); }
function visibleEntries() { return yearData().entries.filter(entry => (!activeTag || (entry.tags || []).includes(activeTag)) && (!query || normalizeSearch([creator(entry.creatorId).name, entry.title || '', ...(entry.tags || []), ...(entry.works || []).map(w => w.title)].join(' ')).includes(query))); }
function art(entry) { const box = node('div', undefined, 'card-art'); box.dataset.theme = themes[entry.theme] ? entry.theme : 'moon'; const door = node('div',undefined,'mini-portal'); door.setAttribute('aria-hidden','true'); door.append(node('span',themes[entry.theme] || '☾')); box.append(door); const url = safeURL(entry.image, { image:true }); if (url) { const img = document.createElement('img'); img.alt = entry.imageAlt || entry.title || '展示画像'; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.addEventListener('error',() => img.remove(),{once:true}); img.src=url; box.append(img); } return box; }
function entryLabel(entry, c, compact=false) { if(preview || c.provisional) return compact ? 'FICTIONAL SAMPLE · 仮の参加者' : '仮の参加者 / 展示サンプル'; if(entry.role === 'host') return compact ? 'HOST · 主催者の記事' : '企画紹介 / 主催者の記事'; return compact ? 'PARTICIPANT · 参加者' : '参加者の展示'; }
function openDetail(entry) {
  const trigger=document.activeElement; returnFocus = trigger?.classList.contains('card') ? {creatorId:entry.creatorId} : {element:trigger};
  const c = creator(entry.creatorId); if (!stamps().includes(c.id)) { progress.stamps[key()] = [...stamps(),c.id]; persist(); }
  const content = $('detail-content'); content.replaceChildren(art(entry)); content.append(node('p', `${currentYear} · ${entryLabel(entry,c)}`, 'eyebrow'));
  const title = node('h2',entry.title || c.name); title.id='detail-title'; content.append(title,node('p', c.name,'detail-name'));
  if (c.bio) content.append(node('p',c.bio)); if (entry.message) content.append(node('p',entry.message));
  for (const item of [...(entry.works || []),...(entry.links || [])]) { const url = safeURL(item.url); if (!url) continue; const a = node('a',`${item.title} ↗`,'work'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; a.append(node('span','（新しいタブ）','link-hint')); content.append(a); }
  content.append(node('p',storageOK ? '訪問のしるしを、旅のしおりに残しました。' : '保存できないため、訪問記録はこの画面を開いている間だけ残ります。','privacy'));
  renderCards(); $('detail').showModal();
}
function renderCards() {
  const grid = $('card-grid'); grid.replaceChildren(); const entries = visibleEntries();
  $('random').disabled = !entries.length;
  $('entry-count').textContent = yearData().entries.length ? `${yearData().entries.length} の扉` : '名簿準備中';
  $('results-status').textContent = yearData().entries.length ? `${entries.length} / ${yearData().entries.length} 件${preview ? ' · すべて表示確認用のサンプルです' : ''}` : '';
  $('stamp-count').textContent = String(stamps().filter(id => yearData().entries.some(e => e.creatorId === id)).length);
  if (!yearData().entries.length) {
    for (let i=0; i<3; i++) { const card = node('div',undefined,'card placeholder'); card.append(art({theme:['moon','forest','star'][i]})); const body=node('div',undefined,'card-body'); body.append(node('p',`DOOR 0${i+1} · COMING SOON`,'card-meta'),node('h3','まだ見ぬ物語へ'),node('p','参加者の登録を待っています。')); card.append(body); grid.append(card); } return;
  }
  if (!entries.length) { const empty=node('p','ぴったりの扉が見つかりませんでした。検索やタグを変えてみてください。','empty-results'); grid.append(empty); }
  entries.forEach(entry => { const c=creator(entry.creatorId), card=node('button',undefined,'card'); card.type='button'; card.dataset.creatorId=c.id; card.setAttribute('aria-label',`${c.name}：${entry.title || '展示'}の詳細をひらく`); card.append(art(entry)); const body=node('div',undefined,'card-body'); const meta=node('div',undefined,'card-meta'); meta.append(node('span',entryLabel(entry,c,true)),node('span',stamps().includes(c.id) ? '訪問済 ✧' : String(currentYear))); body.append(meta,node('h3',entry.title || c.name)); const name=node('p',undefined,'card-name'); name.append(node('span',c.name),node('span','↗')); body.append(name); card.append(body); card.addEventListener('click',() => openDetail(entry)); grid.append(card); });
}
function renderTags() { const area=$('tag-list'); area.replaceChildren(); const tags=['',...new Set(yearData().entries.flatMap(e => e.tags || []))]; for (const tag of tags) { const button=node('button',tag || 'すべて','tag'); button.setAttribute('aria-pressed',String(tag === activeTag)); button.addEventListener('click',() => {activeTag=tag;for(const item of area.querySelectorAll('button'))item.setAttribute('aria-pressed',String(item===button));renderCards();}); area.append(button); } }
function renderYear() { const year=yearData(); $('hero-year').textContent=String(currentYear); $('year-description').textContent=year.description; const title=document.querySelector('h1'); title.replaceChildren(); const split=year.title.indexOf('、'); if (split !== -1) { title.append(document.createTextNode(year.title.slice(0,split+1)),document.createElement('br'),node('em',year.title.slice(split+1))); } else title.textContent=year.title; renderTags(); renderCards(); }
function populateYears() { const select=$('year-select'); select.replaceChildren(); for(const year of [...data().years].sort((a,b) => b.year-a.year)) { const option=node('option',String(year.year)); option.value=year.year; select.append(option); } if (!data().years.some(y => y.year===currentYear)) currentYear=Math.max(...data().years.map(y => y.year)); select.value=String(currentYear); }
function notice() {
  const entries=yearData().entries; const isEmpty=!entries.length; const fictional=entries.filter(e=>creator(e.creatorId).provisional).length;
  $('data-notice').hidden=!isEmpty && !preview && !fictional;
  const strong=$('data-notice').querySelector('strong'), p=$('data-notice').querySelector('p');
  strong.textContent=preview ? '体験用サンプルを表示しています。' : isEmpty ? 'みんなの物語を迎える準備中。' : `${entries.length}人分の仮展示です。`;
  p.textContent=preview ? 'すべて架空の表示例です。実際の参加者・作品ではありません。' : isEmpty ? '参加者名簿はまだ登録されていません。サンプルで扉をひらく体験ができます。' : `確認済みの紹介 ${entries.length-fictional}件 + ${fictional}人の架空サンプル。実際の参加者名簿ではありません。`;
  $('preview-toggle').hidden=!isEmpty&&!preview; $('preview-toggle').textContent=preview ? '年鑑に戻る ↗':'サンプルを見る ↗'; $('preview-toggle').setAttribute('aria-pressed',String(preview));
}
function showPassport() { const content=$('passport-content'); content.replaceChildren(node('p',`${currentYear}年 · ${stamps().filter(id => yearData().entries.some(e => e.creatorId === id)).length} / ${yearData().entries.length} の扉を訪問`)); const row=node('div',undefined,'passport-stamps'); for (const id of stamps()) { const c=creator(id); if(c && yearData().entries.some(e=>e.creatorId===id)) row.append(node('div',`✧\n${c.name}`,'stamp')); } content.append(row); content.append(node('p',progress.stars[key()] ? '✦ 小さな星を見つけました。' : 'どこかで、小さな星が光っているかも。')); if(!storageOK) content.append(node('p','このブラウザでは保存できません。記録は現在の画面内だけに残ります。')); $('passport').showModal(); }
async function load() { $('load-error').hidden=true; for(const id of ['random','year-select','preview-toggle']) $(id).disabled=true; try { const results=await Promise.all(['archive','demo'].map(async name => {const response=await fetch(`./data/${name}.json`); if(!response.ok) throw Error('load'); return validateArchive(await response.json());})); [archive,demo]=results; populateYears(); renderYear(); notice(); $('year-select').disabled=false; $('preview-toggle').disabled=false; } catch(error) { $('load-error').hidden=false; $('results-status').textContent='データを読み込めませんでした。'; $('random').disabled=true; } }
$('search').addEventListener('input',e => {query=normalizeSearch(e.target.value);if(archive)renderCards();});
$('year-select').addEventListener('change',e => {if(!archive)return;currentYear=Number(e.target.value);activeTag='';renderYear();notice();});
$('preview-toggle').addEventListener('click',() => {if(!archive)return;preview=!preview;activeTag='';query='';$('search').value='';populateYears();renderYear();notice();});
$('random').addEventListener('click',() => {if(!archive)return;const entries=visibleEntries();if(entries.length)openDetail(entries[Math.floor(Math.random()*entries.length)]);});
$('passport-open').addEventListener('click',() => {if(archive)showPassport();});
$('reset-progress').addEventListener('click',() => {delete progress.stamps[key()];delete progress.stars[key()];persist();$('passport').close();renderCards();notify('この年の旅のしおりをリセットしました。');});
$('moon-secret').addEventListener('click',() => {if(!archive)return; progress.stars[key()]=true;persist();notify('✦ 小さな星を発見！旅のしおりにしまいました。');});
for(const dialog of document.querySelectorAll('dialog')) {dialog.querySelector('.close').addEventListener('click',()=>dialog.close()); dialog.addEventListener('click',event=> { if(event.target === dialog) {const rect=dialog.getBoundingClientRect(); if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});}
$('detail').addEventListener('close',()=>{ const target=returnFocus?.creatorId ? [...document.querySelectorAll('.card')].find(card=>card.dataset.creatorId===returnFocus.creatorId) : returnFocus?.element; target?.focus(); });
$('retry').addEventListener('click',load);load();
