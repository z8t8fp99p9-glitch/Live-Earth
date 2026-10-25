# LIVE // EARTH — Engineering Continuity & Globals/Fixes Register

**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Current source build:** V93 — `v93-bounded-automatic-retry`  
**Live site:** https://z8t8fp99p9-glitch.github.io/Live-Earth/  
**Last user-reported device status:** V93 launches smoothly online and offline; previous startup-preparation error no longer appears.

This file is the durable source of architectural intent. It exists to prevent a future inspection from mistaking a hard-won workaround for dead code. Keep it aligned with the actual source. When source behavior changes, revise this record in the same release/commit where practical.

## 1. Globals & Fixes Register — READ BEFORE EDITING

### FIX-01 — iOS full-screen root-flow / Scroller stability (protected)

**Purpose:** Prevent iOS Home Screen web-app viewport/scroll geometry from becoming inconsistent after launch or orientation change. This was a hard-won fix for the full-screen/Scroller behaviour, not a styling preference.

**Current source anchors confirmed on `main`:**
- `ios-standalone-root-flow.js` — header identifies the V77 root-flow technique. It applies a normal/scrollable root flow instead of relying on a fixed body; sets a minimum root/body height based on `100vh`/`100dvh` plus a calculated portrait viewport gap; synchronizes the gap on `resize`, `visualViewport.resize`, `orientationchange`, and `pageshow`, with settling passes after transitions.
- `orb-controls-v4.js` — the viewport recovery path clears stale scroll only on an orientation transition, including `window.scrollTo(0, 0)` and document/body `scrollTop` reset. The source comment explicitly says not to clear stale scroll on ordinary resize.

**Do not:** delete the helper, revert to a fixed-body-only layout, remove viewport settling, move this logic into a duplicate manager without migration, or broaden the scroll reset to every resize. Test portrait → landscape → portrait, Home and Sun/Moon close buttons, all five Home Orbs, and touch hit areas on the installed iOS app before changing it.

### FIX-02 — Hidden Home image/visual used by the iOS full-screen Scroller workaround (user-confirmed; exact selector still to be mapped)

The project owner explicitly confirms that **one Home-screen image/visual is intentionally hidden when it is not visually shown because it supports the iOS full-screen/Scroller fix**. It must not be treated as an unused image merely because it is invisible in the normal Home composition.

**Protection rule:** Do not remove the element, its file, its placeholder/space, or its hide/show rule; do not “optimize” it away; and do not alter its visibility/display/opacity until the exact current selector and purpose have been traced and an alternative has passed installed-iPhone testing. A static audit of this current source snapshot did not confidently isolate the exact image/selector, so that locator remains an open documentation task—not permission to delete it. The five visible Home Orb images and all current essential-shell imagery are protected independently.

### FIX-03 — Home visual lock / Earth camera and rendering baseline

The Home scene is approved and must remain compositionally unchanged. The service worker's injected `LiveEarthScene` code records Home Earth geometry, renderer pixel ratio and camera baseline separately from the exploration profile. Basic/HD quality and zoom are for exploration; they must not resize or zoom the approved Home Earth or change Home framing. Preserve the Moon geometry, texture, star/stardust/orbital curves and all five Home Orbs.

### FIX-04 — Five Home Orbs and primary-view/global-utility contract

- Keep exactly five Home navigation Orbs: Earth, Moon, Sun, Location and Stacks.
- Earth/Moon/Sun are primary views. Selecting another primary view switches the main view; tapping the currently active primary Orb returns to Home.
- Location and Stacks are global utility Orbs, not primary views. Their actions must not accidentally close or replace an active Earth Explorer, Moon View or Sun View.
- The Location Orb is a state toggle; it does not itself navigate merely because it is ON. ON state glows; OFF state does not glow.
- Do not change Orb size/shape by overriding only height. Orb diameter is width-driven with a square `aspect-ratio`; keep the Home geometry and placement locked.

### FIX-05 — Stacks/feature Orb motion and touch hitboxes

The scattered feature Orbs use one full-screen coordinate space; visible artwork and the button hitbox must move together. The collection animation waits for transition completion but retains a timeout fallback so a missing `transitionend` cannot leave the UI stuck. Do not remove the fallback or reintroduce a nested scroller that offsets taps. Keep width-driven Orb sizing in landscape.

### FIX-06 — Location OFF is a privacy contract

- Location starts OFF unless the user manually turns it ON.
- Do not request geolocation automatically from Home, Moon View, Sun View or startup verification.
- With Location OFF, the Moon UI deliberately hides observer-local rise/set times and location-specific values. This is expected privacy behaviour, not a broken astronomy calculation.
- Do not clear the saved/local user data as part of an update or error recovery.

### FIX-07 — Verified startup gate, offline shell and V93 automatic retry

