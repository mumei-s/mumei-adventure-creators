import { hostPortrait } from '../halloween-exhibition/preview/diorama-city/host-avatar.js?v=202611181820';
import { mediaUrl, TOWER_API } from './public-directory.js?v=20261119-review';
export { TOWER_API };
export const OWNER_STORAGE = 'atelier-tower-owner-v1';
export const WALK_DRAFT_STORAGE = 'atelier-tower-walk-draft-v1';

export function avatarImageUrl(id, version) {
  return mediaUrl(id,'avatar',version);
}

export function readWalkDraft() {
  const candidates = [];
  for (const storage of ['sessionStorage', 'localStorage']) {
    try {
      const draft = JSON.parse(window[storage].getItem(WALK_DRAFT_STORAGE));
      if (draft && /^[a-z0-9_]{1,32}$/.test(draft.noteId) &&
          /^data:image\/(?:webp|png|gif|jpeg);base64,/.test(draft.avatar?.source)) candidates.push(draft);
    } catch { /* Another available store can still retain the images. */ }
  }
  const updated = draft => Number.isFinite(draft.savedAt) ? draft.savedAt : 0;
  return candidates.sort((a, b) => updated(b) - updated(a))[0] ?? null;
}

export function saveWalkDraft(draft) {
  let saved = false;
  const record = { ...draft, savedAt: Math.max(Date.now(), (readWalkDraft()?.savedAt || 0) + 1) };
  for (const storage of ['sessionStorage', 'localStorage']) {
    try { window[storage].setItem(WALK_DRAFT_STORAGE, JSON.stringify(record)); saved = true; } catch {}
  }
  return saved;
}

export function clearWalkDraft(noteId) {
  for (const storage of ['sessionStorage', 'localStorage']) {
    try {
      if (JSON.parse(window[storage].getItem(WALK_DRAFT_STORAGE))?.noteId === noteId) {
        window[storage].removeItem(WALK_DRAFT_STORAGE);
      }
    } catch {}
  }
}

export const visitor = Object.freeze({
  name: 'ビジター', source: new URL('./assets/resident.webp', import.meta.url).href, visitor: true,
});

export function draftTraveler(draft) {
  return draft && {source:draft.avatar.source, atlas:draft.avatar.atlas, custom:true,
    noteId:draft.noteId, name:draft.name || draft.noteId};
}

export function hasRoomKey(owner) {
  return Boolean(owner && /^[a-f0-9]{64}$/.test(owner.key) && avatarImageUrl(owner.id,1));
}

export function residentTraveler(room) {
  if (room?.isOwner !== true) return null;
  const custom = room.design.avatarMode === 'custom' && Boolean(room.avatarVersion);
  const profile = room.design.avatarMode === 'profile' && Boolean(room.profile.photo);
  const host = room.noteId === 'ss_yr' && room.design.avatarMode === 'resident';
  return {id:room.id, noteId:room.noteId, host, name:room.design.avatarName || room.profile.name || room.noteId,
    custom, profile, atlas:custom && room.design.world?.atlas === true,
    source:custom ? avatarImageUrl(room.id,room.avatarVersion) : profile ? room.profile.photo : host ? hostPortrait : visitor.source};
}

async function visitOwnRoom(owner) {
  const response = await fetch(TOWER_API, {method:'POST', credentials:'omit', cache:'no-store',
    headers:{'Content-Type':'application/json', 'X-Tower-Key':owner.key},
    body:JSON.stringify({action:'visit', id:owner.id}), signal:AbortSignal.timeout(12000)});
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) throw new Error('部屋の鍵を確認できませんでした。');
  return response.json();
}

// Only a response to a keyed request can authorize a registered player on this page.
export function createPlayerSession(getOwner, visit = visitOwnRoom) {
  let entry;
  function accept(owner, room) {
    if (getOwner() !== owner || !hasRoomKey(owner) || room?.isOwner !== true || room.id !== owner.id ||
        !room.noteId || (owner.noteId && owner.noteId !== room.noteId)) return null;
    entry = {owner, room};
    return room;
  }
  return {
    accept,
    get room() { return entry?.owner === getOwner() ? entry?.room ?? null : null; },
    async load(fresh = false) {
      const owner = getOwner();
      if (!hasRoomKey(owner)) return null;
      if (entry?.owner === owner && (entry.pending || (!fresh && entry.room))) return entry.pending || entry.room;
      const request = {owner};
      entry = request;
      request.pending = Promise.resolve().then(()=>visit(owner)).then(room=>entry===request ? accept(owner,room) : null);
      try { return await request.pending; }
      finally { if (entry===request) entry=null; }
    },
  };
}
