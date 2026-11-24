# LIVE // EARTH — Scientific Data Collection

**Current source checkpoint:** 24 November 2026 · `main`  
**Canonical implementation:** `Data/Universal/engine/` and `.github/workflows/live-earth-universal-data-refresh.yml`

## Current registry state

- The Universal registry contains **56** stable dataset entries.
- **26** entries are currently configured/enabled for collection.
- **30** entries remain `source_not_configured`; they are not silently filled, generated or collected through a fallback source.
- Configuration lives in `engine/bootstrap.py`; stable dataset identity and current metadata live in `registry/datasets.json`.

A configured entry means an adapter and source/cadence are defined. It does not guarantee a new observation is published on every run or that upstream data has complete global coverage.

## Scheduled workflow

The active workflow is `.github/workflows/live-earth-universal-data-refresh.yml` (`LIVE // EARTH Universal Data Refresh`). It:

1. Runs automatically hourly at minute 55 UTC (`55 * * * *`).
2. Also supports manual dispatch with an optional refresh reason.
3. Checks out `main`, installs `Data/Universal/requirements.txt`, and runs `python -m Data.Universal.engine.bootstrap`.
4. Runs `python -m Data.Universal.engine.collector`.
5. Commits changed `Data/Universal` and `Data/Central-Database` content through the Actions bot. The separate manifest-validated ZIP extractor is for user-uploaded source/documentation packages, not scientific data cleanup.

Bootstrap configures enabled adapters, source IDs, cadence and data contracts. Collector loads each adapter independently, checks its `is_due()` function when provided, validates dataset identity and provenance, then passes the complete value payload to the storage layer. It attempts all enabled datasets before reporting aggregate failures.

## Latest verified run

Universal Data Refresh run [45303947702](https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/runs/45303947702), run number **41**, completed successfully on 24 November 2026 at 01:18:41 UTC.

| Result | Count | Meaning |
|---|---:|---|
| Updated | 8 | Adapter returned a valid newer/current value set and storage committed it |
| Skipped | 18 | Adapter determined stored values already matched the latest available source cycle |
| Failed | 0 | No dataset adapter/storage failure was reported by this run |

The run updated CO₂, methane, carbon monoxide, dust contribution to PM2.5, land temperature, rainfall, earthquakes and solar radiation. The 18 skipped datasets were not errors; no new source-cycle data was required for those stable values at that run.

## Persisted status versus a run report

`datasets.json` stores each dataset's last persisted collection status. The collector updates that field for a success or failure; it does not rewrite it when `is_due()` skips a dataset. Consequently, a persisted `collector_configured_failed` label can describe a prior attempt even when the latest workflow run reports that dataset as `SKIPPED` and has zero failures.

At this checkpoint, six Ocean datasets retain a prior failed status in the registry, while all six were skipped as already current in run #41. Do not report these as failures of run #41. The workflow run's collector summary is authoritative for that run; the registry status is a per-dataset persisted last-attempt field.

## Current-value storage contract

The store is repository-backed under:

```text
Data/Central-Database/values/<dataset_id>/metadata.json
Data/Central-Database/values/<dataset_id>/values.bin       # numeric grid data
Data/Central-Database/values/<dataset_id>/records.jsonl   # point/event data
```

Each dataset folder contains `metadata.json` and exactly one value representation. Metadata preserves source/provenance, observation or valid time, retrieval/update time, units, coordinate/grid definition, encoding, quality state and integrity checksums.

- Grids are validated for their declared dimensions, geographic ordering, encoding, units and checksums before atomic replacement.
- Record collections use stable sample/event identity. Sparse points and event feeds remain records and must not be presented as continuous global fields.
- A failed fetch, validation or write leaves the previous committed value set intact.
- Successful collection replaces current values at the same stable dataset path. This design has no dated retrieval folders, raw provider-response archive, daily partitions, historical run-value snapshots or separate cleanup workflow.

The Universal architecture and reader cutover contract are also described in [`../Data/Universal/README.md`](../Data/Universal/README.md) and [`../Data/Universal/README-CUTOVER.md`](../Data/Universal/README-CUTOVER.md).

## Scientific and freshness boundaries

- `observed_at` or `valid_time` describes the source observation/forecast validity. `retrieved_at` or `updated_at` describes when this repository retrieved/stored it. They are not interchangeable.
- GFS and GEOS-CF fields are model/forecast products. Do not relabel them as direct satellite or instrument observations.
- A source may publish a partial global field or delay a new cycle. Keep the source's actual time, missing cells and quality state. Do not interpolate, gap-fill, copy another time slice or fabricate measurements to make a globe appear complete.
- A stored validated file proves that source data was fetched and passed the declared grid/storage checks at that time. It does not, by itself, prove the provider is publishing a complete or newer field now.
- View wiring is separate from registry collection configuration. Use the owning controller and its grid reader to confirm that a view actually exposes a dataset.

## Scope and protected boundaries

This pipeline is separate from local IndexedDB user records, `Data/data-recovery.js`, application startup and the retired Universal Editorial Engine publishing systems. Do not add PostgreSQL hosts, accounts, credentials, paid services, raw archives, historical partitions, automatic cleanup routines or unconfigured fallback sources without a separately inspected and approved architecture change.
