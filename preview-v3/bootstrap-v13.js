(() => {
  'use strict';
  const V = 'admin14';
  const load = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`load failed: ${src}`));
    document.body.appendChild(s);
  });

  const currentSeries = () => new URLSearchParams(location.search).get('series') === 'sengoku' ? 'sengoku' : 'adventure';
  const adminUrl = () => {
    const u = new URL('./admin/', location.href);
    u.searchParams.set('series', currentSeries());
    u.searchParams.set('v', V);
    u.hash = 'admin';
    return u.href;
  };
  const isAdmin = () => location.hash.replace(/^#/, '') === 'admin';

  // 旧URLで#adminを開いても、一般ルーターには渡さず専用管理ページへ移動する。
  if (isAdmin()) {
    location.replace(adminUrl());
    return;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-nav="admin"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = adminUrl();
  }, true);

  load(`./loader-fix.js?v=${V}`)
    .then(() => load(`./db-loader.js?v=${V}`))
    .catch(error => {
      console.error('[public-bootstrap]', error);
      const app = document.querySelector('#app');
      if (app) app.innerHTML = '<section class="page narrow"><div class="panel"><h1>読み込みエラー</h1><p class="lead">ページを再読み込みしてください。</p><div class="actions"><button class="primary" onclick="location.reload()">再読み込み</button></div></div></section>';
    });
})();
