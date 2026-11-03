# LIVE // EARTH — View Publisher v2 Newsroom Contract

**Shared production Engine:** Universal Editorial Engine v1.3.0  
**Newsroom DB Writer:** v2.0.0  
**Newsroom image hand-off:** Checker-approved image metadata + SHA-256 verified private cache file

## Publisher responsibilities

Each View keeps its existing Publisher. The additional `newsroom_publisher.py` entry point calls the existing Publisher, then attaches Newsroom images from the same View's existing `newsroom_approved_stories` table.

The Publisher:

1. Reads its own SQLite database through a read-only connection.
2. Uses the shared Universal Editorial Engine to prepare all eligible feed stories in the current configured rolling window.
3. Reads approved Newsroom media rows for that same View and time window; there is no row-count limit.
4. Verifies the private image file against the saved SHA-256 and `mediaId`.
5. Copies the image into that View's own public `published/assets/` directory and adds image URL, credit, caption, source page, rights notice, and licence to the matching feed story.
6. Writes the feed JSON atomically. If the image hand-off fails, the scheduled workflow must fail rather than commit a partly updated publication.

The Publisher does not create or alter Checker decisions, change editorial copy, open the other View's database, write to SQLite, or discover/fetch source websites.

## No post-count cap

Both existing profile files already set these values:

- `maximumStories: 0`
- `adaptiveLookback.targetStories: 0`
- `minimumStories: 0`

Alien World also has `maximumRecords: 0`. The v2 Publisher keeps those settings unchanged. There is no `LIMIT`, `.take(N)`, or fixed-size slice in the new Newsroom database/image hand-off. The existing 768-hour (32-day) rolling feed window is retained.

## Entrypoints

After the Global Pipeline Orchestrator is integrated, the matching Publisher command will be:

```bash
python nature/publisher/newsroom_publisher.py
```

or:

```bash
python alien-world/publisher/newsroom_publisher.py
```

The active `.github/workflows/*.yml` files are intentionally not included in this upload because the repository's ZIP extractor rejects `.github` paths. They should be updated only alongside the Orchestrator, keeping their existing schedules, cache keys, and commit behavior.

## Publication destinations

- Nature: `nature/published/live-feed.json` and `nature/published/assets/`
- Alien World: `alien-world/published/live-feed.json` and `alien-world/published/assets/`

The Newsroom image URL references the matching View's published asset folder. No cross-View path is accepted.
