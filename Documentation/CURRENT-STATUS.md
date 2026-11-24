# Current Status

**Reviewed:** 24 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Verified source checkpoint:** `05bb2c968d901b58b41bf9d42db80175d47b1435` — `Remove preview overlays from scientific globe views`  
**Source build identity:** `v155-on-demand-feature-views` in both `sw.js` and `Global/update-manager.js`

## Deployment evidence

- GitHub Pages run [45315989551](https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/runs/45315989551) completed successfully for the exact `05bb2c968d901b58b41bf9d42db80175d47b1435` source commit on 24 November 2026 at 02:57:22 UTC.
- This confirms the Pages workflow/deployment gate for that source revision. It does **not** prove that an already-installed iPhone has activated the corresponding service-worker client or passed online/offline device acceptance.

## Current application and feature state

- `v155-on-demand-feature-views` remains the source build identity. The shared Stacks catalogue/runtime is established at startup; the 12 Stacks feature controllers and Editorial Engine workspace are loaded on selection.
- **Atmosphere**, **Oceans** and **Atmospheric Composition** are the three current globe-first scientific Stacks views. Each creates its own Engine globe. Their controllers initialize asynchronously, reject/clean up stale results after close or switch, and own their layer cleanup. The shared registry suppresses the generic Stacks preview stage for those three IDs so a placeholder cannot cover the globe.
- The user has confirmed these three views are working in the app. This does not mean every upstream source is publishing a complete or newer global field at every refresh.
- Atmospheric Composition is a separate Stacks view, not a seventh original database World. Its seven field IDs and the registry mapping inconsistency are documented in `ATMOSPHERIC-COMPOSITION-DATA.md`.
- The approved interim Wind implementation loads the existing verified speed and direction products together for streamline rendering. The additive combined `earth.atmosphere.wind_vector` dataset remains future work; see `WIND-VECTOR-DATA-ARCHITECTURE.md`.

## Universal data collection and current-value store

- `Data/Universal/registry/datasets.json` contains **56** numerical dataset entries. At this checkpoint, **26** are configured/enabled and **30** remain `source_not_configured`.
- The active workflow is `.github/workflows/live-earth-universal-data-refresh.yml`. It runs hourly at minute 55 UTC and supports manual dispatch. `bootstrap.py` activates configured entries; `collector.py` runs their independent adapters; `storage.py` validates and atomically updates the stable current-value store.
- The repository-backed store is under `Data/Central-Database/values/<dataset_id>/`. Each dataset stores `metadata.json` and exactly one current-value representation: `values.bin` for a numeric grid or `records.jsonl` for point/event records. Successful collection replaces values at that stable location. There are no dated retrieval folders, raw provider-response archives or historical run-value snapshots in this design.
- Universal Data Refresh run [45303947702](https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/runs/45303947702), run #41, completed successfully on 24 November 2026 at 01:18:41 UTC: **8 updated, 18 skipped as already current, 0 failed**. Skipped means the adapter determined the stored values already matched that source cycle; it is not a failure.
- `datasets.json` stores per-dataset last-attempt status. A `collector_configured_failed` label can describe an earlier attempt because `SKIPPED` does not rewrite that field. Six Ocean entries currently retain such older labels, while all six were `SKIPPED` in run #41; they were not failures in that run. Use the run-specific collector summary for the latest run outcome.
- All 12 atmospheric registry entries are configured and currently carry `collector_configured_success`. All seven Atmospheric Composition IDs have `metadata.json` and `values.bin`, with `downloaded_and_grid_validated` quality metadata. File presence/validation is not proof of complete or newly published upstream coverage.
- NOAA GFS and NASA GEOS-CF v2 Composition data are model products, not direct satellite observations. See `ATMOSPHERIC-COMPOSITION-DATA.md` for precise meanings and units.

## Known registry consistency issue — source change required separately

`Data/Universal/registry/worlds.json` marks `atmospheric_composition` as `active_no_dataset_assignments`, while `world-dataset-assignments.json` assigns all seven Composition IDs to `world_id: "atmosphere"`. The Composition controller directly declares and loads those seven IDs, so this mismatch does not erase its working direct reader path. It is nevertheless a real registry metadata inconsistency and should be reconciled in a separately scoped source change. This documentation package does not modify the registry or runtime.

## Protected boundaries

- The versioned app shell, three staged runtime dependencies, bounded optional cache and IndexedDB are distinct. Startup Essentials, readiness and recovery paths remain protected; see `../STARTUP-ESSENTIALS-POLICY.md`.
- Home/Prime Earth, five Home Orbs, shared three-Orb dock, primary Earth, separate Moon and Sun views, Location OFF privacy, Earth Engine ownership, local data and recovery remain protected.
- The Universal Editorial Engine utility is retained; former collection and publishing systems remain retired.
- The iOS standalone root-flow and observed cutout haze state remain protected. Do not attempt a haze workaround or modify the iOS root-flow as part of unrelated work.

## Open gates and honest reporting

1. Keep source observation/valid time distinct from retrieval/update time. Upstream NASA/NOAA products may publish partial or delayed coverage; do not fill gaps, synthesize values or confuse identical observation timestamps with new observations.
2. Reconcile the Composition `worlds.json` / assignment-registry mismatch in a separately inspected source patch. Do not alter it in a documentation-only package.
3. Installed-iPhone service-worker activation and online/offline acceptance remain separate from a successful Pages workflow. Report device testing only when it has actually been performed.
4. The combined Wind vector dataset remains future work; the interim paired scalar-grid flow implementation is current behaviour.

## Verification boundaries

The checked-in `Tests/` directory was retired by explicit owner direction. Do not claim an automated regression suite. Report syntax checks, targeted local mocks, ZIP/manifest validation, Actions, Pages and installed-device acceptance as separate evidence. After user upload, verify the extractor run, resulting `main` commit, Actions/Pages and installed-iPhone online/offline behaviour independently.
