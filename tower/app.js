const API = 'https://xxhaerjvrgmnadxjqetz.supabase.co/functions/v1/creator-tower';
const OWNER_STORAGE = 'atelier-tower-owner-v1';
const PROOF_STORAGE = 'atelier-tower-proof-v1';
const $ = (selector, root = document) => root.querySelector(selector);
const themes = {
  reading: { name: '琥珀の書斎', image: './assets/reading.webp', alt: '本棚と木の机がある、夕暮れの書斎' },
  gallery: { name: '朝光のアトリエ', image: './assets/gallery.webp', alt: '大きな窓から朝の光が入る白い制作室' },
  cinema: { name: '雨夜のシネマ', image: './assets/cinema.webp', alt: '雨に濡れた夜景を見渡すシネマラウンジ' },
  story: { name: '星窓の物語室', image: './assets/story.webp', alt: '星が見えるアーチ窓と机のあるアニメ調の部屋' },
};
const stampLabels = { hello: '遊びに来た', read: '記事を読んだ', inspired: '心に残った' };
const errors = {
  note_missing: 'そのnote IDは見つかりませんでした。プロフィールURLまたはIDを確認してください。',
  invalid_note: 'noteの公開プロフィールを確認できませんでした。現在のクリエイターIDを確認してください。',
  note_down: 'noteから読み込めませんでした。少し時間をおいてもう一度お試しください。',
  proof_missing: 'コードが見つかりません。自己紹介欄を保存し、公開ページに反映されてからもう一度押してください。',
  slot_taken: 'この部屋には先に入居した人がいます。フロア案内から別の空室を選べます。',
  full: '現在は満室です。空室が出ると入居できます。',
  missing: 'この部屋は退去済みか、見つかりませんでした。',
  owner_required: '改装や退去には、この部屋の鍵が必要です。note IDから鍵を再発行できます。',
  handle_in_use: '同じnote IDの部屋が残っています。現在のプロフィールを確認してください。',
  expired: '確認コードの有効期限が切れました。新しいコードを発行してください。',
  too_many: '操作が続けて行われました。1分ほど待ってからもう一度お試しください。',
  conflict: '別の画面で部屋が更新されました。入力はそのままです。内容を確認し、もう一度保存できます。',
  avatar_required: 'キャラ画像を選んでから保存してください。',
  bad_image: 'PNG・JPEG・WebP・GIFの画像を選んでください。動く画像は各辺1,200pxまでです。',
  big_image: '動く画像は300KB以下、静止画の元画像は10MB以下にしてください。',
  unavailable: '通信できませんでした。接続を確認して、もう一度お試しください。',
};

const showroom = {
  id: 'showroom', noteId: '', slot: null,
  profile: {
    name: 'Atelier Tower',
    description: '部屋の奥をタップして、キャラを歩かせてみてください。',
    photo: '',
    articles: [{ title: '無名S note「魔法の入口🚪」', url: 'https://note.com/ss_yr/n/n25eec9b16e76', image: '', date: '' }],
  },
  design: { title: '星窓の見学室', welcome: 'ここは、入居前に訪ねられる見学室です。', theme: 'story', light: 'natural', avatarMode: 'resident', avatarName: '案内役', pin: '' },
  stamps: {},
};

function getStored(storage, key) {
  try { return JSON.parse(storage.getItem(key)); } catch { return null; }
}

function setStored(storage, key, value) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

const state = {
  catalog: null, catalogError: false, floor: 1, query: '', preferredSlot: null, owner: getStored(localStorage, OWNER_STORAGE),
  room: null, mode: '', proofIntent: null, proof: null, request: 0, picture: null,
};

function node(tag, css = '', text = '') {
  const element = document.createElement(tag);
  if (css) element.className = css;
  element.textContent = text;
  return element;
}

function button(css, text, onClick) {
  const element = node('button', css, text);
  element.type = 'button';
  element.addEventListener('click', onClick);
  return element;
}

