# Protected Decisions

Changes to these areas require explicit owner approval and a targeted verification plan.

| Area | Preserve |
|---|---|
| Home | Approved Earth composition, camera/framing, texture, baseline geometry, Moon orbit, stars and five Home Orbs |
| Global Orbs | Five-Orb Home row, three-Orb feature dock, sizing, positions, hitboxes and close behaviour |
| Navigation | `Global/view-manager.js` remains the sole primary-view authority |
| Location | OFF by default; explicit permission only; no automatic GPS request |
| Moon and Sun | Separate controllers, renderers, calculations and view-specific UI |
| Earth Engine | Shared globe factory and quaternion-only viewpoint handoff; separate view-owned scenes/cameras/renderers |
| Stacks | Shared feature registry, stage, dock, scatter coordinates, hitbox alignment and cleanup guards |
| iOS root flow | Full-screen and orientation recovery; trace the hidden Home visual before considering removal |
| Startup/update | Service-worker shell, cache policy, update manager, readiness checks and synchronized build identity |
| Local data | IndexedDB, local preferences, recovery and retained datasets; no destructive reset or migration without a plan |
| Runtime assets | Textures, renderers, offline dependencies and assets referenced by source or service worker |
| Editorial Engine | Retain the core, browser helper, text utilities and its existing Feature workspace |
| Removed publishing systems | Do not restore Collector, Checker, source discovery, rights processing, newsroom database, Publisher, feed or Magazine modules |
| Upload standard | Keep `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md` at root, unchanged |

Before changing a protected area: trace its callers and dependencies, state the risk, make the smallest reversible change, run targeted tests, review the diff and verify the relevant online/offline and iPhone flows.
