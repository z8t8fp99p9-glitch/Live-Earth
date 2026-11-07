# VERY VERY IMPORTANT — GLOBAL STANDARDS

## Global Orb
Global Orb behaviour, sizing, interaction, navigation and dependencies are protected. Do not modify the Orb system unless the owner explicitly requests it. Trace callers and test the actual iPhone interaction before accepting a change.

## Independent views
- Moon and Sun remain independent views with separate controllers/renderers.
- Do not merge their lifecycle or rendering implementations as a cleanup shortcut.
- Keep Home composition and its five primary Orbs unchanged unless explicitly requested.

## Shared engines
Global Collection Manager, Global Collector, Global Checker, Global Image Engine, Universal Editorial Engine and generic Newsroom Database Writer are shared services. Keep their global ownership and contracts. A View may own its profile, destination, presentation and data boundary without owning a duplicate copy of a Global service.

## Privacy and offline behaviour
- Location is OFF unless manually enabled.
- Do not request geolocation automatically.
- Preserve online/offline truthfulness; never show stale live data as current.
- Preserve runtime assets, local data and recovery behaviour.

## Retired Views
Nature and Alien World are retired. Their historical notes are records only, not instructions to restore their former schedules, collectors or publishers.