function link(css, text, href, external = false) {
  const element = node('a', css, text);
  element.href = href;
  if (external) {
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
  }
  return element;
}

function status(element, message = '', error = false) {
  element.textContent = message;
  element.dataset.error = String(error);
}

function message(error) {
  return errors[error?.code] || errors.unavailable;
}

async function api(view, query = {}, payload, key) {
  const url = new URL(API);
  if (view) url.searchParams.set('view', view);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, String(value));
  const headers = {};
  if (payload) headers['Content-Type'] = 'application/json';
  if (key) headers['X-Tower-Key'] = key;
  const options = {
    method: payload ? 'POST' : 'GET', headers, cache: 'no-store', credentials: 'omit',
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(18000),
  };
  const response = await fetch(url, options);
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(value.error || 'unavailable'), { code: value.error || 'unavailable' });
  return value;
}

function write(action, payload = {}, key = state.owner?.key) {
  return api(null, {}, { action, ...payload }, key);
}

function parseNoteId(value) {
  let id = value.trim().replace(/^[@＠]/, '');
  if (/^(?:https?:\/\/)?note\.com\//i.test(id)) {
    try {
      const url = new URL(/^https?:\/\//i.test(id) ? id : `https://${id}`);
      if (url.hostname !== 'note.com' || url.username || url.password) return null;
      id = url.pathname.split('/')[1] || '';
    } catch { return null; }
  }
  id = id.toLowerCase();
  return /^[a-z0-9_]{1,32}$/.test(id) ? id : null;
}

function formatRoom(slot) {
  const perFloor = state.catalog?.perFloor ?? 12;
  return slot ? `${Math.floor((slot - 1) / perFloor) + 1}${String((slot - 1) % perFloor + 1).padStart(2, '0')}` : '';
}

function card({ id, slot, title, name, theme }) {
  const fragment = $('#room-card-template').content.cloneNode(true);
  const item = $('button', fragment);
  const number = $('.card-number', item);
  number.textContent = slot ? `${formatRoom(slot)}号室` : 'ロビー';
  $('.card-label', item).textContent = id === 'showroom' ? '見学' : id ? '入居中' : '空室';
  $('.card-title', item).textContent = title || name || 'ここに入居 →';
  $('.card-subtitle', item).textContent = id ? (title && name && title !== name ? name : themes[theme]?.name || '') : '';
  if (id) {
    const artwork = themes[theme] || themes.reading;
    $('img', item).src = artwork.image;
    item.classList.add('occupied');
    item.addEventListener('click', () => void openPublished(id));
  } else {
    $('.card-image', item).remove();
    item.addEventListener('click', () => focusEntry(slot));
  }
  return fragment;
}

function renderDirectory() {
  const { catalog, catalogError, floor, query } = state;
  $('#retry-list').hidden = !catalogError;
  $('#building-occupancy').textContent = catalog ? catalog.rooms.length : '—';
  if (catalog) {
    $('#building-floors').textContent = catalog.floors;
    $('#building-capacity').textContent = catalog.floors * catalog.perFloor;
  }
  const floors = $('#floor-buttons');
  const list = $('#room-cards');
  floors.replaceChildren();
  list.replaceChildren();
  const count = catalog?.floors ?? 12;
  const perFloor = catalog?.perFloor ?? 12;
  const rooms = catalog?.rooms ?? [];
  for (let n = 1; n <= count; n++) {
    const hasRooms = rooms.some((room) => Math.floor((room.slot - 1) / perFloor) + 1 === n);
    const item = button('floor-choice', `${n}F`, () => {
      state.floor = n;
      state.query = '';
      $('#resident-search').value = '';
      renderDirectory();
      $(`[data-floor="${n}"]`).focus({ preventScroll: true });
    });
    item.dataset.floor = String(n);
    item.dataset.occupied = String(hasRooms);
    item.setAttribute('aria-pressed', String(!query && floor === n));
    floors.append(item);
  }
  $('#current-floor').textContent = query ? '検索結果' : `${floor}F`;
  if (query) {
    const term = query.toLowerCase().replace(/^@/, '');
    const found = rooms.filter((room) => [room.noteId, room.name, room.title]
      .some((value) => value?.toLowerCase().includes(term)));
    for (const room of found) list.append(card(room));
    status($('#floor-status'), catalog ? `${found.length}件` : '入居状況を確認できません。', !catalog);
    return;
  }
  if (floor === 1) list.append(card({ id: 'showroom', title: showroom.design.title, name: '自由に見学', theme: 'story' }));
  if (!catalog) {
    status($('#floor-status'), catalogError ? '入居状況を読み込めませんでした。' : '空室を確認しています。', catalogError);
    return;
  }
  const bySlot = new Map(rooms.map((room) => [room.slot, room]));
  const start = (floor - 1) * perFloor + 1;
  let empty = 0;
  for (let slot = start; slot < start + perFloor; slot++) {
    if (!bySlot.has(slot)) empty++;
    list.append(card(bySlot.get(slot) ?? { slot }));
  }
  status($('#floor-status'), `${perFloor - empty}室 入居中 · ${empty}室 空室`);
}

async function loadDirectory() {
  try {
    const catalog = await api('list');
    if (!Array.isArray(catalog.rooms) || !Number.isInteger(catalog.floors) || !Number.isInteger(catalog.perFloor)) throw new Error();
    state.catalog = catalog;
    state.catalogError = false;
  } catch {
    state.catalogError = true;
  }
  renderDirectory();
}

function focusEntry(slot = null) {
  state.preferredSlot = slot;
  const entryStatus = $('#entry-status');
  status(entryStatus, slot ? `${formatRoom(slot)}号室を選択中。` : 'IDを入れると、あなたの部屋を下見できます。');
  if (slot) entryStatus.append(' ', button('quiet small', '選択を解除', () => focusEntry()));
  const entry = $('#creator-id');
  entry.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  entry.focus({ preventScroll: true });
}

function showDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog.open) dialog.showModal();
}

function closeDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog.open) dialog.close();
}

function roomUrl(id) {
  const url = new URL(location.href);
  url.searchParams.set('room', id);
  url.hash = '';
  return url;
}

function pushRoom(id) {
  if (new URL(location.href).searchParams.get('room') !== id) history.pushState({ towerRoom: true }, '', roomUrl(id));
}

function dismissRoom() {
  state.request++;
  closeDialog('room-dialog');
  state.room = null;
  const url = new URL(location.href);
  if (!url.searchParams.has('room')) return;
  if (history.state?.towerRoom) {
    history.back();
  } else {
    url.searchParams.delete('room');
    history.replaceState(null, '', url);
  }
}

function titleFor(room) {
  return room.design.title || room.profile.name;
}

function avatarUrl(room) {
  if (room.design.avatarMode === 'custom' && room.avatarVersion) {
    const url = new URL(API);
    url.searchParams.set('view', 'avatar');
    url.searchParams.set('id', room.id);
    url.searchParams.set('v', room.avatarVersion);
    return url.href;
  }
  if (room.design.avatarMode === 'profile' && room.profile.photo) return room.profile.photo;
  return './assets/resident.webp';
}

function articleCard(article, featured = false) {
  const item = link(featured ? 'article-card featured-article' : 'article-card', '', article.url, true);
  if (article.image) {
    const image = node('img', 'article-image');
    image.src = article.image;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.remove());
    item.append(image);
  }
  const content = node('span', 'article-copy');
  if (featured) content.append(node('span', 'article-tag', '玄関に飾った記事'));
  content.append(node('strong', '', article.title));
  if (article.date) content.append(node('time', '', article.date.replaceAll('-', '.')));
  item.append(content, node('span', 'article-arrow', '↗'));
  return item;
}

