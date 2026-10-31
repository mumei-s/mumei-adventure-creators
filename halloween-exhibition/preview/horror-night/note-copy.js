/** Copy only editor-safe blocks. Never derive plain text with detached innerText. */
export const COPY_VERSION = '20261031-copy-3';
export function makeNotePayload(sourceHTML, doc = document) {
  const parsed = new DOMParser().parseFromString(sourceHTML, 'text/html');
  const blocks = [];
  // Sections and portal wrappers are for the reading page, not the note editor.
  for (const node of parsed.body.querySelectorAll('h2, p, a.portal-link')) {
    const block = doc.createElement(node.tagName === 'H2' ? 'h2' : 'p');
    if (node.matches('a.portal-link')) block.append(node.cloneNode(true));
    else for (const child of [...node.childNodes]) block.append(child.cloneNode(true));
    for (const el of [...block.querySelectorAll('*')]) {
      if (!['A', 'BR', 'STRONG', 'EM', 'B', 'I'].includes(el.tagName)) {
        el.replaceWith(doc.createTextNode(el.textContent || ''));
        continue;
      }
      const href = el.tagName === 'A' ? el.getAttribute('href') : null;
      for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
      if (href) {
        try {
          const url = new URL(href, doc.baseURI);
          if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) throw new Error('Unsafe link');
          el.setAttribute('href', url.href);
          el.setAttribute('style', 'text-decoration: underline;');
        } catch { el.replaceWith(doc.createTextNode(el.textContent || '')); }
      }
    }
    blocks.push(block);
  }
  const plain = blocks.map(block => {
    const clone = block.cloneNode(true);
    for (const br of clone.querySelectorAll('br')) br.replaceWith(doc.createTextNode('\n'));
    return clone.textContent || '';
  }).join('\n\n');
  const fragment = blocks.map(block => block.outerHTML).join('\n');
  return Object.freeze({
    fragment,
    html: '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><!--StartFragment-->' + fragment + '<!--EndFragment--></body></html>',
    plain,
    links: blocks.reduce((sum, block) => sum + block.querySelectorAll('a[href]').length, 0),
    blocks: blocks.length,
    headings: blocks.filter(block => block.tagName === 'H2').length
  });
}

function showSource(payload, source) {
  source.hidden = false;
  source.innerHTML = payload.fragment;
  source.contentEditable = 'true';
  source.setAttribute('aria-label', 'コピー用本文。編集せず、選択してコピーしてください。');
  source.setAttribute('spellcheck', 'false');
  source.style.userSelect = 'text';
  source.style.webkitUserSelect = 'text';
  source.onbeforeinput = event => event.preventDefault();
}
function selectSource(source) {
  source.focus({preventScroll:true});
  const selection = window.getSelection();
  if (!selection) return false;
  const range = document.createRange();
  range.selectNodeContents(source);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

export async function copyForNote({sourceHTML, button, status, source}) {
  const payload = makeNotePayload(sourceHTML);
  const scroll = {left:window.scrollX, top:window.scrollY};
  const wasHidden = source.hidden;
  showSource(payload, source);
  selectSource(source);
  // Native copy is tried first for Android browser compatibility. Both MIME
  // representations are explicit; the plain representation retains paragraphs.
  let formatWritten = false;
  const handler = event => {
    if (!event.clipboardData) return;
    try {
      event.clipboardData.setData('text/html', payload.html);
      event.clipboardData.setData('text/plain', payload.plain);
      event.preventDefault();
      formatWritten = true;
    } catch { /* Try the async Clipboard API below. */ }
  };
  document.addEventListener('copy', handler, true);
  let copied = false;
  try { copied = document.execCommand('copy') && formatWritten; } catch {}
  finally { document.removeEventListener('copy', handler, true); }
  if (!copied && window.ClipboardItem && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([payload.html], {type:'text/html'}),
        'text/plain': new Blob([payload.plain], {type:'text/plain'})
      })]);
      copied = true;
    } catch { /* Leave the visible source selected for manual copy. */ }
  }
  if (copied) {
    window.getSelection()?.removeAllRanges();
    if (wasHidden) source.hidden = true;
    button.focus({preventScroll:true});
    window.scrollTo(scroll);
    button.textContent = '本文をコピーしました';
    status.textContent = `リンク${payload.links}個・段落区切り・続きの見出しを含む形式でコピーしました。note本文を長押しして「貼り付け」を選び、結果を確認してください。装飾コードは通常の本文に入ります。`;
  } else {
    selectSource(source);
    source.scrollIntoView({block:'start'});
    button.textContent = 'もう一度コピー';
    status.textContent = '自動コピーできませんでした。選択済みの本文を、ブラウザの「コピー」でコピーしてください。';
  }
  return {copied, payload};
}

export function installCopyChecks({getHTML, tools, source}) {
  const details = document.createElement('details');
  details.className = 'small';
  details.style.margin = '12px 0';
  details.innerHTML = `<summary>リンク・改行が消える場合の確認</summary>
<p>キーボードのクリップボード履歴ではなく、本文を長押ししたメニューから貼り付けてください。下の欄は、このページでコピーした本文の形式を確認するためのものです。入力内容を送信・保存しません。</p>
<button type="button" data-select-copy>コピー用本文を表示・選択</button>
<p style="margin-top:12px">ここを長押しして貼り付けると、リンク情報と改行の有無を確認できます。</p>
<div data-paste-check contenteditable="true" role="textbox" aria-label="コピーした本文の貼り付け確認欄" style="min-height:64px;border:1px solid currentColor;border-radius:8px;padding:12px;white-space:pre-wrap">貼り付け確認欄</div>
<p data-paste-result role="status" style="margin-top:8px"></p>`;
  tools.append(details);
  details.querySelector('[data-select-copy]').onclick = () => {
    const payload = makeNotePayload(getHTML());
    showSource(payload, source);
    source.scrollIntoView({block:'start'});
    selectSource(source);
  };
  details.querySelector('[data-paste-check]').addEventListener('paste', event => {
    event.preventDefault();
    const data = event.clipboardData;
    const html = data?.getData('text/html') || '';
    const plain = data?.getData('text/plain') || '';
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const links = parsed.querySelectorAll('a[href]').length;
    const breaks = (plain.match(/\n/g) || []).length;
    const blocks = parsed.querySelectorAll('p,h2,h3').length;
    event.currentTarget.textContent = `リンク情報：${links}個 / 改行：${breaks} / HTML段落：${blocks}`;
    details.querySelector('[data-paste-result]').textContent = links > 0 && (breaks > 0 || blocks > 1)
      ? 'この端末の貼り付けデータには、リンクと段落が残っています。note側での見え方は、noteへの貼り付け後に確認してください。'
      : 'リンク付き形式または段落が届いていません。「コピー用本文を表示・選択」からブラウザのコピーを使ってください。';
  });
}
