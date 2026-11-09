# LIVE // EARTH — Residents 3D Render Recovery v142

**Date:** 9 November 2026  
**Baseline:** v141 on `main` — `7cf70d99aef891792cde13757671261181e6d612`  
**Scope:** `Residents/resident-3d-engine.mjs`, one new regression test, and this recovery note.

## Root cause

The v141 animation loop sampled `environmentMotion` after the same per-resident callback had already read `environmentMotion.fabricSway` and `environmentMotion.accessorySway`. Because the binding is a `const`, those earlier reads hit its temporal dead zone and throw a `ReferenceError` on the first animation frame. The WebGL canvas was created successfully, so the Weather loader could report `renderMode=3d`, while the stopped render loop left the preview visually blank.

## Fix

Sample the shared environment state once at the beginning of each resident animation pass, before any clothing, bag, or hair reads. No models, materials, roster entries, activity IDs, poses, Weather UI, preview controls, or renderer lifecycle semantics are changed.

## Regression coverage

`Tests/resident-3d-animation-order.test.cjs` verifies that the per-resident environment sample occurs exactly once and before every clothing/accessory/hair read. This specifically protects against the v141 temporal-dead-zone failure.

## Verification

The following checks passed locally against the v142 package (with the unchanged repository `Residents/resident-library.js` present for the engine-contract test):

```sh
node --check Residents/resident-3d-engine.mjs
node --check Residents/resident-activity-framework.mjs
node Tests/resident-3d-animation-order.test.cjs
node Tests/resident-3d-engine-contract.test.cjs
node Tests/resident-3d-play-interaction.test.cjs
node Tests/resident-3d-refinement.test.cjs
node Tests/resident-activity-framework.test.cjs
```

These checks validate syntax, contracts, existing resident behavior assumptions, and the corrected declaration order. They do not replace final iPhone verification after upload, extraction, and deployment.

## Preserved boundaries

Only the Residents 3D engine and regression coverage/documentation are changed. Character identities, faces, hair, clothing, accessories, Three.js import, shared activity framework, activity IDs, Weather layout and preview controls, forecast behavior, reduced-motion setting, mobile frame ceiling, WebGL cleanup, offline behavior, databases, service worker, Home, Earth, Moon, Sun, and orbs remain untouched.

## Rollback

Restore the v141 `Residents/resident-3d-engine.mjs` and remove the new animation-order regression test and this note. Keep v140 and earlier checkpoints unchanged.