function roomScene(room) {
  const art = themes[room.design.theme] ?? themes.reading;
  const frame = node('div', 'scene-frame');
  const scene = node('div', 'room-scene');
  scene.dataset.light = room.design.light;
  const image = node('img', 'room-art');
  image.src = art.image;
  image.alt = art.alt;
  const avatar = node('div', 'resident');
  avatar.classList.toggle('portrait', room.design.avatarMode === 'profile' && Boolean(room.profile.photo));
  const sprite = node('img', 'resident-sprite');
  sprite.src = avatarUrl(room);
  sprite.alt = room.design.avatarName || '住人キャラクター';
  sprite.addEventListener('error', () => {
    if (sprite.getAttribute('src') !== './assets/resident.webp') {
      sprite.src = './assets/resident.webp';
      avatar.classList.remove('portrait');
    }
  });
  avatar.append(sprite);
  scene.append(image, avatar);
  const controls = node('div', 'scene-controls');
  controls.append(node('span', '', art.name));
  const route = [23, 67, 45, 81];
  let currentX = 58;
  let step = 0;
  let timer;
  function walk(x, y) {
    clearTimeout(timer);
    avatar.style.setProperty('--x', `${x}%`);
    avatar.style.setProperty('--y', `${y}%`);
    avatar.dataset.left = String(x < currentX);
    avatar.classList.add('walking');
    currentX = x;
    timer = setTimeout(() => avatar.classList.remove('walking'), 630);
  }
  scene.addEventListener('click', (event) => {
    const bounds = scene.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * 100;
    const y = (event.clientY - bounds.top) / bounds.height * 100;
    walk(Math.min(90, Math.max(10, x)), Math.min(96, Math.max(83, y)));
  });
  controls.append(button('quiet', 'キャラを歩かせる →', () => { walk(route[step++ % route.length], 93); }));
  frame.append(scene, controls);
  return frame;
}

function renderStamps(target, room) {
  target.replaceChildren(node('h3', '', '訪問スタンプ'));
  const stamps = node('div', 'stamp-buttons');
  for (const [kind, label] of Object.entries(stampLabels)) {
    const text = `${label} ${room.stamps?.[kind] ?? 0}`;
    if (!room.canStamp) {
      stamps.append(node('span', 'stamp', text));
      continue;
    }
    const stamp = button('stamp', text, async () => {
      const group = Array.from(stamps.querySelectorAll('button'));
      group.forEach((item) => { item.disabled = true; });
      try {
        const next = await write('stamp', { id: room.id, kind: room.myStamp === kind ? null : kind });
        if (state.room?.id !== room.id) return;
        state.room = { ...room, ...next, canStamp: true };
        renderStamps(target, state.room);
        status($('#room-status'), next.myStamp ? '訪問スタンプを置きました。' : '訪問スタンプを取り消しました。');
      } catch (error) {
        status($('#room-status'), message(error), true);
        group.forEach((item) => { item.disabled = false; });
      }
    });
    stamp.setAttribute('aria-pressed', String(kind === room.myStamp));
    stamps.append(stamp);
  }
  target.append(stamps);
  if (!room.canStamp && !room.isOwner) target.append(node('p', 'muted', '住人になると、訪問先の部屋にスタンプを置けます。'));
}

