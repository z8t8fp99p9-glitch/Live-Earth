CURRENT STATUS — 5 NOVEMBER 2026
The Nature and Alien World Views, their Global Manager source assignments, their publisher workflows, and their database caches are retired. This file describes the former setup and is preserved as history only. Do not use its old upload/workflow instructions to reactivate those Views.

LIVE // EARTH — GLOBAL-ONLY COLLECTION REPAIR
Prepared: 3 November 2026
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main

WHAT THIS FIX DOES
- Removes the Nature-specific and Alien World-specific Collector implementations.
- Makes Global Collection Manager + Global Collector the only collection route.
- Makes the shared Newsroom Database Writer initialize each Manager-selected database without View-specific code branches.
- Preserves separate Nature and Alien World databases, caches, feeds and hourly schedules.
- Makes both Publishers read only their own Checker-approved Newsroom rows.
- Applies Manager-profile retention (currently 32 days) without resetting existing data.

UPLOAD
Upload this exact file, LIVE_EARTH_MAIN_UPLOAD.zip, to the ROOT of the repository on branch main. Do not unpack it. The ZIP Extractor validates UPLOAD_MANIFEST.json, applies files and delete paths, then removes the uploaded ZIP.

MANUAL WORKFLOW FILES
The extractor refuses .github/ paths. After the ZIP Extractor completes, replace these two workflow files using the matching complete templates in the repository:
1. .github/workflows/nature-publisher.yml ← nature/publisher/NATURE_PUBLISHER_WORKFLOW_UPDATE.yml
2. .github/workflows/alien-world-publisher.yml ← alien-world/publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml

The workflow templates keep the existing hourly schedules, separate cache paths, output commits and Alien World Pages rebuild.

AUTOMATIC ZIP EXTRACTOR COMMIT TITLE
Apply LIVE // EARTH Main Upload

SAFETY
No database is reset, dropped or replaced. Existing ownership metadata is checked. Only the current View's expired rows are pruned according to its Manager retention setting. No Home/Moon/Sun/Orb/UI, offline, service-worker, IndexedDB, saved-PDF or local recovery files are changed.

VALIDATION
- Python compile check passed for the shared Manager, Collector, Newsroom Writer, Orchestrator, both Publisher adapters, and Global Checker dispatch modules (local Python 3.13.5).
- 134 targeted regression tests passed across Manager (9), Global Collector (11), shared Writer (6), Nature Publisher (12), Alien World Publisher (12), Orchestrator (4), Universal Editorial Engine (13), Global architecture contract (3), shared dispatch (2), bootstrap (7), Global Checker (universal 8, post-Editorial 19, shared policy 9), and Image Engine (19).
- The two older direct-checker suites still have 4 failing/error cases each in the unchanged baseline; the same failures were reproduced on the unmodified repository snapshot. They are not regressions introduced by this global-only patch.
- GitHub Actions, live source availability, published feeds and iPhone verification are NOT RUN and are not claimed.
