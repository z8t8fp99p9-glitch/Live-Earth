# Dataset-first current-value migration

## Model
- Dataset identity is globally stable and independent of World assignment.
- World membership is represented by the many-to-many assignment registry.
- Each enabled adapter returns current values for one dataset.
- The collector validates a result and upserts it into the fixed dataset value store.
- Current values replace prior values at the same stable location/key. No per-retrieval collection is retained.

## Value identities
- Global grids: dataset ID plus the fixed grid coordinate/cell layout; the current encoded value matrix is replaced when its valid time advances.
- Sparse samples: stable sample tile or coordinate key.
- Events: source event ID; the current feed replaces the active event set.

## Rollout guardrails
1. Do not enable an unconfigured source.
2. Validate dimensions, coordinate conventions, units, value encoding and checksums before writing a grid.
3. Validate stable record keys and provenance before updating point/event values.
4. Write new values atomically; a failed collection must not damage the previous committed value set.
5. Keep application readers aligned to the same stable value contract.
6. Do not reintroduce retrieval directories, raw payload archives, dated normalized files, run histories or cleanup passes.
