/** Local visitor settings, shared only by this exhibition and its separate room. */
export const PREFERENCE_KEY = 'halloween-exhibition:visitor-preferences:v1';
const clamp = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(min, Math.min(max, value))) : fallback;
const LEGACY_RANGE = { min: 75, max: 175, defaultValue: 100 };
function brightnessRange(options = {}) {
  const range = options.brightnessRange || LEGACY_RANGE;
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max) || range.min > range.max) return LEGACY_RANGE;
  return { min: range.min, max: range.max, defaultValue: clamp(range.defaultValue, range.min, range.max, range.min) };
}
export function normalizePreferences(value = {}, legacyBrightness, options = {}) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const { min, max, defaultValue } = brightnessRange(options);
  return { brightness: clamp(input.brightness, min, max, clamp(legacyBrightness, min, max, defaultValue)), volume: clamp(input.volume, 0, 100, 20) };
}
export function readPreferences(storage, legacyBrightness, options = {}) {
  try {
    const key = options.preferenceKey || PREFERENCE_KEY;
    let raw = storage.getItem(key);
    // Explicit, read-only migration. A corrupt scoped value must not resurrect old settings.
    if (raw === null && options.migrateFromKey && options.migrateFromKey !== key) raw = storage.getItem(options.migrateFromKey);
    return normalizePreferences(raw === null ? {} : JSON.parse(raw), raw === null ? legacyBrightness : undefined, options);
  } catch { return normalizePreferences({}, undefined, options); }
}
export function writePreferences(storage, value, options = {}) {
  try { storage.setItem(options.preferenceKey || PREFERENCE_KEY, JSON.stringify(normalizePreferences(value, undefined, options))); return true; } catch { return false; }
}

/** An original quiet four-chord pad, synthesized locally; no recordings or requests. */
export function createAmbientPlayer({ AudioContextCtor, onState = () => {}, audioOptions = {} } = {}) {
  let context = null, master = null, timer = null, version = 0, running = false, volume = 20;
  const masterLevel = Number.isFinite(audioOptions.masterLevel) ? Math.max(.01,Math.min(.2,audioOptions.masterLevel)) : .07;
  const waveform = audioOptions.waveform === 'triangle' ? 'triangle' : 'sine';
  const pitchScale = audioOptions.pitchScale === 2 ? 2 : 1;
  const chords = [[196,246.94,293.66],[174.61,220,261.63],[164.81,196,246.94],[146.83,196,220]];
  function setVolume(value) {
    volume = clamp(value, 0, 100, 20);
    if (master && context) master.gain.setTargetAtTime(volume / 100 * masterLevel, context.currentTime, .16);
  }
  function stop(message) {
    version++; running = false; clearInterval(timer); timer = null;
    const old = context; context = master = null;
    if (old) { old.onstatechange = null; try { old.close()?.catch?.(() => {}); } catch {} }
    onState(false, message);
  }
  async function start() {
    if (context) return;
    const token = ++version;
    const Ctor = AudioContextCtor || globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor) { onState(false, 'このブラウザでは音楽を再生できません。'); return; }
    try {
      const audio = new Ctor(); context = audio;
      onState(false, '音楽を準備しています…', true);
      // Resume synchronously within the explicit ON gesture, before awaiting anything.
      await audio.resume();
      if (token !== version) return;
      if (audio.state !== 'running') throw new Error('Audio context did not enter running state');
      audio.onstatechange = () => {
        if (context === audio && audio.state !== 'running') stop('音楽の再生が中断されました。再開するにはONを押してください。');
      };
      master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination);
      const voices = chords[0].map((frequency, i) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = waveform; oscillator.frequency.value = frequency * pitchScale; oscillator.detune.value = (i - 1) * 3;
        gain.gain.value = .24; oscillator.connect(gain); gain.connect(master); oscillator.start();
        return oscillator;
      });
      let chord = 0;
      timer = setInterval(() => {
        if (context !== audio) return;
        chord = (chord + 1) % chords.length;
        voices.forEach((voice, i) => voice.frequency.setTargetAtTime(chords[chord][i] * pitchScale, audio.currentTime, 1.1));
      }, 8000);
      running = true; setVolume(volume); onState(true);
    } catch { if (token === version) stop('音楽を開始できませんでした。もう一度ONを押してください。'); }
  }
  return { start, stop, setVolume, isPlaying: () => running && context?.state === 'running', isActive: () => context !== null };
}

