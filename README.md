# LIVE // EARTH

LIVE // EARTH is a modular web application and Progressive Web App. This repository contains the application shell, view controllers, shared rendering systems, reusable Global engines, runtime assets, tests and documentation.

## VERY VERY IMPORTANT — read before working

1. [`VERY-VERY-IMPORTANT-MASTER-CONTINUITY.md`](VERY-VERY-IMPORTANT-MASTER-CONTINUITY.md) — project history, current position and safe working sequence.
2. [`VERY-VERY-IMPORTANT-GLOBAL-STANDARDS.md`](VERY-VERY-IMPORTANT-GLOBAL-STANDARDS.md) — protected Orb, view and shared-engine standards.
3. [`VERY-VERY-IMPORTANT-PROTECTED-DECISIONS.md`](VERY-VERY-IMPORTANT-PROTECTED-DECISIONS.md) — changes that require explicit owner approval.
4. [`ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md`](ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md) — mandatory ZIP upload procedure. This file stays at the repository root.

## Documentation

Start at [`docs/INDEX.md`](docs/INDEX.md). It points to current status, architecture, standards and the consolidated project history.

## Main repository areas

| Area | Purpose |
|---|---|
| Root application files | App shell, navigation, view lifecycle and rendering |
| `editorial-engine/` | Shared Universal Editorial System |
| `global_collection_manager/` | Global source assignment and job creation |
| `global_collector/` | One shared source-intake Collector |
| `global-checker/` | Shared rights/provenance checks and append-only Checker stages |
| `image-engine/` | Shared image-processing stage |
| `newsroom-database-writer/` | Shared, View-isolated approved-story persistence |
| `runtime-assets/` | Runtime/offline assets |
| `tests/` and component `tests/` | Regression and integration tests |
| `recovery/` | Recovery instructions and rollback material |
| `docs/` | Current guidance, standards, architecture and history |

## Important current boundary

Nature and Alien World collection/publishing Views are retired. Their old pipeline notes are historical records, not live subscriptions. The Global Manager, Collector, Checker, Image Engine, Editorial Engine and generic Newsroom Database Writer remain reusable shared capabilities; the Manager's current source catalogue, View assignments, profiles and schedules are empty.

This documentation update does not modify application code, engine code, tests, workflow YAML, databases or runtime assets.
