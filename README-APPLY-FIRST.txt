LIVE // EARTH — v78 Sun Background Cache Repair
Prepared against: z8t8fp99p9-glitch/Live-Earth, main
Verified source head: 955f303f5866d7333280aa97f63fcd067a7b69f9

ROOT CAUSE CONFIRMED
- main/sw.js still declares the v77 build ID/cache name.
- APP_SHELL contains the Moon WebP backgrounds but omits the Sun portrait/landscape WebP backgrounds.
- Unlisted Sun WebP requests fall through to boundedOptionalCache(), which serves a cached image before checking the network. That can preserve stale background files.
- update-manager.js still sends BUILD_ID v75-bounded-startup, so it does not match the active worker's build ID for cache cleanup.

CONTENTS
- sw.js.patch: the minimal three-location diff for the existing service worker.
- update-manager.js: complete replacement with the v78 BUILD_ID.
- apply_v78_sun_fix.py: guarded script to patch the two existing source files locally.

SAFEST APPLY METHOD
1. Make a recovery copy of your repository/source before changes.
2. If using a computer with Python, copy this script into the repository root beside the existing sw.js and update-manager.js, then run:
     python3 apply_v78_sun_fix.py
   It checks the exact expected baseline, creates two backups, and modifies only those two files. It refuses to run if a baseline is missing/ambiguous or backups already exist.
3. Validate JavaScript syntax:
     node --check sw.js
     node --check update-manager.js
4. If applying through GitHub's web editor instead, make the three service-worker changes shown in sw.js.patch, then replace the existing update-manager.js with the file in this bundle. Do not upload sw.js.patch or the ZIP as app source files.
5. Commit only sw.js and update-manager.js with this title:
     Fix v78 Sun background caching and update handoff
6. Let GitHub Pages deploy, then test Sun View in portrait and landscape while online. Reload/relaunch once so the new service worker can install and activate; then verify again offline.

SCOPE / SAFETY
- No repository changes or deployment were performed by preparing this ZIP.
- Do not replace the entire project with this bundle; it is a targeted repair bundle.
- The existing LIVE_EARTH_APP_READY_V75 message type is intentionally retained for compatibility. The buildId field is what must match the worker's BUILD_ID.
- The repair does not alter Home composition, Earth/Moon camera or geometry, orb layout, location privacy rules, or IndexedDB/data recovery.
- Dynamic Sun lighting is separate work; this repair fixes background asset caching/update behavior only.

IMPORTANT
The ZIP supplies the guarded patch and complete replacement updater, not a whole-repository archive. Review changes before committing. Real iPhone verification is still required after applying it.
