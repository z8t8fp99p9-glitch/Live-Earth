# LIVE // EARTH — Residents Shared Activity Framework v141

**Date:** 9 November 2026  
**Baseline:** v140 — Evening Play refinement present on `main`  
**Scope:** one shared activity framework, its integration into the existing 3D Residents engine, focused regression updates and this note.

## Purpose

Build one reusable foundation for new Residents activities. The goal is to add activities by composing known movement, personality, interaction and environment behaviours, rather than creating a separate animation system for every new activity.

## Shared layers

- **Activity definitions:** a central definition for each existing activity ID, including its movement type, optional gait profile, interaction type and environment family.
- **Movement engine:** shared articulated walk/gait motion with configurable speed, stride and bounce. Existing morning movement can still pass its own profile; play and walk now read their registered profiles.
- **Personality layer:** stable movement-response traits for Red Hoodie Boy, Little Lady and Blue Jacket Boy. Shared interactions use these traits to preserve each resident's distinct energy and follow-through.
- **Interaction engine:** reusable ball-exchange timing, responsive actor-to-actor travel, contact and receiving beats, and ball-facing-foot selection based on actual horizontal direction. This is not restricted to a fixed left-to-right character order.
- **Environment layer:** common motion samples for hair, fabric and carried accessories. The existing wind sway remains the same while the sample can be reused by future weather-aware activities.

## What changed

`Residents/resident-3d-engine.mjs` now consumes `Residents/resident-activity-framework.mjs`. Evening Play uses the shared gait profile, ball-exchange timing, personality response and environment sample. Existing character geometry, facial features, clothing, accessories, roster order, activity IDs and Weather preview integration are retained.

The current activity-specific pose branches remain in place where they express genuinely different actions such as umbrellas, snow shivering, kite handling, gardening, dancing, sitting, picnic and camping. This is an intentional first migration: shared primitives are now available, but not every existing activity has been rewritten to use every layer.

## Adding future activities

1. Add the activity ID and public label to the existing Residents library catalog.
2. Add its reusable activity definition to `ACTIVITY_DEFINITIONS` in `resident-activity-framework.mjs`.
3. Compose an existing movement profile and interaction/environment service wherever possible.
4. Add a custom pose or prop only for behaviour the shared primitives cannot express cleanly.
5. Extend the common framework and regression tests once, rather than copying an engine per activity.

## Preserved boundaries

No character identity, face, hair, clothing, accessories, model scale, Weather layout, forecast data, preview controls, activity IDs, Three.js runtime, same-origin import, reduced-motion handling, mobile frame-rate ceiling, offline behavior, database, service worker, Home, Earth, Moon, Sun, orb, or unrelated view logic is intentionally changed. No external model, texture, library, network call or new asset is introduced.

## Verification

Run from the repository root:

```sh
node --check Residents/resident-activity-framework.mjs
node --check Residents/resident-3d-engine.mjs
node Tests/resident-activity-framework.test.cjs
node Tests/resident-3d-play-interaction.test.cjs
node Tests/resident-3d-refinement.test.cjs
node Tests/resident-3d-engine-contract.test.cjs
```

The local tests cover the activity registry, shared gait, personality traits, ball timing and direction-aware foot selection, environment samples, current Evening Play integration, the existing procedural-character contract and mobile lifecycle source checks. They do not establish visual correctness on the iPhone. After upload, extraction and deployment, test Weather → Residents Preview → Evening play, then switch through the existing preview options and check the character identities and rendering remain unchanged.

## Rollback

Restore the v140 `Residents/resident-3d-engine.mjs` and remove the new `Residents/resident-activity-framework.mjs`. Restore the four test files to their v140 versions if rolling back the complete patch. The v140 package remains the rollback reference.
