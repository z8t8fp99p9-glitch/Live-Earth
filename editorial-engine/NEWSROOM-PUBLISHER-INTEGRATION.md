# LIVE // EARTH — View Publisher Newsroom Integration

**Integration version:** 1.0.0  
**Shared Engine core:** Universal Editorial Engine 1.3.0  
**Owner:** Shared Editorial Engine read layer  
**Publisher interface:** View-owned read-only SQLite connection

## Purpose

This additive integration makes GREEN-approved records written by the Newsroom Database Writer available to the matching View Publisher. It uses the read-only database handle already supplied by each Publisher to the shared Universal Editorial Engine.

The shared Engine does not open a database itself, create a table, or write to a View database. It reads only the database handle supplied by the active Publisher.

## View isolation

Each Publisher continues to use its own database:

| View | Database |
|---|---|
| Nature | `.publisher-data/nature/nature.sqlite3` |
| Alien World | `.publisher-data/alien-world/alien-world.sqlite3` |

Before reading, the Engine verifies the database `publisher_meta.view_id` and checks that the legacy `stories` table and the Newsroom table do not contain another View's records. A View mismatch blocks publication rather than mixing data.

## Newsroom table contract

The integration reads `newsroom_approved_stories`, which is created by the Newsroom Database Writer only after a final Global Checker GREEN decision.

The read adapter requires the Writer's registered schema and validates:
- matching View identity and stable story ID;
- canonical HTTPS article URL and HTTPS source feed URL;
- approved headline and editorial summary;
- source-policy, intake-decision and Checker review provenance;
- Checker registry version and review timestamps;
- Universal Editorial Engine core version 1.3.0 and Newsroom adapter version 1.0.0;
- evidence provenance hashes and structured topic metadata;
- absence of raw excerpts, claim text and raw source bodies.

The Newsroom table is never created or altered by the Publisher integration. If it does not exist yet, the Publisher continues using its existing Collector records. If it exists but its schema or records fail validation, publication is blocked and the Publisher's existing last-good output remains the fallback.

## Merge and duplicate handling

The read layer combines:
1. valid GREEN-approved Newsroom records for the active View; and
2. the active View's existing Collector records.

Newsroom records are considered first. When an approved editorial record matches an older Collector row by canonical article URL, or by normalized headline and UTC publication date, the approved editorial record takes precedence. The original Collector row remains unchanged in the database.

The combined list is ordered by publication time and then passed through the View's existing maximum-story setting and 32-day publication window. Existing duplicate suppression is preserved.

## Image handling

The current Database Writer stores image-rights decision metadata but does not hand off a separately validated media asset. Therefore Newsroom-approved records are text-only in this integration. The Publisher rejects any Newsroom row that contains a media URL, local path, caption, credit or rights-status asset field before the explicit asset hand-off stage.

Existing Collector imagery continues through its existing Publisher rights checks. No image rights decision is converted into an invented image URL or local file.

## Output compatibility

The live-feed JSON contract is unchanged:
- same schema version;
- same View and Publisher identifiers;
- same story fields;
- same 32-day publication window.

No additional database fields are exposed in the public feed. The Publisher does not gain write or network access.

## Files and ownership

This stage changes only `editorial-engine/universal_editorial_engine.py` and adds this integration documentation. It does not change:
- either View Publisher script;
- either View's retired Collector;
- the Newsroom Database Writer;
- Global Checker or its policy registries;
- GitHub workflow YAML;
- app UI, Home Page, Moon View, caches or local app data.

## Verification status

The updated shared Engine source was statically syntax-checked and the upload archive/manifest integrity was checked. No project pipeline, Publisher or end-to-end tests were run. Those remain deferred until the remaining Newsroom systems are assembled.
