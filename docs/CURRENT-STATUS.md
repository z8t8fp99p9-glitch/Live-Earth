# LIVE // EARTH — Current Status

**Inspected:** 7 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Inspected commit:** `baa7bd9189d0cb4c315535fda948f7137ca9ac69`

This checkpoint describes the repository snapshot inspected for the cleanup. Re-check `main` before any later task.

## 1. Application

The application and existing source modules are production code. Important areas include:
- `index.html` — app shell.
- `view-manager.js` — primary-view transitions.
- `view-module-registry.js` — shared module and feature lifecycle/registry.
- `orb-controls-v4.js` — protected Orb controls and orientation recovery.
- `ios-standalone-root-flow.js` — iOS full-screen root-flow support.
- `sky-view-controller.js` — shared Sun/Moon sky stage.
- `moon-view-controller.js` and `moon-lunar-interface.js` — Moon renderer and interface.
- `sun-view-renderer.js` — Sun renderer.
- `stacks-feature-views.js` — independent environmental Stacks features.
- `engine-feature-views.js` — Editorial Engine workspace only.

## 2. Protected behaviour

- Global Orb behaviour/dependencies and the five Home Orbs are protected.
- Preserve the approved Home composition and visual baseline.
- Moon and Sun are independent views.
- Location is OFF unless manually enabled.
- Preserve runtime/offline assets, startup/update safeguards, local data and recovery paths.
- Do not clear browser storage or reset a database as a generic fix.

## 3. Retained editorial capability

The Universal Editorial Engine remains under `editorial-engine/`. Its Python core, browser helper, text-intelligence utility and two general editorial-quality test files are retained. The Editorial Engine Feature Orb remains registered.

The preserved Python core still contains its prior read-only approved-record input contract. That contract is dormant: the associated collection and publishing services were removed. No live content collection, scheduled feed or Publisher run is active.

## 4. Removed systems

At the owner's direction, this cleanup removes the former collection/Manager, Collector, Checker, Image Engine, Newsroom database writer, Source Scout, Feed Collector and mini-browser, feed service, Publisher workspace, and Magazine/Nature/Alien World publishing scaffold. Their directories, integration modules, view loaders, tests, and implementation-specific recovery snapshots are deleted. No app-shell, Home, Orb, Sun, Moon, Location, Stacks environmental, service-worker, or generic PDF Reader files are included in the deletion list.

## 5. Verification boundary

The current Git tree was inspected. The ZIP manifest is built from the current tracked file list, and the package is validated for exact archive membership, payload byte sizes and SHA-256 hashes. Local JavaScript syntax checks are performed for the two changed scripts. No claim is made about GitHub Actions, deployment or iPhone acceptance until those are checked after upload.
