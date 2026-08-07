(() => {
  'use strict';
  const V = 'admin13';
  const load = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`load failed: ${src}`));
    document.body.appendChild(s);
  });

  const isAdmin = () => location.hash.replace(/^#/, '') === 'admin';

  if (isAdmin()) {
    load(`./admin-app.js?v=${V}`).catch(error => {
      console.error('[admin-bootstrap]', error);
      const app = document.querySelector('#app');
      if (app) app.innerHTML = '<section class="page narrow"><div class="panel"><h1>管理画面を読み込めませんでした</h1><p class="lead">再読み込みしてください。</p><div class="actions"><button class="primary" onclick="location.reload()">再読み込み</button></div></div></section>';
    });
    return;
  }

  // 一般ページ側の「管理」は旧ルーターへ渡さず、専用管理画面へ直接移動する。
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-nav="admin"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const url = new URL(location.href);
    url.hash = 'admin';
    url.searchParams.set('v', V);
    location.href = url.href;
  }, true);

  load(`./loader-fix.js?v=${V}`)
    .then(() => load(`./db-loader.js?v=${V}`))
    .catch(error => {
      console.error('[public-bootstrap]', error);
      const app = document.querySelector('#app');
      if (app) app.innerHTML = '<section class="page narrow"><div class="panel"><h1>読み込みエラー</h1><p class="lead">ページを再読み込みしてください。</p><div class="actions"><button class="primary" onclick="location.reload()">再読み込み</button></div></div></section>';
    });
})();
