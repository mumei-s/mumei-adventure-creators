(() => {
  'use strict';

  const SUPABASE_URL = 'https://xxhaerjvrgmnadxjqetz.supabase.co';
  const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const TOKEN_KEY = 'mumei-owner-token';
  const app = document.querySelector('#app');
  const toastNode = document.querySelector('#toast');
  const series = () => new URLSearchParams(location.search).get('series') === 'sengoku' ? 'sengoku' : 'adventure';
  const headers = { apikey: API_KEY, Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };
  let token = sessionStorage.getItem(TOKEN_KEY) || '';
  let snapshot = null;
  let leaderboard = [];
  let tab = 'overview';
  let busy = false;

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = value => { try { return new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); } catch { return ''; } };
  const storageUrl = path => !path ? '' : (/^https?:/.test(path) ? path : `${SUPABASE_URL}/storage/v1/object/public/creator-images/${path}`);
  const label = c => c.display_name || c.note_id || '名称未設定';
  const toast = message => {
    if (!toastNode) return alert(message);
    toastNode.textContent = message;
    toastNode.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastNode.classList.remove('show'), 2800);
  };

  async function rpc(name, body = {}) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store'
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(data?.message || data?.error || String(data || response.statusText));
    return data;
  }

  async function refresh() {
    snapshot = await rpc('admin_snapshot', { p_owner_token: token, p_series: series() });
    leaderboard = await rpc('get_leaderboard', { p_series: series(), p_period: 'week' });
    sessionStorage.setItem(TOKEN_KEY, token);
    renderDashboard();
  }

  function setBusy(value) {
    busy = value;
    document.querySelector('.owner-live')?.classList.toggle('owner-busy', value);
  }

  function seriesUrl(target) {
    const u = new URL(location.href);
    u.searchParams.set('series', target);
    u.searchParams.set('v', 'admin13');
    u.hash = 'admin';
    return u.href;
  }

  function renderLogin(message = '') {
    document.querySelector('link[data-owner-live]')?.remove();
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = './admin-live.css?v=admin13'; css.dataset.ownerLive = '1';
    document.head.appendChild(css);
    app.innerHTML = `<section class="owner-live"><div class="panel owner-login"><p class="eyebrow">OWNER CONTROL</p><h1>オーナー管理</h1><p class="lead">管理画面専用ログインです。一般ページへ戻されることはありません。</p>${message?`<p class="owner-login-error">${esc(message)}</p>`:''}<form id="ownerLogin"><label class="form-label"><span>オーナーキー</span><input class="field" type="password" name="token" autocomplete="current-password" required autofocus></label><div class="actions"><button class="primary" type="submit">管理画面を開く</button><a class="btn" href="./?v=admin13">一般ページへ戻る</a></div></form></div></section>`;
  }

  function statusBadge(c) {
    const text = c.status === 'approved' ? '公開中' : c.status === 'revision' ? '修正待ち' : c.status === 'unpublished' ? '公開停止' : '確認待ち';
    return `<span class="badge ${c.status === 'approved' ? 'verified' : 'pending'}">${text}</span>`;
  }

  function tabsHtml() {
    const pending = Number(snapshot.metrics?.pending || 0);
    const articlePending = Number(snapshot.metrics?.article_pending || 0);
    const tabs = [
      ['overview','概要',''],['applications','参加申請',pending],['articles','記事認証',articlePending],
      ['participants','公開者',''],['opponents','見本カード',''],['settings','サイト設定',''],['logs','履歴','']
    ];
    return `<nav class="owner-tabs">${tabs.map(([k,n,count])=>`<button type="button" class="${tab===k?'active':''}" data-owner-tab="${k}">${n}${count!==''?` ${count}`:''}</button>`).join('')}</nav>`;
  }

  function overviewHtml() {
    const ranks = Array.isArray(leaderboard) ? leaderboard : [];
    return `<div class="grid"><section class="panel"><h3>今週のランキング</h3><div class="owner-rank">${ranks.slice(0,10).map((r,i)=>`<div class="owner-rank-row"><span class="place">${i+1}</span><div><b>${esc(r.display_name || r.note_id)}</b><small>@${esc(r.note_id)} · ${Number(r.battles||0)}戦</small></div><strong>${Number(r.wins||0)}勝</strong></div>`).join('')||'<div class="empty">まだランキング記録がありません。</div>'}</div></section><section class="panel"><h3>オーナー運用</h3><div class="owner-note">この画面はSupabase共有DBへ直接接続しています。端末内プレビューではありません。</div><p class="lead">参加申請の承認、参加記事認証、公開者編集、見本カード3枚、戦国版ON/OFF、サイト設定をここで行えます。</p></section></div>`;
  }

  function applicationsHtml() {
    const rows = (snapshot.creators || []).filter(c => ['pending','revision'].includes(c.status));
    return `<section class="panel"><h3>参加申請</h3><div class="owner-list">${rows.map(c=>`<div class="owner-item"><div><h4>${esc(label(c))} ${statusBadge(c)}</h4><p>@${esc(c.note_id)} · ${fmt(c.created_at)} · 画像${(c.images||[]).length}枚</p></div><div class="owner-item-actions"><button class="btn" data-edit-creator="${c.id}">内容確認</button><button class="primary" data-creator-status="approved" data-id="${c.id}">承認</button><button class="danger" data-creator-status="revision" data-id="${c.id}">修正依頼</button></div></div>`).join('')||'<div class="empty">確認待ちはありません。</div>'}</div></section>`;
  }

  function articlesHtml() {
    const rows = (snapshot.creators || []).filter(c => c.article_status === 'pending');
    return `<section class="panel"><h3>参加記事認証</h3><div class="owner-list">${rows.map(c=>`<div class="owner-item"><div><h4>${esc(label(c))}</h4><p>${esc(c.participation_article_url)}</p></div><div class="owner-item-actions"><a class="btn" href="${esc(c.participation_article_url)}" target="_blank" rel="noopener">記事確認</a><button class="primary" data-article-status="verified" data-id="${c.id}">認証</button><button class="danger" data-article-status="revision" data-id="${c.id}">修正依頼</button></div></div>`).join('')||'<div class="empty">認証待ちはありません。</div>'}</div></section>`;
  }

  function participantsHtml() {
    const rows = (snapshot.creators || []).filter(c => c.status === 'approved');
    return `<section class="panel"><h3>公開クリエイター</h3><div class="owner-list">${rows.map(c=>`<div class="owner-item"><div><h4>${esc(label(c))} ${c.article_status==='verified'?'<span class="badge verified">記事認証済み</span>':''}</h4><p>@${esc(c.note_id)} · ${esc(c.job||'ジョブ未設定')} · ${(c.images||[]).length}枚</p></div><div class="owner-item-actions"><button class="btn" data-edit-creator="${c.id}">編集</button><button class="danger" data-creator-status="unpublished" data-id="${c.id}">公開停止</button></div></div>`).join('')||'<div class="empty">公開クリエイターはまだいません。</div>'}</div></section>`;
  }

  function opponentsHtml() {
    return `<section class="panel"><h3>見本の対戦相手</h3><p class="lead">無名S note①〜③のカード画像・ジョブ・レア度・セリフパックを設定します。勝敗率には影響しません。</p><div class="owner-card-grid">${(snapshot.opponents||[]).map(o=>`<article class="owner-card"><figure>${o.image_path?`<img src="${storageUrl(o.image_path)}" alt="${esc(o.name)}">`:`<div class="placeholder">S</div>`}</figure><div class="body"><span class="archive">SAMPLE · V${o.version}</span><h3>${esc(o.name)}</h3><p>${esc(o.job||'ジョブ未設定')} · ${esc(o.rarity)}</p><div class="actions"><button class="primary" data-edit-opponent="${o.id}">編集</button></div></div></article>`).join('')}</div></section>`;
  }

  function settingsHtml() {
    const s = snapshot.series;
    return `<form class="panel" id="ownerSettings"><h3>サイト設定</h3><div class="form-grid"><label class="form-label full"><span>タイトル</span><input class="field" name="title" value="${esc(s.title)}"></label><label class="form-label"><span>ハッシュタグ</span><input class="field" name="hashtag" value="${esc(s.hashtag)}"></label><label class="form-label"><span>開始表示</span><input class="field" name="started" value="${esc(s.started_label)}"></label><label class="form-label full"><span>トップのお知らせ</span><textarea class="field" name="announcement">${esc(s.announcement||'')}</textarea></label><label class="form-label"><span>1日のランキング加算上限</span><input class="field" type="number" min="1" max="100" name="rankDailyLimit" value="${Number(s.rank_daily_limit||10)}"></label><label class="form-label"><span>勝利確率 %</span><input class="field" type="number" min="1" max="98" name="winPercent" value="${Number(s.win_percent||45)}"></label><label class="form-label"><span>引分確率 %</span><input class="field" type="number" min="0" max="50" name="drawPercent" value="${Number(s.draw_percent||10)}"></label><label class="form-label"><span>プロフィールURL</span><input class="field" name="profileUrl" value="${esc(s.profile_url||'')}"></label><label class="form-label"><span>募集記事URL</span><input class="field" name="recruitUrl" value="${esc(s.recruit_url||'')}"></label><label class="form-label full"><span>マガジンURL</span><input class="field" name="magazineUrl" value="${esc(s.magazine_url||'')}"></label></div><div class="actions"><button class="primary" type="submit">設定を保存</button></div></form>`;
  }

  function logsHtml() {
    return `<section class="panel"><h3>更新履歴</h3><div class="owner-list">${(snapshot.logs||[]).map(log=>`<div class="owner-item"><div><h4>${esc(log.action)}</h4><p>${fmt(log.created_at)} · ${esc(log.actor||'')}</p></div></div>`).join('')||'<div class="empty">履歴はありません。</div>'}</div></section>`;
  }

  function contentHtml() {
    if (tab === 'applications') return applicationsHtml();
    if (tab === 'articles') return articlesHtml();
    if (tab === 'participants') return participantsHtml();
    if (tab === 'opponents') return opponentsHtml();
    if (tab === 'settings') return settingsHtml();
    if (tab === 'logs') return logsHtml();
    return overviewHtml();
  }

  function renderDashboard() {
    if (!document.querySelector('link[data-owner-live]')) {
      const css = document.createElement('link'); css.rel='stylesheet'; css.href='./admin-live.css?v=admin13'; css.dataset.ownerLive='1'; document.head.appendChild(css);
    }
    const m = snapshot.metrics || {};
    const s = snapshot.series || {};
    const isSengoku = series() === 'sengoku';
    app.innerHTML = `<section class="owner-live"><header class="owner-live-header"><div><p class="eyebrow">OWNER CONTROL · LIVE DATABASE</p><h1>オーナー管理</h1><p class="lead">${esc(s.title || '')} の本番管理画面</p></div><div class="owner-live-tools"><a class="btn" href="./?v=admin13">一般ページ</a><button class="btn" type="button" data-refresh-admin>再読込</button><button class="danger" type="button" data-owner-logout>ログアウト</button></div></header><section class="panel owner-series"><div><p class="eyebrow">DIRECTORY SERIES</p><h3>名鑑シリーズ</h3><div class="owner-series-nav"><a class="${!isSengoku?'active':''}" href="${seriesUrl('adventure')}">冒険クリエイター名鑑</a><a class="${isSengoku?'active':''}" href="${seriesUrl('sengoku')}">戦国カード名鑑</a></div></div><div class="owner-public"><strong class="${s.is_public?'on':'off'}">${s.is_public?'公開 ON':'非公開 OFF'}</strong>${isSengoku?`<button class="${s.is_public?'danger':'primary'}" data-toggle-series type="button">${s.is_public?'戦国版を非公開':'戦国版を公開'}</button>`:'<span class="small">冒険版は公開固定</span>'}</div></section><div class="owner-metrics"><div class="owner-metric"><b>${Number(m.pending||0)}</b><span>参加確認待ち</span></div><div class="owner-metric"><b>${Number(m.article_pending||0)}</b><span>記事認証待ち</span></div><div class="owner-metric"><b>${Number(m.participants||0)}</b><span>公開クリエイター</span></div><div class="owner-metric"><b>${Number(m.battles||0)}</b><span>累計対戦</span></div></div>${tabsHtml()}<div id="ownerContent">${contentHtml()}</div></section><dialog class="owner-modal" id="ownerModal"></dialog>`;
  }

  function creatorModal(c) {
    const modal = document.querySelector('#ownerModal');
    const images = (c.images||[]).map(storageUrl);
    modal.innerHTML = `<div class="owner-modal-shell"><button class="owner-modal-close" type="button" data-close-owner>×</button><p class="eyebrow">CREATOR EDIT</p><h2>${esc(label(c))}</h2><form id="ownerCreatorEdit" data-id="${c.id}"><div class="form-grid"><label class="form-label"><span>表示名</span><input class="field" name="displayName" value="${esc(c.display_name||'')}"></label><label class="form-label"><span>ジョブ</span><input class="field" name="job" value="${esc(c.job||'')}"></label><label class="form-label"><span>レア度</span><select class="field" name="rarity">${['Normal','Rare','SR','SSR','Dream SSR','Legend SSR'].map(x=>`<option ${c.rarity===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="form-label"><span>セリフパック</span><select class="field" name="dialoguePack">${['gentle','brave','cool','mystical','comic','job'].map(x=>`<option value="${x}" ${c.dialogue_pack===x?'selected':''}>${x==='gentle'?'やさしい応援':x==='brave'?'熱血':x==='cool'?'冷静':x==='mystical'?'神秘':x==='comic'?'コミカル':'ジョブから自動'}</option>`).join('')}</select></label><label class="form-label full"><span>紹介文</span><textarea class="field" name="intro">${esc(c.intro||'')}</textarea></label><label class="form-label"><span>おすすめ記事①</span><input class="field" name="article1Url" value="${esc(c.article1_url||'')}"></label><label class="form-label"><span>おすすめ記事②</span><input class="field" name="article2Url" value="${esc(c.article2_url||'')}"></label><label class="form-label full"><span>カード画像（選択した画像で1〜3枚目を上書き）</span><input class="field" type="file" name="images" accept="image/*" multiple></label></div>${images.length?`<div class="owner-image-preview">${images.map(x=>`<img src="${x}" alt="カード画像">`).join('')}</div>`:''}<div class="actions"><button class="primary" type="submit">保存</button></div></form></div>`;
    modal.showModal();
  }

  function opponentModal(o) {
    const modal = document.querySelector('#ownerModal');
    modal.innerHTML = `<div class="owner-modal-shell"><button class="owner-modal-close" type="button" data-close-owner>×</button><p class="eyebrow">SAMPLE OPPONENT</p><h2>${esc(o.name)}</h2><form id="ownerOpponentEdit" data-id="${o.id}"><div class="form-grid"><label class="form-label"><span>名前</span><input class="field" name="name" value="${esc(o.name)}"></label><label class="form-label"><span>ジョブ（カード記載どおり）</span><input class="field" name="job" value="${esc(o.job||'')}"></label><label class="form-label"><span>レア度</span><select class="field" name="rarity">${['Normal','Rare','SR','SSR','Dream SSR','Legend SSR'].map(x=>`<option ${o.rarity===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="form-label"><span>セリフパック</span><select class="field" name="dialoguePack">${['gentle','brave','cool','mystical','comic','job'].map(x=>`<option value="${x}" ${o.dialogue_pack===x?'selected':''}>${x==='gentle'?'やさしい応援':x==='brave'?'熱血':x==='cool'?'冷静':x==='mystical'?'神秘':x==='comic'?'コミカル':'ジョブから自動'}</option>`).join('')}</select></label><label class="form-label full"><span><input type="checkbox" name="enabled" ${o.enabled?'checked':''}> 対戦相手として公開</span></label><label class="form-label full"><span>カード画像（1枚）</span><input class="field" type="file" name="image" accept="image/*"></label></div>${o.image_path?`<div class="owner-image-preview"><img src="${storageUrl(o.image_path)}" alt="${esc(o.name)}"></div>`:''}<div class="actions"><button class="primary" type="submit">変更を保存</button></div></form></div>`;
    modal.showModal();
  }

  async function prepareImage(file) {
    if (!file) return null;
    if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選択してください。');
    if (file.size > 15 * 1024 * 1024) throw new Error('画像は15MB以下にしてください。');
    try {
      const bitmap = await createImageBitmap(file);
      const max = 1800;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      const blob = await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('画像変換に失敗しました。')),'image/webp',.9));
      return new File([blob], `card-${Date.now()}.webp`, { type:'image/webp' });
    } catch (e) {
      if (file.size > 8 * 1024 * 1024) throw e;
      return file;
    }
  }

  async function upload(kind, entityId, file, position = 0) {
    const prepared = await prepareImage(file);
    if (!prepared) return;
    const form = new FormData();
    form.set('kind', kind);
    form.set('entity_id', entityId);
    form.set('owner_token', token);
    form.set('position', String(position));
    form.set('file', prepared);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/catalog-image-upload`, { method:'POST', body:form });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || '画像アップロードに失敗しました。');
  }

  document.addEventListener('click', async event => {
    if (!location.hash.includes('admin')) return;
    const tabButton = event.target.closest('[data-owner-tab]');
    if (tabButton) { tab = tabButton.dataset.ownerTab; renderDashboard(); return; }
    if (event.target.closest('[data-close-owner]')) { document.querySelector('#ownerModal')?.close(); return; }
    if (event.target.closest('[data-owner-logout]')) { sessionStorage.removeItem(TOKEN_KEY); token=''; renderLogin(); return; }
    if (event.target.closest('[data-refresh-admin]')) { try { setBusy(true); await refresh(); toast('最新データに更新しました。'); } catch(e){ toast(e.message); } finally { setBusy(false); } return; }
    const editCreator = event.target.closest('[data-edit-creator]');
    if (editCreator) { const c=(snapshot.creators||[]).find(x=>x.id===editCreator.dataset.editCreator); if(c)creatorModal(c); return; }
    const editOpponent = event.target.closest('[data-edit-opponent]');
    if (editOpponent) { const o=(snapshot.opponents||[]).find(x=>x.id===editOpponent.dataset.editOpponent); if(o)opponentModal(o); return; }
    const creatorStatus = event.target.closest('[data-creator-status]');
    if (creatorStatus) {
      const status=creatorStatus.dataset.creatorStatus,id=creatorStatus.dataset.id;
      if (status==='unpublished' && !confirm('このクリエイターを公開停止しますか？')) return;
      try { setBusy(true); await rpc('admin_set_creator_status',{p_owner_token:token,p_id:id,p_status:status}); await refresh(); toast(status==='approved'?'参加を承認しました。':status==='revision'?'修正依頼にしました。':'公開を停止しました。'); } catch(e){ toast(e.message); } finally { setBusy(false); }
      return;
    }
    const articleStatus = event.target.closest('[data-article-status]');
    if (articleStatus) {
      try { setBusy(true); await rpc('admin_verify_article',{p_owner_token:token,p_id:articleStatus.dataset.id,p_status:articleStatus.dataset.articleStatus}); await refresh(); toast(articleStatus.dataset.articleStatus==='verified'?'記事を認証しました。':'修正依頼にしました。'); } catch(e){ toast(e.message); } finally { setBusy(false); }
      return;
    }
    if (event.target.closest('[data-toggle-series]')) {
      const next=!snapshot.series.is_public;
      if (!confirm(next?'戦国カード名鑑を公開しますか？':'戦国カード名鑑を非公開にしますか？')) return;
      try { setBusy(true); await rpc('admin_toggle_series',{p_owner_token:token,p_series:'sengoku',p_public:next}); await refresh(); toast(next?'戦国版を公開しました。':'戦国版を非公開にしました。'); } catch(e){ toast(e.message); } finally { setBusy(false); }
    }
  }, true);

  document.addEventListener('submit', async event => {
    const form = event.target;
    if (form.id === 'ownerLogin') {
      event.preventDefault();
      const value = String(new FormData(form).get('token')||'').trim();
      if (!value) return;
      token = value;
      try { app.classList.add('owner-busy'); await refresh(); toast('管理画面にログインしました。'); }
      catch(e){ sessionStorage.removeItem(TOKEN_KEY); token=''; renderLogin('オーナーキーを確認してください。'); }
      finally { app.classList.remove('owner-busy'); }
      return;
    }
    if (form.id === 'ownerSettings') {
      event.preventDefault(); const f=new FormData(form); const w=Number(f.get('winPercent')),d=Number(f.get('drawPercent'));
      if (w+d>99) return toast('勝利＋引分は99%以下にしてください。');
      try { setBusy(true); await rpc('admin_update_series',{p_owner_token:token,p_series:series(),p_title:String(f.get('title')||''),p_hashtag:String(f.get('hashtag')||''),p_started_label:String(f.get('started')||''),p_announcement:String(f.get('announcement')||''),p_rank_daily_limit:Number(f.get('rankDailyLimit'))||10,p_win_percent:w,p_draw_percent:d,p_profile_url:String(f.get('profileUrl')||''),p_recruit_url:String(f.get('recruitUrl')||''),p_magazine_url:String(f.get('magazineUrl')||'')}); await refresh(); toast('サイト設定を保存しました。'); } catch(e){ toast(e.message); } finally { setBusy(false); }
      return;
    }
    if (form.id === 'ownerCreatorEdit') {
      event.preventDefault(); const f=new FormData(form), id=form.dataset.id;
      try { setBusy(true); await rpc('admin_update_creator',{p_owner_token:token,p_id:id,p_display_name:String(f.get('displayName')||''),p_intro:String(f.get('intro')||''),p_job:String(f.get('job')||''),p_rarity:String(f.get('rarity')||'Normal'),p_dialogue_pack:String(f.get('dialoguePack')||'gentle'),p_article1_url:String(f.get('article1Url')||''),p_article2_url:String(f.get('article2Url')||'')}); const files=[...form.querySelector('[name="images"]').files].slice(0,3); for(let i=0;i<files.length;i++) await upload('owner_participant',id,files[i],i); document.querySelector('#ownerModal')?.close(); await refresh(); toast('参加者情報を保存しました。'); } catch(e){ toast(e.message); } finally { setBusy(false); }
      return;
    }
    if (form.id === 'ownerOpponentEdit') {
      event.preventDefault(); const f=new FormData(form),id=form.dataset.id;
      try { setBusy(true); await rpc('admin_update_opponent',{p_owner_token:token,p_id:id,p_name:String(f.get('name')||''),p_job:String(f.get('job')||''),p_rarity:String(f.get('rarity')||'Normal'),p_dialogue_pack:String(f.get('dialoguePack')||'gentle'),p_enabled:f.get('enabled')==='on'}); const file=form.querySelector('[name="image"]').files[0]; if(file)await upload('opponent',id,file,0); document.querySelector('#ownerModal')?.close(); await refresh(); toast('見本カードを更新しました。'); } catch(e){ toast(e.message); } finally { setBusy(false); }
    }
  }, true);

  (async () => {
    if (!token) return renderLogin();
    try { await refresh(); }
    catch (error) {
      console.error('[owner-auth]', error);
      sessionStorage.removeItem(TOKEN_KEY); token=''; renderLogin('保存されていた認証情報を更新してください。');
    }
  })();
})();
