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

export function imageContentChecks(data) {
  // Transparent pixels may retain RGB values. Only visible colours and the
  // alpha silhouette can distinguish the artwork from a single flat layer.
  let hasTransparency = false, visible = -1;
  for (let index = 0; index < data.length; index += 4) {
    if (!data[index + 3]) {
      hasTransparency = true;
      if (visible !== -1) return [];
      continue;
    }
    if (hasTransparency) return [];
    if (visible === -1) visible = index;
    else if (data[index] !== data[visible] || data[index + 1] !== data[visible + 1] ||
             data[index + 2] !== data[visible + 2] || data[index + 3] !== data[visible + 3]) return [];
  }
  return [visible === -1 ? '画像がすべて透明です。作品が表示される元画像を選んでください。' :
    '画像が一色で、絵柄を確認できません。完成した作品を選んでください。'];
}

export function imageMatch(a, b) {
  const difference = pixelDifference(a, b);
  if (difference >= .045) return '';
  // Sparse line drawings can have a very small average difference even when
  // individual strokes are entirely different. Only block a close pixel match.
  if (difference < .004 && a.every((channel, index) => Math.abs(channel - b[index]) <= 12)) return 'same';
  return 'similar';
}

export function sampleArtwork(image) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, 64, 64);
  return context.getImageData(0, 0, 64, 64).data;
}

export function artworkMatch(a, b) {
  if (!a || !b) return '';
  const match = imageMatch(a.fingerprint, b.fingerprint);
  return imageMatch(a.original, b.original) === 'same' ? 'same' : match;
}

export function articleImageMarkers(mode) {
  if (mode === 'room') return ['［ここにアバター画像］', '［ここに部屋画像］'];
  if (mode === 'move-in') return ['［ここにイラスト１］', '［ここにイラスト２］'];
  return ['［ここに街のイラスト１］', '［ここに街のイラスト２］'];
}

export function artworkMime(bytes) {
  const starts = (at, signature) => signature.every((value, index) => bytes[at + index] === value);
  if (starts(0,[137,80,78,71,13,10,26,10])) return 'image/png';
  if (starts(0,[255,216,255])) return 'image/jpeg';
  if (starts(0,[71,73,70,56]) && [55,57].includes(bytes[4]) && bytes[5]===97) return 'image/gif';
  if (starts(0,[82,73,70,70]) && starts(8,[87,69,66,80])) return 'image/webp';
  return '';
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

function articleLines(text, prose, code) {
  let fence = '';
  return text.split(/\r?\n/).map(line => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/u)?.[1];
    if (fence) {
      if (marker?.startsWith(fence) && !line.trim().slice(marker.length)) fence = '';
      return code(line);
    }
    if (marker) { fence = marker; return code(line); }
    return prose(line);
  });
}

