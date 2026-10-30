# LIVE // EARTH — Current Project Guide

**Repository:** `z8t8fp99p9-glitch/Live-Earth` · branch `main`  
**Live site:** https://z8t8fp99p9-glitch.github.io/Live-Earth/  
**Repository runtime baseline:** V108 — `v108-real-magazine-reader`  
**Prepared package:** V109 — `v109-alien-view-reset` (Alien View shell cleanup; not yet uploaded or owner-device tested)  
**Protected milestone:** Moon View was user-verified in Portrait and Landscape on 28 October 2026 and is locked. Do not modify it during this cleanup.

## Start here before any code change

1. Read this guide and [`LIVE-EARTH-CONTINUITY.md`](./LIVE-EARTH-CONTINUITY.md), especially the **Globals & Fixes Register**.
2. Inspect the exact current `main` source and active deployment before diagnosing or editing. Historical notes are context, not current instructions.
3. Preserve source comments that explain workarounds. If a line or hidden element looks unnecessary, find its reason and call sites before changing it.
4. Make one narrow change at a time. Keep code, service-worker shell, build identifiers and continuity notes coherent.
5. The owner uploads/commits manually. Preparing files or a ZIP is not deployment evidence.

## Non-negotiable protection rules

- **Home visual lock:** Do not alter approved Earth size/camera framing/texture, Home Moon geometry, orbital and stardust curves, or the five Home Orbs unless explicitly requested.
- **iOS full-screen/Scroller lock:** Do not remove the standalone root-flow, viewport settling, orientation-specific stale-scroll reset, or the owner-identified hidden Home visual/image workaround merely because an element is invisible in the normal composition. Read FIX-01 and FIX-02 in the continuity record first.
- **Primary vs utility view contract:** Earth/Moon/Sun are primary views. Location and Stacks are independent utility Orbs and must not unexpectedly close/replace an active primary view.
- **Location privacy:** Location defaults OFF. No automatic geolocation request from Home, startup checks or Moon View. Local lunar times remain hidden while Location is OFF.
- **Data safety:** Never clear IndexedDB, local data/recovery, website data or caches as a generic troubleshooting step. Never uninstall/reinstall the app to bypass a bug.
- **Startup gate:** Keep online freshness checks, offline verified-shell fallback, renderer readiness and bounded retry semantics. Never bypass verification to hide an error.
- **Changes to `sw.js`:** Do not remove an APP_SHELL entry or change `BUILD_ID`/`CACHE_NAME` in isolation. This V109 candidate keeps `sw.js` and `update-manager.js` aligned on `v109-alien-view-reset`; it uses a new V109 cache namespace and leaves all Moon View source/assets untouched.

## Essential startup resources (V109 candidate)

`sw.js` contains the verified app shell plus **3 runtime dependencies** cached under virtual same-origin paths. V109 adds the lightweight Alien View shell while preserving the existing Earth/Moon/Sun startup resources.

| File | Purpose |
|---|---|
| `./` | Root launch route |
| `index.html` | Home scene and five Orb buttons |
| `ios-standalone-root-flow.js` | iOS standalone root/viewport workaround |
| `orb-controls-v4.js` | Active Orb control logic; orientation-only stale-scroll reset |
| `earth-mode-navigation.js` | Earth exploration, quality and utility controls |
| `view-manager.js` | Primary view transition coordinator |
| `view-module-registry.js` | Current view/module implementation and feature Orb behavior |
| `stacks-feature-views.js` | Stacks data views: Clouds, Weather, Elevation, Earthquakes and Traffic preview; reuses the existing Earth layer interface |
| `alien-world-view-controller.js` | Empty full-screen Alien View shell; shared Feature Orb system retains control of Orb behavior |
| `sky-view-controller.js` | Shared Sun/Moon full-screen sky stage and lifecycle |
| `moon-view-controller.js` | Moon-only 3D renderer and lunar view behaviour |
| `moon-lunar-interface.js` | Moon-only lunar Arc/scroller UI and lifecycle |
| `location.html` | Location/3D globe screen |
| `earth-orb-globe.js` | Interactive Location globe implementation |
| `manifest.json` | Installed web app configuration |
| `icon.svg` | App icon |
| `data-store.js` | Versioned local data-store helpers |
| `location-scanner.js` | Location scanner interactions |
| `astronomy.js` | Astronomy calculations |
| `moon-orbit.js` | Moon orbital visualization/calculations |
| `dataset-manifest.json` | Local dataset metadata |
| `moon-sky-background-responsive.svg` | Responsive sky-art resource still declared in APP_SHELL |
| `moon-sky-background-portrait.webp` | Moon portrait background |
| `moon-sky-background-landscape.webp` | Moon landscape background |
| `sun-sky-background-portrait.webp` | Sun portrait background |
| `sun-sky-background-landscape.webp` | Sun landscape background |
| `update-manager.js` | Startup gate, fresh sync and bounded automatic retries |
| `data-recovery.js` | Local backup/recovery support |
| `earth.webp` | Earth Home Orb artwork |
| `moon.webp` | Moon Home Orb artwork |
| `sun.webp` | Sun Home Orb artwork |
| `location.webp` | Location Home Orb artwork |
| `stacks.webp` | Stacks Home Orb artwork |
| `./vendor/three.core.js` | Three.js core dependency cached by the worker |
| `./vendor/three.module.js` | Three.js renderer module cached by the worker |
| `./runtime-assets/earth-land-ocean-ice-2048.png` | Earth surface texture cached by the worker |

