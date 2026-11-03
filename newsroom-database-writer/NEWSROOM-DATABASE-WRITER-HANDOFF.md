# Newsroom Database Writer — v2 Handoff

- System: LIVE // EARTH Newsroom Database Writer
- Version: 2.0.0
- Input: Checker image-review-complete hand-off, Editorial v2.0.0 package, and post-Editorial Checker v1.0.0 verification report
- Output table: `newsroom_approved_stories` in the matching View's existing Collector-owned SQLite database
- Nature DB: `.publisher-data/nature/nature.sqlite3`
- Alien World DB: `.publisher-data/alien-world/alien-world.sqlite3`
- Only `approvedStoryIds` with individual Checker `PASS` results are persisted; `HOLD` records are excluded
- One Checker-approved Image Engine image is copied into the same View's private cache; it is not made public by the Writer
- The Collector-owned `stories` table is never changed
- Existing database tables are extended additively only; no reset, replacement, `DROP`, or database recreation
- No raw source content or transient evidence excerpts are persisted
- No numerical story-count cap is applied; existing 768-hour/32-day rolling feed window remains

**Publisher adapters:** Nature and Alien World each have a ready `newsroom_publisher.py` entry point. The Global Pipeline Orchestrator must call the matching entry point only after the Writer has committed that View’s approved stories. The active workflow commands will be switched during Orchestrator integration. Scheduled Newsroom activation remains off until the full path is connected and tested end to end.
