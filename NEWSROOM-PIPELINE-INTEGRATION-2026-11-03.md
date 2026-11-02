# LIVE // EARTH — Newsroom Pipeline Integration

**Baseline:** `main` at `b3d57da075b49e9692d0768eeeaefeca81c67880`  
**Patch:** Newsroom pipeline `1.0.0`  
**Scope:** Nature and Alien World Newsroom hand-off only.

## What this patch connects

For one View at a time, the workflow entry point is:

`Global Collection Manager → Global Collector → Global Checker intake → Image Engine's separate image-only route → Universal Editorial Engine → Global Checker final review → Newsroom Database Writer → existing View Publisher`

The existing View Collector must still run first. It owns and prepares its own SQLite database. The new pipeline then creates a transient Global Collector batch and writes only GREEN-approved editorial rows to that View's `newsroom_approved_stories` table. It does not replace the View Collector, modify the Collector-owned `stories` table, write the Live Feed, or open the other View's database.

## Source material and summarisation ownership

The current active Global Collector receives RSS/Atom feed summaries. These are passed as original text into the Editorial Engine hand-off. The Checker checks permissions and provenance; it does not summarize or compose editorial copy. The Universal Editorial Engine remains the only component that produces the new editorial story.

The hand-off accepts the typed `feed-summary` and `full-article` source-material kinds. However, full-article retrieval and processing are deliberately **not enabled** by this patch: all current source policies keep `fullArticleTemporaryProcessing` as `unknown`, and the collector still only reads feed entries. A future full-article route may only be enabled after a specific source/item policy review changes that permission to `allowed`, the Collector is updated to fetch under its existing bounded HTTPS and host allowlist controls, and the Editor/Checker privacy and evidence contract is upgraded together. Permission alone is not enough. This patch does not scrape article pages or assume that a feed permission grants article-body rights.

The existing Editor adapter's current deterministic sentence-based production remains in place for the first functioning pipeline. It is the Engine doing that work, not an upstream component. Improving the Editor's summarisation quality is a later phase after this pipeline reliably delivers material to it.

## Publisher final-gate correction

The existing final feed gate verifies unchanged Collector text against its original summary hash. That is correct for ordinary Collector stories but would reject a rewritten Newsroom story. The new `newsroom_publisher_gate.py` adds a separate path only for an exact row found in the same View's `newsroom_approved_stories` table. It verifies the row's exact title, URL, editorial summary, source identity, current registry, final Checker review identity, evidence hashes, topic metadata, and raw-text non-persistence. All ordinary Collector stories continue through the original gate unchanged. A broken Newsroom approval row is held, not downgraded to the ordinary route.

## Workflow integration still required

The ZIP extractor intentionally rejects `.github` paths. After applying the ZIP, update the two workflow YAML files manually, one at a time, by adding the matching Newsroom step **after the existing View Collector step and before the existing View Publisher step**:

- Nature: `python editorial-engine/newsroom_pipeline.py --view nature --repository-root .`
- Alien World: `python editorial-engine/newsroom_pipeline.py --view alien-world --repository-root .`

Do not change the existing cron schedules, cache paths, Publisher commands, commit logic, cleaner workflow, or ZIP extractor workflow. Confirm the Nature workflow file is saved before making the Alien World edit.

## What is intentionally unchanged

- Existing View Collectors retain sole ownership of their existing `stories` table.
- Nature and Alien World SQLite databases/caches remain separate.
- Publisher stays read-only.
- Database Cleaner remains per-View and manual-only.
- No database reset, cloud service, hosted model, paid API, API key, login, or new external dependency is introduced.
- Raw source text, full article bodies, HTML and evidence excerpts are not persisted.
- `.github/workflows/zip-extract-auto-upload.yml` is not changed.

## Validation status

This is an integration patch prepared against the inspected `main` HEAD above. Syntax and package-integrity checks are run locally on the new files. Full end-to-end validation must occur only after the workflow YAML steps are installed and GitHub Actions runs against the real per-View databases. Do not describe the Newsroom as live or end-to-end verified before those runs succeed.
