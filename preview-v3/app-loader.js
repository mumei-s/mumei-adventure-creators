(async () => {
  try {
    if (window.MUMEI_BACKEND_READY) await window.MUMEI_BACKEND_READY;
    const base = new URL('./', import.meta.url);
    const paths = Array.from({ length: 8 }, (_, i) => new URL(`chunks/app-${String(i + 1).padStart(2, '0')}.txt`, base));
    const parts = await Promise.all(paths.map(async (path) => {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.text();
    }));
    new Function(parts.join(''))();
  } catch (error) {
    console.error('[app-loader]', error);
    const app = document.querySelector('#app');
    if (app) app.innerHTML = '<section class="page narrow"><div class="panel"><h1>読み込みエラー</h1><p class="lead">ページを更新してください。</p></div></section>';
  }
})();
