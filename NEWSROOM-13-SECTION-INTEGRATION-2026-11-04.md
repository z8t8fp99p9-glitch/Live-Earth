# LIVE // EARTH — Global Newsroom 13-Section Production Wiring

**Version:** 3.0.0  
**Scope:** shared Nature + Alien World Newsroom; no GitHub changes performed by this patch.

## Production run path

Both registered View workflows enter `editorial-engine/newsroom_orchestrator.py` through the existing global dispatcher. The same shared sequence now runs for either Manager-selected View:

1. Global Collection Manager creates the immutable View-scoped job.
2. The shared Global Collector retrieves the assigned feeds and emits Collector Sections 1–4.
3. The Collector checks the central source registry before retrieving linked article pages. Full-article retrieval occurs only where the exact source policy explicitly permits both temporary processing and retrieval. Feed summaries are forwarded only where their distinct feed-summary permission is explicitly allowed. Unknown, conditional, or missing permissions fail closed.
4. Global Checker v2.1.1 appends Sections 5–8 using source-specific text permission inputs.
5. Exact original-image candidates are evaluated through the existing central image-rights registry (NASA documentary-media rules, Nature Commons item rules, and other registered paths). Only GREEN exact candidates provide Section 9 with an image-host allowlist and temporary-processing permission. Global Image Engine Section 9 then runs through the shared image pipeline.
6. Global Checker independently verifies Sections 10–11.
7. Live Feed Editor appends Section 12.
8. Final Global Checker appends Section 13.
9. The independent Checker Report Archive stores the complete 13-section report after Collector-origin raw text and local staging paths are removed.
10. The Section 13 Database Bridge writes only posts whose final decision is `APPROVE_FOR_DATABASE` to the database selected by that Manager job.
11. The existing dispatcher then invokes only the matching View Publisher.

## Safety and separation

- Nature and Alien World still run as separate Manager jobs and keep separate databases, image staging, report archives, feeds and Publishers.
- The orchestrator does not merge, reset or truncate either database.
- The Collector does not persist raw article bodies. The archive additionally redacts transient raw-text duplicates in Collector Sections 2–4.
- Section 9 is connected to the existing central `imagePolicies` evaluator. Only exact item-level GREEN results permit image processing; unregistered candidates remain held.
- The current repository does not configure a semantic visual-inspection adapter for Section 9. Technical image checks still run, but semantic relevance is UNKNOWN without that adapter, so Section 10 holds the candidate and Section 11/13 cannot approve it. No visual result is fabricated.
- The publisher remains downstream; the orchestrator does not write public feed JSON or public image assets.

## Validation performed

Focused pipeline tests cover the Global Checker text/image sections, Section 12, Section 13, archive, database bridge, image pipeline and Collector rights gate. The repository-wide suite still contains legacy orchestrator mocks and unrelated import/collection issues; this patch does not claim those older tests have been migrated.
