LIVE // EARTH — START HERE
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Inspection date: 7 November 2026

READ THESE FIRST — IN THIS ORDER
1. PROJECT-CONTINUITY.md
2. GLOBAL-STANDARDS.md
3. PROTECTED-DECISIONS.md
4. ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md
5. Documentation/INDEX.md
6. Documentation/CURRENT-STATUS.md

CURRENT PROJECT POSITION
- Treat the app and existing modules as production code. Inspect main before every task.
- Global Orb behaviour and dependencies are protected.
- The five Home Orbs remain Earth, Moon, Sun, Location and Stacks.
- Moon and Sun are independent views.
- Location is OFF unless the user enables it.
- Preserve real runtime/offline assets, local data, service-worker rules and recovery paths.
- `Stacks/stacks-feature-views.js` is the shared Stacks feature runtime and retains Elevation. Weather, Clouds, Traffic and Earthquakes have separate top-level view folders.
- `Editorial-Engine/engine-feature-views.js` registers only the Universal Editorial Engine workspace.
- The Editorial Engine core and browser helper are retained. Its former upstream collection/publishing integration is not active.
- The previous collection, source-discovery, feed, policy-checking, image-processing, database-writing, Publisher and Magazine systems were removed at the owner's direction.

SAFE WORK
- Read the relevant project reference, component contract and tests.
- Change only the requested scope.
- Never reset databases, browser storage, caches or local recovery data as a generic fix.
- Do not claim tests, GitHub Actions, deployment or iPhone verification unless they actually passed.
- Preserve unrelated app history and mark superseded decisions accurately.

ZIP UPLOAD
- The ZIP upload standard remains at the repository root. Never move, rename, rewrite or delete it.
- Upload one .zip to the repository root on main. Do not unpack it.
- Include UPLOAD_MANIFEST.json at the archive root, with exact payload paths, byte sizes, SHA-256 values, commitTitle and any approved delete paths.
- Check the GitHub Actions run and resulting commit.
