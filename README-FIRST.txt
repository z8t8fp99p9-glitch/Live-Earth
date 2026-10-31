LIVE // EARTH — GLOBAL PDF READER v4.0.0

WHAT THIS UPDATE DOES
Replaces the old book-style reader presentation with an immersive, full-screen PDF reader.
The PDF page fills the available screen while preserving its original aspect ratio. The reader
controls float above the page and never reserve space or push the page layout.

DESIGN — GLASSMORPHISM + CLAYMORPHISM
- Two large, matching circular page-navigation buttons in the top control row: Previous / Next.
- Two matching feature buttons in a separate second row: Download / Close.
- Frosted translucent glass, background blur, luminous fine edges, inner reflections, soft raised
  depth and tactile pressed states. Controls are custom-designed, not browser-default buttons.
- A separate translucent page counter stays visible even while both control rows are hidden.
- Tap the page once to show both rows; tap again to hide them.

READING
- Swipe horizontally to turn pages.
- Pinch to zoom, double-tap to zoom/reset, and drag to pan while zoomed.
- Page swipe is disabled while zoomed so horizontal panning does not accidentally turn a page.
- No book frame, ornamental page edges, page-turn animation, header, catalogue, or extra panels.

PRESERVED BEHAVIOR
- Existing LiveEarthUniversalPDFViewer.open(options), close(), isOpen(), and listSaved() API.
- Existing open, page-change, close, and save-warning events.
- Existing PDF.js 6.4.299 on-demand loading and engine cache name.
- Existing IndexedDB database live-earth-pdf-library, version 1, store issues, and saved records.
- Best-effort local saving; local storage failure does not block online reading.

SCOPE
Only universal-pdf-viewer.js is replaced. No Publisher, Collector, Editorial Engine, app view,
index.html, service worker, workflow, database schema, cache reset, or deletion is included.

UPLOAD
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Upload LIVE_EARTH_MAIN_UPLOAD.zip to the repository root.
Suggested commit title:
Refine Global PDF Reader with Glass and Clay Controls

The repository ZIP Extractor workflow validates the manifest, applies the payload, and removes
the temporary root ZIP after a successful import.
