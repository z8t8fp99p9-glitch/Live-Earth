# LIVE // EARTH — Global Content Rights & Provenance Checker

**Version:** 1.0.3  
**Registry:** 2026-11-02.3  
**Integration:** automatic through the existing Editorial Engine dependency-install step. No new GitHub Actions workflow and no YAML replacement are required.

## Purpose

One shared, view-independent system decides whether story text and images may be stored and published. It records evidence in the existing view-owned SQLite database and checks every candidate feed immediately before public output is replaced.

The Checker is not a Collector, Publisher or Editorial Engine. It does not fetch sources, own a schedule, own a database, generate reporting, write public feeds or change a view's appearance.

## Automatic integration — no workflow edits

The existing Nature and Alien World workflows remain the only scheduled jobs:

- Nature continues to run its existing Collector and Publisher at minute 15 UTC.
- Alien World continues to run its existing Collector and Publisher at minute 45 UTC.
- Both continue to install `editorial-engine/requirements.txt` before invoking their existing Python entrypoints.

That shared requirements file now installs `./global-checker`. Its small installer places a Python `.pth` startup hook in the active Python 3.12 environment. The hook redirects only these exact four existing commands through `global-checker/run_pipeline.py`:

| Existing command | Shared Checker phase |
|---|---|
| `python nature/collector/collector.py` | Nature pre-storage and image checks |
| `python nature/publisher/publisher.py --mode live` | Nature final feed gate |
| `python alien-world/collector/collector.py` | Alien World pre-storage and image checks |
| `python alien-world/publisher/publisher.py --mode live` | Alien World final feed gate |

The hook replaces the starting interpreter with the shared runner before the unchecked original script can execute. It leaves every unrelated Python command alone, and the runner's exit status becomes the existing Actions step status. No new schedule, workflow file, extra manual activation or workflow YAML edit is involved.

If the bootstrap package or shared runner is missing, the pipeline does not silently fall back to an unchecked Collector or Publisher.

## The two gates

1. **Pre-storage:** the Collector checks source and item provenance before a story is persisted. It independently checks images before download and again before accepting image metadata into the existing database. Restricted routes such as Phys.org are reduced to headline/link/date; the summary is discarded before storage.
2. **Pre-publication:** after the Universal Editorial Engine creates a candidate feed, the Publisher's final output boundary calls `gate_feed()`. Text and images need separate matching GREEN/AMBER decisions. Image denial leaves an otherwise-approved story text-only.

## Verdicts

| Verdict | Meaning | Behaviour |
|---|---|---|
| GREEN | Evidence supports the specific registered use | Proceed within that use |
| AMBER | Evidence supports a limited route | Proceed only within the recorded limit |
| RED | A prohibition or explicit restriction applies | Hold the item |
| UNKNOWN | Evidence is missing, conflicting or unregistered | Hold the item |

The Checker fails closed. Credit is not permission, and an approved article does not automatically clear its image.

## Data ownership and last-good output

The Checker adds `global_checker_decisions` to each existing view-owned database. It does not merge or reset Nature and Alien World databases. Decision evidence is pruned to a 32-day horizon; story retention remains controlled by each view's existing Collector.

A feed is not replaced unless the final gate succeeds. A missing registry, invalid decision, failed gate or insufficient eligible story count preserves the previous last-good output. Nature's image-rights manifest is released with its matching feed only after the gate passes.

## Source policy summary

- **NASA:** conditional, item-level route limited to the five exact registered NASA feed endpoints. Third-party/restrictive material, NASA branding and concept art/illustrations/simulations are not cleared for documentary-photo use.
- **Phys.org:** AMBER headline/link/date only; summaries are removed before storage.
- **ScienceDaily and Nature Portfolio:** blocked for the current persistent-database route.
- **Mongabay:** UNKNOWN until the exact item provides accepted open-licence and author evidence.
- **Wikimedia Commons:** exact file page, creator, accepted licence, credit, contextual caption and modification evidence are required.
- New or unregistered sources are UNKNOWN by default.

## Files

- `global_checker.py` — central text/image policy evaluator, decision store and final feed gate.
- `run_pipeline.py` — shared adapter around the existing view-specific Collector and Publisher code.
- `source-registry.json` — versioned exact source and image policy records.
- `live_earth_global_checker_bootstrap.py`, `.pth`, `setup.py`, `pyproject.toml` — installation and automatic dispatch through the existing requirements step.
- `tests/` — deterministic Checker and adapter tests.
- `integrations/INTEGRATION-CONTRACT.md` — integration and future-view requirements.

## Important boundary

Automated screening is an internal rights/provenance control, not a legal opinion or a guarantee that a source has disclosed every relevant right. Uncertain material remains UNKNOWN and is held.
