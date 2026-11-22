# Current Status

**Reviewed:** 23 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Verified source checkpoint:** `d1aa269836069554cb27888f6b611e446407478c` — `Refresh Universal dataset storage`  
**Source build identity:** `v155-on-demand-feature-views` in both `sw.js` and `Global/update-manager.js`

## Deployment evidence

- GitHub Pages workflow run [`45076364772`](https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/runs/45076364772) completed successfully for the exact `d1aa269836069554cb27888f6b611e446407478c` source commit on 22 November 2026 at 22:12:42 UTC.
- The workflow produced the `github-pages` artifact for that commit. The four runtime files used as the source baseline for the current reliability work were checked against the corresponding Git blob hashes.
- A successful Pages workflow does **not** prove that an already-installed iPhone has activated the corresponding service-worker client or passed online/offline device acceptance. That gate remains unverified.

## Current application boundary

- v155 is the current source architecture: shared Stacks catalogue and lifecycle are startup resources; each of the 12 Stacks feature controllers and the Editorial Engine workspace is fetched on feature selection.
- The current source policy describes 37 distinct `APP_SHELL` files represented by 38 routing entries (`./` aliases `./index.html`), plus 3 staged runtime dependencies: 40 distinct install-time essential resources. The earlier v154 count of 54 is historical. Static byte-count reductions are not launch-speed benchmarks.
- The bounded optional cache is a separate cache from the versioned app shell and IndexedDB. Startup Essentials and readiness/recovery paths remain protected. See [`../STARTUP-ESSENTIALS-POLICY.md`](../STARTUP-ESSENTIALS-POLICY.md).
- Home/Prime Earth, five Home Orbs, shared three-Orb dock, primary Earth, separate Moon and Sun views, Location OFF privacy, Earth Engine, local data and recovery remain protected.
- The Universal Editorial Engine utility is retained; former collection and publishing systems remain retired.

## Current work package — Priorities 1, 2 and 3

1. **Documentation consolidation:** one documentation index, one current-status snapshot, one canonical history, and clear ownership for governance, architecture, startup policy and component references. Historical detail is being preserved as an explicitly dated archive rather than deleted.
2. **Optional-resource reliability:** validate only responses entering `boundedOptionalCache()` before storing them; preserve the 48-entry bound, network-first online behaviour and offline saved-copy fallback. Add a bounded timeout and retryable failure state to the Stacks optional-controller loader.
3. **Stacks-only close behaviour:** remove the global `window.setTimeout` override. Closing the Stacks library is handled locally and immediately; selecting a feature retains its existing Orb-collection transition.

**Local package state:** The Priority 1–3 changes have been prepared against the exact `d1aa269` source snapshot and passed targeted local checks. The package is not uploaded, extracted or deployed yet. See the dated 23 November entry in [`PROJECT-HISTORY.md`](PROJECT-HISTORY.md) for the check summary.

**Explicit exclusions:** Startup Essentials and their startup/readiness/recovery logic are not being redesigned. The Weather renderer/refactor (Priority 4) is deferred until Weather work resumes.

## Verification and release gates

The checked-in `Tests/` directory was retired by explicit owner direction. Do not claim an automated regression suite. For the current package, report syntax checks, targeted local mocks, ZIP/manifest validation and file-scope review as separate results. No live browser, installed-iPhone or offline-device acceptance test has been performed for this local package. After user upload, verify the extractor run, resulting `main` commit, Actions/Pages and installed-iPhone online/offline behaviour independently.

The previous 20 November status record, including its detailed v154/v155 candidate and 15–17 November milestones, is preserved verbatim in [`Archive/2026-11-20-CURRENT-STATUS-SNAPSHOT.md`](Archive/2026-11-20-CURRENT-STATUS-SNAPSHOT.md). See [`PROJECT-HISTORY.md`](PROJECT-HISTORY.md) for the canonical milestone timeline.
