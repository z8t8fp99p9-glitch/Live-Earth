# LIVE // EARTH — Working Rules

## Before every task
- Inspect current `main` and record the inspected commit/tree.
- Read the three root project reference documents and the ZIP upload standard.
- Read the matching standard, component README and relevant tests.
- Inspect the actual source and callers; do not rely only on old handoffs.
- Identify the smallest file scope that fulfils the request.

## Protected boundaries
- No unapproved changes to Global Orb behaviour/dependencies.
- Do not merge Moon and Sun implementations.
- Do not change Home composition as a side effect of a different task.
- Do not remove runtime/offline assets without dependency tracing.
- Do not reset databases, IndexedDB, Cache Storage or local data as generic troubleshooting.
- Preserve the retained Universal Editorial Engine core unless the owner explicitly asks to change it.
- Do not reintroduce the removed collection, source-discovery, feed, rights-checking, image-processing, database-writing, Publisher or Magazine systems.
- Do not alter `.github/workflows/` through the ZIP extractor; it protects that directory.

## Documentation rules
- Master documents and ZIP upload standard remain visible at repository root.
- Current reusable rules belong in `docs/standards/`.
- Architecture belongs in `docs/architecture/`.
- Dated, superseded app decisions belong in `docs/history/`.
- Detailed retained component notes remain beside their code.
- Preserve unrelated app history; do not silently erase a decision.

## Tests and reporting
- Run the narrowest relevant tests first, then broader checks when suitable.
- Report exact test names/counts and failures; do not hide failing tests.
- Separate local syntax/tests from GitHub Actions, deployment and iPhone verification.
- Do not claim an Action, commit or deployment succeeded until verified from GitHub.
- Review the final diff for accidental changes to protected files.

## Repository ZIP procedure
Follow the root-level `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md` exactly. Upload one ZIP to the repository root on `main` without unpacking it. The archive must contain its own root `UPLOAD_MANIFEST.json`; include exact payload paths, sizes, SHA-256 values, a task-specific `commitTitle`, and only approved deletions. Check the Action and resulting commit after upload.

## End-of-task continuity
Update the relevant current note and project history when a decision or milestone changes. Preserve what was superseded and state what was actually tested.
