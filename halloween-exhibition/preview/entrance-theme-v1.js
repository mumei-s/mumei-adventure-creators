/* Theme-only switch on the original TOP controls. No dimensions or markup reflow. */
(() => {
  'use strict';
  const root = document.getElementById('theater');
  const magic = document.getElementById('mode-normal');
  const halloween = document.getElementById('mode-halloween');
  if (!root || !magic || !halloween) return;

  const key = 'magic-entrance:theme:v1';
  const defaultTitle = '無名S note / 🎃Halloween Atelier / 魔法の入口🚪';
  const magicTitle = '無名S note / Atelier / 魔法の入口🚪';
  const textNode = () => document.querySelector('#site-title > strong');
  const status = document.getElementById('palace-scene-title');
  const note = document.querySelector('.palace-scene-note');
  const originalNote = note?.textContent || '';

  // Keep the existing switch size and styling; only rename the paused normal slot.
  magic.textContent = '魔法';
  magic.setAttribute('aria-label', '魔法の入口のテーマ');
  halloween.setAttribute('aria-label', 'ハロウィーンのテーマ');

  let theme = 'fantasy';
  try {
    if (localStorage.getItem(key) === 'halloween') theme = 'halloween';
  } catch { /* A blocked local store must not disable navigation. */ }

  const apply = (next, persist = true) => {
    theme = next === 'halloween' ? 'halloween' : 'fantasy';
    root.dataset.homeTheme = theme;
    const isHalloween = theme === 'halloween';
    magic.setAttribute('aria-pressed', String(!isHalloween));
    halloween.setAttribute('aria-pressed', String(isHalloween));
    const heading = textNode();
    if (heading) heading.textContent = isHalloween ? '🎃Halloween Atelier' : 'Atelier';
    if (status) status.textContent = isHalloween ? '星あかりのハロウィン宮殿' : '魔法の入口';
    if (note) note.textContent = isHalloween ? originalNote : '扉の向こうで、物語が待っています。';
    document.title = isHalloween ? defaultTitle : magicTitle;
    if (persist) {
      try { localStorage.setItem(key, theme); } catch { /* Optional. */ }
    }
  };

  // The old normal collection stays in the implementation, but its button now
  // switches entrance decoration, not collection data or gallery state.
  magic.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (root.dataset.mode === 'normal') halloween.click();
    apply('fantasy');
  }, true);
  halloween.addEventListener('click', () => {
    // The legacy gallery handler remains responsible for selecting the archive.
    queueMicrotask(() => apply('halloween'));
  }, true);

  apply(theme, false);
  // A visitor with the former normal-mode preference should land at the same
  // gate, without deleting the normal-mode collection or other preferences.
  let readyHandled = false;
  function afterReady() {
    if (root.dataset.theaterReady !== 'ready') return;
    if (readyHandled) return;
    readyHandled = true;
    if (root.dataset.mode === 'normal') halloween.click();
    apply(theme, false);
    observer?.disconnect();
  }
  const observer = typeof MutationObserver === 'function'
    ? new MutationObserver(afterReady) : null;
  observer?.observe(root, { attributes: true, attributeFilter: ['data-theater-ready'] });
  afterReady();
  window.addEventListener('pagehide', () => observer?.disconnect(), { once: true });

  // Extend the existing Settings > Home add dialog; never add a TOP button.
  const canonical = document.querySelector('link[rel="canonical"]')?.href
    || new URL('./', location.href).href;
  function attachCopy() {
    const guide = document.querySelector('dialog.pwa-guide');
    if (!guide) return false;
    if (guide.querySelector('.entrance-url-copy')) return true;
    const section = document.createElement('section');
    section.className = 'entrance-url-copy';
    section.style.cssText = 'margin:10px 0;padding:8px 0;border-top:1px solid currentColor';
    const label = document.createElement('label');
    label.textContent = '正規URL';
    label.htmlFor = 'entrance-canonical-url';
    const url = document.createElement('input');
    url.id = 'entrance-canonical-url';
    url.type = 'text';
    url.readOnly = true;
    url.value = canonical;
    url.style.cssText = 'display:block;box-sizing:border-box;width:100%;min-width:0;margin:5px 0;padding:8px;font-size:12px';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = '正規URLをコピー';
    copy.style.cssText = 'min-height:44px;padding:7px 12px';
    const feedback = document.createElement('p');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.style.cssText = 'margin:4px 0 0;font-size:12px';
    copy.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(canonical);
        feedback.textContent = '正規URLをコピーしました。';
      } catch {
        url.focus();
        url.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch { /* unsupported */ }
        feedback.textContent = copied ? '正規URLをコピーしました。' : 'URLを選択しました。長押しでコピーできます。';
      }
    });
    section.append(label, url, copy, feedback);
    const steps = guide.querySelector('.pwa-steps');
    if (steps) steps.before(section);
    else guide.append(section);
    return true;
  }
  if (!attachCopy() && typeof MutationObserver === 'function') {
    const watcher = new MutationObserver(() => {
      if (attachCopy()) watcher.disconnect();
    });
    watcher.observe(document.body, {childList:true});
    window.addEventListener('pagehide', () => watcher.disconnect(), {once:true});
  }
})();