(() => {
  const scriptUrl = document.currentScript?.src || location.href;
  const ROOT = new URL('./', scriptUrl);
  const requested = window.__MUMEI_SERIES__ || new URLSearchParams(location.search).get('series');
  const series = requested === 'sengoku' ? 'sengoku' : 'adventure';
  const configs = {
    adventure: {
      title: '無名S note 冒険クリエイター名鑑',
      main: '冒険クリエイター名鑑',
      hashtag: '#無名S名鑑',
      started: '2026年5月始動',
      description: 'IDだけで参加でき、記事認証でおすすめ記事枠が増える冒険クリエイター名鑑。'
    },
    sengoku: {
      title: '無名S note 戦国カード名鑑',
      main: '戦国カード名鑑',
      hashtag: '#無名S戦国クリエイター名鑑',
      started: '公開準備中',
      description: '同じ参加・記事認証・対戦・ランキング機能を使える戦国カード名鑑。'
    }
  };
  const config = configs[series];

  document.documentElement.dataset.series = series;
  window.MUMEI_SERIES = { key: series, config, root: ROOT.href };

  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  const stateKey = `mumei-v3-state-${series}`;
  const sessionKey = `mumei-v3-session-${series}`;
  const guestKey = `mumei-v3-guest-${series}`;
  const mapKey = key => key === 'mumei-v3-state' ? stateKey : key === 'mumei-v3-session' ? sessionKey : key === 'mumei-v3-guest' ? guestKey : key;

  const legacy = nativeGet.call(localStorage, 'mumei-v3-state');
  if (series === 'adventure' && legacy && !nativeGet.call(localStorage, stateKey)) nativeSet.call(localStorage, stateKey, legacy);

  const baseSettings = target => target === 'sengoku' ? {
    title: '無名S note 戦国カード名鑑',
    hashtag: '#無名S戦国クリエイター名鑑',
    started: '公開準備中',
    announcement: '戦国カードを登録して参加。参加記事が認証されると、おすすめ記事枠が1つから2つへ増えます。',
    rankDailyLimit: 10,
    winPercent: 45,
    drawPercent: 10,
    profileUrl: 'https://note.com/ss_yr/portal',
    recruitUrl: 'https://note.com/ss_yr/portal',
    magazineUrl: 'https://note.com/ss_yr/portal'
  } : {
    title: '無名S note 冒険クリエイター名鑑',
    hashtag: '#無名S名鑑',
    started: '2026年5月始動',
    announcement: 'IDだけで参加できます。参加記事が認証されると、おすすめ記事枠が1つから2つへ増えます。',
    rankDailyLimit: 10,
    winPercent: 45,
    drawPercent: 10,
    profileUrl: 'https://note.com/ss_yr/portal',
    recruitUrl: 'https://note.com/ss_yr/n/nf34d092b4032',
    magazineUrl: 'https://note.com/ss_yr/m/mf8a55ef40b9d'
  };

  const seed = target => ({
    version: 3,
    settings: baseSettings(target),
    opponents: target === 'sengoku' ? [
      { id: 's1', name: '無名S note 戦国①', job: '武将職未設定', rarity: 'SR', dialoguePack: 'cool', images: [], version: 1, enabled: true },
      { id: 's2', name: '無名S note 戦国②', job: '武将職未設定', rarity: 'Dream SSR', dialoguePack: 'mystical', images: [], version: 1, enabled: true },
      { id: 's3', name: '無名S note 戦国③', job: '武将職未設定', rarity: 'Legend SSR', dialoguePack: 'brave', images: [], version: 1, enabled: true }
    ] : [
      { id: 's1', name: '無名S note①', job: '道具屋（アイテムマイスター）', rarity: 'SR', dialoguePack: 'gentle', images: [], version: 1, enabled: true },
      { id: 's2', name: '無名S note②', job: '共創魔導士', rarity: 'Dream SSR', dialoguePack: 'mystical', images: [], version: 1, enabled: true },
      { id: 's3', name: '無名S note③', job: '狂戦士（バーサーカー）', rarity: 'Legend SSR', dialoguePack: 'brave', images: [], version: 1, enabled: true }
    ],
    participants: target === 'sengoku' ? [
      { id: 'demo-sengoku-a', noteId: 'sengoku_demo_a', displayName: '戦国見本A', status: 'approved', job: '軍師', rarity: 'Rare', dialoguePack: 'cool', images: [], intro: '知略で戦局を読み解く戦国カードの見本。', article1Url: '', article2Url: '', participationArticleUrl: '', articleStatus: 'none', createdAt: '2026-08-07T00:00:00Z', isDemo: true },
      { id: 'demo-sengoku-b', noteId: 'sengoku_demo_b', displayName: '戦国見本B', status: 'approved', job: '城主', rarity: 'SR', dialoguePack: 'mystical', images: [], intro: '人をまとめ、領地を育てる戦国カードの見本。', article1Url: '', article2Url: '', participationArticleUrl: '', articleStatus: 'none', createdAt: '2026-08-07T00:01:00Z', isDemo: true },
      { id: 'demo-sengoku-c', noteId: 'sengoku_demo_c', displayName: '戦国見本C', status: 'approved', job: '豪傑', rarity: 'Legend SSR', dialoguePack: 'brave', images: [], intro: '圧倒的な行動力で進む戦国カードの見本。', article1Url: '', article2Url: '', participationArticleUrl: '', articleStatus: 'none', createdAt: '2026-08-07T00:02:00Z', isDemo: true }
    ] : [
      { id: 'demo-a', noteId: 'demo_creator_a', displayName: '見本クリエイターA', status: 'approved', job: '言霊士', rarity: 'Rare', dialoguePack: 'gentle', images: [], intro: '言葉を通して新しい気づきを届ける見本クリエイター。', article1Url: '', article2Url: '', participationArticleUrl: '', articleStatus: 'none', createdAt: '2026-08-01T01:00:00Z', isDemo: true },
      { id: 'demo-b', noteId: 'demo_creator_b', displayName: '見本クリエイターB', status: 'approved', job: '幻創絵師', rarity: 'SR', dialoguePack: 'mystical', images: [], intro: 'イラストとAI創作を楽しむ見本クリエイター。', article1Url: '', article2Url: '', participationArticleUrl: '', articleStatus: 'none', createdAt: '2026-08-02T01:00:00Z', isDemo: true },
      { id: 'demo-c', noteId: 'demo_creator_c', displayName: '見本クリエイターC', status: 'approved', job: '暮らしの記録士', rarity: 'Normal', dialoguePack: 'gentle', images: [], intro: '日々の記録を丁寧に残す見本クリエイター。', article1Url: '', article2Url: '', participationArticleUrl: '', articleStatus: 'none', createdAt: '2026-08-03T01:00:00Z', isDemo: true }
    ],
    battles: [],
    audit: []
  });

  if (series === 'sengoku' && !nativeGet.call(localStorage, stateKey)) nativeSet.call(localStorage, stateKey, JSON.stringify(seed('sengoku')));

  Storage.prototype.getItem = function (key) { return nativeGet.call(this, this === localStorage ? mapKey(key) : key); };
  Storage.prototype.setItem = function (key, value) { return nativeSet.call(this, this === localStorage ? mapKey(key) : key, value); };
  Storage.prototype.removeItem = function (key) { return nativeRemove.call(this, this === localStorage ? mapKey(key) : key); };

  const cloneFor = target => {
    const raw = nativeGet.call(localStorage, stateKey);
    const data = raw ? JSON.parse(raw) : seed(target);
    data.settings = { ...data.settings, ...baseSettings(target) };
    data.battles = [];
    data.audit = [{ id: crypto.randomUUID(), action: '名鑑シリーズから複製', at: new Date().toISOString() }];
    data.opponents = seed(target).opponents;
    data.participants = seed(target).participants;
    return data;
  };

  const switchHref = target => new URL(`${target}/`, ROOT).href;
  let decorating = false;

  function decorate() {
    if (decorating) return;
    decorating = true;
    try {
      document.title = config.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', config.description);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', config.title);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', config.description);

      const brandSmall = document.querySelector('.brand small');
      if (brandSmall && brandSmall.textContent !== config.main) brandSmall.textContent = config.main;

      const topbar = document.querySelector('.topbar');
      if (topbar && !topbar.querySelector('.series-switch')) {
        const node = document.createElement('div');
        node.className = 'series-switch';
        node.innerHTML = `<a class="${series === 'adventure' ? 'active' : ''}" href="${switchHref('adventure')}">冒険</a><a class="${series === 'sengoku' ? 'active' : ''}" href="${switchHref('sengoku')}">戦国</a>`;
        topbar.querySelector('.brand')?.after(node);
      }

      const hero = document.querySelector('.hero');
      const first = hero?.firstElementChild;
      if (first && !first.querySelector('.series-title')) {
        const block = document.createElement('div');
        block.className = 'series-title';
        block.innerHTML = `<span>無名S note</span><h1>${config.main}</h1><p>${config.hashtag}<i></i>${config.started}</p><div class="series-title-links"><a class="${series === 'adventure' ? 'active' : ''}" href="${switchHref('adventure')}">冒険名鑑</a><a class="${series === 'sengoku' ? 'active' : ''}" href="${switchHref('sengoku')}">戦国名鑑</a></div>`;
        first.prepend(block);
        const oldTitle = [...first.querySelectorAll(':scope > h1')].find(node => !node.closest('.series-title'));
        oldTitle?.classList.add('hero-tagline');
      }

      if (series === 'sengoku') {
        document.querySelectorAll('.page-title h1,.section-head h2').forEach(node => {
          const text = node.textContent.trim();
          if (text === '冒険クリエイター名鑑') node.textContent = '戦国カード名鑑';
          if (text === '冒険カード対戦') node.textContent = '戦国カード対戦';
        });
      }

      const adminGrid = document.querySelector('.admin-grid');
      const adminPage = adminGrid?.closest('.page');
      if (adminPage && !adminPage.querySelector('.series-admin-panel')) {
        const panel = document.createElement('section');
        panel.className = 'panel gold series-admin-panel';
        const target = series === 'adventure' ? 'sengoku' : 'adventure';
        panel.innerHTML = `<div><p class="eyebrow">DIRECTORY SERIES</p><h3>名鑑シリーズ管理</h3><p class="lead">現在は「${config.main}」を編集中です。参加者・画像・対戦・ランキングは名鑑ごとに分かれます。</p></div><div class="actions"><a class="btn" href="${switchHref(target)}">${target === 'sengoku' ? '戦国版' : '冒険版'}へ切替</a><button class="primary" type="button" data-series-clone="${target}">現在の設定から${target === 'sengoku' ? '戦国版' : '冒険版'}を作る</button></div>`;
        adminPage.querySelector('.page-title')?.after(panel);
      }
    } finally {
      decorating = false;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-series-clone]');
    if (!button) return;
    const target = button.dataset.seriesClone;
    const targetKey = `mumei-v3-state-${target}`;
    if (nativeGet.call(localStorage, targetKey) && !confirm('切替先の名鑑データを現在の設定で上書きしますか？')) return;
    nativeSet.call(localStorage, targetKey, JSON.stringify(cloneFor(target)));
    alert('名鑑シリーズを複製しました。切替先で画像・ジョブ・記事URLを設定してください。');
  });

  const observer = new MutationObserver(decorate);
  document.addEventListener('DOMContentLoaded', () => {
    decorate();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
