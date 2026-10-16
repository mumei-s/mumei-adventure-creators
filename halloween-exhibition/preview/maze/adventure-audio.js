/** The Lantern Archive: original, local Web Audio composition. No files, network or autoplay. */
export const ADVENTURE_BEAT_SECONDS = .5;
export const ADVENTURE_PREFERENCE_KEY = 'halloween-exhibition:visitor-preferences:v1';
const clamp = (value, min, max, fallback = min) => Number.isFinite(value) ? Math.round(Math.max(min, Math.min(max, value))) : fallback;
const BARS = [
  [[69,.5],[72,.5],[76,1],[74,.5],[72,.5]], [[71,1],[67,.5],[71,.5],[74,1]],
  [[69,1],[72,.5],[77,.5],[76,1]], [[74,.5],[72,.5],[71,1],[67,1]],
  [[72,.5],[76,.5],[79,1],[76,.5],[74,.5]], [[72,1],[69,.5],[72,.5],[76,1]],
  [[74,.5],[77,.5],[76,.5],[74,.5],[71,1]], [[72,1],[69,1],[null,1]],
  [[76,1],[79,.5],[81,.5],[79,1]], [[77,.5],[76,.5],[74,1],[72,1]],
  [[74,.5],[76,.5],[77,1],[81,.5],[79,.5]], [[76,1],[74,.5],[72,.5],[71,1]],
  [[72,.5],[74,.5],[76,.5],[79,.5],[76,1]], [[74,1],[71,.5],[67,.5],[71,1]],
  [[72,.5],[76,.5],[74,.5],[72,.5],[71,1]], [[69,1],[72,.5],[71,.5],[69,1]],
];
const CHORDS = [[57,64,69],[55,62,67],[53,60,65],[55,62,67],
  [60,64,67],[57,64,69],[55,62,67],[57,64,69],
  [60,64,67],[53,60,65],[62,65,69],[55,62,67],
  [57,64,69],[55,62,67],[52,59,64],[57,64,69]];
export function adventureScore() {
  const notes = [];
  BARS.forEach((bar, i) => {
    let beat = i * 3;
    for (const [midi, duration] of bar) {
      if (midi !== null) notes.push({midi, beat, duration:duration * .82, level:.25, wave:'triangle', part:'melody'});
      beat += duration;
    }
    // Soft harp-like broken chords and a short midrange pulse, never sustained bass.
    CHORDS[i].forEach((midi, j) => {
      notes.push({midi:midi + 12, beat:i * 3 + j + .25, duration:.42, level:.075, wave:'sine', part:'harp'});
      if (j === 0) notes.push({midi, beat:i * 3, duration:.68, level:.075, wave:'triangle', part:'pulse'});
    });
  });
  return {notes:notes.sort((a,b) => a.beat - b.beat), beats:BARS.length * 3};
}

