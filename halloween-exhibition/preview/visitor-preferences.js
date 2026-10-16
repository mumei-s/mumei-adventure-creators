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
  return { brightness: clamp(input.brightness, min, max, clamp(legacyBrightness, min, max, defaultValue)), volume: clamp(input.volume, 0, 100, 0) };
}
export function readPreferences(storage, legacyBrightness, options = {}) {
  try {
    const key = options.preferenceKey || PREFERENCE_KEY;
    let raw = storage.getItem(key);
    // Explicit, read-only migration. A corrupt scoped value must not resurrect old settings.
    if (raw === null && options.migrateFromKey && options.migrateFromKey !== key) raw = storage.getItem(options.migrateFromKey);
    // Volume is session-only for safety, including migration from an old saved maximum.
    return { ...normalizePreferences(raw === null ? {} : JSON.parse(raw), raw === null ? legacyBrightness : undefined, options), volume: 0 };
  } catch { return normalizePreferences({}, undefined, options); }
}
export function writePreferences(storage, value, options = {}) {
  try { storage.setItem(options.preferenceKey || PREFERENCE_KEY, JSON.stringify(normalizePreferences(value, undefined, options))); return true; } catch { return false; }
}

/** Original music-box waltz: articulated melody and arpeggios, never a continuous drone.
 * MIDI notes stay in the phone-friendly midrange; each voice has a finite envelope.
 * Maximum overlapping peak is below 0.65 at full volume, with no unbounded voices.
 */
export const MUSIC_BEAT_SECONDS = .44;
const MELODY = [
  [76,1],[79,.5],[81,.5],[83,1], [81,1],[79,1],[76,1],
  [74,1],[77,.5],[79,.5],[81,1], [79,1],[77,1],[74,1],
  [72,1],[76,.5],[79,.5],[84,1], [83,1],[79,1],[76,1],
  [74,1],[78,1],[81,1], [79,1],[76,1],[71,1],
];
const HARMONY = [[52,59,64],[52,59,64],[50,57,62],[50,57,62],
  [48,55,60],[48,55,60],[47,54,59],[47,54,59]];
export function musicScore() {
  const notes = []; let beat = 0;
  for (const [midi, duration] of MELODY) {
    notes.push({ midi, beat, duration: duration * .8, level: .37, wave: 'triangle' }); beat += duration;
  }
  HARMONY.forEach((chord, bar) => chord.forEach((midi, index) => {
    notes.push({ midi: midi + 12, beat: bar * 3 + index, duration: .72, level: .15, wave: 'sine' });
  }));
  return { notes: notes.sort((a,b) => a.beat-b.beat), beats: beat };
}
export function createAmbientPlayer({ AudioContextCtor, onState = () => {},
  schedule = setInterval, cancel = clearInterval, deadline = setTimeout, cancelDeadline = clearTimeout } = {}) {
  let context = null, master = null, timer = null, resumeTimer = null, cancelStart = null, version = 0, running = false, volume = 0;
  const voices = new Set(), score = musicScore();
  function setVolume(value) {
    volume = clamp(value, 0, 100, 0);
    if (master && context) master.gain.setTargetAtTime(volume / 100, context.currentTime, .08);
  }
  function stop(message) {
    version++; running = false;
    if (cancelStart) { cancelStart(); cancelStart = null; }
    if (timer !== null) cancel(timer); timer = null;
    if (resumeTimer !== null) cancelDeadline(resumeTimer); resumeTimer = null;
    for (const {oscillator,gain} of voices) {
      try { oscillator.stop(); } catch {}
      try { oscillator.disconnect(); gain.disconnect(); } catch {}
    }
    voices.clear();
    try { master?.disconnect(); } catch {}
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
      // Resume in the explicit ON gesture. A stalled permission prompt cannot hang forever.
      // Call before creating the cancellation promise, so a synchronous WebKit
      // failure cannot leave a rejected promise without a handler.
      const resumed = audio.resume();
      const timeout = new Promise((_, reject) => { cancelStart = () => reject(Error('Audio start cancelled')); resumeTimer = deadline(() => reject(Error('Audio resume timed out')), 5000); });
      await Promise.race([resumed, timeout]);
      if (token !== version) return;
      cancelDeadline(resumeTimer); resumeTimer = null; cancelStart = null;
      if (audio.state !== 'running') throw new Error('Audio context did not enter running state');
      audio.onstatechange = () => {
        if (context === audio && audio.state !== 'running') stop('音楽の再生が中断されました。再開するにはONを押してください。');
      };
      master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination);
      let index = 0, cycleStart = audio.currentTime + .04;
      function tick() {
        if (context !== audio) return;
        if (audio.state !== 'running') { stop('音楽の再生が中断されました。再開するにはONを押してください。'); return; }
        // Never replay a backlog after a throttled/background timer.
        if (cycleStart + score.notes[index].beat * MUSIC_BEAT_SECONDS < audio.currentTime - .15) {
          index = 0; cycleStart = audio.currentTime + .04;
        }
        while (cycleStart + score.notes[index].beat * MUSIC_BEAT_SECONDS < audio.currentTime + .2) {
          const note = score.notes[index], start = cycleStart + note.beat * MUSIC_BEAT_SECONDS;
          const end = start + note.duration * MUSIC_BEAT_SECONDS;
          const oscillator = audio.createOscillator(), gain = audio.createGain(), voice = {oscillator,gain};
          oscillator.type = note.wave; oscillator.frequency.value = 440 * 2 ** ((note.midi - 69) / 12);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(note.level, start + .018);
          gain.gain.exponentialRampToValueAtTime(.001, end);
          gain.gain.linearRampToValueAtTime(0, end + .035);
          oscillator.connect(gain); gain.connect(master); voices.add(voice);
          oscillator.onended = () => { voices.delete(voice); oscillator.disconnect(); gain.disconnect(); };
          oscillator.start(start); oscillator.stop(end + .04);
          if (++index === score.notes.length) { index = 0; cycleStart += score.beats * MUSIC_BEAT_SECONDS; }
        }
      }
      tick(); timer = schedule(tick, 50);
      running = true; setVolume(volume); onState(true);
    } catch { if (token === version) stop('音楽を開始できませんでした。もう一度ONを押してください。'); }
  }
  return { start, stop, setVolume, isPlaying: () => running && context?.state === 'running', isActive: () => context !== null };
}

