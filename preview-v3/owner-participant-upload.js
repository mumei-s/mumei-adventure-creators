(() => {
  'use strict';

  const SUPABASE_URL = 'https://xxhaerjvrgmnadxjqetz.supabase.co';
  const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const OWNER_SESSION = 'mumei-owner-token';
  const filesByKey = new Map();
  const headers = { apikey: API_KEY, Authorization: `Bearer ${API_KEY}`, 'Content-Type':'application/json' };

  async function rpc(name, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method:'POST', headers, body:JSON.stringify(body), cache:'no-store' });
    const text = await r.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!r.ok) throw new Error(data?.message || data?.error || String(data || r.status));
    return data;
  }

  function remember(input) {
    const key = input.dataset.upload;
    if (!key) return;
    const current = filesByKey.get(key) || [];
    filesByKey.set(key, [...current, ...input.files].slice(0,3));
  }

  function mirror(target) {
    const rm = target.closest('[data-remove]');
    if (rm) {
      const a = filesByKey.get(rm.dataset.upid) || [];
      a.splice(Number(rm.dataset.remove),1);
      filesByKey.set(rm.dataset.upid,a);
      return;
    }
    const mv = target.closest('[data-move]');
    if (mv) {
      const a = filesByKey.get(mv.dataset.upid) || [];
      const i = Number(mv.dataset.index), j = mv.dataset.move === 'up' ? i-1 : i+1;
      if (j >= 0 && j < a.length) [a[i],a[j]] = [a[j],a[i]];
      filesByKey.set(mv.dataset.upid,a);
    }
  }

  async function upload(id, ownerToken, files) {
    for (let i=0; i<files.length; i++) {
      const fd = new FormData();
      fd.set('kind','creator');
      fd.set('entity_id',id);
      fd.set('owner_token',ownerToken);
      fd.set('position',String(i));
      fd.set('file',files[i]);
      const r = await fetch(`${SUPABASE_URL}/functions/v1/catalog-image-upload`, { method:'POST', body:fd });
      if (!r.ok) {
        let d={}; try { d=await r.json(); } catch {}
        throw new Error(d.error || `画像アップロード失敗 (${r.status})`);
      }
    }
  }

  document.addEventListener('change', e => {
    if (e.target.matches?.('[data-upload]')) remember(e.target);
  }, true);

  document.addEventListener('click', e => mirror(e.target), true);

  document.addEventListener('submit', async e => {
    const form = e.target;
    if (form?.id !== 'editPForm') return;
    const id = form.dataset.id;
    const key = `ep-${id}`;
    const files = filesByKey.get(key) || [];
    if (!files.length) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    try {
      const ownerToken = sessionStorage.getItem(OWNER_SESSION) || '';
      if (!ownerToken) throw new Error('オーナーキーを入力し直してください。');
      const f = new FormData(form);
      await rpc('admin_update_creator', {
        p_owner_token: ownerToken,
        p_id: id,
        p_display_name: String(f.get('displayName') || ''),
        p_intro: String(f.get('intro') || ''),
        p_job: String(f.get('job') || ''),
        p_rarity: String(f.get('rarity') || 'Normal'),
        p_dialogue_pack: String(f.get('dialoguePack') || 'gentle'),
        p_article1_url: String(f.get('article1Url') || ''),
        p_article2_url: String(f.get('article2Url') || '')
      });
      await upload(id, ownerToken, files);
      const u = new URL(location.href);
      u.searchParams.set('v','db2');
      u.hash = 'admin';
      location.href = u.href;
    } catch (err) {
      console.error(err);
      alert(`処理できませんでした：${err?.message || err}`);
    }
  }, true);
})();
