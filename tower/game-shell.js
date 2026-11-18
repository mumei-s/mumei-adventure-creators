import { DISPLAY_MODE_KEY, DISPLAY_MODES, DISPLAY_LABELS, createDisplayModeController, applyDisplayProfile } from '../halloween-exhibition/preview/display-mode.js';
import { readPadMode, savePadMode, PAD_MODE_KEY } from '../halloween-exhibition/preview/control-preferences.js';
import { readTownPreferences, saveTownPreferences, TOWN_UI_KEY, TOWN_SPEEDS } from '../halloween-exhibition/preview/town/preferences.js';
import { createTownAudio } from '../halloween-exhibition/preview/town/audio.js';

// Keep the same entrance and pre-portal arrival when moving between the two worlds.
export const gameDestinations = Object.freeze([
  { label: 'INSIGHT', url: 'https://mumei-s.github.io/note-insight/' },
  { label: 'Atelier（イラスト作成ツール）', url: new URL('../halloween/', import.meta.url).href },
  { label: '元の街へ戻る（時空の歪みの手前）', url: new URL('../halloween-exhibition/preview/town/?arrival=future-gate', import.meta.url).href },
  { label: 'Atelier Tower トップ', url: new URL('./', import.meta.url).href },
  { label: '近未来街区', url: new URL('../halloween-exhibition/preview/diorama-city/?arrival=tower', import.meta.url).href },
  { label: '魔法の入口（通常の入口）', url: new URL('../halloween-exhibition/preview/', import.meta.url).href },
]);

