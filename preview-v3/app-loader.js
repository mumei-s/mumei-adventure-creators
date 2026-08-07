(() => {
  if (window.__MUMEI_APP_LOADER_RUNNING__) return;
  window.__MUMEI_APP_LOADER_RUNNING__ = true;

  (async () => {
    try {
      const base = new URL('./', location.href);
      const paths = Array.from({ length: 8 }, (_, i) => new URL(`chunks/app-${String(i + 1).padStart(2, '0')}.txt`, base));
      const parts = await Promise.all(paths.map(async (path) => {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) throw new Error(`${path}: ${response.status}`);
        return response.text();
      }));
      new Function(parts.join(''))();
      window.__MUMEI_APP_READY__ = true;
    } catch (error) {
      console.error('[app-loader]', error);
      window.__MUMEI_APP_LOADER_RUNNING__ = false;
      const app = document.querySelector('#app');
      if (app) app.innerHTML = '<section class="page narrow"><div class="panel"><h1>読み込みエラー</h1><p class="lead">通信状態を確認して、もう一度読み込んでください。</p><div class="actions"><button class="primary" onclick="location.reload()">再読み込み</button></div></div></section>';
    }
  })();
})();
