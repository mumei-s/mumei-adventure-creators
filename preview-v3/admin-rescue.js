(() => {
  'use strict';
  if (location.hash !== '#admin') return;

  const TOKEN_KEY = 'mumei-owner-token';
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return;

  const API = 'https://xxhaerjvrgmnadxjqetz.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4aGFlcmp2cmdtbmFkeGpxZXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTMxMTQsImV4cCI6MjEwMTYyOTExNH0.DtoUvuMTrW7rA3jLThLD4zijvluuTB_LmEBIjWJs-jA';
  const requestedSeries = window.MUMEI_SERIES?.key || 'adventure';

  fetch(`${API}/rest/v1/rpc/admin_snapshot`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_owner_token: token, p_series: requestedSeries }),
    cache: 'no-store'
  }).then(async response => {
    if (response.ok) return;
    sessionStorage.removeItem(TOKEN_KEY);
    const url = new URL(location.href);
    url.hash = 'admin';
    url.searchParams.set('v', 'fix12');
    location.replace(url.href);
  }).catch(() => {
    // 通信不良時はdb-loader側の通常処理に任せる。
  });
})();
