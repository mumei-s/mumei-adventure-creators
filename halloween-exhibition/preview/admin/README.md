# Article editor

A single public editor page at `halloween-exhibition/preview/admin/`. It edits browser-local drafts, never publishes directly. Publication is an explicit owner action through the linked GitHub files and GitHub Pages. No authentication, secret/token input, backend, third-party SDK, or integration with another application. Local storage is limited to `halloween-exhibition:article-editor:v1`; same-host path separation is not a security boundary.

## Editing contract

- Archive schema 1: normal `evergreenEntries`; independent Halloween `years[].entries`. Keep the nine existing creator IDs. A creator can have multiple article doors in the same collection/year, each with its own title, image, main article URL, visibility, and order. Each door can also contain additional `links` and `works`, individually editable and sortable.
- Catalog schema 2: only horror `articles`; independent records, including multiple articles by the same creator.
- Canonical `visible: false` hides article material from the exhibition, not the public creator identity. `order` sorts entries/articles and individual links, smallest first; ties preserve array order. Hidden data remains in exported public JSON. Never use this for secrets or private articles.
- Archive doors use an optional stable `doorId` without changing schema 1 or the v1 draft storage key. New doors receive an ID on their first successful save. An explicitly edited legacy door receives its existing deterministic identity (`legacy-evergreen-<creatorId>` or `legacy-archive-<year>-<creatorId>`). Reading/importing old drafts does not migrate them. The ID is read-only and stays fixed when the title, image, or creator changes. IDs must be unique within their collection/year, including when restoring deleted entries.
- The first archive link is edited by the primary URL fields; all other links and works have repeatable editors. Pending doors may have no main article URL. A saved pending door uses an empty URL in its first link slot so any additional links remain independent. Submitted articles and introductions require a valid HTTPS main URL. A legacy pending profile link is shown as an additional link, never substituted for the unknown article URL.
- Unrelated source metadata is retained, including the existing host introduction’s role. Adding another article for the host creates an ordinary independent door. Creator names, IDs, and portraits are not editable here.
- Each article form must be explicitly saved to the local draft. Unsaved changes prompt before switching collection, entry, year, or reloading the page. Backups and export include saved drafts only.
- Delete moves entries to local recoverable trash. Import/reset first offers a downloaded backup and asks for confirmation. Invalid JSON leaves the old draft untouched. Corrupt saved drafts are not silently overwritten: an explicit backup/reset path is offered. Unavailable storage falls back to session-only state with a warning.

## Public file destinations

- `halloween-exhibition/preview/data/archive.json`
- `halloween-exhibition/preview/maze/data/catalog.json`

Download or copy validated JSON, open the corresponding GitHub edit link, review the diff and commit, then wait for Pages deployment and check the public exhibition. This page cannot establish whether a GitHub edit or deployment completed. Exported editor backups include local trash and should be kept locally, not committed as public exhibit data.

## Verification

From `halloween-exhibition/`:

- `node --test preview/admin/tests/model.test.mjs`: 21 passing tests, including same-creator article doors, independent editing and restore, ID collision rejection, unknown pending URLs, status transitions, preserved profile extras, legacy v1 compatibility, host role preservation, and original source/schema/storage checks.
- `node --check preview/admin/app.js` and `node --check preview/admin/model.js`: passed.
- `node --check preview/admin/tests/browser.test.cjs`: syntax passed. The Playwright regression script covers CRUD, same-creator doors, pending URL requirement changes, legacy profile handling, draft reload, independent edit/restore, collection separation, exports, input labels, and narrow-screen overflow.

The browser regression script has not been executed for this change. The previous environment had a Chromium `socket() Operation not permitted` launch restriction; no rendered/mobile/a11y interaction pass is claimed. Run it only in a permitted browser environment before declaring browser QA complete. It accepts `CHROMIUM_PATH` and defaults to `/usr/bin/chromium`.

No runtime dependencies. Deploy `index.html`, `style.css`, `app.js`, `model.js` and the shared `../data-model.js` together; README and tests may be retained as source documentation.

## Presentation size

The collapsible display-size setting selects Auto / スマホ / タブレット / PC through the same preview-only presentation preference as the gallery and adventure room. The setting does not modify drafts, authentication, content visibility, export or publication. Even a manually chosen PC layout wraps on narrow screens; browser zoom remains available. iOS standalone metadata and safe-area padding do not add an editor service worker or cache drafts.

The former horror collection is now visibly named `冒険室の書庫`, accepting genuine articles of any genre. Its internal `horror` ID and export schema are unchanged.
