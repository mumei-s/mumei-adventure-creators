import { artworkMime } from '../../../tower/quality-assist.js?v=20261119-scene';

async function withImage(blob, draw) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await draw(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasPng(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob =>
    blob ? resolve(blob) : reject(new Error('参照画像を作れませんでした。')), 'image/png'));
}

function singlePng(blob) {
  if (blob.type === 'image/png') return Promise.resolve(blob);
  return withImage(blob, image => {
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvasPng(canvas);
  });
}

// Prepare the files on selection, so the native share call can run in the tap itself.
export async function prepareSpotFile(file, role) {
  const mime = artworkMime(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!mime) throw new Error('この画像の形式を確認してください。');
  const source = file.slice(0, file.size, mime);
  const blob = mime === 'image/jpeg' || mime === 'image/png' ? source : await singlePng(source);
  return new File([blob], 'atelier-' + role + (blob.type === 'image/jpeg' ? '.jpg' : '.png'), { type: blob.type });
}

function referencePng(files) {
  if (files.length === 1) return singlePng(files[0]);
  return withImage(files[0], person => withImage(files[1], item => {
    const panels = [person, item].map(image => {
      const scale = Math.min(1, 1350 / image.naturalWidth, 1600 / image.naturalHeight);
      return { image, w: Math.max(1, Math.round(image.naturalWidth * scale)), h: Math.max(1, Math.round(image.naturalHeight * scale)) };
    });
    const pad = 16, header = 58;
    const widths = panels.map(panel => Math.max(230, panel.w) + 2 * pad);
    const canvas = document.createElement('canvas');
    canvas.width = widths[0] + widths[1];
    canvas.height = Math.max(...panels.map(panel => panel.h)) + header + pad;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4f1eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#192631';
    let x = 0;
    panels.forEach(({image, w, h}, index) => {
      ctx.fillText(index ? '乗り物・小物 / ITEM' : '人物 / PERSON', x + pad, 38);
      ctx.drawImage(image, x + (widths[index] - w) / 2, header + (canvas.height - header - pad - h) / 2, w, h);
      x += widths[index];
    });
    return canvasPng(canvas);
  }));
}

export function bindSpotHandoff(dialog, getFiles, copyText) {
  const el = id => dialog.querySelector('#' + id);
  const controls = el('spot-file-actions'), hints = el('spot-transfer-hint');
  const paste = el('spot-copy-image'), save = el('spot-save-images'), textOnly = el('spot-copy-text');
  const message = el('spot-message'), prompt = el('spot-text');
  const canPaste = Boolean(window.ClipboardItem && navigator.clipboard?.write);
  let active = false;

  function sharePayload(files) {
    if (!navigator.share || !navigator.canShare) return null;
    const mixed = {files, text: prompt.value};
    if (navigator.canShare(mixed)) return mixed;
    return navigator.canShare({files}) ? {files} : null;
  }
  function paint(enabled, issue) {
    active = enabled;
    const files = enabled ? getFiles() : [];
    controls.hidden = !files.length || Boolean(issue);
    if (controls.hidden) {
      hints.textContent = enabled ? '登録画像はプロンプトに参照先が入ります。端末の画像を選ぶと、その画像も渡せます。' : '';
      return null;
    }
    const label = files.length === 2 ? '人物と乗り物・小物の画像' : files[0].name.startsWith('atelier-person.') ? '人物画像' : '乗り物・小物の画像';
    const share = sharePayload(files);
    paste.hidden = !canPaste || !share;
    save.hidden = !canPaste && !share;
    hints.textContent = share
      ? '共有先にChatGPTを選び、画像と文章を確認して送信してください。文章が空なら貼り付けます。今のチャットで続けるときは、下の「参照画像を'+(canPaste ? 'コピー' : '保存')+'」を使えます。'
      : canPaste ? '先に画像をコピーして、使いたいChatGPTチャットに貼り付けます。次にここで文章をコピーし、画像と一緒に送信してください。'
      : '参照画像を保存し、ChatGPTの「＋」から添えます。次にここで文章をコピーし、画像と一緒に送信してください。';
    return share ? label + 'とプロンプトを共有' : canPaste ? label + 'をコピー' : label + 'を保存';
  }
  function stillSelected(files, value) {
    const current = getFiles();
    return active && dialog.open && prompt.value === value && current.length === files.length && files.every((file, i) => file === current[i]);
  }
  async function imageAction(download) {
    const files = getFiles(), value = prompt.value;
    if (!active || !files.length) return;
    const filename = files.length === 2 ? 'atelier-person-and-item.png' : files[0].name.replace(/\.jpg$/, '.png');
    try {
      const png = referencePng(files);
      if (download) {
        const blob = await png;
        if (!stillSelected(files, value)) return;
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        await navigator.clipboard.write([new ClipboardItem({'image/png': png})]);
      }
      if (stillSelected(files, value)) message.textContent = download
        ? 'ChatGPTの「＋」から、ダウンロードした ' + filename + ' を添えてください。'
        : '参照画像をコピーしました。今のChatGPTの入力欄に貼り付けてください。プロンプトも必要なら、画像を貼ったあとで「文章だけコピー」を押します。';
    } catch {
      if (stillSelected(files, value)) message.textContent = download ? '画像を保存できませんでした。上のプレビューを長押しして保存できます。' : '画像をコピーできませんでした。「参照画像を保存」から渡せます。';
    }
  }
  async function send() {
    const files = getFiles(), value = prompt.value;
    if (!active || !files.length) return;
    const payload = sharePayload(files);
    if (!payload) return imageAction(!canPaste);
    // Some share targets take only the files. Start the backup copy without awaiting away user activation.
    let backup;
    try { backup = navigator.clipboard.writeText(value).then(() => true, () => false); } catch { backup = false; }
    try {
      await navigator.share(payload);
      const copied = await backup;
      if (stillSelected(files, value)) message.textContent = '共有先で画像を確認してください。文章が空なら' +
        (copied ? 'コピー済みのプロンプトを貼り付けてください。' : 'ここで「文章だけコピー」を押して貼り付けてください。');
    } catch (error) {
      if (stillSelected(files, value)) message.textContent = error.name === 'AbortError'
        ? '共有を閉じました。選んだ画像はここに残っています。'
        : '共有を開けませんでした。参照画像をコピーまたは保存して、今のチャットで使えます。';
    }
  }
  textOnly.addEventListener('click', () => copyText('文章をコピーしました。参照画像が入ったチャットに貼り付けてください。'));
  paste.addEventListener('click', () => imageAction(false));
  save.addEventListener('click', () => imageAction(true));
  return { paint, send };
}
