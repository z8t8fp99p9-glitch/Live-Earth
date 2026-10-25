# LIVE // EARTH — Current Project Guide

**Current source marker:** V93 — bounded automatic startup retries  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · branch `main`  
**Live site:** https://z8t8fp99p9-glitch.github.io/Live-Earth/

## Current status

The user has confirmed that the V93 build launches smoothly online and offline, without the previous preparation error. This is a user-device test report; do not describe it as a test performed by ChatGPT.

## Read before changing code

1. Read this quick guide.
2. Read [`LIVE-EARTH-CONTINUITY.md`](./LIVE-EARTH-CONTINUITY.md), especially **Globals & Fixes Register** and **Non-negotiable visual/privacy locks**.
3. Inspect the actual current `main` source and current deployment state before proposing or applying code changes. Historical notes are context, not proof of current code.
4. Make the smallest scoped change, preserve source comments explaining workarounds, and check all affected flows on the user’s iPhone after publication.

## Non-negotiable locks

- Do not change Home’s approved Earth size, camera framing, texture, Moon geometry, orbital/stardust curves, or five-Orb layout unless explicitly requested.
- Do not remove or “simplify” the iOS full-screen/Scroller workaround, hidden Home visual/image workaround, viewport settling, or orientation-specific scroll reset because a line or image appears unnecessary in isolation.
- Location OFF is a privacy state: no automatic geolocation request, and local lunar times remain hidden until the existing Location service is explicitly enabled.
- Do not clear website data/Cache Storage/IndexedDB, uninstall the installed app, or reset local recovery data as a troubleshooting shortcut.
- Preserve the startup verification gate. Retry transient failures; never bypass the gate or open Home before required assets and renderer readiness are verified.
- The owner uploads and commits manually. Never claim that a prepared ZIP has been deployed.

## Current essential startup resources

`sw.js` currently declares **30 app-shell entries**, including the `./` root route. The app shell's named files are:

- `index.html` — Home scene and five Home Orbs.
- `ios-standalone-root-flow.js` — iOS Home Screen standalone root/viewport workaround.
- `orb-controls-v4.js` — Orb interactions and orientation-only stale-scroll reset.
- `earth-mode-navigation.js` — Earth exploration, Location and quality controls.
- `view-manager.js` and `view-module-registry.js` — view transitions and view/module state.
- `sky-view-controller.js` and `moon-lunar-interface.js` — Sun/Moon backgrounds and Moon interface.
- `location.html`, `earth-orb-globe.js`, `location-scanner.js` — Location/3D globe flow.
- `manifest.json` and `icon.svg` — install metadata and icon.
- `data-store.js`, `data-recovery.js`, `dataset-manifest.json` — local data and recovery support.
- `astronomy.js` and `moon-orbit.js` — astronomy and Moon orbit logic.
- `moon-sky-background-responsive.svg` plus `moon-sky-background-portrait.webp`, `moon-sky-background-landscape.webp`, `sun-sky-background-portrait.webp`, `sun-sky-background-landscape.webp` — assets currently declared in the worker's essential shell.
- `earth.webp`, `moon.webp`, `sun.webp`, `location.webp`, `stacks.webp` — the five Home Orb images.

Three additional runtime resources are downloaded from approved external origins and cached under same-origin virtual paths by `sw.js`; these paths are not ordinary files in the repository root:

- `./vendor/three.core.js` — Three.js core module.
- `./vendor/three.module.js` — Three.js ES module.
- `./runtime-assets/earth-land-ocean-ice-2048.png` — Earth surface texture.

The repository also contains `basic-map.html` and `basic-map.js`. They are retained in the cleanup because Basic Map is a planned/user-facing Location feature, even though the current core source audit did not find a reference from the active app bootstrap. Do not delete them until the current Location route and intended 2D-map behaviour are reconciled deliberately.

## Update and test procedure

After a coordinated code change is uploaded and GitHub Pages has published it, open the app online and let preparation finish. Then check the relevant view, portrait/landscape rotation, Home Orb responsiveness, Location OFF/ON privacy, online refresh, and offline launch. Do not clear local data to make the test easier.

For the repository cleanup package, **uploading the ZIP itself will not delete files**. Extract it and follow `PACKAGE-README-FIRST.txt`. The included cleanup workflow is manually triggered and guarded: it only removes the reviewed paths in `DELETE-FILES.txt`, only when run on `main`, and only after the exact confirmation phrase is supplied. The workflow and manifest remove themselves after a successful cleanup commit.
