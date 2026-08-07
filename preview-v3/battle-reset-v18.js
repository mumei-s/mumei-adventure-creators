(() => {
  'use strict';
  const API='https://xxhaerjvrgmnadxjqetz.supabase.co';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const TOKEN='mumei-owner-token',PERSIST='mumei-owner-token-persist-v1';
  const headers={apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'};
  const series=()=>new URLSearchParams(location.search).get('series')==='sengoku'?'sengoku':'adventure';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const token=()=>sessionStorage.getItem(TOKEN)||(()=>{try{const x=JSON.parse(localStorage.getItem(PERSIST)||'null');return x?.token&&x.expiresAt>Date.now()?x.token:''}catch{return''}})();
  async function rpc(name,body={}){const r=await fetch(`${API}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.message||d?.error||String(d||r.statusText));return d}
  let rendering=false;

  function style(){if(document.querySelector('#battleResetV18Style'))return;const s=document.createElement('style');s.id='battleResetV18Style';s.textContent=`
    .v18-reset-panel{border-color:rgba(255,115,105,.5)!important}.v18-reset-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.v18-reset-form label{display:grid;gap:7px;font-size:12px;font-weight:850}.v18-reset-form .full{grid-column:1/-1}.v18-reset-target[hidden]{display:none!important}.v18-reset-preview{padding:14px 16px;border:1px solid rgba(255,115,105,.28);border-radius:14px;background:rgba(255,115,105,.055);line-height:1.7}.v18-reset-run{width:100%;padding:15px!important}.v18-quick{display:flex;gap:8px;flex-wrap:wrap}.v18-quick button{flex:1 1 140px}.v18-reset-status{min-height:24px;margin-top:10px;font-size:13px}.v18-reset-status.ok{color:#73dda1}.v18-reset-status.err{color:#ff8c9e}
    @media(max-width:720px){.v18-reset-form{grid-template-columns:1fr}.v18-reset-form .full{grid-column:auto}}
  `;document.head.appendChild(s)}

  async function render(){
    if(rendering)return;const root=document.querySelector('#ownerContent');if(!root||!token())return;rendering=true;
    try{
      const snap=await rpc('admin_snapshot',{p_owner_token:token(),p_series:series()});
      const creators=(snap.creators||[]).filter(x=>x.status==='approved');
      const opponents=(snap.opponents||[]).filter(x=>x.enabled!==false);
      root.className='admin-v17-reset';
      root.innerHTML=`<section class="panel v18-reset-panel" data-v18-reset-panel><p class="eyebrow">BATTLE RESET CONTROL</p><h3>勝敗・ランキング リセット管理</h3><p class="lead">対象・期間・結果を組み合わせて対戦履歴を削除します。削除した記録は勝数・敗数・引分・ランキングから即時消えます。</p><div class="warning"><b>元に戻せません。</b> 実行前に下の確認内容を必ず見てください。</div><div class="v18-reset-form"><label>対象<select class="field" data-v18-scope><option value="all">名鑑全体</option><option value="participant">参加者を指定</option><option value="opponent">対戦相手を指定</option></select></label><label class="v18-reset-target" data-v18-target-wrap hidden>対象を選択<select class="field" data-v18-target></select></label><label>期間<select class="field" data-v18-period><option value="today">今日</option><option value="week">今週</option><option value="all">全期間</option></select></label><label>結果<select class="field" data-v18-result><option value="all">勝・引分・負を全部</option><option value="win">勝利だけ</option><option value="draw">引分だけ</option><option value="lose">敗北だけ</option></select></label><div class="full v18-reset-preview" data-v18-preview></div><div class="full"><button class="danger v18-reset-run" type="button" data-v18-run>この条件で戦績をリセット</button><div class="v18-reset-status" data-v18-status></div></div><div class="full"><p class="small">クイック操作</p><div class="v18-quick"><button class="btn" type="button" data-v18-quick="today">全体・今日を全部リセット</button><button class="btn" type="button" data-v18-quick="week">全体・今週を全部リセット</button><button class="danger" type="button" data-v18-quick="all">全体・累計を全部リセット</button></div></div></div></section>`;
      root.dataset.v18Creators=JSON.stringify(creators.map(x=>({id:x.id,label:(x.display_name||x.note_id)+' (@'+x.note_id+')'})));
      root.dataset.v18Opponents=JSON.stringify(opponents.map(x=>({id:x.id,label:x.name+' / '+(x.job||'ジョブ未設定')})));
      syncTarget();updatePreview();
    }catch(e){root.innerHTML=`<section class="panel v18-reset-panel"><h3>勝敗リセット</h3><p style="color:var(--red)">${esc(e.message||e)}</p></section>`}
    finally{rendering=false}
  }

  function dataList(kind){const root=document.querySelector('#ownerContent');try{return JSON.parse(root?.dataset[kind]||'[]')}catch{return[]}}
  function syncTarget(){const scope=document.querySelector('[data-v18-scope]')?.value||'all',wrap=document.querySelector('[data-v18-target-wrap]'),sel=document.querySelector('[data-v18-target]');if(!wrap||!sel)return;if(scope==='all'){wrap.hidden=true;sel.innerHTML='';return}const rows=dataList(scope==='participant'?'v18Creators':'v18Opponents');wrap.hidden=false;sel.innerHTML=rows.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('')||'<option value="">対象がありません</option>'}
  function updatePreview(){const scope=document.querySelector('[data-v18-scope]')?.value||'all',target=document.querySelector('[data-v18-target]'),period=document.querySelector('[data-v18-period]')?.value||'today',result=document.querySelector('[data-v18-result]')?.value||'all',box=document.querySelector('[data-v18-preview]');if(!box)return;const sn={all:'名鑑全体',participant:'参加者',opponent:'対戦相手'},pn={today:'今日',week:'今週',all:'全期間'},rn={all:'勝・引分・負すべて',win:'勝利だけ',draw:'引分だけ',lose:'敗北だけ'};const targetLabel=scope==='all'?'':`「${target?.selectedOptions?.[0]?.textContent||'未選択'}」`;box.innerHTML=`<b>削除対象：</b>${sn[scope]} ${esc(targetLabel)}<br><b>期間：</b>${pn[period]} ／ <b>結果：</b>${rn[result]}`}

  async function runReset(forcePeriod=null){const scope=document.querySelector('[data-v18-scope]')?.value||'all',target=scope==='all'?null:(document.querySelector('[data-v18-target]')?.value||null),period=forcePeriod||document.querySelector('[data-v18-period]')?.value||'today',result=forcePeriod?'all':document.querySelector('[data-v18-result]')?.value||'all';if(scope!=='all'&&!target)return alert('対象を選択してください。');const sn={all:'名鑑全体',participant:'参加者',opponent:'対戦相手'},pn={today:'今日',week:'今週',all:'全期間'},rn={all:'全結果',win:'勝利',draw:'引分',lose:'敗北'};if(!confirm(`${sn[scope]} / ${pn[period]} / ${rn[result]} の対戦記録を削除します。\nこの操作は元に戻せません。実行しますか？`))return;const btn=document.querySelector('[data-v18-run]'),status=document.querySelector('[data-v18-status]');if(btn)btn.disabled=true;if(status){status.className='v18-reset-status';status.textContent='リセット中…'}try{const r=await rpc('admin_reset_battles',{p_owner_token:token(),p_series:series(),p_scope:scope,p_target_id:target,p_period:period,p_result:result});if(status){status.className='v18-reset-status ok';status.textContent=`${Number(r.deleted||0)}件を削除しました。ランキングにも反映されます。`}setTimeout(render,900)}catch(e){if(status){status.className='v18-reset-status err';status.textContent=e.message||String(e)}if(btn)btn.disabled=false}}

  document.addEventListener('change',e=>{if(e.target.matches('[data-v18-scope]')){syncTarget();updatePreview()}else if(e.target.matches('[data-v18-target],[data-v18-period],[data-v18-result]'))updatePreview()},true);
  document.addEventListener('click',e=>{const run=e.target.closest?.('[data-v18-run]');if(run){e.preventDefault();runReset();return}const q=e.target.closest?.('[data-v18-quick]');if(q){e.preventDefault();const scope=document.querySelector('[data-v18-scope]');if(scope)scope.value='all';syncTarget();const period=document.querySelector('[data-v18-period]');if(period)period.value=q.dataset.v18Quick;const result=document.querySelector('[data-v18-result]');if(result)result.value='all';updatePreview();runReset(q.dataset.v18Quick)}},true);

  const obs=new MutationObserver(()=>{style();const c=document.querySelector('#ownerContent');if(c?.classList.contains('admin-v17-reset')&&!c.querySelector('[data-v18-reset-panel]'))setTimeout(render,0)});obs.observe(document.body,{childList:true,subtree:true});style();
})();