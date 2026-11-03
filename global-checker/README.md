# LIVE // EARTH — Global Content Rights & Provenance Checker

**Universal interface:** 2.0.0  
**Central rights registry:** `source-registry.json`  
**Project use context:** `universal-use-context.json`  
**Role:** rights, permissions, provenance and compliance decisions only

## One Global Checker

The universal interface accepts the one Global Collector handoff format:

- Manager job envelope and registry version
- `LIVE_EARTH_UNIVERSAL_POST_V1` records
- One universal post schema for every View and source
- Complete post and image lineage IDs

There is one Checker implementation. It receives the assigned `viewId` from the Manager job and resolves source/image permissions from the central registry. It has no hard-coded View list in its universal intake API. A policy applies to a View only when the registry explicitly lists that View or uses `views: ["*"]`.

The older Nature and Alien World automatic bootstrap adapters remain for compatibility with their existing workflows. They are legacy entrypoints, not the architecture for adding future Views. New Views use the universal interface and registry configuration rather than another Checker or a new View-specific Checker code branch.

## Strict role boundary — Checker, not Editor

The Global Checker does not collect, fetch, edit, rewrite, shorten, summarize, enrich, rank, moderate, curate, generate, publish or change a post. It does not change a post's title, summary, body, media or metadata.

It returns decisions and reasons only: PASS/HOLD, GREEN/AMBER/RED/UNKNOWN, policy reference, allowed-use limits, and fields that must not be stored or displayed. The next pipeline gate enforces those restrictions. The Checker itself does not remove or rewrite those fields.

It never writes to post/story tables or public feeds. An optional audit connection writes only to the additive internal `global_checker_audit_log` table.

## Checks performed by the universal interface

1. **Manager lineage:** validates the complete required Manager envelope and confirms its identifiers are carried unchanged in each post's `collectionContext`.
2. **Source assignment:** confirms each post's `sourceId`, `sourceFeedUrl` and `provenance.assignmentId` belong to the Manager job's source, feed and assignment lists.
3. **Post identity:** requires `postId` and matching View/source identity.
4. **Image identity:** checks the one attached image's `mediaId`, parent `postId`, View/source IDs and Manager lineage fields.
5. **One-post-one-image rule:** more than one image attached to a post is a structural HOLD. A post may have no image; in that case the image result is marked `NOT_PROVIDED` and text rights still receive their own check.
6. **Text/source rights:** uses the existing central policy evaluator for exact article/feed domain, feed URL, source identity, view applicability, author signals, licence and restrictive notices.
7. **Use-specific permissions:** evaluates storage, temporary processing, transformation, summary/excerpt use and display as separate permissions.
8. **Full-article restrictions:** a feed summary does not automatically authorize full-article retrieval or temporary processing. Raw full text and HTML are separately checked against the registry's full-article and raw-text permissions.
9. **Image rights:** evaluates the exact image URL and source page, creator, licence, credit, caption, modification evidence, third-party signals and source association independently of text.
10. **Special image routes:** the NASA, Wikimedia Commons and original Image Engine checks are reusable across Views. Additional source image routes can be defined in `imagePolicies.sourcePolicies` without adding View-specific Python branches.
11. **Fail-closed behaviour:** missing, conflicting, malformed or unregistered evidence becomes UNKNOWN/HOLD. Credit alone is never treated as permission.

The current registry includes the source-specific policies already reviewed for Nature and Alien World. A new View does not inherit a source permission merely by existing: each source policy must explicitly include that View or be marked global with `views: ["*"]` after the intended reuse has been reviewed.

## Educational and non-commercial context

The project purpose is recorded for every Manager-registered View in `universal-use-context.json` as educational and non-commercial context. It can be relevant where a law or source licence expressly considers educational, research, nonprofit or non-commercial use. It is **not** a blanket copyright licence, automatic fair-use/fair-dealing approval, or override of source terms. The Checker only passes a source when its applicable policy and item-level evidence support the exact use. Unknown permissions stay on HOLD.

This is an automated internal rights/provenance control, not a legal opinion or a guarantee that every source has disclosed every third-party right.

## Internal audit — never public

The optional audit log appends each decision. It retains:

- `postId`, optional `mediaId`, `viewId` and `sourceId`
- `jobId`, `profileId`, `assignmentIds`, `sourceIds`, `idempotencyKey`
- `configVersion`, `destinationDatabaseId` and `destinationDatabasePath`
- Stage, verdict, pass/hold, policy reference, decision ID, evidence references and reasons

The audit log does not store raw article body text. Repeated checks append new rows; prior check rows are not overwritten. Each View's own existing database receives its own audit table. It is not merged across Views.

### Internal API

```python
from universal_checker import check_collection

# collector_result is the JSON object returned by Global Collector.
# audit_connection is an already-open connection to the assigned View DB.
report = check_collection(collector_result, audit_connection=audit_connection)
```

The returned report is marked `INTERNAL_ONLY_NOT_FOR_PUBLICATION`. It is a decision report, not an edited post collection.

### Command line

```bash
python global-checker/universal_checker_cli.py \
  --collector-result /path/to/internal-collector-result.json \
  --audit-database /path/to/existing-view-database.sqlite3 \
  --report-output /path/to/internal/global-checker-report.json
```

To inspect the audit history read-only:

```bash
python global-checker/internal_audit_cli.py \
  --database /path/to/existing-view-database.sqlite3 \
  --post-id POST_ID
```

You can filter by `--job-id` or `--view-id`, and use `--format summary` for a grouped overview. Reports must stay internal and must never be placed in a public/published folder.

## Integration status

This package supplies the universal Checker API and internal audit viewer. The new Global Collector output must be passed to `check_collection()` by the next pipeline/orchestrator stage before any storage, editorial layout or publication. The older Nature/Alien World bootstrap remains separate until those legacy flows are deliberately migrated. Local unit tests do not establish live pipeline integration; the end-to-end handoff must be tested after upload.

See `UNIVERSAL-CHECKER-CONTRACT.md` for the detailed interface and role contract.
