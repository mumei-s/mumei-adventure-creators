/** Decorative, bounded scene simulation. No network, dependencies or text transforms. */
export function initSceneMotion(root) {
  if (!root || root.dataset.sceneReady) return null;
  root.dataset.sceneReady = 'true';
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const abort = new AbortController(), signal = abort.signal;
  const listen = (el, name, fn, options = {}) => el.addEventListener(name, fn, {...options, signal});
  const make = (tag, cls, parent, text) => { const el = document.createElement(tag); el.className = cls; if (text) el.textContent = text; parent.append(el); return el; };
  const atmosphere = make('div', 'scene-atmosphere', root);
  atmosphere.setAttribute('aria-hidden', 'true');
  make('div', 'scene-beam scene-beam-left', atmosphere);
  make('div', 'scene-beam scene-beam-right', atmosphere);
  const canvas = make('canvas', 'scene-flow', atmosphere), ctx = canvas.getContext('2d', {alpha: true});
  const controls = make('div', 'scene-controls', root);
  const pause = make('button', 'scene-pause', controls);
  pause.type = 'button';
  const seeds = make('div', 'scene-seeds', controls);
  seeds.setAttribute('role', 'group'); seeds.setAttribute('aria-label', '3つの光を集めて、星座の封印を完成させる');
  const seedButtons = Array.from({length: 3}, (_, i) => {
    const b = make('button', 'scene-seed', seeds, '✧'); b.type = 'button'; b.dataset.seal = `light-${i + 1}`;
    b.setAttribute('aria-label', `${i + 1}つ目の光を集める`); return b;
  });
  const count = make('span', 'scene-count', controls);
  const live = make('span', 'sr-only', controls); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  const layers = [
    ['.world-backdrop', 9], ['.haunted-branches', 13], ['.hanging-lantern', 14],
    ['.foreground-left', 23], ['.foreground-right', 23], ['.floor-light', 7]
  ].flatMap(([sel, depth]) => [...root.querySelectorAll(sel)].map(el => ({el, depth, initial: el.style.translate})));
  let userPaused = false;
  try { userPaused = localStorage.getItem('halloween-yearbook:motion-paused:v1') === 'true'; } catch {}
  let width = 1, height = 1, dpr = 1, frame = 0, last = 0, time = 0, dirty = true;
  let x = 0, y = 0, targetX = 0, targetY = 0, mode = 'halloween', collected = new Set(), payoff = 0;
  let rect = root.getBoundingClientRect();
  const ids = ['light-1', 'light-2', 'light-3'];
  const palettes = {
    normal: {rgb: '73,132,122', glow: '214,186,127', opacity: .75},
    halloween: {rgb: '236,173,91', glow: '159,182,201', opacity: 1},
    horror: {rgb: '130,165,158', glow: '155,146,177', opacity: .65}
  };
  const staticMotion = () => userPaused || media.matches;
  const active = () => !staticMotion() && !document.hidden && !document.querySelector('dialog[open]');
  function readSeals() {
    try { const values = JSON.parse(root.dataset.seals || '[]'); collected = new Set(Array.isArray(values) ? values.filter(v => ids.includes(v)) : []); } catch { collected = new Set(); }
    seedButtons.forEach((b, i) => { const done = collected.has(ids[i]); b.setAttribute('aria-pressed', String(done)); b.textContent = done ? '✦' : '✧'; b.setAttribute('aria-label', `${i + 1}つ目の光${done ? '：収集済み' : 'を集める'}`); });
    count.textContent = collected.size === 3 ? '星座の封印が完成' : `光を集める ${collected.size} / 3`;
    root.dataset.constellation = String(collected.size === 3); dirty = true;
  }
  function applyMode() {
    mode = root.dataset.mode === 'normal' ? 'normal' : root.dataset.horror === 'true' ? 'horror' : 'halloween';
    atmosphere.dataset.palette = mode; dirty = true;
  }
  function updatePause() {
    const stopped = staticMotion() || document.hidden || !!document.querySelector('dialog[open]');
    const changed = root.dataset.motionPaused !== String(stopped);
    root.dataset.motionPaused = String(stopped);
    if (changed) root.dispatchEvent(new CustomEvent('yearbook:motion-state', {bubbles: true, detail: {paused: stopped}}));
    pause.textContent = media.matches ? '静止表示' : userPaused ? '動きを再開' : '動きを止める';
    pause.setAttribute('aria-pressed', String(staticMotion()));
    pause.setAttribute('aria-label', media.matches ? '端末の設定に合わせて動きを抑えています' : userPaused ? '背景の動きを再開する' : '背景の動きを止める');
    pause.disabled = media.matches;
    if (stopped) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    else start();
    if (media.matches) { x = y = targetX = targetY = 0; setLayers(); }
    if (dirty) draw();
  }
  function resize() {
    rect = root.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    // Pixel budget limits fill cost on large screens and high-DPR phones.
    dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2200000 / (width * height)));
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true; if (!active()) draw();
  }
  function setLayers() {
    for (const {el, depth} of layers) el.style.translate = `${(x * depth).toFixed(2)}px ${(y * depth * .6).toFixed(2)}px`;
  }
  function pathPoint(angle, band) {
    const radius = width * (.44 + band * .074);
    return {
      x: width * .5 + Math.cos(angle) * radius + x * (12 + band * 9),
      y: height * .61 + Math.sin(angle) * height * (.115 + band * .055) + Math.cos(angle * 2 + time * .12 + band) * height * .012 + y * (7 + band * 5)
    };
  }
  function draw() {
    if (!ctx) return;
    dirty = false; ctx.clearRect(0, 0, width, height);
    const p = palettes[mode], lower = width < 650;
    // Coherent orbital architecture: three tilted luminous planes around the room.
    // The rear half is faint; the foreground half carries travelling light.
    for (let band = 0; band < 3; band++) {
      for (let half = 0; half < 2; half++) {
        ctx.beginPath();
        for (let k = 0; k <= 80; k++) {
          const a = Math.PI * half + k / 80 * Math.PI;
          const point = pathPoint(a, band);
          if (!k) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
        }
        ctx.strokeStyle = `rgba(${p.rgb},${(half ? .025 : .13) * p.opacity})`;
        ctx.lineWidth = band === 2 ? 1 : .7; ctx.stroke();
      }
      // A short ribbon, not a blinking particle, travels continuously along each plane.
      const head = time * (.16 + band * .028) + band * 2.1;
      for (let segment = 0; segment < 14; segment++) {
        const a = head - segment * .025;
        const from = pathPoint(a, band), to = pathPoint(a - .03, band);
        const rear = Math.sin(a) < 0 ? .2 : 1;
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = `rgba(${p.rgb},${(1 - segment / 14) * .63 * rear * p.opacity})`;
        ctx.lineWidth = 1.7 + band * .6; ctx.stroke();
      }
    }
    // Seeded air currents use depth-dependent drift. No random noise per frame.
    const quantity = lower ? 26 : 44;
    for (let i = 0; i < quantity; i++) {
      const depth = .25 + (i % 7) / 9, phase = i * 2.39996;
      const px = ((i * .618034 + time * .009 * depth) % 1) * (width + 90) - 45 + Math.sin(time * .23 + phase) * 28 + x * 32 * depth;
      const py = ((i * .381966 - time * .007 * depth) % 1 + 1) % 1 * height + Math.sin(time * .18 + phase) * 17 + y * 18 * depth;
      // Keep the center portrait/reading area quiet; bright air belongs to edges.
      const center = px > width * .26 && px < width * .74 && py > height * .14 && py < height * .86;
      ctx.fillStyle = `rgba(${i % 4 ? p.rgb : p.glow},${(center ? .12 : .42) * depth * p.opacity})`;
      ctx.beginPath(); ctx.arc(px, py, .7 + depth * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Collection completes a stable constellation at the upper edge of the stage.
    const nodes = [{x: .46, y: .18}, {x: .5, y: .145}, {x: .54, y: .18}];
    nodes.forEach((point, i) => {
      if (!collected.has(ids[i])) return;
      const px = point.x * width, py = point.y * height;
      if (collected.size === 3) {
        const next = nodes[(i + 1) % 3]; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(next.x * width, next.y * height);
        ctx.strokeStyle = `rgba(${p.rgb},.4)`; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.fillStyle = `rgba(${p.rgb},.85)`; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
    });
    if (payoff > 0 && !staticMotion()) {
      const alpha = Math.min(1, payoff) * .24;
      ctx.strokeStyle = `rgba(${p.rgb},${alpha})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(width * .5, height * .17, (1 - payoff / 2) * 85, (1 - payoff / 2) * 28, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  function tick(stamp) {
    frame = 0; if (!active()) { updatePause(); return; }
    if (!last) last = stamp;
    // Render at <= 30fps; smooth exponential damping is independent of frame cadence.
    if (stamp - last >= 31) {
      const dt = Math.min((stamp - last) / 1000, .06); last = stamp; time += dt;
      const damp = 1 - Math.exp(-dt * 4.2); x += (targetX - x) * damp; y += (targetY - y) * damp;
      payoff = Math.max(0, payoff - dt); setLayers(); draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function start() { if (!frame && active()) { last = 0; frame = requestAnimationFrame(tick); } }
  listen(root, 'pointermove', event => {
    // Touch remains native scroll/swipe; its game interaction is the three seed buttons.
    if (event.pointerType === 'touch' || !active() || event.target.closest('button,a,input,dialog')) return;
    targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / width * 2 - 1));
    targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / height * 2 - 1));
  }, {passive: true});
  listen(root, 'pointerleave', () => { targetX = targetY = 0; }, {passive: true});
  listen(root, 'pointerup', () => { if (!fine.matches) targetX = targetY = 0; }, {passive: true});
  listen(pause, 'click', () => {
    userPaused = !userPaused; try { localStorage.setItem('halloween-yearbook:motion-paused:v1', String(userPaused)); } catch {}
    updatePause();
  });
  seedButtons.forEach((button, i) => listen(button, 'click', () => {
    if (collected.has(ids[i])) return;
    collected.add(ids[i]); root.dataset.seals = JSON.stringify([...collected]); readSeals();
    payoff = 2;
    live.textContent = collected.size === 3 ? '3つの光がつながり、星座の封印が完成しました。旅のしおりに残ります。' : `${collected.size}つ目の光を集めました。あと${3 - collected.size}つ。`;
    root.dispatchEvent(new CustomEvent('yearbook:seal-collected', {bubbles: true, detail: {id: ids[i]}}));
    if (!active()) draw();
  }));
  const observer = new MutationObserver(records => {
    if (records.some(r => r.attributeName === 'data-seals')) readSeals();
    applyMode(); if (!active()) draw();
  });
  observer.observe(root, {attributes: true, attributeFilter: ['data-mode', 'data-horror', 'data-theme', 'data-seals']});
  const dialogs = new MutationObserver(updatePause);
  document.querySelectorAll('dialog').forEach(el => dialogs.observe(el, {attributes: true, attributeFilter: ['open']}));
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root);
  listen(document, 'visibilitychange', updatePause); listen(media, 'change', updatePause);
  listen(window, 'resize', resize, {passive: true});
  applyMode(); readSeals(); resize(); updatePause();
  return {
    // Explicit opt-in touch-look may feed normalized coordinates; the caller owns
    // gesture arbitration. Default listeners never capture touch or stop scrolling.
    setView(viewX, viewY) {
      if (!active()) return;
      targetX = Number.isFinite(viewX) ? Math.max(-1, Math.min(1, viewX)) : 0;
      targetY = Number.isFinite(viewY) ? Math.max(-1, Math.min(1, viewY)) : 0;
    },
    setPaused(value) { userPaused = Boolean(value); updatePause(); },
    destroy() {
      cancelAnimationFrame(frame); abort.abort(); observer.disconnect(); dialogs.disconnect(); resizeObserver.disconnect();
      layers.forEach(({el, initial}) => el.style.translate = initial);
      atmosphere.remove(); controls.remove(); delete root.dataset.sceneReady; delete root.dataset.motionPaused; delete root.dataset.constellation;
    }
  };
}
