# Source adapters

Each adapter is a Python module named by `collection.adapter_id` in the master dataset registry. It exposes `collect(dataset)` and returns:

- `raw_payload`: exact provider response bytes (required; never silently rewrite the source payload)
- `raw_metadata`: provider, source URL, licence/attribution, product, format and request context
- `observations`: non-empty normalized records matching `schemas/observation.schema.json`

Every normalized record must include `dataset_id`, `source_id`, timezone-aware `observed_at` and `retrieved_at`, `value`, `unit`, and provenance (`source_url`, `retrieval_id`, `raw_sha256`).

Adapters must validate provider identity, variable, units, dimensions, timestamps and coverage. They must not manufacture values. A sparse regional sample must declare its sparse coverage; an event feed remains events, not a raster. Keep provider-specific parsing inside adapters, not in the universal runner.

No adapters are enabled by this foundation package. Existing collectors are retained unchanged until each is safely ported and parity-checked.
