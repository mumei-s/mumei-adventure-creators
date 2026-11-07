/* Shared fantasy/Halloween home. Existing gallery and gate own all navigation state. */
(function () {
  'use strict';
  const root = document.getElementById('theater');
  const home = document.getElementById('magic-home-navigation');
  if (!root || !home) return;

  const fantasyLabel = '魔法の入口 — 物語の宮殿';
  const halloweenLabel = '星あかりのハロウィン宮殿';
  const description = root.querySelector('#palace-scene-title');
  const note = root.querySelector('.palace-scene-note');
  const defaultNote = note?.textContent || '';
  const storageKey = 'magic-entrance:home-theme:v1';
  let theme = 'fantasy';
  try {
    if (localStorage.getItem(storageKey) === 'halloween') theme = 'halloween';
  } catch { /* Storage is optional. */ }

  function setTheme(next, save = true) {
    theme = next === 'halloween' ? 'halloween' : 'fantasy';
    root.dataset.homeTheme = theme;
    for (const button of home.querySelectorAll('[data-home-theme-select]')) {
      button.setAttribute('aria-pressed', String(button.dataset.homeThemeSelect === theme));
    }
    if (description) description.textContent = theme === 'fantasy' ? fantasyLabel : halloweenLabel;
    if (note) note.textContent = theme === 'fantasy' ?
      '扉の向こうに、まだ知らない物語がある。' : defaultNote;
    if (save) { try { localStorage.setItem(storageKey, theme); } catch { /* Optional. */ } }
  }
  setTheme(theme, false);
  home.addEventListener('click', (event) => {
    const themeButton = event.target.closest('[data-home-theme-select]');
    if (themeButton) { setTheme(themeButton.dataset.homeThemeSelect); return; }
    const action = event.target.closest('[data-home-action]');
    if (!action) return;
    const status = home.querySelector('#magic-home-status');
    switch (action.dataset.homeAction) {
      case 'settings':
      case 'music': {
        const open = document.querySelector('#theater .visitor-settings-trigger');
        if (open) open.click();
        else if (status) status.textContent = '設定を読み込んでいます。';
        break;
      }
      case 'creators': {
        const open = document.getElementById('list-open');
        if (open) open.click();
        else if (status) status.textContent = '参加者一覧を準備しています。';
        break;
      }
      case 'portal': {
        const door = document.getElementById('palace-gate');
        if (door && !door.disabled) door.click();
        else if (status) status.textContent = '扉を準備しています。';
        break;
      }
      case 'coming': {
        if (status) status.textContent = 'この項目の行き先は未登録です。';
        break;
      }
    }
  });

  // A prior saved "normal exhibition" choice must not bypass the newly shared
  // fantasy/Halloween entrance; the legacy normal collection remains in code.
  const params = new URLSearchParams(location.search);
  if (params.get('mode') !== 'normal') {
    const restoreEntrance = () => {
      if (root.dataset.mode !== 'normal') return true;
      const halloweenMode = document.getElementById('mode-halloween');
      if (!halloweenMode) return false;
      halloweenMode.click();
      return root.dataset.mode === 'halloween';
    };
    if (!restoreEntrance()) {
      const gateObserver = new MutationObserver(() => {
        if (restoreEntrance()) gateObserver.disconnect();
      });
      gateObserver.observe(root, {attributes:true, attributeFilter:['data-mode']});
      window.addEventListener('pagehide', () => gateObserver.disconnect(), {once:true});
    }
  }

  // The installer is part of the existing bundled gallery entry. The extension
  // is attached once its dialog exists; no rebuild of the gallery bundle needed.
  function attachCanonicalCopy() {
    const dialog = document.querySelector('dialog.pwa-guide');
    if (!dialog) return false;
    if (dialog.querySelector('.pwa-canonical')) return true;
    const canonical = document.querySelector('link[rel="canonical"]')?.href ||
      new URL('./', location.href).href;
    const box = document.createElement('section');
    box.className = 'pwa-canonical';
    const label = document.createElement('label');
    label.textContent = '魔法の入口の正規URL';
    label.htmlFor = 'magic-home-canonical-url';
    const field = document.createElement('input');
    field.id = 'magic-home-canonical-url';
    field.type = 'text';
    field.readOnly = true;
    field.spellcheck = false;
    field.autocomplete = 'off';
    field.value = canonical;
    field.setAttribute('aria-label', '魔法の入口の正規URL');
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = '正規URLをコピー';
    const feedback = document.createElement('small');
    feedback.setAttribute('role','status');
    feedback.setAttribute('aria-live','polite');
    copy.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(canonical);
        feedback.textContent = 'コピーしました。URL末尾のバージョン番号は含みません。';
      } catch {
        field.focus();
        field.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch { /* unavailable */ }
        feedback.textContent = copied ?
          'コピーしました。' : 'URLを選択しました。長押しでコピーしてください。';
      }
    });
    box.append(label, field, copy, feedback);
    const steps = dialog.querySelector('.pwa-steps');
    if (steps) steps.before(box);
    else dialog.append(box);
    return true;
  }
  if (!attachCanonicalCopy()) {
    const observer = new MutationObserver(() => {
      if (attachCanonicalCopy()) observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:false});
    window.addEventListener('pagehide', () => observer.disconnect(), {once:true});
  }
}());