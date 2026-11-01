# LIVE // EARTH Universal Editorial System

**Scope:** one shared editorial production system for every content-producing view in LIVE // EARTH.

The browser companion and production Engine intentionally live together in this directory. They execute in different environments and have different responsibilities, but expose one shared editorial system to the application.

## Directory contents

| File | Role |
|---|---|
| `universal-editorial-engine.js` | Browser-side shared output-contract validators and safe helpers. Exposes `window.LiveEarthUniversalEditorialEngine`. |
| `universal_editorial_engine.py` | Python production Engine. Exposes `run_engine(...)` to view Publishers. |
| `requirements.txt` | Pinned dependencies for the Python production Engine and its PDF/image output. |
| `README.md` | This shared architecture and integration contract. |

The JavaScript companion does not duplicate the Python implementation. JavaScript validates and safely exposes published outputs to browser views; Python creates the feed/PDF artifacts. The two layers remain view-independent.

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

The Engine returns completed view output data. The Publisher routes those outputs and updates that view's catalogue atomically. The Publisher must preserve its previous last-good public output if generation fails.

A browser view that reads a published feed or catalogue loads the shared JavaScript companion and validates the payload against its expected `viewId`. It then passes a selected PDF to the existing Global PDF Reader when needed.

## Production PDF design standard (Engine 1.1.0)

The Python Engine now composes a single, fixed-layout, phone-first portrait PDF. It is a designed magazine, not a website export or an interactive reader UI.

- **Page geometry:** 420 × 912 PDF points, a tall portrait canvas tuned for fit-to-width reading on contemporary phones.
- **Reading composition:** one column, one page at a time, generous margins, serif editorial headlines, calm sans-serif body text, readable line spacing and printed folios.
- **Traditional magazine rhythm:** cover, printed contents page, feature/report pages, grouped short field notes where appropriate, chronology, editorial note, printed source/credit pages and a closing page.
- **Image handling:** use only eligible local assets supplied by the Publisher; preserve aspect ratio; never stretch or crop a subject merely to fill a frame. The Engine prepares a cached, downsampled PDF copy (maximum 1,800 px on the longest edge) for mobile-sized delivery without modifying the Publisher's source asset. If no eligible local asset exists, use deliberate typography and vector ornament rather than substituting unrelated imagery.
- **Content integrity:** complete Publisher-supplied story bodies are preserved (the Collector's current source-summary bound is 9,000 characters). The magazine-only text normaliser removes known APOD page-navigation boilerplate while retaining the source story and photographer credit; the live-feed summary remains unchanged. Paragraph overflow continues on additional pages; the Engine does not shorten copy to fit a fixed box.
- **Offline and book-like:** source names, URLs, captions and credits are printed as ordinary text. Contents and page numbers are printed, not clickable. No PDF links, annotations, bookmarks, remote assets or reader preferences are added.
- **Quality gate:** validate page geometry/count, extracted text, file size, and absence of PDF annotations/bookmarks before atomically replacing the output. Failed generation leaves the last-good issue untouched.
- **Page target:** a Publisher profile's page target is a guide. Complete stories, legibility and editorial pacing take priority. A 48-page safety ceiling prevents runaway output.

The Engine is deterministic and does not call an AI service. It arranges Publisher-supplied copy and screened local imagery. It does not rewrite stories, invent missing reporting or independently corroborate factual claims.

## Current Alien World implementation

Alien World is the first production consumer of the shared system:

- `alien-world/collector/collector.py` collects approved NASA sources and writes only the Alien World database.
- `alien-world/publisher/publisher.py` reads that database read-only, invokes `run_engine(...)`, and routes the completed output.
- `alien-world/publisher/profile.json` defines Alien World source policy, editorial rules and publication settings.
- `alien-world/published/` stores the completed Alien World feed, catalogue and magazine PDFs.
- `alien-world/view/alien-world-view-controller.js` loads `alien-world/view/alien-world-publisher-client.js` on demand. Its public Engine global remains `window.LiveEarthUniversalEditorialEngine`.

The active workflow `.github/workflows/alien-world-publisher.yml` stays at GitHub's required location and installs dependencies from `editorial-engine/requirements.txt`. Its replacement calls the canonical `alien-world/collector/collector.py` and `alien-world/publisher/publisher.py` paths and commits only `alien-world/published/`. Because the ZIP importer blocks `.github/`, the copy-ready workflow replacement is stored at `alien-world/publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml` and must be applied separately. The Alien World database cache remains `.publisher-data/alien-world/`. The shared Engine API and Nature/Magazine integrations are unchanged.

## Global architecture rule

**One Universal Editorial System. One Global PDF Reader. Independent view Publishers and databases.** Do not create a new Engine or reader for a future view, and do not merge view-specific data collection or Publisher ownership into the shared Engine.