function renderRoom(room, mode) {
  state.room = room;
  state.mode = mode;
  const content = $('#room-content');
  const address = $('#room-address');
  address.textContent = mode === 'draft' ? (room.slot ? `${formatRoom(room.slot)}号室の下見` : '入居前の下見') :
    mode === 'showroom' ? '見学室' : `${formatRoom(room.slot)}号室`;
  $('#share-room').hidden = mode === 'draft';
  status($('#room-status'));
  const layout = node('div', 'room-layout');
  const scene = roomScene(room);
  const body = node('div', 'room-body');
  const title = node('h2', '', titleFor(room));
  title.id = 'room-title';
  body.append(title);
  if (room.noteId) body.append(link('room-byline', `@${room.noteId} · noteプロフィール ↗`, `https://note.com/${room.noteId}`, true));
  if (room.design.welcome) body.append(node('p', 'welcome', room.design.welcome));
  if (room.profile.description) body.append(node('p', 'room-description', room.profile.description));

  const actions = node('div', 'room-actions');
  if (mode === 'draft') {
    actions.append(button('button primary', 'この部屋に入居する', () => void beginProof(room, false)));
  } else if (mode === 'showroom') {
    actions.append(button('button primary', '自分の部屋をつくる', () => { dismissRoom(); focusEntry(); }));
  } else if (room.isOwner) {
    actions.append(button('button primary', '部屋を改装', () => openEditor(room)));
    actions.append(button('quiet withdraw', '退去する', () => {
      status($('#leave-status'));
      showDialog('leave-dialog');
    }));
  }
  if (actions.childElementCount) body.append(actions);
  const articles = node('section', 'room-articles');
  articles.append(node('h3', '', '部屋の本棚'));
  const pinned = room.profile.articles.find((article) => article.url === room.design.pin);
  if (pinned) articles.append(articleCard(pinned, true));
  for (const article of room.profile.articles) {
    if (article !== pinned) articles.append(articleCard(article));
  }
  if (!room.profile.articles.length) {
    articles.append(node('p', 'muted', '本棚に公開記事がありません。'));
    if (room.noteId) articles.append(link('quiet', 'noteのページで見る ↗', `https://note.com/${room.noteId}`, true));
  }
  body.append(articles);
  if (mode === 'resident') {
    const stamps = node('section', 'stamps');
    renderStamps(stamps, room);
    body.append(stamps);
    if (!room.isOwner) body.append(button('quiet recover', 'この部屋の鍵を再発行する', () => void beginProof(room, true)));
  }
  layout.append(scene, body);
  content.replaceChildren(layout);
  showDialog('room-dialog');
}

function loadingRoom(label) {
  const title = node('h2', '', label);
  title.id = 'room-title';
  const frame = node('div', 'dialog-pad');
  frame.append(title);
  $('#room-content').replaceChildren(frame);
  $('#room-address').textContent = '';
  $('#share-room').hidden = true;
  status($('#room-status'));
  showDialog('room-dialog');
}

async function openPublished(id, push = true) {
  if (id === 'showroom') {
    state.request++;
    if (push) pushRoom(id);
    renderRoom(showroom, 'showroom');
    return;
  }
  const request = ++state.request;
  state.room = null;
  if (push) pushRoom(id);
  loadingRoom('部屋の扉を開いています…');
  try {
    const room = state.owner?.key ? await write('visit', { id }) : await api('room', { id });
    if (request !== state.request) return;
    if (state.owner?.id === id && !room.isOwner) {
      state.owner = null;
      setStored(localStorage, OWNER_STORAGE, null);
    }
    renderRoom(room, 'resident');
  } catch (error) {
    if (request !== state.request) return;
    loadingRoom('部屋を開けませんでした');
    if (error.code !== 'missing') $('#room-content .dialog-pad').append(
      button('button outline', '再読み込み', () => void openPublished(id, false)),
    );
    status($('#room-status'), message(error), true);
  }
}

async function submitPreview(event) {
  event.preventDefault();
  const id = parseNoteId($('#creator-id').value);
  const hint = $('#entry-status');
  if (!id) {
    status(hint, 'noteのプロフィールURL、または半角英数字と「_」のIDを入力してください。', true);
    $('#creator-id').focus();
    return;
  }
  const submit = $('button', event.currentTarget);
  const request = ++state.request;
  submit.disabled = true;
  status(hint, 'noteのプロフィールと記事を読み込んでいます…');
  try {
    const room = await api('preview', { noteId: id });
    if (request !== state.request) return;
    status(hint, state.preferredSlot ? `${formatRoom(state.preferredSlot)}号室を選択中。` : '部屋の下見ができます。');
    if (room.existingId) {
      await openPublished(room.existingId);
    } else {
      room.slot = state.preferredSlot;
      renderRoom(room, 'draft');
    }
  } catch (error) {
    if (request === state.request) status(hint, message(error), true);
  } finally { submit.disabled = false; }
}

