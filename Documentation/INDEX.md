# Documentation Index

**Reviewed:** 23 November 2026

This is the only documentation catalogue. Read the root governance first; then open the architecture or component contract that matches the task. Do not treat historical snapshots, retired-system notes or creative archives as current runtime specifications.

## Start here — governance and release

- [`../README-FIRST.txt`](../README-FIRST.txt) — entry point and reading order.
- [`../PROJECT-CONTINUITY.md`](../PROJECT-CONTINUITY.md) — GitHub-only source rule, scope safeguards and work sequence.
- [`../GLOBAL-STANDARDS.md`](../GLOBAL-STANDARDS.md) — app-wide navigation, view, privacy and offline standards.
- [`../PROTECTED-DECISIONS.md`](../PROTECTED-DECISIONS.md) — approval boundaries.
- [`CURRENT-STATUS.md`](CURRENT-STATUS.md) — current source/deployment snapshot and open verification gates.
- [`../STARTUP-ESSENTIALS-POLICY.md`](../STARTUP-ESSENTIALS-POLICY.md) — authoritative startup/optional resource boundary.
- [`WORKING-RULES.md`](WORKING-RULES.md) — compact pre-change, verification and release checklist.
- [`../ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md`](../ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md) — immutable ZIP/extractor standard.

## Core architecture and runtime contracts

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — high-level application architecture and ownership map.
- [`EARTH-ENGINE.md`](EARTH-ENGINE.md) — Prime Earth / Earth Engine distinction, factory API and viewpoint ownership.
- [`STACKS-FEATURE-VIEWS.md`](STACKS-FEATURE-VIEWS.md) — Stacks catalogue, optional module loading and shared feature lifecycle.
- [`NUMERICAL-WORLD-GRID-SKIN-LIFECYCLE.md`](NUMERICAL-WORLD-GRID-SKIN-LIFECYCLE.md) — shared numerical-world and grid-skin lifecycle.
- [`UNIVERSAL-GLOBE-GRID-RENDERING-SKIN.md`](UNIVERSAL-GLOBE-GRID-RENDERING-SKIN.md) — reusable grid-rendering skin input and safeguards.
- [`UNIVERSAL-GRID-SYSTEM-PHASE-1.md`](UNIVERSAL-GRID-SYSTEM-PHASE-1.md) — NOAA Atmosphere grid-system Phase 1.
- [`WIND-VECTOR-DATA-ARCHITECTURE.md`](WIND-VECTOR-DATA-ARCHITECTURE.md) — approved, not-yet-implemented Wind vector data/rendering direction.
- [`EARTH-INTELLIGENCE-ARCHITECTURE.md`](EARTH-INTELLIGENCE-ARCHITECTURE.md) — numerical-world database and publication boundary.
- [`SPATIAL-GRID-DAILY-STORAGE.md`](SPATIAL-GRID-DAILY-STORAGE.md) — reusable spatial-grid daily storage design.
- [`SCIENTIFIC-DATA-COLLECTION-PHASE-1.md`](SCIENTIFIC-DATA-COLLECTION-PHASE-1.md) — Phase 1 collection delivery and remaining scope.

## Feature and domain references

**Atmosphere and composition**
- [`ATMOSPHERE-FOUR-FIELD-UNIVERSAL-CONNECTION.md`](ATMOSPHERE-FOUR-FIELD-UNIVERSAL-CONNECTION.md) — four controls and five dataset IDs.
- [`ATMOSPHERE-CINEMATIC-HUD-PHASE-2.md`](ATMOSPHERE-CINEMATIC-HUD-PHASE-2.md) — Atmosphere HUD design note.
- [`../Atmosphere/TEMPERATURE-THERMAL-AURA.md`](../Atmosphere/TEMPERATURE-THERMAL-AURA.md) — thermal aura visual contract.

