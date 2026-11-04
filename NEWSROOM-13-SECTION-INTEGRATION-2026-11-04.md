# LIVE // EARTH — Global Newsroom 13-Section Production Wiring

**Version:** 3.0.0  
**Scope:** shared Nature + Alien World Newsroom; no GitHub changes performed by this patch.

## Production run path

Both registered View workflows enter `editorial-engine/newsroom_orchestrator.py` through the existing global dispatcher. The same shared sequence now runs for either Manager-selected View:

1. Global Collection Manager creates the immutable View-scoped job.
2. The shared Global Collector retrieves the assigned feeds and emits Collector Sections 1–4.
3. The Global Collector gathers the assigned feed items, linked article pages and explicitly identified continuation pages. It does not import, consult or enforce Checker permissions, and it does not strip full text or summaries based on a rights policy. It preserves the collected text, image records, metadata and rights evidence in the in-memory hand-off.
4. Global Checker v2.1.1 appends Sections 5–8 and makes all text and image permission decisions using the collected evidence. Unapproved material is held downstream; Collector collection is not approval for editorial use, storage or publication.
5. Exact original-image candidates are evaluated through the existing central image-rights registry (NASA documentary-media rules, Nature Commons item rules, and other registered paths). Only GREEN exact candidates provide Section 9 with an image-host allowlist and temporary-processing permission. Global Image Engine Section 9 then runs through the shared image pipeline.
6. Global Checker independently verifies Sections 10–11.
7. Live Feed Editor appends Section 12.
8. Final Global Checker appends Section 13.
9. Immediately after Section 13 completes, the independent PDF Report Utility creates a full per-run PDF containing the 13-section overview, Collector feed-by-feed results, every recorded check result and each recorded hold/failure reason. Raw article bodies and feed-summary text are excluded from the PDF.
10. The independent Checker Report Archive stores the complete 13-section JSON report after Collector-origin raw text and local staging paths are removed. The PDF is stored beside the redacted JSON report.
11. The Section 13 Database Bridge writes only posts whose final decision is `APPROVE_FOR_DATABASE` to the database selected by that Manager job.
12. The existing dispatcher then invokes only the matching View Publisher.

## Safety and separation

- Nature and Alien World still run as separate Manager jobs and keep separate databases, image staging, report archives, feeds and Publishers.
- The orchestrator does not merge, reset or truncate either database.
- The Collector gathers article material in memory but does not decide permissions, and does not persist raw article bodies. The archive additionally redacts transient raw-text duplicates in Collector Sections 2–4.
- The PDF Report Utility runs after Section 13 and before the Database Writer. It reports PASS, FAIL, HOLD, NOT_APPLICABLE and UNKNOWN checks, the per-post decision and the Collector source/feed outcomes without reproducing raw source article text.
- Nature and Alien World workflow runs upload the matching view's PDF as a GitHub Actions artifact with 32-day retention. The repository is public, so artifact visibility follows repository access; the PDF deliberately excludes raw article and feed-summary text.
- Section 9 is connected to the existing central `imagePolicies` evaluator. Only exact item-level GREEN results permit image processing; unregistered candidates remain held.
- The current repository does not configure a semantic visual-inspection adapter for Section 9. Technical image checks still run, but semantic relevance is UNKNOWN without that adapter, so Section 10 holds the candidate and Section 11/13 cannot approve it. No visual result is fabricated.
- The publisher remains downstream; the orchestrator does not write public feed JSON or public image assets.

## Validation performed

Focused tests cover Collector article-page and continuation collection without Checker rules, the Global Checker text/image sections, Section 12, Section 13, JSON archive, PDF report generation, report redaction and the orchestrator rule that PDF generation occurs after Section 13 and before database writing. The legacy v2 orchestrator test file remains superseded by the current v3 integration tests.

## Workflow file replacement note

The repository's ZIP auto-upload validator rejects all `.github/` paths. The two updated Publisher workflow files are therefore supplied separately from `LIVE_EARTH_MAIN_UPLOAD.zip`. Replace the matching files at `.github/workflows/nature-publisher.yml` and `.github/workflows/alien-world-publisher.yml` to enable the 32-day PDF artifact upload. The PDF itself is created by the shared orchestrator after Section 13 and is not written into the public feed directory.
