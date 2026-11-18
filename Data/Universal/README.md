# LIVE // EARTH Universal Data Architecture — Phase 1

## Core rule
Collect by **dataset identity**, store centrally, and assign datasets to Worlds afterwards. A World is a presentation/meaning layer, not a collection boundary. This design supports any number of Worlds and many-to-many assignments.

## What this package establishes
- One global registry containing all 56 existing numerical dataset entries.
- Globally stable IDs (`earth.<domain>.<dataset>`) with the old World-scoped IDs retained as `legacy_ids`.
- A separate World registry for the six numerical Worlds plus Atmospheric Composition.
- A separate many-to-many assignment registry. A dataset can belong to zero, one or multiple Worlds.
- Schemas for registry entries and normalized observations.
- A small Python core for registry loading, validation, storage and independent dataset jobs.

## Important implementation boundary
This is the **architecture foundation**, not a claim that all 56 sources are connected. Only six datasets currently have collector code in the existing project, and those sources still need to be adapted and verified against the new adapter contract. The other 50 remain `source_not_configured`. No source is enabled by this package. Existing live collectors, workflows, World controllers and visual files are intentionally untouched in this phase.

## Database boundary
The logical central database contract is defined here independently of its physical backend. This package supplies a repository-backed development store with separate immutable raw payloads, normalized records, metadata and run logs. It is not a hosted database service and does not replace the existing private archive arrangement. Before production data volume is moved, select and configure the production backend and retention policy. Do not store secrets in this repository.

## Storage layout
`Data/Central-Database/raw/<dataset_id>/<retrieval_id>/source.bin`
`Data/Central-Database/normalized/<dataset_id>/<date>/<retrieval_id>.jsonl`
`Data/Central-Database/metadata/<dataset_id>.json`
`Data/Central-Database/runs/<retrieval_id>.json`

Raw payloads are write-once by retrieval ID. Normalized observations preserve both provider observation time and our retrieval time. Failed jobs do not overwrite previous successful records.

## Migration sequence
1. Review this registry and mapping.
2. Implement and test source adapters one dataset at a time.
3. Run old and new collectors in parallel for a validation period without duplicate publishing.
4. Switch the scheduled runner to registry-driven jobs only after parity checks.
5. Retire old world-specific storage only after all consumers have migrated and rollback is proven.

## Safety
No invented values; no automatic enabling of unconfigured sources; preserve units, source URL, licence/attribution, source timestamps, retrieval timestamps, raw hashes and coverage semantics. Sparse point samples and event feeds must never be presented as complete global rasters.
