(() => {
  'use strict';

  const SUPABASE_URL = 'https://xxhaerjvrgmnadxjqetz.supabase.co';
  const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const OWNER_SESSION = 'mumei-owner-token';
  const RELEASE_KEY = 'mumei-v3-series-release';
  const EDIT_PREFIX = 'mumei-v3-edit-';
  const FILES = new Map();

  const series = () => window.MUMEI_SERIES?.key || 'adventure';
  const storageUrl = path => !path ? '' : (/^(https?:|data:)/.test(path) ? path : `${SUPABASE_URL}/storage/v1/object/public/creator-images/${path}`);
  const headers = { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

  async function rpc(name, body = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = data?.message || data?.error || String(data || res.statusText);
      throw new Error(msg.replace(/^.*?:\s*/, ''));
    }
    return data;
  }

  const camelCreator = c => ({
    id: c.id, noteId: c.note_id, displayName: c.display_name || '', status: c.status || 'approved',
    job: c.job || '', rarity: c.rarity || 'Normal', dialoguePack: c.dialogue_pack || 'gentle',
    images: (c.images || []).map(storageUrl), intro: c.intro || '', article1Url: c.article1_url || '',
    article2Url: c.article2_url || '', participationArticleUrl: c.participation_article_url || '',
    articleStatus: c.article_status || 'none', createdAt: c.created_at || new Date().toISOString(),
    approvedAt: c.approved_at || null, isDemo: false
  });
  const camelOpponent = o => ({
    id: o.id, name: o.name, job: o.job || '', rarity: o.rarity || 'Normal', dialoguePack: o.dialogue_pack || 'gentle',
    images: o.image_path ? [storageUrl(o.image_path)] : [], version: o.version || 1, enabled: o.enabled !== false, slot: o.slot
  });
  const settingsFrom = s => ({
    title: s.title, hashtag: s.hashtag, started: s.started_label, announcement: s.announcement || '',
    rankDailyLimit: s.rank_daily_limit || 10, winPercent: s.win_percent || 45, drawPercent: s.draw_percent || 10,
    profileUrl: s.profile_url || '', recruitUrl: s.recruit_url || '', magazineUrl: s.magazine_url || ''
  });

  function startOfWeek() {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day);
    return d;
  }

  function synthBattles(all = [], week = [], today = [], total = 0) {
    const by = arr => new Map(arr.map(x => [x.id, x]));
    const A = by(all), W = by(week), T = by(today);
    const ids = new Set([...A.keys(), ...W.keys(), ...T.keys()]);
    const out = []; let n = 0;
    const now = new Date(); now.setMinutes(now.getMinutes() - 10);
    const weekDate = startOfWeek(); weekDate.setHours(12, 0, 0, 0);
    const oldDate = new Date(startOfWeek()); oldDate.setDate(oldDate.getDate() - 3); oldDate.setHours(12, 0, 0, 0);
    const add = (pid, counts, date) => {
      [['win','wins'],['draw','draws'],['lose','losses']].forEach(([result,key]) => {
        for (let i = 0; i < Math.max(0, Number(counts?.[key] || 0)); i++) out.push({ id:`db-${n++}`, participantId:pid, guestId:null, opponentId:'db', opponentVersion:1, action:'strike', result, ranked:true, createdAt:new Date(date.getTime()+i*1000).toISOString(), source:'db' });
      });
    };
    for (const id of ids) {
      const a=A.get(id)||{}, w=W.get(id)||{}, t=T.get(id)||{};
      add(id,t,now);
      add(id,{wins:(w.wins||0)-(t.wins||0),draws:(w.draws||0)-(t.draws||0),losses:(w.losses||0)-(t.losses||0)},weekDate);
      add(id,{wins:(a.wins||0)-(w.wins||0),draws:(a.draws||0)-(w.draws||0),losses:(a.losses||0)-(w.losses||0)},oldDate);
    }
    while (out.length < total) out.push({ id:`guest-${n++}`, participantId:null, guestId:'shared', opponentId:'db', opponentVersion:1, action:'strike', result:'lose', ranked:false, createdAt:oldDate.toISOString(), source:'db' });
    return out;
  }

  async function leaderboard(period) { return await rpc('get_leaderboard', { p_series: series(), p_period: period }); }

  async function publicState() {
    const [pub, all, week, today] = await Promise.all([
      rpc('get_public_state', { p_series: series() }), leaderboard('all'), leaderboard('week'), leaderboard('today')
    ]);
    const creators = (pub.creators || []).map(camelCreator);
    const currentId = localStorage.getItem('mumei-v3-session');
    const editToken = currentId && localStorage.getItem(EDIT_PREFIX + currentId);
    if (currentId && editToken && !creators.some(x => x.id === currentId)) {
      try { creators.push(camelCreator(await rpc('get_creator_private', { p_id: currentId, p_edit_token: editToken }))); } catch {}
    }
    return { version:3, settings:settingsFrom(pub.series), opponents:(pub.opponents||[]).map(camelOpponent), participants:creators,
      battles:synthBattles(all||[],week||[],today||[],Number(pub.battle_total||0)), audit:[] };
  }

  async function adminState(token) {
    const [snap, all, week, today] = await Promise.all([
      rpc('admin_snapshot', { p_owner_token: token, p_series: series() }), leaderboard('all'), leaderboard('week'), leaderboard('today')
    ]);
    return { version:3, settings:settingsFrom(snap.series), opponents:(snap.opponents||[]).map(camelOpponent),
      participants:(snap.creators||[]).map(camelCreator), battles:synthBattles(all||[],week||[],today||[],Number(snap.metrics?.battles||0)),
      audit:(snap.logs||[]).map(x=>({id:x.id,action:x.action,at:x.created_at})) };
  }

  async function syncRelease() {
    const [a,s] = await Promise.all([rpc('get_public_state',{p_series:'adventure'}),rpc('get_public_state',{p_series:'sengoku'})]);
    localStorage.setItem(RELEASE_KEY, JSON.stringify({ sengokuPublic: !!s?.series?.is_public }));
    return { adventure:a, sengoku:s };
  }

  async function syncLocal(adminToken = null) {
    await syncRelease();
    const state = adminToken ? await adminState(adminToken) : await publicState();
    localStorage.setItem('mumei-v3-state', JSON.stringify(state));
    return state;
  }

  async function ensureOwner(force = false) {
    let token = force ? '' : sessionStorage.getItem(OWNER_SESSION) || '';
    if (!token) token = prompt('オーナーキーを入力してください') || '';
    if (!token) throw new Error('オーナーキーが必要です');
    await rpc('admin_snapshot', { p_owner_token:token, p_series:series() });
    sessionStorage.setItem(OWNER_SESSION, token);
    return token;
  }

  function normId(v) { const s=String(v||'').trim(),m=s.match(/note\.com\/([\w-]+)/i); return (m?m[1]:s.replace(/^@/,'')); }
  function notify(msg) { const n=document.querySelector('#toast'); if(n){ n.textContent=msg; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),2600); } else alert(msg); }
  function err(error) { console.error(error); alert(`処理できませんでした：${error?.message || error}`); }
  function reload(hash = location.hash || '#home') { const u=new URL(location.href); u.hash=hash; u.searchParams.set('v','db1'); location.href=u.href; }

  function bufferChange(input) {
    const key=input.dataset.upload; if(!key) return;
    const current=FILES.get(key)||[];
    const next=[...current,...input.files].slice(0,3); FILES.set(key,next);
  }
  function mirrorClick(target) {
    const rm=target.closest('[data-remove]'); if(rm){const a=FILES.get(rm.dataset.upid)||[];a.splice(Number(rm.dataset.remove),1);FILES.set(rm.dataset.upid,a);return;}
    const mv=target.closest('[data-move]'); if(mv){const a=FILES.get(mv.dataset.upid)||[],i=Number(mv.dataset.index),j=mv.dataset.move==='up'?i-1:i+1;if(j>=0&&j<a.length){[a[i],a[j]]=[a[j],a[i]];FILES.set(mv.dataset.upid,a);}}
  }

  async function uploadCreatorFiles(id, editToken, key) {
    const files=FILES.get(key)||[];
    for(let i=0;i<files.length;i++){
      const f=new FormData(); f.set('kind','creator'); f.set('entity_id',id); f.set('edit_token',editToken); f.set('position',String(i)); f.set('file',files[i]);
      const r=await fetch(`${SUPABASE_URL}/functions/v1/catalog-image-upload`,{method:'POST',body:f}); if(!r.ok) throw new Error((await r.json()).error||'画像アップロード失敗');
    }
  }
  async function uploadOpponentFile(id, ownerToken, key) {
    const file=(FILES.get(key)||[])[0]; if(!file)return;
    const f=new FormData(); f.set('kind','opponent'); f.set('entity_id',id); f.set('owner_token',ownerToken); f.set('file',file);
    const r=await fetch(`${SUPABASE_URL}/functions/v1/catalog-image-upload`,{method:'POST',body:f}); if(!r.ok) throw new Error((await r.json()).error||'画像アップロード失敗');
  }

  document.addEventListener('change', e => { if(e.target.matches('[data-upload]')) bufferChange(e.target); }, true);
  document.addEventListener('click', async e => {
    mirrorClick(e.target);
    const adminNav=e.target.closest('[data-nav="admin"]');
    if(adminNav){ e.preventDefault(); e.stopImmediatePropagation(); try{const t=await ensureOwner();await syncLocal(t);reload('#admin');}catch(x){err(x)} return; }
    const play=e.target.closest('[data-play]');
    if(play){ e.preventDefault(); e.stopImmediatePropagation(); try{
      const opp=document.querySelector('input[name="opponent"]:checked')?.value; const selected=document.querySelector('[data-action].selected')?.dataset.action||'strike';
      if(!opp) throw new Error('対戦相手を選んでください'); const pid=localStorage.getItem('mumei-v3-session'); const edit=pid?localStorage.getItem(EDIT_PREFIX+pid):null;
      const result=await rpc('play_catalog_battle',{p_series:series(),p_opponent_id:opp,p_action:selected==='strike'?'attack':selected,p_participant_id:pid||null,p_edit_token:edit||null});
      const title=result.result==='win'?'勝利！':result.result==='draw'?'引き分け':'敗北'; const mark=result.result==='win'?'🏆':result.result==='draw'?'🤝':'⚔️';
      const m=document.querySelector('#modal'); m.innerHTML=`<div class="modal-shell battle-result"><div class="result-mark">${mark}</div><p class="eyebrow">BATTLE RESULT</p><h2>${title}</h2><p class="lead">${result.ranked?`ランキング加算対象・今週 ${result.week_rank||'-'}位`:'練習／ゲスト対戦'}</p><div class="actions" style="justify-content:center"><button class="primary" data-db-battle-close>ランキングへ戻る</button></div></div>`;m.showModal();
    }catch(x){err(x)} return; }
    if(e.target.closest('[data-db-battle-close]')){ e.preventDefault(); try{await syncLocal();}catch{} reload('#battle'); return; }

    const action = e.target.closest('[data-approve],[data-revision],[data-unpublish],[data-verify],[data-reject],[data-toggle-sengoku],[data-reset]');
    if(action){ e.preventDefault(); e.stopImmediatePropagation(); try{
      const token=await ensureOwner();
      if(action.matches('[data-reset]')) return alert('本番DBはこのボタンでは初期化しません。');
      if(action.hasAttribute('data-toggle-sengoku')){ const s=await rpc('get_public_state',{p_series:'sengoku'}); await rpc('admin_toggle_series',{p_owner_token:token,p_series:'sengoku',p_public:!s.series.is_public}); await syncRelease(); notify('戦国版の公開状態を変更しました'); return reload('#admin'); }
      const id=action.dataset.approve||action.dataset.revision||action.dataset.unpublish||action.dataset.verify||action.dataset.reject;
      if(action.hasAttribute('data-verify')||action.hasAttribute('data-reject')) await rpc('admin_verify_article',{p_owner_token:token,p_id:id,p_status:action.hasAttribute('data-verify')?'verified':'revision'});
      else await rpc('admin_set_creator_status',{p_owner_token:token,p_id:id,p_status:action.hasAttribute('data-approve')?'approved':action.hasAttribute('data-unpublish')?'unpublished':'revision'});
      await syncLocal(token); reload('#admin');
    }catch(x){err(x)} return; }
  }, true);

  document.addEventListener('submit', async e => {
    const form=e.target; if(!form.id) return;
    if(!['joinForm','myForm','articleForm','editPForm','editOForm','settingsForm'].includes(form.id)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try {
      const f=new FormData(form);
      if(form.id==='joinForm'){
        const id=normId(f.get('noteId')); const reg=await rpc('register_creator',{p_series:series(),p_note_id:id,p_display_name:String(f.get('displayName')||''),p_intro:String(f.get('intro')||''),p_article1_url:String(f.get('article1Url')||'')});
        localStorage.setItem('mumei-v3-session',reg.id); localStorage.setItem(EDIT_PREFIX+reg.id,reg.edit_token); await uploadCreatorFiles(reg.id,reg.edit_token,'join'); await syncLocal(); notify('参加申請を送信しました'); return reload('#mypage');
      }
      if(form.id==='myForm'){
        const id=localStorage.getItem('mumei-v3-session'),token=id&&localStorage.getItem(EDIT_PREFIX+id); if(!id||!token)throw new Error('編集情報がありません');
        await rpc('update_creator',{p_id:id,p_edit_token:token,p_display_name:String(f.get('displayName')||''),p_intro:String(f.get('intro')||''),p_article1_url:String(f.get('article1Url')||''),p_article2_url:String(f.get('article2Url')||'')});
        await uploadCreatorFiles(id,token,`my-${id}`); await syncLocal(); notify('保存しました'); return reload('#mypage');
      }
      if(form.id==='articleForm'){
        const id=localStorage.getItem('mumei-v3-session'),token=id&&localStorage.getItem(EDIT_PREFIX+id); if(!id||!token)throw new Error('編集情報がありません');
        await rpc('submit_participation_article',{p_id:id,p_edit_token:token,p_url:String(f.get('url')||'')}); await syncLocal(); notify('記事認証を申請しました'); return reload('#mypage');
      }
      const owner=await ensureOwner();
      if(form.id==='editPForm'){
        const id=form.dataset.id; await rpc('admin_update_creator',{p_owner_token:owner,p_id:id,p_display_name:String(f.get('displayName')||''),p_intro:String(f.get('intro')||''),p_job:String(f.get('job')||''),p_rarity:String(f.get('rarity')||'Normal'),p_dialogue_pack:String(f.get('dialoguePack')||'gentle'),p_article1_url:String(f.get('article1Url')||''),p_article2_url:String(f.get('article2Url')||'')});
        const editKey=`ep-${id}`; const privateCreator=(await adminState(owner)).participants.find(x=>x.id===id); if((FILES.get(editKey)||[]).length && privateCreator) alert('参加者画像の管理更新は本人アップロードを優先します。'); await syncLocal(owner); return reload('#admin');
      }
      if(form.id==='editOForm'){
        const id=form.dataset.id; await rpc('admin_update_opponent',{p_owner_token:owner,p_id:id,p_name:String(f.get('name')||''),p_job:String(f.get('job')||''),p_rarity:String(f.get('rarity')||'Normal'),p_dialogue_pack:String(f.get('dialoguePack')||'gentle'),p_enabled:f.get('enabled')==='on'}); await uploadOpponentFile(id,owner,`eo-${id}`); await syncLocal(owner); notify('見本カードを更新しました'); return reload('#admin');
      }
      if(form.id==='settingsForm'){
        const w=Number(f.get('winPercent')),d=Number(f.get('drawPercent')); await rpc('admin_update_series',{p_owner_token:owner,p_series:series(),p_title:String(f.get('title')||''),p_hashtag:String(f.get('hashtag')||''),p_started_label:String(f.get('started')||''),p_announcement:String(f.get('announcement')||''),p_rank_daily_limit:Number(f.get('rankDailyLimit'))||10,p_win_percent:w,p_draw_percent:d,p_profile_url:String(f.get('profileUrl')||''),p_recruit_url:String(f.get('recruitUrl')||''),p_magazine_url:String(f.get('magazineUrl')||'')}); await syncLocal(owner); notify('設定を保存しました'); return reload('#admin');
      }
    } catch(x){ err(x); }
  }, true);

  async function loadScript(src) { return await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s);}); }

  async function boot() {
    try {
      let owner=null;
      if(location.hash==='#admin') { try{owner=await ensureOwner();}catch{location.hash='home';} }
      await syncLocal(owner);
    } catch (e) { console.error('[db-sync]',e); }
    await loadScript('./series-router-fix.js?v=db1');
    await loadScript('./series-release.js?v=db1');
    await loadScript('./app-loader.js?v=db1');
  }
  boot();
})();
