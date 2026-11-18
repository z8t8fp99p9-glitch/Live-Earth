# Atmosphere data store

Independent latest-snapshot store for this world.

- Registry: `registry/datasets.json`
- Current data: `latest/`
- Snapshot manifest: `manifest.json`

Only verified provider data may be written here. Each published snapshot must record source, source timestamp, retrieval timestamp, units, grid definition/ID, encoding, checksum, and quality status. A new snapshot replaces the previous latest pointer only after validation succeeds.
