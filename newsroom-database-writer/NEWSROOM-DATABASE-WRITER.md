# LIVE // EARTH — Newsroom Database Writer v2

**Version:** 2.0.0  
**Input:** Checker-cleared Editorial v2 package plus the post-Editorial Checker verification report  
**Database:** The existing Collector-owned SQLite database for the same View  
**Table:** `newsroom_approved_stories`

## What it does

The Writer accepts only the post IDs in the final Global Checker report's `approvedStoryIds`. Every accepted ID must also have an individual `PASS` result and the unchanged original Checker record. A `HOLD` story is never written. When the Checker returns `PARTIAL`, only individually passed stories are written.

It stores the public editorial fields and the required source/Checker provenance in the existing `newsroom_approved_stories` table. The existing table is extended using additive columns only. Existing rows and schema data are retained.

Image Engine's already Checker-approved JPEG is copied into the matching View's private cache:

- Nature: `.publisher-data/nature/newsroom-assets/`
- Alien World: `.publisher-data/alien-world/newsroom-assets/`

The Writer does not make the staged image public. It stores its `mediaId`, hash, private path, and attribution metadata for the matching Publisher to consume.

## Database boundaries

- Nature uses `.publisher-data/nature/nature.sqlite3` only.
- Alien World uses `.publisher-data/alien-world/alien-world.sqlite3` only.
- The Writer does not open the other View's database.
- The Collector-owned `stories` table is not modified.
- No database is reset, replaced, dropped, or recreated.
- Raw source records, raw article text, HTML, and source-summary evidence excerpts are not persisted.

## Feed count and retention

**There is no numerical post-count cap.** The Writer processes every `approvedStoryId` released by Checker. It does not truncate the batch or apply a `LIMIT`.

The existing Publisher profiles remain unchanged: `maximumStories = 0`, `targetStories = 0`, and the configured minimum is zero. The feed still uses the existing 768-hour (32-day) rolling window. That is the established time-retention window, not a post-count ceiling.

## Python entry point

```python
from newsroom_database_writer import write_verified_editorial_stories

result = write_verified_editorial_stories(
    checker_handoff,
    editorial_package,
    verification_result,
    repository_root=".",
)
```

The future Global Pipeline Orchestrator will pass these in-memory objects directly. The standalone CLI is also available when the three exact JSON hand-offs have been exported:

```bash
python newsroom-database-writer/newsroom_database_writer.py \
  --checker-handoff checker-image-review-complete.json \
  --editorial-package editorial-production.json \
  --verification-result post-editorial-verification.json \
  --repository-root .
```

## Publisher hand-off

The matching View Publisher reads the same View database read-only, obtains every approved Newsroom row in the current rolling window, and copies approved image bytes from the private cache into that View's own `published/assets/` folder. The Publisher adds each image URL and attribution to its corresponding feed story. Nature and Alien World never share databases, assets, or feed output.

The Publisher continues to use the existing Universal Editorial Engine v1.3.0 and the existing View-specific publication rules. No database write is performed by a Publisher.

## Integration status

The Writer and Publisher v2 adapters are built and unit-tested as stage boundaries. The legacy scheduled Newsroom runner still needs the Global Pipeline Orchestrator migration before these stages can be run automatically. Do not activate a scheduled Newsroom step until the Orchestrator passes the exact Checker hand-off, Editorial package, and verification result to this Writer, then invokes the matching Publisher.
