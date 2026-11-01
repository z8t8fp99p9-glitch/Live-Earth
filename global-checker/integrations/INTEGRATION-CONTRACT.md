# Global Checker — mandatory Collector/Publisher integration contract

**Implementation status:** The first Nature and Alien World integrations are included in `run_pipeline.py` and their staged workflow replacements. This document records the current adapter boundary and the standard future content views must follow.

## Shared responsibility boundary

- Each view keeps its own Collector, Publisher, SQLite database, schedule, output path and presentation.
- `global-checker/global_checker.py` is the single shared source/text/image decision engine and final publication gate.
- `run_pipeline.py` wraps the current Collector/Publisher entry points so rights decisions are applied consistently without rewriting the working view logic.
- Collectors retain source-specific retrieval and technical safety checks: HTTPS host/redirect rules, timeouts, response-size limits, MIME/decode checks, image resizing and safe file paths. These are not separate rights permissions.
- Publishers retain feed selection, formatting and atomic writes, but cannot publish around the final Checker gate.

## Nature integration

1. The runner opens Nature's existing database through `CheckedConnection` and creates the additive `global_checker_decisions` evidence table.
2. Every Nature story INSERT is evaluated against the source registry before it reaches SQLite.
3. Phys.org is allowed as AMBER headline/link/date only; the summary is replaced with an empty string before storage. ScienceDaily and Nature Portfolio are RED for the present persistent-storage route and are skipped before retrieval. Mongabay remains UNKNOWN unless individual article licence and author evidence are supplied. Unregistered routes are also blocked before retrieval. A permitted route must match the exact reviewed feed URL as well as its host and source identity; a new feed on the same domain is not automatically approved.
4. The shared Checker evaluates the exact Commons file-page metadata, creator, licence, credit, contextual caption and modification record before the image bytes are downloaded. File-page identity, allowed media host, MIME and response integrity remain technical retrieval safeguards. The later database-write gate rechecks the exact resulting image rights record before it is accepted into `nature_image_rights`.
5. On Collector close, retained rows are re-evaluated and audit evidence is refreshed. Denied legacy stories are removed; denied images are detached while an otherwise-approved story remains text-only.
6. The Publisher still reads its own database read-only. Its final `live-feed.json` atomic-write boundary invokes `gate_feed()`. The public image directory and candidate rights manifest are reconciled to the Checker-approved stories only after the final gate succeeds; a failed gate preserves the last-good feed and matching public rights manifest.

## Alien World integration

1. The runner opens Alien World's existing database through `CheckedConnection` and creates the same additive evidence table in that database only.
2. Every NASA story INSERT is evaluated before it reaches SQLite. Only the exact five NASA feed URLs currently listed in the profile and registry can pass; a new feed URL on a NASA hostname remains UNKNOWN until reviewed. Explicit third-party/copyright restrictions or unregistered provenance fail closed.
3. The shared Checker evaluates NASA image candidates before download and records the decision. The existing technical download/decode pipeline then runs. The downloaded image is evaluated again before the story's image fields are updated in SQLite.
4. Artist concepts, illustrations, simulations, renderings, diagrams and infographics are rejected from the documentary-photo slot. An image rejection does not reject the cleared text story.
5. Retained legacy records are audited on Collector close. Denied stories are removed and denied images detached, without resetting the database or changing its 32-day story retention.
6. The Publisher still reads its own database read-only and preserves its existing adaptive-lookback logic. `gate_feed()` runs before the existing Live-Feed-only output function. A failed gate leaves the previous feed untouched.

## Final-publication rule

A feed story needs a matching GREEN/AMBER text decision for the exact story ID and URL. A displayed image needs a separate matching GREEN/AMBER image decision for that story. AMBER limits (such as headline/link/date only) must be reflected in the output. RED and UNKNOWN material is not stored/published. If fewer than two eligible stories remain, or the registry/evidence cannot be read, the workflow fails and keeps the last-good feed.

## Future views

A new content-producing view must reuse the same Global Checker and versioned Source Registry. It must not create a private duplicate of source/text/image rights rules. Add an explicit policy and tests before connecting any new source. Unregistered sources remain UNKNOWN by default.

## Non-regression

- Preserve the separate Nature and Alien World SQLite files, cache paths and key families.
- Preserve 32-day story retention; retain each decision record for no more than 32 days after its latest check.
- Preserve hourly schedules (Nature minute 15 UTC; Alien World minute 45 UTC).
- Preserve online-only browser feeds and no browser feed persistence.
- Preserve Nature/Alien World UI, the Universal Editorial Engine, PDF Reader and all protected app behaviours.
- Never drop/replace story tables, reset databases, bypass output atomicity or publish an empty feed.
