# LIVE // EARTH — Earth Engine Daylight Contract

**Date:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Baseline:** `main` at `d96e745b4735118be9b93742733cd0045cb678ca`  
**Scope:** Add shared solar daylight and day/night surface treatment to the existing Earth Engine. No view layout or view-specific camera/zoom behavior is changed.

## Locked Earth Engine responsibilities

The reusable Earth Engine owns these shared globe capabilities:

- Earth sphere geometry and the shared Earth surface texture.
- The `MeshStandardMaterial` surface and the atmospheric shell/material.
- Shared one-finger quaternion rotation and optional view-adapted pinch zoom.
- Quaternion-only globe orientation handoff and persistence.
- Public Engine contract version `2.3.0`.
- Shared solar daylight direction, baseline Earth scene-light tuning, and the day/night surface shader.

The Engine's daylight is enabled by default. A caller may explicitly opt out with `daylight: false`, but the standard LIVE // EARTH Home and Earth View instances use the default.

## Daylight behavior

- Solar declination and equation-of-time values are calculated from the current UTC date/time to derive the geographic subsolar point.
- The subsolar vector is transformed through the Earth surface's world quaternion. The globe's orientation remains quaternion-based; the daylight system does not read or write Euler rotation.
- The Engine provides its own ambient, directional sunlight and blue-fill light rig as children of the Engine globe group. This guarantees light on the first Home frame without Home creating lights. When a view already supplies ambient or directional lights (as Independent Earth View currently does), the Engine hides the corresponding fallback lights and updates the view-provided lights instead of duplicating illumination.
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

The daylight ownership update changes the shared Earth graphics assembly module and public Engine version. Home removes its own light construction and relies on the Engine rig; Home camera, renderer, framing, star field, Moon orbit, navigation and locked zoom remain as they were. The Service Worker no longer injects the legacy Home-only day/night code. Home Location marker visuals are temporarily disabled while the coordinate API remains available. Independent Earth View, Moon, Sun, Location, Stacks, feature views, and Earth View Basic/HD and button controls are not otherwise changed.

Existing view-owned render loops remain in place. The Engine owns the fallback light rig and uses external view lights when they exist. Existing shader callbacks are composed with the Engine shader patch for compatibility.

## Verification boundary

- JavaScript syntax checks passed for the modified graphics assembly module and public Engine module.
- The existing shared-rotation/pinch-zoom regression test passed.
- The daylight contract regression test checks the shared solar calculation, quaternion transform, Engine fallback light ownership, view-light reuse, shader falloff values, and cleanup hooks.
- A runtime smoke test with mocked Three.js objects passed: it exercised scene-light tuning, legacy shader-hook composition without duplicate declarations, the Sun-facing uniform, and disposal cleanup.
- This package does not claim a completed browser/iPhone visual retest. After upload and deployment, visually verify both Home and Earth View in daylight/nighttime orientations and repeat the existing Home → Earth View → rotate → Home first-touch regression check.

The repository owner uploads, commits, and deploys the package. No direct GitHub write is made by the assistant.
