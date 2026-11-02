# Newsroom Database Writer — Handoff

- System: LIVE // EARTH Newsroom Database Writer
- Version: 1.0.0
- Input: Global Checker Final Review Adapter v1.0.0 output
- Output table: `newsroom_approved_stories`
- Database owner/path: active View's exact Manager-registered Collector-owned SQLite database
- Nature database: `.publisher-data/nature/nature.sqlite3`
- Alien World database: `.publisher-data/alien-world/alien-world.sqlite3`
- No database reset or replacement
- No modification to Collector-owned `stories` records
- No raw source bodies, HTML, evidence excerpts or claim text persisted
- No Publisher, Collector, workflow YAML, app UI, Home Page or Moon View changes
- No tests run; tests remain deferred until all Newsroom systems are assembled

**Next required stage:** View Publisher integration. Each Publisher must read its own approved Newsroom table as well as the permitted existing View stories, without gaining database write access. The Publisher must continue to use its own database identity check and its existing Live Feed output contract.
