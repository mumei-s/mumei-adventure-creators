(() => {
  'use strict';
  const TOKEN_KEY = 'mumei-owner-token';
  const PERSIST_KEY = 'mumei-owner-token-persist-v1';
  const TTL = 30 * 24 * 60 * 60 * 1000;
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;

  function readSaved() {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return '';
      const saved = JSON.parse(raw);
      if (!saved?.token || Number(saved.expiresAt || 0) < Date.now()) {
        localStorage.removeItem(PERSIST_KEY);
        return '';
      }
      return String(saved.token);
    } catch {
      localStorage.removeItem(PERSIST_KEY);
      return '';
    }
  }

  const saved = readSaved();
  if (saved && !sessionStorage.getItem(TOKEN_KEY)) {
    originalSet.call(sessionStorage, TOKEN_KEY, saved);
  }

  Storage.prototype.setItem = function(key, value) {
    const result = originalSet.call(this, key, value);
    if (this === sessionStorage && key === TOKEN_KEY && value) {
      originalSet.call(localStorage, PERSIST_KEY, JSON.stringify({ token: String(value), expiresAt: Date.now() + TTL }));
    }
    return result;
  };

  Storage.prototype.removeItem = function(key) {
    const result = originalRemove.call(this, key);
    if (this === sessionStorage && key === TOKEN_KEY) {
      originalRemove.call(localStorage, PERSIST_KEY);
    }
    return result;
  };

  window.MUMEI_OWNER_PERSIST = { tokenKey: TOKEN_KEY, persistKey: PERSIST_KEY, ttl: TTL };
})();
