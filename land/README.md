# Land data view

This World reads its current dataset values from the shared Universal Central Database.

- Dataset registry: `registry/datasets.json`
- World assignment: `Data/Universal/registry/world-dataset-assignments.json`
- Current values: `../Data/Central-Database/values/earth.land.land_temperature/`
- World manifest: `manifest.json`

The manifest points to one stable current-value partition. Successful collection replaces that partition in place; this World does not keep provider-response archives, dated retrieval folders, or per-run snapshots. Observation time and retrieval/update time remain in the dataset's `metadata.json` as provenance for the current values.