`basic-map.html` and `basic-map.js` are retained as potentially supported Basic Map functionality. They are not entries in the V97 APP_SHELL or runtime dependency lists; resolve the intended Location route before considering their removal.

## Cleanup scope

The older 101-path V97 cleanup proposal and its one-time cleanup workflow are historical only; they are not part of this V109 package. This V109 package removes only the obsolete Alien browser-side game/magazine/weekly-reader files and the stray retry ZIP. It does not modify the GitHub workflow or the publisher scripts/configuration used by that workflow.

## After cleanup, test on the owner’s iPhone

1. Online launch and successful preparation.
2. Offline launch after a successful online staging.
3. All five Home Orbs and approved Home Earth framing.
4. Earth → Moon → Sun → Home, including repeated open/close.
5. Portrait ↔ landscape transitions, close button, Scroller, touch hit areas and no black bottom stripe.
6. Location OFF: no permission request and no local lunar times; Location ON only after manual activation.
7. Basic Map route if the current UI exposes it.
8. Existing local data and recovery remain intact.

Do not clear site data or IndexedDB during these tests.


## Moon/Sky controller separation — V96

- `sky-view-controller.js` owns the shared full-screen sky stage, background selection, visibility and lifecycle for Sun/Moon sky views.
- `moon-view-controller.js` owns the extracted Moon-specific 3D renderer and lunar view behaviour. Its implementation is moved intact from the former inline section.
- `view-manager.js` remains the global authority for primary-view navigation and Orb open/close behavior.
- `moon-lunar-interface.js` is retained for compatibility. The Moon renderer loads before it so the existing registry key and startup contract remain compatible.
- Service-worker `BUILD_ID` and `update-manager.js` `BUILD_ID` are both `v96-moon-view-controller-separated`. The new controller is an essential APP_SHELL resource and is included in startup repair.
- Status note preserved from the original V96 package-preparation moment: it was then a source candidate. The owner subsequently reported V96 uploaded and all checks good on 28 October 2026.


## V97 candidate — online Stacks views

- Adds `stacks-feature-views.js` for Clouds, Weather, Elevation, Earthquakes and Traffic preview, using the existing `LiveEarthFeatureViews` catalog and `LiveEarthScene.registerLayer` interface. It creates no second Earth.
- Weather requests use only a recent location fix already provided while the red Location Orb is ON. This module never calls browser geolocation; Location OFF aborts requests and clears local weather display.
- Live data/images use network-only requests (`cache: no-store`) and are not replayed as current data offline. The script itself is cached as part of the app shell so views can clearly report when internet access is needed.
- NASA cloud fraction is a daily observational product, not a minute-by-minute cloud feed. Open-Meteo weather is current-model output. USGS latest-day earthquake events are refreshed while open. Elevation imagery/point queries require internet. Traffic is navigation/layout preview only until a trustworthy feed is selected.
- Candidate build identifiers match: `v97-online-stacks-views`. The module includes a retry hook for the registry/DOMContentLoaded load-order race.
- Validation: JavaScript syntax checks passed. A local Chromium harness using mocked API responses passed 34/34 feature/offline-state checks, and a second harness using the actual `view-module-registry.js` passed 12/12 navigation/Orb integration checks. These are isolated tests—not live-provider, deployed-site or owner-iPhone verification. Test the views online after upload before approving V97. Keep the V96 ZIP as rollback.


## 2026-10-30 — Alien World reset (V109 candidate)

- Replaces the old Alien discovery/game controller with a clean full-screen Alien View shell. The shell registers with the existing global Feature Orb system and does not collect data or build magazines.
- Removes obsolete browser-side Alien game/magazine/weekly-reader files and the old issue payloads/surface image.
- The existing `.github/workflows/weekly-magazine-publisher.yml` is intentionally untouched for now. Its Python publisher files and `config/nasa-feeds.json` remain until the workflow is manually separated later; removing them now would break its scheduled job.
- No workflow file is included in the ZIP, overwritten, renamed or deleted. The existing ZIP extractor/importer remains unchanged.
- Feature Orb opening/closing, animation, glow, Location and Stacks utility behavior remain owned by the shared Feature Orb system.
- Alien content collection, Publisher profiles, the Universal Editorial Engine and the shared PDF reader remain separate future/global integrations.
- Home/Earth composition, Sun View, locked Moon View, local IndexedDB, Location-OFF privacy behavior, Orb artwork and Moon/Sun background assets are not modified.
- `sw.js` and `update-manager.js` share `v109-alien-view-reset`; the service worker uses a fresh `live-earth-shell-v109-alien-view-reset` cache and deletes only the obsolete weekly-reader cache, never user IndexedDB.
- This is a local candidate only. It has not been uploaded, committed, deployed or verified on the owner’s iPhone.
