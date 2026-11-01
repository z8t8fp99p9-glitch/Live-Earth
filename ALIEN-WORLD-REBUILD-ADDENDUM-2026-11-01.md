# LIVE // EARTH — Alien World folder rebuild

**Date:** 1 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`

## Decision

Rebuild Alien World as a self-contained feature folder using the ownership pattern already proven by Nature. View-owned components are kept together; shared services and the Home/Main application remain shared and unchanged.

## Canonical ownership

- `alien-world/collector/` owns approved NASA source retrieval, source-post image discovery/screening and writes to the Alien World database.
- `.publisher-data/alien-world/` remains the existing runtime database/cache location. No database reset or cache-key change is part of this rebuild.
- `alien-world/publisher/` owns the view-specific profile and the read-only Publisher that commands the shared Universal Editorial Engine.
- `alien-world/published/` owns the public Alien World output.
- `alien-world/view/` owns the Alien World feature controller and browser publication client.
- `alien-world/tests/` owns the deterministic pipeline and architecture tests.
- `alien-world/docs/` contains Alien World workflow guidance.

## Retired duplicate paths

The active legacy paths `data-collection/alien-world/`, `publishers/alien-world/` and `published/alien-world/` are retired after their working contents are placed in the canonical folder. The dated rollback/controller and pre-image-fix Collector snapshots under `recovery/` remain deliberately preserved as historical recovery material.

## Shared systems and protected behaviour

- `editorial-engine/` remains the one shared Universal Editorial Engine.
- `universal-pdf-viewer.js` remains the one shared Global PDF Reader.
- `index.html`, `sw.js`, `update-manager.js`, view managers, Home composition, five primary Orbs and Earth/Sun/Moon/Sky/Location experiences are not redesigned by this rebuild.
- Nature and Magazine remain separate views, folders and owners of their own content behaviour.
- Live feeds are online-only. Only PDFs the owner explicitly saves in the Global PDF Reader are locally available.

## Pipeline contract

The Collector is the only component with external-source access and database write access. The Publisher opens the Alien World database read-only and has no source-network access. The browser view reads completed output only. The GitHub Actions workflow retains `.publisher-data/alien-world/` and commits only `alien-world/published/live-feed.json`.

GitHub requires the workflow file to remain at `.github/workflows/alien-world-publisher.yml`. The repository ZIP importer rejects `.github/`, so workflow replacements are delivered separately for manual replacement.

## Validation scope

The original folder rebuild validation scope includes the Alien World Python regression suite, JavaScript syntax checks, workflow YAML parsing, output JSON validation, exact manifest/hash verification and a path audit. These checks do not replace a deployed GitHub Actions run or on-device verification.

## Superseding decision — Live Feeds only (1 November 2026)

This section records the final product scope after the initial folder rebuild. Where earlier draft notes in this addendum mention retained Alien World magazine PDFs, catalogues or historical issue outputs, those notes are superseded by this decision:

- Alien World publishes **Live Feeds only**. `alien-world/published/live-feed.json` is its only public publication output.
- Alien World does not create a magazine PDF, catalogue, issue record, latest-publication pointer or archive.
- The Collector reads official NASA source feeds and writes only to the separate `.publisher-data/alien-world/alien-world.sqlite3` database. It keeps up to 32 days and is configured for an hourly collection cycle.
- The Publisher reads its database read-only, invokes the shared Engine in `live` mode and rejects any magazine-shaped result.
- The Live Feed shows up to 10 stories from the rolling previous 48 hours.
- The workflow `.github/workflows/alien-world-publisher.yml` is scheduled hourly at minute 45 UTC and also supports manual dispatch.
- The browser view refreshes every five minutes while open, uses `cache: no-store`, does not persist the feed in local browser storage, shows no feed as current offline, and clears its displayed feed when closed.
- The blank Magazine Feature Orb is a separate feature/view. It is not part of Alien World's pipeline and must not be restored into Alien World as a catalogue or magazine section.

The current verified source snapshot and workflow-test caveat are recorded in `LIVE-EARTH-LIVE-FEEDS-ADDENDUM-2026-11-01.md`.
