# Snapshot format

A published snapshot must include:
- dataset_id
- grid_id and immutable grid-definition version
- variable and units
- valid_time (time represented by the measurement)
- source_published_at (when supplied by provider)
- retrieved_at (UTC)
- source/product/version and licence/attribution
- encoding and nodata representation
- SHA-256 checksum
- validation status and validation notes

Grid definitions are stored once per grid ID. Snapshot values are stored as compact typed arrays or provider-native gridded files; never as one database column per cell. Never publish placeholder or invented measurements.
