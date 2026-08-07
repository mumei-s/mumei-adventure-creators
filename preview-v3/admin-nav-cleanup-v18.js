(() => {
  'use strict';
  function clean(){
    const nav=document.querySelector('.owner-sticky-nav');
    if(!nav)return;
    if(nav.dataset.v18Clean==='1')return;
    nav.dataset.v18Clean='1';
    const left=nav.querySelector('.owner-sticky-left');
    const right=nav.querySelector('.owner-sticky-right');
    const series=new URLSearchParams(location.search).get('series')==='sengoku'?'sengoku':'adventure';
    if(left) left.innerHTML=`<a class="btn" href="./admin/?series=${series}&v=18#admin">管理トップ</a>`;
    if(right) right.innerHTML=`<a class="btn" href="./?series=${series}&v=18">一般ページを見る</a>`;
  }
  const o=new MutationObserver(clean);o.observe(document.body,{childList:true,subtree:true});clean();
})();