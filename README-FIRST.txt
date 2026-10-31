LIVE // EARTH — ALIEN WORLD PIPELINE FIX

This is one narrow update to the existing Alien World publishing system. It does not replace the app, Home/Earth/Moon/Sun views, Orb controls, service worker, update manager, local recovery or existing IndexedDB data.

WHAT THIS FIXES
- The Collector now prefers images actually attached to the original NASA feed/article instead of searching for a merely similar picture.
- Image source URL, original article link, caption, credit and image-type/rights note are retained. A story remains text-only if no suitable source-post image is available.
- The Publisher runs deterministic pipeline contract tests before publishing. A failed test prevents new output from replacing the last-good publication.
- The Main Page immediately clears visible live stories on an offline event.
- A "Saved on this device" magazine list is added to the Weekly Publish section. It opens PDFs already saved by the existing shared PDF Viewer. It does not save news feeds or article content offline.

WHAT DOES NOT CHANGE
- The existing GitHub Actions workflow already runs the Collector first and the Publisher second. No YAML replacement is required.
- The existing Universal Editorial Engine and shared PDF Viewer are reused.
- The app shell, sw.js, update-manager.js, index.html, Home/Earth/Moon/Sun, Orbs, Location privacy and recovery behavior are not modified.
- No database reset, IndexedDB reset, cache clearing, account or paid service is introduced.

UPLOAD
1. Upload this archive to the repository root with the exact filename LIVE_EARTH_MAIN_UPLOAD.zip.
2. The existing ZIP Extractor workflow validates the manifest and SHA-256 hashes, applies the listed files, removes the temporary ZIP and commits the update.
3. Wait for the Pages build to finish successfully.
4. Then open Actions → Alien World Publisher → Run workflow. Choose "all" for the first combined live-feed + magazine check. The Collector runs first; the Publisher runs its tests before the Engine publishes.

COMMIT TITLE
Improve Alien World source images and offline magazine access

SAFETY
Do not replace .github/workflows/alien-world-publisher.yml with an older saved YAML. The current workflow already uses data-collection/alien-world/collector.py and is the correct active workflow.
