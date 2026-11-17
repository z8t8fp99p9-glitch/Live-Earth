# LIVE // EARTH — Scientific Data Collection Phase 1

## Delivered
- GitHub Actions manual + daily collection runner.
- Offline/local-file collector: no external API or network source calls.
- Six-world validation, provenance requirements, numeric and coordinate checks.
- Compressed JSONL daily partitions and SHA-256 manifest.
- Idempotent merge and 365-day partition retention.
- 45 MiB active published-data guardrail.

## Not yet delivered / deliberately not claimed
- No live PostgreSQL host or connection.
- No scientific source has been activated in this package.
- No measurements are fabricated.
- No view is wired to these partitions yet.
- Git history is not bounded by the active-data retention rule.

## Next phase
Verify each candidate dataset's official bulk-download product, current route, terms/licence, attribution, units, cadence and file schema. Then add a small source-specific converter and a real sample file for each approved dataset. Connect view controllers only after the data format and update cadence have been tested.


## GitHub ZIP-import compatibility
The repository's ZIP importer explicitly rejects every `.github` path. Therefore this package intentionally does not install a GitHub Actions workflow. The collector is a validated ingestion utility and folder contract only; scheduled collection is NOT active. A separate, owner-approved change to the protected workflow is required before scheduling.
