LIVE // EARTH — START HERE
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Branch commit inspected for this naming correction: bf7e0582ce40c5daf1528a9f16abfb0b49744b76
Inspection date: 7 November 2026

READ THESE FIRST — IN THIS ORDER
1. PROJECT-CONTINUITY.md
2. GLOBAL-STANDARDS.md
3. PROTECTED-DECISIONS.md
4. ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md
5. docs/INDEX.md
6. docs/CURRENT-STATUS.md

CURRENT PROJECT POSITION
- Treat the app and existing modules as production code. Inspect main before every task.
- Global Orb behaviour and dependencies are protected.
- Moon and Sun are independent views. Keep their controllers/renderers separate.
- Keep the real runtime/offline assets, local data, service-worker rules and recovery paths.
- Nature and Alien World collection/publishing Views are retired.
- The Global Collection Manager currently has no active source catalogue, assignments, View profiles or schedules. Shared Global services remain available for a future approved View.
- engine-feature-views.js is a working feature-workspace module. It is not the removed Celestial experiment.
- Do not reactivate old Nature/Alien World workflows based on historical notes.

SAFE WORK
- Read the relevant project reference, component contract and tests.
- Change only the requested scope.
- Never reset databases, browser storage, caches or local recovery data as a generic fix.
- Do not claim tests, GitHub Actions, deployment or iPhone verification unless they actually passed.
- Preserve old decisions in docs/history and label them historical/superseded.

ZIP UPLOAD
- The ZIP upload standard remains at the repository root. Never move, rename, rewrite or delete it.
- Upload one .zip to the repository root on main. Do not unpack it.
- Include UPLOAD_MANIFEST.json at the archive root, with exact payload paths, byte sizes, SHA-256 values, commitTitle and any approved delete paths.
- Check the GitHub Actions run and resulting commit after upload.