Current `sw.js` and `update-manager.js` use build ID `v93-bounded-automatic-retry`; worker cache name is `live-earth-shell-v93-bounded-automatic-retry`.

- Online startup requests fresh essential resources and validates the response before releasing Home. Offline startup validates the saved shell.
- The current startup code performs the original preparation attempt plus up to two bounded automatic retries for eligible offline/network-style failures, separated by 900 ms, before offering manual Retry.
- The retries do not bypass verification or force-open Home. Integrity/readiness failures that are not classified as transient network/offline errors must remain visible.
- The last user test confirms online and offline launches are both smooth with no prior preparation error.
- Do not change only one of the worker/update-manager build IDs; they must match. Do not remove any APP_SHELL entry without confirming all dynamic routes and updating the worker/cache coherently.

### FIX-08 — Sun/Moon view layers and portrait/landscape backgrounds

`sky-view-controller.js` is the currently declared view controller. Its CSS references portrait and landscape WebP backgrounds for Sun and Moon. The service worker also still lists `moon-sky-background-responsive.svg` in APP_SHELL. Although older `sky-views.js` and `sky-view-adaptive-layer.js` files are not referenced by the audited current app bootstrap and are scheduled for removal from the live root, **do not remove `moon-sky-background-responsive.svg` from APP_SHELL in this cleanup**. Changing an essential-shell list is a code release, not a file housekeeping operation.

The Moon Arc/time-scroller belongs inside Moon View's overlay, not on the Home scene. Keep its view lifecycle scoped to Moon. Location OFF must continue hiding local event times.

### FIX-09 — Cache/data recovery and update safety

- Online refresh and offline fallback are intentional; online refresh must not silently substitute stale cache for the current required download.
- Previously verified assets may be reused only after the current verification checks pass.
- Staged updates should not interrupt the current session; apply the verified update on the normal safe launch flow.
- Never clear Cache Storage, localStorage, sessionStorage or IndexedDB as a generic fix. Never uninstall/reinstall the installed app as a shortcut. The user has local data and recovery state to protect.

## 2. Current essential resources

`sw.js` declares 30 APP_SHELL entries (including the `./` root route) and 3 additional runtime dependencies cached under virtual same-origin paths. The current list is documented in `README.md`. Keep these sources and essential assets unless a dedicated code change has verified the replacement.

In addition, `basic-map.html` and `basic-map.js` are retained intentionally as potentially supported Basic Map (2D) functionality. Current source scan did not find a link from the active bootstrap to those two files; resolve the intended Location route before considering their removal.

## 3. Cleanup rules and files removed from the live root

The cleanup package removes only reviewed non-runtime material: obsolete/duplicate notes and patch instructions (consolidated into this file and `README.md`), historical rollback copies (recoverable through Git history), development/preview/diagnostic pages, patcher/validation scripts, unused legacy alternatives not referenced by the active source paths, and the 12 mis-cropped artwork assets requested by the owner.

The following remain protected: all files currently named in APP_SHELL; all five Home Orb images; the four active Sun/Moon portrait/landscape WebP backgrounds; `moon-sky-background-responsive.svg`; `index.html`; the service worker and update manager; the iOS root-flow and active Orb controls; Location/globe, local data/recovery and astronomy modules; and `basic-map.html`/`basic-map.js`.

Old `.txt`/patch/rollback notes are not the source of truth after consolidation. Use Git history if an older source snapshot is needed, then compare it with current `main` before restoring anything. Never paste historical patch instructions into current source without a fresh baseline check.

## 4. Known documentation traps

- Several root notes describe V77–V90 or candidate patches and state “not yet deployed/tested”. They are historical status records, not current status.
- `README-CLEANUP.txt` and `DELETE-FILES.txt` are from an older Sun/Moon cleanup proposal and must not be followed as-is; they conflict with the current working view controller and essential-shell list. This cleanup package replaces that old deletion list with a new reviewed manifest.
- A successful static syntax/package check is not proof of a published deployment or real iPhone behaviour. The owner’s latest reported V93 online/offline result is the current device evidence.
- The GitHub integration refused direct file writes with HTTP 403 during this audit. No repository deletions were performed by ChatGPT. The cleanup package includes a manually triggered GitHub Actions workflow so the owner can review and apply the manifest through their own repository permissions.

## 5. Minimum post-cleanup verification

After the cleanup commit and any Pages refresh, confirm: (1) Home launches online; (2) Home launches offline; (3) Earth, Moon, Sun, Location and Stacks controls respond; (4) Earth/Home scale and framing stay approved; (5) Sun/Moon open/close correctly in portrait and landscape; (6) Location OFF does not request location and local Moon times remain hidden; (7) Basic Map route remains available if enabled by the current product flow; (8) no stale scroll, black stripe, close-button or touch-hitbox regression appears on iPhone.
