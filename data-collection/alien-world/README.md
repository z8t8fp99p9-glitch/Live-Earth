# Alien World Data Collection

This is the only source-ingestion component for Alien World. It is responsible for external source access, feed parsing, URL/domain/date validation, deduplication, database writes, and screened documentary-image enrichment.

It writes only to `.publisher-data/alien-world/` (the SQLite database and its media folder). It does not generate live-feed JSON, magazines, PDFs, catalogs, or view-facing publication manifests. Run this component before the Publisher in the GitHub Actions job.
