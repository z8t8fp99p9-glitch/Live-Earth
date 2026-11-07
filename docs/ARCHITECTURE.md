# LIVE // EARTH — Architecture Overview

This document is the short map. For detailed ownership rules, read `architecture/APP-AND-VIEW-ARCHITECTURE.md` and `architecture/SHARED-NEWSROOM-PIPELINE.md`. Source code and component contracts remain authoritative for exact behaviour.

## 1. Application and view layer

The root app shell and managers coordinate navigation and lifecycle. The current source layout separates:
- Home and its protected visual/Orb baseline;
- primary views and their controllers/renderers;
- global utility features such as Location and Stacks;
- reusable feature workspaces;
- offline/runtime resources and recovery.

Moon and Sun use the shared sky host but retain separate rendering and view-specific behaviour. The existing view manager remains the primary-view transition authority.

## 2. Shared service layer

The reusable content services are independent of the view UI:
1. Global Collection Manager assigns sources, View identity, destination and schedule.
2. Global Collector gathers source and article/image evidence into a transient batch.
3. Global Checker owns permission, provenance and approval decisions.
4. Global Image Engine prepares an exact image candidate under Checker-issued permissions.
5. Universal Editorial Engine formats approved material and creates configured output.
6. Final Global Checker verifies the final handoff.
7. Shared Newsroom Database Writer persists only individually approved records to the Manager-selected View database.
8. The configured View Publisher creates that View's output.

No component should silently take over another stage's authority.

## 3. Current registration state

The Global Collection Manager's current README records an empty source catalogue, no source-to-View assignments, no View profiles and no schedules after Nature and Alien World retirement. The engines remain shared capabilities for future registration; this does not mean a collection pipeline is currently running.

## 4. Data and storage

A future/registered View receives its own identity, database destination and presentation adapter. The generic Writer validates the Manager-selected destination under `.publisher-data/<viewId>/`, applies that View's retention rule and refuses to adopt a database with mismatched ownership. It does not publish feeds or assets.

Do not reset, merge or delete databases, browser storage, cache families or local data as part of unrelated work.

## 5. Runtime and recovery

Service-worker shell entries, optional runtime assets, view controllers, local data and recovery files are linked dependencies. Removing or relocating a file requires current-source reference tracing, build/cache alignment and relevant online/offline tests.

## 6. Documentation map

Current standards live in `docs/standards/`; architecture maps in `docs/architecture/`; historical decisions in `docs/history/`; detailed component contracts remain beside code.