**Weather**
- [`WEATHER-EXPLORER-WORLD.md`](WEATHER-EXPLORER-WORLD.md) — living-world composition, data and lifecycle contract.
- [`../Weather/WEATHER-DESIGN-DIRECTION.md`](../Weather/WEATHER-DESIGN-DIRECTION.md) — current visual/behaviour direction and retired experiments.
- [`../Weather/README-WEATHER-VIEW-V2.md`](../Weather/README-WEATHER-VIEW-V2.md) — Weather v2 integration/verification notes.
- [`../Weather/WEATHER-SQUARE-WORLD.md`](../Weather/WEATHER-SQUARE-WORLD.md) — square scene and pavilion structure dimensions.
- [`../Weather/Art/README.md`](../Weather/Art/README.md) and [`../Weather/Art/SHA256-MANIFEST.txt`](../Weather/Art/SHA256-MANIFEST.txt) — preserved Weather art archive and integrity record.

**Data and repository components**
- [`../Data/Universal/README.md`](../Data/Universal/README.md) — Universal dataset architecture.
- [`../Data/Universal/README-CUTOVER.md`](../Data/Universal/README-CUTOVER.md) — current-value cutover record.
- [`../Data/Universal/MIGRATION-PLAN.md`](../Data/Universal/MIGRATION-PLAN.md) — dataset-first migration plan.
- [`../Data/Universal/engine/adapters/README.md`](../Data/Universal/engine/adapters/README.md) — native source adapter notes.
- [`../Editorial-Engine/README.md`](../Editorial-Engine/README.md) — retained Editorial Engine scope and boundaries.
- [`../EarthEngine/Assets/README.md`](../EarthEngine/Assets/README.md) — Earth Engine texture asset note.
- [`LATEST-AVAILABLE-INDEPENDENT-PUBLISHING.md`](LATEST-AVAILABLE-INDEPENDENT-PUBLISHING.md) — historical/limited collection and publishing note; not authority to restore retired publishing systems.

**Per-domain data-view notes**
- [`../atmosphere/README.md`](../atmosphere/README.md), [`../oceans/README.md`](../oceans/README.md), [`../land/README.md`](../land/README.md), [`../water_ice/README.md`](../water_ice/README.md), [`../earth_activity/README.md`](../earth_activity/README.md), [`../energy_humanity/README.md`](../energy_humanity/README.md).

## Recovery and operational references

- [`../Recovery/README-ROLLBACK.md`](../Recovery/README-ROLLBACK.md) — rollback reference.
- [`../Recovery/RECOVERY-ROLLBACK.txt`](../Recovery/RECOVERY-ROLLBACK.txt) — compact recovery steps.
- [`../Recovery/WEATHER-VIEW-V2-ROLLBACK.md`](../Recovery/WEATHER-VIEW-V2-ROLLBACK.md) — Weather-specific rollback reference.

## History and archives

- [`PROJECT-HISTORY.md`](PROJECT-HISTORY.md) — canonical dated milestone timeline.
- [`HISTORY-INDEX.md`](HISTORY-INDEX.md) — compatibility pointer to the history section of this index.
- [`Archive/2026-11-20-CURRENT-STATUS-SNAPSHOT.md`](Archive/2026-11-20-CURRENT-STATUS-SNAPSHOT.md) — preserved 20 November status record; superseded for current status.
- [`PHASE-3-RUNTIME-AUDIT.md`](PHASE-3-RUNTIME-AUDIT.md) — dated runtime/asset audit; treat findings as evidence from its stated checkpoint, not as current-source truth.
- [`LIVE-CAMS-PUBLIC-SOURCES.md`](LIVE-CAMS-PUBLIC-SOURCES.md) and [`LIVE-CAMS-VIDEO-ENGINE.md`](LIVE-CAMS-VIDEO-ENGINE.md) — retired Live Cams implementation records only; Live Cams is not an active feature.
- [`../README.md`](../README.md) — historical Universal Collector Fix Package v4 note, not the current entry point.

## Documentation placement rule

Application-wide rules stay in the root governance files. Cross-cutting architecture stays in this folder. Feature design and implementation notes stay beside the owning feature. Historical milestones live only in `PROJECT-HISTORY.md`; dated audit snapshots remain explicitly dated under `Archive/` or in their own audit files. Keep the index as the only catalogue; do not create parallel indexes or copy complete component contracts into `ARCHITECTURE.md`.
