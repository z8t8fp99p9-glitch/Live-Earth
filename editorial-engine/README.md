# LIVE // EARTH Universal Editorial System

**Scope:** one shared editorial production system for every content-producing view in LIVE // EARTH.

The browser companion and production Engine intentionally live together in this directory. They execute in different environments and have different responsibilities, but expose one shared editorial system to the application.

## Directory contents

| File | Role |
|---|---|
| `universal-editorial-engine.js` | Browser-side shared output-contract validators and safe helpers. Exposes `window.LiveEarthUniversalEditorialEngine`. |
| `universal_editorial_engine.py` | Python production Engine. Exposes `run_engine(...)` to view Publishers. |
| `requirements.txt` | Pinned dependencies for the Python production Engine and its optional PDF/image output. |
| `README.md` | This shared architecture and integration contract. |

The JavaScript companion does not duplicate the Python implementation. JavaScript validates and safely exposes published outputs to browser views; Python creates feed/PDF artifacts. The two layers remain view-independent.

## Ownership boundaries

- **View database:** each content-producing view owns an independent logical database and its own records/retention rules.
- **Collector:** a view-specific Collector, when required, is the only component allowed to fetch that view's external sources and write to that view's database.
- **Publisher:** each view has its own Publisher. It opens only its own database read-only, supplies its profile/command and bounded output destination, and routes the completed Engine result to that view's publication directory. A Publisher does not browse external sources or write its source database.
- **Universal Editorial Engine:** shared by all Publishers. It does not fetch external sources, open or own databases, own schedules, or write view database records. It produces the requested validated feed and/or self-contained PDF from Publisher-supplied input.
- **Browser companion:** loaded on demand from `./editorial-engine/universal-editorial-engine.js` by browser views that consume editorial publications. Future views reuse the existing global object and validators rather than creating another browser-side Engine.
- **Global PDF Reader:** one view-independent reader opens the completed PDF selected by a calling view and returns to that caller on close. The reader is separate from the Editorial Engine and is not duplicated by Publishers.

## Publisher integration contract

A new view integrates by adding its own Collector (only if it needs external collection), database schema/retention, Publisher profile, Publisher implementation and output directory. Its Publisher calls the shared Python Engine with:

1. a database connection it opened in read-only mode;
2. its own validated view profile and publication command;
3. its bounded output destination and publication time.

The Engine returns completed view output data. The Publisher routes only its configured output types and preserves its previous last-good public output if generation fails. Catalogue and archive handling, when required for a different view, belong to that view's Publisher, not to the shared Engine.

A browser view that reads a published feed loads the shared JavaScript companion and validates the payload against its expected `viewId`. A view that publishes documents may pass a selected PDF to the existing Global PDF Reader when needed.

## Production PDF design standard (shared Engine)

The Python Engine retains optional shared PDF-generation capability for views that require publications. This capability is not enabled for every view.

