# Article editor

A single public editor page at `halloween-exhibition/preview/admin/`. It edits browser-local drafts, never publishes directly. Publication is an explicit owner action through the linked GitHub files and GitHub Pages. No authentication, secret/token input, backend, third-party SDK, or integration with another application. Local storage is limited to `halloween-exhibition:article-editor:v1`; same-host path separation is not a security boundary.

## Editing contract

- Archive schema 1: normal `evergreenEntries`; independent Halloween `years[].entries`. Keep the current 15 registered creator IDs; legacy drafts with the original nine or later registered subsets remain readable. The current archive JSON is authoritative, and an article cannot reference a participant missing from that archive’s creator records. A creator can have multiple article doors in the same collection/year, each with its own title, image, main article URL, visibility, and order. Each door can also contain additional `links` and `works`, individually editable and sortable.
- Catalog schema 2: only horror `articles`; independent records, including multiple articles by the same creator.
- Canonical `visible: false` hides article material from the exhibition, not the public creator identity. `order` sorts entries/articles and individual links, smallest first; ties preserve array order. Hidden data remains in exported public JSON. Never use this for secrets or private articles.
- Archive doors use an optional stable `doorId` without changing schema 1 or the v1 draft storage key. New doors receive an ID on their first successful save. An explicitly edited legacy door receives its existing deterministic identity (`legacy-evergreen-<creatorId>` or `legacy-archive-<year>-<creatorId>`). Reading/importing old drafts does not migrate them. The ID is read-only and stays fixed when the title, image, or creator changes. IDs must be unique within their collection/year, including when restoring deleted entries.
- The first archive link is edited by the primary URL fields; all other links and works have repeatable editors. Pending doors may have no main article URL. A saved pending door uses an empty URL in its first link slot so any additional links remain independent. Submitted articles and introductions require a valid HTTPS main URL. A legacy pending profile link is shown as an additional link, never substituted for the unknown article URL.
- Unrelated source metadata is retained, including the existing host introduction’s role. Adding another article for the host creates an ordinary independent door. Creator names, IDs, and portraits are not editable here.
- Each article form must be explicitly saved to the local draft. Unsaved changes prompt before switching collection, entry, or year. Page reload/close requests the browser’s native beforeunload confirmation for unsaved input or a draft that could not be persisted; whether a browser shows that prompt depends on its support and interaction rules. Backups and export include saved drafts only.
- Delete moves entries to local recoverable trash. Import/reset first offers a downloaded backup and asks for confirmation. Invalid JSON leaves the old draft untouched. Corrupt saved drafts are not silently overwritten: an explicit backup/reset path is offered. Unavailable storage falls back to session-only state with a warning. Recovery keeps the original raw storage until a complete, validated public replacement has been fetched and successfully written; failed fetches and storage errors leave the protected original intact.

- Recovery records are validated before import/export or rendering. New Halloween deletions include the original year metadata, so restoration can recreate a year removed by a later archive import. Legacy trash without that metadata stays recoverable: if its year no longer exists, restoration stops without removing the record and asks the owner to add that year first. Identity collisions also stop without altering the draft or trash.
- Public JSON reads use `cache: no-store`, a 15-second response/body deadline, and abort outstanding requests on completion/failure. Reload and file import disable the editing workspace while preparing a replacement, so a delayed result cannot silently overwrite newer form edits. Failed loads restore the old editable draft and offer retry; no replacement is applied before validation.

## Public file destinations

- `halloween-exhibition/preview/data/archive.json`
- `halloween-exhibition/preview/maze/data/catalog.json`

Download or copy validated JSON, open the corresponding GitHub edit link, review the diff and commit, then wait for Pages deployment and check the public exhibition. This page cannot establish whether a GitHub edit or deployment completed. Exported editor backups include local trash and should be kept locally, not committed as public exhibit data.

## Verification

From the repository root:

- `node --test halloween-exhibition/preview/admin/tests/*.mjs`: 38 passing tests (27 model/data compatibility, 7 real-handler contracts in a Node VM with a small DOM stub, 4 HTTP/body/deadline contracts with injected responses). This includes exact source export/import, same-creator multiple doors, pending unknown URLs, independent IDs/order/visibility, validated trash, restoration after year removal, old-draft compatibility, failed storage, protected corrupt-draft recovery, duplicate reload protection, stalled JSON bodies and independent retry.
- `node --check halloween-exhibition/preview/admin/app.js`, `model.js`, `draft-io.js`, and `tests/browser.test.cjs`: passed.
- One old static assertion for an exact cache-busting version was updated to the new app/model version because deployment must load the hardened code rather than stale cached modules.

The existing Playwright browser regression script was not run in this environment. The Node VM stub tests verify event behavior and data preservation, not actual browser native dialogs, rendered layout, accessibility, touch input or iPhone/iPad behavior. Browser/device QA remains outstanding. No server or browser was started for this change.

No runtime dependencies. Deploy `index.html`, `style.css`, `app.js`, `model.js`, `draft-io.js` and the shared `../data-model.js` together; README and tests may be retained as source documentation. Public source JSON, participant data, counters, other applications and production deployment are unchanged.

## Presentation size

The collapsible display-size setting selects Auto / スマホ / タブレット / PC through the same preview-only presentation preference as the gallery and adventure room. The setting does not modify drafts, authentication, content visibility, export or publication. Even a manually chosen PC layout wraps on narrow screens; browser zoom remains available. iOS standalone metadata and safe-area padding do not add an editor service worker or cache drafts.

The former horror collection is now visibly named `冒険室の書庫`, accepting genuine articles of any genre. Its internal `horror` ID and export schema are unchanged.
