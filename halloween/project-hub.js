/* Project hub v2 — independent, responsive, swipe-native archival viewer. */
const root = document.querySelector('[data-project-hub]');
const registryURL = new URL('./project-registry.json', import.meta.url);
const registryBase = new URL('.', registryURL);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (selector, scope = root) => scope?.querySelector(selector);
const make = (tag, className, label) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (label !== undefined) el.textContent = label;
  return el;
};
const safeURL = (text, base = registryBase) => {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    const url = new URL(text, base);
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost') ? url.href : null;
  } catch { return null; }
};
function linkTo(url, label, className = 'pp-link') {
  const href = safeURL(url);
  if (!href) return null;
  const a = make('a', className, label);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}
async function loadJSON(url) {
  const result = await fetch(url, {cache: 'no-cache'});
  if (!result.ok) throw new Error('企画データを取得できませんでした。');
  return result.json();
}
function archiveEntries(archive, project) {
  const people = new Map((archive.creators || []).map(item => [item.id, item]));
  const edition = (archive.years || []).find(item => item.year === project.source?.year);
  const sourceBase = new URL('../halloween-exhibition/preview/', registryBase);
  return (edition?.entries || [])
    .filter(entry => entry?.submissionStatus === 'submitted' && entry.visible !== false)
    .map(entry => {
      const creator = people.get(entry.creatorId);
      const article = (entry.links || []).find(item => {
        const url = safeURL(item.url);
        return url && new URL(url).hostname === 'note.com' && /\/n\//.test(new URL(url).pathname);
      });
      if (!creator || !article) return null;
      return {
        id: entry.doorId || entry.creatorId,
        name: creator.name,
        title: entry.title || '参加作品',
        image: safeURL(entry.image, sourceBase),
        avatar: safeURL(creator.avatarSource || creator.avatar, sourceBase),
        articleUrl: article.url,
        profileUrl: safeURL(creator.profileURL)
      };
    }).filter(Boolean);
}
function manualEntries(project) {
  return (project.source?.entries || []).filter(entry => entry?.status === 'published' && entry?.creatorId && entry?.articleUrl)
    .map(entry => ({
      id: entry.id || entry.creatorId,
      name: entry.creatorName || entry.creatorId,
      title: entry.title || '参加作品',
      image: safeURL(entry.image),
      avatar: safeURL(entry.avatar),
      articleUrl: safeURL(entry.articleUrl),
      profileUrl: safeURL(entry.profileUrl)
    })).filter(entry => entry.articleUrl);
}
async function projectEntries(project) {
  if (project.source?.type === 'halloweenArchive') {
    return archiveEntries(await loadJSON(new URL(project.source.url, registryBase)), project);
  }
  return manualEntries(project);
}
function projectStatus(project) {
  return project.status === 'preparing' ? '記事公開準備中' : '過去企画・保存版';
}
if (root) initialize().catch(() => {
  const panel = $('#pp-panel');
  if (panel) panel.replaceChildren(make('p', 'pp-empty', '名鑑を読み込めませんでした。画面を更新してお試しください。'));
});
async function initialize() {
  const registry = await loadJSON(registryURL);
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.projects)) throw new Error('Invalid registry');
  const projects = registry.projects;
  const feature = projects.find(item => item.id === registry.featuredProjectId);
  const featureAction = $('#pp-feature-action');
  if (feature && featureAction) {
    featureAction.replaceChildren();
    const status = $('#pp-feature-status');
    if (status) status.textContent = projectStatus(feature);
    const play = feature.status === 'published' ? safeURL(feature.playUrl) : null;
    const article = feature.status === 'published' ? safeURL(feature.articleUrl) : null;
    if (play || article) {
      featureAction.append(linkTo(play || article, play ? 'この世界で遊ぶ ↗' : '記事と遊び方を見る ↗', 'pp-primary-link'));
      if (play && article) featureAction.append(linkTo(article, '企画記事を見る ↗', 'pp-text-link'));
    } else {
      featureAction.append(make('span','pp-coming','記事公開後にここから遊べるようになります。'));
    }
  }
  const details = $('#pp-directory'), tabs = $('#pp-tabs'), panel = $('#pp-panel');
  if (!details || !tabs || !panel) return;
  let selectedId = 'halloween-2026';
  let currentEntries = [];
  let currentIndex = 0;
  let rail = null;
  let counter = null;
  let dots = null;
  let carouselAuto = null;
  let autoOn = !prefersReducedMotion.matches;
  let onScreen = true;
  let selectVersion = 0;
  let ticking = false;
  let pointerMoved = false;
  const stopAuto = () => { if (carouselAuto !== null) clearInterval(carouselAuto); carouselAuto = null; };
  const autoAllowed = () => details.open && onScreen && !document.hidden && autoOn &&
    currentEntries.length > 1 && !(window.matchMedia('(hover: hover)').matches && panel.matches(':hover'));
  const restartAuto = () => {
    stopAuto();
    if (!autoAllowed()) return;
    carouselAuto = setInterval(() => {
      if (!autoAllowed()) {stopAuto();return;}
      jumpTo((currentIndex + 1) % currentEntries.length, true);
    }, 8000);
  };
  function jumpTo(next, smooth = false) {
    if (!rail || !currentEntries.length) return;
    currentIndex = (next + currentEntries.length) % currentEntries.length;
    refreshControls();
    const step = rail.clientWidth;
    rail.scrollTo({left: currentIndex * step, behavior: smooth && !prefersReducedMotion.matches ? 'smooth' : 'auto'});
  }
  function refreshControls() {
    if (counter) counter.textContent = (currentIndex + 1) + ' / ' + currentEntries.length;
    if (dots) {
      [...dots.children].forEach((dot, i) => {
        const selected = i === currentIndex;
        dot.setAttribute('aria-current', selected ? 'true' : 'false');
        dot.tabIndex = selected ? 0 : -1;
      });
    }
  }
  function buildCard(entry, project) {
    const card = make('article', 'pp-slide');
    card.setAttribute('aria-label', entry.name + 'の作品：' + entry.title);
    const media = make('a','pp-slide-media');
    media.href = entry.articleUrl;
    media.rel = 'noopener noreferrer';
    media.target = '_blank';
    media.setAttribute('aria-label', entry.name + 'の作品画像・記事を開く');
    const artwork = entry.image || entry.avatar;
    if (artwork) {
      const image = make('img','pp-slide-image');
      image.src = artwork;
      image.alt = entry.title + 'のサムネイル';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = 320;
      image.height = 175;
      image.onerror = () => {
        image.remove();
        media.append(make('span','pp-no-image',project.icon || '✦'));
      };
      media.append(image);
    } else media.append(make('span','pp-no-image',project.icon || '✦'));
    const copy = make('div','pp-slide-copy');
    const name = make('strong','pp-slide-name',entry.name);
    name.title = entry.name;
    const work = make('p','pp-slide-work',entry.title);
    work.title = entry.title;
    const actions = make('div','pp-slide-actions');
    if (entry.title.length > 35) {
      const expand = make('button','pp-expand','記事名を全文表示');
      expand.type = 'button';
      expand.setAttribute('aria-expanded','false');
      expand.addEventListener('click', () => {
        const expanded = card.classList.toggle('pp-title-expanded');
        expand.textContent = expanded ? '記事名をたたむ' : '記事名を全文表示';
        expand.setAttribute('aria-expanded', String(expanded));
      });
      actions.append(expand);
    }
    actions.append(linkTo(entry.articleUrl,'記事を読む ↗','pp-card-link'));
    copy.append(name,work,actions);
    card.append(media,copy);
    return card;
  }
  function buildRoster(project) {
    const roster = make('details','pp-roster');
    const summary = make('summary','', '参加者一覧（' + new Set(currentEntries.map(x => x.name)).size + '名・' + currentEntries.length + '作品）');
    roster.append(summary);
    const listArea = make('div','pp-roster-body');
    const search = make('input','pp-roster-search');
    search.type = 'search';
    search.placeholder = '名前・作品名から探す';
    search.setAttribute('aria-label','参加者を検索');
    const list = make('ol','pp-roster-list');
    listArea.append(search,list);
    roster.append(listArea);
    const rows = currentEntries.map((entry, i) => {
      const li = make('li','pp-roster-item');
      const choose = make('button','pp-roster-select');
      choose.type = 'button';
      choose.append(make('strong','',entry.name),make('span','',entry.title));
      choose.addEventListener('click', () => {
        roster.open = false;
        jumpTo(i,true);
        rail?.focus({preventScroll:true});
      });
      const article = linkTo(entry.articleUrl,'記事 ↗','pp-roster-article');
      li.append(choose);
      if (article) li.append(article);
      li.dataset.search = (entry.name + ' ' + entry.title).normalize('NFKC').toLocaleLowerCase('ja');
      list.append(li);
      return li;
    });
    search.addEventListener('input',() => {
      const q = search.value.normalize('NFKC').toLocaleLowerCase('ja').trim();
      let shown = 0;
      rows.forEach(li => {li.hidden = !li.dataset.search.includes(q);if(!li.hidden) shown++;});
      search.setAttribute('aria-label','参加者を検索、表示中 ' + shown + '件');
    });
    return roster;
  }
  function projectLinks(project) {
    const wrap = make('nav','pp-project-links');
    wrap.setAttribute('aria-label','企画について');
    const origin = linkTo(project.articleUrl,'企画・プロンプト記事 ↗','pp-text-link');
    const gallery = linkTo(project.galleryUrl,project.id === 'halloween-2026' ? 'Halloweenの元の展示を見る ↗' : '収録マガジンの全記事を見る ↗','pp-text-link');
    if (origin) wrap.append(origin);
    if (gallery) wrap.append(gallery);
    return wrap;
  }
  function renderEmpty(project) {
    panel.replaceChildren();
    panel.append(make('p','pp-empty',project.status === 'preparing' ?
      '企画記事の公開後、参加作品をここへ追加します。' :
      '確認できた参加作品は、まだ個別登録されていません。元の記事からプロンプトをお楽しみください。'));
    panel.append(projectLinks(project));
  }
  function renderCarousel(project) {
    panel.replaceChildren();
    const header = make('div','pp-compact-heading');
    header.append(make('span','pp-compact-count',project.icon + ' ' + project.title));
    counter = make('span','pp-count','1 / ' + currentEntries.length);
    header.append(counter);
    const view = make('div','pp-swipe');
    view.setAttribute('role','region');
    view.setAttribute('aria-roledescription','カルーセル');
    view.setAttribute('aria-label',project.title + 'の参加作品。左右にスワイプしてください。');
    view.tabIndex = 0;
    currentEntries.forEach(entry => view.append(buildCard(entry,project)));
    rail = view;
    rail.addEventListener('scroll',() => {
      if(ticking) return;
      ticking=true;
      requestAnimationFrame(() => {
        ticking=false;
        const width=rail.clientWidth;
        if (!width) return;
        const next=Math.min(currentEntries.length-1,Math.max(0,Math.round(rail.scrollLeft/width)));
        if (next !== currentIndex) {currentIndex=next;refreshControls();}
      });
    },{passive:true});
    rail.addEventListener('pointerdown',e => {if (e.pointerType==='touch') pointerMoved=true;},{passive:true});
    rail.addEventListener('pointerup',() => {if(pointerMoved){pointerMoved=false;restartAuto();}},{passive:true});
    rail.addEventListener('keydown', e => {
      if (e.key==='ArrowRight' || e.key==='ArrowLeft') {
        e.preventDefault();jumpTo(currentIndex+(e.key==='ArrowRight'?1:-1),true);restartAuto();
      }
    });
    const nav = make('div','pp-carousel-nav');
    const prev = make('button','pp-arrow','‹');
    prev.type='button';prev.setAttribute('aria-label','前の作品');
    const next = make('button','pp-arrow','›');
    next.type='button';next.setAttribute('aria-label','次の作品');
    dots = make('div','pp-page-dots');
    dots.setAttribute('role','group');dots.setAttribute('aria-label','作品を選ぶ');
    currentEntries.forEach((entry,i) => {
      const dot=make('button','pp-dot');
      dot.type='button';dot.setAttribute('aria-label',(i+1)+'件目：'+entry.name);
      dot.addEventListener('click',()=>{jumpTo(i,true);restartAuto();});
      dots.append(dot);
    });
    prev.addEventListener('click',()=>{jumpTo(currentIndex-1,true);restartAuto();});
    next.addEventListener('click',()=>{jumpTo(currentIndex+1,true);restartAuto();});
    const auto = make('button','pp-auto',autoOn ? '自動 ON' : '自動 OFF');
    auto.type='button';
    auto.setAttribute('aria-pressed',String(autoOn));
    auto.addEventListener('click',() => {
      autoOn=!autoOn;
      auto.textContent=autoOn?'自動 ON':'自動 OFF';
      auto.setAttribute('aria-pressed',String(autoOn));
      restartAuto();
    });
    nav.append(prev,dots,next,auto);
    const hint = make('span','pp-swipe-hint','⇆ 指で左右にスライド');
    panel.append(header,view,nav,hint,buildRoster(project),projectLinks(project));
    refreshControls();
    restartAuto();
  }
  async function selectProject(project) {
    if(!project) return;
    selectedId=project.id;
    const token=++selectVersion;
    stopAuto();rail=null;counter=null;dots=null;currentIndex=0;currentEntries=[];
    root.dataset.ppTheme=project.theme||'unwritten';
    tabs.querySelectorAll('button').forEach(button => {
      const active=button.dataset.project===project.id;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
    });
    panel.replaceChildren(make('p','pp-loading','参加作品を読み込み中…'));
    try {
      const records=await projectEntries(project);
      if(token!==selectVersion||!details.open)return;
      currentEntries=records;
      if(records.length)renderCarousel(project);else renderEmpty(project);
    } catch {
      if(token!==selectVersion) return;
      panel.replaceChildren(make('p','pp-empty','作品データを読み込めませんでした。元の展示からご覧ください。'),projectLinks(project));
    }
  }
  projects.forEach(project => {
    const button=make('button','pp-tab');
    button.type='button';
    button.dataset.project=project.id;
    button.setAttribute('role','tab');
    button.setAttribute('aria-controls','pp-panel');
    button.setAttribute('aria-selected','false');
    button.append(make('strong','',project.icon+' '+project.title),make('small','',projectStatus(project)));
    button.addEventListener('click',()=>selectProject(project));
    tabs.append(button);
  });
  tabs.addEventListener('keydown',e => {
    if(!['ArrowRight','ArrowLeft'].includes(e.key))return;
    const buttons=[...tabs.querySelectorAll('button')];
    const i=buttons.findIndex(button=>button.dataset.project===selectedId);
    const next=(i + (e.key==='ArrowRight'?1:buttons.length-1)) % buttons.length;
    e.preventDefault();buttons[next].focus();buttons[next].scrollIntoView({inline:'nearest',block:'nearest'});
    selectProject(projects.find(p=>p.id===buttons[next].dataset.project));
  });
  details.addEventListener('toggle',() => {
    if(!details.open){stopAuto();selectVersion++;return;}
    selectProject(projects.find(p=>p.id===selectedId)||projects[0]);
  });
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(changes=>{
      onScreen=changes.some(change=>change.isIntersecting);
      restartAuto();
    },{threshold:.05});
    observer.observe(panel);
  }
  document.addEventListener('visibilitychange',restartAuto);
  root.addEventListener('mouseleave',restartAuto);
  prefersReducedMotion.addEventListener?.('change',()=>{
    if(prefersReducedMotion.matches)autoOn=false;
    restartAuto();
  });
  if(details.open)selectProject(projects.find(p=>p.id===selectedId)||projects[0]);
}
