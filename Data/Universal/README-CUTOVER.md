# Universal current-value cutover

## Active collection path
- `engine/bootstrap.py` activates the configured registry entries.
- `engine/collector.py` runs enabled adapters independently.
- Adapters return the current data values and the metadata required to interpret them.
- `engine/storage.py` validates and updates the stable value store.
- World readers and View Controllers read the current values directly.

## Storage
Each dataset has one stable folder under `Data/Central-Database/values/<dataset_id>/` containing `metadata.json` and exactly one value representation: `values.bin` or `records.jsonl`.

A collection run does not write run IDs into paths, preserve source-response copies, create dated data partitions, publish a snapshot manifest or perform cleanup. The collector updates a dataset only after the adapter returns a complete, validated result. Failures do not replace the last good values.

## Atmosphere
The Atmosphere View Controller reads the grid metadata and encoded current grid values directly from the dataset folder. The old published snapshot manifest and raw retrieval folders are retired.

## GitHub Actions
`LIVE // EARTH Universal Data Refresh` remains the single scheduled collector. The `LIVE // EARTH Manifest-Validated ZIP Extractor` remains the user-facing ZIP upload mechanism; it is not a data cleaner. No separate cleaner workflow or automatic removal routine is used.
