(() => {
  'use strict';
  const FALLBACK_RECRUIT='https://note.com/ss_yr/n/nf34d092b4032';
  const state=()=>{try{return JSON.parse(localStorage.getItem('mumei-v3-state')||'{}')}catch{return{}}};
  const recruitUrl=()=>state()?.settings?.recruitUrl||FALLBACK_RECRUIT;

  function addHomeCta(){
    if(location.hash && location.hash!=='#home')return;
    const hero=document.querySelector('#app .hero');
    if(!hero||hero.querySelector('[data-v18-recruit]'))return;
    const actions=hero.querySelector('.actions')||hero;
    const a=document.createElement('a');
    a.className='btn v18-recruit-cta';a.dataset.v18Recruit='1';a.href=recruitUrl();a.target='_blank';a.rel='noopener';
    a.innerHTML='<b>参加企画の記事を読む</b><span>参加方法・ルールはこちら</span>';
    actions.appendChild(a);
  }

  function addJoinCta(){
    if(location.hash!=='#join')return;
    const page=document.querySelector('#app .page');
    const form=document.querySelector('#joinForm');
    if(!page||!form||page.querySelector('[data-v18-join-article]'))return;
    const box=document.createElement('section');
    box.className='panel v18-join-article';box.dataset.v18JoinArticle='1';
    box.innerHTML=`<p class="eyebrow">BEFORE ENTRY</p><h3>参加前に企画記事を確認</h3><p class="lead">参加方法・企画内容・名鑑の説明はこちらの記事にまとめています。</p><a class="primary" href="${recruitUrl()}" target="_blank" rel="noopener">無名S noteの参加企画記事を読む</a>`;
    form.before(box);
  }

  function style(){
    if(document.querySelector('#flowV18Style'))return;
    const s=document.createElement('style');s.id='flowV18Style';s.textContent=`
      .v18-recruit-cta{display:inline-flex!important;flex-direction:column;align-items:flex-start!important;gap:2px;border-color:rgba(242,212,138,.55)!important;background:rgba(242,212,138,.07)!important}.v18-recruit-cta b{color:var(--gold2)}.v18-recruit-cta span{font-size:11px;color:var(--muted)}
      .v18-join-article{margin:0 0 18px;border-color:rgba(242,212,138,.48)!important}.v18-join-article h3{margin:0 0 8px}.v18-join-article .primary{margin-top:10px}
      @media(max-width:650px){.v18-recruit-cta{width:100%}.v18-join-article .primary{width:100%}}
    `;document.head.appendChild(s)
  }

  const obs=new MutationObserver(()=>{style();addHomeCta();addJoinCta()});
  obs.observe(document.body,{childList:true,subtree:true});style();addHomeCta();addJoinCta();
})();