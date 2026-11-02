# Image Engine — build handoff

- Existing core: `image-engine/image_engine.py` (version 0.2.0), unchanged.
- New Global Checker hand-off: `image-engine/image_engine_newsroom.py` (pipeline version 1.0.0).
- New full details: `image-engine/NEWSROOM-INTEGRATION.md`.
- Input: Global Checker collection-intake result, one View per hand-off.
- Nature: can attempt Wikimedia Commons contextual image only under the existing Checker policy; otherwise local procedural art.
- Alien World: original NASA image route stays with Collector/Checker; fallback is local procedural art. No Commons route is added.
- Every image candidate requires an exact GREEN Global Checker decision.
- No approved replacement = eligible text-only continuation.
- Per-View `published/assets/` paths remain isolated.
- No DB writes, no feed/PDF publication, no workflow changes.
- Existing Publisher integration is untouched.
- Tests intentionally not run until the full Newsroom is built.
