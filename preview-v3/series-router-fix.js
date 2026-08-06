(() => {
  'use strict';

  const root = () => window.MUMEI_SERIES?.root || new URL('./', location.href).href;
  const urlFor = target => {
    const u = new URL(root());
    u.searchParams.set('series', target);
    u.hash = '';
    return u.href;
  };

  function targetFrom(node) {
    const text = (node?.textContent || '').trim();
    const href = node?.getAttribute?.('href') || '';
    if (/戦国|sengoku/i.test(text + ' ' + href)) return 'sengoku';
    if (/冒険|adventure/i.test(text + ' ' + href)) return 'adventure';
    return null;
  }

  function rewrite(rootNode = document) {
    rootNode.querySelectorAll?.('.series-switch a,.series-title-links a,.series-admin-panel a.btn').forEach(a => {
      const target = targetFrom(a);
      if (target) a.href = urlFor(target);
    });
  }

  document.addEventListener('click', event => {
    const a = event.target.closest?.('.series-switch a,.series-title-links a,.series-admin-panel a.btn');
    if (!a) return;
    const target = targetFrom(a);
    if (!target) return;
    event.preventDefault();
    location.href = urlFor(target);
  }, true);

  const start = () => {
    rewrite(document);
    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1) rewrite(node);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
