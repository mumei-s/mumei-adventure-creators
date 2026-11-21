import { publicView, mediaUrl, setArtworkSource, pendingMediaUrl } from './public-directory.js?v=20261119-review';
import { talkToResident } from './resident-talk.js?v=20261119-owner';
import {autoResidentWalker} from '../halloween-exhibition/preview/diorama-city/host-avatar.js?v=20261119-scene';
import { trimTransparentEdges } from './vehicle-display.js?v=20261121-garage-lines';
import { scanAtlas } from '../halloween-exhibition/preview/diorama-city/atlas-layout.js?v=20261118-sprites-2';
import { characterSignature, designWorld, generatedInterior, roomPreview, roomStage } from './world.js?v=20261119-scene';
import { cutaway, dailyStory, makeElevator } from './building.js?v=20261119-scene';
import { bindSharedSpaces, floorLabel } from './shared-spaces.js?v=20261121-garage-lines';
import { bindSpotIllustration } from '../halloween-exhibition/preview/diorama-city/spot-illustration.js?v=20261120-spot-reference';
import { chatgptAppLink, makeArtifactPrompt, makeRoomPrompt, makeMoveInArticlePrompt, articleCardEntries, bindArticleDraft, parseNoteId, creatorReference, residentPost, towerUrl, hostNoteUrl, insightUrl, bindCardButtons } from './prompt-play.js?v=20261119-handoff';
import { bindQualityAssist, inspectImage, imageContentChecks, sampleArtwork, artworkMatch, artworkMime, articleChecks } from './quality-assist.js?v=20261119-scene';
import { TOWER_API, OWNER_STORAGE, avatarImageUrl, readWalkDraft, saveWalkDraft, clearWalkDraft, visitor, draftTraveler, residentTraveler, hasRoomKey, createPlayerSession } from './avatar-travel.js?v=20261119-scene';
import { initGameShell } from './game-shell.js?v=20261118-controls';

const gameShell = initGameShell({ page: 'tower' });

const intakePreview = location.pathname.includes('/admission/');
const PROOF_STORAGE = 'atelier-tower-proof-v1';
const storyFallback = 'https://note.com/almabrillante/n/n2ded809d9016';
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
  timeout: '通信に時間がかかっています。もう一度お試しください。',
  picture_timeout: '画像の読み込みが時間内に終わりませんでした。もう一度添付してください。',
  conflict: '別の画面で部屋が更新されました。入力はそのままです。内容を確認し、もう一度保存できます。',
  avatar_required: 'キャラ画像を選んでから保存してください。',
  bad_image: 'PNG・JPEG・WebP・GIFの画像を選んでください。動く画像は各辺1,200pxまでです。',
  big_image: '動く画像は300KB以下、静止画の元画像は10MB以下にしてください。',
  bad_interior: '部屋は横長の内装画像（３：２推奨）を選んでください。アバター画像とは別の画像が必要です。',
  bad_sheet: '４×４の歩行シートを選んでください。全身が１体の画像なら「全身１枚・GIF」を選べます。',
  intake_pending: '入居受付を準備中です。選んだ２枚と部屋はこの端末に保存しました。再開後、この画面から本人確認に進めます。',
  manager_full: '管理人は５人までです。空きが出ると参加できます。',
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

function getStored(storageName, key) {
  try { return JSON.parse(window[storageName].getItem(key)); } catch { return null; }
}

