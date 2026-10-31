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

The JavaScript companion does not duplicate the Python implementation. JavaScript validates and safely exposes published outputs to browser views; Python creates the feed/PDF artifacts. The two layers must remain view-independent.

## Ownership boundaries

- **View database:** each content-producing view owns an independent logical database and its own records/retention rules.
- **Collector:** a view-specific Collector, when required, is the only component allowed to fetch that view's external sources and write to that view's database.
- **Publisher:** each view has its own Publisher. It opens only its own database read-only, supplies its profile/command and bounded output destination, and routes the completed Engine result to that view's publication directory. A Publisher does not browse external sources or write its source database.
- **Universal Editorial Engine:** shared by all Publishers. It does not fetch external sources, open or own databases, own schedules, or write view database records. It produces the requested validated feed and/or self-contained PDF from the Publisher-supplied input.
- **Browser companion:** loaded on demand from `./editorial-engine/universal-editorial-engine.js` by browser views that consume editorial publications. Future views reuse the existing global object and validators rather than creating another browser-side Engine.
- **Global PDF Reader:** one view-independent reader opens the completed PDF selected by a calling view and returns to that caller on close. The reader is separate from the Editorial Engine and is not duplicated by Publishers.

## Publisher integration contract

A new view should integrate by adding its own Collector (only if it needs external collection), database schema/retention, Publisher profile, Publisher implementation and output directory. Its Publisher then calls the shared Python Engine with:

1. a database connection it opened in read-only mode;
2. its own validated view profile and publication command;
3. its bounded output destination and publication time.

The Engine returns completed view output data. The Publisher routes those outputs and updates that view's catalogue atomically. The Publisher must preserve its previous last-good public output if generation fails.

A browser view that reads a published feed or catalogue loads the shared JavaScript companion and validates the payload against its expected `viewId`. It then passes a selected PDF to the existing global PDF Reader when needed.

## Current Alien World implementation

Alien World is the first production consumer of the shared system:

- `data-collection/alien-world/collector.py` collects approved NASA sources and writes only the Alien World database.
- `publishers/alien-world/publisher.py` reads that database read-only, invokes `run_engine(...)`, and routes the completed output.
- `publishers/alien-world/profile.json` defines Alien World's view-specific source policy, editorial profile and publication settings.
- `published/alien-world/` stores the completed Alien World feed, catalogue and magazine PDFs.
- `alien-world-view-controller.js` loads the browser companion on demand from this directory. Its public global remains `window.LiveEarthUniversalEditorialEngine`.

The active workflow `.github/workflows/alien-world-publisher.yml` continues to install dependencies from `editorial-engine/requirements.txt` and invoke the existing Collector and Publisher paths. Those production paths are unchanged by the directory consolidation.

## Current engine behaviour and limits

The custom-request interpreter is deterministic and deliberately does not call an AI service. Supported directives include cinematic/dark or minimal/light direction, image-led or text-led design, page count, timeline, explainer and selected editorial tones. The issue receipt records applied and unmapped requests. Arbitrary free-form instructions are not claimed as implemented in this no-AI first release.

## Global architecture rule

**One Universal Editorial System. One global PDF Reader. Independent view Publishers and databases.** Do not create a new Engine or reader for a future view, and do not merge view-specific data collection or Publisher ownership into the shared Engine.
