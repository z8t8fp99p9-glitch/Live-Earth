# LIVE // EARTH V87 — Architecture Phase 1

## What this release does

- Adds `view-module-registry.js`, a small shared lifecycle registry built on the existing `live-earth-primary-view-change` contract.
- Registers the existing shared Sun/Moon background as one module that changes mode in-place.
- Registers the lunar Arc/scroller as a Moon-only module with explicit activate/deactivate lifecycle.
- Caches Arc/rail SVG path samples when geometry is built and schedules pointer updates at most once per animation frame.
- Adds the registry to the essential service-worker shell, recovery diagnostics, and verified-startup gate.
- Keeps Home markup and globe rendering unchanged; no storage schema or IndexedDB data is modified.

## What it intentionally does not do yet

- It does not move existing assets into new folders. Root paths are preserved to avoid breaking GitHub Pages, the service-worker cache, injected Home transforms, and relative astronomy imports.
- It does not delete legacy `view-state.js`, alternate Orb-control files, or prototypes. Their references must be audited before deletion.
- It does not alter Moon/Sun visual geometry, Moonrise/Moonset formula, location permission defaults, or Home camera framing.

## Next migration stages

1. Verify this lifecycle pattern in browser and on iPhone (Moon↔Sun, close via Home/Earth, rotation, Location OFF, offline launch).
2. Move one stable view at a time behind a common module contract, leaving all public URLs and cache entries compatible during transition.
3. Consolidate duplicate state/legacy paths only after repository-wide reference checks.
4. Introduce view asset groups in the service worker so each view's heavy extras can be staged without making the shared shell fragile.

## Baseline

Built from GitHub `main` commit `1486cf87f8e29ccc18726e1db7d9e05903f59f0e`; key file blob SHAs were checked against: `index.html` `221e873c…`, `sw.js` `ad01d7cc…`, `update-manager.js` `1386ba10…`, `view-manager.js` `28703c98…`, `sky-view-controller.js` `8269568d…`, and `moon-lunar-interface.js` `0eaafb83…`.
