# LIVE // EARTH — Global Checker Standard

**Decision date:** 2 November 2026  
**Version:** Global Checker 1.0.3; Source Registry 2026-11-02.3  
**Integration design:** automatic through the existing Editorial Engine dependency step; no dedicated Checker YAML files.

## Decision

LIVE // EARTH uses one shared **Global Content Rights & Provenance Checker** for every current and future content view. It owns the common source, text, image and final-publication decisions. Each view retains its own Collector, Publisher, database, schedule, cache, feed formatting and presentation.

## Mandatory principles

1. Rights are checked before database storage and immediately before publication.
2. Article text and attached images are separate works and receive separate decisions.
3. A free-to-read page or RSS feed is not automatically free for persistent storage, transformation, republication or image reuse.
4. A credit, source link or source-domain match does not itself create permission.
5. RED and UNKNOWN material is held. AMBER material is permitted only in its exact documented limited form. GREEN applies only to the recorded use.
6. If the Checker or registry is unavailable, the pipeline fails closed and preserves the last-good public feed.
7. Image denial does not automatically disqualify an otherwise-cleared text story; it can publish text-only.
8. Preserve independent Nature and Alien World SQLite databases and their existing 32-day story retention.
9. Do not alter approved views, Home composition, locked Moon View, Sun View, Stacks, Location-OFF privacy, offline startup, local recovery, PDF library or browser feed-storage rules.

## Initial source policy

- NASA: conditional item-level route for official NASA material without third-party or restrictive signals. Only the five exact registered NASA feed URLs are approved; another feed on the same host is UNKNOWN until reviewed.
- Phys.org RSS: headline/link/date only; the summary is discarded before storage.
- ScienceDaily and Nature Portfolio: blocked for the current persistent-database route.
- Mongabay: hold unless the exact item supplies accepted open-licence and author evidence.
- Wikimedia Commons: assess every exact file page and licence independently; retain creator, licence, source page, credit, contextual caption and modification note.
- Unknown/new sources start UNKNOWN and are blocked before retrieval.

## Architecture

`Global Source Registry → existing view Collector → pre-storage Checker → view-owned DB → existing view Publisher → Universal Editorial Engine → final Checker gate → view-owned public feed`.

The Checker adds one evidence table inside the existing view-owned database supplied to it. It does not own, merge or reset either database. Nature's public image-rights manifest is held until its matching feed has passed the final gate.

## Automatic activation without YAML changes

Both existing feed workflows already install `editorial-engine/requirements.txt` before invoking their Collector and Publisher scripts. That requirements file now installs the local `./global-checker` bootstrap package. The package adds a Python `.pth` startup hook that dispatches only the existing Nature/Alien World Collector and Publisher script paths through `global-checker/run_pipeline.py` before their original code starts. Existing workflow YAML files, cron schedules and action definitions remain unchanged. Missing Checker components cause a hard failure rather than an unchecked fallback.

## Verification boundary

The Checker/adapter deterministic suite previously passed 30/30 tests. The new bootstrap unit tests pass 4/4. A packaged-wheel startup smoke test also verified all four exact Collector/Publisher entrypoints route to the shared runner, preserve its exit status, and leave unrelated Python scripts untouched. Runtime activation is not considered verified until the existing Nature and Alien World Actions complete successfully and the user confirms the views on-device.

## Versioning

Changes to terms, approved source routes or accepted licences require a registry policy version increment, tests and a continuity note. Decision evidence is retained for a bounded 32-day period from its latest check. Story retention remains controlled by each view's existing Collector.
