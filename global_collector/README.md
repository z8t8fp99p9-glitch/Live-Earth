# LIVE // EARTH — Global Collector

**Version:** 1.1.0  
**Architecture:** one universal Collector for every present and future View.

## Purpose

Global Collector receives the immutable job from Global Collection Manager, retrieves the assigned public sources, and returns a transient, structured evidence package to Global Checker.

It does **not** make rights, licence, copyright, attribution, factual, editorial, ranking or publication decisions. It does not discard material because of source permissions. It collects the available source evidence and leaves every permission decision to Global Checker.

The Collector performs only operational safeguards: Manager-job validation, HTTPS/private-network protection, bounded response sizes/time, parsing and deduplication. It never writes a database, invokes another engine, or publishes content.

## Four Collector-owned sections

Every collection batch contains `collectorSections` with exactly four Collector-owned sections. The Manager card is shared by the batch because one Manager job addresses one View; each post references its SHA-256 fingerprint.

| Section | Contents |
|---|---|
| `managerIdCard` | Exact Manager job payload plus SHA-256 integrity fingerprint. The Collector never regenerates or edits any field. |
| `fullArticle` | Original article URL, title, byline, dates, complete text/HTML exposed by the feed/article, and each retrieved page with retrieval evidence. |
| `originalImageRecords` | Every discovered image candidate URL and its source page, caption, alt text, creator, visible credit, licence and metadata. Original files are not downloaded. |
| `sourceRightsEvidence` | Source identity, provenance, feed/page metadata, author details, dates, categories/tags/topics, links, copyright/licence/credit/attribution/rights notices, image-specific rights evidence and raw provider metadata. |

The Collector does not create a fifth `Checks` section. Global Checker owns that section and must add its findings separately without editing or replacing any of the four Collector sections.

## Checker compatibility

The batch also contains the existing `records` array using the unchanged `LIVE_EARTH_UNIVERSAL_POST_V1` **38-field** post schema and the unchanged fixed media schema. This is the Checker-compatible projection of the same collected material; it preserves the current handoff while `collectorSections` gives the material its explicit four-section structure. No extra fields are added to individual 38-field records, because the current Checker validates that schema strictly.

The Collector returns both structures together in the same in-memory batch. It does not persist raw source text, page HTML, image candidates or section data. Global Checker receives the batch and independently decides what can proceed.

## Article and image collection

Supported formats include RSS/RDF/Atom, JSON Feed/common JSON API envelopes, and HTML article pages. HTML extraction reads article/main content, JSON-LD `articleBody`, page metadata, canonical links, continuation links, Open Graph/Twitter image metadata, `<img>`/lazy-load/srcset sources, and JSON-LD ImageObject metadata.

When a feed entry links to an article page, the Collector retrieves that page. It also follows only links identified as article continuations (for example, “Read More” or `rel="next"`), not unrelated links. Continuation traversal stays within the originating site's host family and is bounded to five continuation pages per post and 100 unique article-page fetches per job.

Feed responses are limited to 8 MiB. Each linked article-page response is limited to 2 MiB, 12 seconds and one attempt. These are transport limits, not source-rights filters. Any failure or limit is recorded in retrieval evidence rather than represented as successful collection.

Images are collected as original URLs and metadata only. The Collector does not download image files, substitute similar images, infer documentary status, or approve an image.

## Manager identity and View isolation

The Collector validates the Manager job against the Manager Source Registry, View Profiles and Source-View Assignments. It preserves the exact 15-field Manager ID card in the top-level `job` and in `collectorSections.managerIdCard.payload`; a canonical SHA-256 fingerprint makes accidental changes detectable.

The implementation contains no Nature/Alien World branches, per-View scrapers, per-View image rules or View-specific Collector. The Manager assigns the View and database destination. Global Collector never opens or writes either View database.

## Run

From the repository root:

```bash
python -m global_collector --job-file manager-job.json
```

Use `--job-file -` to read the JSON job from standard input. Output is a JSON collection batch on standard output.

## Boundaries

- One shared Collector, one universal post schema, every View.
- Manager IDs and values are preserved exactly; no identifiers or destinations are regenerated.
- No Global Checker policy files are loaded by Collector.
- No Checker, Image Engine, Editorial Engine, Writer, Publisher or database is invoked by Collector.
- Four Collector sections remain source evidence; Global Checker owns its separate Checks section.
- Raw article data is passed in memory for downstream review; it is not written to SQLite or publication output by Collector.
