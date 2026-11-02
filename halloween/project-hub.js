/* Independent, lightweight project hub. Does not modify Atelier's rendering workflow. */
const root = document.querySelector('[data-project-hub]');
const registryURL = new URL('./project-registry.json', import.meta.url);
const registryBase = new URL('.', registryURL);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (selector, base = root) => base?.querySelector(selector);
const create = (tag, className, textValue) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textValue !== undefined) node.textContent = textValue;
  return node;
};
function safeURL(raw, base = registryBase) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const url = new URL(raw, base);
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost') ? url.href : null;
  } catch { return null; }
}
function attachLink(node, url, label) {
  const value = safeURL(url);
  if (!value) return false;
  node.href = value;
  node.textContent = label;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return true;
}
async function loadJSON(url) {
  const res = await fetch(url, {cache:'no-cache'});
  if (!res.ok) throw new Error('データを取得できませんでした。');
  return res.json();
}
function approvedArchiveEntries(payload, project) {
  const creators = new Map((payload.creators || []).map(person => [person.id, person]));
  const edition = (payload.years || []).find(group => group.year === project.source?.year);
  return (edition?.entries || []).filter(entry => entry?.submissionStatus === 'submitted' && entry.visible !== false)
    .map(entry => {
      const creator = creators.get(entry.creatorId);
      const article = (entry.links || []).find(link => {
        const url = safeURL(link.url);
        if (!url) return false;
        const parsed = new URL(url);
        return parsed.hostname === 'note.com' && parsed.pathname.includes('/n/');
      });
      if (!creator || !article) return null;
      const archiveBase = new URL('../halloween-exhibition/preview/', registryBase);
      return {
        id: entry.doorId || entry.creatorId,
        name: creator.name,
        title: entry.title || '参加作品',
        image: safeURL(entry.image, archiveBase),
        avatar: safeURL(creator.avatarSource || creator.avatar, archiveBase),
        articleUrl: article.url,
        profileUrl: safeURL(creator.profileURL)
      };
    }).filter(Boolean);
}
function approvedManualEntries(project) {
  return (project.source?.entries || []).filter(item => item?.status === 'published' && item?.creatorId && item?.articleUrl)
    .map(item => ({
      id: item.id || item.creatorId,
      name: item.creatorName || item.creatorId,
      title: item.title || '参加作品',
      image: safeURL(item.image),
      avatar: safeURL(item.avatar),
      articleUrl: safeURL(item.articleUrl),
      profileUrl: safeURL(item.profileUrl)
    })).filter(item => item.articleUrl);
}
async function getEntries(project) {
  if (project.source?.type === 'halloweenArchive') {
    const data = await loadJSON(new URL(project.source.url, registryBase));
    return approvedArchiveEntries(data, project);
  }
  return approvedManualEntries(project);
}
function displayStatus(project) {
  return project.status === 'archived' ? '過去企画・保存版' :
    project.status === 'published' ? '公開中' : '記事公開準備中';
}
if (root) initialize().catch(() => {
  const panel = $('#pp-panel');
  if (panel) panel.textContent = '企画一覧を読み込めませんでした。画面を再読み込みしてお試しください。';
});
async function initialize() {
  const registry = await loadJSON(registryURL);
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.projects)) throw new Error('Invalid project registry');
  const projects = registry.projects;
  const featured = projects.find(item => item.id === registry.featuredProjectId);
  const action = $('#pp-feature-action');
  if (action && featured) {
    action.replaceChildren();
    const label = displayStatus(featured);
    const play = safeURL(featured.playUrl);
    const article = safeURL(featured.articleUrl);
    if (featured.status === 'published' && (play || article)) {
      const link = create('a', 'pp-primary-link');
      attachLink(link, play || article, play ? 'このプロンプトで遊ぶ ↗' : '記事と遊び方を見る ↗');
      action.append(link);
      if (play && article) {
        const info = create('a', 'pp-text-link');
        attachLink(info, article, '企画記事を読む ↗');
        action.append(info);
      }
    } else {
      action.append(create('span', 'pp-coming', '記事が完成したら、ここから遊べるようになります。'));
    }
    const status = $('#pp-feature-status');
    if (status) status.textContent = label;
  }
  const details = $('#pp-directory');
  const tabs = $('#pp-tabs');
  const panel = $('#pp-panel');
  if (!details || !tabs || !panel) return;
  let currentId = '';
  let entries = [];
  let slideIndex = 0;
  let slideNodes = null;
  let timer = null;
  let requestId = 0;
  let manualPause = false;
  const autoEligible = () => details.open && entries.length > 1 && !manualPause &&
    !reducedMotion.matches && !document.hidden && !root.matches(':hover') &&
    !root.contains(document.activeElement);
  function halt() { if (timer !== null) { clearInterval(timer); timer = null; } }
  function restart() {
    halt();
    if (!autoEligible()) return;
    timer = setInterval(() => {
      if (!autoEligible()) { halt(); return; }
      slideIndex = (slideIndex + 1) % entries.length;
      drawSlide();
    }, 6500);
  }
  function emptyPanel(project, message) {
    panel.replaceChildren();
    panel.append(create('h3', 'pp-panel-title', project.title));
    panel.append(create('p', 'pp-panel-info', message));
    const gallery = safeURL(project.galleryUrl);
    if (gallery) {
      const link = create('a', 'pp-primary-link');
      attachLink(link, gallery, '既存の参加者展示を開く ↗');
      panel.append(link);
    }
  }
  function drawSlide() {
    if (!slideNodes || !entries.length) return;
    const entry = entries[slideIndex];
    slideNodes.name.textContent = entry.name;
    slideNodes.work.textContent = entry.title;
    slideNodes.count.textContent = `${slideIndex + 1} / ${entries.length} 作品`;
    slideNodes.image.replaceChildren();
    if (entry.image || entry.avatar) {
      const img = create('img', 'pp-slide-image');
      img.src = entry.image || entry.avatar;
      img.alt = `${entry.name}さんの参加作品`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => { img.remove(); slideNodes.image.append(create('span','pp-no-image','画像を表示できませんでした')); };
      slideNodes.image.append(img);
    } else slideNodes.image.append(create('span', 'pp-no-image', '作品の画像は記事でご覧ください'));
    attachLink(slideNodes.article, entry.articleUrl, '作品の記事を読む ↗');
    if (entry.profileUrl) {
      attachLink(slideNodes.profile, entry.profileUrl, 'プロフィール ↗');
      slideNodes.profile.hidden = false;
    } else slideNodes.profile.hidden = true;
    slideNodes.toggle.textContent = manualPause || reducedMotion.matches ? '自動送り OFF' : '自動送り ON';
    slideNodes.toggle.setAttribute('aria-pressed', String(!manualPause && !reducedMotion.matches));
  }
  function buildCarousel(project) {
    panel.replaceChildren();
    const heading = create('div','pp-panel-heading');
    heading.append(create('h3','pp-panel-title',project.title),create('p','pp-panel-info',project.description || ''));
    const count = create('span','pp-count','');
    heading.append(count);
    const card = create('article','pp-slide');
    const image = create('div','pp-slide-media');
    const content = create('div','pp-slide-copy');
    const name = create('strong','pp-slide-name');
    const work = create('p','pp-slide-work');
    const links = create('div','pp-slide-links');
    const article = create('a','pp-primary-link');
    const profile = create('a','pp-text-link');
    links.append(article,profile);
    content.append(name,work,links);
    card.append(image,content);
    const controls = create('div','pp-controls');
    const prev = create('button','pp-control','‹ 前の作品');
    prev.type = 'button';
    const toggle = create('button','pp-control','自動送り ON');
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed','true');
    const next = create('button','pp-control','次の作品 ›');
    next.type = 'button';
    controls.append(prev,toggle,next);
    panel.append(heading,card,controls);
    const gallery = safeURL(project.galleryUrl);
    if (gallery) {
      const full = create('a','pp-full-link');
      attachLink(full,gallery,'全作品・回転展示を大きく見る ↗');
      panel.append(full);
    }
    slideNodes = {name,work,count,image,article,profile,toggle};
    prev.addEventListener('click', () => { slideIndex=(slideIndex+entries.length-1)%entries.length;drawSlide();restart(); });
    next.addEventListener('click', () => { slideIndex=(slideIndex+1)%entries.length;drawSlide();restart(); });
    toggle.addEventListener('click', () => { manualPause = !manualPause;drawSlide();restart(); });
    let startX = null;
    card.addEventListener('touchstart', event => { startX = event.touches[0]?.clientX ?? null; }, {passive:true});
    card.addEventListener('touchend', event => {
      if (startX === null) return;
      const dx = (event.changedTouches[0]?.clientX ?? startX) - startX;
      startX = null;
      if (Math.abs(dx) < 55) return;
      slideIndex = (slideIndex + (dx < 0 ? 1 : entries.length - 1)) % entries.length;
      drawSlide();restart();
    }, {passive:true});
    drawSlide();
    restart();
  }
  async function selectProject(project) {
    if (!project) return;
    const token = ++requestId;
    currentId = project.id;
    slideIndex = 0;
    slideNodes = null;
    manualPause = false;
    entries = [];
    halt();
    for (const button of tabs.querySelectorAll('button')) {
      const chosen = button.dataset.project === project.id;
      button.setAttribute('aria-selected',String(chosen));
      button.tabIndex = chosen ? 0 : -1;
    }
    panel.replaceChildren(create('p','pp-panel-info','参加作品を確認しています…'));
    try {
      const records = await getEntries(project);
      if (token !== requestId || !details.open) return;
      entries = records;
      if (!entries.length) {
        emptyPanel(project, project.status === 'preparing' ?
          '公開された参加作品はまだ登録されていません。記事公開後、確認できた作品から追加します。' :
          '現在掲載できる作品がありません。既存の展示をご覧ください。');
      } else buildCarousel(project);
    } catch {
      if (token !== requestId) return;
      emptyPanel(project,'作品一覧の読み込みに失敗しました。既存の展示から直接ご覧いただけます。');
    }
  }
  projects.forEach(project => {
    const button = create('button','pp-tab');
    button.type = 'button';
    button.dataset.project = project.id;
    button.setAttribute('role','tab');
    button.setAttribute('aria-controls','pp-panel');
    button.setAttribute('aria-selected','false');
    button.append(create('strong','',project.title),create('small','',displayStatus(project)));
    button.addEventListener('click',()=>selectProject(project));
    tabs.append(button);
  });
  details.addEventListener('toggle', () => {
    if (!details.open) { halt(); requestId++; return; }
    selectProject(projects.find(item=>item.id === (currentId || 'halloween-2026')) || projects[0]);
  });
  root.addEventListener('mouseleave',restart);
  root.addEventListener('focusout',() => { requestAnimationFrame(restart); });
  document.addEventListener('visibilitychange',restart);
  reducedMotion.addEventListener?.('change',() => { drawSlide();restart(); });
  if (details.open) selectProject(projects.find(item => item.id === 'halloween-2026') || projects[0]);
}