export function createAdventurePlayer({AudioContextCtor, onState = () => {},
  schedule = setInterval, cancel = clearInterval, deadline = setTimeout, cancelDeadline = clearTimeout} = {}) {
  let context = null, master = null, timer = null, resumeTimer = null, cancelStart = null, resumePending = null, version = 0, volume = 0, running = false;
  const voices = new Set(), score = adventureScore();
  function setVolume(value) {
    volume = clamp(value, 0, 100);
    if (context && master) {
      const now = context.currentTime; master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(volume / 100, now, .035);
      if (volume === 0) master.gain.setValueAtTime(0, now + .12);
    }
  }
  function stop(message = '') {
    version++; running = false; resumePending = null;
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
    const token = ++version, Ctor = AudioContextCtor || globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor) { onState(false, 'このブラウザではBGMを再生できません。'); return; }
    try {
      const audio = new Ctor(); context = audio;
      onState(false, 'BGMを準備しています…', true);
      // Keep resume synchronous with the control gesture. Slider input may
      // precede touch activation; its release can retry this same
      // context without adding a player, restarting the deadline, or autoplay.
      const resumed = new Promise((resolve,reject) => {
        resumePending = () => { try { Promise.resolve(audio.resume()).then(resolve,reject); } catch (error) { reject(error); } };
        resumePending();
      });
      const timeout = new Promise((_,reject) => { cancelStart = () => reject(Error('Audio start cancelled')); resumeTimer = deadline(() => reject(Error('Audio resume timed out')), 5000); });
      await Promise.race([resumed, timeout]);
      if (token !== version) return;
      cancelDeadline(resumeTimer); resumeTimer = null; cancelStart = null; resumePending = null;
      if (audio.state !== 'running') throw Error('Audio is not running');
      audio.onstatechange = () => {
        if (context === audio && audio.state !== 'running') stop('BGMが中断されました。ONを押すか、音量を動かすと再開できます。');
      };
      master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination);
      let index = 0, cycleStart = audio.currentTime + .04;
      function tick() {
        if (context !== audio) return;
        // An interruption may reach the scheduler before its statechange event.
        if (audio.state !== 'running') { stop('BGMが中断されました。ONを押すか、音量を動かすと再開できます。'); return; }
        // Do not burst through a backlog after a throttled timer.
        if (cycleStart + score.notes[index].beat * ADVENTURE_BEAT_SECONDS < audio.currentTime - .15) {
          index = 0; cycleStart = audio.currentTime + .04;
        }
        while (cycleStart + score.notes[index].beat * ADVENTURE_BEAT_SECONDS < audio.currentTime + .2) {
          const note = score.notes[index], start = cycleStart + note.beat * ADVENTURE_BEAT_SECONDS;
          const end = start + note.duration * ADVENTURE_BEAT_SECONDS;
          const oscillator = audio.createOscillator(), gain = audio.createGain(), voice = {oscillator,gain};
          oscillator.type = note.wave; oscillator.frequency.value = 440 * 2 ** ((note.midi - 69) / 12);
          gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(note.level, start + .012);
          gain.gain.exponentialRampToValueAtTime(.001, end); gain.gain.linearRampToValueAtTime(0, end + .025);
          oscillator.connect(gain); gain.connect(master); voices.add(voice);
          oscillator.onended = () => { voices.delete(voice); oscillator.disconnect(); gain.disconnect(); };
          oscillator.start(start); oscillator.stop(end + .03);
          if (++index === score.notes.length) { index = 0; cycleStart += score.beats * ADVENTURE_BEAT_SECONDS; }
        }
      }
      tick(); timer = schedule(tick, 50); running = true; setVolume(volume); onState(true);
    } catch { if (token === version) stop('BGMを開始できませんでした。ONを押してもう一度お試しください。'); }
  }
  return {start,stop,setVolume,resumeFromGesture:() => resumePending?.(),isPlaying:() => running && context?.state === 'running',isActive:() => context !== null};
}

