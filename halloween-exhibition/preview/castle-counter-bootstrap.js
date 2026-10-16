// Optional visitor count never blocks the palace, gallery or game startup.
const root = document.getElementById('theater');
if (root) import('./castle-visit-counter.js?v=20261016-visits1')
  .then(module => module.initCastleVisitCounter({root}))
  .catch(() => {});
