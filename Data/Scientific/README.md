# LIVE // EARTH Scientific Data Store — Phase 1

This is a GitHub-repository-backed **compact file store**, not PostgreSQL. It does not call external APIs or download third-party visualisations.

## How it works
- Scientific CSV files are staged in `Data/Scientific/inbox/`.
- `collector.py` validates provenance, timestamps, numeric values, units and optional coordinates.
- Output is compressed JSON Lines (`.jsonl.gz`), partitioned by world and UTC day.
- Repeated imports are idempotent by dataset + signal + source record key.
- Old partitions are removed after 365 days.
- A 45 MiB published-data ceiling stops publishing before the 50 MB planning ceiling.
- `published/manifest.json` records partition sizes and SHA-256 checksums.

## CSV columns
Required:
`world_id,dataset_key,signal_key,signal_name,observed_at,numeric_value,unit,source_record_key,source_name,source_url,licence,attribution`

Optional:
`latitude,longitude,region_code`

`observed_at` must be ISO-8601 with timezone, e.g. `2026-11-17T12:00:00Z`.
World IDs: `atmosphere`, `oceans`, `land`, `water-ice`, `earth-activity`, `energy-humanity`.

## Source approval
Only stage files after verifying the scientific product, exact file route, access terms, licence, attribution, variables, units, cadence and update policy. Do not put credentials or restricted data in the repository. No sources are pre-approved by this framework.

## Important GitHub storage note
This workflow creates versioned Git files. Deleting an old partition from the current tree does **not** erase earlier Git history. Therefore monitor repository growth; if historical Git objects become large, move data storage to a separate repository/store. The 45 MiB limit measures current published partitions, not the complete Git history.

## Run
GitHub Actions can run manually or daily. It will report zero records until approved CSV files are placed in `inbox/`. This is deliberate: no invented or unverified measurements are generated.


**Scheduling status:** not enabled. The repository ZIP importer blocks `.github` files, so this ZIP does not contain or install a scheduled Actions workflow.