/** Game-only settings. The main gallery's audio implementation is deliberately independent. */
export function initAdventureAudio({settingsContainer, legacyBrightness, onBrightness = () => {},
  onAudioInput = () => {}, playerFactory = createAdventurePlayer} = {}) {
  let storage, brightness = clamp(legacyBrightness,75,175,100), volume = 0, playing = false, pending = false, message = '';
  try {
    storage = localStorage; const raw = storage.getItem(ADVENTURE_PREFERENCE_KEY);
    if (raw !== null) brightness = clamp(JSON.parse(raw)?.brightness,75,175,100);
  } catch {}
  const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; };
  const bindings = [], brightnessSection = make('section','visitor-preferences');
  brightnessSection.setAttribute('aria-label','明るさとゲームの音楽');
  const brightnessRow = make('div','visitor-setting-row'), brightnessLabel = make('label','','明るさ'), brightnessOutput = make('output','visitor-setting-value'), brightnessInput = make('input');
  brightnessInput.type = 'range'; brightnessInput.id = 'adventure-brightness'; brightnessInput.min = '75'; brightnessInput.max = '175'; brightnessInput.step = '1';
  brightnessLabel.htmlFor = brightnessInput.id; brightnessOutput.setAttribute('for',brightnessInput.id);
  brightnessRow.append(brightnessLabel,brightnessOutput,brightnessInput); brightnessSection.append(brightnessRow); settingsContainer.append(brightnessSection);
  function stateText() {
    return message || (pending ? 'BGMを準備しています…' : playing ? volume === 0 ? 'BGMはON・音量0でミュート中です。音量を少しずつ上げてください。' : `冒険室のBGM「灯りの散歩道」を再生中。音量${volume}%です。` : 'BGMはOFFです。音量を上げると再生します。ON/OFFでも切り替えられます。');
  }
  function render() {
    brightnessInput.value = String(brightness); brightnessOutput.textContent = `${brightness}%`;
    for (const b of bindings) {
      b.button.textContent = pending ? 'BGM 準備中' : `♪ BGM ${playing ? 'ON' : 'OFF'}`;
      b.button.setAttribute('aria-pressed',String(playing)); b.button.setAttribute('aria-label',pending ? 'BGMの開始をキャンセル' : playing ? 'ゲームのBGMをOFFにする' : 'ゲームのBGMをONにする');
      b.button.title = pending ? '押すと開始をキャンセル' : stateText();
      b.input.value = String(volume); b.input.setAttribute('aria-valuetext',`${volume}%`); b.output.textContent = `${volume}%`; b.status.textContent = stateText();
    }
  }
  const player = playerFactory({onState:(isPlaying,text = '',isPending = false) => {playing = isPlaying; pending = isPending; message = text; render();}});
  function toggle() {
    onAudioInput(); message = '';
    if (player.isActive()) player.stop(); else if (!document.hidden) player.start();
  }
  function setVolume(value, fromGesture = false) {
    volume = clamp(Number(value),0,100); message = ''; player.setVolume(volume); render();
    // Raising this dedicated music slider is an explicit request to hear the game music.
    if (fromGesture) { onAudioInput(); if (volume > 0 && !document.hidden && !player.isActive()) player.start(); }
  }
  function addControls(parent) {
    const wrap = make('section','game-audio-settings'); wrap.setAttribute('aria-label','ゲームのBGMと音量');
    const button = make('button','game-music-toggle'); button.type = 'button';
    const label = make('label','game-volume-label','ゲームのBGM音量');
    const input = make('input','game-volume-input'), output = make('output','game-volume-value');
    input.type = 'range'; input.id = 'game-settings-volume'; input.min = '0'; input.max = '100'; input.step = '1';
    label.htmlFor = input.id; output.setAttribute('for',input.id); input.setAttribute('aria-label','ゲームのBGM音量');
    const status = make('p','game-audio-status'); status.id = `${input.id}-status`; status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    input.setAttribute('aria-describedby',status.id); button.setAttribute('aria-describedby',status.id);
    button.addEventListener('click',toggle); input.addEventListener('input',() => setVolume(input.value,true));
    // A final change is also a direct gesture and permits a retry on mobile browsers.
    const retryResume = () => { if (pending && volume > 0 && !document.hidden) player.resumeFromGesture?.(); };
    input.addEventListener('change',() => { const wasPending = pending; setVolume(input.value,true); if (wasPending) retryResume(); });
    input.addEventListener('pointerup',retryResume);
    bindings.push({button,input,output,status}); wrap.append(button,label,input,output,status); parent.append(wrap); return wrap;
  }
  const settingControls = addControls(brightnessSection);
  brightnessSection.append(make('p','visitor-settings-note','ゲーム専用BGM「灯りの散歩道」。毎回OFF・音量0で始まります。画面を離れると止まり、自動では再開しません。'));
  function setBrightness(value) {
    brightness = clamp(value,75,175,100); render(); onBrightness(brightness);
    try { storage?.setItem(ADVENTURE_PREFERENCE_KEY,JSON.stringify({brightness,volume:0})); } catch {}
  }
  brightnessInput.addEventListener('input',() => setBrightness(Number(brightnessInput.value)));
  const onHidden = () => { if (document.hidden) player.stop('画面を離れたためBGMを停止しました。ONで再開できます。'); };
  const onLeave = () => player.stop('画面を離れたためBGMを停止しました。ONで再開できます。');
  const onReturn = event => { if (event.persisted) { volume = 0; player.setVolume(0); player.stop(); render(); } };
  document.addEventListener('visibilitychange',onHidden); window.addEventListener('pagehide',onLeave); window.addEventListener('blur',onLeave); window.addEventListener('pageshow',onReturn);
  render(); player.setVolume(0); onBrightness(brightness);
  return {setBrightness,setVolume,stopMusic:() => player.stop(),getPreferences:() => ({brightness,volume}),
    destroy() { player.stop(); document.removeEventListener('visibilitychange',onHidden); window.removeEventListener('pagehide',onLeave); window.removeEventListener('blur',onLeave); window.removeEventListener('pageshow',onReturn); settingControls.remove(); brightnessSection.remove(); }};
}
