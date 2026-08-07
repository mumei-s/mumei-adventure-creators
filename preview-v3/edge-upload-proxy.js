(() => {
  'use strict';
  const originalFetch = window.fetch.bind(window);
  const PROJECT = 'https://xxhaerjvrgmnadxjqetz.supabase.co';
  const STORAGE_MARK = '/storage/v1/object/creator-images/';
  const OWNER_KEY = 'mumei-live-owner';
  const series = () => window.MUMEI_SERIES?.key || 'adventure';
  const creatorCred = () => {
    try { return JSON.parse(localStorage.getItem(`mumei-live-creator-${series()}`) || 'null'); }
    catch { return null; }
  };

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
    const at = url.indexOf(STORAGE_MARK);
    if (at < 0 || method !== 'POST') return originalFetch(input, init);

    const rawPath = decodeURIComponent(url.slice(at + STORAGE_MARK.length));
    const parts = rawPath.split('/');
    const kind = parts[0];
    const targetId = parts[1];
    if (!['creator', 'opponent'].includes(kind) || !targetId) {
      return new Response(JSON.stringify({ error: 'invalid_upload_path' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const headers = new Headers(init.headers || {});
    const blob = init.body;
    const cred = creatorCred();
    const ownerToken = sessionStorage.getItem(OWNER_KEY) || '';
    const uploadHeaders = {
      'Content-Type': headers.get('Content-Type') || blob?.type || 'image/webp',
      'X-Kind': kind,
      'X-Target-Id': targetId,
      'X-File-Path': rawPath,
      'X-Owner-Token': ownerToken,
      'X-Edit-Token': kind === 'creator' && cred?.id === targetId ? (cred.token || '') : ''
    };

    const response = await originalFetch(`${PROJECT}/functions/v1/catalog-image-upload`, {
      method: 'POST',
      headers: uploadHeaders,
      body: blob,
      cache: 'no-store'
    });
    if (!response.ok) return response;
    return new Response(JSON.stringify({ Key: rawPath }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
})();