let instance = 0;
export function initVisitorPreferences({ container, triggerParent, onBrightness = () => {}, legacyBrightness, brightnessRange: range, preferenceKey = PREFERENCE_KEY, migrateFromKey } = {}) {
  let storage; try { storage = localStorage; } catch {}
  const options = { brightnessRange: range, preferenceKey, migrateFromKey };
  const bounds = brightnessRange(options);
  let preferences = readPreferences(storage, legacyBrightness, options);
  const id = `visitor-settings-${++instance}`;
  const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; };
  let dialog = null, trigger = null, returnFocus = null;
  if (!container) {
    dialog = make('dialog', 'visitor-settings-dialog'); dialog.id = id; dialog.setAttribute('aria-labelledby', `${id}-title`);
    const close = make('button', 'visitor-settings-close safe-dialog-back', '← 戻る'); close.type = 'button'; close.setAttribute('aria-label', '設定を閉じる');
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
  const status = make('p', 'visitor-settings-status', '音楽はOFFです。ONにすると、オリジナルのオルゴール風の音楽が流れます。音量は0から少しずつ上げてください。'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); controls.append(status);
  controls.append(make('p', 'visitor-settings-note', '明るさは、この端末に保存します。音楽は画面を離れると止まり、次に開いたときはOFF・音量0です。'));
  container.append(controls);
  const player = createAmbientPlayer({ onState(playing, error, pending = false) {
    music.textContent = pending ? '音楽の開始をキャンセル' : playing ? '音楽をOFF' : '音楽をON'; music.setAttribute('aria-pressed', String(playing));
    status.textContent = error || (playing ? (preferences.volume === 0 ? '音楽はON・音量0でミュート中です。音量を少しずつ上げてください。' : '音楽を再生しています。音量0でミュートできます。') : '音楽はOFFです。ONにすると、オリジナルのオルゴール風の音楽が流れます。音量は0から少しずつ上げてください。');
  }});
  function render() { brightness.input.value = String(preferences.brightness); brightness.output.textContent = `${preferences.brightness}%`; volume.input.value = String(preferences.volume); volume.output.textContent = `${preferences.volume}%`; }
  function save() { if (!writePreferences(storage, preferences, options)) status.textContent = 'このブラウザでは設定を保存できません。今開いている画面には反映しています。'; }
  function setBrightness(value) { preferences = normalizePreferences({ ...preferences, brightness: value }, undefined, options); render(); onBrightness(preferences.brightness); save(); }
  brightness.input.addEventListener('input', () => setBrightness(Number(brightness.input.value)));
  volume.input.addEventListener('input', () => { preferences.volume = clamp(Number(volume.input.value), 0, 100, 0); render(); player.setVolume(preferences.volume); if (player.isPlaying()) status.textContent = preferences.volume === 0 ? '音楽はON・音量0でミュート中です。音量を少しずつ上げてください。' : '音楽を再生しています。音量0でミュートできます。'; save(); });
  music.addEventListener('click', () => { if (player.isActive()) player.stop(); else if (!document.hidden) player.start(); });
  const onHidden = () => { if (document.hidden) player.stop(); };
  const onPageHide = () => player.stop();
  const onReturn = event => { if (event.persisted) { preferences.volume = 0; player.setVolume(0); player.stop(); render(); } };
  document.addEventListener('visibilitychange', onHidden); window.addEventListener('pagehide', onPageHide); window.addEventListener('blur', onPageHide); window.addEventListener('pageshow', onReturn);
  render(); player.setVolume(preferences.volume); onBrightness(preferences.brightness);
  return { setBrightness, stopMusic: () => player.stop(), getPreferences: () => ({ ...preferences }), destroy() { player.stop(); document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('pagehide', onPageHide); window.removeEventListener('blur', onPageHide); window.removeEventListener('pageshow', onReturn); controls.remove(); trigger?.remove(); dialog?.remove(); } };
}

