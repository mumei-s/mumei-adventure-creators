export const TOWER_API = 'https://xxhaerjvrgmnadxjqetz.supabase.co/functions/v1/creator-tower';
export const OWNER_STORAGE = 'atelier-tower-owner-v1';
export const WALK_DRAFT_STORAGE = 'atelier-tower-walk-draft-v1';

export function avatarImageUrl(id, version) {
  const url = new URL(TOWER_API);
  url.search = new URLSearchParams({ view: 'avatar', id, v: version });
  return url.href;
}

export function readWalkDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(WALK_DRAFT_STORAGE));
    if (draft && /^[a-z0-9_]{1,32}$/.test(draft.noteId) &&
        /^data:image\/(?:webp|png|gif|jpeg);base64,/.test(draft.avatar?.source)) return draft;
  } catch { /* The default walker is available when storage is disabled. */ }
  return null;
}
