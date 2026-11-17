const labels = {
  avatar: 'アバター', interior: '部屋画像', scene1: '本文イラスト１',
  scene2: '本文イラスト２', cover: '専用サムネイル',
};

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function pixelDifference(a, b) {
  if (!a || !b || a.length !== b.length) return 1;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference += Math.abs(a[index] - b[index]);
  return difference / (a.length * 255);
}

export function atlasChecks({ width, height, data }) {
  const errors = [], warnings = [];
  if (width % 4 || height % 4 || width < 160 || height < 160) {
    return { errors: ['４×４に均等に分けられる160px以上のシートが必要です。'], warnings };
  }
  const cellWidth = width / 4, cellHeight = height / 4;
  let transparent = 0, empty = 0, touching = 0;
  for (let cell = 0; cell < 16; cell++) {
    let mass = 0, edge = 0;
    for (let y = 0; y < cellHeight; y++) {
      for (let x = 0; x < cellWidth; x++) {
        const pixel = ((Math.floor(cell / 4) * cellHeight + y) * width + cell % 4 * cellWidth + x) * 4;
        if (data[pixel + 3] < 32) transparent++;
        else {
          mass++;
          if (x === 0 || x === cellWidth - 1 || y === 0 || y === cellHeight - 1) edge++;
        }
      }
    }
    if (mass < cellWidth * cellHeight * .012) empty++;
    if (edge > 3) touching++;
  }
  if (empty) errors.push(`${empty}マスにキャラクターが見つかりません。`);
  if (transparent < width * height * .12) errors.push('背景の透過を確認できません。透明背景で作り直してください。');
  if (touching) warnings.push(`${touching}マスで輪郭がマスの端に触れています。頭・靴の欠けを確認してください。`);
  return { errors, warnings };
}

