(() => {
  'use strict';

  const ids = [1, 2, 3];
  const imageData = new Map();

  function imageId(src = '') {
    const match = String(src).match(/creator-(1|2|3)\.(?:jpg|webp)(?:\?.*)?$/);
    return match ? Number(match[1]) : null;
  }

  function replaceImage(img) {
    const id = imageId(img.getAttribute('src'));
    if (!id || !imageData.has(id)) return;
    img.src = imageData.get(id);
    img.removeAttribute('srcset');
  }

  function applyImages(root = document) {
    if (root.matches?.('img')) replaceImage(root);
    root.querySelectorAll?.('img').forEach(replaceImage);
  }

  async function loadImage(id) {
    const response = await fetch(`./assets/creator-${id}-data.txt?v=6`, {
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`画像${id}の読み込みに失敗しました`);
    const base64 = (await response.text()).trim();
    if (!base64) throw new Error(`画像${id}のデータが空です`);
    imageData.set(id, `data:image/webp;base64,${base64}`);
  }

  async function start() {
    try {
      await Promise.all(ids.map(loadImage));
      applyImages(document);

      new MutationObserver(records => {
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (node.nodeType === 1) applyImages(node);
          });
        });
      }).observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    } catch (error) {
      console.error('[画像読み込みエラー]', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
