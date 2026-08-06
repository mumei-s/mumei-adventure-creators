(() => {
  const replacements = {
    'creator-1.jpg': 'creator-1.webp',
    'creator-2.jpg': 'creator-2.webp',
    'creator-3.jpg': 'creator-3.webp'
  };
  const fixImages = (root = document) => {
    root.querySelectorAll?.('img').forEach(img => {
      for (const [from, to] of Object.entries(replacements)) {
        if (img.getAttribute('src')?.endsWith(from)) {
          img.src = img.getAttribute('src').replace(from, to);
          break;
        }
      }
    });
  };
  document.addEventListener('DOMContentLoaded', () => fixImages());
  new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {
    if (n.nodeType === 1) fixImages(n);
  }))).observe(document.documentElement, { childList: true, subtree: true });
})();
