/* Keep a standalone app's single launch entry across its own world routes.
 * Normal browser tabs retain their usual Back behavior. No history is cleared.
 */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script) return;
  const scope = new URL('./', script.src);
  const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  document.addEventListener('click', event => {
    if (!standalone() || event.defaultPrevented || event.button !== 0
      || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== scope.origin || !destination.pathname.startsWith(scope.pathname)) return;
    const route = destination.pathname.slice(scope.pathname.length);
    if (!/^(?:index\.html|(?:town|maze)(?:\/(?:index\.html|clear-gallery\/(?:index\.html)?)?)?)?$/.test(route)) return;
    // Anchors inside the current document should keep their native behavior.
    if (destination.pathname === location.pathname && destination.search === location.search) return;
    event.preventDefault();
    location.replace(destination.href);
  });
})();
