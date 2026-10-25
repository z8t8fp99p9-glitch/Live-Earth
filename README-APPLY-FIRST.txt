LIVE // EARTH — V90 Coherent App-Shell Candidate
================================================

PURPOSE
This is a narrow, manually applied candidate for the online-only launch verification issue.
It creates a new versioned Service Worker cache so the current main-branch application
files are staged as a coherent shell before that worker can activate.

BASELINE INSPECTED
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Inspected main commit: f9eb8d212eac8b17e95f24dd0b7e2e74db8b79d1
Source sw.js blob: 396a2dad12bba2e2b693dd93bbe2ba3e444c76a8
Source update-manager.js blob: 4aed73f978e8c834abe631ac897dc649653bacd5

FILES TO UPLOAD TO THE REPOSITORY ROOT
1. sw.js
2. update-manager.js

Do not upload this ZIP itself. Do not upload or replace index.html, the Registry, renderer
files, backgrounds, or other assets for this candidate. The current main versions of those
files are staged by the new Service Worker using the existing APP_SHELL list.

WHAT CHANGED
- sw.js: changes BUILD_ID and CACHE_NAME to v90-coherent-app-shell; updates the header comment.
- update-manager.js: changes BUILD_ID to match; updates the header comment.
- No startup gate, readiness condition, online/offline branch, repair, timeout, rendering,
  Location, IndexedDB, Home composition, Orb, or camera logic was altered.

WHY THIS IS REVERSIBLE
The existing install logic still waits for all listed shell files and runtime dependencies
to pass its staging checks before activation. If the candidate install fails, the previous
active worker/cache remains available. Older shell caches are retired only after the new
build reports verified startup. IndexedDB and the separate optional-data cache are not
deleted by this patch.

IMPORTANT LIMIT
This candidate addresses a concrete cache-version consistency risk found during the
read-only audit. It does not prove that cache mixing is the exact cause of the shown
runtime error, and static checks cannot prove the result on the iPhone. Do not call it
fixed until the online launch is tested on the actual device.

MANUAL DEPLOYMENT
1. Keep this ZIP and the current working source as recovery references.
2. Open the repository on branch main.
3. Upload only sw.js and update-manager.js from this ZIP to the repository root.
4. Commit both files together using:
   LIVE // EARTH V90 — Restage a coherent app shell for launch
5. Wait for GitHub Pages to finish publishing.
6. Test one ONLINE launch first. If it reaches Home normally, test a second online launch.
7. Then test offline launch and confirm the expected fast/offline path remains unchanged.
8. If launch becomes worse or repeatedly fails, stop. Do not clear site data, IndexedDB,
   browser storage, or delete the installed app. Restore the previous sw.js and
   update-manager.js from the pre-change source/recovery copy.

The assistant has not committed, pushed, or deployed anything.
