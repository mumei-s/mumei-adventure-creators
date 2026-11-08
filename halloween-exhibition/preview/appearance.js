/** Appearance is independent of the seasonal collection and scenic brightness. */
export const APPEARANCE_KEY = 'atelier-global-appearance-v1';
export const normalizeAppearance = value => ['system', 'light', 'dark'].includes(value) ? value : 'system';
export const effectiveAppearance = (mode, osDark) => mode === 'dark' || (normalizeAppearance(mode) === 'system' && osDark) ? 'dark' : 'light';
export function readAppearance(storage) {
  try { const stored = storage?.getItem(APPEARANCE_KEY); return stored === null && storage?.getItem('halloween-night') === 'on' ? 'dark' : normalizeAppearance(stored); } catch { return 'system'; }
}
export function initAppearance({container, onChange = () => {}} = {}) {
  const doc = container?.ownerDocument, win = doc?.defaultView;
  if (!win?.matchMedia) return {destroy() {}};
  const os = win.matchMedia('(prefers-color-scheme: dark)');
  let mode; try { mode = readAppearance(win.localStorage); } catch { mode = 'system'; }
  const section = doc.createElement('section'); section.className = 'appearance-settings';
  const label = doc.createElement('label'); label.textContent = '画面の色';
  const select = doc.createElement('select'); select.setAttribute('aria-label', '画面の色');
  for (const [value, text] of [['system', '端末に合わせる'], ['light', '明るい'], ['dark', '暗い']]) {
    const option = doc.createElement('option'); option.value = value; option.textContent = text; select.append(option);
  }
  const help = doc.createElement('p'); help.className = 'visitor-settings-note';
  help.textContent = '入口・展示・イラストツールで共通の設定です。作品の色や背景の明るさは変わりません。';
  label.append(select); section.append(label, help); container.append(section);
  function apply() {
    const resolved = effectiveAppearance(mode, os.matches);
    doc.documentElement.dataset.siteTheme = resolved;
    doc.documentElement.style.colorScheme = resolved;
    doc.body.dataset.globalAppearance = mode;
    select.value = mode;
    onChange({mode, resolved});
  }
  select.addEventListener('change', () => {
    mode = normalizeAppearance(select.value);
    try { win.localStorage.setItem(APPEARANCE_KEY, mode); } catch { /* Apply without persistence. */ }
    apply();
  });
  const fromOS = () => { if (mode === 'system') apply(); };
  const restore = () => {
    try { mode = readAppearance(win.localStorage); } catch { mode = 'system'; }
    apply();
  };
  const fromStorage = event => { if (event.key === APPEARANCE_KEY || event.key === null) restore(); };
  os.addEventListener?.('change', fromOS); win.addEventListener('storage', fromStorage);
  win.addEventListener('pageshow', restore); apply();
  return {destroy() { os.removeEventListener?.('change', fromOS); win.removeEventListener('storage', fromStorage); win.removeEventListener('pageshow', restore); section.remove(); }};
}
