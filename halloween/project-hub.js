/* Compact note-article directory (v5).
   Each listed work is one real note article link; no duplicated carousel or roster. */
const root = document.querySelector('[data-project-hub]');
const registryURL = new URL('./project-registry.json', import.meta.url);
const registryBase = new URL('.', registryURL);
const $ = (selector, base = root) => base?.querySelector(selector);
const el = (tag, className, value) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
};
function safeURL(value, base = registryBase) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost')) return url.href;
  } catch {}
  return null;
}
function externalLink(rawUrl, text, className = '') {
  const href = safeURL(rawUrl);
  if (!href) return null;
  const link = el('a', className, text);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}
async function readJSON(url) {
  const response = await fetch(url, {cache:'no-cache'});
  if (!response.ok) throw new Error('Archive HTTP ' + response.status);
  return response.json();
}
function halloweenEntries(archive, project) {
  const people = new Map((archive.creators || []).map(person => [person.id, person]));
  const year = (archive.years || []).find(item => item.year === project.source?.year);
  const assetBase = new URL('../halloween-exhibition/preview/',registryBase);
  return (year?.entries || []).filter(entry => entry?.submissionStatus === 'submitted' && entry.visible !== false)
    .map(entry => {
      const person = people.get(entry.creatorId);
      const article = (entry.links || []).find(link => {
        const href = safeURL(link.url);
        return href && new URL(href).hostname === 'note.com' &&
          /^\/[^/]+\/n\/n[a-f0-9]+\/?$/i.test(new URL(href).pathname);
      });
      if (!person || !article) return null;
      return {
        id:entry.doorId || entry.creatorId,
        author:person.name,
        title:entry.title || '参加記事',
        image:safeURL(entry.image,assetBase) || safeURL(person.avatarSource || person.avatar,assetBase),
        url:safeURL(article.url),
        kind:'article'
      };
    }).filter(item => item && item.url);
}
function manualEntries(project) {
  return (project.source?.entries || []).filter(entry =>
    entry?.status === 'published' && entry?.creatorId && safeURL(entry.articleUrl))
    .map(entry => ({
      id:entry.id || entry.creatorId,
      author:entry.creatorName || entry.creatorId,
      title:entry.title || '参加記事',
      image:safeURL(entry.image) || safeURL(entry.avatar),
      url:safeURL(entry.articleUrl),
      kind:entry.linkKind === 'magazine' ? 'magazine' : 'article'
    }));
}
async function entriesFor(project) {
  if (project.source?.type === 'halloweenArchive') {
    return halloweenEntries(await readJSON(new URL(project.source.url,registryBase)),project);
  }
  return manualEntries(project);
}
function renderProjectLinks(project) {
  const links = el('nav','pp-article-sources');
  links.setAttribute('aria-label','企画の元記事とマガジン');
  const original = externalLink(project.articleUrl,'企画・プロンプト記事 ↗');
  const magazine = externalLink(project.galleryUrl,
    project.id === 'halloween-2026' ? 'Halloween展示を見る ↗' : '全記事のマガジンを見る ↗');
  if (original) links.append(original);
  if (magazine) links.append(magazine);
  for (const item of project.relatedLinks || []) {
    const link = externalLink(item.url,(item.label || '関連ページ')+' ↗');
    if (link) links.append(link);
  }
  return links;
}
function renderArticleRow(entry, project) {
  const row = el('li','pp-article-row');
  const link = externalLink(entry.url,'','pp-article-link');
  if (!link) return row;
  link.setAttribute('aria-label',entry.author + '：' + entry.title +
    (entry.kind === 'magazine' ? '。収録マガジンを開きます' : '。元のnote記事を開きます'));
  const thumb = el('span','pp-article-thumb');
  if (entry.image) {
    const img = el('img');
    img.src = entry.image;
    img.alt = '';
    img.width = 100;
    img.height = 60;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => {img.remove();thumb.textContent=project.icon || '📖';};
    thumb.append(img);
  } else thumb.textContent = project.icon || '📖';
  thumb.setAttribute('aria-hidden','true');
  const copy = el('span','pp-article-info');
  const author = el('span','pp-article-author',entry.author);
  const title = el('strong','pp-article-title',entry.title);
  title.title = entry.title;
  copy.append(author,title);
  const destination = el('span','pp-article-dest',
    entry.kind === 'magazine' ? 'マガジン' : '記事');
  destination.setAttribute('aria-hidden','true');
  link.append(thumb,copy,destination);
  row.append(link);
  return row;
}

