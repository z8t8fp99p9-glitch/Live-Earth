# V110 Recovery Instructions

## Protected baseline
- Repository: `z8t8fp99p9-glitch/Live-Earth`
- Branch: `main`
- Alien World controller before this package: `alien-world-view-controller.js`
- Baseline blob SHA: `d8027e5896eec46f732cb75706a203b0b63d980a`

The baseline controller is copied beside this note as `alien-world-view-controller.js.v109-baseline.txt`.

## Rollback procedure
1. Restore the original `alien-world-view-controller.js` from GitHub file history (preferred) or copy the supplied V109 baseline text into that exact repository path.
2. Remove only the newly added V110 files:
   - `alien-world-publisher-client.js`
   - `universal-editorial-engine.js`
   - `universal-pdf-viewer.js`
   - `editorial-engine/`
   - `publishers/alien-world/`
3. Remove only V110 publication outputs under `published/alien-world/` if they exist.
4. Do not delete or reset `live-earth-local` IndexedDB, any other existing app database, Moon/Sun assets, Orb assets, or `sw.js`/`index.html`.
5. The shared reader's separate `live-earth-pdf-library` database is bounded to three PDFs / 70 MiB; it is isolated from the existing app database. It can remain untouched during rollback.
6. The Publisher database exists only in the workflow's Actions cache, not in the application repo. Removing/letting that cache expire does not affect the app's existing local data.

No existing Home, Earth, Moon, Sun, Orb, service-worker, update-manager or recovery source file is changed by this V110 package.
