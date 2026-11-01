# LIVE // EARTH — Alien World folder rebuild

**Date:** 1 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`

## Decision

Rebuild Alien World as a self-contained feature folder using the ownership pattern already proven by Nature. View-owned components are kept together; shared services and the Home/Main application remain shared and unchanged.

## Canonical ownership

- `alien-world/collector/` owns approved NASA source retrieval, source-post image discovery/screening and writes to the Alien World database.
- `.publisher-data/alien-world/` remains the existing runtime database/cache location. No database reset or cache-key change is part of this rebuild.
- `alien-world/publisher/` owns the view-specific profile and the read-only Publisher that commands the shared Universal Editorial Engine.
- `alien-world/published/` becomes the only public Alien World output folder. Existing published JSON and PDF editions are retained and their public URLs point to this folder.
- `alien-world/view/` owns the Alien World feature controller and browser publication client.
- `alien-world/tests/` owns the deterministic pipeline and architecture tests.
- `alien-world/docs/` contains Alien World workflow guidance.

## Retired duplicate paths

The active legacy paths `data-collection/alien-world/`, `publishers/alien-world/` and `published/alien-world/` are retired after their working contents are placed in the canonical folder. The dated rollback/controller and pre-image-fix Collector snapshots under `recovery/` remain deliberately preserved as historical recovery material.

## Shared systems and protected behaviour

- `editorial-engine/` remains the one shared Universal Editorial Engine.
- `universal-pdf-viewer.js` remains the one shared Global PDF Reader.
- `index.html`, `sw.js`, `update-manager.js`, view managers, Home composition, five primary Orbs and Earth/Sun/Moon/Sky/Location experiences are not redesigned by this rebuild.
- Nature and Magazine folders, code, workflows, databases and outputs are not modified.
- Live feeds/catalogues remain online-only. Only PDFs the owner explicitly saves in the Global PDF Reader are locally available.

## Pipeline contract

The Collector is the only component with external-source access and database write access. The Publisher opens the Alien World database read-only and has no source-network access. The browser view reads completed output only. The GitHub Actions workflow retains `.publisher-data/alien-world/` and commits only `alien-world/published/`.

GitHub requires the workflow file to remain at `.github/workflows/alien-world-publisher.yml`. The repository ZIP importer rejects `.github/`, so the workflow replacement is delivered separately for manual replacement before the next scheduled/manual run.

## Validation scope

The package is validated with the Alien World Python regression suite, JavaScript syntax checks, workflow YAML parsing, output JSON validation, exact manifest/hash verification and a path audit. These checks do not replace a deployed GitHub Actions run or on-device verification.
