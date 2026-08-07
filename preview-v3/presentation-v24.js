(() => {
  'use strict';
  const SUPABASE_URL='https://xxhaerjvrgmnadxjqetz.supabase.co';
  const API_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJ4eGhhZXJqdnJnbW5hZHhqcWV0eiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2MDUzMTE0LCJleHAiOjIxMDE2MjkxMTR9.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const BRAND_JOIN=`${SUPABASE_URL}/functions/v1/catalog-brand-assets/join`;
  const BRAND_MAG=`${SUPABASE_URL}/functions/v1/catalog-brand-assets/magazine`;
  const series=()=>new URLSearchParams(location.search).get('series')==='sengoku'?'sengoku':'adventure';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storageUrl=p=>!p?'':(/^https?:/.test(p)?p:`${SUPABASE_URL}/storage/v1/object/public/creator-images/${p}`);
  let pub=null;
  async function rpc(name,body){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:API_KEY,Authorization:`Bearer ${API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    if(!r.ok) throw new Error(await r.text());
    return await r.json();
  }
  function route(){return location.hash.replace(/^#/,'')||'home'}
  function theme(){
    document.documentElement.dataset.series=series();
    document.body.classList.toggle('v24-sengoku',series()==='sengoku');
    document.body.classList.toggle('route-join',route()==='join');
  }
  function homeHtml(){
    const s=pub?.series||{};
    const isS=series()==='sengoku';
    const title=s.main_title||(isS?'戦国カード名鑑':'冒険クリエイター名鑑');
    const joinImg=storageUrl(s.join_image_path)||BRAND_JOIN;
    const magImg=storageUrl(s.magazine_image_path)||BRAND_MAG;
    const joinHref=s.recruit_url||'#join';
    const magHref=s.magazine_url||'#';
    return `<section class="portal-v24"><header class="portal-v24-head"><div class="portal-v24-brand">無名S note</div><h1>${esc(title)}</h1><div class="portal-v24-meta">${esc(s.hashtag||'')}　｜　${esc(s.started_label||'')}</div></header><div class="portal-v24-links"><section class="portal-v24-block"><h2>参加・募集要項はこちら</h2><a class="portal-v24-image" href="${esc(joinHref)}" ${joinHref.startsWith('http')?'target="_blank" rel="noopener"':''}><img src="${esc(joinImg)}" alt="参加・募集要項"></a></section><section class="portal-v24-block"><h2>マガジンはこちら</h2><a class="portal-v24-image portal-v24-mag" href="${esc(magHref)}" target="_blank" rel="noopener"><img src="${esc(magImg)}" alt="マガジン"></a></section><section class="portal-v24-directory"><div class="portal-v24-kicker">OFFICIAL DIRECTORY</div><h2>${esc(title)}はこちら</h2><p>クリエイター一覧・個別ページ・対戦・ランキングを楽しめる名鑑本体です。</p><a class="portal-v24-open" href="#directory">名鑑を開く</a></section></div></section>`;
  }
  function maintenanceHtml(){
    const s=pub?.series||{};
    return `<section class="maintenance-v24"><div class="portal-v24-kicker">MAINTENANCE</div><h1>${esc(s.title||'無名S note')}</h1><p>${esc(s.maintenance_message||'現在アップデート中です。')}</p></section>`;
  }
  function apply(){
    theme();
    const app=document.querySelector('#app');
    if(!app||!pub)return;
    if(pub.maintenance){if(!app.querySelector('.maintenance-v24'))app.innerHTML=maintenanceHtml();return;}
    if(route()==='home'&&!app.querySelector('.portal-v24'))app.innerHTML=homeHtml();
  }
  async function init(){
    try{pub=await rpc('get_public_state',{p_series:series()});apply();}
    catch(e){console.error('[presentation-v24]',e);return;}
    const app=document.querySelector('#app');
    if(app)new MutationObserver(()=>{if(route()==='home'&&!app.querySelector('.portal-v24'))apply()}).observe(app,{childList:true});
    window.addEventListener('hashchange',()=>setTimeout(apply,0));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();