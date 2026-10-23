LIVE // EARTH — v78 Offline-Safe Patch Builder

IMPORTANT: This ZIP is a local patch builder, not a ZIP of the full app, and it does not push to GitHub. The GitHub connection available to the assistant denied repository writes, so no live commit or deployment has been made.

WHY THE PATCH IS NEEDED
The inspected main branch is still v77. The existing Sun portrait and landscape WebP files exist in the repository, but sw.js does not include them in APP_SHELL. Also, index.html contains a controllerchange guard that can skip reload when the service worker injects its startup gate.

HOW TO USE
1. Download the latest ZIP of z8t8fp99p9-glitch/Live-Earth from the main branch and extract it.
2. Open patcher.html in a browser that can run local JavaScript.
3. Select the extracted repository's root sw.js and index.html files.
4. Tap Build corrected files. If the source is not the expected v77 baseline, the tool stops without downloading replacements.
5. Replace only the repository-root sw.js and index.html with the generated files. Commit both together using this title:
   Fix v78 Sun offline cache and startup handoff
6. Wait for GitHub Pages to publish the commit. Open the app while online and allow the update to finish. Then test offline.

PATCH DETAILS
- sw.js BUILD_ID: v78-sun-offline-startup-fix
- sw.js CACHE_NAME: live-earth-shell-v78-sun-offline-startup-fix
- Adds sun-sky-background-portrait.webp and sun-sky-background-landscape.webp to APP_SHELL.
- index.html removes the early return that suppresses controllerchange reload when le-startup-gate exists.
- index.html treats a failed update check as non-fatal when an installed service worker already controls the page, preserving use of the existing shell.

SAFETY
- The patch intentionally does not modify Sun artwork, Earth size/camera framing, five Orb layout, location privacy rules, IndexedDB, or local recovery files.
- It does not erase old cache data. The worker keeps the prior cache until verified startup, under the existing service-worker cleanup rules.
- If GitHub Pages has not published the commit, the app cannot download the patch merely by staying online.
- After the commit is published, first open the app online so the v78 service worker can download and verify its required files. Do not claim offline readiness until this finishes.
- Keep the v75 recovery ZIP unchanged. Do not clear Safari/site data or uninstall the PWA.
