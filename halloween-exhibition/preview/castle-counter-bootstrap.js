// Optional visitor count never blocks the palace, gallery or game startup.
const root = document.getElementById('theater');
if (root) import('./castle-visit-counter.js?v=20261017-castle2')
  .then(module => {
    // The exit header is created by the independent gallery startup module.
    const mount = () => {
      const header = root.querySelector('#castle-exit-panel');
      if (!header) return false;
      module.initCastleVisitCounter({ root, mount: header });
      return true;
    };
    if (mount()) return;
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(root, { childList: true, subtree: true });
  })
  .catch(() => {});
