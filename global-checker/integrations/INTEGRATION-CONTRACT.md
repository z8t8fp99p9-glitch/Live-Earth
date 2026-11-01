# Global Checker — mandatory Collector/Publisher integration contract

**Implementation:** automatic dispatch from the existing Nature and Alien World workflow entrypoints. The two existing workflow YAML files are not changed, replaced or duplicated.

## Shared responsibility boundary

- Each view retains its own Collector, Publisher, SQLite database, schedule, cache, output path and presentation.
- `global-checker/global_checker.py` is the single shared source/text/image decision engine and final publication gate.
- `global-checker/run_pipeline.py` wraps the existing Collector and Publisher implementations, preserving their view-specific ownership and formatting.
- `editorial-engine/requirements.txt` installs the local bootstrap package during the dependency step already present in both workflows.
- The installed `.pth` hook dispatches only the exact four Nature/Alien World Collector/Publisher script paths to the shared runner. Other Python commands are unaffected.
- No extra workflow, schedule or YAML replacement is required. A missing bootstrap/runner is a hard failure; unchecked fallback is not allowed.

## Nature integration

1. The runner opens Nature's existing database through `CheckedConnection` and creates the additive `global_checker_decisions` evidence table.
2. Every Nature story INSERT is assessed against the source registry before SQLite receives it.
3. Phys.org is AMBER for headline/link/date only; its summary is emptied before storage. ScienceDaily and Nature Portfolio are blocked before retrieval. Mongabay remains UNKNOWN unless per-item licence and author evidence are supplied. A permitted route must match the exact reviewed feed URL and source identity.
4. The shared Checker evaluates the exact Commons file page, creator, licence, credit, contextual caption and modification evidence before image bytes are downloaded. Technical URL/MIME/response checks remain as transport-integrity safeguards. The resulting image metadata is checked again before database acceptance.
5. On Collector close, retained records are audited. Denied legacy stories are removed; denied images are detached while a cleared text story can remain text-only.
6. The Publisher remains read-only against Nature's database. Its `live-feed.json` atomic-write boundary invokes `gate_feed()`. The public image directory and candidate rights manifest are reconciled only after the final gate succeeds; failure preserves the last-good feed and matching manifest.

## Alien World integration

1. The runner opens Alien World's existing database through `CheckedConnection` and creates the same additive evidence table in that database only.
2. Every NASA story INSERT is assessed before persistence. Only the five exact NASA feed URLs listed in the registry can pass; another URL on a NASA hostname remains UNKNOWN until reviewed.
3. The Checker evaluates NASA image candidates before download and checks the completed image record again before the database image update.
4. Artist concepts, illustrations, simulations, renderings, diagrams and infographics are rejected from the documentary-photo slot. Image rejection does not reject an independently cleared text story.
5. Retained legacy records are audited without resetting the database or changing its existing 32-day story retention.
6. The Publisher remains read-only, keeps its adaptive-lookback logic and calls `gate_feed()` before its existing Live-Feed-only output function.

## Automatic launch contract

The installed bootstrap is activated by the existing `python -m pip install -r editorial-engine/requirements.txt` step. It uses Python's `.pth` startup processing to redirect the four known script paths before their original module body begins. It starts the shared runner with `os.execv`, so the normal process exit code and workflow success/failure semantics are retained. It never changes GitHub Actions configuration and does not intercept unrelated Python tools or scripts.

## Final-publication rule

A feed story needs a matching GREEN/AMBER text decision for its exact story ID and URL. A displayed image needs a separate matching GREEN/AMBER image decision for that story. AMBER limits must be reflected in output. RED and UNKNOWN material is held. If fewer than two eligible stories remain, or the registry/evidence cannot be read, publication fails and the last-good feed remains unchanged.

## Future views

Every future content-producing view must reuse the same Checker and versioned Source Registry. Its Collector and Publisher entrypoints must be added to the explicit bootstrap map and covered by integration tests before activation. New sources begin UNKNOWN until their exact source route and intended use are reviewed.

## Non-regression

- Preserve separate Nature and Alien World SQLite files, cache paths and key families.
- Preserve 32-day story retention and the hourly schedules (Nature minute 15 UTC; Alien World minute 45 UTC).
- Preserve online-only browser feeds and no browser feed persistence.
- Preserve Nature/Alien World UI, Universal Editorial Engine, PDF Reader and all protected app behaviours.
- Never drop/replace story tables, reset databases, bypass output atomicity or publish an empty feed.
