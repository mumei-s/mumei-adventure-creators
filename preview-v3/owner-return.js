(() => {
  'use strict';
  if (location.pathname.includes('/admin/')) return;
  const TOKEN_KEY='mumei-owner-token';
  const PERSIST_KEY='mumei-owner-token-persist-v1';
  let hasOwner=!!sessionStorage.getItem(TOKEN_KEY);
  if(!hasOwner){
    try{
      const saved=JSON.parse(localStorage.getItem(PERSIST_KEY)||'null');
      hasOwner=!!(saved?.token&&Number(saved.expiresAt||0)>Date.now());
    }catch{}
  }
  if(!hasOwner)return;
  const series=new URLSearchParams(location.search).get('series')==='sengoku'?'sengoku':'adventure';
  const href=new URL('./admin/',location.href);
  href.searchParams.set('series',series);
  href.searchParams.set('v','admin15');
  href.hash='admin';
  const style=document.createElement('style');
  style.textContent='.owner-return-bar{position:fixed;right:12px;bottom:82px;z-index:99999}.owner-return-bar a{display:block;padding:11px 14px;border-radius:999px;background:#151a2b;color:#f0d17b;border:1px solid rgba(221,183,92,.55);box-shadow:0 10px 30px rgba(0,0,0,.35);font-weight:850;text-decoration:none}';
  document.head.appendChild(style);
  const bar=document.createElement('div');
  bar.className='owner-return-bar';
  bar.innerHTML=`<a href="${href.href}">← 管理画面へ戻る</a>`;
  document.body.appendChild(bar);
})();
