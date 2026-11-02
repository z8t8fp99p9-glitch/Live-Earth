# LIVE // EARTH — Global Checker extension

**Component:** Global Checker  
**Extension version:** 2.0.0  
**Status:** Code prepared · not integrated into new Newsroom pipeline · testing intentionally deferred

## Ownership

This is an additive extension of the existing `global-checker/global_checker.py` authority. It does not create a second Checker, a second rights registry, a new workflow, or a shared story database.

The existing Checker remains the single authority for source/text decisions, documentary-image decisions, generated-art decisions, decision evidence and the existing final Live Feed gate.

## Position in the new Newsroom pipeline

`Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Global Editor → FINAL EDITED NEWS PACKAGE → correct View-owned database → View Publisher`

## Responsibilities added by this extension

1. **Source identity and provenance cross-check:** validates the Global Collector record against the exact Manager source, View assignment, feed URL and the existing Global Checker policy reference.
2. **Permission matrix:** separately represents temporary processing, transformation, derived-output storage, derived-output display, raw-text storage and heading/link use.
3. **Content quality review:** checks required source metadata before editorial work and final headline/summary quality before database handoff.
4. **Duplicate and related-story review:** checks canonical URLs and normalized title similarity within one View and the caller-supplied retained records for that same View. It flags related stories; it never automatically merges them.
5. **View alignment:** checks the record/package against the registered View Collection Profile and assignment filters.
6. **Risk/compliance review:** preserves source-rights holds and requires a structured risk assessment from the Global Editor before final approval.
7. **Evidence traceability:** each material claim must point to permitted source records and exact evidence references. Deterministic token, number and negation checks flag unsupported claims. This is a traceability/consistency screen, not a guarantee of scientific truth or an independent external fact-check.
8. **Image re-check:** every original or replacement image candidate is sent through the existing `global_checker.evaluate_image`. An Image Engine approval flag is never accepted as a Checker decision.
9. **Per-View review audit:** offers an additive audit table in the SQLite connection supplied by the owning View. It never opens, discovers, merges or creates a shared story database.

## Permission matrix

Each source policy may add `text.usePermissions` to its existing entry in `global-checker/source-registry.json`:

| Field | Meaning |
|---|---|
| `temporaryProcessing` | May permitted source text be processed transiently? |
| `transformation` | May source text be transformed into original editorial output? |
| `derivedOutputStorage` | May the resulting original summary/headline be retained? |
| `derivedOutputDisplay` | May that derived output be publicly displayed? |
| `rawTextStorage` | May original source text itself be persisted? |
| `headingLinkUse` | May only the headline/heading, canonical link and date be used? |

Each value is `allowed`, `prohibited`, `conditional` or `unknown`.

**No permission is silently granted.** Missing fields remain `unknown`. The existing legacy `allowStorage` and `allowDisplay` fields are deliberately not reinterpreted as permission for derived-output storage/display or raw-text storage. Existing `allowTransform` is retained as the transformation permission, because it is already explicit in the current policy. The `headline-link-only` mode is treated as an explicit heading/link permission.

Until source policy records explicitly define every required permission, the new Global Editor route remains held. This does not change the existing live Nature/Alien World Checker path; it prevents the new pipeline from assuming rights that have not yet been recorded.

The Global Checker workflow never persists raw source text or full article bodies.

## APIs

The new module is `global_checker_workflow.py`, loaded alongside the existing `global_checker.py`.

### 1. Review Global Collector output

```python
from pathlib import Path
from global_checker_workflow import review_collection_batch

result = review_collection_batch(
    global_collector_batch,
    repository_root=Path("."),
    retained_records=[],  # only records from this same View
)
```

The result separates:
- `editorialInputs`: only records with explicit temporary-processing, transformation, derived-storage and derived-display permission.
- `imageEngineInputs`: only source metadata that the policy permits the Image Engine to receive.
- `held`: all denied, unknown, mismatched, duplicate or insufficiently verified records.
- `reviews`: detailed source, rights, quality, duplicate, View-alignment and risk decisions.

