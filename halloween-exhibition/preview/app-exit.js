/** Explicit castle-only exit. Browser close restrictions are never worked around. */
export function createAppExitController({ canExit, stop = () => {}, resume = () => {}, render = () => {}, close = () => {} }) {
  let ended = false;
  return {
    getState: () => ({ ended }),
    end() {
      if (ended || !canExit()) return false;
      ended = true;
      stop();
      render(true);
      // Keep this attempt in the original button click. close() has no success value.
      // If the browser refuses or throws, the already-rendered quiet screen remains.
      try { close(); } catch {}
      return true;
    },
    resume() {
      if (!ended) return false;
      ended = false;
      resume();
      render(false);
      return true;
    },
  };
}

export function initAppExit({ root, triggerParent, onStop, onResume } = {}) {
  if (!root || !triggerParent) return null;
  const doc = root.ownerDocument, win = doc.defaultView;
  const make = (tag, text, className) => {
    const element = doc.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  // Keep exit outside the horizontally scrolling toolbar so it is discoverable
  // on narrow screens. The header's existing ResizeObserver reserves this row.
  const panel = make('div', undefined, 'castle-exit-panel');
  panel.id = 'castle-exit-panel'; panel.hidden = true; panel.inert = true;
  panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'お城の入口の操作');
  const label = make('span', 'お城の入口', 'castle-exit-label');
  const trigger = make('button', 'アプリ終了', 'app-exit-trigger');
  trigger.id = 'app-exit'; trigger.type = 'button'; trigger.hidden = true;
  panel.append(label, trigger);
  (root.querySelector('.masthead') || triggerParent).append(panel);
  const screen = make('section', undefined, 'app-ended-screen');
  screen.id = 'app-ended-screen'; screen.hidden = true;
  screen.setAttribute('aria-labelledby', 'app-ended-title');
  const title = make('h1', 'ご来場ありがとうございました。');
  title.id = 'app-ended-title'; title.tabIndex = -1;
  const status = make('p', '音楽と演出を停止しました。');
  const guidance = make('p'); guidance.className = 'app-ended-guidance';
  const back = make('button', 'お城に戻る', 'app-ended-return'); back.type = 'button';
  screen.append(title, status, guidance, back); doc.body.append(screen);
  const atCastle = () => root.dataset.palaceState === 'palace' && !doc.hidden;
  let priorHidden = false, priorInert = false;
  const controller = createAppExitController({
    canExit: atCastle,
    stop() {
      priorHidden = root.hidden; priorInert = root.inert;
      for (const dialog of doc.querySelectorAll('dialog[open]')) dialog.close();
      onStop?.();
    },
    resume: () => onResume?.(),
    render(ended) {
      root.hidden = ended ? true : priorHidden;
      root.inert = ended ? true : priorInert;
      screen.hidden = !ended;
      refresh();
      if (ended) {
        doc.body.dataset.appEnded = 'true';
        const standalone = win.matchMedia?.('(display-mode: standalone)').matches || win.navigator?.standalone === true;
        guidance.textContent = standalone ? 'この画面が残る場合は、端末の操作でアプリ画面を閉じてください。' : 'この画面が残る場合は、ブラウザのタブを閉じてください。';
        title.focus({ preventScroll: true });
      } else {
        delete doc.body.dataset.appEnded;
        if (!doc.hidden) {
          const gate = root.querySelector('#palace-gate');
          (gate && !gate.disabled ? gate : trigger).focus({ preventScroll: true });
        }
      }
    },
    close: () => win.close(),
  });
  function refresh() {
    const available = atCastle() && !controller.getState().ended;
    panel.hidden = !available; panel.inert = !available;
    trigger.hidden = !available; trigger.disabled = !available;
  }
  trigger.addEventListener('click', () => controller.end());
  back.addEventListener('click', () => controller.resume());
  doc.addEventListener('visibilitychange', refresh);
  const observer = new win.MutationObserver(refresh);
  observer.observe(root, { attributes: true, attributeFilter: ['data-palace-state'] });
  refresh();
  return { ...controller, refresh, destroy() { observer.disconnect(); doc.removeEventListener('visibilitychange', refresh); panel.remove(); screen.remove(); } };
}
