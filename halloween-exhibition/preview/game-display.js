/** Display preferences belong to the game previews, independently of progress and audio. */
export const GAME_DISPLAY_KEY = 'halloween-exhibition:preview:game-display:v1';

const objectValue = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const stepped = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(min, Math.min(max, Math.round(value / 5) * 5)) : fallback;

export function normalizeGameDisplayPreferences(value) {
  const input = objectValue(value);
  return {
    size: stepped(input.size, 70, 100, 100),
    controlSize: stepped(input.controlSize, 100, 125, 100),
    side: input.side === 'right' ? 'right' : 'left',
  };
}

export function readGameDisplayPreferences(storage) {
  try {
    const raw = storage?.getItem(GAME_DISPLAY_KEY);
    return normalizeGameDisplayPreferences(raw == null ? undefined : JSON.parse(raw));
  } catch { return normalizeGameDisplayPreferences(); }
}

export function writeGameDisplayPreferences(storage, value) {
  try {
    if (!storage) return false;
    storage.setItem(GAME_DISPLAY_KEY, JSON.stringify(normalizeGameDisplayPreferences(value)));
    return true;
  } catch { return false; }
}

export function createGameDisplayController({ storage, onChange = () => {}, onPersistence = () => {} } = {}) {
  let preferences = readGameDisplayPreferences(storage);
  const getPreferences = () => ({ ...preferences });
  const setPreferences = value => {
    preferences = normalizeGameDisplayPreferences({ ...preferences, ...objectValue(value) });
    // Apply choices even when persistence is denied or full.
    onChange(getPreferences());
    onPersistence(writeGameDisplayPreferences(storage, preferences));
    return getPreferences();
  };
  onChange(getPreferences());
  return { getPreferences, setPreferences, fitToScreen: () => setPreferences({ size: 100 }) };
}

let instance = 0;

