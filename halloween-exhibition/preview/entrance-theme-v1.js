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
  magic.textContent = '通常';
  magic.setAttribute('aria-label', '通常Atelierのテーマ');
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
    const subtitle = document.querySelector('#site-title > small');
    if (subtitle) subtitle.textContent = '魔法の入口🚪';
    if (status) status.textContent = isHalloween ? '星あかりのハロウィン宮殿' : '魔法の入口';
    if (note) note.textContent = isHalloween ? originalNote : '扉の向こうで、物語が待っています。';
    document.title = isHalloween ? defaultTitle : magicTitle;
    const image = document.getElementById('palace-image');
    const source = image?.parentElement?.querySelector('source');
    const prefix = isHalloween ? 'palace' : 'palace-normal';
    const desktop = `./assets/palace/${prefix}-desktop.webp`;
    const portrait = `./assets/palace/${prefix}-phone.webp`;
    if (source && source.getAttribute('srcset') !== portrait) source.setAttribute('srcset', portrait);
    if (image && image.getAttribute('src') !== desktop) image.setAttribute('src', desktop);
    if (persist) {
      try { localStorage.setItem(key, theme); } catch { /* Optional. */ }
    }
  };

  // Select the entrance here; theater.js opens the corresponding collection
  // after the existing gate animation. Returning always restores this gate.
  let restoringArchive = false;
  function restoreArchive() {
    if (root.dataset.mode !== 'normal') return;
    restoringArchive = true;
    try { halloween.click(); } finally { restoringArchive = false; }
  }
  magic.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    restoreArchive();
    apply('fantasy');
  }, true);
  halloween.addEventListener('click', () => {
    // The legacy gallery handler remains responsible for selecting the archive.
    if (!restoringArchive) queueMicrotask(() => apply('halloween'));
  }, true);

  apply(theme, false);
  const titleObserver = new MutationObserver(() => {
    const expected = theme === 'halloween' ? '🎃Halloween Atelier' : 'Atelier';
    if (textNode()?.textContent !== expected) apply(theme, false);
  });
  titleObserver.observe(document.getElementById('site-title'), { childList: true, subtree: true });
  window.addEventListener('pagehide', () => titleObserver.disconnect(), { once: true });
  // Move the original live controls; retain their handlers, count and lifecycle.
  // The creator district is a real town route; the roster remains in Settings.
  function arrangeControls() {
    const toolbar = root.querySelector('.toolbar-primary');
    const settings = document.querySelector('.visitor-preferences');
    const exit = document.getElementById('app-exit');
    const counter = document.getElementById('castle-visit-counter');
    const roster = document.getElementById('list-open');
    if (toolbar) {
      for (const control of [exit, counter]) {
        if (control && control.parentElement !== toolbar) toolbar.append(control);
      }
    }
    if (settings && roster && roster.parentElement !== settings) settings.append(roster);
    return Boolean(toolbar && settings && exit && counter && roster);
  }
  if (!arrangeControls()) {
    const controlsObserver = new MutationObserver(() => {
      if (arrangeControls()) controlsObserver.disconnect();
    });
    controlsObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => controlsObserver.disconnect(), { once: true });
  }
  let dayResidents;
  function prepareDayResidents() {
    if (root.dataset.theaterReady !== 'ready' || root.dataset.homeTheme !== 'fantasy' || dayResidents) return;
    dayResidents = import('./palace-day-residents.js?v=20261108-normal1')
      .then(module => module.initPalaceDayResidents(root))
      .catch(() => { dayResidents = null; });
  }
  const residentObserver = new MutationObserver(prepareDayResidents);
  residentObserver.observe(root, { attributes: true, attributeFilter: ['data-theater-ready', 'data-home-theme'] });
  prepareDayResidents();
  window.addEventListener('pagehide', () => residentObserver.disconnect(), { once: true });
  // A visitor with the former normal-mode preference should land at the same
  // gate, without deleting the normal-mode collection or other preferences.
  let readyHandled = false;
  function afterReady() {
    if (root.dataset.theaterReady !== 'ready') return;
    if (readyHandled) return;
    readyHandled = true;
    restoreArchive();
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
