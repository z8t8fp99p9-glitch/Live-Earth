# LIVE // EARTH Universal Data Architecture

## Core rule
Collect by stable dataset identity and store the dataset's current values centrally. World assignments are a presentation/meaning layer, not a collection boundary. A dataset can belong to zero, one or multiple Worlds.

## What this system provides
- One global registry containing all 56 numerical dataset entries.
- Globally stable IDs (`earth.<domain>.<dataset>`) with legacy IDs retained as registry metadata.
- Separate World and many-to-many World/dataset assignment registries.
- Independent source adapters and per-dataset validation.
- One current-value store per dataset. A successful collection updates stable values in place; it does not create a dated copy.

## Current-value storage contract

```text
Data/Central-Database/values/<dataset_id>/metadata.json
Data/Central-Database/values/<dataset_id>/values.bin       # gridded numeric values
Data/Central-Database/values/<dataset_id>/records.jsonl   # point samples or events
```

A dataset uses `values.bin` or `records.jsonl`, never both. `metadata.json` describes that dataset's current values, encoding, dimensions, units, source, observation/valid time and checksums.

- Grid values are stored as one stable encoded numeric field. For the NOAA GFS Atmosphere fields this is the gzip-compressed little-endian int16 value matrix, not a saved provider GRIB response.
- Point observations are keyed by stable sample identity (for example a NASA POWER sample tile) and updated in place.
- Event records are keyed by event ID and represent the source's current rolling feed.
- A failed fetch, validation or storage write leaves the previous committed value set intact.
- No timestamped retrieval folders, raw-source copies, date-partitioned collections, run-history files, snapshot manifests or automatic cleanup jobs are part of this design.

## Collection flow
`Universal Collector → dataset adapter → validation → current-value store → World/View readers`

The hourly GitHub Actions runner is only the scheduler and commit mechanism. It does not perform a separate cleanup pass. Unconfigured registry entries remain disabled; no source or value is invented.

## Data boundaries
Sparse point samples and event feeds must never be presented as complete global rasters. GFS model analysis must be identified as model output, not direct instrument measurements. Keep units, source attribution, source timestamps, retrieval timestamps, coordinate conventions, quality status and checksums with the current dataset metadata.

## Scope
The repository-backed store is hosted in the LIVE // EARTH repository and is not a separate managed database service. The application reads the stable current-value paths directly. Adding a dataset means adding its registry entry, adapter, validation rules and value reader where the relevant World needs one.
