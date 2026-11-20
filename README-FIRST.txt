LIVE // EARTH — START HERE
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Documentation checkpoint: 20 November 2026

READ IN THIS ORDER
1. PROJECT-CONTINUITY.md
2. GLOBAL-STANDARDS.md
3. PROTECTED-DECISIONS.md
4. ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md (do not edit)
5. Documentation/INDEX.md
6. Documentation/CURRENT-STATUS.md
7. STARTUP-ESSENTIALS-POLICY.md

CURRENT VERIFIED SOURCE
- The uploaded `Live-Earth-main 16.zip` was checked against the current GitHub `main` source.
- The latest inspected commit is `af75d0ce789c88044adf9c0652f83e247a2f9f00` — `Restore Stacks Feature Controllers and Service Worker Shell` (v154).
- The v154 baseline currently places 51 entries in `APP_SHELL` plus 3 staged runtime dependencies: 54 install-time essentials.
- The v155 candidate moves all 12 Stacks feature-view implementations out of startup: 11 standalone controller files leave `APP_SHELL`, and Elevation is extracted from the shared Stacks source into its own optional controller. Two numerical-grid helpers and one documentation-only README also leave `APP_SHELL`: 37 `APP_SHELL` entries plus 3 runtime dependencies = 40 install-time essentials (14 fewer entries than v154). Static `APP_SHELL` file-size accounting is about 320.4 KiB lower; no launch-speed claim is made.
- Editorial Engine's browser workspace is not in `APP_SHELL`, but v154 eagerly downloads it during startup. The v155 candidate changes it to load only when its Orb is selected.
- The v155 package is locally prepared and validated only. It has not been uploaded, extracted, deployed or tested on the installed iPhone.

ESSENTIALS BOUNDARY
- Keep Home/Prime Earth, primary Earth, Moon and Sun, shared view/Orb registries, Stacks catalogue/lifecycle runtime, Location privacy and core data/recovery services in Essentials. Elevation's view controller loads on its Orb selection.
- Load Clouds, Weather, Elevation, Earthquakes, Traffic, the seven numerical-style views and Editorial Engine only when their feature Orb is selected.
- Load the two universal grid helpers only when a numerical feature needs a verified grid dataset.
- Keep the optional cache separate from the versioned app shell and IndexedDB. Do not clear it or local user data.

PROTECT
- Five Home Orbs and the shared three-Orb feature dock.
- Prime Earth composition, Earth Engine ownership, independent Moon and Sun views.
- Location OFF by default; no automatic GPS permission.
- Stacks lifecycle, offline startup, service-worker/update safeguards and local recovery.
- User data, IndexedDB and Cache Storage.
- Retained Universal Editorial Engine; do not restore removed publishing systems.

WORKFLOW
Inspect current main, source, callers and relevant notes before source changes. Make narrow changes. User uploads and commits manually through the manifest-validated ZIP workflow. Do not write directly to GitHub. Verify extraction, Actions, Pages deployment and device behaviour separately.
