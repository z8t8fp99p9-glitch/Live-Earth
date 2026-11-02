# LIVE // EARTH — Global Collection Manager

**Version:** 0.1.0  
**Status:** First isolated code slice — prepared, not deployed or integrated.

## Purpose

The Global Collection Manager is the global coordination layer above the View-owned collection pipelines. It maintains:

1. Source Registry — the collection catalogue, separate from the Global Checker's source-policy registry.
2. View Collection Profiles — independent collection settings for each collection-owning View.
3. Source-View Assignments — many-to-many source subscriptions with View-specific feed URLs and filters.
4. Scheduler — UTC cadence and manual-refresh authorization rules.
5. Job Dispatcher — creates immutable, View-scoped handoff envelopes for the correct existing Collector.
6. Health & Audit Log — append-only operational/configuration event records.

## Non-negotiable ownership boundaries

- Nature Collector remains the only writer to the Nature database.
- Alien World Collector remains the only writer to the Alien World database.
- This Manager does not fetch source websites, parse feeds, download images, write story records, check rights, edit stories or publish feeds/PDFs.
- The `checkerPolicyRef` field is a reference only. The Global Checker remains the rights/provenance authority.
- Nature and Alien World databases are never merged.
- Magazine is a peer publication owner with a read-only adapter, not a third story Collector. It is deliberately not registered as a collection View in this first slice.
- New collection-owning Views can be added through explicit profiles and assignments; there is no directory scan or automatic View discovery.
- Existing feeds, workflows, schedules, caches and databases are not modified by this package.

## Existing baseline represented

The configuration reflects the current repository profiles inspected on `main`:
- Nature Collector: `nature/collector/collector.py`, Nature-only database, 32-day retention, 768-hour lookback.
- Alien World Collector: `alien-world/collector/collector.py`, Alien World-only database, 32-day retention, 768-hour lookback.
- Existing hourly workflow offsets are preserved as UTC anchor minutes: Nature `15`, Alien World `45`.
- Nature's current source list is used as configured; Phys.org is not re-added.
- Alien World remains NASA-source-only in its current profile.

The Manager's Source Registry is not the Global Checker registry. `checkerPolicyRef` links are informational references only and do not grant permission.

## First-slice execution boundary

This build is intentionally **planning-only**:
- `overview` reads and displays configuration.
- `plan --view nature` or `plan --view alien-world` creates a structured job envelope for the correct existing Collector.
- `plan` does not run the Collector or invoke GitHub Actions.
- No existing workflow is changed or triggered.
- No database is opened, created, migrated, reset or written.
- The next integration stage will connect these envelopes to the existing View-owned Collector entry points only after the remaining newsroom systems are built and the full system is ready for testing.

## Files

- `source_registry.py`
- `profiles.py`
- `assignments.py`
- `scheduler.py`
- `dispatcher.py`
- `health_audit.py`
- `models.py`
- `manager.py`
- `config/*.json`

## Local usage

From the repository root:

```bash
python -m global_collection_manager.manager overview
python -m global_collection_manager.manager plan --view nature
python -m global_collection_manager.manager plan --view alien-world
```

Python module names cannot contain hyphens. For actual invocation, use the underscore package folder name `global_collection_manager`. The repository upload path for this package is `global_collection_manager/`.

## Safety

The Manager fails closed on malformed configuration, unknown IDs, non-HTTPS feed URLs, mismatched assignment URLs, disabled profiles/sources, or unauthorised manual refresh. Runtime audit events are written under `.manager-state/`; they are not source-story records and must not be committed as an archive.