function setProofVisible(visible) {
  for (const id of ['proof-block', 'proof-steps', 'open-note-settings', 'verify-proof']) $(`#${id}`).hidden = !visible;
}

async function beginProof(room, recover) {
  state.proofIntent = { noteId: room.noteId, slot: recover ? null : room.slot, recover };
  $('#key-title').textContent = recover ? '部屋の鍵を再発行する' : '部屋の鍵をつくる';
  $('#proof-intro').textContent = recover ?
    '本人確認で、このブラウザに新しい鍵を保存します。以前の鍵は更新されます。' :
    'noteの自己紹介欄に確認コードを一時的に入れると、部屋を公開できます。';
  showDialog('key-dialog');
  const stored = getStored(sessionStorage, PROOF_STORAGE);
  const same = stored && stored.until > Date.now() && stored.noteId === room.noteId && stored.slot === state.proofIntent.slot;
  if (same) {
    showProof(stored);
  } else {
    await issueProof();
  }
}

function showProof(proof) {
  state.proof = proof;
  $('#proof-code').textContent = proof.code;
  $('#retry-proof').hidden = true;
  setProofVisible(true);
  status($('#proof-status'), '確認コードの有効期限は発行から20分です。');
}

async function issueProof() {
  const intent = state.proofIntent;
  if (!intent) return;
  setProofVisible(false);
  $('#retry-proof').hidden = true;
  status($('#proof-status'), '確認コードを発行しています…');
  try {
    const result = await write('begin', { noteId: intent.noteId, slot: intent.slot }, null);
    if (state.proofIntent !== intent) return;
    const proof = { ...result, ...intent, until: Date.now() + result.expiresIn * 1000 };
    setStored(sessionStorage, PROOF_STORAGE, proof);
    showProof(proof);
  } catch (error) {
    if (state.proofIntent !== intent) return;
    status($('#proof-status'), message(error), true);
    $('#retry-proof').hidden = error.code === 'slot_taken';
  }
}

async function copy(text) {
  if (!navigator.clipboard) throw new Error();
  await navigator.clipboard.writeText(text);
}

async function confirmProof() {
  if (!state.proof) return;
  const proof = state.proof;
  const verify = $('#verify-proof');
  verify.disabled = true;
  status($('#proof-status'), 'noteの自己紹介欄を確認しています…');
  try {
    const room = await write('confirm', {}, proof.key);
    state.owner = { id: room.id, noteId: room.noteId, key: proof.key };
    const saved = setStored(localStorage, OWNER_STORAGE, state.owner);
    setStored(sessionStorage, PROOF_STORAGE, null);
    state.proof = null;
    state.preferredSlot = null;
    closeDialog('key-dialog');
    pushRoom(room.id);
    renderRoom({ ...room, isOwner: true }, 'resident');
    const done = proof.recover ? '鍵を再発行しました。' : `${formatRoom(room.slot)}号室に入居しました。`;
    status($('#room-status'), `${done}noteの自己紹介に入れたコードは削除できます。${saved ? '' : ' このブラウザを閉じた後は鍵の再発行が必要です。'}`);
    void loadDirectory();
  } catch (error) {
    status($('#proof-status'), message(error), true);
    if (error.code === 'expired') {
      setStored(sessionStorage, PROOF_STORAGE, null);
      setProofVisible(false);
      $('#retry-proof').hidden = false;
    }
  } finally { verify.disabled = false; }
}

