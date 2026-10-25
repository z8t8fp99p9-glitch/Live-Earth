# LIVE // EARTH — Engineering Continuity & Globals/Fixes Register

**Repository:** `z8t8fp99p9-glitch/Live-Earth` · **branch:** `main`  
**Live site:** https://z8t8fp99p9-glitch.github.io/Live-Earth/  
**Audited source snapshot:** `46e73d90ab5b33127331103739aadbc06f1cd0af` (V93 code sources below unchanged)  
**Current source build:** V93 — `v93-bounded-automatic-retry`  
**Last owner-reported device result:** V93 online and offline launch both smooth, without the old startup preparation error. This is the user's device report, not a device test performed by ChatGPT.

> **Read this register before cleanup or code edits.** The purpose is to preserve the intent behind hard-won fixes so a future inspection does not remove something merely because it looks redundant in isolation. Do not delete, simplify, relocate or rewrite a protected workaround without tracing it, explaining a safe alternative, and testing the affected iPhone flows.

## 1. Globals & Fixes Register

### FIX-01 — iOS full-screen root-flow / Scroller and viewport recovery (**protected**)

**Problem history:** iOS Home Screen web-app viewport geometry and scrolling could become inconsistent around startup and portrait/landscape transitions. Reported symptoms across the engineering history included stale scroll offset, controls becoming untappable after rotation, a close button not responding, and a black strip at the bottom. The root-flow change fixed the underlying layout approach; the matching orientation recovery is a separate guard.

**Current-source anchors verified in the V93 source snapshot:**
- `ios-standalone-root-flow.js` header names the successful V7 scrollable-root technique / V77 root-flow approach. It applies a normal root/body flow instead of depending solely on a fixed body, sets minimum height from `100vh`/`100dvh` plus a calculated portrait viewport gap, and resynchronizes after `resize`, `visualViewport.resize`, `orientationchange`, and `pageshow`. It deliberately avoids extrapolating a portrait-sized `screen.height` into landscape.
- `orb-controls-v4.js` contains the comment: `Only clear stale scroll on an orientation transition, not ordinary resize.` It resets window/document/body scroll positions on the orientation recovery path. Do not broaden that reset to routine resizes.
- `index.html` still has `overflow:hidden`/touch-control rules for the app scene; `ios-standalone-root-flow.js` deliberately overrides the relevant root geometry only in its iOS standalone class.

**Do not:** delete `ios-standalone-root-flow.js`; remove viewport settling; revert to a fixed-body-only root; blindly apply Safe Area or viewport-height substitutions; move the logic into another manager without a coordinated migration; or remove the orientation-specific scroll reset. Test installed iOS PWA, portrait → landscape → portrait, Sun/Moon open/close, Home return, five Home Orb hit targets and bottom viewport.

### FIX-02 — Owner-identified hidden Home image/visual used by the iOS Scroller workaround (**do not remove; exact selector still unresolved**)

The project owner explicitly states that one Home-screen image/visual is intentionally hidden when it is not visibly needed because it supports the iOS full-screen/Scroller fix. The fact that it is not visible in the normal Home composition is **not** evidence that the asset or hidden element is dead code.

**Protection rule:** Do not remove that element, its source asset, its placeholder/space, or its hide/show/visibility rule; do not optimize it away; and do not change `display`, `visibility`, `opacity`, position or dimensions around it until the exact active selector and mechanism are mapped and an alternative passes installed-iPhone testing.

**Evidence boundary:** The current-source audit confirmed the root-flow and orientation recovery mechanisms but did not confidently identify the exact selector/file for the owner-described hidden image. This locator remains an explicit investigation item. It is not permission to remove any image that looks unused. The 12 mis-cropped files in the cleanup list are separate user-identified artwork exports/prototype artwork; none is one of the five Home Orb images or the four active Sun/Moon background WebPs.

### FIX-03 — Home visual lock / Earth camera and rendering baseline (**non-negotiable**)

