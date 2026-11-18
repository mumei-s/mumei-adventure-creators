import { createDailyVisitCounter } from '../halloween-exhibition/preview/castle-visit-counter.js?v=20261119-community1';

const panel = document.querySelector('[data-tower-visits]');
if (panel) {
  const number = panel.querySelector('strong');
  const note = panel.querySelector('small');
  const scope = 'マンションと近未来街区の合計。同じブラウザは日本時間で1日1回です。';
  const counter = createDailyVisitCounter({
    rpcUrl: 'https://slamzhgsawfnmwlejgqp.supabase.co/rest/v1/rpc/tower_district_visit',
    publishableKey: 'sb_publishable_fh6wIQW4iKvCPd99oD2vZg_w1Yn2KMh',
    storageKey: 'atelier-tower:daily-visit:v1',
    lockName: 'atelier-tower:daily-visit-lock',
    isVisible: () => !document.hidden && !document.prerendering,
    isAllowed: () => location.origin === 'https://mumei-s.github.io' && window.top === window.self &&
      /^\/mumei-adventure-creators\/(?:tower|halloween-exhibition\/preview\/diorama-city)\/(?:index\.html)?$/.test(location.pathname) && !navigator.webdriver,
    onState({ total, status, limited }) {
      number.textContent = Number.isSafeInteger(total) ? total.toLocaleString('ja-JP') : '—';
      note.textContent = status === 'unavailable' ? '訪問数を取得できませんでした。' : scope;
      if (limited) note.textContent += '一部の訪問は集計できていません。';
      panel.dataset.status = status;
    },
  });
  const refresh = () => void counter.refresh();
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow', refresh);
  refresh();
}
