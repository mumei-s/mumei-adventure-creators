/** Local visitor settings, shared only by this exhibition and its separate room. */
export const PREFERENCE_KEY = 'halloween-exhibition:visitor-preferences:v1';
const clamp = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(min, Math.min(max, value))) : fallback;
export function normalizePreferences(value = {}, legacyBrightness = 100) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return { brightness: clamp(input.brightness, 75, 175, clamp(legacyBrightness, 75, 175, 100)), volume: clamp(input.volume, 0, 100, 20) };
}
export function readPreferences(storage, legacyBrightness = 100) {
  try { const raw = storage.getItem(PREFERENCE_KEY); return normalizePreferences(raw === null ? {} : JSON.parse(raw), raw === null ? legacyBrightness : 100); }
  catch { return normalizePreferences({}); }
}
export function writePreferences(storage, value) {
  try { storage.setItem(PREFERENCE_KEY, JSON.stringify(normalizePreferences(value))); return true; } catch { return false; }
}

/** An original quiet four-chord pad, synthesized locally; no recordings or requests. */
export function createAmbientPlayer({ AudioContextCtor, onState = () => {} } = {}) {
  let context = null, master = null, timer = null, version = 0, running = false, volume = 20;
  const chords = [[196,246.94,293.66],[174.61,220,261.63],[164.81,196,246.94],[146.83,196,220]];
  function setVolume(value) {
    volume = clamp(value, 0, 100, 20);
    if (master && context) master.gain.setTargetAtTime(volume / 100 * .07, context.currentTime, .16);
  }
  function stop() {
    version++; running = false; clearInterval(timer); timer = null;
    const old = context; context = master = null;
    if (old) { try { old.close()?.catch?.(() => {}); } catch {} }
    onState(false);
  }
  async function start() {
    if (running || context) return;
    const token = ++version;
    const Ctor = AudioContextCtor || globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor) { onState(false, 'このブラウザでは音楽を再生できません。'); return; }
    try {
      const audio = new Ctor(); context = audio;
      await audio.resume();
      if (token !== version) { try { await audio.close(); } catch {} return; }
      master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination);
      const voices = chords[0].map((frequency, i) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency; oscillator.detune.value = (i - 1) * 3;
        gain.gain.value = .24; oscillator.connect(gain); gain.connect(master); oscillator.start();
        return oscillator;
      });
      let chord = 0;
      timer = setInterval(() => {
        if (context !== audio) return;
        chord = (chord + 1) % chords.length;
        voices.forEach((voice, i) => voice.frequency.setTargetAtTime(chords[chord][i], audio.currentTime, 1.1));
      }, 8000);
      running = true; setVolume(volume); onState(true);
    } catch { if (token === version) { stop(); onState(false, '音楽を開始できませんでした。もう一度ONを押してください。'); } }
  }
  return { start, stop, setVolume, isPlaying: () => running };
}

let instance = 0;
export function initVisitorPreferences({ container, triggerParent, onBrightness = () => {}, legacyBrightness = 100 } = {}) {
  let storage; try { storage = localStorage; } catch {}
  let preferences = readPreferences(storage, legacyBrightness);
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
  const brightness = row('明るさ', 'brightness', 75, 175);
  const music = make('button', 'visitor-music-toggle', '音楽をON'); music.type = 'button'; music.setAttribute('aria-pressed', 'false'); controls.append(music);
  const volume = row('音楽の音量', 'volume', 0, 100);
  const status = make('p', 'visitor-settings-status', '音楽はOFFです。ONにすると、静かなオリジナルの環境音楽が流れます。'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); controls.append(status);
  controls.append(make('p', 'visitor-settings-note', '明るさと音量は、この端末に保存します。音楽は画面を離れると止まり、次に開いたときもOFFです。'));
  container.append(controls);
  const player = createAmbientPlayer({ onState(playing, error) {
    music.textContent = playing ? '音楽をOFF' : '音楽をON'; music.setAttribute('aria-pressed', String(playing));
    status.textContent = error || (playing ? '音楽を再生しています。音量0でミュートできます。' : '音楽はOFFです。ONにすると、静かなオリジナルの環境音楽が流れます。');
  }});
  function render() { brightness.input.value = String(preferences.brightness); brightness.output.textContent = `${preferences.brightness}%`; volume.input.value = String(preferences.volume); volume.output.textContent = `${preferences.volume}%`; }
  function save() { if (!writePreferences(storage, preferences)) status.textContent = 'このブラウザでは設定を保存できません。今開いている画面には反映しています。'; }
  function setBrightness(value) { preferences = normalizePreferences({ ...preferences, brightness: value }); render(); onBrightness(preferences.brightness); save(); }
  brightness.input.addEventListener('input', () => setBrightness(Number(brightness.input.value)));
  volume.input.addEventListener('input', () => { preferences.volume = clamp(Number(volume.input.value), 0, 100, 20); render(); player.setVolume(preferences.volume); save(); });
  music.addEventListener('click', () => { if (player.isPlaying()) player.stop(); else player.start(); });
  const onHidden = () => { if (document.hidden) player.stop(); };
  const onPageHide = () => player.stop();
  document.addEventListener('visibilitychange', onHidden); window.addEventListener('pagehide', onPageHide);
  render(); player.setVolume(preferences.volume); onBrightness(preferences.brightness);
  return { setBrightness, getPreferences: () => ({ ...preferences }), destroy() { player.stop(); document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('pagehide', onPageHide); controls.remove(); trigger?.remove(); dialog?.remove(); } };
}

