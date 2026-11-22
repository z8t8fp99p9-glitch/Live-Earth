# Project Continuity

**Project:** LIVE // EARTH  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`

This document is the governing work-safety and source-of-truth contract. It is not a second architecture guide or a chronological project log. Exact implementation belongs to current source; durable milestone decisions belong in [`Documentation/PROJECT-HISTORY.md`](Documentation/PROJECT-HISTORY.md).

## Source of truth

1. For every substantive code or asset task, inspect the latest `main` before editing. Use `z8t8fp99p9-glitch/Live-Earth` on `main` as the sole source for repository code, assets, configuration and repository documentation.
2. Re-fetch the current branch state before each new task; do not treat an earlier checkout, user ZIP, local archive, Library copy or historical note as a replacement for current `main`.
3. If GitHub source access fails, report the exact repository, path/ref and error, then pause source-dependent work. Do not silently fall back to an older copy.
4. Project continuity and handoff documents outside the repository are instructions/history only; they are not implementation source.

## Non-negotiable working rules

- Inspect callers, runtime references, resource classification and relevant component notes before changing code. Keep each change narrow, reversible and within the requested scope.
- Do not refactor unrelated views or shared infrastructure. Preserve all protected decisions in [`PROTECTED-DECISIONS.md`](PROTECTED-DECISIONS.md) and the application-wide rules in [`GLOBAL-STANDARDS.md`](GLOBAL-STANDARDS.md).
- Never remove a runtime file, asset, recovery item or data path because it appears old or unused. Trace static imports, dynamic loads, service-worker routes, standalone entry points and compatibility paths first.
- Never reset or broadly clear Cache Storage, localStorage, sessionStorage, IndexedDB or user data as generic troubleshooting.
- Keep the Universal Editorial Engine utility. Do not restore the retired Collector, Checker, source-discovery, rights-processing, newsroom database, Publisher, feed or Magazine systems.
- The checked-in `Tests/` directory was retired by explicit owner direction. Do not restore it or claim that it provides regression coverage. Report only checks actually performed.

## Protected interaction and runtime boundaries

- Home/Prime Earth composition, framing, baseline geometry, Moon orbit, star field and five Home Orbs remain protected. A historically identified hidden Home visual has not been conclusively mapped; do not remove it or related assets without tracing and installed-iPhone testing.
- `Global/view-manager.js` remains the sole primary-view transition authority. Moon and Sun remain separate views.
- Location remains OFF by default and requires explicit user action. Other views consume approved fresh location state; they do not request GPS permission themselves.
- Stacks keeps its shared feature registry, stage, three-Orb dock, hitbox alignment and cleanup guards. Feature-specific close changes must stay inside the Stacks lifecycle; do not alter global browser timers.
- Preserve service-worker readiness, app-shell/offline startup, update coordination, local data and recovery. The separate startup/optional resource boundary is defined only in [`STARTUP-ESSENTIALS-POLICY.md`](STARTUP-ESSENTIALS-POLICY.md).

## Change, verification and release sequence

1. Confirm current `main`, identify the exact affected files and read the governing/component documentation.
2. State the protected boundaries and regression risks before editing.
3. Make the smallest change and run syntax/targeted checks. Review the complete diff and exact file list.
4. Build and validate one manifest-based ZIP. Do not modify `.github/` through the ZIP extractor.
5. The user uploads and commits the ZIP. Do not write directly to GitHub, create branches, commit, push, merge, rerun workflows or deploy.
6. Report source identity, ZIP validation, extractor result, Actions, Pages deployment and installed-device acceptance as separate gates. A green Pages run is not proof of iPhone acceptance.

## Documentation ownership

Use [`Documentation/INDEX.md`](Documentation/INDEX.md) as the only catalogue. `README-FIRST.txt` is the entry point; this file owns work/source safeguards; `GLOBAL-STANDARDS.md` owns app-wide behaviour; `PROTECTED-DECISIONS.md` owns approval boundaries; `STARTUP-ESSENTIALS-POLICY.md` owns the essential/optional resource boundary; `Documentation/CURRENT-STATUS.md` owns the current snapshot; `Documentation/ARCHITECTURE.md` owns the high-level architecture; component notes stay beside their components; and `Documentation/PROJECT-HISTORY.md` owns dated milestones. Do not duplicate a component contract in the root guidance files.