export function articleChecks(text, { title, urls = [], mode = 'spot', occupied = false } = {}) {
  const lines = articleLines(text, line => line.trim(), () => '');
  const prose = lines.join('\n');
  const errors = [];
  if (!text.trim()) return ['記事本文が未入力です。'];
  if (!prose.trim()) return ['コード枠の外に記事本文を貼り付けてください。'];
  if (!prose.includes('無名S note') || !prose.includes('企画主')) errors.push('企画主・無名S noteの紹介を入れてください。');
  const actualTitle = lines.find(Boolean)?.replace(/^#+\s*/, '');
  if (title !== undefined && !title.trim()) errors.push('記事とサムネイルのタイトルを入力してください。');
  else if (title && actualTitle !== title.trim()) errors.push('記事の先頭タイトルと入力したタイトルが一致しません。');
  const markers = articleImageMarkers(mode);
  for (const marker of markers) {
    const count = lines.filter(line => line === marker).length;
    if (count !== 1) errors.push(`${marker} は本文中の独立した行に１回置いてください。`);
  }
  if (lines.includes(markers[1]) && lines.indexOf(markers[0]) > lines.indexOf(markers[1])) {
    errors.push('本文の画像を１枚目、２枚目の順に置いてください。');
  }
  const content = lines.filter(Boolean).slice(1);
  const narrative = content.some((line, i) => !markers.includes(line) &&
    !/^(?:https?:\/\/|#|@|企画主[・\s]|［ここに)/u.test(line) &&
    !urls.includes(content[i + 1]));
  if (!narrative) errors.push('場面や体験を書いた記事本文を入れてください。');
  for (const url of urls) if (!lines.includes(url)) errors.push(`カード用URLを単独行にしてください。 ${url}`);
  if (lines.filter(Boolean).at(-1) !== '#無名Sプロンプト') errors.push('末尾のハッシュタグを #無名Sプロンプト にしてください。');
  if (!occupied && /入居しました|入居を完了しました|入居済みです|引っ越しが完了しました/.test(prose)) {
    errors.push('入居の完了を確認できていません。現在の状態に合わせて表現を確認してください。');
  }
  return errors;
}

export function normalizeCardLines(text, urls) {
  const known = new Set(urls);
  return articleLines(text, line => {
    if (known.has(line.trim())) return line.trim();
    const tokens = /(`+).*?\1|(!?)\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)|<(https?:\/\/[^\s<>]+)>|https?:\/\/[^\s<>"'`\[\]()（）「」『』【】。、，！？]+/gu;
    const parts = [];
    let start = 0;
    for (const match of line.matchAll(tokens)) {
      if (match[1] || match[2] === '!') continue;
      const raw = match[4] || match[5] || match[0];
      const url = match[4] || match[5] || known.has(raw) ? raw : raw.replace(/[.,!;:]+$/u, '');
      if (!known.has(url)) continue;
      let from = match.index, to = from + match[0].length - (raw.length - url.length);
      const pairs = { '(': ')', '（': '）', '「': '」', '『': '』', '【': '】', '"': '"', "'": "'" };
      if (Object.hasOwn(pairs, line[from - 1]) && pairs[line[from - 1]] === line[to]) { from--; to++; }
      const label = (line.slice(start, from) + (match[3] || '')).trim();
      if (label && !/^[>*・-]+$/u.test(label)) parts.push(label);
      parts.push(url);
      start = to;
    }
    if (!parts.length) return line;
    const tail = line.slice(start).trim();
    if (tail && !/^[。.,!]+$/u.test(tail)) parts.push(tail);
    return parts.join('\n\n');
  }, line => line).join('\n');
}

export async function inspectImage(source, role, { atlas = false } = {}) {
  if (source instanceof File && (source.size > 10 * 1024 * 1024 ||
      !artworkMime(new Uint8Array(await source.slice(0,12).arrayBuffer())))) {
    throw new Error('PNG・JPEG・WebP・GIFの10MB以下の画像を選んでください。');
  }
  const temporary = source instanceof Blob;
  const url = temporary ? URL.createObjectURL(source) : source;
  const image = new Image();
  let timeout;
  try {
    if (!temporary && /^https?:\/\//i.test(url) && new URL(url).origin !== location.origin) image.crossOrigin = 'anonymous';
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
    const errors = imageContentChecks(pixels.data), warnings = [];
    if (atlas) {
      if (width % 4 || height % 4 || width < 160 || height < 160) errors.push('歩行シートの４×４形式を確認してください。');
      const result = atlasChecks(pixels);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
    const ratio = width / height;
    if (role === 'interior' && (ratio < 1.2 || ratio > 2.2)) errors.push('部屋には横長の内装画像を選んでください。横３対２を推奨します。');
    if (role === 'cover') {
      if (Math.abs(ratio - 1280 / 650) > .06) errors.push('サムネイルは1280×650に合う横長比率で作り直してください。');
      if (width < 1280 || height < 650) errors.push('サムネイルは1280×650以上の画像が必要です。');
    }
    if (role.startsWith('scene') && ratio < 1.2) warnings.push('本文用は横３対２を推奨します。構図を確認してください。');
    const tooSmall = role === 'avatar' ? height < 160 || width < 32 :
      role === 'vehicle' ? width < 100 || height < 80 : role !== 'reference' && Math.min(width, height) < 200;
    if (tooSmall) {
      errors.push('画像が小さすぎます。元の完成画像を添付してください。');
    }
    canvas.width = canvas.height = 64;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const fingerprint = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const scale = Math.min(1, 240 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL('image/png');
    return { width, height, fingerprint, errors, warnings, preview };
  } catch (error) {
    if (['SecurityError', 'EncodingError', 'InvalidStateError'].includes(error.name)) {
      throw new Error('画像を読み取れません。元の画像を端末に保存して添付してください。');
    }
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
  const noteLabel = node('label', '修正したい点（任意）');
  const note = node('input');
  note.type = 'text';
  note.maxLength = 300;
  note.placeholder = '例：衣装はそのまま、右手の指だけ直す';
  noteLabel.append(note);
  function requestRepair(role, issues) {
    repair(role, title.value.trim(), [...issues, note.value.trim()].filter(Boolean).join('\n'),
      role === 'article' ? article.value : undefined);
  }
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
    fix.addEventListener('click', () => {
      const { errors, warnings } = imageFindings(role);
      requestRepair(role, [...errors, ...warnings]);
    });
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
    const formatted = normalizeCardLines(article.value, getContext().urls);
    if (formatted !== article.value) {
      article.value = formatted;
      invalidateManual();
    }
    render();
  });
  const fixArticle = node('button', '記事だけ修正する');
  fixArticle.type = 'button';
  fixArticle.addEventListener('click', () => requestRepair('article',
    articleChecks(article.value, { ...getContext(), mode, title: title.value })));
  const manual = node('fieldset', '', 'quality-manual');
  manual.append(node('legend', '作品を見て確認する項目'));
  const checks = [
    '参照キャラの顔立ち・髪・衣装と、元の画風（実写・アニメ・幻想など）が保たれている',
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
    input.disabled = true;
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
  details.append(noteLabel, files, titleLabel, articleLabel, articleStatus, format, fixArticle, manual, overall, copy);
  container.append(details);

  function imageFindings(role, selection = roles) {
    const entry = entries.get(role);
    if (!entry) return { errors: [labels[role] + 'の画像検査が終わっていません。'], warnings: [] };
    const errors = [...entry.errors], warnings = [...entry.warnings];
    for (const otherRole of selection) {
      if (role === otherRole) continue;
      const match = artworkMatch(entry, entries.get(otherRole));
      if (match === 'same') errors.push(`${labels[otherRole]}と同じ画像です。別々の完成画像を選んでください。`);
      if (match === 'similar') warnings.push(`${labels[otherRole]}と構図が似ています。場面や動作の違いを確認してください。`);
    }
    return { errors, warnings };
  }

  function render() {
    const missing = roles.filter(role => !entries.has(role));
    let errors = 0, warnings = 0;
    for (const [role, result] of entries) {
      const { preview, result: line } = rows.get(role);
      const { errors: problems, warnings: notices } = imageFindings(role);
      errors += problems.length;
      warnings += notices.length;
      line.textContent = problems.length ? problems.join(' ') :
        `自動検査 ${result.width}×${result.height} · 表示・形式確認済み`;
      if (notices.length) line.textContent += ' ' + notices.join(' ');
      if (result.preview && preview.getAttribute('src') !== result.preview) preview.src = result.preview;
      preview.hidden = !result.preview;
    }
    const context = getContext();
    const textErrors = articleChecks(article.value, { ...context, mode, title: title.value });
    articleStatus.textContent = textErrors.length ? textErrors.join(' ') : '記事のタイトル・挿入位置・URL・ハッシュタグの書式を確認しました。';
    const checks = [...manual.querySelectorAll('input')];
    const readyForReview = !pending.size && !missing.length && !errors;
    for (const check of checks) {
      check.disabled = !readyForReview;
      if (!readyForReview) check.checked = false;
    }
    const checked = checks.every(input => input.checked);
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
    row.preview.removeAttribute('src');
    row.result.textContent = source ? '画像を検査中です…' : '未添付';
    render();
    if (!source) { pending.delete(role); render(); return; }
    try {
      const result = options?.review ?? await inspectImage(source, role, options);
      if (pending.get(role) === request) entries.set(role, result);
    } catch (error) {
      if (pending.get(role) === request) entries.set(role, { errors: [error.message], warnings: [] });
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
  function reset(){
    entries.clear();pending.clear();invalidateManual();article.value='';title.value='';note.value='';
    for(const [role,row] of rows){row.preview.hidden=true;row.preview.removeAttribute('src');row.result.textContent='未添付';}
    for(const input of files.querySelectorAll('input[type=file]'))input.value='';
    previousContext='';render();
  }
  return {
    accept, refresh, reset,
    get articleTitle() { return title.value.trim(); },
    get checking() { return Boolean(pending.size); },
    checkingRoles: selection => selection.some(role => pending.has(role)),
    problems: selection => selection.flatMap(role => imageFindings(role, selection).errors),
  };
}
