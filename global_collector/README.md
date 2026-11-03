# LIVE // EARTH — Global Collector

**Version:** 1.0.0  
**Architecture:** one View-agnostic collector, one universal post schema, shared by every present and future View.

## Responsibility

Global Collector is an information-intake system. It receives a job from Global Collection Manager, retrieves the assigned sources, extracts the information those sources provide, and emits a consistently structured batch for the next system.

**It does not judge content.** It does not approve or reject sources, posts, authors, images, text, licences, copyright notices or publication eligibility. It does not summarize, rewrite, moderate, rank, editorialize or make legal decisions. Any credit, licence, copyright, attribution or restriction information exposed by a source is collected as metadata and passed through as evidence. Global Checker remains separate and makes its own downstream decisions.

The only checks here are operational: validate the Manager job and its routing, use HTTPS, reject private-network destinations, bound response size/time/retries, and parse the returned data safely. These are transport and job-integrity safeguards, not content judgements.

## One universal post format

Every post, from every source and every View, has the exact same **38 top-level fields**. No source or View gets its own record structure. When a source does not provide a value, the field remains empty (`""`, `[]`, `{}` or `null` as appropriate). Original source-specific fields are also retained in `sourceMetadata` so the common format does not discard extra information.

| # | Universal field | Information collected |
|---:|---|---|
| 1 | `schemaVersion` | Record schema version |
| 2 | `postId` | Stable Collector identity |
| 3 | `sourcePostId` | Source's original item ID/GUID |
| 4 | `viewId` | Manager-assigned destination View |
| 5 | `sourceId` | Manager source identity |
| 6 | `sourceName` | Source display name |
| 7 | `sourcePlatform` | Platform/site when exposed |
| 8 | `sourceType` | Registered connector hint |
| 9 | `sourceFeedUrl` | Assigned source endpoint |
| 10 | `sourceWebsiteUrl` | Source website |
| 11 | `originalUrl` | Original post/article URL |
| 12 | `canonicalUrl` | Canonical URL when exposed |
| 13 | `title` | Headline/title |
| 14 | `subtitle` | Subtitle/deck |
| 15 | `summary` | Description/abstract/summary |
| 16 | `excerpt` | Teaser/excerpt |
| 17 | `fullText` | Available plain text |
| 18 | `fullTextHtml` | Available HTML content |
| 19 | `authorName` | Author/byline |
| 20 | `authorId` | Author identity |
| 21 | `authorUrl` | Author page |
| 22 | `contributors` | Additional authors/contributors |
| 23 | `publishedAt` | Original publication date/time |
| 24 | `updatedAt` | Source update date/time |
| 25 | `collectedAt` | Collector retrieval time |
| 26 | `language` | Language/locale |
| 27 | `categories` | Source categories |
| 28 | `tags` | Source tags/keywords |
| 29 | `topics` | Source topics/subjects |
| 30 | `location` | Place/address/coordinates when supplied |
| 31 | `media` | Images, video, audio and embedded media |
| 32 | `attachments` | Documents and other files |
| 33 | `links` | Related/canonical/source links |
| 34 | `engagement` | Views, reactions, likes, shares, comments and exposed metrics |
| 35 | `rightsMetadata` | Source-provided credit, author, licence, copyright and rights notices — no verdict |
| 36 | `provenance` | Discovery and retrieval trail |
| 37 | `sourceMetadata` | Original provider-specific fields/data |
| 38 | `collectionContext` | Manager job, assignment and View context |

Every `media` and `attachments` item uses one fixed structure containing the original 21 media-information fields plus 10 lineage fields (`postId`, `viewId`, `sourceId`, `jobId`, `profileId`, `assignmentIds`, `idempotencyKey`, `configVersion`, `destinationDatabaseId`, and `destinationDatabasePath`): `mediaId`, `mediaType`, `url`, `originalUrl`, `thumbnailUrl`, `title`, `caption`, `altText`, `creator`, `credit`, `licenseName`, `licenseUrl`, `rightsNotice`, `mimeType`, `width`, `height`, `durationSeconds`, `fileSizeBytes`, `sourcePage`, `position`, and `metadata`.