function setStored(storageName, key, value) {
  try {
    const storage = window[storageName];
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

const state = {
  catalog: null, catalogError: false, catalogRequest: 0, catalogCheckedAt: 0, floor: 1, query: '', preferredSlot: null, owner: getStored('localStorage', OWNER_STORAGE),
  room: null, mode: '', proofIntent: null, proof: null, request: 0, picture: null, entryPicture: null, story: null, storyVisit: null,
};

const player = createPlayerSession(()=>state.owner, owner=>write('visit',{id:owner.id},owner.key));
function currentTraveler() {
  return residentTraveler(player.room) || (!hasRoomKey(state.owner) && draftTraveler(readWalkDraft())) || null;
}
window.addEventListener('storage',event=>{
  if (event.key===OWNER_STORAGE || event.key===null) location.reload();
});

const travel = makeElevator($('#lift-dialog'));
const play = { id: '', profile: null, avatar: null, interior: null, photoId: '', formCreator: '', draft: null, referenceRevision: 0, loading: new Set(), target: null };
const promptDialog = $('#prompt-dialog');
const artworkReviews = new WeakMap();
function roomArticleContext() {
  const id = parseNoteId($('#prompt-id').value);
  const occupied = Boolean(id && state.room?.isOwner && state.room.noteId === id);
  const href = new URL(towerUrl);
  if (occupied) href.searchParams.set('room', state.room.id);
  else href.hash = 'prompt-play';
  return {mode:'room', id, occupied, href:href.href, ideas:$('#prompt-ideas').value,
    roomTitle:occupied ? state.room.design.title : $('#generated-room-title').value};
}
const roomQuality = bindQualityAssist($('#tower-quality'), {
  mode: 'room', external: ['avatar', 'interior'],
  getContext: () => {
    const context = roomArticleContext();
    return {...context, urls:articleCardEntries('room', context.href).map(([,url])=>url),
      referenceKey:roomReference().referenceUrl || play.referenceRevision};
  },
  repair: async (kind, title, reason, draft) => {
    if ($('#prompt-id').value.trim() && !playNoteId()) return;
    play.target = { kind, title, reason, draft };
    syncPrompt();
    const prompt = $('#prompt-text').value;
    selectPlayStep(false);
    try { await copy(prompt); status($('#prompt-status'), '指定した成果物だけのプロンプトをコピーしました。'); }
    catch { $('#prompt-text').focus(); $('#prompt-text').select(); }
  },
});
const roomDraft = bindArticleDraft($('#room-article-draft'), () => ({...roomArticleContext(), title:roomQuality.articleTitle}));
let moveArticle;
const moveQuality = bindQualityAssist($('#move-article-quality'), {
  mode:'move-in',
  getContext:()=>({...moveArticle, occupied:true, urls:articleCardEntries('move-in',moveArticle?.href).map(([,url])=>url)}),
  repair:async (kind, title, reason, draft)=>{
    const field = $('#move-article-text');
    const scene = kind === 'scene1' ? 'エントランスで鍵を受け取る場面' : kind === 'scene2' ? '自室でお気に入りの場所を見つける場面' : 'Atelier Towerへの入居';
    field.value = makeArtifactPrompt({...moveArticle, mode:'move-in', kind, scene, title, reason, draft,
      occupied:true, reference:moveArticle.avatar ? {referenceMode:'registered', referenceUrl:moveArticle.avatar} : undefined,
      backgroundUrl:kind === 'scene1' ? new URL('assets/entrance-lounge.webp',towerUrl).href : moveArticle.interior});
    try { await copy(field.value); status($('#move-article-status'),'選んだ成果物だけの修正プロンプトをコピーしました。'); }
    catch { field.focus(); field.select(); status($('#move-article-status'),'選択した修正プロンプトをコピーしてください。'); }
  },
});
let roomControls;

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
  return error?.qualityMessage || errors[error?.code] || errors.unavailable;
}

async function api(view, query = {}, payload, key) {
  if(!payload&&['list','room','facilities'].includes(view))return publicView(view,query);
  if (intakePreview) throw Object.assign(new Error('intake_pending'), {code:'intake_pending'});
  const url = new URL(TOWER_API);
  if (view) url.searchParams.set('view', view);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, String(value));
  const headers = {};
  if (payload) headers['Content-Type'] = 'application/json';
  if (key) headers['X-Tower-Key'] = key;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  const options = {
    method: payload ? 'POST' : 'GET', headers, cache: 'no-store', credentials: 'omit',
    body: payload ? JSON.stringify(payload) : undefined,
    signal: controller.signal,
  };
  try {
    const response = await fetch(url, options);
    const value = await response.json().catch(() => ({}));
    if (controller.signal.aborted) throw new Error('timeout');
    if (!response.ok) throw Object.assign(new Error(value.error || 'unavailable'), { code: value.error || 'unavailable' });
    return value;
  } catch (error) {
    if (controller.signal.aborted) throw Object.assign(new Error('timeout'), { code: 'timeout' });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function write(action, payload = {}, key = state.owner?.key) {
  return api(null, {}, { action, ...payload }, key);
}

function formatRoom(slot) {
  const perFloor = state.catalog?.perFloor ?? 12;
  return slot ? `${Math.floor((slot - 1) / perFloor) + 1}${String((slot - 1) % perFloor + 1).padStart(2, '0')}` : '';
}

function card({ id, slot, title, name, theme, ...appearance }) {
  const fragment = $('#room-card-template').content.cloneNode(true);
  const item = $('button', fragment);
  const number = $('.card-number', item);
  number.textContent = slot ? `${formatRoom(slot)}号室` : 'ロビー';
  $('.card-label', item).textContent = id === 'showroom' ? '見学' : id ? '入居中' : '空室';
  $('.card-title', item).textContent = title || name || '入居する ↗';
  $('.card-subtitle', item).textContent = id ? (title && name && title !== name ? name : themes[theme]?.name || '') : '';
  if (id) {
    const scene = id === 'showroom' ? showroom : {
      id, noteId: appearance.noteId, avatarVersion: appearance.avatarVersion,
      profile: { photo: appearance.photo }, design: {
        theme, world: appearance.world, avatarMode: appearance.avatarMode, light: appearance.light,
      },
    };
    $('.card-image', item).replaceChildren(roomPreview(scene, avatarUrl(scene)));
    item.classList.add('occupied');
    item.addEventListener('click', () => travel(floorFor(slot), () => void openPublished(id)));
  } else {
    item.classList.add('vacant-card');
    $('.card-image', item).remove();
    item.addEventListener('click', () => focusEntry(slot));
  }
  return fragment;
}

function updateEmptyRooms() {
  const pick = $('#entry-slot');
  const { catalog } = state;
  const own = catalog?.rooms.find(room => room.noteId === parseNoteId($('#prompt-id').value));
  pick.replaceChildren(new Option(catalog ? '空室を選んでください' : '空室を読み込んでいます…', ''));
  if (!catalog) return;
  if (own) {
    pick.add(new Option(formatRoom(own.slot)+'号室（入居済み）', String(own.slot)));
    pick.value = String(own.slot);
    return;
  }
  const occupied = new Set(catalog.rooms.map(room => room.slot));
  for (let floor = 1; floor <= catalog.floors; floor++) {
    const group = document.createElement('optgroup');
    group.label = floor+'階';
    for (let unit = 1; unit <= catalog.perFloor; unit++) {
      const slot = (floor-1)*catalog.perFloor+unit;
      if (!occupied.has(slot)) group.append(new Option(formatRoom(slot)+'号室', String(slot)));
    }
    if (group.childElementCount) pick.append(group);
  }
  pick.value = state.preferredSlot && !occupied.has(state.preferredSlot) ? String(state.preferredSlot) : '';
}

function renderDirectory() {
  updateEmptyRooms();
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
    const item = button('floor-choice', `${n}F`, () => travel(n, () => showFloor(n, true)));
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
  const check = ++state.catalogRequest;
  state.catalogCheckedAt = Date.now();
  let updated;
  try {
    updated = await api('list');
    if (!Array.isArray(updated.rooms) || !Number.isInteger(updated.floors) || !Number.isInteger(updated.perFloor)) throw new Error();
  } catch {
    if (check !== state.catalogRequest) return;
    if (!state.catalogError) {
      state.catalogError = true;
      renderDirectory();
    }
    return;
  }
  if (check !== state.catalogRequest) return;
  const changed = JSON.stringify(updated) !== JSON.stringify(state.catalog);
  const hadError = state.catalogError;
  state.catalogError = false;
  if (changed) state.catalog = updated;
  if (changed || hadError) renderDirectory();
  if (changed && promptDialog.open) syncPrompt();
  renderBuilding(changed);
  shared.refresh();
}

function floorFor(slot) {
  return slot ? Math.ceil(slot / (state.catalog?.perFloor ?? 12)) : 1;
}

function showFloor(floor, focus) {
  state.floor = floor;
  state.query = '';
  $('#resident-search').value = '';
  renderDirectory();
  if (focus) $(`[data-floor="${floor}"]`).focus({ preventScroll: true });
}

function renderBuilding(rebuild = true) {
  if (rebuild) {
    cutaway($('#cutaway-building'), state.catalog, showroom, {
      avatar: avatarUrl,
      visit: room => travel(room.slot ? floorFor(room.slot) : (state.catalog?.floors ?? 12), () => void openPublished(room.id)),
      enter: focusEntry,
      space:id=>shared.open(id),
    });
    const pick = $('#cutaway-floor');
    const selected = pick.value;
    const rows = $('#cutaway-building').querySelectorAll('[data-level]');
    pick.replaceChildren(...Array.from(rows, row => new Option(row.dataset.label, row.dataset.level)));
    if (Array.from(pick.options).some(option => option.value === selected)) pick.value = selected;
  }
  state.story = dailyStory(state.catalog, state.owner?.id);
  $('#story-title').textContent = state.story.title;
  $('#story-intro').textContent = state.story.intro;
  const action = $('#story-visit');
  const room = state.story.room;
  action.href = room ? roomUrl(room.id).href : storyFallback;
  action.target = room ? '_self' : '_blank';
  action.textContent = room ? `${formatRoom(room.slot)}号室を訪ねる →` : '公開作品を訪ねる ↗';
}

function focusEntry(slot = null) {
  state.preferredSlot = slot;
  openPlay(Boolean(slot || play.avatar || play.interior));

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
  url.search = '';
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
  state.storyVisit = null;
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
  if (room.draftAvatar?.source) return room.draftAvatar.source;
  if (room.design.avatarMode === 'custom' && room.avatarVersion) return avatarImageUrl(room.id, room.avatarVersion);
  if (room.design.avatarMode === 'profile' && room.profile.photo) return room.profile.photo;
  return './assets/resident.webp';
}

function walkFromRoom(room) {
  const url = new URL('../halloween-exhibition/preview/diorama-city/?arrival=tower', location.href);
  if (room.draftAvatar && state.mode !== 'resident') {
    const draft = { noteId: room.noteId, slot: room.slot, title: room.design.title,
      name: room.design.avatarName || room.profile.name, avatar: room.draftAvatar, interior: room.draftInterior };
    if (!saveWalkDraft(draft)) {
      status($('#room-status'), 'このブラウザでは、下見の画像を街へ持ち出せませんでした。', true);
      return;
    }
    url.searchParams.set('walker', 'draft');
  } else if (room.isOwner !== true || player.room?.id !== room.id) return;
  location.assign(url);
}

function articleImageReference(id, kind, version) {
  const published = mediaUrl(id, kind, version);
  if (!published) return '';
  return published + '\nこの画像が公開先にまだ届いていない場合：' + pendingMediaUrl(published);
}

function openMoveArticle(room) {
  const address = formatRoom(room.slot);
  const url = new URL(towerUrl);
  url.searchParams.set('room',room.id);
  const href = url.href;
  const avatar = room.design.avatarMode === 'custom' ? articleImageReference(room.id, 'avatar', room.avatarVersion) : room.profile.photo;
  const interior = articleImageReference(room.id, 'interior', room.design.world?.artwork);
  const next = {id:room.noteId, roomTitle:titleFor(room), address, href, avatar, interior};
  const changed = JSON.stringify(next) !== JSON.stringify(moveArticle);
  moveArticle = next;
  if (changed) moveQuality.reset();
  $('#move-article-text').value = makeMoveInArticlePrompt({...next, title:next.roomTitle});
  status($('#move-article-status'));
  showDialog('move-article-dialog');
}

async function copyResidentPost(room) {
  const hint = $('#room-status');
  const url = new URL(towerUrl);
  url.searchParams.set('room', room.id);
  const draft = residentPost(titleFor(room), url.href);
  const issues = articleChecks(draft,{mode:'room',occupied:true,urls:articleCardEntries('room',url.href).map(([,link])=>link)});
  if (issues.length) { status(hint,issues.join(' '),true); return; }
  try {
    await copy(draft);
    status(hint, '参加記事の下書きをコピーしました。noteで画像を追加できます。');
  } catch {
    const input = node('textarea', 'share-url');
    input.readOnly = true;
    input.rows = 7;
    input.value = draft;
    input.setAttribute('aria-label', '参加記事の下書き');
    status(hint, '選択した下書きをコピーしてください。');
    hint.append(input);
    input.focus();
    input.select();
  }
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

function renderStamps(target, room) {
  target.replaceChildren(node('h3', '', '訪問スタンプ'));
  const stamps = node('div', 'stamp-buttons');
  for (const [kind, label] of Object.entries(stampLabels)) {
    const text = `${label} ${room.stamps?.[kind] ?? 0}`;
    if (!room.canStamp) {
      stamps.append(node('span', 'stamp', text));
      continue;
    }
    const active=(room.myStamps || (room.myStamp?[room.myStamp]:[])).includes(kind);
    const stamp = button('stamp', text, async () => {
      const group = Array.from(stamps.querySelectorAll('button'));
      group.forEach((item) => { item.disabled = true; });
      try {
        const next = await write('stamp', { id: room.id, kind, enabled:!active });
        if (state.room?.id !== room.id) return;
        if (next.myStamps && state.owner?.id) setStored('localStorage','tower-stamps-'+state.owner.id+'-'+room.id,next.myStamps);
        state.room = { ...room, ...next, canStamp: true };
        renderStamps(target, state.room);
        status($('#room-status'), !active ? '訪問スタンプを置きました。' : '訪問スタンプを取り消しました。');
      } catch (error) {
        status($('#room-status'), message(error), true);
        group.forEach((item) => { item.disabled = false; });
      }
    });
    stamp.setAttribute('aria-pressed', String(active));
    stamps.append(stamp);
  }
  target.append(stamps);
  if (!room.canStamp && !room.isOwner) target.append(node('p', 'muted', '住人になると、訪問先の部屋にスタンプを置けます。'));
}

function renderRoom(room, mode) {
  state.room = room;
  state.mode = mode;
  const content = $('#room-content');
  const dialog = $('#room-dialog');
  const controlsSlot = $('#room-controls');
  controlsSlot.replaceChildren();
  const address = $('#room-address');
  address.textContent = mode === 'draft' ? (room.slot ? `${formatRoom(room.slot)}号室の下見` : '入居前の下見') :
    mode === 'redesign' ? `${formatRoom(room.slot)}号室の改装プレビュー` :
    mode === 'showroom' ? '見学室' : `${formatRoom(room.slot)}号室`;
  $('#share-room').hidden = mode === 'draft' || mode === 'redesign';
  status($('#room-status'));
  const layout = node('div', 'room-layout');
  roomControls?.abort();
  roomControls = new AbortController();
  if (room.isOwner === true) player.accept(state.owner, room);
  const visitingResident=mode==='resident'&&!room.isOwner;
  const visiting=visitingResident || mode==='showroom';
  const mine=visiting ? currentTraveler() : null;
  const traveler=visiting ? mine || visitor : null;
  const scene = roomStage(room, avatarUrl(room), { avatarName: room.design.avatarName, traveler,
    loadTraveler:visiting && !mine && hasRoomKey(state.owner) ? async()=>residentTraveler(await player.load()) || visitor : null,
    signal: roomControls.signal, inputRoot: dialog });
  const talk=()=>talkToResident(room,{parent:dialog,place:'この部屋'});
  if(visitingResident){
    const host=button('room-host','',event=>{event.stopPropagation();talk();});
    const name=room.design.avatarName||room.profile.name||room.noteId;
    host.setAttribute('aria-label',name+'に話しかける');
    const picture=node('img');picture.alt=name;
    if(room.avatarVersion)picture.crossOrigin='anonymous';
    host.append(picture,node('small','',name+' · 話す'));
    const stage=scene.querySelector('.world-stage');
    host.style.left=stage.dataset.floorCoordinates==='image'?'40%':'33%';
    host.style.top=stage.dataset.floorCoordinates==='image'?'79%':'84%';host.style.zIndex='81';
    stage.append(host);setArtworkSource(picture,avatarUrl(room));
    if(room.design.avatarMode==='custom')autoResidentWalker(picture,{atlas:room.design.world?.atlas===true})(0,false);
  }
  const controls = $('.world-control-dock', scene);
  const body = node('div', 'room-body');
  const title = node('h2', '', titleFor(room));
  title.id = 'room-title';
  title.tabIndex = -1;
  controls.append(button('quiet room-details-jump', '部屋の案内へ ↓', () => {
    title.focus({ preventScroll: true });
    body.scrollIntoView({ block: 'start', behavior: 'instant' });
  }));
  body.append(title);
  if (room.noteId) body.append(link('room-byline', `@${room.noteId} · noteプロフィール ↗`, `https://note.com/${room.noteId}`, true));
  if (room.design.welcome) body.append(node('p', 'welcome', room.design.welcome));
  if (room.profile.description) body.append(node('p', 'room-description', room.profile.description));

  if (mode === 'resident' && state.storyVisit?.room.id === room.id) {
    const visit = node('aside', 'room-story');
    visit.append(node('strong', '', state.storyVisit.title), node('p', '', state.storyVisit.arrival));
    const choice = room.profile.articles.find(article => article.url === room.design.pin) ?? room.profile.articles[0];
    visit.append(link('quiet', choice ? `「${choice.title}」を開く ↗` : '書き手のnoteを訪ねる ↗',
      choice?.url || `https://note.com/${room.noteId}`, true));
    body.append(visit);
  }
  const actions = node('div', 'room-actions');
  if (room.isOwner && mode === 'resident') actions.append(button('button primary', '記事にする', () => openMoveArticle(room)));
  if(mode==='resident' && !room.isOwner)actions.append(button('button primary','住人に話しかける',talk));
  if (mode === 'redesign') {
    const save = button('button primary', 'この部屋に改装する', () => void saveWorld(room, save));
    actions.append(save);
  } else if (mode === 'draft') {
    actions.append(button('button primary', 'この部屋に入居する', () => void beginProof(room, false)));
  } else if (mode === 'showroom') {
    actions.append(button('button primary', '自分の部屋をつくる', () => { dismissRoom(); focusEntry(); }));
  } else if (room.isOwner) {
    actions.append(button('button primary', '部屋を改装', () => openEditor(room)));
    actions.append(button('quiet', '参加記事をコピー', () => void copyResidentPost(room)));
    actions.append(button('quiet withdraw', '退去する', () => {
      status($('#leave-status'));
      showDialog('leave-dialog');
    }));
  }
  if ((room.draftAvatar && mode !== 'resident') || (mode === 'resident' && room.isOwner === true)) {
    actions.append(button('button outline', '自分のアバターで街を歩く', () => walkFromRoom(room)));
  } else if (visitingResident) {
    actions.append(link('button outline', '街へ出る', '../halloween-exhibition/preview/diorama-city/?arrival=tower'));
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
  controlsSlot.append(controls);
  controlsSlot.hidden = false;
  showDialog('room-dialog');
  dialog.scrollTop = 0;
  content.scrollTop = 0;
}

function loadingRoom(label) {
  roomControls?.abort();
  $('#room-controls').replaceChildren();
  $('#room-controls').hidden = true;
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
    let room;
    if(state.owner?.id===id && hasRoomKey(state.owner)) {
      try { room = await player.load(true); } catch { /* The public room can still be visited. */ }
    }
    if(!room){
      room={...await api('room',{id}),isOwner:false};
      if(state.owner?.key && state.owner.id!==id)room={...room, canStamp:true, myStamps:getStored('localStorage','tower-stamps-'+state.owner.id+'-'+id) || []};
    }
    if (request !== state.request) return;
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
  const submit = $('button[type="submit"]', event.currentTarget);
  const picture = state.entryPicture;
  const request = ++state.request;
  submit.disabled = true;
  status(hint, 'noteのプロフィールと記事を読み込んでいます…');
  try {
    await showEntryPreview(id, picture, null, request, () => {
      status(hint, state.preferredSlot ? `${formatRoom(state.preferredSlot)}号室を選択中。` : '部屋の下見ができます。');
    });
  } catch (error) {
    if (request === state.request) status(hint, message(error), true);
  } finally { submit.disabled = false; }
}

async function showEntryPreview(id, picture, interior, request, ready, enroll = false) {
  const room = await api('preview', { noteId: id });
  if (request !== state.request) return;
  if (!room.existingId) {
    if (ready() === false) return;
    const draft = withWorld({ ...room, slot: state.preferredSlot }, picture, interior);
    if (enroll) await beginProof(draft, false);
    else renderRoom(draft, 'draft');
    return;
  }
  if (picture && state.owner?.id === room.existingId) {
    const current = await write('visit', { id: room.existingId });
    if (request !== state.request) return;
    if (current.isOwner) {
      if (ready() === false) return;
      renderRoom(withWorld(current, picture, interior), 'redesign');
      return;
    }
  }
  if (ready() === false) return;
  await openPublished(room.existingId);
  if (picture && !state.room?.isOwner) status($('#room-status'), '入居済みの部屋です。鍵を再発行すると改装できます。');
}

function withWorld(room, picture, interior) {
  const world = { ...designWorld(room, picture?.signature), artwork: room.design.world?.artwork,
    atlas: picture ? picture.atlas === true : room.design.world?.atlas === true };
  const design = { ...room.design, world };
  if (picture) design.avatarMode = 'custom';
  if (interior && $('#generated-room-title').value.trim()) design.title = $('#generated-room-title').value.trim();
  return { ...room, design, draftAvatar: picture, draftInterior: interior };
}

function encodedImage(picture) {
  return picture?.source.split(',')[1];
}

function draftArtwork(room) {
  return { avatarB64: encodedImage(room.draftAvatar), avatarAtlas: room.draftAvatar?.atlas,
    interiorB64: encodedImage(room.draftInterior) };
}

async function reviewRoomImage(picture, retainedUrl, role) {
  if (picture) {
    const review = artworkReviews.get(picture) ?? await inspectImage(picture.source, role, {atlas:picture.atlas});
    if (review.errors.length) throw {qualityMessage:review.errors.join(' ')};
    return review;
  }
  try { return await inspectImage(retainedUrl, role); }
  catch {
    const pending = pendingMediaUrl(retainedUrl);
    if (pending) {
      try { return await inspectImage(pending, role); } catch { /* Ask the owner to retry below. */ }
    }
    throw {qualityMessage:'現在の登録画像を照合できません。再度試すか、手元の２枚を選んでください。'};
  }
}

async function checkRoomArtwork(avatar, interior, retainedAvatar = '', retainedInterior = '') {
  if ((!avatar && !interior) || (!avatar && !retainedAvatar) || (!interior && !retainedInterior)) return;
  const [actor, room] = await Promise.all([
    reviewRoomImage(avatar, retainedAvatar, 'avatar'), reviewRoomImage(interior, retainedInterior, 'interior'),
  ]);
  if (artworkMatch(actor, room) === 'same') {
    throw {qualityMessage:'アバターと部屋に同じ画像が選ばれています。変更する画像だけを選び直してください。'};
  }
}

async function saveWorld(room, control) {
  control.disabled = true;
  status($('#room-status'), '部屋を書き換えています…');
  try {
    await checkRoomArtwork(room.draftAvatar, room.draftInterior);
    if (room !== state.room || !$('#room-dialog').open) return;
    const updated = await write('save', { id: room.id, version: room.version, design: room.design, ...draftArtwork(room) });
    pushRoom(room.id);
    renderRoom({ ...updated, isOwner: true }, 'resident');
    resetEntryCharacter();
    clearWalkDraft(room.noteId);
    if (room.draftInterior) resetPlayImages();
    status($('#room-status'), '新しい部屋とキャラを保存しました。');
    void loadDirectory();
  } catch (error) {
    status($('#room-status'), error.code === 'conflict' ? '部屋が先に更新されました。トップから下見をやり直してください。' : message(error), true);
  } finally {
    control.disabled = false;
  }
}

function setProofVisible(visible) {
  for (const id of ['proof-block', 'proof-steps', 'open-note-settings', 'verify-proof']) $(`#${id}`).hidden = !visible;
}

async function beginProof(room, recover) {
  state.proof = null;
  const plan = recover ? undefined : {
    world: room.design.world,
    theme: room.design.theme,
    title: room.design.title,
    ...draftArtwork(room),
  };
  state.proofIntent = { noteId: room.noteId, slot: recover ? null : room.slot, recover, plan };
  $('#key-title').textContent = recover ? '部屋の鍵を再発行する' : '部屋の鍵をつくる';
  $('#proof-intro').textContent = recover ?
    '本人確認で、このブラウザに新しい鍵を保存します。以前の鍵は更新されます。' :
    `@${room.noteId} の ${formatRoom(room.slot)}号室の本人確認です。下の確認用パスコードをコピーし、noteの「自己紹介」に入力して保存してください。確認後は消せます。`;
  showDialog('key-dialog');
  const stored = getStored('sessionStorage', PROOF_STORAGE);
  const same = stored && stored.until > Date.now() && stored.noteId === room.noteId && stored.slot === state.proofIntent.slot;
  if (same) {
    const proof = { ...stored, ...state.proofIntent };
    setStored('sessionStorage', PROOF_STORAGE, proof);
    showProof(proof);
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
    setStored('sessionStorage', PROOF_STORAGE, proof);
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
    const room = await write('confirm', proof.plan ?? {}, proof.key);
    state.owner = { id: room.id, noteId: room.noteId, key: proof.key };
    const saved = setStored('localStorage', OWNER_STORAGE, state.owner);
    setStored('sessionStorage', PROOF_STORAGE, null);
    state.proof = null;
    state.preferredSlot = null;
    resetEntryCharacter();
    closeDialog('key-dialog');
    if (proof.recover && play.avatar && play.interior && parseNoteId($('#prompt-id').value) === room.noteId) {
      renderRoom(withWorld({ ...room, isOwner: true }, play.avatar, play.interior), 'redesign');
      status($('#room-status'), '鍵を再発行しました。生成した部屋とアバターで改装できます。');
      void loadDirectory();
      return;
    }
    clearWalkDraft(room.noteId);
    const ownRoom = { ...room, isOwner: true };
    if (proof.plan?.interiorB64 && play.photoId === room.noteId) {
      ownRoom.draftAvatar = play.avatar; ownRoom.draftInterior = play.interior;
      resetPlayImages();
    }
    pushRoom(room.id);
    renderRoom(ownRoom, 'resident');
    if (!proof.recover) {
      const offer = node('section','move-in-complete');
      offer.append(node('h2','',formatRoom(room.slot)+'号室へようこそ'),node('p','','本人確認が済み、入居が完了しました。'),button('button primary','記事にする',()=>openMoveArticle(room)),button('button outline','部屋を見る',()=>offer.remove()));
      $('#room-content').prepend(offer);
      $('#room-dialog').querySelector('.dialog-inner').scrollTop=0;
      offer.querySelector('button').focus();
    }
    const done = proof.recover ? '鍵を再発行しました。' : `${formatRoom(room.slot)}号室に入居しました。`;
    status($('#room-status'), `${done}noteの自己紹介に入れたコードは削除できます。${saved ? '' : ' このブラウザを閉じた後は鍵の再発行が必要です。'}`);
    void loadDirectory();
  } catch (error) {
    status($('#proof-status'), message(error), true);
    if (error.code === 'expired') {
      setStored('sessionStorage', PROOF_STORAGE, null);
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
  state.interiorPicture = null;
  editImageReads.clear();
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
  $('#keep-interior-field').hidden = !room.design.world?.artwork;
  $('#edit-avatar-format').value = room.design.world?.atlas ? 'atlas' : 'avatar';
  $('#clear-interior-upload').hidden = true;
  showEditorImage($('#interior-preview'), generatedInterior(room));
  const pin = $('#pin-select');
  pin.replaceChildren(new Option('飾らない', ''));
  for (const article of room.profile.articles) pin.append(new Option(article.title, article.url));
  pin.value = room.design.pin || '';
  showEditorImage($('#avatar-preview'), room.avatarVersion ? avatarImageUrl(room.id, room.avatarVersion) : '');
  $('#avatar-preview').dataset.atlas = String(Boolean(room.design.world?.atlas));
  $('#avatar-preview').alt = room.design.world?.atlas ? '登録済みの歩行シート（４×４）' : '登録済みのキャラ画像';
  $('#avatar-preview-note').hidden = !room.avatarVersion;
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

function stripSolidBackdrop(canvas) {
  const { width, height } = canvas;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data;
  const edge = [];
  for (let x = 0; x < width; x++) edge.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y++) edge.push(y * width, y * width + width - 1);
  if (edge.some(index => data[index * 4 + 3] < 170)) return;
  const difference = index => {
    const start = index * 4;
    return Math.max(Math.abs(data[start] - data[0]), Math.abs(data[start + 1] - data[1]), Math.abs(data[start + 2] - data[2]));
  };
  if (edge.filter(index => difference(index) <= 20).length < edge.length * .86) return;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let end = 0;
  function add(index) {
    if (!seen[index] && difference(index) <= 23) {
      seen[index] = 1;
      queue[end++] = index;
    }
  }
  for (const index of edge) add(index);
  for (let current = 0; current < end; current++) {
    const index = queue[current];
    const x = index % width;
    if (x) add(index - 1);
    if (x < width - 1) add(index + 1);
    if (index >= width) add(index - width);
    if (index < width * (height - 1)) add(index + width);
  }
  if (end < width * height * .12 || end > width * height * .92) return;
  for (let i = 0; i < end; i++) data[queue[i] * 4 + 3] = 0;
  context.putImageData(pixels, 0, 0);
}

function resetEntryCharacter(announce = false) {
  state.entryPicture = null;
  $('#entry-character').value = '';
  $('#entry-character-preview').removeAttribute('src');
  $('#entry-character-preview').hidden = true;
  $('#clear-character').hidden = true;
  if (announce) status($('#entry-status'), 'キャラ画像を選び直せます。');
}

async function chooseEntryCharacter(event) {
  const field = event.currentTarget;
  const file = field.files?.[0];
  if (!file) { resetEntryCharacter(); return; }
  const submit = $('#preview-form button[type="submit"]');
  const preview = $('#entry-character-preview');
  state.entryPicture = null;
  preview.hidden = true;
  $('#clear-character').hidden = true;
  submit.disabled = true;
  status($('#entry-status'), 'キャラ画像を読み込んでいます…');
  try {
    const picture = await readPicture(file);
    if (field.files?.[0] !== file) return;
    state.entryPicture = picture;
    preview.src = picture.source;
    preview.hidden = false;
    $('#clear-character').hidden = false;
    status($('#entry-status'), 'キャラ画像を読み込みました。IDを入れて部屋をつくれます。');
  } catch (error) {
    if (field.files?.[0] === file) {
      resetEntryCharacter();
      status($('#entry-status'), message(error), true);
    }
  } finally {
    if (!field.files?.length || field.files[0] === file) submit.disabled = false;
  }
}

function readPicture(file, variant = 'avatar') {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject({ code: 'picture_timeout' }), 15000);
  });
  return Promise.race([preparePicture(file, variant), limit]).finally(() => clearTimeout(timer));
}

function pictureBlob(canvas, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
}

async function prepareInterior(image) {
  const ratioWH = image.naturalWidth / image.naturalHeight;
  if (ratioWH < 1.2 || ratioWH > 2.2) throw { code: 'bad_interior' };
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  const ratio = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [.87, .78, .68, .54]) {
    const output = await pictureBlob(canvas, quality);
    if (output && output.size <= 245760) return { source: await dataUrl(output) };
  }
  throw { code: 'big_image' };
}

async function prepareVehicle(image) {
  const normalized = document.createElement('canvas');
  const initialScale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
  normalized.width = Math.max(1, Math.round(image.naturalWidth * initialScale));
  normalized.height = Math.max(1, Math.round(image.naturalHeight * initialScale));
  normalized.getContext('2d').drawImage(image, 0, 0, normalized.width, normalized.height);
  const vehicle = trimTransparentEdges(normalized);
  const { width, height } = vehicle;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw { code: 'bad_image' };
  for (const side of [1000, 720, 480, 320]) {
    const scale = Math.min(side / Math.max(width, height), Math.max(1, 100 / width, 80 / height));
    const drawWidth = Math.max(1, Math.round(width * scale));
    const drawHeight = Math.max(1, Math.round(height * scale));
    canvas.width = Math.max(100, drawWidth);
    canvas.height = Math.max(80, drawHeight);
    context.imageSmoothingQuality = 'high';
    // The API needs at least 100×80. Extremely wide or tall images get transparent margins.
    context.drawImage(vehicle, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
    for (const quality of [.9, .76, .6]) {
      const output = await pictureBlob(canvas, quality);
      if (output && output.size <= 98_304) return { source: await dataUrl(output) };
    }
  }
  throw { code: 'big_image' };
}

async function prepareAtlas(image, detected = null) {
  const aspect = (image.naturalWidth||image.width) / (image.naturalHeight||image.height);
  if (aspect < .55 || aspect > 1.8) throw { code: 'bad_sheet' };
  const source = document.createElement('canvas');
  const frameWidth = Math.round(240 * Math.min(1, aspect));
  const frameHeight = Math.round(240 * Math.min(1, 1 / aspect));
  source.width = 4 * frameWidth;
  source.height = 4 * frameHeight;
  source.getContext('2d').drawImage(image, 0, 0, source.width, source.height);
  stripSolidBackdrop(source);
  const cell = document.createElement('canvas');
  cell.width = frameWidth;
  cell.height = frameHeight;
  const cellContext = cell.getContext('2d');
  const frames = [];
  for (let index = 0; index < 16; index++) {
    cellContext.clearRect(0, 0, frameWidth, frameHeight);
    if (detected) {
      const [l,t,r,b] = detected[index];
      const scale = Math.min((frameWidth-8)/(r-l),(frameHeight-8)/(b-t));
      cellContext.drawImage(image,l,t,r-l,b-t,(frameWidth-(r-l)*scale)/2,frameHeight-4-(b-t)*scale,(r-l)*scale,(b-t)*scale);
    } else cellContext.drawImage(source, (index % 4) * frameWidth, Math.floor(index / 4) * frameHeight,
      frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    let actor;
    try { actor = trimTransparentEdges(cell); } catch { throw { code: 'bad_sheet' }; }
    if (actor.height < 40 || actor.width < 12 || actor.width >= frameWidth - 2 || actor.height >= frameHeight - 2) throw { code: 'bad_sheet' };
    frames.push(actor);
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const height = Math.max(...frames.map(frame => frame.height));
  const width = Math.max(...frames.map(frame => frame.width));
  for (const size of [240, 192]) {
    canvas.width = canvas.height = size * 4;
    const scale = (size - 12) / Math.max(height, width);
    frames.forEach((actor, index) => {
      const x = (index % 4) * size + (size - actor.width * scale) / 2;
      const y = (Math.floor(index / 4) + 1) * size - 4 - actor.height * scale;
      context.drawImage(actor, x, y, actor.width * scale, actor.height * scale);
    });
    for (const quality of [.87, .77, .67]) {
      const output = await pictureBlob(canvas, quality);
      if (output && output.size <= 307200) return { source: await dataUrl(output), signature: characterSignature(frames[0]), atlas: true };
    }
  }
  throw { code: 'big_image' };
}

async function preparePicture(file, variant) {
  if (file.size > 10 * 1024 * 1024) throw { code: 'big_image' };
  const mode = new Uint8Array(await file.slice(0, 21).arrayBuffer());
  const actualType = artworkMime(mode);
  if (!actualType) throw { code: 'bad_image' };
  const animated = actualType === 'image/gif' ||
    (actualType === 'image/webp' && mode[12] === 86 && mode[15] === 88 && (mode[20] & 2) !== 0);
  if (animated && variant === 'atlas') throw { code: 'bad_sheet' };
  if (animated && variant === 'avatar' && file.size > 307200) throw { code: 'big_image' };
  const localUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = localUrl;
    await image.decode().catch(() => { throw { code: 'bad_image' }; });
    const original = sampleArtwork(image);
    const sourceErrors = imageContentChecks(original);
    if (sourceErrors.length) throw {code:'bad_image', qualityMessage:sourceErrors.join(' ')};
    const picture = await encodePicture(image, file, variant, animated, actualType);
    const role = variant === 'atlas' ? 'avatar' : variant;
    const review = await inspectImage(picture.source, role, {atlas:picture.atlas});
    if (review.errors.length) throw { code:'bad_image', qualityMessage:review.errors.join(' ') };
    review.original = original;
    artworkReviews.set(picture, review);
    return picture;
  } finally { URL.revokeObjectURL(localUrl); }
}

async function encodePicture(image, file, variant, animated, actualType) {
  if (variant === 'vehicle') return await prepareVehicle(image);
  if (variant === 'interior') return await prepareInterior(image);
  if (variant === 'atlas') return await prepareAtlas(image);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  if (animated && longestSide > 1200) throw { code: 'bad_image' };
  if (animated) return { source: await dataUrl(file.slice(0, file.size, actualType)), signature: characterSignature(image) };
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw { code: 'bad_image' };
  let crop;
  for (const side of [720, 512, 384]) {
    const width = crop?.width ?? image.naturalWidth;
    const height = crop?.height ?? image.naturalHeight;
    const ratio = Math.min(1, side / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    if (crop) {
      context.drawImage(crop, 0, 0, canvas.width, canvas.height);
    } else {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      stripSolidBackdrop(canvas);
      const detected = scanAtlas(canvas);
      if (detected) return await prepareAtlas(canvas,detected);
      crop = trimTransparentEdges(canvas);
    }
    const output = await pictureBlob(side === 720 ? crop : canvas, .86);
    if (output && output.size <= 307200) return { source: await dataUrl(output), signature: characterSignature(crop) };
  }
  throw { code: 'big_image' };
}

function playNoteId() {
  const field = $('#prompt-id');
  const id = parseNoteId(field.value);
  if (!id) {
    status($($('#prompt-write').hidden ? '#import-status' : '#prompt-status'), '自分のnote IDかプロフィールURLを入力してください。', true);
    field.focus();
  }
  return id;
}

function localRoomAvatar(id) {
  if (id && play.photoId === id && play.avatar) return play.avatar.source;
  return id && play.draft?.noteId === id ? play.draft.avatar?.source : '';
}

function roomReference() {
  const id = parseNoteId($('#prompt-id').value);
  if (id && play.photoId === id && play.avatar) return creatorReference(id, id, play.avatar.source);
  const actor = residentTraveler(player.room);
  if (id && actor?.noteId === id && (actor.custom || actor.profile || actor.host)) {
    return creatorReference(id, actor.noteId, actor.source);
  }
  return creatorReference(id, id, localRoomAvatar(id));
}

function reconcileRoomCreator() {
  const id = parseNoteId($('#prompt-id').value);
  if (!id) return;
  if ((play.photoId && play.photoId !== id) || (play.formCreator && play.formCreator !== id)) {
    resetPlayImages();
    roomQuality.reset();
    play.target = null;
  }
  play.formCreator = id;
  if (play.avatar || play.interior) play.photoId = id;
}

function syncPrompt() {
  const id = parseNoteId($('#prompt-id').value);
  const reference = roomReference();
  if($('#room-article-draft').open)roomDraft.refresh();
  const save = $('#room-save-reference');
  save.hidden = reference.referenceMode !== 'local';
  if (save.hidden) save.removeAttribute('href');
  else {
    save.href = localRoomAvatar(id);
    save.download = id + '-avatar.' + (save.href.match(/^data:image\/([a-z]+)/i)?.[1]?.replace('jpeg', 'jpg') || 'png');
  }
  $('#room-reference-status').textContent = reference.referenceMode === 'registered' ?
    '@' + id + ' の登録画像URLを使います。絵を変更したいときやChatGPTで画像が開けないときは、キャラ画像を添付してください。' :
    reference.referenceMode === 'local' ? '@' + id + ' の画像はこの端末にあります。別のチャットでは必要に応じて元の画像を添付してください。' :
    'ChatGPTに自分のキャラ画像を添付してください。同じチャットにある本人の絵も使えます。';
  if (play.target) {
    $('#prompt-text').value = makeArtifactPrompt({ ...roomArticleContext(), ...play.target, scene:$('#prompt-ideas').value, reference,
      draft:play.target.kind==='article' ? play.target.draft ?? roomDraft.text : undefined });
    roomQuality.refresh();
    return;
  }
  const returnUrl = new URL(towerUrl);
  if (id) returnUrl.searchParams.set('creator', id);
  if (state.preferredSlot) returnUrl.searchParams.set('slot', String(state.preferredSlot));
  returnUrl.hash = 'prompt-import';
  const profile = id === play.id ? play.profile : null;
  $('#prompt-text').value = makeRoomPrompt({ id, description: profile?.description, articles: profile?.articles,
    ideas: $('#prompt-ideas').value.trim(), returnUrl: returnUrl.href, reference });
  roomQuality.refresh();
}

function loadPromptProfile() {
  const id = parseNoteId($('#prompt-id').value);
  if (!id || id === play.id) return;
  play.id = id;
  play.profile = null;
  const resident = state.catalog?.rooms.find(room => room.noteId === id);
  if (resident) play.profile = {name:resident.name};
}

function selectPlayStep(importing) {
  $('#prompt-title').textContent = importing ? '空室を選んで入居する' : 'アバターと部屋をつくる';
  $('#prompt-write').hidden = importing;
  $('#prompt-import').hidden = !importing;
  $('#prompt-write-tab').setAttribute('aria-pressed', String(!importing));
  $('#prompt-import-tab').setAttribute('aria-pressed', String(importing));
  if (importing) {
    updateEmptyRooms();
    if(intakePreview){
      $('#prompt-import button[type=submit]').textContent='この端末に入居の準備を保存';
      status($('#import-status'),'受付準備中です。選んだ部屋と画像はこの端末に保存できます。');
    }
  }
  else loadPromptProfile();
}

function openPlay(importing = false, incoming = '') {
  play.target = null;
  play.draft = readWalkDraft();
  if (incoming || !$('#prompt-id').value) {
    $('#prompt-id').value = incoming || state.owner?.noteId || $('#creator-id').value || play.draft?.noteId || getStored('localStorage','tower-entry-id') || '';
  }
  reconcileRoomCreator();
  selectPlayStep(importing);
  const saved = play.draft;
  if (importing && saved?.noteId === parseNoteId($('#prompt-id').value) && !play.avatar) {
    state.preferredSlot ??= saved.slot;
    updateEmptyRooms();
    $('#generated-avatar-mode').value=saved.avatar.atlas?'atlas':'single';
    $('#generated-room-title').value=saved.title||'';
    setPlayPhoto('avatar',saved.avatar);
    if(saved.interior)setPlayPhoto('interior',saved.interior);
  }
  if(intakePreview && importing) status($('#import-status'),'受付準備中です。空室を選んで２枚を添付すると、この端末に保存できます。');
  syncPrompt();
  showDialog('prompt-dialog');
  if(hasRoomKey(state.owner) && !player.room) void player.load().then(own=>{
    if(own && promptDialog.open) syncPrompt();
  }).catch(()=>{});
  const first = importing && $('#prompt-id').value ? $('#entry-slot') : $('#prompt-id');
  first.focus({preventScroll:true});
}

function routePlay() {
  const link = new URL(location.href);
  if (!['#prompt-play', '#prompt-import'].includes(link.hash) || link.searchParams.has('room')) return;
  const savedDraft = readWalkDraft();
  const draft = link.searchParams.get('resume') === 'walk' || (link.hash === '#prompt-import' && savedDraft?.noteId === parseNoteId(link.searchParams.get('creator') || '')) ? savedDraft : null;
  if (draft) {
    state.preferredSlot = draft.slot ?? null;
    openPlay(true, draft.noteId);
    $('#generated-avatar-mode').value = draft.avatar.atlas ? 'atlas' : 'single';
    $('#generated-room-title').value = draft.title || '';
    setPlayPhoto('avatar', draft.avatar);
    setPlayPhoto('interior', draft.interior ?? null);
    if (draft.interior) status($('#import-status'), '街で使ったアバターと部屋を読み込みました。');
    else status($('#import-status'), 'アバターは読み込み済みです。部屋画像を添付してください。部屋だけのプロンプトもコピーできます。');
    return;
  }
  const slot = Number(link.searchParams.get('slot'));
  if (Number.isInteger(slot) && slot >= 1 && slot <= 2147483647) state.preferredSlot = slot;
  openPlay(link.hash === '#prompt-import', parseNoteId(link.searchParams.get('creator') || '') || '');
}

function setPlayPhoto(kind, photo) {
  play[kind] = photo;
  if (kind === 'avatar') play.referenceRevision++;
  if (photo) play.photoId = parseNoteId($('#prompt-id').value) || '';
  else if (!play.avatar && !play.interior) play.photoId = '';
  const preview = $(`#generated-${kind}-preview`);
  preview.hidden = !photo;
  if (photo) preview.src = photo.source;
  else preview.removeAttribute('src');
  const label = preview.parentElement.querySelector('.prompt-file-button');
  if (label) label.textContent = photo ? '読み込み済み · 選び直す' : (kind === 'avatar' ? 'アバター画像を選ぶ' : '部屋画像を選ぶ');
  const noteId = parseNoteId($('#prompt-id').value);
  return roomQuality.accept(kind, photo?.source, {atlas:Boolean(photo?.atlas), review:artworkReviews.get(photo)}).then(() => {
    if (play[kind] !== photo || !noteId || noteId !== play.photoId || !play.avatar || !play.interior ||
        roomQuality.checkingRoles(['avatar','interior']) || roomQuality.problems(['avatar','interior']).length) return;
    saveWalkDraft({noteId, avatar:play.avatar, interior:play.interior, title:$('#generated-room-title').value,
      name:(play.id === noteId && play.profile?.name) || noteId, slot:state.preferredSlot});
  });
}

function resetPlayImages() {
  for (const kind of ['avatar', 'interior']) {
    $(`#generated-${kind}`).value = '';
    setPlayPhoto(kind, null);
  }
  $('#generated-room-title').value = '';
  status($('#import-status'));
}

async function readPlayPhoto(kind) {
  const field = $(`#generated-${kind}`);
  const file = field.files?.[0];
  const creator = parseNoteId($('#prompt-id').value);
  const variant = kind === 'interior' ? 'interior' : $('#generated-avatar-mode').value === 'atlas' ? 'atlas' : 'avatar';
  const hint = $('#import-status');
  setPlayPhoto(kind, null);
  if (!file) return;
  const pending = { kind };
  play.loading.add(pending);
  const currentFile = () => field.files?.[0] === file && (!creator || parseNoteId($('#prompt-id').value) === creator) && (kind === 'interior' ||
    ($('#generated-avatar-mode').value === 'atlas') === (variant === 'atlas'));
  status(hint, '画像を読み込んでいます…');
  try {
    const picture = await readPicture(file, variant);
    if (currentFile()) {
      if(kind==='avatar'&&picture.atlas) $('#generated-avatar-mode').value='atlas';
      await setPlayPhoto(kind, picture);
      if (field.files?.[0] !== file || play[kind] !== picture) return;
      const pairReady = play.avatar && play.interior && !roomQuality.checkingRoles(['avatar','interior']);
      const problems = pairReady ? roomQuality.problems(['avatar','interior']) : [];
      status(hint, problems.join(' ') || (pairReady ? '２枚がそろいました。本人確認に進めます。' : '画像を読み込みました。'), Boolean(problems.length));
    }
  } catch (error) {
    if (currentFile()) status(hint, message(error), true);
  } finally { play.loading.delete(pending); }
}

async function submitPlay(event) {
  event.preventDefault();
  const id = playNoteId(), hint = $('#import-status');
  if (!id) return;
  if (play.loading.size || roomQuality.checkingRoles(['avatar','interior'])) { status(hint, '画像を読み込み・検査中です。'); return; }
  if (!play.avatar || !play.interior || play.avatar.source === play.interior.source) {
    status(hint, 'アバターと部屋の別々の画像を１枚ずつ選んでください。部屋未生成なら「部屋だけ作る」を使ってください。', true);
    return;
  }
  const problems = roomQuality.problems(['avatar', 'interior']);
  if (problems.length) {
    status(hint, problems.join(' '), true);
    return;
  }
  const slot = Number($('#entry-slot').value);
  if (!slot) { status(hint, '入居する空室を選んでください。', true); $('#entry-slot').focus(); return; }
  state.preferredSlot = slot;
  const savedDraft=saveWalkDraft({noteId:id, slot, avatar:play.avatar, interior:play.interior, title:$('#generated-room-title').value, name:id});
  if (intakePreview) {
    status(hint,savedDraft ? errors.intake_pending : '端末に画像を保存できませんでした。元の２枚を保存しておいてください。',!savedDraft);
    return;
  }
  const submit = $('button[type="submit"]', event.currentTarget);
  const request = ++state.request;
  submit.disabled = true;
  $('#creator-id').value = id;
  status(hint, '公開プロフィールと記事を読み込んでいます…');
  try {
    const {avatar, interior} = play;
    await showEntryPreview(id, avatar, interior, request, () => {
      if (!promptDialog.open) return false;
      if (parseNoteId($('#prompt-id').value) !== id || Number($('#entry-slot').value) !== slot ||
          play.avatar !== avatar || play.interior !== interior) {
        status(hint, '入力が変わりました。現在の号室と画像で、もう一度本人確認に進んでください。');
        return false;
      }
      status(hint);
      promptDialog.close();
    }, true);
  } catch (error) {
    if (request === state.request) status(hint, message(error), true);
  } finally { submit.disabled = false; }
}

const editImageReads = new Map();

function showEditorImage(preview, source) {
  preview.hidden = !source;
  if (source) preview.src = source;
  else preview.removeAttribute('src');
}

async function chooseEditorPicture(field) {
  const file = field.files?.[0];
  const interior = field.id === 'interior-file';
  const preview = $(interior ? '#interior-preview' : '#avatar-preview');
  const key = interior ? 'interiorPicture' : 'picture';
  const room = state.room;
  const existing = interior ? (room && $('#keep-interior-field input').checked ? generatedInterior(room) : '') :
    (room?.avatarVersion ? avatarImageUrl(room.id, room.avatarVersion) : '');
  editImageReads.delete(field);
  state[key] = null;
  if (interior) $('#clear-interior-upload').hidden = !file;
  else {
    preview.dataset.atlas = String(Boolean(room?.design.world?.atlas));
    preview.alt = room?.design.world?.atlas ? '登録済みの歩行シート（４×４）' : '登録済みのキャラ画像';
    $('#avatar-preview-note').hidden = !room?.avatarVersion;
  }
  showEditorImage(preview, existing);
  status($('#edit-status'));
  if (!file) return;
  const request = {};
  editImageReads.set(field, request);
  status($('#edit-status'), '画像を読み込んでいます…');
  try {
    const picture = await readPicture(file, interior ? 'interior' : $('#edit-avatar-format').value);
    if (editImageReads.get(field) !== request) return;
    state[key] = picture;
    if (!interior) {
      if (picture.atlas) $('#edit-avatar-format').value = 'atlas';
      preview.dataset.atlas = String(Boolean(picture.atlas));
      preview.alt = picture.atlas ? '新しく選んだ歩行シート（４×４）' : '新しく選んだキャラ画像';
      $('#avatar-preview-note').hidden = true;
    }
    showEditorImage(preview, picture.source);
    status($('#edit-status'), interior ? '部屋画像を読み込みました。' : picture.atlas ? '歩行シートを認識しました。ゲーム内は１人で歩きます。' : 'キャラ画像を読み込みました。');
  } catch (error) {
    if (editImageReads.get(field) === request) {
      field.value = '';
      if (interior) $('#clear-interior-upload').hidden = true;
      status($('#edit-status'), message(error), true);
    }
  } finally {
    if (editImageReads.get(field) === request) editImageReads.delete(field);
  }
}

async function saveEditor(event) {
  event.preventDefault();
  const room = state.room;
  if (!room?.isOwner) return;
  if (editImageReads.size) { status($('#edit-status'), '画像の読み込みを待っています…'); return; }
  const save = $('#save-room');
  const form = event.currentTarget;
  const values = new FormData(form);
  const design = Object.fromEntries(['title', 'welcome', 'theme', 'light', 'pin', 'avatarMode', 'avatarName']
    .map((key) => [key, values.get(key)]));
  if (design.avatarMode === 'custom' && !state.picture && !room.avatarVersion) {
    status($('#edit-status'), errors.avatar_required, true);
    return;
  }
  const picture = design.avatarMode === 'custom' ? state.picture : null;
  const regenerate = picture || !room.design.world || design.avatarMode !== room.design.avatarMode || design.theme !== room.design.theme;
  design.world = regenerate ? designWorld({ ...room, design }, picture?.signature) : room.design.world;
  if(design.world) design.world={...design.world, atlas:design.avatarMode==='custom' && (picture ? picture.atlas===true : room.design.world?.atlas===true), artwork:room.design.world?.artwork};
  const clearInterior = Boolean(room.design.world?.artwork && !values.has('keepInterior'));
  const images = draftArtwork({ draftAvatar: picture, draftInterior: state.interiorPicture });
  save.disabled = true;
  status($('#edit-status'), '部屋を保存しています…');
  try {
    const retainedAvatar = design.avatarMode === 'custom' && room.avatarVersion ? avatarImageUrl(room.id,room.avatarVersion) : '';
    const retainedInterior = clearInterior ? '' : generatedInterior(room);
    const interior = state.interiorPicture;
    await checkRoomArtwork(picture, interior, retainedAvatar, retainedInterior);
    if (room !== state.room || !$('#edit-dialog').open || interior !== state.interiorPicture ||
        picture !== (design.avatarMode === 'custom' ? state.picture : null) || editImageReads.size) {
      status($('#edit-status'),'選択が変わりました。現在の内容を確認して保存してください。'); return;
    }
    const updated = await write('save', { id: room.id, version: room.version, design, ...images, clearInterior, refresh: values.has('refresh') });
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
    setStored('localStorage', OWNER_STORAGE, null);
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
$('#open-prompt').addEventListener('click', () => openPlay(Boolean(play.avatar || play.interior)));
$('#prompt-write-tab').addEventListener('click', () => { play.target = null; syncPrompt(); selectPlayStep(false); });
$('#entry-slot').addEventListener('change', () => { state.preferredSlot = Number($('#entry-slot').value) || null; syncPrompt(); });
$('#copy-move-article').addEventListener('click', async () => {
  const field=$('#move-article-text');
  try {await copy(field.value); status($('#move-article-status'),'コピーしました。ChatGPTで送ると記事と画像を作成します。');}
  catch {field.focus();field.select();status($('#move-article-status'),'選択中のプロンプトをコピーしてください。');}
});
$('#prompt-import-tab').addEventListener('click', () => selectPlayStep(true));
$('#copy-room-only').addEventListener('click', async () => {
  const id = playNoteId();
  if (!id) return;
  play.target = { kind: 'interior' };
  const url = new URL(towerUrl); url.searchParams.set('creator', id); url.hash = 'prompt-import';
  const profile = play.id === id ? play.profile : null;
  const value = makeRoomPrompt({id, description:profile?.description, articles:profile?.articles,
    ideas:$('#prompt-ideas').value.trim(), returnUrl:url.href, roomOnly:true, reference:roomReference()});
  try { await copy(value); status($('#import-status'), '部屋だけのプロンプトをコピーしました。ChatGPTに部屋の希望と一緒に送れます。'); }
  catch { selectPlayStep(false); $('#prompt-text').value=value; $('#prompt-text').focus(); $('#prompt-text').select(); status($('#prompt-status'), '選択中の部屋用プロンプトをコピーしてください。'); }
});
$('#copy-avatar-only').addEventListener('click', async () => {
  const id = playNoteId();
  if (!id) return;
  play.target = { kind: 'avatar' };
  const value = makeRoomPrompt({ id, avatarOnly: true, reference: roomReference() });
  try { await copy(value); status($('#import-status'), 'アバターだけのプロンプトをコピーしました。完成済みの部屋はそのまま使えます。'); }
  catch { selectPlayStep(false); $('#prompt-text').value = value; $('#prompt-text').focus(); $('#prompt-text').select(); }
});
bindCardButtons($('#tower-card-actions'), [['企画主',hostNoteUrl],['参加ページ',towerUrl+'#prompt-play'],['INSIGHT',insightUrl]], $('#prompt-status'));
$('#prompt-upload-next').addEventListener('click', () => {
  selectPlayStep(true);
  $('#prompt-import-tab').focus();
});
$('#prompt-id').addEventListener('input', syncPrompt);
$('#prompt-id').addEventListener('change', () => {
  reconcileRoomCreator();
  updateEmptyRooms();
  syncPrompt();
  if (!$('#prompt-write').hidden) loadPromptProfile();
});
$('#prompt-ideas').addEventListener('input', syncPrompt);
const appLink = chatgptAppLink(navigator);
for (const id of ['chatgpt-app-launch','room-only-app','move-article-app']) {
  const launch = $(`#${id}`);
  launch.href = appLink.href;
  launch.textContent = appLink.label;
  if (appLink.newTab) { launch.target = '_blank'; launch.rel = 'noopener noreferrer'; }
}
$('#copy-play-prompt').addEventListener('click', async () => {
  if ($('#prompt-id').value.trim() && !playNoteId()) return;
  const creator = parseNoteId($('#prompt-id').value);
  if (creator) setStored('localStorage','tower-entry-id',creator);
  syncPrompt();
  const prompt = $('#prompt-text');
  try {
    await copy(prompt.value);
    status($('#prompt-status'), 'コピーしました。ChatGPTアプリかWeb版を開いて貼り付けてください。');
  } catch {
    prompt.focus();
    prompt.select();
    status($('#prompt-status'), '選択したプロンプトをコピーしてください。');
  }
});
$('#generated-avatar-mode').addEventListener('change', () => {
  if ($('#generated-avatar').files?.length) void readPlayPhoto('avatar');
  else if (play.avatar && Boolean(play.avatar.atlas) !== ($('#generated-avatar-mode').value === 'atlas')) {
    setPlayPhoto('avatar', null); status($('#import-status'), '形式が変わったため、アバターを選び直してください。', true);
  }
});
for (const kind of ['avatar', 'interior']) $(`#generated-${kind}`).addEventListener('change', () => void readPlayPhoto(kind));
$('#prompt-import').addEventListener('submit', submitPlay);
promptDialog.addEventListener('close', () => {
  const url = new URL(location.href);
  if (!['#prompt-play', '#prompt-import'].includes(url.hash)) return;
  url.hash = '';
  url.searchParams.delete('creator');
  url.searchParams.delete('slot');
  url.searchParams.delete('resume');
  history.replaceState(history.state, '', url);
});
window.addEventListener('hashchange', routePlay);
$('#entry-character').addEventListener('change', chooseEntryCharacter);
$('#clear-character').addEventListener('click', () => resetEntryCharacter(true));
$('#cutaway-fit').addEventListener('click', event => {
  const button = event.currentTarget;
  const viewport = $('#cutaway-building');
  const full = viewport.dataset.zoom !== 'fit';
  viewport.dataset.zoom = full ? 'fit' : 'detail';
  viewport.scrollLeft = 0;
  viewport.scrollTop = 0;
  button.setAttribute('aria-pressed', String(full));
  button.textContent = full ? '拡大' : '全景';
});
$('#cutaway-floor').addEventListener('change', event => {
  const target = event.currentTarget.value;
  const viewport = $('#cutaway-building');
  const row = Array.from(viewport.querySelectorAll('[data-level]')).find(item => item.dataset.level === target);
  if (!row) return;
  const stop = Number(row.dataset.stop);
  travel(stop, () => {
    if (viewport.dataset.zoom === 'fit') row.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    else viewport.scrollTop += row.getBoundingClientRect().top - viewport.getBoundingClientRect().top - viewport.clientTop;
    if (target === String(stop)) showFloor(stop, false);
  });
});
$('#story-visit').addEventListener('click', event => {
  if (!state.story?.room) return;
  event.preventDefault();
  state.storyVisit = state.story;
  const room = state.story.room;
  travel(floorFor(room.slot), () => void openPublished(room.id));
});
const stairs=$('#stair-dialog');
const stairPhoto=$('.stair-photo',stairs);
let stairFloor=1;
let stairAnimation=null;
function updateStairs() {
  const top=(state.catalog?.floors ?? 12)+2;
  $('#stair-title').textContent=`${floorLabel(stairFloor)} 階段`;
  $('#stair-up').disabled=stairFloor>=top;
  $('#stair-down').disabled=stairFloor<=-3;
  $('#stair-up').textContent=stairFloor<top ? `↑ ${floorLabel(stairFloor+1)}へ` : '最上階';
  $('#stair-down').textContent=stairFloor>-3 ? `↓ ${floorLabel(stairFloor-1)}へ` : '最下階';
}
function climb(direction) {
  const next=stairFloor+direction;
  if(next < -3 || next > (state.catalog?.floors ?? 12)+2) return;
  stairFloor=next;
  updateStairs();
  stairAnimation?.cancel();
  if (gameShell.motionAllowed()) {
    stairAnimation=stairPhoto.animate([
      {transform:'scale(1) translateY(0)',filter:'brightness(.82)'},
      {transform:`scale(1.07) translateY(${direction*1.4}%)`,filter:'brightness(1.13)',offset:.44},
      {transform:'scale(1) translateY(0)',filter:'brightness(1)'},
    ],{duration:420,easing:'ease-in-out'});
  }
}
$('#open-stairs').addEventListener('click',()=>{
  stairFloor=state.floor;
  updateStairs();
  showDialog('stair-dialog');
});
$('#stair-up').addEventListener('click',()=>climb(1));
$('#stair-down').addEventListener('click',()=>climb(-1));
$('#stair-exit').addEventListener('click',()=>{
  closeDialog('stair-dialog');
  travel.setFloor(stairFloor);
  const residentialFloors = state.catalog?.floors ?? 12;
  if (stairFloor >= 1 && stairFloor <= residentialFloors) {
    showFloor(stairFloor,true);
    return;
  }
  const space = stairFloor > residentialFloors
    ? (stairFloor === residentialFloors + 1 ? 'sky' : 'owner')
    : ['bicycle','parking','boiler','seismic'][-stairFloor];
  shared.open(space,false);
});
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
for (const id of ['avatar-file', 'interior-file']) {
  const field = $(`#${id}`);
  field.addEventListener('change', () => void chooseEditorPicture(field));
}
$('#edit-avatar-format').addEventListener('change', () => void chooseEditorPicture($('#avatar-file')));
$('#clear-interior-upload').addEventListener('click', () => {
  const field = $('#interior-file');
  field.value = '';
  void chooseEditorPicture(field);
  field.focus();
});
$('#keep-interior-field input').addEventListener('change', event => {
  showEditorImage($('#interior-preview'), state.interiorPicture?.source || (event.target.checked && state.room ? generatedInterior(state.room) : ''));
});
$('#theme-choices').addEventListener('change', () => {
  if (!state.interiorPicture) {
    $('#keep-interior-field input').checked = false;
    showEditorImage($('#interior-preview'), '');
  }
});
$('#leave-room').addEventListener('click', () => void leaveRoom());
for (const close of document.querySelectorAll('[data-close]')) {
  close.addEventListener('click', () => {
    if (close.dataset.close === 'room-dialog') return dismissRoom();
    closeDialog(close.dataset.close);
    if (close.dataset.close === 'key-dialog' && !$('#room-dialog').open && state.proofIntent) openPlay(true,state.proofIntent.noteId);
  });
}
$('#room-dialog').addEventListener('close', () => roomControls?.abort());
$('#room-dialog').addEventListener('cancel', (event) => { event.preventDefault(); dismissRoom(); });
window.addEventListener('popstate', route);
function refreshPublicDirectory(){
  if(!document.hidden && Date.now()-state.catalogCheckedAt>=18000)void loadDirectory();
}
window.addEventListener('focus',refreshPublicDirectory);
document.addEventListener('visibilitychange',refreshPublicDirectory);
window.setInterval(refreshPublicDirectory,20000);
if (typeof IntersectionObserver === 'function') {
  const motion = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      target.dataset.motion = isIntersecting ? 'visible' : 'paused';
    }
  });
  for (const region of [$('#cutaway-building'), $('.directory-grid')]) {
    region.dataset.motion = 'paused';
    motion.observe(region);
  }
}
const shared=bindSharedSpaces({
  getCatalog:()=>state.catalog,
  getOwner:()=>state.owner, getTraveler:currentTraveler, loadPlayer:()=>player.load(),
  loadOwner:()=>write('visit',{id:state.owner.id}),
  loadFacilities:()=>api('facilities'),
  setEngineer:(room,join)=>write('engineer',{id:room.id,version:room.version,join}),
  setManager:(room,join)=>write('manager',{id:room.id,version:room.version,join}),
  enterTower:()=>openPlay(false),
  saveVehicle:async(room,kind,file,facing,facingOnly=false)=>{
    const owner=state.owner;
    const picture = file ? await readPicture(file, 'vehicle') : null;
    const image = picture ? picture.source.split(',')[1] : null;
    const saved=await write('park',{id:room.id,version:room.version,space:kind,imageB64:image,clear:!file&&!facingOnly,facing,facingOnly,title:''});
    if(room.isOwner && room.id===saved.id)player.accept(owner,{...saved,isOwner:true});
    if(state.room?.id===room.id)state.room={...saved,isOwner:true};
    return saved;
  },
  visitRoom:id=>void openPublished(id),
  illustrate:bindSpotIllustration($('#spot-dialog')),
  travel,
});
renderDirectory();
renderBuilding();
void loadDirectory();
route();
routePlay();
