(() => {
  'use strict';
  const API='https://xxhaerjvrgmnadxjqetz.supabase.co';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const TOKEN='mumei-owner-token',PERSIST='mumei-owner-token-persist-v1';
  const headers={apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'};
  const series=()=>new URLSearchParams(location.search).get('series')==='sengoku'?'sengoku':'adventure';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const token=()=>sessionStorage.getItem(TOKEN)||(()=>{try{const x=JSON.parse(localStorage.getItem(PERSIST)||'null');return x?.token&&x.expiresAt>Date.now()?x.token:''}catch{return''}})();
  async function rpc(name,body={}){const r=await fetch(`${API}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.message||d?.error||String(d||r.statusText));return d}

  function injectStyle(){if(document.querySelector('#battleResetV18Style'))return;const s=document.createElement('style');s.id='battleResetV18Style';s.textContent=`
    .owner-tabs [data-v18-battle-reset]{--tab:#ff747f}
    .battle-reset-page{display:grid;gap:18px}.battle-reset-danger{border-color:rgba(255,116,127,.4)!important;background:linear-gradient(155deg,rgba(68,20,28,.6),rgba(16,12,18,.9))!important}
    .battle-reset-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.battle-reset-card{padding:18px;border:1px solid rgba(255,116,127,.28);border-radius:17px;background:rgba(255,116,127,.04)}
    .battle-reset-card h4{margin:0 0 7px}.battle-reset-card p{min-height:44px;color:var(--muted);font-size:12px;line-height:1.65}.battle-reset-count{display:block;margin:12px 0;font-size:28px;font-weight:900;color:#ff9aa3}.battle-reset-select{display:grid;gap:10px}.battle-reset-note{padding:13px 15px;border-left:4px solid #ff747f;background:rgba(255,116,127,.08);border-radius:10px;color:#ffd3d7;line-height:1.7}.battle-reset-status{min-height:22px;color:var(--muted)}.battle-reset-status.ok{color:#73dda1}.battle-reset-status.err{color:#ff8c9e}
    @media(max-width:800px){.battle-reset-grid{grid-template-columns:1fr}.battle-reset-card p{min-height:0}}
  `;document.head.appendChild(s)}

  function ensureTab(){const tabs=document.querySelector('.owner-tabs');if(!tabs||tabs.querySelector('[data-v18-battle-reset]'))return;const b=document.createElement('button');b.type='button';b.dataset.v18BattleReset='1';b.textContent='勝敗管理';const logs=tabs.querySelector('[data-owner-tab="logs"]');tabs.insertBefore(b,logs||null)}

  const sumBattles=rows=>(rows||[]).reduce((n,r)=>n+Number(r.battles||0),0);

  async function renderReset(){const content=document.querySelector('#ownerContent');if(!content||!token())return;document.querySelectorAll('.owner-tabs button').forEach(b=>b.classList.remove('active'));document.querySelector('[data-v18-battle-reset]')?.classList.add('active');content.className='admin-v17-logs';content.innerHTML='<section class="panel battle-reset-danger"><h3>勝敗管理</h3><div class="empty">対戦データを読み込んでいます…</div></section>';
    const [snap,today,week,all]=await Promise.all([
      rpc('admin_snapshot',{p_owner_token:token(),p_series:series()}),
      rpc('get_leaderboard',{p_series:series(),p_period:'today'}),
      rpc('get_leaderboard',{p_series:series(),p_period:'week'}),
      rpc('get_leaderboard',{p_series:series(),p_period:'all'})
    ]);
    const creators=(snap.creators||[]).filter(x=>x.status!=='withdrawn');
    const opponents=snap.opponents||[];
    content.innerHTML=`<div class="battle-reset-page"><section class="panel battle-reset-danger"><p class="eyebrow">BATTLE RESET CONTROL</p><h3>勝敗・ランキングのリセット</h3><div class="battle-reset-note"><b>参加者情報や画像は消しません。</b><br>対象の対戦履歴だけを削除し、ランキングと勝敗数を再計算します。操作前に必ず確認画面が出ます。</div></section><section class="panel"><h3>期間ごと</h3><div class="battle-reset-grid"><div class="battle-reset-card"><h4>今日の勝敗</h4><span class="battle-reset-count">${sumBattles(today)}戦</span><p>今日0:00以降の全対戦を削除します。</p><button class="danger" type="button" data-v18-reset="today">今日をリセット</button></div><div class="battle-reset-card"><h4>今週の勝敗</h4><span class="battle-reset-count">${sumBattles(week)}戦</span><p>今週月曜0:00以降の全対戦を削除します。</p><button class="danger" type="button" data-v18-reset="week">今週をリセット</button></div><div class="battle-reset-card"><h4>全対戦履歴</h4><span class="battle-reset-count">${Number(snap.metrics?.battles||0)}戦</span><p>この名鑑の全勝敗・ランキング履歴を削除します。</p><button class="danger" type="button" data-v18-reset="all">全履歴をリセット</button></div></div></section><section class="panel"><h3>参加者ごと</h3><div class="battle-reset-select"><select class="field" id="v18Participant"><option value="">参加者を選択</option>${creators.map(x=>`<option value="${x.id}">${esc(x.display_name||x.note_id)} / @${esc(x.note_id)}</option>`).join('')}</select><button class="danger" type="button" data-v18-reset="participant">選択した参加者の勝敗をリセット</button></div></section><section class="panel"><h3>対戦カードごと</h3><div class="battle-reset-select"><select class="field" id="v18Opponent"><option value="">対戦カードを選択</option>${opponents.map(x=>`<option value="${x.id}">${esc(x.name)} / ${esc(x.job||'ジョブ未設定')}</option>`).join('')}</select><button class="danger" type="button" data-v18-reset="opponent">選択した対戦カードの全勝敗をリセット</button></div></section><div class="battle-reset-status" id="v18ResetStatus"></div></div>`;
  }

  function confirmText(scope,name=''){if(scope==='today')return '今日の全対戦結果を削除します。続けますか？';if(scope==='week')return '今週の全対戦結果を削除します。続けますか？';if(scope==='all')return 'この名鑑の全対戦履歴を削除します。元に戻せません。続けますか？';if(scope==='participant')return `「${name}」の全勝敗をリセットします。続けますか？`;return `対戦カード「${name}」に対する全勝敗をリセットします。続けますか？`}

  window.addEventListener('click',async e=>{
    if(e.target.closest?.('[data-v18-battle-reset]')){e.preventDefault();e.stopImmediatePropagation();try{await renderReset()}catch(x){alert(x.message||x)}return}
    const b=e.target.closest?.('[data-v18-reset]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const scope=b.dataset.v18Reset;let pid=null,oid=null,name='';
    if(scope==='participant'){const s=document.querySelector('#v18Participant');pid=s?.value||null;name=s?.selectedOptions?.[0]?.textContent||'';if(!pid)return alert('参加者を選択してください。')}
    if(scope==='opponent'){const s=document.querySelector('#v18Opponent');oid=s?.value||null;name=s?.selectedOptions?.[0]?.textContent||'';if(!oid)return alert('対戦カードを選択してください。')}
    if(!confirm(confirmText(scope,name)))return;const status=document.querySelector('#v18ResetStatus');b.disabled=true;if(status){status.className='battle-reset-status';status.textContent='リセットしています…'}
    try{const r=await rpc('admin_reset_battles',{p_owner_token:token(),p_series:series(),p_scope:scope,p_participant_id:pid,p_opponent_id:oid});if(status){status.className='battle-reset-status ok';status.textContent=`${Number(r.deleted||0)}件の対戦結果をリセットしました。`}setTimeout(renderReset,650)}catch(x){if(status){status.className='battle-reset-status err';status.textContent=x.message||String(x)}b.disabled=false}
  },true);

  const observer=new MutationObserver(()=>{injectStyle();ensureTab()});observer.observe(document.documentElement,{childList:true,subtree:true});injectStyle();ensureTab();
})();