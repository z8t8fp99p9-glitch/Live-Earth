LIVE // EARTH — ALIEN WORLD SOURCE-IMAGE FIX
Date: 31 October 2026

PURPOSE
This is a narrow follow-up to the successful Alien World pipeline upload. The last GitHub Actions run collected 44 database records and published 8 stories plus a 9-page magazine, but reported imagesPrepared=0. This package improves source-post image extraction and makes missing images retryable.

WHAT CHANGES
- Reads image references from NASA RSS/Atom media fields and embedded HTML, including entity-escaped Atom summaries.
- Reads Open Graph/Twitter metadata, JSON-LD ImageObject data, normal image tags, lazy-loaded image attributes, responsive srcset/data-srcset and inline background-image references.
- Prefers the original NASA article/feed's own image. It does not search for a similar image by keyword.
- Uses a browser-compatible request header and passes the original NASA article as Referer when fetching its image.
- Keeps strict HTTPS NASA.gov host checks, redirect checks, byte limits, image validation and the existing third-party exclusion screen.
- Retries missing images on each bounded Collector run instead of suppressing them for seven days. Existing downloaded, valid images are reused.
- Adds per-story diagnostics to the Collector output so the next Actions run identifies whether an image was absent, hosted outside the NASA-only policy, blocked, or failed validation.
- Adds deterministic tests for modern JSON-LD/lazy images, Atom-escaped HTML, image provenance, and retry-after-failure behavior.

WHAT DOES NOT CHANGE
- The Collector remains the only component allowed to fetch external source content and write the Alien World source database.
- The Publisher remains database-read-only and does not access the web.
- The Universal Editorial Engine, feed renderer, PDF Viewer, Alien World layout, Home/Earth/Moon/Sun views, Orb controls, service worker, app cache, IndexedDB and recovery logic are not changed.
- The source policy remains official NASA.gov hosts over HTTPS. Non-NASA image hosts remain rejected. Image source and credit are retained; this does not grant independent image rights.
- No database reset, cache reset, new service, login or paid API is introduced.

UPLOAD
1. Upload this archive to the repository root with the exact filename LIVE_EARTH_MAIN_UPLOAD.zip.
2. The existing ZIP Extractor validates the manifest and applies only the listed files. It removes the temporary ZIP and commits the upload.
3. Wait for ZIP Extractor and GitHub Pages to finish successfully.
4. Run Actions → Alien World Publisher → Run workflow → branch main → mode all; leave the optional custom editorial request blank.
5. Share the run result. We will check imagesPrepared, the per-story diagnostics, and the published feed's imageUrl fields before visual testing.

EXPECTED NEXT CHECK
A successful publication alone is not proof that images were retrieved. We need the Collector diagnostics to show approved candidates and successful image validation, and then confirm that the published feed contains imageUrl values.

SUGGESTED GITHUB COMMIT TITLE
Improve Alien World NASA image extraction and retries

ROLLBACK
The exact pre-fix Collector is included under recovery/data-collection/alien-world/. Do not replace the active workflow YAML or delete the existing database/cache.