let instance = 0;
export function initVisitorPreferences({ container, triggerParent, onBrightness = () => {}, legacyBrightness, brightnessRange: range, preferenceKey = PREFERENCE_KEY, migrateFromKey, audioOptions } = {}) {
  let storage; try { storage = localStorage; } catch {}
  const options = { brightnessRange: range, preferenceKey, migrateFromKey };
  const bounds = brightnessRange(options);
  let preferences = readPreferences(storage, legacyBrightness, options);
  const id = `visitor-settings-${++instance}`;
  const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; };
  let dialog = null, trigger = null, returnFocus = null;
  if (!container) {
    dialog = make('dialog', 'visitor-settings-dialog'); dialog.id = id; dialog.setAttribute('aria-labelledby', `${id}-title`);
    const close = make('button', 'visitor-settings-close', '×'); close.type = 'button'; close.setAttribute('aria-label', '設定を閉じる');
    const title = make('h2', '', 'この端末の設定'); title.id = `${id}-title`;
    dialog.append(close, title); document.body.append(dialog); container = dialog;
    trigger = make('button', 'visitor-settings-trigger', '設定'); trigger.type = 'button'; trigger.setAttribute('aria-label', '明るさ・音楽・表示サイズの設定'); trigger.setAttribute('aria-haspopup', 'dialog');
    (triggerParent || document.body).append(trigger);
    trigger.addEventListener('click', () => { returnFocus = document.activeElement; if (!dialog.open) dialog.showModal(); });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => returnFocus?.focus?.());
    dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
  }
  const controls = make('section', 'visitor-preferences'); controls.setAttribute('aria-label', '明るさと音楽');
  const row = (name, suffix, min, max) => {
    const wrap = make('div', 'visitor-setting-row'), label = make('label', '', name), output = make('output', 'visitor-setting-value');
    const input = make('input'); input.type = 'range'; input.min = String(min); input.max = String(max); input.step = '1'; input.id = `${id}-${suffix}`;
    label.htmlFor = input.id; output.setAttribute('for', input.id); wrap.append(label, output, input); controls.append(wrap); return { input, output };
  };
  const brightness = row('明るさ', 'brightness', bounds.min, bounds.max);
  const music = make('button', 'visitor-music-toggle', '音楽をON'); music.type = 'button'; music.setAttribute('aria-pressed', 'false'); controls.append(music);
  const volume = row('音楽の音量', 'volume', 0, 100);
  const status = make('p', 'visitor-settings-status', '音楽はOFFです。ONにすると、静かなオリジナルの環境音楽が流れます。'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); controls.append(status);
  controls.append(make('p', 'visitor-settings-note', '明るさと音量は、この端末に保存します。音楽は画面を離れると止まり、次に開いたときもOFFです。'));
  container.append(controls);
  const player = createAmbientPlayer({ audioOptions, onState(playing, error, pending = false) {
    music.textContent = pending ? '音楽の開始をキャンセル' : playing ? '音楽をOFF' : '音楽をON'; music.setAttribute('aria-pressed', String(playing));
    status.textContent = error || (playing ? '音楽を再生しています。音量0でミュートできます。' : '音楽はOFFです。ONにすると、静かなオリジナルの環境音楽が流れます。');
  }});
  function render() { brightness.input.value = String(preferences.brightness); brightness.output.textContent = `${preferences.brightness}%`; volume.input.value = String(preferences.volume); volume.output.textContent = `${preferences.volume}%`; }
  function save() { if (!writePreferences(storage, preferences, options)) status.textContent = 'このブラウザでは設定を保存できません。今開いている画面には反映しています。'; }
  function setBrightness(value) { preferences = normalizePreferences({ ...preferences, brightness: value }, undefined, options); render(); onBrightness(preferences.brightness); save(); }
  brightness.input.addEventListener('input', () => setBrightness(Number(brightness.input.value)));
  volume.input.addEventListener('input', () => { preferences.volume = clamp(Number(volume.input.value), 0, 100, 20); render(); player.setVolume(preferences.volume); save(); });
  music.addEventListener('click', () => { if (player.isActive()) player.stop(); else if (!document.hidden) player.start(); });
  const onHidden = () => { if (document.hidden) player.stop(); };
  const onPageHide = () => player.stop();
  document.addEventListener('visibilitychange', onHidden); window.addEventListener('pagehide', onPageHide);
  render(); player.setVolume(preferences.volume); onBrightness(preferences.brightness);
  return { setBrightness, getPreferences: () => ({ ...preferences }), destroy() { player.stop(); document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('pagehide', onPageHide); controls.remove(); trigger?.remove(); dialog?.remove(); } };
}

