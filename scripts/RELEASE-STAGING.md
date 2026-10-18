# Pages release staging

The workflow builds/checks in the source checkout, then copies only the public
site into `_site`. It never deletes source originals or touches visitor storage.
The staging directory must be empty. Build dependencies, backend source,
development tests/scripts/docs and Halloween audit evidence are not published.
`assets/verification` is deliberately retained: `visual-proofs.js` uses it.
Local relative references in retained HTML, CSS, JS, JSON and web manifests are
checked against excluded files before copying. This static guard is not a full
JavaScript execution analysis; all runtime image families and original URLs are
preserved to avoid breaking constructed URLs or warm caches.

## Measured baseline

At main `1c5904e3c0365cdcd8db74e353a8a197cf79afec`, tracked logical files total
234,283,718 bytes. Applying these staging rules keeps 223,423,193 bytes and
excludes 10,860,525 bytes (10.861 MB / 10.357 MiB; 4.64%). Installed node_modules
are additionally excluded regardless of their size. These are uncompressed
logical file sizes, not gzip/tar size, network transfer, browser cache, RAM or
billing. Builds and later source changes may change the totals. The staging
command prints a per-file exclusion report and writes an Actions job summary.

## Original-image candidates: retained intentionally

The following 12 PNGs total 28,545,462 bytes. No literal basename was found in
current Halloween JS/HTML/CSS, but that does not establish safe removal. These
remain at their current public URLs and remain unchanged in source control:

- `assets/halloween-labels-original-v28-4-5/mood-horror.png`: provenance for mood-01-16 and audit review.
- `assets/halloween-labels-original-v28-4-5/rain-horror.png`: provenance for after-rain-ghost-story and audit review.
- `assets/style-film-light-original-v28-4-3.png`: predecessor recorded by v28-4-4 provenance.
- `assets/style-film-light-original-v28-4-4.png`: predecessor recorded by refined provenance and audit.
- `assets/style-fine-light-original-v28-4-3.png`: predecessor recorded by v28-4-4 provenance.
- `assets/style-fine-light-original-v28-4-4.png`: predecessor recorded by refined provenance and audit.
- `assets/style-gloss-fantasy-original-v28-4-3.png`: predecessor recorded by v28-4-4 provenance.
- `assets/style-white-geometry-original-v28-4-3.png`: predecessor recorded by v28-4-4 provenance.
- `assets/verification/v14/newspaper-finished.png`: recorded in image-proof-results-v14.json.
- `assets/verification/v14/spread-finished.png`: recorded in image-proof-results-v14.json.
- `crystal-transmission-anime.png`: README, recipe check and historical generation inventories reference it.
- `japan-photo-v18.png`: used by format-preview and Japan sample generation scripts.

Provenance JSON remains public. Removing its referenced originals would break
inspection and existing shared URLs. Further reduction requires a versioned
archive/compatibility plan rather than blanket deletion.

## Exact duplicate candidates: retained intentionally

15 exact Git-blob duplicate groups account for 4,046,409 excess bytes. They are
not deleted or redirected in this change. The luminous-original pair is used by
current catalogs; manor-hero is used by separate exhibition entry points; the
palace/maze enemy and portrait pairs have established route-relative URLs; the
preview-v2 creator/OG placeholders have legacy URLs. Keeping these costs storage
but avoids broken references, old service workers and shared image URLs.

Display thumbnails are not redundant originals: 73 pairs use 1,754,950 bytes of
WebP previews for 82,862,712 bytes of full images. Preserve both purposes.
