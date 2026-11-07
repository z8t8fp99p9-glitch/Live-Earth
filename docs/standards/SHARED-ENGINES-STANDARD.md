# Shared Global Engines Standard

## One shared implementation per Global service

LIVE // EARTH uses reusable, View-independent services. Do not create copies for individual Views.

| Service | Owns | Does not own |
|---|---|---|
| Global Collection Manager | Source catalogue, profiles, assignments, schedules, immutable Manager job | Source retrieval, rights decisions, writing story records, publication |
| Global Collector | Retrieval/parsing, article and image metadata discovery, provenance gathering, transient batch | Rights decisions, editing, database writes, publishing |
| Global Checker | Permission/provenance decisions and audit gates | Source collection, image creation, editorial layout, public output |
| Global Image Engine | Permitted image preparation and exact candidate report | Rights approval, final Checker decision, public publishing |
| Universal Editorial Engine | Deterministic editorial formatting/output | Source retrieval, database ownership, rights grants, factual invention |
| Newsroom Database Writer | View-isolated schema and final-approved story persistence | Source retrieval, rights approval, public feed creation |
| View Publisher | Reads its own approved records and creates its configured output | Global collection, write access to its source database, duplicate rights authority |

## Manager-selected isolation
Every registered View has its own stable identity, profile, assignment IDs and destination database identity/path. The Writer validates the destination under `.publisher-data/<viewId>/`. It refuses mismatched ownership rather than adopting an unrelated database.

## Current registration state
As recorded in `global_collection_manager/README.md`, Nature and Alien World are retired. The Manager's active source catalogue, assignments, View profiles and schedules are empty. The shared services remain available for a future View; no active collection job should be inferred from historical workflow notes.

## Global Collector handoff
The current Collector contract defines a 38-field `LIVE_EARTH_UNIVERSAL_POST_V1` record projection and four Collector-owned sections: Manager ID Card, Full Article, Original Image Records and Source & Rights Evidence. The Collector returns this as transient structured evidence. It does not add Checker decisions or persist raw source material.

## Stage handoff
The shared flow, when a future View is registered and configured, is:

`Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → final Global Checker → shared Newsroom Database Writer → configured View Publisher`

Every stage preserves IDs, lineage and ownership. Each stage may only create or update the information it owns. Read the detailed contracts beside each component before making implementation changes.
