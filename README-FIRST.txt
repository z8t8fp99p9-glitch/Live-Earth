LIVE // EARTH — START HERE
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Documentation review: 12 November 2026
Latest inspected main commit: a81afab9a007c0183d47073b35cd2831e3694b32

READ THESE FIRST — IN THIS ORDER
1. PROJECT-CONTINUITY.md
2. GLOBAL-STANDARDS.md
3. PROTECTED-DECISIONS.md
4. ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md
5. Documentation/INDEX.md
6. Documentation/CURRENT-STATUS.md
7. Weather/WEATHER-DESIGN-DIRECTION.md when working on Weather or Live Art

CURRENT PROJECT POSITION — 12 NOVEMBER 2026
- Treat the app and existing modules as production code. Inspect current main, callers, dependencies and tests before every source change.
- Latest main commit is a workflow-only cleanup: a81afab9a007c0183d47073b35cd2831e3694b32 (Remove Duplicate ZIP Extraction Workflow).
- The duplicate `.github/workflows/regression-tests.yml` file was removed. Despite its filename, it was an older duplicate ZIP extractor, not a regression-test runner.
- Keep `.github/workflows/zip-extract-auto-upload.yml`. It is the active manifest-validated ZIP extractor. Do not modify it casually.
- Keep all source files under `Tests/`. Removing the duplicate workflow did not delete test files. The repository's tests remain available for deliberate local/manual validation; do not imply a GitHub regression workflow currently runs them.
- Last app-source commit before the workflow-only cleanup: `f00750e4b374009b2ff8acfaed2d11f583921cc9` — Weather and Live Art illustration colours remain consistent across day and night. Pages deployment succeeded and the user confirmed the result in-app.
- Current service-worker build identity: `v132-residents-removed` (confirm it remains synchronized with `Global/update-manager.js` before future releases).
- Weather and Live Art artwork palettes are fixed across day/night. The sun/moon subject and weather-specific painting content/effects may still respond to phase/conditions; the underlying artwork palette must not recolour.
- Preserve the approved Portrait lock, accepted Landscape layout, Live Art 10:7 frame, and shared Orb dock.
- Portfolio mode uses the agreed fixed background; do not reintroduce weather-driven colour cycling into the artwork/background.

PROTECTED APP POSITION
- Global Orb behaviour and dependencies are protected.
- The five Home Orbs remain Earth, Moon, Sun, Location and Stacks.
- Moon and Sun are independent views.
- Location is OFF unless the user enables it.
- Preserve real runtime/offline assets, local data, service-worker rules and recovery paths.
- `Stacks/stacks-feature-views.js` is the shared Stacks feature runtime and retains Elevation. Weather, Clouds, Traffic and Earthquakes have separate top-level view folders.
- `Editorial-Engine/engine-feature-views.js` registers only the Universal Editorial Engine workspace.
- The Editorial Engine core and browser helper are retained. Its former upstream collection/publishing integration is not active.
- The previous collection, source-discovery, feed, policy-checking, image-processing, database-writing, Publisher and Magazine systems were removed at the owner's direction. Do not restore them from old notes.

SAFE WORK
- Read the relevant project reference, component contract and tests.
- Change only the requested scope.
- Never reset databases, browser storage, caches or local recovery data as a generic fix.
- Do not claim tests, Actions, deployment or iPhone verification unless they actually passed.
- Preserve unrelated app history and mark superseded decisions accurately.
- User manually uploads/commits. Assistant must not write directly to GitHub.

ZIP UPLOAD
- The root ZIP upload standard remains unchanged. Never move, rename, rewrite or delete it.
- Upload one `.zip` to the repository root on `main`. Do not unpack it.
- Include `UPLOAD_MANIFEST.json` at the archive root, with exact payload paths, byte sizes, SHA-256 values, `commitTitle` and any approved delete paths.
- `.github/` is protected from ZIP payload changes. Workflow YAML changes require a separate manual GitHub edit/commit.
- Check the extractor run and resulting commit. For source releases, separately verify Pages deployment and the user's device acceptance.
