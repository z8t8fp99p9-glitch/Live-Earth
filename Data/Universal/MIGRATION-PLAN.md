# Dataset-first migration plan

## Current state verified from repository files
- Six numerical-world registries contain 56 catalog entries.
- The application also has a separate Atmospheric Composition World. It is included in the World registry but has no numerical dataset assignments yet.
- Existing collector scripts are organized around the six numerical Worlds and write world-specific outputs.
- Existing collectors and workflows are preserved by this package.

## New state
- Global dataset IDs do not encode a World assignment.
- Legacy IDs are retained on every migrated dataset entry.
- World membership is represented only in `world-dataset-assignments.json`.
- Collector jobs are discovered from `collection.enabled` and `adapter_id`, not a hardcoded World list.
- Every dataset job succeeds or fails independently; one failure does not erase another dataset's successful output.

## Rollout guardrails
1. Do not switch the current scheduled workflow to this runner yet.
2. Implement an adapter for one dataset at a time, starting with the six existing collector-backed datasets.
3. Compare raw payload hashes, timestamps, units, record counts and coverage metadata against the existing collectors.
4. Enable a dataset only after its adapter passes source validation and its storage path is verified.
5. Migrate app readers to the central database contract before retiring old world folders.
6. Preserve rollback until the new path has completed successful scheduled runs.

## Not included
- No credentials, private-repository token, hosted database provisioning or workflow secret changes.
- No edits to `.github/workflows`.
- No deletion or relocation of existing world snapshots or collector files.
- No claim that 56 datasets are currently live. Fifty remain unconfigured in the current catalog; the six configured entries are pending first successful publication in their existing system.
