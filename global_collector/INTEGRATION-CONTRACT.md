# Global Collector — four-section handoff contract

## Pipeline

`Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → Post-Editorial Global Checker → Global Newsroom Database Writer → View Publisher`

There is one View-independent Collector. Nature, Alien World and future Views are Manager profiles and source assignments, not separate Collector implementations.

## Collector output

The batch contains:

1. `collectorSections.managerIdCard` — exact Manager job payload plus SHA-256 fingerprint.
2. Per-post `fullArticle` — collected source text/HTML, original article URL and page-by-page retrieval evidence.
3. Per-post `originalImageRecords` — all discovered image URLs and source-provided image metadata; no image file download.
4. Per-post `sourceRightsEvidence` — all available source, author, date, rights, copyright, licence, credit, attribution, link, provenance and provider metadata.

Collector does not create a Checks section. Global Checker owns that fifth section and may append its own assessment without changing the previous four sections.

For compatibility, the batch also retains the exact existing `records` array and the 38-field `LIVE_EARTH_UNIVERSAL_POST_V1` record schema. This is a projection of the same collected information; individual Checker records receive no extra top-level keys. The current Checker strictly validates this record shape.

## Retrieval

- Parse RSS/RDF/Atom, JSON and HTML.
- Retrieve the linked article page where available.
- Follow only explicit continuation candidates (for example, “Read More” and `rel="next"`), not general related links.
- Stay within the originating site's host family.
- Maximum 5 continuation pages per post; maximum 100 unique article-page fetches per Manager job.
- 2 MiB and 12 seconds per linked page, one attempt. Record fetch failures and limits as evidence.
- Extract original image URLs from feed media, Open Graph/Twitter metadata, HTML image/lazy-load/srcset elements and JSON-LD ImageObjects.
- Preserve exposed source rights metadata without interpreting it. Do not download image files.

## Ownership

- Collector: collection, structure, Manager lineage, provenance and source-evidence preservation only.
- Global Checker: all rights, licence, attribution, provenance and use-permission decisions; owns the Checks section.
- Later stages: use only what the Checker explicitly clears.

## Isolation and persistence

Collector returns an in-memory batch only. It does not write a database, change a View database, persist raw source text, invoke another engine or publish material. All Manager identity and destination fields are copied exactly. No View-specific Collector code or branch is permitted.