- **Page geometry:** 420 × 912 PDF points, a tall portrait canvas tuned for fit-to-width reading on contemporary phones.
- **Reading composition:** one column, one page at a time, generous margins, serif editorial headlines, calm sans-serif body text, readable line spacing and printed folios.
- **Traditional magazine rhythm:** cover, printed contents page, feature/report pages, grouped short field notes where appropriate, chronology, editorial note, printed source/credit pages and a closing page.
- **Image handling:** use only eligible local assets supplied by the Publisher; preserve aspect ratio; never stretch or crop a subject merely to fill a frame. The Engine prepares a cached, downsampled PDF copy (maximum 1,800 px on the longest edge) for mobile-sized delivery without modifying the Publisher's source asset. If no eligible local asset exists, use deliberate typography and vector ornament rather than substituting unrelated imagery.
- **Content integrity:** complete Publisher-supplied story bodies are preserved (the Collector's current source-summary bound is 9,000 characters). The magazine-only text normaliser removes known APOD page-navigation boilerplate while retaining the source story and photographer credit; the live-feed summary remains unchanged. Paragraph overflow continues on additional pages; the Engine does not shorten copy to fit a fixed box.
- **Offline and book-like:** source names, URLs, captions and credits are printed as ordinary text. Contents and page numbers are printed, not clickable. No PDF links, annotations, bookmarks, remote assets or reader preferences are added.
- **Quality gate:** validate page geometry/count, extracted text, file size, and absence of PDF annotations/bookmarks before atomically replacing a document output. Failed generation leaves the last-good document untouched.
- **Page target:** a Publisher profile's page target is a guide. Complete stories, legibility and editorial pacing take priority. A 48-page safety ceiling prevents runaway output.

The Engine is deterministic and does not call an AI service. For Live Feeds it receives only the source text permitted by the Global Checker and preserves that approved summary in the feed; it does not fabricate or paraphrase text when a source has restricted summary use. A headline/link-only item can proceed only through an independently approved image route. The Image Engine prepares any fallback illustration before editorial layout, and the Global Checker approves it before the Editorial Engine receives it. The Editorial Engine arranges approved copy and imagery; it does not invent missing reporting or independently corroborate factual claims.

## Current production consumers

### Nature Live Feeds

- Collector: `nature/collector/collector.py`; owns RSS/Atom collection, Commons rights screening and writes only `.publisher-data/nature/nature.sqlite3`.
- Publisher: `nature/publisher/publisher.py`; opens the Nature database read-only, invokes the shared Engine in `live` mode, validates the feed, and publishes only Nature's configured feed/assets/rights metadata.
- Profile: `nature/publisher/profile.json`; database retention and the uncapped rolling Live Feed window are both 32 days.
- Workflow: `.github/workflows/nature-publisher.yml`; hourly at minute 15 UTC and manually dispatchable. Its cache directory and `nature-db-v1-...` key family remain unchanged.
- Browser view: `nature/view/`; requests are `no-store`, the view refreshes every five minutes while open, and the displayed feed is cleared when the view closes. It has no localStorage, sessionStorage or IndexedDB feed persistence.

### Alien World Live Feeds

Alien World is configured for Live Feeds only:

- Collector: `alien-world/collector/collector.py`; it collects official NASA source material, screens source-post imagery and writes only `.publisher-data/alien-world/alien-world.sqlite3`.
- Publisher: `alien-world/publisher/publisher.py`; reads that database read-only, calls `run_engine(...)` with `mode: live`, runs its deterministic contract suite before publication, and accepts only a feed result.
- Profile: `alien-world/publisher/profile.json`; source database retention and the uncapped rolling Live Feed window are both 32 days, with no record-count ceiling; collection refresh target is one hour.
- Public output: `alien-world/published/live-feed.json` only. Alien World does not generate a magazine PDF, catalogue, issue record, latest-publication pointer or archive.
- Workflow: `.github/workflows/alien-world-publisher.yml`; hourly at minute 45 UTC and manually dispatchable. Its cache directory and `alien-world-db-v1-...` key family remain unchanged.
- Browser view: `alien-world/view/`; it reads the completed JSON only, uses `cache: no-store`, refreshes every five minutes while open and clears the displayed feed when closed. It has no localStorage, sessionStorage or IndexedDB feed persistence.

**Automation verification caveat (1 November 2026):** the last observed scheduled Alien World run completed its Collector step (43 entries collected; 45 database records; 5 cached images reused) but the Publisher's contract-test gate failed. One test expects `publishedAt` although the Collector parser returns the raw source date under `published`; this remains the open test correction. The other failure counted `alien-world/published/README.md` as an extra public output. This package moves that documentation to `alien-world/docs/PUBLISHED-OUTPUT.md` and deletes the README from the public-output folder. The Publisher skipped replacement and reported `preservedLastGoodLiveFeed: true`. The hourly workflow is configured, but do not mark end-to-end publication successful until the remaining date-key test is corrected and a later run passes. See the dated project addendum for the run ID and precise status.

## Global architecture rule

**One Universal Editorial System. One Global PDF Reader. Independent view Publishers and databases.** Do not create a new Engine or reader for a future view, and do not merge view-specific data collection or Publisher ownership into the shared Engine.
