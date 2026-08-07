(() => {
  'use strict';
  const SUPABASE_URL='https://xxhaerjvrgmnadxjqetz.supabase.co';
  const API_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJ4eGhhZXJqdnJnbW5hZHhqcWV0eiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2MDUzMTE0LCJleHAiOjIxMDE2MjkxMTR9.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const TOKEN_KEY='mumei-owner-token';
  const PERSIST_KEY='mumei-owner-token-persist-v1';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const series=()=>new URLSearchParams(location.search).get('series')==='sengoku'?'sengoku':'adventure';
  const storageUrl=p=>!p?'':(/^https?:/.test(p)?p:`${SUPABASE_URL}/storage/v1/object/public/creator-images/${p}`);
  function token(){
    const s=sessionStorage.getItem(TOKEN_KEY); if(s)return s;
    try{const v=JSON.parse(localStorage.getItem(PERSIST_KEY)||'null');if(v?.token&&Number(v.expiresAt)>Date.now())return String(v.token)}catch{}
    return '';
  }
  async function rpc(name,body={}){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:API_KEY,Authorization:`Bearer ${API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.message||d?.error||String(d));return d;
  }
  function removeQuick(){
    document.querySelectorAll('h2,h3,h4,b,strong').forEach(n=>{if((n.textContent||'').trim()==='よく使う機能'){const box=n.closest('section,.panel,.card');if(box)box.remove();}});
  }
  function addTab(){
    removeQuick();
    const tabs=document.querySelector('.owner-tabs');
    if(!tabs||tabs.querySelector('[data-display-v24]'))return;
    const b=document.createElement('button');b.type='button';b.dataset.displayV24='1';b.textContent='表示・公開';tabs.insertBefore(b,tabs.children[1]||null);
  }
  function asset(key,title,path){const src=storageUrl(path);return `<article class="v24-asset">${src?`<img src="${esc(src)}" alt="${esc(title)}">`:'<div class="empty">画像未設定</div>'}<div class="v24-asset-body"><b>${esc(title)}</b><input type="file" accept="image/jpeg,image/png,image/webp" data-v24-file="${key}"><button type="button" class="btn" data-v24-upload="${key}">画像を保存</button></div></article>`}
  async function show(){
    const content=document.querySelector('#ownerContent');if(!content)return;
    content.innerHTML='<section class="panel"><h3>表示・公開</h3><p class="lead">設定を読み込んでいます…</p></section>';
    document.querySelectorAll('.owner-tabs button').forEach(x=>x.classList.remove('active'));document.querySelector('[data-display-v24]')?.classList.add('active');
    try{
      const snap=await rpc('admin_snapshot',{p_owner_token:token(),p_series:series()});const s=snap.series||{};
      content.innerHTML=`<section class="panel v24-display"><p class="eyebrow">PUBLIC DISPLAY</p><h3>表示・公開</h3><label class="v24-toggle"><input id="v24Maintenance" type="checkbox" ${s.maintenance_mode?'checked':''}><span><b>メンテナンスモード</b><small>ON中は一般画面をメンテナンス表示にします。</small></span></label><label class="form-label"><span>メンテナンス表示文</span><textarea class="field" id="v24Message">${esc(s.maintenance_message||'現在アップデート中です。')}</textarea></label><div class="v24-assets">${asset('join','参加・募集要項',s.join_image_path)}${asset('magazine','マガジン',s.magazine_image_path)}${asset('og','名鑑リンクカード',s.og_image_url)}</div><div class="v24-colors"><label class="form-label"><span>メインカラー</span><input type="color" id="v24Primary" value="${esc(s.accent_primary||(series()==='sengoku'?'#82141d':'#23a7d0'))}"></label><label class="form-label"><span>アクセント</span><input type="color" id="v24Secondary" value="${esc(s.accent_secondary||'#f1d27d')}"></label></div><div class="actions"><button class="primary" type="button" data-v24-save>表示設定を保存</button><button class="btn" type="button" data-v24-back>← 管理トップへ戻る</button></div></section>`;
    }catch(e){content.innerHTML=`<section class="panel"><h3>表示・公開</h3><p class="owner-login-error">${esc(e.message||e)}</p><button class="btn" type="button" data-v24-back>← 管理トップへ戻る</button></section>`;}
  }
  async function upload(kind){
    const input=document.querySelector(`[data-v24-file="${kind}"]`);const file=input?.files?.[0];if(!file)return alert('画像を選択してください。');
    const f=new FormData();f.set('kind','site-asset');f.set('owner_token',token());f.set('series_id',series());f.set('asset',kind);f.set('file',file);
    const r=await fetch(`${SUPABASE_URL}/functions/v1/catalog-image-upload`,{method:'POST',body:f});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'画像保存に失敗しました');await show();alert('画像を保存しました。');
  }
  async function save(){
    const snap=await rpc('admin_snapshot',{p_owner_token:token(),p_series:series()});const s=snap.series||{};
    await rpc('admin_update_presentation',{p_owner_token:token(),p_series:series(),p_maintenance:!!document.querySelector('#v24Maintenance')?.checked,p_maintenance_message:document.querySelector('#v24Message')?.value||'',p_accent_primary:document.querySelector('#v24Primary')?.value||s.accent_primary,p_accent_secondary:document.querySelector('#v24Secondary')?.value||s.accent_secondary,p_page_tone:series(),p_join_image_path:s.join_image_path||'',p_magazine_image_path:s.magazine_image_path||'',p_directory_image_path:s.directory_image_path||'',p_og_image_url:s.og_image_url||''});alert('表示設定を保存しました。');
  }
  document.addEventListener('click',e=>{
    const d=e.target.closest('[data-display-v24]');if(d){e.preventDefault();show();return;}
    const u=e.target.closest('[data-v24-upload]');if(u){e.preventDefault();upload(u.dataset.v24Upload).catch(x=>alert(`処理できませんでした：${x.message}`));return;}
    if(e.target.closest('[data-v24-save]')){e.preventDefault();save().catch(x=>alert(`処理できませんでした：${x.message}`));return;}
    if(e.target.closest('[data-v24-back]')){e.preventDefault();document.querySelector('[data-owner-tab="overview"]')?.click();return;}
    if(e.target.closest('[data-owner-tab]'))setTimeout(removeQuick,0);
  },true);
  let tries=0;const timer=setInterval(()=>{addTab();removeQuick();if(++tries>30)clearInterval(timer)},250);
})();