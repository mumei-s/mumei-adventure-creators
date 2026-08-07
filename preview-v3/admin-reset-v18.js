(() => {
  'use strict';

  const API='https://xxhaerjvrgmnadxjqetz.supabase.co';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const TOKEN='mumei-owner-token';
  const PERSIST='mumei-owner-token-persist-v1';
  const headers={apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'};

  const series=()=>new URLSearchParams(location.search).get('series')==='sengoku'?'sengoku':'adventure';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  function token(){
    const s=sessionStorage.getItem(TOKEN); if(s)return s;
    try{const x=JSON.parse(localStorage.getItem(PERSIST)||'null');return x?.token&&Number(x.expiresAt)>Date.now()?String(x.token):''}catch{return''}
  }
  async function rpc(name,body={}){
    const r=await fetch(`${API}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});
    const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}
    if(!r.ok)throw new Error(d?.message||d?.error||String(d||r.statusText));return d;
  }

  function injectStyle(){
    if(document.querySelector('#adminResetV18Style'))return;
    const s=document.createElement('style');s.id='adminResetV18Style';s.textContent=`
      .owner-tabs [data-v18-reset-tab]{--tab:#ff6f61;border-color:rgba(255,111,97,.35)!important;color:#ffd3cf!important}
      .owner-tabs [data-v18-reset-tab].active{background:rgba(255,111,97,.12)!important;color:#ff9e95!important;border-color:#ff6f61!important}
      .v18-reset-panel{border-color:rgba(255,111,97,.45)!important;background:linear-gradient(155deg,rgba(46,22,27,.95),rgba(12,13,24,.94))!important}
      .v18-reset-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}
      .v18-reset-box{padding:16px;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:rgba(255,255,255,.035)}
      .v18-reset-box label{display:grid;gap:8px;font-size:12px;font-weight:850}.v18-reset-box b{color:#ffd0cb}
      .v18-reset-summary{padding:16px;border:1px solid rgba(255,111,97,.3);border-radius:15px;background:rgba(255,111,97,.055);line-height:1.8}
      .v18-reset-summary strong{color:#ffb0a8}.v18-reset-execute{margin-top:16px;width:100%;background:rgba(255,91,83,.16)!important;border-color:rgba(255,111,97,.72)!important;color:#ffe5e2!important}
      .v18-reset-status{min-height:24px;margin-top:12px;font-weight:800}.v18-reset-status.ok{color:#73dda1}.v18-reset-status.err{color:#ff8c9e}
      .v18-reset-warning{margin-top:12px;padding:12px 14px;border-left:4px solid #ff6f61;background:rgba(255,111,97,.07);color:#ffd9d5;font-size:12px;line-height:1.7}
      @media(max-width:760px){.v18-reset-grid{grid-template-columns:1fr}.v18-reset-execute{padding:14px}}
    `;document.head.appendChild(s);
  }

  function ensureTab(){
    const tabs=document.querySelector('.owner-tabs');if(!tabs)return;
    let b=tabs.querySelector('[data-v18-reset-tab]');
    if(!b){
      b=tabs.querySelector('[data-v17-reset-tab]');
      if(b){b.dataset.v18ResetTab='1';b.textContent='勝敗管理';}
      else{b=document.createElement('button');b.type='button';b.dataset.v18ResetTab='1';b.textContent='勝敗管理';tabs.insertBefore(b,tabs.querySelector('[data-owner-tab="logs"]')||null)}
    }
  }

  function targetOptions(snap,scope){
    if(scope==='participant')return (snap.creators||[]).filter(x=>x.status==='approved').map(x=>`<option value="${x.id}">${esc(x.display_name||x.note_id)} (@${esc(x.note_id)})</option>`).join('')||'<option value="">公開参加者なし</option>';
    if(scope==='opponent')return (snap.opponents||[]).map(x=>`<option value="${x.id}">${esc(x.name)} / ${esc(x.job||'ジョブ未設定')}</option>`).join('')||'<option value="">対戦カードなし</option>';
    return '<option value="">名鑑全体</option>';
  }

  function labels(scope,period,result){
    return {
      scope:{all:'名鑑全体',participant:'参加者個別',opponent:'対戦カード個別'}[scope]||scope,
      period:{today:'今日',week:'今週',all:'累計'}[period]||period,
      result:{all:'勝・引分・負すべて',win:'勝利だけ',draw:'引分だけ',lose:'敗北だけ'}[result]||result
    };
  }

  function updateTarget(snap){
    const scope=document.querySelector('[data-v18-scope]')?.value||'all';
    const target=document.querySelector('[data-v18-target]');
    if(!target)return;
    target.innerHTML=targetOptions(snap,scope);target.disabled=scope==='all';
    updateSummary();
  }

  function updateSummary(){
    const scope=document.querySelector('[data-v18-scope]')?.value||'all';
    const period=document.querySelector('[data-v18-period]')?.value||'all';
    const result=document.querySelector('[data-v18-result]')?.value||'all';
    const target=document.querySelector('[data-v18-target]');
    const l=labels(scope,period,result);
    const targetText=scope==='all'?'':`：${target?.selectedOptions?.[0]?.textContent||'未選択'}`;
    const out=document.querySelector('[data-v18-summary]');
    if(out)out.innerHTML=`<strong>削除対象</strong><br>${l.scope}${esc(targetText)} / ${l.period} / ${l.result}`;
  }

  async function render(){
    const content=document.querySelector('#ownerContent');if(!content||!token())return;
    document.querySelectorAll('.owner-tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelector('[data-v18-reset-tab]')?.classList.add('active');
    content.className='admin-v17-reset';
    content.innerHTML='<section class="panel v18-reset-panel"><h3>勝敗管理</h3><div class="empty">共有DBから戦績を読み込んでいます…</div></section>';
    const snap=await rpc('admin_snapshot',{p_owner_token:token(),p_series:series()});
    content.innerHTML=`<section class="panel v18-reset-panel"><p class="eyebrow">BATTLE RECORD CONTROL</p><h3>勝敗・ランキング リセット管理</h3><p class="lead">対象・期間・勝敗種別を組み合わせて戦績を消去できます。ランキングは保存済み対戦履歴から再計算されるため、削除後すぐ反映されます。</p><div class="v18-reset-warning"><b>削除した対戦履歴は元に戻せません。</b> 実行前に2回確認します。</div><div class="v18-reset-grid"><div class="v18-reset-box"><label><b>① 対象</b><select class="field" data-v18-scope><option value="all">名鑑全体</option><option value="participant">参加者個別</option><option value="opponent">対戦カード個別</option></select></label></div><div class="v18-reset-box"><label><b>② 期間</b><select class="field" data-v18-period><option value="today">今日</option><option value="week">今週</option><option value="all">累計</option></select></label></div><div class="v18-reset-box"><label><b>③ 勝敗</b><select class="field" data-v18-result><option value="all">全勝敗</option><option value="win">勝利だけ</option><option value="draw">引分だけ</option><option value="lose">敗北だけ</option></select></label></div></div><div class="v18-reset-box"><label><b>対象の参加者／カード</b><select class="field" data-v18-target disabled>${targetOptions(snap,'all')}</select></label></div><div class="v18-reset-summary" data-v18-summary></div><button class="danger v18-reset-execute" type="button" data-v18-execute>この条件の勝敗をリセット</button><div class="v18-reset-status" data-v18-status>現在の累計対戦：${Number(snap.metrics?.battles||0)}件</div></section>`;
    window.__MUMEI_RESET_SNAPSHOT__=snap;updateSummary();
  }

  async function execute(){
    const scope=document.querySelector('[data-v18-scope]')?.value||'all';
    const period=document.querySelector('[data-v18-period]')?.value||'all';
    const result=document.querySelector('[data-v18-result]')?.value||'all';
    const target=document.querySelector('[data-v18-target]');
    const targetId=scope==='all'?null:(target?.value||null);
    if(scope!=='all'&&!targetId)throw new Error('対象を選択してください。');
    const l=labels(scope,period,result),name=scope==='all'?'':`\n対象：${target?.selectedOptions?.[0]?.textContent||''}`;
    if(!confirm(`戦績を削除します。\n${l.scope}${name}\n期間：${l.period}\n勝敗：${l.result}\n\n続行しますか？`))return;
    if(!confirm('最終確認です。この対戦履歴は元に戻せません。実行しますか？'))return;
    const status=document.querySelector('[data-v18-status]');const button=document.querySelector('[data-v18-execute]');
    button.disabled=true;if(status){status.className='v18-reset-status';status.textContent='削除しています…'}
    try{
      const out=await rpc('admin_reset_battles',{p_owner_token:token(),p_series:series(),p_scope:scope,p_target_id:targetId,p_period:period,p_result:result});
      if(status){status.className='v18-reset-status ok';status.textContent=`完了：${Number(out.deleted||0)}件の対戦履歴を削除しました。`}
      setTimeout(render,700);
    }catch(e){if(status){status.className='v18-reset-status err';status.textContent=e.message||String(e)}button.disabled=false}
  }

  window.addEventListener('change',e=>{
    if(e.target.matches?.('[data-v18-scope]')){updateTarget(window.__MUMEI_RESET_SNAPSHOT__||{});return}
    if(e.target.matches?.('[data-v18-period],[data-v18-result],[data-v18-target]'))updateSummary();
  },true);

  window.addEventListener('click',e=>{
    if(e.target.closest?.('[data-v18-reset-tab],[data-v17-reset-tab]')){e.preventDefault();e.stopImmediatePropagation();render().catch(x=>alert(x.message||x));return}
    if(e.target.closest?.('[data-v18-execute]')){e.preventDefault();e.stopImmediatePropagation();execute().catch(x=>alert(x.message||x));return}
  },true);

  const obs=new MutationObserver(()=>{injectStyle();ensureTab()});obs.observe(document.documentElement,{childList:true,subtree:true});injectStyle();ensureTab();
})();