## Supported public response formats

The Collector detects and parses:

- RSS, RDF/RSS and Atom feeds, including feed summaries, full-content extensions, enclosures, categories, authors and media metadata.
- JSON Feed and common public JSON/API response envelopes (`items`, `posts`, `articles`, `entries`, `results`, `data` and `records`).
- HTML pages/posts, including title and description metadata, Open Graph/Twitter metadata, canonical links, article text, JSON-LD Article data, images, media and document links. When a feed/API item links to a public HTTPS post page, the Collector also attempts bounded page enrichment (up to 100 unique article pages per Manager job) and merges the extra information into the same universal record.

These are shared format adapters, not View-specific collectors. All adapters output the same 38-field record. Authenticated/private APIs that require credentials are not enabled by this package; they need a secure source connector and credential handoff before use.

## Manager handoff

The Collector consumes all Manager fields: `jobId`, `idempotencyKey`, `viewId`, `profileId`, `assignmentIds`, `sourceIds`, `feedUrls`, `collectorEntrypoint`, `collectorWorkflow`, `destinationDatabaseId`, `destinationDatabasePath`, `scheduledAt`, `requestWindowHours`, `configVersion` and `trigger`.

It validates the job against the Manager's source catalogue, View profiles and source-View assignments only. It does **not** load Global Checker policy files. The full Manager job and routing destination are retained in the batch. The job's `viewId` is carried unchanged; every new View uses this same Collector without a View-specific Python branch.

## Boundaries

- One Manager job is for one View, as currently issued by Manager; the Collector implementation itself contains no Nature/Alien World branching or allowlist of View names.
- Every current and future View uses this one Collector and the identical universal post format.
- The Collector never opens or writes SQLite databases. It returns a collection batch with the View's destination attached; a later handoff/persistence component owns the write.
- The Collector does not invoke workflows, Global Checker, Editorial Engine, Image Engine or Publishers.
- No content is discarded because of rights, editorial quality, topic, source status or publication suitability. The Manager's explicitly configured request time window and per-assignment item limit are honoured.
- Duplicate discoveries of the same source item are merged while source/feed provenance and additional source metadata are retained.

## Run

From the repository root:

```bash
python -m global_collector --job-file manager-job.json
```

Use `--job-file -` to read the JSON job from standard input. Output is the universal collection batch on standard output. No database is modified and no GitHub workflow is triggered.

## Safety and limits

Public HTTPS only; private-network and loopback destinations are rejected. Each source response is limited to 8 MiB by default (safe configurable code range 1 KiB–16 MiB), 20 seconds per feed request, with at most two retries. Linked article-page enrichment is capped at 2 MiB, 12 seconds, one attempt per page, and 100 unique pages per Manager job. Unsupported or malformed source responses are reported while other assigned sources continue. A transport failure does not create a made-up post.

## Testing

The included tests cover Manager-envelope fingerprint compatibility, arbitrary future View IDs, universal schema stability, RSS/Atom parsing, JSON responses, HTML metadata/article extraction, media normalization and the absence of any Global Checker dependency in Collector validation.


### Persistent ID lineage

Every post carries the complete Manager job identity and routing context in `collectionContext`: `jobId`, `idempotencyKey`, `viewId`, `profileId`, `assignmentIds`, `sourceIds`, `feedUrls`, `collectorEntrypoint`, `collectorWorkflow`, `destinationDatabaseId`, `destinationDatabasePath`, `scheduledAt`, `requestWindowHours`, `configVersion`, and `trigger`. Every media and attachment item carries its parent `postId` plus the relevant post/job/View/source/profile/assignment/configuration/destination IDs. These values are copied from the validated Manager job and are not regenerated by the Collector.