export function articleChecks(text, { title, urls = [], mode = 'spot', occupied = false } = {}) {
  const lines = text.split(/\r?\n/).map(line => line.trim());
  const errors = [];
  if (!text.trim()) return ['記事本文が未入力です。'];
  if (!text.includes('無名S note') || !text.includes('企画主')) errors.push('企画主・無名S noteの紹介を入れてください。');
  const actualTitle = lines.find(Boolean)?.replace(/^#+\s*/, '');
  if (title && actualTitle !== title.trim()) errors.push('記事の先頭タイトルと入力したタイトルが一致しません。');
  const markers = mode === 'room' ? ['［ここにアバター画像］', '［ここに部屋画像］'] :
    ['［ここに街のイラスト１］', '［ここに街のイラスト２］'];
  for (const marker of markers) if (!text.includes(marker)) errors.push(`${marker} の挿入位置がありません。`);
  for (const url of urls) if (!lines.includes(url)) errors.push(`カード用URLを単独行にしてください。 ${url}`);
  if (lines.filter(Boolean).at(-1) !== '#無名Sプロンプト') errors.push('末尾のハッシュタグを #無名Sプロンプト にしてください。');
  if (!occupied && /入居しました|入居を完了しました|入居済みです|引っ越しが完了しました/.test(text)) {
    errors.push('入居の完了を確認できていません。現在の状態に合わせて表現を確認してください。');
  }
  return errors;
}

export function normalizeCardLines(text, urls) {
  return text.split(/\r?\n/).map(line => {
    const found = (line.match(/https?:\/\/[^\s<>"'）)\]]+/g) ?? []).map(item => item.replace(/[。、」』]+$/u, ''));
    const url = urls.find(item => found.includes(item));
    if (!url) return line;
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const label = line.replace(new RegExp('\\[([^\\]]+)\\]\\(' + escaped + '\\)'), '$1')
      .replace(url, '').replace(/^[\s>・*-]+|[\s「」『』"'\[\]（）()。]+$/g, '').trim();
    return label ? label + '\n\n' + url + '\n' : '\n' + url + '\n';
  }).join('\n').replace(/\n{4,}/g, '\n\n');
}

export async function inspectImage(source, role, { atlas = false } = {}) {
  if (source instanceof File && (!/^image\/(png|jpeg|webp|gif)$/.test(source.type) || source.size > 10 * 1024 * 1024)) {
    throw new Error('PNG・JPEG・WebP・GIFの10MB以下の画像を選んでください。');
  }
  const temporary = source instanceof Blob;
  const url = temporary ? URL.createObjectURL(source) : source;
  const image = new Image();
  let timeout;
  try {
    image.src = url;
    await Promise.race([
      image.decode(),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('画像の読み込みを再試行してください。')), 12000); }),
    ]);
    const { naturalWidth: width, naturalHeight: height } = image;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = atlas ? 256 : 96;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('この端末で画像を検査できません。');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const errors = [], warnings = [];
    if (atlas) {
      if (width % 4 || height % 4 || width < 160 || height < 160) errors.push('歩行シートの４×４形式を確認してください。');
      const result = atlasChecks(pixels);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
    const ratio = width / height;
    if (role === 'interior' && ratio < 1.2) errors.push('部屋には横長の内装画像を選んでください。');
    if (role === 'cover') {
      if (Math.abs(ratio - 1280 / 650) > .06) errors.push('サムネイルは1280×650に合う横長比率で作り直してください。');
      if (width < 1280 || height < 650) errors.push('サムネイルは1280×650以上の画像が必要です。');
    }
    if (role.startsWith('scene') && ratio < 1.2) warnings.push('本文用は横３対２を推奨します。構図を確認してください。');
    if (role === 'avatar' ? height < 160 || width < 32 : Math.min(width, height) < 200) {
      errors.push('画像が小さすぎます。元の完成画像を添付してください。');
    }
    // Use a small opaque preview for compression-independent duplicate checks.
    canvas.width = canvas.height = 32;
    context.fillStyle = '#fafafa';
    context.fillRect(0, 0, 32, 32);
    context.drawImage(image, 0, 0, 32, 32);
    const fingerprint = Array.from(context.getImageData(0, 0, 32, 32).data);
    canvas.width = Math.min(width, 240);
    canvas.height = Math.max(1, Math.round(canvas.width * height / width));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL('image/png');
    return { width, height, fingerprint, errors, warnings, preview };
  } catch (error) {
    throw new Error(error.message || '画像を開けません。保存した画像を選び直してください。');
  } finally {
    clearTimeout(timeout);
    if (temporary) URL.revokeObjectURL(url);
    image.src = '';
  }
}

export function bindQualityAssist(container, { mode, getContext, repair, external = [] }) {
  const roles = mode === 'room' ? ['avatar', 'interior', 'cover'] : ['scene1', 'scene2', 'cover'];
  const entries = new Map(), pending = new Map();
  const details = node('details', '', 'quality-panel');
  details.append(node('summary', '生成した作品を検査する'));
  details.append(node('p', '画像の表示・形式・重複と記事のリンクを自動検査します。人物や文字の正しさは、下の確認欄で作品を見て確認してください。', 'quality-description'));
  const files = node('div', '', 'quality-files');
  const rows = new Map();
  function invalidateManual() {
    for (const input of manual.querySelectorAll('input')) input.checked = false;
  }
  for (const role of roles) {
    const row = node('div', '', 'quality-file');
    row.append(node('strong', labels[role]));
    const preview = node('img');
    preview.alt = labels[role] + 'の検査用プレビュー';
    preview.hidden = true;
    const result = node('p', '未添付');
    result.setAttribute('role', 'status');
    if (!external.includes(role)) {
      const label = node('label', labels[role] + 'を添付');
      const input = node('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/gif';
      input.addEventListener('change', () => void accept(role, input.files[0]));
      label.append(input);
      row.append(label);
    }
    const fix = node('button', labels[role] + 'だけ修正する');
    fix.type = 'button';
    fix.addEventListener('click', () => repair(role, title.value, entries.get(role)?.errors?.join(' ')));
    row.append(preview, result, fix);
    rows.set(role, { preview, result });
    files.append(row);
  }
  const titleLabel = node('label', '記事とサムネイルのタイトル');
  const title = node('input');
  title.type = 'text';
  title.maxLength = 100;
  titleLabel.append(title);
  const articleLabel = node('label', '生成した参加記事');
  const article = node('textarea');
  article.rows = 5;
  article.placeholder = '生成したタイトルと本文を貼り付ける';
  articleLabel.append(article);
  const articleStatus = node('p', '記事は未入力です。');
  articleStatus.setAttribute('role', 'status');
  const format = node('button', 'カード用URLを単独行に整える');
  format.type = 'button';
  format.addEventListener('click', () => {
    article.value = normalizeCardLines(article.value, getContext().urls);
    render();
  });
  const fixArticle = node('button', '記事だけ修正する');
  fixArticle.type = 'button';
  fixArticle.addEventListener('click', () => repair('article', title.value, articleStatus.textContent));
  const manual = node('fieldset', '', 'quality-manual');
  manual.append(node('legend', '作品を見て確認する項目'));
  const checks = [
    '参照キャラと顔立ち・髪型・髪色・衣装が一致している',
    mode === 'room' ? '全身と靴が入り、歩行シートの向きと姿勢がそろっている' : '本文の２枚は場面・動作・構図・カメラ角度が異なる',
    '手足・接地・家具や建物との大きさと遠近感が自然',
    '専用サムネイルの演出が本文画像と異なり、顔と文字が切れていない',
    'サムネイルに上のタイトルと #無名Sプロンプト が正しく入っている',
    '記事が本人の文体と実際の体験・入居状態に合っている',
  ];
  for (const check of checks) {
    const label = node('label');
    const input = node('input');
    input.type = 'checkbox';
    input.addEventListener('change', render);
    label.append(input, node('span', check));
    manual.append(label);
  }
  const overall = node('p', '成果物がそろっていません。', 'quality-overall');
  overall.setAttribute('role', 'status');
  const copy = node('button', '検査後の記事をコピー');
  copy.type = 'button';
  copy.disabled = true;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(article.value);
      overall.textContent = '記事をコピーしました。noteでカード用URLを個別に貼り、改行してください。';
    } catch {
      article.focus();
      article.select();
      overall.textContent = '選択した記事をコピーしてください。';
    }
  });
  for (const input of [article, title]) input.addEventListener('input', () => { invalidateManual(); render(); });
  details.append(files, titleLabel, articleLabel, articleStatus, format, fixArticle, manual, overall, copy);
  container.append(details);

  function render() {
    const missing = roles.filter(role => !entries.has(role));
    let errors = 0, warnings = 0;
    for (const [role, result] of entries) {
      const { preview, result: line } = rows.get(role);
      const duplicate = [...entries].find(([key, other]) => key !== role &&
        pixelDifference(other.fingerprint, result.fingerprint) < .004);
      const similar = [...entries].some(([key, other]) => key !== role &&
        pixelDifference(other.fingerprint, result.fingerprint) < .045);
      const problems = [...result.errors];
      if (duplicate) problems.push(`${labels[duplicate[0]]}と同じ画像です。別々の完成画像を選んでください。`);
      if (similar && !duplicate) warnings++;
      errors += problems.length;
      warnings += result.warnings.length;
      line.textContent = problems.length ? problems.join(' ') :
        `自動検査 ${result.width}×${result.height} · 表示・形式確認済み${similar ? ' · 構図の類似を目視確認してください。' : ''}`;
      if (result.warnings.length) line.textContent += ' ' + result.warnings.join(' ');
      preview.src = result.preview;
      preview.hidden = false;
    }
    const context = getContext();
    const textErrors = articleChecks(article.value, { ...context, mode, title: title.value });
    articleStatus.textContent = textErrors.length ? textErrors.join(' ') : '記事のタイトル・挿入位置・URL・ハッシュタグの書式を確認しました。';
    const checked = [...manual.querySelectorAll('input')].every(input => input.checked);
    copy.disabled = Boolean(missing.length || pending.size || errors || textErrors.length || !checked || !title.value.trim());
    const stage = pending.size ? '画像を検査中です。' : missing.length ? `未添付 ${missing.map(role => labels[role]).join('、')}` :
      errors ? `自動検査で${errors}件の修正が必要です。` :
      !checked || textErrors.length || !title.value.trim() ? '自動検査のあと、記事と作品の確認を続けてください。' :
      '自動検査と本人による確認がそろいました。';
    overall.textContent = stage + (warnings ? ' 画像の確認事項も見直してください。' : '');
  }

  async function accept(role, source, options) {
    const request = {};
    pending.set(role, request);
    entries.delete(role);
    invalidateManual();
    const row = rows.get(role);
    row.preview.hidden = true;
    row.result.textContent = source ? '画像を検査中です…' : '未添付';
    render();
    if (!source) { pending.delete(role); render(); return; }
    try {
      const result = await inspectImage(source, role, options);
      if (pending.get(role) === request) entries.set(role, result);
    } catch (error) {
      if (pending.get(role) === request) {
        row.result.textContent = error.message;
        overall.textContent = '画像を開けませんでした。該当する画像だけ選び直してください。';
      }
    } finally {
      if (pending.get(role) === request) pending.delete(role);
      render();
    }
  }
  let previousContext = '';
  function refresh() {
    const context = JSON.stringify(getContext());
    if (previousContext !== context) invalidateManual();
    previousContext = context;
    render();
  }
  return {
    accept, refresh,
    get checking() { return Boolean(pending.size); },
    problems: selection => {
      const problems = [];
      for (const role of selection) {
        const entry = entries.get(role);
        if (!entry) { problems.push(labels[role] + 'の画像検査が終わっていません。'); continue; }
        problems.push(...entry.errors);
      }
      if (selection.length === 2 && selection.every(role => entries.has(role)) &&
          pixelDifference(entries.get(selection[0]).fingerprint, entries.get(selection[1]).fingerprint) < .004) {
        problems.push('同じ画像が選ばれています。アバターと部屋は別々に添付してください。');
      }
      return problems;
    },
  };
}
