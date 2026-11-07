# LIVE // EARTH — Documentation Index

This folder is the front door for project documentation. Use it before opening older dated notes.

## Read in this order

1. [Current status](CURRENT-STATUS.md) — active, retired and protected systems.
2. [Architecture map](ARCHITECTURE.md) — how the app and shared modules fit together.
3. [Working rules](WORKING-RULES.md) — safe change, testing and upload rules.
4. [History index](HISTORY-INDEX.md) — where older decisions and handoffs are recorded.

## Current technical references

| Topic | File |
|---|---|
| Sun/Moon separation | `SUN-MOON-INDEPENDENT-VIEWS-2026-11-06.md` |
| Sun amber upload details | `README-SUN-AMBER-UPLOAD.md` |
| Global Checker standard | `GLOBAL-CHECKER-STANDARD-2026-11-02.md` |
| Global Image Engine / Checker architecture | `GLOBAL-IMAGE-ENGINE-CHECKER-ARCHITECTURE.md` |
| Editorial text upgrade | `EDITORIAL-TEXT-UPGRADE.md` |
| ZIP upload rules | `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md` |
| Recovery and rollback | `recovery/README.md` and `recovery/README-ROLLBACK.md` |

## How to read the older root-level notes

The repository accumulated dated notes during implementation. They are not all current instructions. Use `HISTORY-INDEX.md` to distinguish retired-view records, earlier newsroom wiring, continuity records and completed handoffs.

Do not move or delete a historical note merely to make the root look cleaner. First check whether another file links to it and whether it contains a decision that has not been preserved elsewhere.

## Folder guide

- `docs/` — current navigation and project guidance.
- `editorial-engine/` — Universal Editorial Engine implementation and contracts.
- `global-checker/` — shared rights, provenance and validation checks.
- `global_collection_manager/` — shared job and assignment manager.
- `global_collector/` — shared collection implementation.
- `image-engine/` — shared image processing and image engine code.
- `newsroom-database-writer/` — generic shared persistence/writer implementation.
- `runtime-assets/` — offline/runtime image assets; preserve unless specifically tasked.
- `tests/` — app and integration tests.
- `recovery/` — rollback snapshots and recovery instructions.
