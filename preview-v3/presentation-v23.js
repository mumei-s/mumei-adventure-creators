(() => {
  'use strict';
  const SUPABASE_URL='https://xxhaerjvrgmnadxjqetz.supabase.co';
  const API_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJ4eGhhZXJqdnJnbW5hZHhqcWV0eiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2MDUzMTE0LCJleHAiOjIxMDE2MjkxMTR9.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const BRAND_JOIN=`${SUPABASE_URL}/functions/v1/catalog-brand-assets/join`;
  const BRAND_MAG=`${SUPABASE_URL}/functions/v1/catalog-brand-assets/magazine`;
  const series=()=>window.MUMEI_SERIES?.key || (new URLSearchParams(location.search).get('series')==='sengoku'?'sengoku':'adventure');
  const storageUrl=p=>!p?'':(/^https?:/.test(p)?p:`${SUPABASE_URL}/storage/v1/object/public/creator-images/${p}`);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state=null,decorating=false;

  async function rpc(name,body){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:API_KEY,Authorization:`Bearer ${API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    if(!r.ok) throw new Error(await r.text());
    return await r.json();
  }
  function applyTheme(s={}){
    document.documentElement.style.setProperty('--portal-accent',s.accent_primary||'#2aa7d6');
    document.documentElement.style.setProperty('--portal-gold',s.accent_secondary||'#f2d48a');
    document.body.classList.toggle('route-join',location.hash.replace('#','')==='join');
    const og=s.og_image_url||storageUrl(s.directory_image_path)||BRAND_MAG;
    document.querySelector('meta[property="og:image"]')?.setAttribute('content',og);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute('content',og);
  }
  function portal(pub){
    const s=pub.series||{};
    const isS=series()==='sengoku';
    const joinImg=storageUrl(s.join_image_path)||BRAND_JOIN;
    const magImg=storageUrl(s.magazine_image_path)||BRAND_MAG;
    const title=s.main_title||(isS?'戦国カード名鑑':'冒険クリエイター名鑑');
    return `<section class="portal-v23"><header class="portal-v23-head"><div class="portal-v23-brand">無名S note</div><h1>${esc(title)}</h1><div class="portal-v23-meta">${esc(s.hashtag||'')}　｜　${esc(s.started_label||'')}</div></header><div class="portal-links"><section class="portal-link-block"><h2>参加・募集要項はこちら</h2><a class="portal-image-link" href="${esc(s.recruit_url||'#join')}" ${s.recruit_url?'target="_blank" rel="noopener"':'data-nav="join"'}><img src="${esc(joinImg)}" alt="参加・募集要項"></a></section><section class="portal-link-block"><h2>マガジンはこちら</h2><a class="portal-image-link" href="${esc(s.magazine_url||'#')}" target="_blank" rel="noopener"><img src="${esc(magImg)}" alt="マガジン"></a></section><section class="portal-directory"><p class="eyebrow">OFFICIAL DIRECTORY</p><h2>${esc(title)}はこちら</h2><p>クリエイター一覧・専用ページ・対戦・ランキングを楽しめる名鑑本体です。</p><button class="primary" type="button" data-nav="directory">名鑑を開く</button></section></div></section>`;
  }
  function maintenance(pub){
    const s=pub.series||{};
    document.body.classList.add('portal-maintenance');
    document.querySelector('#app').innerHTML=`<section class="maintenance-v23"><p class="eyebrow">MAINTENANCE</p><h1>${esc(s.title||'無名S note')}</h1><p>${esc(s.maintenance_message||'現在アップデート中です。')}</p></section>`;
  }
  function decorate(){
    if(!state||decorating)return;
    decorating=true;
    try{
      applyTheme(state.series||{});
      if(state.maintenance){ maintenance(state); return; }
      document.body.classList.remove('portal-maintenance');
      const route=location.hash.replace(/^#/,'')||'home';
      document.body.classList.toggle('route-join',route==='join');
      if(route==='home' && document.querySelector('#app .hero') && !document.querySelector('.portal-v23')) document.querySelector('#app').innerHTML=portal(state);
    } finally {decorating=false;}
  }
  async function init(){
    try{state=await rpc('get_public_state',{p_series:series()});decorate();}
    catch(e){console.error('[presentation-v23]',e);}
    new MutationObserver(decorate).observe(document.querySelector('#app'),{childList:true,subtree:true});
    window.addEventListener('hashchange',()=>setTimeout(decorate,0));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();