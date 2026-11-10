# LIVE // EARTH — Living Coast detail refinement

**Date:** 10 November 2026  
**Scope:** Direct refinement of the existing Weather view; portrait composition retained  
**Repository inspected:** `main` at `fad1859ce5ba6cbeed2734063efc3ed5e965ee1e`  
**Commit title:** `Refine Living Coast Mountains Clouds and River Flow`

## Design intent

This iteration keeps the approved sky-forward portrait composition and improves the detail systems without changing the overall screen layout. The target remains one continuous weather-responsive world: expansive sky above, mountain and riverlands through the middle, and a narrow coastal-water foreground.

## Changes

### Mountain formations

- Reworked the height field into three distinct groups of narrower summits with separate peak shoulders.
- Added broken ridge crest detail and higher-frequency alpine relief so the range reads as multiple mountains rather than a single rounded ridge.
- Broadened copper and ochre rock exposure across the western, central and eastern mountain groups.
- Increased and angularized the grouped rock outcrops on exposed slopes.
- Kept the existing terrain, foothill, vegetation and camera proportions; no non-uniform world scaling was introduced.

### Clouds and atmosphere

- Repositioned the existing independent volumetric cloud families into the upper portrait camera band and added more lobes for fuller cloud silhouettes.
- Cloud visibility remains driven by the selected forecast's cloud-cover percentage. Clear forecasts with effectively zero cloud cover may correctly show little or no cumulus; the scene does not invent clouds to decorate a clear-sky reading.
- Existing wind-driven movement, phase lighting, rain, snow, fog and thunderstorm effects remain connected to the selected forecast hour.

### River and coast

- Defined one shared river path guide for the stream geometry and forest-clearance placement, avoiding mismatched vegetation corridors.
- Expanded the river bends and increased the channel width gradually toward the lower valley and estuary.
- Created a dedicated river-current CanvasTexture, separate from the ocean-wave texture, and animated its UV offset downstream. This removes the repeated cross-channel banding that made the stream look like stacked strips.
- Kept the waterfall linked to the river's coastal lip and extended the sea mesh beyond the visible frame so its rectangular mesh boundary is less likely to appear at the bottom of the view.

### Lifecycle

- Explicitly dispose the procedural soil, rock, sea and river CanvasTextures during Weather deactivation, in addition to geometries and materials.

## Preserved contracts

- Existing `Weather/weather-view.js` registration and Stacks route.
- Existing Three.js same-origin module import.
- Open-Meteo source, 18-hour forecast, Celsius, km/h and millimetres.
- Shared Location Orb permission gate; no direct browser Geolocation call and no coordinate persistence.
- Location OFF and offline freshness handling, attribution, refresh and forecast selection controls.
- Existing responsive portrait/landscape camera profiles, reduced-motion mode, hidden-view pause and GPU teardown.
- No changes to Home, Earth Engine, Moon, Sun, Global Orbs, Stacks runtime, databases, service worker, Update Manager or unrelated views.

## Verification

The following local checks passed:

```sh
node --check Weather/weather-view.js
node Tests/weather-immersive-scene.test.cjs
node Tests/weather-floating-overlay-morning.test.cjs
node Tests/weather-scene-runtime.test.cjs
node Tests/weather-sky-dominant-composition.test.cjs
node Tests/weather-detail-refinement.test.cjs
```

`weather-scene-runtime.test.cjs` uses a mocked Three.js API. These checks validate source structure, forecast-state wiring and cleanup, but they do **not** establish browser WebGL visual fidelity, iPhone GPU behaviour, battery/thermal performance or actual device screenshots. The updated scene still requires visual review on the deployed iPhone build, especially during a partly-cloudy/rain state as well as clear daylight and night.

## Upload

Upload the ZIP intact to the repository root on `main`; keep `UPLOAD_MANIFEST.json` at the archive root. The manifest records the exact byte size and SHA-256 for each payload.

No GitHub write, commit, push or deployment was performed while preparing this package.