The approved Home composition must not change: Earth size, camera framing/position, texture, baseline geometry and renderer pixel ratio, Moon geometry, star/stardust and orbital curves, and five Home Orbs. The worker's injected `LiveEarthScene` source in `sw.js` captures Home geometry/pixel ratio/camera baseline separately from exploration. Basic/HD quality and zoom are allowed only in the exploration mode; never carry exploration zoom/geometry into Home. Do not use resize or quality refactors to change Home framing accidentally.

### FIX-04 — Five Home Orbs and global primary-view / utility-view contract

- Exactly five Home navigation Orbs: Earth, Moon, Sun, Location and Stacks.
- Earth, Moon and Sun are primary views: selecting a different primary view switches views; tapping the active primary Orb returns Home.
- Location and Stacks are global utility features, not primary views. Their actions must not unexpectedly close or replace an active Earth Explorer, Moon View or Sun View.
- The red Location Orb is a state toggle and does not navigate merely because it is ON. ON glows; OFF does not glow.
- Orb diameter is width-driven with square `aspect-ratio`; do not independently shrink/change height. Landscape fixes must preserve true circular geometry and the approved Home Orb sizes/positions.

### FIX-05 — Stacks / Orb Hunt layout, scroller avoidance and hit-box alignment

The feature Orb scatter uses a single full-screen coordinate space. Each visible Orb and clickable button/hitbox move together; no nested internal scroller should offset touch coordinates. The Home dock and feature scatter are separate from the protected Home Earth scene. Preserve the existing collection animation completion guard/fallback in the active registry; do not replace it with an animation that can leave the UI stuck if `transitionend` does not fire. Preserve width-driven Orb sizing in landscape. Any animation timing change requires a source diff and iPhone interaction test.

### FIX-06 — Location OFF is a privacy contract

- Location is OFF by default unless the user manually enables it.
- No automatic geolocation request from Home, app startup, verification, or Moon View.
- With Location OFF, observer-local Moon rise/set times and location-derived values remain hidden by design. This is privacy behavior, not evidence the astronomy calculator is broken.
- Never clear saved/local data as a location or launch troubleshooting step.

### FIX-07 — Verified startup, V93 bounded retries and online/offline contract

**Current source IDs:** `sw.js` and `update-manager.js` share `BUILD_ID = "v93-bounded-automatic-retry"`; worker cache name is `live-earth-shell-v93-bounded-automatic-retry`.

- Online: request fresh essential resources and validate responses before releasing Home.
- Offline: verify the saved shell and runtime dependencies; never simply bypass checks to hide an error.
- Startup makes the original preparation attempt plus up to two automatic retries for eligible offline/network-style failures, with a 900 ms pause. If those fail, surface a manual retry. Non-network integrity/readiness failures remain visible.
- The owner reports the initial offline verification error is gone after V93; both online and offline launch were tested successfully on the user's device.
- `sw.js` and `update-manager.js` build IDs must match. Do not remove or rename APP_SHELL/runtime assets without a coordinated code release, cache/version update, dependency trace and fresh online/offline test.
- Do not clear Cache Storage, localStorage, sessionStorage or IndexedDB as a generic fix. Do not uninstall/reinstall the PWA to force an update.

### FIX-08 — Sun/Moon views and lunar Arc/scroller lifecycle

`sky-view-controller.js` is the current Sun/Moon view controller. It references the four portrait/landscape WebP background assets. `moon-lunar-interface.js` installs the lunar Arc/time scroller as a Moon-view overlay, not as a Home decoration. Its lifecycle and geometry remain scoped to Moon View. Keep `moon-sky-background-responsive.svg` for this cleanup because it remains listed in the current APP_SHELL even though the current controller primarily references the WebP backgrounds. Removal of an APP_SHELL path is a code/cache change, not an asset-cleanup shortcut.

With Location OFF, local rise/set information intentionally remains hidden. Never merge the Moon scroller into Home or change the underlying Moon/earth geometry to adjust the overlay.

