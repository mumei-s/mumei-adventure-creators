(() => {
  'use strict';

  const VERSION = 'fix11';
  const originalAppend = Node.prototype.appendChild;

  Node.prototype.appendChild = function(child) {
    try {
      if (child?.tagName === 'SCRIPT' && /\/app-loader\.js(?:\?|$)/.test(child.src || '')) {
        const url = new URL(child.src, location.href);
        url.searchParams.set('v', VERSION);
        child.src = url.href;
        Node.prototype.appendChild = originalAppend;
      }
    } catch (error) {
      console.error('[loader-fix]', error);
    }
    return originalAppend.call(this, child);
  };

  setTimeout(() => {
    const app = document.querySelector('#app');
    if (!app || window.__MUMEI_APP_READY__) return;
    if (!/読み込み中|共有データを取得/.test(app.textContent || '')) return;

    if (!window.__MUMEI_APP_LOADER_RUNNING__) {
      const script = document.createElement('script');
      script.src = `./app-loader.js?v=${VERSION}`;
      script.dataset.mumeiFailsafe = 'true';
      document.body.appendChild(script);
    }

    setTimeout(() => {
      if (window.__MUMEI_APP_READY__) return;
      if (/読み込み中|共有データを取得/.test(app.textContent || '')) {
        app.innerHTML = '<section class="page narrow"><div class="panel"><p class="eyebrow">CONNECTION RETRY</p><h1>接続に時間がかかっています</h1><p class="lead">画面が固まったままにはしません。通信状態を確認して再読み込みしてください。</p><div class="actions"><button class="primary" onclick="location.reload()">再読み込み</button></div></div></section>';
      }
    }, 4000);
  }, 8000);
})();
