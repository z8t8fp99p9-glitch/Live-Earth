# LIVE // EARTH — Weather Clean Foundation, Stage 1

**Date:** 10 November 2026  
**Repository baseline inspected:** `main` at `02280bd0a885b0a949e6c7576f2fe0f9357118b0`  
**Scope:** Replace the Weather view's visible implementation with only a terrain surface, low mountain forms and one naturally winding river.

## Approved stage boundary

This is a deliberate clean foundation build. It does not continue the former Weather scene or retain its visible controls.

Visible in the Weather feature stage:

1. One continuous natural terrain surface.
2. A low mountain range made of separate peaks, connected ridge shoulders and foothills.
3. One winding river, carved into the terrain and rendered as a single smooth water ribbon.
4. A plain, clear background colour behind the terrain. There are no sky objects.

Not included in this stage:

- Weather title, status label, current temperature, condition, readings or insights.
- Forecast cards, 18-hour timeline, slider, refresh button or attribution.
- Weather API calls, location reads, browser geolocation or storage.
- Trees, forest, shrubs, rocks, buildings, wildlife, props, contours, decorative rings or platform walls.
- Clouds, sun/moon objects, fog, rain, snow, particles, waterfalls, ocean, waves or other effects.

The three Global Orbs are owned by the shared app shell. This module removes the former Weather panel and its descendants, then places a full-bleed 3D scene in the existing feature root. It does not create, restyle, move, or remove the Global Orbs. The existing Weather registration through the Stacks feature runtime remains the route into this stage.

## Geometry and composition

- Terrain is generated as a continuous indexed height-field mesh with a gently irregular far edge and no visible rectangular board or stacked cliff walls.
- Six low mountain masses form separate summits across the far/middle terrain, connected by a lower ridge and rolling foothills.
- Peak heights are deliberately restrained; this is a landscape foundation, not a towering single mountain wall.
- The river route is one shared control-point guide. The terrain height field uses that same guide to carve a broad shallow valley and a narrower channel bed.
- A Catmull–Rom curve smooths the river route. A variable-width ribbon follows the curve and blends deeper water at the centre into lighter shallows at the edges.
- Only two visible mesh objects are created: the terrain and the river.
- Portrait is the authored starting composition. Landscape and tablet layouts reframe the camera; terrain geometry is never non-uniformly stretched.

## App contracts preserved

- Existing `Weather/weather-view.js` path and `runtime.registerFeature('weather', ...)` registration.
- Existing same-origin `vendor/three.module.js` runtime import, already present in the app shell cache.
- Existing Global three-Orb dock and its active-Orb close behaviour are untouched.
- No edits to Home, Earth Engine, Moon, Sun, Location service, Stacks runtime, databases, service worker, update manager or unrelated views.
- WebGL resources, listeners and animation frame are cleaned up on deactivation; rendering pauses while the document is hidden and respects reduced-motion preference.

## Verification

The package updates the existing Weather view and its five directly relevant tests. Tests cover the minimal DOM, absence of the previous UI and decorative systems, mountain/river geometry contracts, responsive camera profiles, mesh construction and disposal.

The runtime test uses a mocked Three.js API. It verifies finite geometry, that only two visible meshes are constructed, river surface update wiring and disposal. It is **not** a real browser WebGL screenshot, device GPU, thermal or visual-fidelity test. The first real iPhone screenshot is still the acceptance step for this stage.

## Upload

Upload the ZIP intact to the repository root on `main`. The root `UPLOAD_MANIFEST.json` contains exact payload paths, byte sizes and SHA-256 hashes. No GitHub write, commit, push or deployment was performed while preparing this package.

**Commit title:** `Start Weather View from Clean Terrain and River Foundation`