function openEditor(room) {
  if (!room.isOwner) return;
  const form = $('#edit-form');
  form.reset();
  state.picture = null;
  for (const key of ['title', 'light', 'welcome', 'avatarMode', 'avatarName']) form.elements.namedItem(key).value = room.design[key] || '';
  const options = $('#theme-choices');
  options.replaceChildren();
  for (const [key, theme] of Object.entries(themes)) {
    const label = node('label', 'theme-choice');
    const input = node('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = key;
    input.checked = room.design.theme === key;
    const image = node('img');
    image.src = theme.image;
    image.alt = '';
    label.append(input, image, node('span', '', theme.name));
    options.append(label);
  }
  const pin = $('#pin-select');
  pin.replaceChildren(new Option('飾らない', ''));
  for (const article of room.profile.articles) pin.append(new Option(article.title, article.url));
  pin.value = room.design.pin || '';
  const preview = $('#avatar-preview');
  preview.hidden = !room.avatarVersion;
  if (room.avatarVersion) preview.src = avatarUrl(room);
  else preview.removeAttribute('src');
  $('#avatar-field').hidden = room.design.avatarMode !== 'custom';
  status($('#edit-status'));
  showDialog('edit-dialog');
}

function dataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject({ code: 'bad_image' });
    reader.readAsDataURL(blob);
  });
}

async function readPicture(file) {
  const supported = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  if (!supported.includes(file.type)) throw { code: 'bad_image' };
  if (file.size > 10 * 1024 * 1024) throw { code: 'big_image' };
  const mode = new Uint8Array(await file.slice(0, 21).arrayBuffer());
  const animated = file.type === 'image/gif' ||
    (file.type === 'image/webp' && mode[12] === 86 && mode[15] === 88 && (mode[20] & 2) !== 0);
  if (animated && file.size > 307200) throw { code: 'big_image' };
  const localUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = localUrl;
    await image.decode().catch(() => { throw { code: 'bad_image' }; });
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    if (animated && longestSide > 1200) throw { code: 'bad_image' };
    if (animated || (file.type !== 'image/jpeg' && file.size <= 307200 && longestSide <= 1200)) {
      return await dataUrl(file);
    }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw { code: 'bad_image' };
    for (const side of [720, 512, 384]) {
      const ratio = Math.min(1, side / longestSide);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const output = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.86));
      if (output && output.size <= 307200) return await dataUrl(output);
    }
    throw { code: 'big_image' };
  } finally { URL.revokeObjectURL(localUrl); }
}

async function choosePicture(event) {
  const field = event.currentTarget;
  const file = field.files?.[0];
  const preview = $('#avatar-preview');
  state.picture = null;
  status($('#edit-status'));
  if (!file) return;
  try {
    const source = await readPicture(file);
    if (field.files?.[0] !== file) return;
    state.picture = source;
    preview.src = source;
    preview.hidden = false;
  } catch (error) {
    if (field.files?.[0] === file) {
      field.value = '';
      preview.hidden = !state.room?.avatarVersion;
      if (state.room?.avatarVersion) preview.src = avatarUrl(state.room);
      status($('#edit-status'), message(error), true);
    }
  }
}

async function saveEditor(event) {
  event.preventDefault();
  const room = state.room;
  if (!room?.isOwner) return;
  const save = $('#save-room');
  const form = event.currentTarget;
  const values = new FormData(form);
  const design = Object.fromEntries(['title', 'welcome', 'theme', 'light', 'pin', 'avatarMode', 'avatarName']
    .map((key) => [key, values.get(key)]));
  if (design.avatarMode === 'custom' && !state.picture && !room.avatarVersion) {
    status($('#edit-status'), errors.avatar_required, true);
    return;
  }
  const avatarB64 = state.picture?.split(',')[1];
  save.disabled = true;
  status($('#edit-status'), '部屋を保存しています…');
  try {
    const updated = await write('save', { id: room.id, version: room.version, design, avatarB64, refresh: values.has('refresh') });
    closeDialog('edit-dialog');
    renderRoom({ ...updated, isOwner: true }, 'resident');
    status($('#room-status'), '改装を保存しました。');
    void loadDirectory();
  } catch (error) {
    status($('#edit-status'), message(error), true);
    if (error.code === 'conflict') {
      const recent = await write('visit', { id: room.id }).catch(() => null);
      if (recent?.isOwner) state.room = recent;
    }
  } finally { save.disabled = false; }
}

