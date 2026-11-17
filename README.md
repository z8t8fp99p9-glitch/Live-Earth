# LIVE // EARTH — Six GitHub Data Stores

These are six independent logical databases stored as repository files. They are not six hosted database servers.

Each database has:
- `registry/datasets.json`: dataset IDs and names
- `latest/`: latest verified snapshot files (empty until a collector successfully publishes data)
- `manifest.json`: current snapshot pointers and provenance
- `README.md`: storage contract

## Important
No measurements are fabricated in this package. Empty `latest/` folders mean no live data has been ingested yet.
The existing ZIP upload workflow blocks `.github/workflows` changes. The companion workflow file must be installed separately at `.github/workflows/live-earth-scientific-refresh.yml` before scheduled collection can run.
