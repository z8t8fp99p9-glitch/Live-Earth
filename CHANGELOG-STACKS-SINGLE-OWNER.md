# LIVE // EARTH — Stacks Single-Owner Cleanup (V89.0 candidate)

**Source branch:** `main`  
**Source HEAD inspected:** `8893a872aab1166a43cdf7564b391ef68ef7d163` — `LIVE // EARTH V88.9 — Remove Orbital Trails and Fix Landscape Orb Sizing`  
**Changed runtime file:** `orb-controls-v4.js` only  
**New runtime files:** none  
**GitHub write / commit / deployment:** not performed

## Purpose

Make Stacks ownership clearer without creating a new script, changing the current Stacks experience, or modifying the startup/service-worker file lists.

The current app already has a canonical `window.LiveEarthFeatureViews` controller in `view-module-registry.js`. It owns the Stacks library open/close state, feature catalogue, scattered-orb layout, and collection animation. The older `orb-controls-v4.js` also contained a separate legacy Stacks placeholder panel and a second `stacksOpen` flag.

This change removes that older panel and its state. The controls file now delegates any fallback Stacks activation to `LiveEarthFeatureViews.toggleLibrary()` and leaves the Stacks button's pressed state to the canonical controller. This avoids two separate pieces of code independently managing the same Stacks button/panel.

## Explicitly preserved

- The existing Stacks / Orb Hunt UI and animation implementation in `view-module-registry.js`.
- Random/asymmetric scatter and lightweight collection animation.
- The five main Orbs and their existing positions/design.
- Location OFF default and the current Location state/geolocation guards.
- Existing iOS viewport/orientation recovery handlers and hit-test refresh logic.
- Current `index.html`, `sw.js`, `view-manager.js`, database/recovery files and all celestial rendering files.
- The existing public API and event names.

## Upload instructions

1. Keep a copy of the current `orb-controls-v4.js` before replacing anything. The exact source baseline is included as `ROLLBACK-orb-controls-v4.js`.
2. If choosing to test this candidate, replace **only** repository `orb-controls-v4.js` with the included `orb-controls-v4.js`.
3. Do not upload `ROLLBACK-orb-controls-v4.js`; it is a local recovery copy.
4. Do not change `index.html`, `sw.js`, or `update-manager.js` for this patch; no new script or precache path is introduced.
5. After your upload/commit and deployment, verify Stacks opens and closes, the active-feature dock returns correctly, Location still toggles normally, and portrait/landscape touch behaviour remains normal. Test online first; then confirm the cached installed app still behaves as expected.
6. If any behaviour regresses, restore `ROLLBACK-orb-controls-v4.js` as `orb-controls-v4.js`.

## Evidence boundary

Static validation is included in `VALIDATION-REPORT.md`. No physical iPhone/PWA test, Pages deployment verification, or live update-cycle test was run during package preparation. This package does not resolve the separately reported update error.