### FIX-09 — Local data, recovery and staged updates

- `data-store.js` and `data-recovery.js` support local data and recovery.
- Do not change the IndexedDB schema, delete local records or reset storage unless explicitly requested and backed by a migration/recovery plan.
- Updates should be staged and applied through the existing safe launch flow, not force-applied mid-session.
- Preserve current code comments that explain data-safety or cache decisions.

### FIX-10 — Basic Map is retained pending route clarification

`basic-map.html` and `basic-map.js` are not part of the current 33-resource startup list and the static active-source scan did not find their names in the main bootstrap. They are retained in this cleanup because the project previously specified a Basic Map / 2D Location experience. Check the current Location route and intended product flow before removing either.

## 2. Current essential startup resources

`sw.js` currently defines 30 APP_SHELL entries (including `./` root) and three extra runtime dependencies. Keep the exact list coherent with the worker unless a code release deliberately changes it.

| # | Resource | Purpose |
|---:|---|---|
| 1 | `./` | Root launch route |
| 2 | `index.html` | Home scene and five Home Orbs |
| 3 | `ios-standalone-root-flow.js` | iOS full-screen root-flow/viewport workaround |
| 4 | `orb-controls-v4.js` | Active Orb controls and orientation-only scroll reset |
| 5 | `earth-mode-navigation.js` | Explorer, quality and utility controls |
| 6 | `view-manager.js` | Primary view transitions |
| 7 | `view-module-registry.js` | View modules and feature Orb interactions |
| 8 | `sky-view-controller.js` | Sun/Moon full-screen views |
| 9 | `moon-lunar-interface.js` | Moon Arc and time scroller |
| 10 | `location.html` | Location/3D globe page |
| 11 | `earth-orb-globe.js` | Interactive globe module |
| 12 | `manifest.json` | Installed-app metadata |
| 13 | `icon.svg` | App icon |
| 14 | `data-store.js` | Local dataset/store utilities |
| 15 | `location-scanner.js` | Location scanner |
| 16 | `astronomy.js` | Astronomy helper functions |
| 17 | `moon-orbit.js` | Lunar orbit visualization |
| 18 | `dataset-manifest.json` | Dataset definitions/metadata |
| 19 | `moon-sky-background-responsive.svg` | Responsive sky background still in APP_SHELL |
| 20 | `moon-sky-background-portrait.webp` | Moon portrait art |
| 21 | `moon-sky-background-landscape.webp` | Moon landscape art |
| 22 | `sun-sky-background-portrait.webp` | Sun portrait art |
| 23 | `sun-sky-background-landscape.webp` | Sun landscape art |
| 24 | `update-manager.js` | Verification gate and retry logic |
| 25 | `data-recovery.js` | Local backup/recovery UI and helpers |
| 26 | `earth.webp` | Earth Home Orb artwork |
| 27 | `moon.webp` | Moon Home Orb artwork |
| 28 | `sun.webp` | Sun Home Orb artwork |
| 29 | `location.webp` | Location Home Orb artwork |
| 30 | `stacks.webp` | Stacks Home Orb artwork |
| 31 | `./vendor/three.core.js` | Three.js core cached under a same-origin virtual URL |
| 32 | `./vendor/three.module.js` | Three.js module cached under a same-origin virtual URL |
| 33 | `./runtime-assets/earth-land-ocean-ice-2048.png` | Earth surface texture cached under a virtual URL |

## 3. Cleanup scope and why the old files can go

The reviewed deletion manifest contains 101 exact paths: 100 currently existing repository files at audit time plus the workflow path that will exist after installation. It removes old root-level notes and patch guides (their useful architecture/fix knowledge is represented here and in README), historical rollback copies (recoverable from Git history without rewriting history), dev/preview/diagnostic pages, patcher and validation/support scripts, legacy alternatives with no references from the audited active code paths, and the 12 mis-cropped images specifically rejected by the owner.

