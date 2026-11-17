# Project Continuity

**Project:** LIVE // EARTH  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Documentation baseline:** 15 November 2026

This document contains the safeguards that apply to every task. Current code is authoritative for exact implementation details.

## Non-negotiable rules

1. Inspect current `main`, callers, runtime dependencies and relevant tests before changing code.
2. Keep each change narrow, reversible and limited to the requested scope.
3. Preserve Home composition, five Home Orbs, the feature dock and their interaction contracts.
4. Keep Moon and Sun as separate views. Do not create a competing primary-view manager.
5. Location is OFF until the user explicitly enables it. Feature views may consume an approved fresh fix; they must not request GPS themselves.
6. Preserve Stacks registration, close lifecycle, hitbox alignment and animation cleanup.
7. Preserve offline startup, service-worker shell, update manager, local data and recovery. Never clear or migrate user data as generic troubleshooting.
8. Retain the Universal Editorial Engine. Do not restore the removed Collector, Checker, source discovery, newsroom database, Publisher, feed or Magazine systems.
9. Report source checks, local tests, ZIP validation, Actions, Pages deployment and device acceptance as separate evidence.
10. The user uploads and commits manually. Do not write directly to GitHub.

## Protected Home and iOS behaviour

Prime Earth framing, size, texture, baseline geometry, Moon orbit, star field and five-Orb layout are protected. `ios-standalone-root-flow.js` and orientation recovery in `Global/orb-controls-v4.js` are deliberate safeguards. A historically identified hidden Home visual has not been conclusively mapped; do not remove it or related assets without tracing and installed-iPhone testing.

## Shared architecture boundaries

- `Global/view-manager.js` owns primary-view transitions.
- `Global/view-module-registry.js` owns shared feature registration, Stacks lifecycle and the three-Orb feature dock.
- `Stacks/stacks-feature-views.js` provides the shared feature runtime.
- `EarthEngine/Core/earth-engine.js` is the shared Earth globe factory and owns quaternion-only viewpoint continuity.
- `Location/location.js` owns explicit permission and GPS watch lifecycle.
- `sw.js` and `Global/update-manager.js` must keep build identity and update contracts synchronized.

## Working sequence

Read this file, `GLOBAL-STANDARDS.md`, `PROTECTED-DECISIONS.md` and the ZIP standard. Then read `Documentation/CURRENT-STATUS.md`, `Documentation/ARCHITECTURE.md` and the relevant component note. Inspect source and callers, make the smallest safe change, test it, review the exact file scope and update only the affected documentation.

## Documentation policy

Keep current guidance short and canonical. Put only durable decisions in `Documentation/PROJECT-HISTORY.md`. Old experiments and one-off patch notes are not current specifications; Git history retains deleted documentation. Never delete runtime source, assets, tests or recovery data as part of documentation cleanup.
