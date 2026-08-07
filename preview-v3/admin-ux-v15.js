(() => {
  'use strict';

  const SUPABASE_URL = 'https://xxhaerjvrgmnadxjqetz.supabase.co';
  const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const TOKEN_KEY = 'mumei-owner-token';
  const PERSIST_KEY = 'mumei-owner-token-persist-v1';
  const headers = { apikey: API_KEY, Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };
  let renderingImages = false;

  const series = () => new URLSearchParams(location.search).get('series') === 'sengoku' ? 'sengoku' : 'adventure';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storageUrl = path => !path ? '' : (/^https?:/.test(path) ? path : `${SUPABASE_URL}/storage/v1/object/public/creator-images/${path}`);

  function getToken() {
    const session = sessionStorage.getItem(TOKEN_KEY);
    if (session) return session;
    try {
      const saved = JSON.parse(localStorage.getItem(PERSIST_KEY) || 'null');
      if (saved?.token && Number(saved.expiresAt || 0) > Date.now()) return String(saved.token);
    } catch {}
    return '';
  }

  async function rpc(name, body = {}) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method:'POST', headers, body:JSON.stringify(body), cache:'no-store' });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(data?.message || data?.error || String(data || response.statusText));
    return data;
  }

  function injectStyle() {
    if (document.querySelector('#ownerUx15Style')) return;
    const style = document.createElement('style');
    style.id = 'ownerUx15Style';
    style.textContent = `
      .owner-sticky-nav{position:sticky;top:0;z-index:9999;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:10px 12px;margin:0 0 16px;background:rgba(7,9,19,.96);border:1px solid rgba(221,183,92,.32);border-radius:14px;backdrop-filter:blur(12px)}
      .owner-sticky-nav .owner-sticky-left,.owner-sticky-nav .owner-sticky-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .owner-sticky-nav b{color:#f0d17b}.owner-image-tab{border-color:rgba(221,183,92,.5)!important;color:#f0d17b!important}
      .owner-image-manager .lead{margin-bottom:16px}.owner-upload-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .owner-upload-card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px}
      .owner-upload-preview{aspect-ratio:5/7;border-radius:12px;overflow:hidden;background:#05070d;border:1px solid rgba(255,255,255,.08);display:grid;place-items:center}
      .owner-upload-preview img{width:100%;height:100%;object-fit:contain}.owner-upload-preview .placeholder{font-size:42px;color:#f0d17b}
      .owner-upload-file{display:block;padding:14px;border:1px dashed rgba(221,183,92,.55);border-radius:12px;background:rgba(221,183,92,.07)}
      .owner-upload-file span{display:block;font-weight:800;margin-bottom:8px;color:#f0d17b}.owner-upload-file input{width:100%;font-size:15px}
      .owner-upload-status{min-height:22px;font-size:13px;color:#bfc5d5}.owner-upload-status.ok{color:#7ee0a0}.owner-upload-status.err{color:#ff8f8f}
      .owner-modal-back{margin:0 0 14px}.owner-quick-image{font-weight:850}
      @media(max-width:760px){.owner-upload-grid{grid-template-columns:1fr}.owner-sticky-nav{top:6px}.owner-sticky-nav b{font-size:13px}.owner-sticky-nav .btn,.owner-sticky-nav button{padding:9px 10px;font-size:13px}}
    `;
    document.head.appendChild(style);
  }

  function generalUrl() {
    const u = new URL('./', document.baseURI);
    u.searchParams.set('series', series());
    u.searchParams.set('v', 'admin15');
    return u.href;
  }

  function adminUrl() {
    const u = new URL('./admin/', document.baseURI);
    u.searchParams.set('series', series());
    u.searchParams.set('v', 'admin15');
    u.hash = 'admin';
    return u.href;
  }

  function ensureStickyNav() {
    const root = document.querySelector('.owner-live');
    if (!root || root.querySelector('.owner-sticky-nav')) return;
    const nav = document.createElement('div');
    nav.className = 'owner-sticky-nav';
    nav.innerHTML = `<div class="owner-sticky-left"><b>オーナー管理</b><button class="btn" type="button" data-owner-home>管理トップ</button><button class="primary owner-quick-image" type="button" data-owner-open-images>画像アップロード</button></div><div class="owner-sticky-right"><a class="btn" href="${generalUrl()}">一般ページを見る</a></div>`;
    root.prepend(nav);
  }

  function ensureImageTab() {
    const tabs = document.querySelector('.owner-tabs');
    if (!tabs || tabs.querySelector('[data-owner-image-tab]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'owner-image-tab';
    button.dataset.ownerImageTab = '1';
    button.textContent = '画像アップロード';
    tabs.insertBefore(button, tabs.querySelector('[data-owner-tab="settings"]') || null);
  }

  function ensureModalBack() {
    const modal = document.querySelector('#ownerModal');
    const shell = modal?.querySelector('.owner-modal-shell');
    if (!shell || shell.querySelector('[data-owner-modal-back]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn owner-modal-back';
    button.dataset.ownerModalBack = '1';
    button.textContent = '← 管理トップへ戻る';
    shell.prepend(button);
  }

  function markImageTabActive() {
    document.querySelectorAll('.owner-tabs button').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-owner-image-tab]')?.classList.add('active');
  }

  function uploadCard(entity, kind) {
    const isOpponent = kind === 'opponent';
    const current = isOpponent ? entity.image_path : (entity.images || [])[0];
    const title = isOpponent ? entity.name : (entity.display_name || entity.note_id || '参加者');
    return `<article class="owner-upload-card"><div class="owner-upload-preview">${current?`<img src="${storageUrl(current)}" alt="${esc(title)}">`:'<div class="placeholder">S</div>'}</div><div><b>${esc(title)}</b><div class="small">${isOpponent?`${esc(entity.job||'ジョブ未設定')} · ${esc(entity.rarity||'')}`:`@${esc(entity.note_id||'')}`}</div></div><label class="owner-upload-file"><span>${isOpponent?'カード画像を選ぶ':'画像を1〜3枚選ぶ'}</span><input type="file" accept="image/jpeg,image/png,image/webp" ${isOpponent?'':'multiple'} data-owner-upload-file data-kind="${kind}" data-id="${entity.id}"></label><div class="owner-upload-status" data-upload-status="${entity.id}">画像を選択してください。</div><button class="primary" type="button" data-owner-upload-now data-kind="${kind}" data-id="${entity.id}">${current?'画像を差し替えて保存':'画像をアップロードして保存'}</button></article>`;
  }

  async function renderImageManager() {
    const content = document.querySelector('#ownerContent');
    const token = getToken();
    if (!content || !token || renderingImages) return;
    renderingImages = true;
    markImageTabActive();
    content.innerHTML = '<section class="panel owner-image-manager"><h3>画像アップロード</h3><p class="lead">ここが画像専用の管理場所です。見本カードは下から直接「画像を選ぶ → 保存」で登録できます。</p><div class="empty">共有DBから画像情報を読み込んでいます…</div></section>';
    try {
      const snap = await rpc('admin_snapshot', { p_owner_token:token, p_series:series() });
      const opponents = snap.opponents || [];
      const creators = snap.creators || [];
      content.innerHTML = `<section class="panel owner-image-manager"><p class="eyebrow">IMAGE MANAGER</p><h3>画像アップロード</h3><p class="lead"><b>見本カード3枚はここから直接登録できます。</b> 画像を選んで、そのカードの「アップロードして保存」を押してください。</p><h4 style="margin:22px 0 10px">見本カード</h4><div class="owner-upload-grid">${opponents.map(o=>uploadCard(o,'opponent')).join('')}</div>${creators.length?`<h4 style="margin:28px 0 10px">参加クリエイター画像</h4><div class="owner-upload-grid">${creators.map(c=>uploadCard(c,'creator')).join('')}</div>`:''}</section>`;
    } catch (error) {
      content.innerHTML = `<section class="panel owner-image-manager"><h3>画像アップロード</h3><p class="owner-login-error">${esc(error.message || error)}</p><button class="primary" type="button" data-owner-open-images>再読込</button></section>`;
    } finally {
      renderingImages = false;
    }
  }

  async function prepareImage(file) {
    if (!file) throw new Error('画像を選択してください。');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('JPEG・PNG・WebP画像を選択してください。');
    if (file.size > 15 * 1024 * 1024) throw new Error('画像は15MB以下にしてください。');
    try {
      const bitmap = await createImageBitmap(file);
      const max = 1800;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      bitmap.close?.();
      const blob = await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('画像変換に失敗しました。')),'image/webp',.9));
      return new File([blob], `card-${Date.now()}.webp`, { type:'image/webp' });
    } catch (error) {
      if (file.size > 8 * 1024 * 1024) throw error;
      return file;
    }
  }

  async function uploadOne(kind, id, file, position) {
    const token = getToken();
    if (!token) throw new Error('オーナーログインが必要です。');
    const prepared = await prepareImage(file);
    const form = new FormData();
    form.set('kind', kind === 'creator' ? 'creator' : 'opponent');
    form.set('entity_id', id);
    form.set('owner_token', token);
    form.set('position', String(position));
    form.set('file', prepared);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/catalog-image-upload`, { method:'POST', body:form });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || '画像アップロードに失敗しました。');
    return data;
  }

  document.addEventListener('change', event => {
    const input = event.target.closest?.('[data-owner-upload-file]');
    if (!input) return;
    const status = document.querySelector(`[data-upload-status="${CSS.escape(input.dataset.id)}"]`);
    if (status) {
      const files = [...input.files];
      status.className = 'owner-upload-status';
      status.textContent = files.length ? `${files.length}枚選択：${files.map(f=>f.name).join(' / ')}` : '画像を選択してください。';
    }
  }, true);

  document.addEventListener('click', async event => {
    if (event.target.closest?.('[data-owner-home]')) {
      document.querySelector('#ownerModal')?.close();
      const overview = document.querySelector('[data-owner-tab="overview"]');
      if (overview) overview.click(); else location.href = adminUrl();
      return;
    }
    if (event.target.closest?.('[data-owner-modal-back]')) {
      document.querySelector('#ownerModal')?.close();
      document.querySelector('[data-owner-tab="overview"]')?.click();
      return;
    }
    if (event.target.closest?.('[data-owner-open-images],[data-owner-image-tab]')) {
      event.preventDefault();
      await renderImageManager();
      return;
    }
    const uploadButton = event.target.closest?.('[data-owner-upload-now]');
    if (!uploadButton) return;
    const id = uploadButton.dataset.id;
    const kind = uploadButton.dataset.kind;
    const input = document.querySelector(`[data-owner-upload-file][data-id="${CSS.escape(id)}"]`);
    const status = document.querySelector(`[data-upload-status="${CSS.escape(id)}"]`);
    const files = [...(input?.files || [])].slice(0, kind === 'opponent' ? 1 : 3);
    if (!files.length) {
      if (status) { status.className='owner-upload-status err'; status.textContent='先に画像を選択してください。'; }
      return;
    }
    uploadButton.disabled = true;
    uploadButton.textContent = 'アップロード中…';
    if (status) { status.className='owner-upload-status'; status.textContent='画像を保存しています…'; }
    try {
      for (let i=0;i<files.length;i++) await uploadOne(kind,id,files[i],i);
      if (status) { status.className='owner-upload-status ok'; status.textContent='保存しました。'; }
      setTimeout(()=>renderImageManager(),500);
    } catch (error) {
      if (status) { status.className='owner-upload-status err'; status.textContent=error.message || String(error); }
      uploadButton.disabled = false;
      uploadButton.textContent = 'もう一度アップロード';
    }
  }, true);

  const observer = new MutationObserver(() => {
    injectStyle();
    ensureStickyNav();
    ensureImageTab();
    ensureModalBack();
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
  injectStyle();
  ensureStickyNav();
  ensureImageTab();
})();
