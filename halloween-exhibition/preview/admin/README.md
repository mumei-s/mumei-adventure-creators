# Article editor

A single public editor page at `halloween-exhibition/preview/admin/`. It edits browser-local drafts, never publishes directly. Publication is an explicit owner action through the linked GitHub files and GitHub Pages. No authentication, secret/token input, backend, third-party SDK, or integration with another application. Local storage is limited to `halloween-exhibition:article-editor:v1`; same-host path separation is not a security boundary.

## Editing contract

- Archive schema 1: normal `evergreenEntries`; independent Halloween `years[].entries`. Keep the nine existing creator IDs. One introduction per creator per collection/year. Each introduction can contain multiple `links` and `works`, individually editable and sortable.
- Catalog schema 2: only horror `articles`; independent records, including multiple articles by the same creator.
- Canonical `visible: false` hides article material from the exhibition, not the public creator identity. `order` sorts entries/articles and individual links, smallest first; ties preserve array order. Hidden data remains in exported public JSON. Never use this for secrets or private articles.
- The first archive link is edited by the primary URL fields; all other links and works have repeatable editors. Unrelated source metadata is retained. Creator names, IDs, and portraits are not editable here.
- Each article form must be explicitly saved to the local draft. Unsaved changes prompt before switching collection, entry, year, or reloading the page. Backups and export include saved drafts only.
- Delete moves entries to local recoverable trash. Import/reset first offers a downloaded backup and asks for confirmation. Invalid JSON leaves the old draft untouched. Corrupt saved drafts are not silently overwritten: an explicit backup/reset path is offered. Unavailable storage falls back to session-only state with a warning.

## Public file destinations

- `halloween-exhibition/preview/data/archive.json`
- `halloween-exhibition/preview/maze/data/catalog.json`

Download or copy validated JSON, open the corresponding GitHub edit link, review the diff and commit, then wait for Pages deployment and check the public exhibition. This page cannot establish whether a GitHub edit or deployment completed. Exported editor backups include local trash and should be kept locally, not committed as public exhibit data.

## Verification

`node --test halloween-yearbook/preview/admin/tests/model.test.mjs` from the workspace: 10 passing tests for schema validation, source roundtrip, independent collections, multiple links, metadata preservation, delete/restore, safe imports, URL rejection, creator IDs, and storage isolation.

`node --check halloween-yearbook/preview/admin/app.js` and `model.js`: passed.

`node halloween-yearbook/preview/admin/tests/browser.test.cjs` is a Playwright UI regression script with a local fixture server. It remaps the local source maze path to the deployment layout and checks initial load, CRUD, draft persistence, multi-link editing, restore, collection separation, JSON preview/download, storage isolation, input labels, and 390px overflow. Browser execution was attempted but blocked by the environment's Chromium `socket() Operation not permitted` failure; no rendered/mobile/a11y interaction pass is claimed. Run in a permitted browser environment before declaring browser QA complete. The test accepts `CHROMIUM_PATH` and defaults to `/usr/bin/chromium`.

No runtime dependencies. Deploy `index.html`, `style.css`, `app.js`, `model.js` together; README and tests may be retained as source documentation.

## Presentation size

The collapsible display-size setting selects Auto / スマホ / タブレット / PC through the same preview-only presentation preference as the gallery and adventure room. The setting does not modify drafts, authentication, content visibility, export or publication. Even a manually chosen PC layout wraps on narrow screens; browser zoom remains available. iOS standalone metadata and safe-area padding do not add an editor service worker or cache drafts.

The former horror collection is now visibly named `冒険室の書庫`, accepting genuine articles of any genre. Its internal `horror` ID and export schema are unchanged.
