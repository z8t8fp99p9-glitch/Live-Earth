LIVE // EARTH — v78 Sun View Fix Builder

This is a local patch builder. It does not upload to GitHub or deploy.

1. Download and extract the current main ZIP from the Live-Earth repository.
2. Open LIVE-EARTH-v78-Fix-Builder.html in a browser that can open local files and run JavaScript.
3. Choose the repository-root sw.js, index.html, and update-manager.js.
4. Tap Build one corrected ZIP. If source files do not match the expected v77 baseline, it stops without output.
5. Extract LIVE-EARTH-v78-Sun-View-Fix-Files.zip.
6. Replace only those three files at the repository root, commit them together, and wait for GitHub Pages to publish.
7. Open the app online once to get the new worker and cache both Sun WebP backgrounds. Then test Sun portrait, landscape, and offline.

Do not upload the builder HTML or the output ZIP itself as files inside the app repository. The output ZIP contains replacements for existing source files.

Suggested commit title: Fix v78 Sun offline cache and startup handoff

Safety: the patch does not change the Earth scene framing, home composition, five Orb layout, Location-OFF privacy, IndexedDB, or the v75 recovery ZIP. Do not clear site data or uninstall the PWA.
