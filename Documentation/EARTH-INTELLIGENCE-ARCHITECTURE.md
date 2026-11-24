# LIVE // EARTH — Universal numerical data architecture

## Current model

LIVE // EARTH uses a repository-backed Universal current-value store for scientific datasets. This is not a provisioned PostgreSQL service. The six original numerical data Worlds share one dataset registry and current-value storage contract: Atmosphere, Oceans, Land, Water & Ice, Earth Activity, and Energy & Humanity.

Atmospheric Composition is a separate seventh numerical-style Stacks view. It is not counted as a seventh original database World, but its seven controller options read verified datasets from the same Central Database current-value store.

## Registry and collection boundary

- `Data/Universal/registry/datasets.json` defines 56 stable dataset IDs (`earth.<domain>.<dataset>`). A dataset's identity is independent of the World or view that presents it.
- At the 24 November 2026 source checkpoint, 26 entries are configured/enabled for collection and 30 remain `source_not_configured`.
- `worlds.json` describes the original six Worlds and the separate Atmospheric Composition view. `world-dataset-assignments.json` defines the World-to-dataset presentation relationship.
- Source adapters are selected per configured dataset. The collection bootstrap owns the configuration; the collector processes enabled datasets independently. A failed adapter does not prevent other enabled datasets from being attempted.
- The Universal collector workflow is hourly and manually dispatchable. It activates configured registry entries, runs adapters, validates their output and provenance, then commits changed Universal registry and Central Database files.

Current schedule, the latest run result and persisted-status semantics are maintained in [`SCIENTIFIC-DATA-COLLECTION.md`](SCIENTIFIC-DATA-COLLECTION.md).

## Current-value storage contract

Each stored dataset has one stable folder:

```text
Data/Central-Database/values/<dataset_id>/metadata.json
Data/Central-Database/values/<dataset_id>/values.bin       # numeric grid
Data/Central-Database/values/<dataset_id>/records.jsonl   # point samples or events
```

A dataset uses `values.bin` or `records.jsonl`, not both. `metadata.json` records the dataset identity, source/provenance, observation or valid time, retrieval/update time, units, grid/record definition, quality state and checksums.

- Numeric grids are decoded/validated before storage. Atmosphere and Atmospheric Composition global grids use 1440 × 721 cells and the declared encoded value format.
- Sparse point samples and event feeds remain records; they must not be represented as continuous global rasters.
- Storage uses stable per-dataset paths and atomic replacement. A failed fetch, validation or write leaves the last committed values intact.
- A successful collection updates current values in place. The design does not retain raw provider payloads, dated retrieval folders, per-run value snapshots, date-partitioned observations or a parallel cleanup job.
- `observed_at`/`valid_time` and `retrieved_at`/`updated_at` describe different events. Source delays and incomplete upstream publication are not repaired by interpolation or gap filling.

## Source and scientific meaning

- Atmosphere's four controls map to five NOAA GFS dataset IDs: temperature, pressure, wind speed/direction and relative humidity.
- Atmospheric Composition maps seven independent layers to NOAA GFS and NASA GEOS-CF v2 model products. The source/model level and units are part of each field's meaning; model output must not be described as direct satellite or instrument measurements.
- Oceans uses configured NOAA/NASA product adapters and source-specific grids/cadences. A configured source is not a guarantee that every upstream cycle is newly published at each hourly run.
- Land temperature, rainfall, earthquakes and solar radiation have configured sparse/event current-value adapters. Do not promote six point-sample records or a rolling event feed as a complete global surface.

The exact Composition field meanings and units are in [`ATMOSPHERIC-COMPOSITION-DATA.md`](ATMOSPHERIC-COMPOSITION-DATA.md). Atmosphere's five identifiers/four controls are in [`ATMOSPHERE-FOUR-FIELD-UNIVERSAL-CONNECTION.md`](ATMOSPHERE-FOUR-FIELD-UNIVERSAL-CONNECTION.md).

## Known World-assignment metadata mismatch

At the reviewed checkpoint, `worlds.json` marks `atmospheric_composition` as `active_no_dataset_assignments`, while `world-dataset-assignments.json` assigns all seven Composition dataset IDs to `world_id: "atmosphere"`. The Composition controller declares and loads the seven IDs directly, so this mismatch does not prevent its current direct value-reader path from working. It remains a registry consistency issue requiring a separately scoped and validated source change. Do not silently correct it through documentation or assume the assignment registry already represents the separate Composition view.

## Application boundary

Each numerical-style Stacks controller owns its view's presentation, controls, scene/camera/renderer lifecycle, dataset selection and cleanup. It reuses the shared Earth Engine globe factory and, when needed, the Universal Grid System and GPU Grid Skin. The shared Stacks runtime owns the catalogue, activation lifecycle, stage and dock. Atmosphere, Oceans and Atmospheric Composition use globe-first presentation and suppress the generic preview stage; this does not give any controller a second navigation manager or a second global Earth scene.

Home/Prime Earth, Moon, Sun, Location privacy, Startup Essentials, local IndexedDB/recovery and shared navigation remain separate protected systems. See [`STACKS-FEATURE-VIEWS.md`](STACKS-FEATURE-VIEWS.md) and [`NUMERICAL-WORLD-GRID-SKIN-LIFECYCLE.md`](NUMERICAL-WORLD-GRID-SKIN-LIFECYCLE.md).