It retains all current APP_SHELL resources, current iOS fix sources, all five Home Orb images, all four active Sun/Moon WebP backgrounds, `moon-sky-background-responsive.svg`, `README.md`, this continuity record, and Basic Map files. The cleanup does not modify runtime source code; it deletes exact root-relative file paths through a normal Git commit.

The manifest itself and the one-time cleanup workflow are listed for self-removal after the cleanup commit so the repository ends with only the two maintained documentation files at root. Git history retains prior revisions. Do not rewrite history or force-push.

## 4. Source audit anchors at reviewed V93 baseline

| File | Git blob SHA at audit | Why protected |
|---|---|---|
| `index.html` | `98c79eea09d9be2d251198a4caaf108372ecc5c1` | Home visual composition and startup shell |
| `sw.js` | `2e1d68c7b46137da47543ee3404a1978360acd9e` | V93 service-worker source, shell and injected startup gate |
| `update-manager.js` | `a5ef1365fb58c2ef00b72bfdc31cec66d3b2524b` | Matching V93 readiness handshake |
| `ios-standalone-root-flow.js` | `8384093ee2921b470bad13d4871f16c73e55c122` | iOS root-flow/viewport fix |
| `orb-controls-v4.js` | `80a39b406a621a396d40bd1c53439551bad88df3` | Active controls/orientation scroll recovery |
| `view-module-registry.js` | `c2a84faba014c92096ad6a1cc2ad14cd7f40cea1` | Active registry and feature Orbs |
| `view-manager.js` | `28703c9804ed79ade093ffce2b9c35341fb08521` | Primary view transitions |
| `sky-view-controller.js` | `8e94f73bf6c62b5b0aec09fd19921db6a7ac0753` | Active Sun/Moon controller |
| `moon-lunar-interface.js` | `1d004e42bba7bbda2875da0d590d8e6f5c7ef976` | Active Moon overlay/scroller |

The cleanup workflow pins the current app-source blob SHAs. If any protected source changes before the cleanup runs, it must abort instead of deleting files under a stale audit.

## 5. Known historical documentation traps

- Root docs contain notes for V77–V90 and unmerged candidate packages. Their “not yet tested” status refers to those historical candidates, not automatically to V93.
- The old `README-CLEANUP.txt`/`DELETE-FILES.txt` described an earlier Sun/Moon cleanup proposal and conflicted with current active Sun/Moon code. They must not be followed as-is.
- `sky-views.js`, `sky-view-adaptive-layer.js`, `orb-controls.js`, `orb-controls-v5.js`, `orientation-manager.js`, `rotation-recovery.js` and `view-state.js` are legacy alternatives absent from the audited active bootstrap/dependency paths. Their similarly named current replacements remain protected. If the app architecture changes later, redo the reference audit before restoring any alternative.
- The exact selector for the owner-identified hidden Home image/visual remains unresolved. Keep it protected until mapped in source.
- Static code/package checks do not equal a published runtime test. The V93 online/offline result is owner-reported from the device.
- GitHub's connected integration previously returned HTTP 403 for direct delete/write operations. No repository files were deleted by ChatGPT. The owner will install and invoke a manually guarded GitHub Actions workflow through their own repository permissions.

## 6. Required post-cleanup test

After the cleanup commit and after GitHub Pages finishes publishing, verify on the installed iPhone:
1. Online launch completes, with no preparation error.
2. Offline launch completes, with no preparation error.
3. Earth, Moon, Sun, Location and Stacks buttons respond.
4. Home Earth size/framing/texture and Moon/star/stardust composition are unchanged.
5. Sun/Moon open and close correctly; repeated transitions work.
6. Portrait ↔ landscape causes no black stripe, scroll-offset jump, dead close button or touch hitbox mismatch.
7. Location OFF makes no geolocation request and local lunar times remain hidden.
8. Local data/recovery remains intact; Basic Map route works if exposed by the current app.

If any test fails, stop cleanup-related code changes and investigate the exact regression. Do not clear site data, IndexedDB or caches as a shortcut.