async function leaveRoom() {
  const room = state.room;
  if (!room?.isOwner) return;
  const submit = $('#leave-room');
  submit.disabled = true;
  status($('#leave-status'), '退去を処理しています…');
  try {
    await write('leave', { id: room.id });
    state.owner = null;
    setStored(localStorage, OWNER_STORAGE, null);
    closeDialog('leave-dialog');
    dismissRoom();
    status($('#entry-status'), `${formatRoom(room.slot)}号室から退去しました。また同じIDで入居できます。`);
    void loadDirectory();
  } catch (error) {
    status($('#leave-status'), message(error), true);
  } finally { submit.disabled = false; }
}

function route() {
  const id = new URL(location.href).searchParams.get('room');
  if (id && (id === 'showroom' || /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id))) {
    if (!state.room || state.room.id !== id || !$('#room-dialog').open) void openPublished(id, false);
  } else if ($('#room-dialog').open && state.mode !== 'draft') {
    state.request++;
    for (const dialog of ['leave-dialog', 'edit-dialog', 'key-dialog', 'room-dialog']) closeDialog(dialog);
    state.room = null;
  }
}

$('#preview-form').addEventListener('submit', submitPreview);
$('#retry-list').addEventListener('click', () => void loadDirectory());
$('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  state.query = $('#resident-search').value.trim();
  renderDirectory();
});
$('#resident-search').addEventListener('input', (event) => {
  if (!event.currentTarget.value && state.query) {
    state.query = '';
    renderDirectory();
  }
});
$('#showroom').addEventListener('click', () => void openPublished('showroom'));
$('#my-room').addEventListener('click', () => state.owner?.id ? void openPublished(state.owner.id) : focusEntry());
$('#open-help').addEventListener('click', () => showDialog('help-dialog'));
$('#share-room').addEventListener('click', async () => {
  const room = state.room;
  if (!room?.id) return;
  const href = roomUrl(room.id).href;
  try {
    if (navigator.share) await navigator.share({ title: titleFor(room), url: href });
    else {
      await copy(href);
      status($('#room-status'), '部屋のURLをコピーしました。');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      status($('#room-status'), 'この部屋のURL');
      const field = node('input', 'share-url');
      field.value = href;
      field.readOnly = true;
      field.setAttribute('aria-label', '部屋のURL');
      $('#room-status').append(field);
      field.select();
    }
  }
});
$('#copy-proof').addEventListener('click', async () => {
  const code = $('#proof-code');
  try {
    await copy(code.textContent);
    status($('#proof-status'), '確認コードをコピーしました。');
  } catch {
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status($('#proof-status'), '選択したコードをコピーしてください。');
  }
});
$('#retry-proof').addEventListener('click', () => void issueProof());
$('#verify-proof').addEventListener('click', () => void confirmProof());
$('#edit-form').addEventListener('submit', saveEditor);
$('#edit-form [name="avatarMode"]').addEventListener('change', (event) => {
  $('#avatar-field').hidden = event.currentTarget.value !== 'custom';
});
$('#avatar-file').addEventListener('change', choosePicture);
$('#leave-room').addEventListener('click', () => void leaveRoom());
for (const close of document.querySelectorAll('[data-close]')) {
  close.addEventListener('click', () => close.dataset.close === 'room-dialog' ? dismissRoom() : closeDialog(close.dataset.close));
}
$('#room-dialog').addEventListener('cancel', (event) => { event.preventDefault(); dismissRoom(); });
window.addEventListener('popstate', route);
window.addEventListener('focus', () => void loadDirectory());
renderDirectory();
void loadDirectory();
route();
