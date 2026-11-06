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

UPLOAD — CURRENT RULE
- Upload one ZIP file to the repository ROOT on branch main. The ZIP can have any filename, but its extension must be .zip.
- Do NOT unpack the ZIP before uploading it.
- Keep exactly one root-level .zip file in the repository for each upload attempt. If a failed attempt leaves a ZIP behind, remove that old ZIP before retrying.
- The ZIP must contain UPLOAD_MANIFEST.json at its ROOT. The manifest must use schemaVersion 1 and list every payload file with its path, byte size and SHA-256 checksum.
- The manifest must also contain a meaningful, task-specific one-line commitTitle (1–100 characters). The extractor uses that exact title for the GitHub commit. Do not use generic titles such as "Update files" or "Upload ZIP".
- The extractor validates the complete package before applying any file or deletion. It removes the uploaded ZIP only after successful validation and application.
- Payloads may not write to .git/ or .github/, overwrite UPLOAD_MANIFEST.json, or add another .zip file. Keep all existing path, size, checksum and symbolic-link protections.

WORKFLOW BOOTSTRAP / WORKFLOW CHANGES
The extractor intentionally blocks .github/ paths, including its own workflow file. Therefore the first change to the extractor, and any later workflow change, must be installed manually at:
.github/workflows/zip-extract-auto-upload.yml
Use the complete approved workflow YAML and make a separate GitHub commit with a meaningful title describing that workflow change. Once installed, ordinary ZIP payloads can use any root-level .zip filename.

MANIFEST COMMIT TITLE EXAMPLE
"Repair Location Orb GPS activation and update its tests"
Choose a title that describes the actual files and task in that ZIP. The ZIP's manifest commitTitle is the source of the automatic commit title.

MANUAL WORKFLOW FILES — HISTORICAL COLLECTION NOTE
The extractor refuses .github/ paths. The old Nature/Alien workflow-template instructions below belong to the retired collection setup and must not be used to reactivate those Views:
1. .github/workflows/nature-publisher.yml ← nature/publisher/NATURE_PUBLISHER_WORKFLOW_UPDATE.yml
2. .github/workflows/alien-world-publisher.yml ← alien-world/publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml

The historical templates kept separate cache paths, output commits and an Alien World Pages rebuild.

SAFETY
No database is reset, dropped or replaced. Existing ownership metadata is checked. Only the current View's expired rows are pruned according to its Manager retention setting. No Home/Moon/Sun/Orb/UI, offline, service-worker, IndexedDB, saved-PDF or local recovery files are changed by the collection repair described above.

VALIDATION
- Python compile check passed for the shared Manager, Collector, Newsroom Writer, Orchestrator, both Publisher adapters, and Global Checker dispatch modules (local Python 3.13.5).
- 134 targeted regression tests passed across Manager (9), Global Collector (11), shared Writer (6), Nature Publisher (12), Alien World Publisher (12), Orchestrator (4), Universal Editorial Engine (13), Global architecture contract (3), shared dispatch (2), bootstrap (7), Global Checker (universal 8, post-Editorial 19, shared policy 9), and Image Engine (19).
- The two older direct-checker suites still have 4 failing/error cases each in the unchanged baseline; the same failures were reproduced on the unmodified repository snapshot. They are not regressions introduced by this global-only patch.
- GitHub Actions, live source availability, published feeds and iPhone verification are NOT RUN and are not claimed.
