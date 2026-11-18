export const TOWER_API = 'https://xxhaerjvrgmnadxjqetz.supabase.co/functions/v1/creator-tower';
export const OWNER_STORAGE = 'atelier-tower-owner-v1';
export const WALK_DRAFT_STORAGE = 'atelier-tower-walk-draft-v1';

export function avatarImageUrl(id, version) {
  const url = new URL(TOWER_API);
  url.search = new URLSearchParams({ view: 'avatar', id, v: version });
  return url.href;
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

const walkerStorage = 'atelier-tower-traveler-v1';
export function rememberWalker(walker) {
  try { sessionStorage.setItem(walkerStorage, JSON.stringify(walker)); } catch {}
}

export function readTraveler() {
  try {
    const owner = JSON.parse(localStorage.getItem(OWNER_STORAGE));
    const walker = JSON.parse(sessionStorage.getItem(walkerStorage));
    if (owner?.id && walker?.id === owner.id && walker.source?.startsWith(TOWER_API + '?')) return walker;
    if (!owner?.id) {
      const draft = readWalkDraft();
      if (draft) return { source: draft.avatar.source, atlas: draft.avatar.atlas, custom:true, noteId:draft.noteId, name: draft.name || draft.noteId };
    }
  } catch {}
  return null;
}
