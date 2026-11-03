# LIVE // EARTH — Global-Only Collection Repair Rollback

**Prepared:** 3 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`

## What this upload changes

This repair removes the independent Nature and Alien World collection code paths. The Global Collection Manager assigns the work and database destination; the same Global Collector collects transient source records; the Global Checker, Image Engine, and Editorial stages process them; and the shared Newsroom Database Writer persists only released stories. The View publishers remain presentation adapters and read only their own approved rows.

The two workflow files cannot be applied by the ZIP Extractor because it blocks `.github/` paths. Their complete replacements are provided at:

- `nature/publisher/NATURE_PUBLISHER_WORKFLOW_UPDATE.yml`
- `alien-world/publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml`

## Rollback

If a regression is confirmed after upload, use GitHub's **Revert** action on the ZIP Extractor application commit titled `Apply LIVE // EARTH Main Upload`. Verify the changed-file list before reverting. Do not revert unrelated publication commits.

The two manual workflow replacements are separate GitHub file edits. To roll those back, restore the previous contents of `.github/workflows/nature-publisher.yml` and `.github/workflows/alien-world-publisher.yml` from the commit immediately before those manual edits.

Do not delete, reset, replace, or truncate either View database or cache as a rollback measure. The shared Writer performs additive schema setup, verifies database ownership, and scopes retention to the Manager-selected View and its configured retention period.

## Protected boundaries

No app Home, Moon, Sun, Orb, UI layout, service worker, offline behaviour, IndexedDB, saved PDF, local recovery, or location-privacy files are included in this repair.