The collection batch and source excerpt are transient. Do not archive the batch or raw summaries as a permanent source database.

### 2. Review the final edited package

Global Editor supplies:
- `viewId` and `profileId`
- stories with the exact `sourceRecordId` and `globalCheckerIntakeDecisionId`
- original headline/source URL/policy reference
- original editorial headline and summary
- `topicTags`
- `claims[]` with `claimId`, `text`, `material`, and `evidenceIds`
- package-level `evidence[]` records with `evidenceId`, `sourceRecordId`, `sourceUrl`, `sourcePolicyRef`, `sourceDecisionId` and a transient `excerpt`
- `riskAssessment: { "flags": [] }`
- optional exact `imageCandidate` metadata

Then call:

```python
from global_checker_workflow import review_editorial_package

final_review = review_editorial_package(
    editorial_package,
    intake_review,
    repository_root=Path("."),
    retained_records=[],  # only records from this same View
)
```

Only `approvedStories` may proceed to that View's own database writer. A rejected image does not invalidate eligible text; the story may continue text-only. A story with unsupported claims, unknown text permissions, unresolved high/critical risk, duplicate URL, unresolved related-story flag, mismatched source identity or failed View alignment is held.

Evidence excerpts are used transiently for the checks. The returned evidence ledger contains source references and excerpt hashes, not the excerpt text.

### 3. Record review audit (optional)

The owning View adapter may supply its own already-open SQLite connection:

```python
from global_checker_workflow import record_workflow_reviews

record_workflow_reviews(view_owned_connection, final_review)
```

The function writes only review metadata/hashes into `global_checker_workflow_reviews`. It does not open a database itself. The Nature adapter must pass only the Nature connection; Alien World must pass only the Alien World connection.

The audit table is additive and can be pruned to the existing 32-day horizon with `prune_workflow_reviews`.

## Image decision boundary

The extension reuses the current registered image routes:
- Nature's exact Wikimedia Commons file/creator/licence/attribution/context policy.
- Registered NASA source images, scoped to the original story and View rules.
- Registered local procedural illustrations from the Global Image Engine, with exact Engine version, output path, provenance, creator/credit and non-documentary labels.

A free-image provider or new image source remains `UNKNOWN` until that exact source and policy are registered in the one central Checker registry. Arbitrary HTTPS image URLs are never accepted.

## Non-responsibilities

Global Checker does not:
- fetch, scrape or discover external sources;
- write or edit headlines/summaries;
- produce claims, stories or images;
- approve its own rights evidence using an Editor/Image Engine flag;
- choose collection schedules or subscriptions;
- create a shared cross-View story database;
- publish Live Feeds or Magazine PDFs;
- change Publisher workflows or app UI.

## Preserved existing integration

The existing `.pth` bootstrap and `run_pipeline.py` remain unchanged in this package. The four exact existing entry points continue to route through the existing Checker integration. No `.github/workflows/*.yml`, Nature/Alien World Collector, Publisher, database schema, cache key or output file is replaced.

The new APIs are not wired into those live workflows yet. They become the interface for the new Global Collector → Global Checker → Global Image Engine → Global Editor build once the remaining components are ready.

## Deferred full-system test plan

Testing is deliberately not run during this build phase. At the later Newsroom-wide test phase, cover:

- exact Manager/Collector source, assignment, policy and View identity;
- all six permission dimensions, including missing/unknown/prohibited/conditional cases;
- no raw-text persistence and no summary generated to evade restrictions;
- Nature/Alien World separation, including database audit scoping;
- headline/link-only source handling;
- exact documentary image checks and replacement-image rechecks;
- local illustration version/path/provenance/label checks;
- duplicates, related items and no automatic merging;
- factual claim-to-evidence traceability, numeric mismatch and missing evidence;
- View alignment and exclusions;
- high/critical unresolved risk holds;
- text-only continuation when images fail;
- additive audit writes, 32-day audit retention and last-good Publisher output;
- old live pipeline regression and all current app protections.

No tests have been executed and no existing live pipeline has been changed by this package.
