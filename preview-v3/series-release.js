(() => {
  'use strict';

  const KEY = 'mumei-v3-series-release';
  const defaults = { sengokuPublic: false };
  const read = () => {
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) || '{}')) }; }
    catch { return { ...defaults }; }
  };
  const write = value => localStorage.setItem(KEY, JSON.stringify(value));
  const currentSeries = () => window.MUMEI_SERIES?.key || 'adventure';
  const rootUrl = () => window.MUMEI_SERIES?.root || new URL('./', location.href).href;
  const urlFor = (series, hash = '') => {
    const url = new URL(rootUrl());
    url.searchParams.set('series', series);
    url.hash = hash;
    return url.href;
  };

  function isAdminRoute() {
    return location.hash.replace(/^#/, '') === 'admin';
  }

  function guardUnreleasedSeries() {
    const release = read();
    if (currentSeries() === 'sengoku' && !release.sengokuPublic && !isAdminRoute()) {
      location.replace(urlFor('adventure'));
      return true;
    }
    return false;
  }

  function setPublicSeriesVisibility() {
    const showSengoku = read().sengokuPublic;
    document.querySelectorAll('.series-switch,.series-title-links').forEach(group => {
      const sengokuLink = [...group.querySelectorAll('a')].find(a => /戦国|sengoku/i.test(`${a.textContent} ${a.href}`));
      if (sengokuLink && sengokuLink.hidden !== !showSengoku) sengokuLink.hidden = !showSengoku;
      const visibleLinks = [...group.querySelectorAll('a')].filter(a => !a.hidden);
      const shouldHideGroup = visibleLinks.length <= 1;
      if (group.hidden !== shouldHideGroup) group.hidden = shouldHideGroup;
    });
  }

  function renderAdminReleaseControl() {
    const adminPage = document.querySelector('.admin-grid')?.closest('.page');
    if (!adminPage) return;
    let panel = adminPage.querySelector('.series-release-control');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'panel series-release-control';
      const seriesPanel = adminPage.querySelector('.series-admin-panel');
      if (seriesPanel) seriesPanel.after(panel);
      else adminPage.querySelector('.page-title')?.after(panel);
    }
    const on = read().sengokuPublic;
    const stateName = on ? 'on' : 'off';
    if (panel.dataset.releaseState === stateName) return;
    panel.dataset.releaseState = stateName;
    panel.innerHTML = `
      <div class="release-copy">
        <p class="eyebrow">PUBLICATION CONTROL</p>
        <h3>戦国カード名鑑の公開</h3>
        <p class="lead">戦国版は準備が整うまで非公開にできます。非公開中も管理画面から編集できます。</p>
      </div>
      <div class="release-actions">
        <span class="release-status ${on ? 'is-on' : 'is-off'}">${on ? '公開 ON' : '非公開 OFF'}</span>
        <a class="btn" href="${urlFor('sengoku', 'admin')}">戦国版を編集</a>
        <button class="${on ? 'danger' : 'primary'}" type="button" data-toggle-sengoku>${on ? '戦国版を非公開にする' : '戦国版を公開する'}</button>
      </div>`;
  }

  function decorate() {
    setPublicSeriesVisibility();
    renderAdminReleaseControl();
  }

  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-toggle-sengoku]');
    if (!toggle) return;
    const release = read();
    const next = !release.sengokuPublic;
    const message = next
      ? '戦国カード名鑑を公開しますか？公開するとトップの名鑑切替にも表示されます。'
      : '戦国カード名鑑を非公開にしますか？データは削除されません。';
    if (!confirm(message)) return;
    release.sengokuPublic = next;
    write(release);
    const panel = document.querySelector('.series-release-control');
    if (panel) delete panel.dataset.releaseState;
    decorate();
    if (!next && currentSeries() === 'sengoku' && !isAdminRoute()) location.replace(urlFor('adventure'));
  });

  if (guardUnreleasedSeries()) return;

  const start = () => {
    decorate();
    new MutationObserver(() => decorate()).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', () => {
      if (!guardUnreleasedSeries()) decorate();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
