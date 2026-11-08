# LIVE // EARTH — Earth Engine Daylight Contract

**Date:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Baseline:** `main` at `182fe2e4bb613be50206cf8f348c3feca7c8751e`  
**Scope:** Add shared solar daylight and day/night surface treatment to the existing Earth Engine. No view layout or view-specific camera/zoom behavior is changed.

## Locked Earth Engine responsibilities

The reusable Earth Engine owns these shared globe capabilities:

- Earth sphere geometry and the shared Earth surface texture.
- The `MeshStandardMaterial` surface and the atmospheric shell/material.
- Shared one-finger quaternion rotation and optional view-adapted pinch zoom.
- Quaternion-only globe orientation handoff and persistence.
- Public Engine contract version `2.2.0`.
- Shared solar daylight direction, baseline Earth scene-light tuning, and the day/night surface shader.

The Engine's daylight is enabled by default. A caller may explicitly opt out with `daylight: false`, but the standard LIVE // EARTH Home and Earth View instances use the default.

## Daylight behavior

- Solar declination and equation-of-time values are calculated from the current UTC date/time to derive the geographic subsolar point.
- The subsolar vector is transformed through the Earth surface's world quaternion. The globe's orientation remains quaternion-based; the daylight system does not read or write Euler rotation.
- The Engine reuses the scene's existing ambient and directional lights. It does not add a second light rig or duplicate scene objects.
- Baseline intensities are ambient `0.12`, key sunlight `2.3`, and secondary blue fill `0.055`.
- The existing Engine-owned blue atmosphere remains a separate translucent outer shell (default color `0x329dff`, opacity `0.13`).
- The surface shader uses the Sun-facing normal dot product for a soft terminator, restrained texture-coloured night-side terrain reveal (`0.14`), and cool twilight softness (`0.20`). The shader's solar vector points toward the Sun, so the night fill is applied to the hemisphere facing away from it.
- The scene's `onBeforeRender` hook updates the solar vector before Three.js collects scene lights. The surface hook also covers the first frame and lazily composes with any existing material shader callback so older per-view callbacks cannot create duplicate shader declarations.

## API and lifecycle

`createEarthGlobe()` continues to return the shared globe object. Its `daylight` property exposes:

- `daylight.update(scene, date?)` — refresh the solar direction and scene lights; the optional date supports deterministic validation.
- `daylight.getState()` — return the immutable baseline lighting values.
- `daylight.dispose()` — restore the previous scene/surface render hooks.

Disposing the Earth globe disposes the daylight controller along with its graphics resources. No timer, external image, or new offline dependency is added.

## Protected view boundaries

This update changes only the shared Earth graphics assembly module, the Earth Engine public version marker, its contract documentation, and its regression test. It does not change `index.html`, `Earth/earth-view-controller.js`, `Home/moon-orbit.js`, Moon, Sun, Location, Stacks, feature views, cameras, renderers, scene backgrounds, zoom limits, Home's locked zoom, or Earth View's Basic/HD and button controls.

Existing view-owned render loops and light objects remain in place. The Engine standardizes the existing light objects rather than adding duplicate ones. Existing shader callbacks are composed with the Engine shader patch for compatibility.

## Verification boundary

- JavaScript syntax checks passed for the modified graphics assembly module and public Engine module.
- The existing shared-rotation/pinch-zoom regression test passed.
- The new daylight contract regression test checks the shared solar calculation, quaternion transform, no-duplicate light-rig policy, shader falloff values, and cleanup hooks.
- A runtime smoke test with mocked Three.js objects passed: it exercised scene-light tuning, legacy shader-hook composition without duplicate declarations, the Sun-facing uniform, and disposal cleanup.
- This package does not claim a completed browser/iPhone visual retest. After upload and deployment, visually verify both Home and Earth View in daylight/nighttime orientations and repeat the existing Home → Earth View → rotate → Home first-touch regression check.

The repository owner uploads, commits, and deploys the package. No direct GitHub write is made by the assistant.
