LIVE // EARTH — v78 startup/update fix builder

This ZIP is a local patching tool, NOT app source and NOT a ZIP to extract over the repository.
It builds correct, full replacement sw.js and index.html files from your current v77 source files, because those files contain substantial existing startup/recovery logic that must be preserved.

HOW TO USE
1. Download the latest repository ZIP from GitHub and extract it.
2. Open patcher.html in a browser that runs local JavaScript (not an inert file preview).
3. Choose the extracted main/sw.js and main/index.html files.
4. Tap “Build corrected files”. It checks that the expected v77 source anchors match exactly and then downloads the replacement sw.js and index.html.
5. In GitHub, replace only the repository-root sw.js and index.html with those downloaded files. Commit both together.
6. Do NOT upload patcher.html, this README, or any other ZIP contents into the repository.

WHAT THIS PATCH CHANGES
- sw.js: changes BUILD_ID and CACHE_NAME to v78-sun-view-backgrounds; adds both Sun View WebP files to APP_SHELL. All other service-worker logic is preserved.
- index.html: holds the early boot curtain until the service-worker update check and any detected update installation finish; removes the condition that ignored controllerchange merely because the injected startup gate exists; preserves the currently verified offline shell if the network update check fails; keeps a retry path if an update stalls.

EXPECTED GIT COMMIT
Fix v78 update-before-home startup flow

SAFETY
- This tool reads only the two files selected in the browser. It does not upload them anywhere and makes no network requests.
- If a baseline anchor differs or is ambiguous, it stops instead of guessing.
- Keep the untouched v75 recovery ZIP. Do not clear Safari/site data, reset IndexedDB, uninstall the PWA, or modify Home artwork/orbs as part of this fix.
- The new startup logic itself still needs real iPhone testing. A successful file build is not a device test.
- The existing v77 page already loaded into memory cannot be retroactively patched. For the first v77 -> v78 transition, one ordinary close/reopen may be necessary after the updated service worker is deployed; subsequent launches use the new gate.