export function initGameShell({ page = 'tower' } = {}) {
  const doc = document, win = window;
  if (doc.getElementById('game-settings')) return null;
  let storage;
  try { storage = win.localStorage; } catch { /* Preferences still apply to this page. */ }
  const abort = new AbortController(), { signal } = abort;
  const listen = (target, name, action) => target.addEventListener(name, action, { signal });
  const element = (tag, text, className) => {
    const node = doc.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const button = (text, action) => {
    const node = element('button', text); node.type = 'button'; listen(node, 'click', action); return node;
  };
  const paragraph = text => element('p', text, 'game-note');
  function makeDialog(id, title) {
    const modal = element('dialog', '', 'game-dialog'); modal.id = id;
    modal.setAttribute('aria-labelledby', id + '-title');
    const head = element('header', '', 'game-dialog-bar');
    const heading = element('h2', title); heading.id = id + '-title';
    head.append(button('← 戻る', () => modal.close()), heading);
    const content = element('div', '', 'game-dialog-content'); modal.append(head, content); doc.body.append(modal);
    listen(modal, 'click', event => {
      if (event.target !== modal) return;
      const rect = modal.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
    });
    return { modal, content };
  }
  const { modal: settings, content } = makeDialog('game-settings', 'メニュー・設定');
  const nav = element('nav', '', 'game-menu-links'); nav.setAttribute('aria-label', 'Atelierの入口と街');
  for (const item of gameDestinations) {
    const link = element('a', item.label); link.href = item.url; nav.append(link);
  }
  const installOpener = element('button', 'ホーム画面に追加');
  installOpener.type = 'button'; installOpener.dataset.gameInstall = ''; nav.append(installOpener);
  content.append(nav);
  const grid = element('div', '', 'game-settings-grid'); content.append(grid);
  function select(id, title, options) {
    const label = element('label', title); label.htmlFor = id;
    const input = element('select'); input.id = id;
    for (const [value, text] of options) { const option = element('option', text); option.value = value; input.append(option); }
    label.append(input); grid.append(label); return input;
  }
  function range(id, title, initial, change) {
    const label = element('label', title); label.htmlFor = id;
    const output = element('output', String(initial)); output.htmlFor = id;
    const input = element('input'); Object.assign(input, { id, type: 'range', min: '0', max: '100', value: String(initial) });
    label.append(output, input); grid.append(label);
    listen(input, 'input', () => { output.value = input.value; change(Number(input.value)); });
    return { input, output };
  }
  const layout = select('game-layout', '表示サイズ', DISPLAY_MODES.map(value => [value, value === 'auto' ? '自動（画面幅に合わせる）' : DISPLAY_LABELS[value]]));
  const pad = select('game-pad-mode', '方向パッド', [['slide', '指を滑らせて方向を変える'], ['fixed', '矢印の位置で方向を変える']]);
  const speed = select('game-speed', '歩く速さ', TOWN_SPEEDS.map(value => [String(value), `${value}倍${value === 1 ? '（標準）' : ''}`]));
  const motion = select('game-motion', '背景の動き・演出', [['on', 'ON'], ['off', '動きを減らす']]);
  const preferencesStatus = paragraph(''); preferencesStatus.id = 'game-preferences-status'; preferencesStatus.setAttribute('role', 'status');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  let preferences = readTownPreferences(storage).preferences;
  function applyPreferences() {
    doc.body.dataset.gameMotion = reduced.matches || !preferences.motion ? 'reduced' : 'full';
    doc.body.dataset.walkSpeed = String(preferences.speed);
    doc.body.style.setProperty('--game-brightness', String(.4 + preferences.brightness * .008));
    speed.value = String(preferences.speed); motion.value = preferences.motion ? 'on' : 'off';
    motion.disabled = reduced.matches;
    motion.title = reduced.matches ? '端末の「動きを減らす」を優先しています' : '';
    brightness.input.value = String(preferences.brightness); brightness.output.value = String(preferences.brightness);
    pad.value = doc.body.dataset.padMode ?? readPadMode(storage);
    doc.querySelectorAll('.walk-pad').forEach(node => { node.dataset.padMode = pad.value; });
  }
  function savePreferences(patch) {
    const result = saveTownPreferences({ ...preferences, ...patch }, storage);
    preferences = result.preferences;
    preferencesStatus.textContent = result.ok ? '通常の街と同じ設定を、この端末に保存しました。' : 'この画面に適用しました。端末には保存できませんでした。';
    applyPreferences();
  }
  const brightness = range('game-brightness', '背景の明るさ', preferences.brightness, value => savePreferences({ brightness: value }));
  const music = button('音楽をON', () => {
    if (audio.snapshot().enabled) audio.stop(); else void audio.start({ gesture: true });
  });
  music.id = 'game-music'; music.setAttribute('aria-pressed', 'false'); grid.append(music);
  const volume = range('game-volume', '音量', 0, value => audio.setVolume(value));
  const audioStatus = paragraph(''); audioStatus.id = 'game-audio-status'; audioStatus.setAttribute('role', 'status');
  const audio = createTownAudio({ onChange(state) {
    music.textContent = state.enabled ? '音楽をOFF' : '音楽をON'; music.setAttribute('aria-pressed', String(state.enabled));
    volume.input.value = String(state.volume); volume.output.value = String(state.volume); audioStatus.textContent = state.message;
  } });
  content.append(audioStatus, paragraph('音楽は起動時・ページに戻った時にOFF、音量0です。音量を上げてからONを押すと再生します。'),
    paragraph('表示サイズ・方向パッド・歩く速さ・背景の明るさと動きは通常の街と共通です。明るさ75で本来の色になります。'), preferencesStatus);
  listen(volume.input, 'change', () => audio.resumeFromGesture());
  listen(pad, 'change', () => {
    const result = savePadMode(pad.value, storage);
    // Retain an unsaved choice for this page too.
    const choice = result.mode;
    doc.body.dataset.padMode = choice;
    preferencesStatus.textContent = result.ok ? '方向パッドの設定を保存しました。' : 'この画面に適用しました。端末には保存できませんでした。';
    doc.querySelectorAll('.walk-pad').forEach(node => { node.dataset.padMode = choice; });
  });
  listen(speed, 'change', () => savePreferences({ speed: Number(speed.value) }));
  listen(motion, 'change', () => savePreferences({ motion: motion.value === 'on' }));
  doc.body.dataset.gamePage = page;
  const display = createDisplayModeController({ storage, getWidth: () => win.innerWidth, onChange(state) {
    applyDisplayProfile(doc.body, state); layout.value = state.mode;
    doc.dispatchEvent(new CustomEvent('yearbook:layout-change', { detail: { ...state, source: 'tower-game-shell' } }));
    if (!state.saved) preferencesStatus.textContent = '表示サイズはこの画面に適用されます。端末には保存できませんでした。';
  } });
  listen(layout, 'change', () => display.setMode(layout.value));
  listen(win, 'resize', () => display.refresh());
  listen(doc, 'yearbook:layout-change', event => {
    const state = event.detail;
    if (state?.source !== 'tower-game-shell') display.sync(state?.mode, state?.saved !== false);
  });
  listen(win, 'storage', event => {
    if (event.key === null || event.key === DISPLAY_MODE_KEY) display.reload();
    if (event.key === null || event.key === TOWN_UI_KEY || event.key === PAD_MODE_KEY) {
      preferences = readTownPreferences(storage).preferences; delete doc.body.dataset.padMode; applyPreferences();
    }
  });
  reduced.addEventListener('change', applyPreferences, { signal }); applyPreferences();
  let settingsOpener;
  function openSettings(source) {
    settingsOpener = source; if (!settings.open) settings.showModal();
    doc.dispatchEvent(new CustomEvent('atelier:menu-open'));
  }
  listen(settings, 'close', () => { if (settingsOpener?.isConnected) settingsOpener.focus({ preventScroll: true }); });

  const { modal: install, content: installContent } = makeDialog('game-install', 'ホーム画面に追加');
  const guide = paragraph(''), installStatus = paragraph(''); installStatus.setAttribute('role', 'status');
  const nativeInstall = button('このAtelier Towerを追加', async () => {
    const event = installEvent; if (!event) return;
    installEvent = null; nativeInstall.disabled = true;
    try {
      await event.prompt(); const result = await event.userChoice;
      installStatus.textContent = result.outcome === 'accepted' ? '追加の操作を受け付けました。端末側の案内をご確認ください。' : '追加は見送りました。ブラウザでそのまま遊べます。';
    } catch { installStatus.textContent = '追加画面を開けませんでした。ブラウザのメニューをご確認ください。'; }
    finally { nativeInstall.disabled = false; refreshInstall(); }
  });
  nativeInstall.id = 'game-install-native';
  const steps = element('ol', '', 'game-install-steps');
  const towerLink = element('a', 'Atelier Towerの正規URLを開く'); towerLink.href = new URL('./', import.meta.url).href;
  installContent.append(guide, steps, nativeInstall, installStatus, towerLink,
    paragraph('アプリ内ブラウザで項目が出ない場合は、Edge・Chrome・Safariなどの通常のブラウザで正規URLを開いてください。部屋や記事の読み込みには通信が必要です。'));
  let installEvent = null, installed = false, installSource;
  const standalone = win.matchMedia('(display-mode: standalone)');
  function refreshInstall() {
    const active = standalone.matches || win.navigator.standalone === true;
    const apple = /iPhone|iPad|iPod/.test(win.navigator.userAgent) || (win.navigator.platform === 'MacIntel' && win.navigator.maxTouchPoints > 1);
    guide.textContent = active ? 'アプリ表示で開いています。' : installed ? 'ホーム画面への追加が完了しました。' : installEvent ? '下の追加ボタンから端末側の案内へ進めます。' : 'ブラウザのメニューからホーム画面やアプリ一覧へ追加できます。';
    nativeInstall.hidden = !installEvent || active || installed;
    steps.replaceChildren();
    for (const text of apple ? ['Safariで正規URLを開きます。', '共有メニューから「ホーム画面に追加」を選びます。', '表示された名前を確認して「追加」を押します。'] :
      ['Edge・Chromeなどで正規URLを開きます。', 'ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選びます。', '端末側の案内に沿って追加します。']) steps.append(element('li', text));
    steps.hidden = active || installed;
  }
  listen(win, 'beforeinstallprompt', event => { event.preventDefault(); installEvent = event; refreshInstall(); });
  listen(win, 'appinstalled', () => { installed = true; installEvent = null; refreshInstall(); });
  standalone.addEventListener('change', refreshInstall, { signal });
  listen(install, 'close', () => { if (installSource?.isConnected) installSource.focus({ preventScroll: true }); });
  listen(doc, 'click', event => {
    const settingsButton = event.target.closest('[data-game-settings]'), installButton = event.target.closest('[data-game-install]');
    if (settingsButton) openSettings(settingsButton);
    if (installButton) {
      installSource = installButton; refreshInstall(); if (!install.open) install.showModal();
      doc.dispatchEvent(new CustomEvent('atelier:menu-open'));
    }
  });
  const mute = () => audio.stop({ resetVolume: true });
  listen(win, 'blur', mute); listen(win, 'pagehide', mute);
  listen(doc, 'visibilitychange', () => { if (doc.hidden) mute(); });
  listen(win, 'pageshow', () => {
    mute(); display.reload(); preferences = readTownPreferences(storage).preferences; applyPreferences(); refreshInstall();
  });
  refreshInstall();
  return {
    audio, display, get preferences() { return { ...preferences }; },
    motionAllowed: () => !reduced.matches && preferences.motion,
    destroy() { abort.abort(); audio.destroy(); settings.remove(); install.remove(); },
  };
}
