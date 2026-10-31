LIVE // EARTH — GLOBAL PDF READER UPGRADE

PURPOSE
Replace the shared PDF reader with a clean, full-screen, book-style PDF experience.

READER RESPONSIBILITY
- Open the PDF supplied by whichever Publisher or page view calls it.
- Render one real PDF page at a time.
- Turn pages using the Previous / Next arrows or a horizontal swipe across the page.
- Download the original PDF.
- Close and return to the caller.

READER UI
Exactly four controls: Previous page, Next page, Close, Download.
No magazine catalogue, issue list, Publisher UI, feed controls, or extra navigation is added.

IMPLEMENTATION
- Uses Mozilla PDF.js 6.4.299, loaded only when a PDF is opened.
- Loads and caches the PDF.js display module and worker separately from the app-shell cache.
- Uses a warm paper page, layered page edges, dark cinematic surroundings, subtle gold details,
  a reading progress indicator, and a GPU-transform page-turn animation.
- Keeps the existing LiveEarthUniversalPDFViewer.open(options), close(), isOpen(), and
  listSaved() interfaces so existing Publisher callers continue to work.
- Keeps the existing IndexedDB database name/version and issue-store structure unchanged.
- A local-save failure does not block online reading.

SCOPE
Replace only universal-pdf-viewer.js. No Publisher, Collector, Editorial Engine, page view,
index.html, service worker, workflow, database schema, or other app files are changed.
No database/cache reset or delete instruction is included.

UPLOAD
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Upload this archive to the repository root as LIVE_EARTH_MAIN_UPLOAD.zip.
Suggested upload commit title:
Upgrade Global PDF Reader with Book-Style Page Turns

The existing LIVE // EARTH ZIP Extractor workflow validates the manifest, applies the files,
and removes the temporary root ZIP only after successful application.