/** With no controlsParent, apply saved choices without adding another settings UI. */
export function initGameDisplay({ controlsParent, page = 'maze', onChange = () => {} } = {}) {
  const doc = document, root = doc.documentElement;
  let storage;
  try { storage = globalThis.localStorage; } catch {}
  let controls = null, frame = null, controlSize = null, side = null, fullscreen = null, status = null;
  let destroyed = false, pendingFullscreen = false;
  const id = `game-display-${String(page).replace(/[^a-z0-9_-]/gi, '-')}-${++instance}`;
  const make = (tag, className, text) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const listeners = [];
  const listen = (target, event, listener) => {
    target.addEventListener(event, listener);
    listeners.push(() => target.removeEventListener(event, listener));
  };
  const setStatus = message => { if (!destroyed && status) status.textContent = message; };
  const fullscreenElement = () => doc.fullscreenElement || doc.webkitFullscreenElement || null;
  const fullscreenMethod = () => fullscreenElement()
    ? (typeof doc.exitFullscreen === 'function' ? [doc, doc.exitFullscreen] :
      typeof doc.webkitExitFullscreen === 'function' ? [doc, doc.webkitExitFullscreen] : null)
    : (typeof root.requestFullscreen === 'function' ? [root, root.requestFullscreen] :
      typeof root.webkitRequestFullscreen === 'function' ? [root, root.webkitRequestFullscreen] : null);
  const renderFullscreen = () => {
    if (!fullscreen || destroyed) return;
    const active = Boolean(fullscreenElement()), supported = Boolean(fullscreenMethod());
    fullscreen.textContent = active ? '全画面を解除' : supported ? '全画面にする' : '全画面（非対応）';
    fullscreen.disabled = pendingFullscreen || !supported;
    fullscreen.setAttribute('aria-pressed', String(active));
  };
  const notifyFullscreenChange = () => {
    if (destroyed) return;
    renderFullscreen();
    setStatus(fullscreenElement() ? '全画面表示です。' : '全画面を解除しました。');
    onChange(controller.getPreferences());
  };
  // Called only by the explicit click below, preserving browser gesture activation.
  const toggleFullscreen = async () => {
    if (destroyed || pendingFullscreen) return;
    const method = fullscreenMethod(), exiting = Boolean(fullscreenElement());
    if (!method) {
      setStatus('このブラウザは全画面表示に対応していません。');
      renderFullscreen();
      return;
    }
    pendingFullscreen = true;
    renderFullscreen();
    setStatus('全画面を切り替えています…');
    try {
      // Invoke synchronously in the click handler, including WebKit's void-returning API.
      await method[1].call(method[0]);
      if (!destroyed) setStatus(fullscreenElement() ? '全画面表示です。' :
        exiting ? '全画面を解除しました。' : '全画面の切り替えを要求しました。');
    } catch {
      setStatus(exiting ? '全画面を解除できませんでした。もう一度お試しください。' :
        '全画面にできませんでした。ブラウザの許可を確認してください。');
    } finally {
      pendingFullscreen = false;
      renderFullscreen();
    }
  };

  if (controlsParent) {
    controls = make('section', 'game-display-preferences');
    controls.setAttribute('aria-label', 'ゲーム画面のサイズと操作配置');
    const range = (labelText, suffix, min, max) => {
      const row = make('div', 'game-display-row'), label = make('label', '', labelText);
      const output = make('output', 'game-display-value'), input = make('input');
      input.type = 'range'; input.min = String(min); input.max = String(max); input.step = '5';
      input.id = `${id}-${suffix}`; label.htmlFor = input.id; output.setAttribute('for', input.id);
      row.append(label, output, input); controls.append(row);
      return { input, output };
    };
    frame = range('ゲーム枠のサイズ', 'frame', 70, 100);
    const fit = make('button', 'game-display-fit', '画面に合わせる'); fit.type = 'button';
    controls.append(fit);
    controlSize = range('操作ボタンの大きさ', 'controls', 100, 125);
    const sideRow = make('div', 'game-display-row'), sideLabel = make('label', '', '移動操作の位置');
    side = make('select', 'game-display-side'); side.id = `${id}-side`; sideLabel.htmlFor = side.id;
    for (const [value, text] of [['left', '左側'], ['right', '右側']]) {
      const option = make('option', '', text); option.value = value; side.append(option);
    }
    sideRow.append(sideLabel, side); controls.append(sideRow);
    fullscreen = make('button', 'game-display-fullscreen'); fullscreen.type = 'button';
    status = make('p', 'game-display-status'); status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const help = make('p', '', '小さい画面では、操作に必要な幅を確保します。縦・横の切り替えにも自動で合わせます。');
    controls.append(fullscreen, help, status); controlsParent.append(controls);
    listen(frame.input, 'input', () => controller.setPreferences({ size: Number(frame.input.value) }));
    listen(controlSize.input, 'input', () => controller.setPreferences({ controlSize: Number(controlSize.input.value) }));
    listen(side, 'change', () => controller.setPreferences({ side: side.value }));
    listen(fit, 'click', () => controller.fitToScreen());
    listen(fullscreen, 'click', toggleFullscreen);
  }

  const controller = createGameDisplayController({
    storage,
    onChange(preferences) {
      root.style.setProperty('--game-frame-scale', String(preferences.size / 100));
      root.style.setProperty('--game-control-scale', String(preferences.controlSize / 100));
      doc.body.dataset.gameControls = preferences.side;
      doc.body.dataset.gameDisplay = String(page);
      if (frame) {
        frame.input.value = String(preferences.size); frame.output.textContent = `${preferences.size}%`;
        controlSize.input.value = String(preferences.controlSize); controlSize.output.textContent = `${preferences.controlSize}%`;
        side.value = preferences.side;
      }
      onChange(preferences);
    },
    onPersistence(saved) {
      setStatus(saved ? '設定を保存しました。' : '設定を保存できません。今の画面には反映しています。');
    },
  });
  listen(doc, 'fullscreenchange', notifyFullscreenChange);
  listen(doc, 'webkitfullscreenchange', notifyFullscreenChange);
  renderFullscreen();
  if (!fullscreenMethod()) setStatus('このブラウザは全画面表示に対応していません。画面に合わせるを使えます。');
  return {
    getPreferences: controller.getPreferences,
    setPreferences: value => destroyed ? controller.getPreferences() : controller.setPreferences(value),
    fitToScreen: () => destroyed ? controller.getPreferences() : controller.fitToScreen(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const removeListener of listeners) removeListener();
      controls?.remove();
    },
  };
}
