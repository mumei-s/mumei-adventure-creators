(() => {
  'use strict';

  const API = 'https://xxhaerjvrgmnadxjqetz.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
  const series = () => new URLSearchParams(location.search).get('series') === 'sengoku' ? 'sengoku' : 'adventure';
  const storageUrl = path => !path ? '' : (/^https?:/.test(path) ? path : `${API}/storage/v1/object/public/creator-images/${path}`);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let publicState = null;
  let loading = null;

  async function getState() {
    if (publicState) return publicState;
    if (loading) return loading;
    loading = fetch(`${API}/rest/v1/rpc/get_public_state`, {
      method: 'POST', headers, body: JSON.stringify({ p_series: series() }), cache: 'no-store'
    }).then(async response => {
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!response.ok || !data) throw new Error('公開リンク情報を取得できませんでした。');
      publicState = data;
      return data;
    }).finally(() => { loading = null; });
    return loading;
  }

  function card({ url, title, copy, eyebrow, image }) {
    if (!url) return '';
    const art = image
      ? `<div class="official-link-art-v22"><img src="${esc(storageUrl(image))}" alt="${esc(title)}"></div>`
      : `<div class="official-link-art-v22 fallback"><span>S</span></div>`;
    return `<a class="official-link-card-v22" href="${esc(url)}" target="_blank" rel="noopener">${art}<div class="official-link-copy-v22"><small>${esc(eyebrow)}</small><h3>${esc(title)}</h3><p>${esc(copy)}</p><b>開く <span>→</span></b></div></a>`;
  }

  async function restoreOfficialLinks() {
    const hero = document.querySelector('#app .hero');
    if (!hero) return;
    const page = hero.closest('.page');
    if (!page || page.querySelector('[data-official-links-v22]')) return;

    const data = await getState();
    if (!document.querySelector('#app .hero') || document.querySelector('[data-official-links-v22]')) return;
    const s = data.series || {};
    const opponents = (data.opponents || []).filter(x => x.enabled !== false).sort((a,b) => Number(a.slot||0) - Number(b.slot||0));
    const images = opponents.map(x => x.image_path).filter(Boolean);
    const links = [
      { url:s.profile_url, title:'無名S note', copy:'オーナーのnoteクリエイターページへ', eyebrow:'CREATOR PAGE', image:images[0] },
      { url:s.recruit_url, title:'参加方法・募集記事', copy:'名鑑への参加方法と企画内容を確認', eyebrow:'JOIN GUIDE', image:images[1] || images[0] },
      { url:s.magazine_url, title:'専用マガジン', copy:'名鑑に関連する記事をnoteで読む', eyebrow:'NOTE MAGAZINE', image:images[2] || images[0] }
    ].filter(x => x.url);
    if (!links.length) return;

    const section = document.createElement('section');
    section.className = 'section official-links-v22';
    section.dataset.officialLinksV22 = '1';
    section.innerHTML = `<div class="section-head"><div><p class="eyebrow">OFFICIAL LINKS</p><h2>無名S note 関連リンク</h2></div><span class="small">登録済みカードイラストを表示</span></div><div class="official-link-grid-v22">${links.map(card).join('')}</div>`;
    const stat = page.querySelector('.stat-band');
    if (stat) stat.after(section); else hero.after(section);
  }

  function restoreArticleLinkArt() {
    const modal = document.querySelector('#modal');
    if (!modal?.open) return;
    const source = modal.querySelector('.gallery-main img')?.src || modal.querySelector('.gallery-main > img')?.src || '';
    modal.querySelectorAll('.article-link:not([data-link-art-v22])').forEach((link, index) => {
      link.dataset.linkArtV22 = '1';
      const art = document.createElement('span');
      art.className = 'article-link-art-v22';
      if (source) art.innerHTML = `<img src="${esc(source)}" alt="">`;
      else art.innerHTML = `<span>${index + 1}</span>`;
      link.prepend(art);
    });
  }

  function run() {
    restoreOfficialLinks().catch(console.error);
    restoreArticleLinkArt();
  }

  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList:true, subtree:true });
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('hashchange', () => setTimeout(run, 0));
  run();
})();
