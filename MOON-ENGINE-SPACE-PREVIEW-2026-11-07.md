# LIVE // EARTH — Moon Engine Space Preview

Date: 7 November 2026  
Scope: Moon Engine inspection preview only.

## Requested presentation

Replace the dashboard/card presentation in the Moon Engine inspection workspace with a clean, immersive deep-space view. The Moon is the sole visible body, centred against a dark star field. The preview no longer displays the framed stage, orbit diagram, Earth reference ball, heading block, status strip, or dashboard controls.

## Behaviour preserved

- Moon Engine API and registration names remain unchanged.
- The lunar-date, orbital-position, phase, illumination and synchronous-spin calculations remain active.
- `createPreview()` continues to create an independent disposable preview instance.
- `mountShared()` retains its existing Earth reference, orbit geometry and orbital Moon scene for future production integration.
- Feature Orb registry and Global Orb lifecycle/dependencies are unchanged.
- No Home Earth, existing Moon View, Sun View, `update-manager.js`, `sw.js`, or production renderer files are changed.

## Source baseline

The patch was based on the files verified on GitHub `main`:

- `moon-engine.js` — blob `82d91474882b2eb3dcff7a3b5dc20253c89be1e6`
- `celestial-engine-feature-views.js` — blob `bf72c20c6c473524a1bad85169056b79d86a4f1c`

## Validation performed

- JavaScript syntax checks passed for both modified files (`node --check`).
- A lightweight Three.js/DOM test harness confirmed the preview creates one centred Moon sphere and no visible Earth/orbit geometry.
- Phase checks passed: the reference new-Moon date produces 0% illumination and the half-synodic-cycle date produces 100% illumination.
- Preview pause, resume, speed, reset and destroy lifecycle checks passed.
- The shared engine path still creates its original three-part Earth/orbit/Moon scene and returns orbital-position state.

## Not yet verified

This is not an actual iPhone/WebGL device test. The user should visually inspect the Moon workspace after the ZIP workflow applies the patch. Earth and Sun preview presentations are intentionally unchanged until the Moon presentation is approved.
