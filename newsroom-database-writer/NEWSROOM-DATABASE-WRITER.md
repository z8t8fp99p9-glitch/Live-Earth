# LIVE // EARTH — Newsroom Database Writer

**Version:** 1.0.0  
**Owner:** View-owned Newsroom database stage  
**Accepted input:** Exact output from `global_checker/global_checker_final_review.py`  
**Output:** `newsroom_approved_stories` in the matching View-owned SQLite database

## Responsibility

The Writer is the only Newsroom stage that stores final editorial stories. It accepts only the `approvedStories` array returned by the registered Global Checker Final Review Adapter. Every story must have a matching individual review with:

- `verdict: GREEN`
- `approvedForStorage: true`
- `approvedForPublisher: true`
- the exact same Checker `reviewId`, registry version, View ID and story identity attached to the approved story

The Writer also checks the current Manager Source Registry and Global Checker Registry versions, registered View profile, database identity, database path and Collector-owned database schema before it opens a write transaction.

## Database ownership and isolation

The Writer uses the exact `destinationDatabasePath` registered in `global_collection_manager/config/view-collection-profiles.json`:

| View | Database ID | Database path |
|---|---|---|
| Nature | `nature-sqlite` | `.publisher-data/nature/nature.sqlite3` |
| Alien World | `alien-world-sqlite` | `.publisher-data/alien-world/alien-world.sqlite3` |

The database must already exist and be initialized by its own Collector. The Writer does not create a replacement database, reset data, alter the Collector-owned `stories` table, or open the other View's database.

Approved records are written to a new, separate table named `newsroom_approved_stories`. Nature and Alien World each keep that table inside their own independent database. The two datasets are never combined.

## Stored fields and privacy

The table contains the approved headline and editorial summary, canonical article URL, source identity/link, publication/retrieval times, View identity, source-policy reference, intake decision ID, final Checker review ID/version/timestamp, Editorial Engine versions, topic tags, approved image-rights metadata and evidence provenance hashes.

The Writer deliberately does **not** persist raw article bodies, HTML, transient evidence excerpts, claim text, or raw source text. Evidence provenance retains source references and SHA-256 excerpt hashes only. Image rights approval metadata is not treated as a usable media asset; until a separately approved asset is handed off, the stored story is text-only.

## Idempotency and update rules

- Re-running the same Checker review is idempotent and leaves the existing row unchanged.
- A newer GREEN Checker review for the same story ID and canonical URL may update that approved Newsroom row.
- An older review is ignored.
- A canonical URL assigned to a different story ID, or a story ID assigned to a different URL, blocks the transaction instead of silently merging records.
- Existing Collector `stories` rows are never overwritten by this Writer.
- A failed write transaction is rolled back.

## Command-line use

Run from the repository root after the View Collector has initialized its own database and after final review has completed:

```bash
python newsroom-database-writer/newsroom_database_writer.py \
  --final-review path/to/global-checker-final-review.json \
  --repository-root .
```

The JSON path must point to the exact final-review result. The Writer resolves the target database itself from the active Manager View Collection Profile; a caller cannot supply an arbitrary database path.

## Handoff

Next system: integrate each View Publisher with its own `newsroom_approved_stories` table while keeping the Publisher read-only. That is a separate stage. This Writer does not modify either Publisher, Collector, GitHub workflow YAML, Home Page, Moon View, app cache or local user data.

## Verification status

This package was statically syntax-checked. Project pipeline tests and end-to-end tests were **not** run, in accordance with the project rule to defer tests until all Newsroom systems are built.
