# LIVE // EARTH — View Publisher Integration Handoff

- System: Shared Universal Editorial Engine — View Publisher Newsroom read integration
- Integration version: 1.0.0
- Shared Engine core version: 1.3.0
- Current main baseline inspected before this package: `6cf21dd4ea754c29223646bb7dc70b80e9f6ecc8`
- Input: the matching View database's `newsroom_approved_stories` table, written by Newsroom Database Writer v1.0.0
- Consumer: the existing Nature or Alien World Publisher through its own read-only SQLite handle
- Output: unchanged View-owned Live Feed contract

## Completed in this package

- Shared Engine reads GREEN-approved Newsroom records from the Publisher-supplied read-only handle.
- Nature and Alien World database boundaries are explicitly checked.
- Missing Newsroom table is backward-compatible; the ordinary Collector feed path remains available.
- Schema/provenance failures block publication instead of allowing unverified or cross-View records.
- Approved editorial rows take precedence over matching Collector rows without modifying Collector data.
- Current Newsroom records remain text-only until the separate approved-media hand-off exists.
- Existing Publisher scripts and workflow YAML remain unchanged.

## Not yet completed

- No pipeline automation or end-to-end orchestration was added.
- No app-facing Newsroom UI was changed.
- No project pipeline or end-to-end tests were run, per the project sequence.

## Next stage

Build the Newsroom pipeline orchestration and stage hand-offs so the existing Manager/Collector/Checker/Engine/Writer/Publisher sequence can be invoked in the correct order for each View. Keep the existing View-owned workflows and Publisher ownership boundaries explicit. Run the full staged test programme only after the remaining Newsroom systems are assembled.
