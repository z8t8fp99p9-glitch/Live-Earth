# LIVE // EARTH Magazine — multi-view foundation

**Initial sources:** Alien World + Nature only  
**Current phase:** read-only source adapter and contract tests  
**Publication:** deliberately deferred until both source live feeds are verified

## What this adds

- A peer `magazine/` module with its own profile and source registry.
- An allowlist that accepts **only** `alien-world` and `nature` for this first release. Clouds, Weather and every other view are explicitly outside scope.
- Read-only access to the two existing Collector databases. No source database is merged, migrated, or modified.
- A temporary in-memory SQLite adapter that presents normalized records to the existing Universal Editorial Engine contract. It is not a persistent third database.
- Balanced round-robin story selection, with verified-image stories considered first within each source.
- Independent image-rights validation: Alien World must pass its existing NASA screened-image contract; Nature must also match its Commons file-page rights row, creator, accepted licence, attribution, local asset and publication URL.
- A generic, transient `magazine-source-rights-verified` marker in the in-memory adapter only. The original source databases retain their own exact rights statuses and notes.

## Important boundaries

The adapter does not collect news, make network requests, write to either source database, invoke the PDF Engine, publish files, update a catalogue, or change the browser view. It is the structural first step only. No new workflow is added in this package.

After Alien World and Nature live feeds have both been tested and verified, a separate Magazine Publisher integration can call `build_source_bundle(...)`, pass its in-memory connection and the Magazine profile/command to `editorial-engine/universal_editorial_engine.py`, then atomically publish the consolidated monthly PDF and retain the latest three editions.

The future PDF-view integration must use the existing global reader with its Magazine no-auto-save policy. This foundation does not change the reader or any existing view's PDF behaviour.

## Local contract tests

From the repository root:

```bash
python -m unittest discover -s magazine/tests -p 'test_*.py' -v
```

The tests use synthetic temporary databases and local placeholder files. They do not access public feeds, the network, production databases or GitHub.
