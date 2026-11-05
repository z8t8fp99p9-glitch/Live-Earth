# LIVE // EARTH — Engine Feature Views Addendum

**Date:** 5 November 2026  
**Branch:** `main`

## Added Feature Orb workspaces

The Stacks Feature Orb library gains two additional full-screen entries:

1. **Editorial Engine** — `editorial-engine`
2. **Image Engine** — `image-engine`

Both are independent, viewport-filling workspaces. Editorial uses a warm ink, vellum and brass visual atmosphere. Image uses a deep-space blue, cyan and violet optical atmosphere. Both adapt to mobile safe areas and landscape layouts. The existing Feature Orb dock remains available to close the active view or open another feature.

## Shared-engine boundary

These screens are presentation/workspace shells. They do not create another Collector, Checker, Editorial Engine or Image Engine; do not copy or change either shared engine's processing pipeline; and do not claim to execute engine operations from the browser shell. Future controls should integrate with the existing Global Editorial Engine and Global Image Engine.

## App delivery

- New controller: `engine-feature-views.js`.
- Loaded after the existing Magazine Feature Orb controller by `update-manager.js`.
- The controller is requested online-first through the existing optional asset cache. No service-worker build identity change is needed for this lightweight view addition.

## Validation

JavaScript syntax checks and the GitHub Pages deployment should be verified after the ZIP upload workflow runs. The workspace screens are visual shells, not connected engine control panels.