let tapShield = null;
function guardedTap(event, change, anchor) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.stopImmediatePropagation?.();
  tapShield?.remove();
  const shield = document.createElement('div');
  shield.className = 'pp-tap-shield';
  shield.setAttribute('aria-hidden','true');
  document.body.append(shield);
  tapShield = shield;
  requestAnimationFrame(() => {
    if (anchor?.isConnected) {
      const box = anchor.getBoundingClientRect();
      if (box.top < 8 || box.top > window.innerHeight - 90) {
        anchor.scrollIntoView({block:'start',behavior:'auto'});
      }
    }
    change();
    window.setTimeout(() => {
      if (tapShield === shield) tapShield = null;
      shield.remove();
    }, 430);
  });
}
function panelNavigation(actions) {
  const bar = el('div','pp-panel-return');
  const back = el('button','pp-return-button','← 戻る');
  const close = el('button','pp-return-button','− 閉じる');
  back.type = close.type = 'button';
  back.addEventListener('click',actions.back);
  close.addEventListener('click',actions.close);
  bar.append(back,close);
  return bar;
}
function renderArticles(project, records, panel, navigation) {
  panel.replaceChildren();
  const heading=el('div','pp-articles-heading');
  heading.append(el('strong','', '参加記事 '+records.length+'件'),
    el('span','',new Set(records.map(item=>item.author)).size+'名'));
  panel.append(heading);
  const list=el('ul','pp-articles-list');
  const rows=records.map(entry=>renderArticleRow(entry,project));
  rows.forEach(row=>list.append(row));
  panel.append(list);

  // Append four items at a time. Expanding never removes previously displayed rows.
  // Keep close/back as independent controls to prevent clicking through underlying links.
  const PAGE=4;
  let visibleCount=Math.min(PAGE,records.length);
  const normalized=records.map(record=>
    (record.author+' '+record.title).normalize('NFKC').toLocaleLowerCase('ja'));
  const actions=el('div','pp-article-actions');
  const more=el('button','pp-article-more');
  more.type='button';
  const searchToggle=el('button','pp-article-search-toggle','🔎 探す');
  searchToggle.type='button';
  searchToggle.setAttribute('aria-expanded','false');
  const search=el('input','pp-article-search');
  search.type='search';
  search.placeholder='参加者名・記事名';
  search.setAttribute('aria-label','参加者・記事を検索');
  search.hidden=true;
  const count=el('span','pp-article-search-count','');
  const draw=()=>{
    const query=search.value.normalize('NFKC').toLocaleLowerCase('ja').trim();
    let found=0;
    rows.forEach((row,index)=>{
      const visible=query?normalized[index].includes(query):index<visibleCount;
      row.hidden=!visible;
      if(visible) found++;
    });
    const remain=records.length-visibleCount;
    more.textContent=remain?'次の'+Math.min(PAGE,remain)+'件を見る':'すべて表示中';
    more.disabled=!remain;
    more.hidden=records.length<=PAGE;
    count.textContent=query?found+'件見つかりました':'';
  };
  more.addEventListener('click',event=>{
    guardedTap(event,()=>{
      visibleCount=Math.min(records.length,visibleCount+PAGE);
      draw();
    });
  });
  searchToggle.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    search.hidden=!search.hidden;
    searchToggle.setAttribute('aria-expanded',String(!search.hidden));
    if(!search.hidden)search.focus({preventScroll:true});
    else {search.value='';draw();}
  });
  search.addEventListener('input',draw);
  actions.append(more,searchToggle,search,count);
  panel.append(actions);
  panel.append(panelNavigation(navigation));

  const source=renderProjectLinks(project);
  if(source.childElementCount){
    const info=el('details','pp-article-source-details');
    info.append(el('summary','','企画元・マガジン'));
    info.append(source);
    panel.append(info);
  }
  draw();
}
function renderEmpty(project, panel, navigation) {
  panel.replaceChildren(el('p','pp-article-empty',
    project.status === 'preparing' ?
      '企画記事の公開後に参加作品を追加します。' :
      '確認済みの参加記事はまだありません。元の企画記事をご覧ください。'));
  const links=renderProjectLinks(project);
  if(links.childElementCount) panel.append(links);
  panel.append(panelNavigation(navigation));
}
async function initialize() {
  const registry = await readJSON(registryURL);
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.projects)) throw Error('Invalid registry');
  const projects = registry.projects;
  const feature = projects.find(project => project.id === registry.featuredProjectId);
  const featureAction = $('#pp-feature-action');
  if (featureAction && feature) {
    featureAction.replaceChildren();
    const status = $('#pp-feature-status');
    if (status) status.textContent = feature.status === 'published' ? '公開中' : '記事公開準備中';
    if (feature.status === 'published' && (safeURL(feature.playUrl) || safeURL(feature.articleUrl))) {
      const playLink = externalLink(feature.playUrl || feature.articleUrl,
        feature.playUrl ? 'プロンプトで遊ぶ ↗' : '記事と遊び方を見る ↗','pp-primary-link');
      if (playLink) featureAction.append(playLink);
      if (feature.playUrl && feature.articleUrl) {
        const info = externalLink(feature.articleUrl,'企画記事を見る ↗','pp-text-link');
        if (info) featureAction.append(info);
      }
    } else featureAction.append(el('span','pp-coming','記事公開後にここから遊べるようになります。'));
  }

  // Follow the Atelier's own day/night control; otherwise the OS preference.
  const osMode = window.matchMedia('(prefers-color-scheme: dark)');
  const syncAppearance = () => {
    const lights = document.body.dataset.lights;
    root.dataset.ppAppearance = lights === 'night' ? 'dark' :
      lights === 'day' ? 'light' : osMode.matches ? 'dark' : 'light';
  };
  syncAppearance();
  osMode.addEventListener?.('change',syncAppearance);
  new MutationObserver(syncAppearance).observe(document.body,
    {attributes:true,attributeFilter:['data-lights']});

  const directory = $('#pp-directory');
  const tabs = $('#pp-tabs');
  const panel = $('#pp-panel');
  if (!directory || !tabs || !panel) return;
  let selected = '';
  let requestID = 0;
  let activeCategory = '';
  const modeButtons=[...root.querySelectorAll('.pp-topic-switch [data-pp-category]')];
  const magazineDetails=$('#pp-operated-magazines');
  const magazineCloseButton=root.querySelector('[data-pp-close-magazines]');
  const close = () => {
    ++requestID;
    selected = '';
    panel.hidden = true;
    panel.replaceChildren();
    for (const button of tabs.querySelectorAll('.pp-tab')) {
      button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-pressed','false');
    }
  };
  async function open(project) {
    if (directory.hidden) return;
    if (selected === project.id) {close();return;}
    selected = project.id;
    const token = ++requestID;
    panel.hidden = false;
    panel.dataset.ppTheme = project.theme || 'unwritten';
    for (const button of tabs.querySelectorAll('.pp-tab')) {
      const active = button.dataset.project === project.id;
      button.setAttribute('aria-expanded',String(active));
      button.setAttribute('aria-pressed',String(active));
      if (active) button.after(panel);
    }
    const categoryButton=[...tabs.querySelectorAll('.pp-tab')].find(x=>x.dataset.project===project.id);
    const navigation={
      back:event=>guardedTap(event,()=>{
        close();categoryButton?.focus({preventScroll:true});
      },categoryButton),
      close:event=>guardedTap(event,()=>{
        setCategory('');
      },modeButtons.find(b=>b.dataset.ppCategory===activeCategory))
    };
    panel.replaceChildren(el('p','pp-article-empty','記事を読み込み中…'));
    try {
      const records = await entriesFor(project);
      if (token !== requestID || directory.hidden) return;
      if (!records.length) renderEmpty(project,panel,navigation);
      else renderArticles(project,records,panel,navigation);
    } catch {
      if (token !== requestID) return;
      panel.replaceChildren(el('p','pp-article-empty',
        '記事を読み込めませんでした。元の企画記事からご覧ください。'));
      const links = renderProjectLinks(project);
      if (links.childElementCount) panel.append(links);
      panel.append(panelNavigation(navigation));
    }
  }
  const archives = projects;
  for (const project of archives) {
    const button = el('button','pp-tab');
    button.type='button';
    button.dataset.project = project.id;
    button.dataset.ppCategory = project.category || 'project';
    button.hidden = true;
    button.dataset.ppTheme = project.theme || 'unwritten';
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-controls','pp-panel');
    const icon = el('span','pp-tab-icon',project.icon || '✦');
    icon.setAttribute('aria-hidden','true');
    const copy = el('span','pp-tab-copy');
    copy.append(el('strong','',project.title));
    const known = project.source?.type === 'manual' ? project.source.entries?.filter(x=>x.status==='published').length : null;
    copy.append(el('small','',project.status === 'preparing' ? '記事公開準備中' : known === null ? (project.subtitle || '記事一覧') :
      known ? known + '作品を掲載' : '元記事を見る'));
    const end = el('span','pp-tab-end','記事');
    end.setAttribute('aria-hidden','true');
    button.append(icon,copy,end);
    button.addEventListener('click',()=>open(project));
    tabs.append(button);
  }
  tabs.addEventListener('keydown',event => {
    if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key) ||
      !event.target.classList?.contains('pp-tab')) return;
    const buttons = [...tabs.querySelectorAll('.pp-tab')];
    const index = buttons.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length-1 :
      (index + (event.key === 'ArrowDown' ? 1 : buttons.length-1)) % buttons.length;
    buttons[next]?.focus({preventScroll:true});
  });
  function setCategory(category) {
    const next=category && category!==activeCategory?category:'';
    close();
    activeCategory=next;
    directory.hidden=!next;
    for(const button of modeButtons){
      const active=button.dataset.ppCategory===next;
      button.setAttribute('aria-expanded',String(active));
      button.setAttribute('aria-pressed',String(active));
    }
    for(const button of tabs.querySelectorAll('.pp-tab')){
      button.hidden=!next || button.dataset.ppCategory!==next;
    }
  }
  modeButtons.forEach(button=>button.addEventListener('click',event=>{
    event.stopPropagation();
    if(activeCategory===button.dataset.ppCategory){
      guardedTap(event,()=>setCategory(''),button);
    }else setCategory(button.dataset.ppCategory);
  }));
  root.querySelector('[data-pp-back="category"]')?.addEventListener('click',event=>{
    guardedTap(event,()=>{
      if(selected)close();
      else setCategory('');
    },modeButtons.find(b=>b.dataset.ppCategory===activeCategory));
  });
  root.querySelector('[data-pp-close="category"]')?.addEventListener('click',event=>{
    guardedTap(event,()=>setCategory(''),modeButtons.find(b=>b.dataset.ppCategory===activeCategory));
  });
  magazineCloseButton?.addEventListener('click',event=>{
    guardedTap(event,()=>{
      if(magazineDetails)magazineDetails.open=false;
    },magazineDetails?.querySelector('summary'));
  });
  root.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(magazineDetails?.open)magazineDetails.open=false;
    else if(selected)close();
    else if(activeCategory)setCategory('');
    else return;
    event.preventDefault();
    event.stopPropagation();
  });
  panel.hidden = true;
  // Construct links only to the actual note magazine (/m/), never to fixed article URLs.
  const managed = $('#pp-operated-magazines');
  const managedList = $('#pp-managed-list');
  let managedLoaded = false;
  function addMagazineCard(item) {
    const href = safeURL(item.url);
    if (!href) return null;
    const parsed = new URL(href);
    const pieces = parsed.pathname.split('/').filter(Boolean);
    if (parsed.hostname !== 'note.com' || pieces.length !== 3 ||
        pieces[1] !== 'm' || !pieces[2].startsWith('m')) return null;
    const link = externalLink(href,'','pp-managed-card');
    if (!link) return null;
    link.setAttribute('aria-label',item.title+' の共同マガジンを開く');
    const image = el('span','pp-managed-cover',item.cover ? '' : '📚');
    const cover = safeURL(item.cover);
    if (cover && new URL(cover).hostname === 'assets.st-note.com') {
      const img = el('img');
      img.src = cover;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 140;
      img.height = 80;
      img.onerror = () => {img.remove();image.textContent='📚';};
      image.append(img);
    }
    image.setAttribute('aria-hidden','true');
    const body = el('span','pp-managed-info');
    body.append(el('strong','',item.title), el('small','',item.subtitle || '共同マガジン'));
    const side = el('span','pp-managed-role',item.role === '管理' ? '管理者' : '運営');
    if (item.role === '管理') side.title = 'オーナーはランタン親父さん';
    link.append(image,body,side);
    return link;
  }
  managed?.addEventListener('toggle', () => {
    if (!managed.open || managedLoaded || !managedList) return;
    const magazines = Array.isArray(registry.operatedMagazines) ? registry.operatedMagazines : [];
    // Ensure the one managed by the user is always the final card.
    const ordered = [...magazines.filter(item=>item.role !== '管理'),
      ...magazines.filter(item=>item.role === '管理')];
    const cards = ordered.map(addMagazineCard).filter(Boolean);
    managedList.replaceChildren(...(cards.length ? cards :
      [el('p','pp-article-empty','表示できる共同マガジンがありません。')]));
    managedLoaded = true;
  });
}
if (root) initialize().catch(() => {
  const panel = $('#pp-panel');
  if (panel) panel.replaceChildren(el('p','pp-article-empty','企画一覧を読み込めませんでした。'));
});
