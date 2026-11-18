# Atmosphere Country Borders Skin

- Scope: Atmosphere View only. This skin is not imported by Earth Engine.
- Data: Natural Earth 1:50m Admin 0 land boundary lines (public domain).
- Data asset: `Atmosphere/Assets/country-boundaries-50m.json`.
- Renderer: `Atmosphere/country-borders-skin.js`.
- Owner: `Atmosphere/atmosphere-view-controller.js`.

## Alignment contract

The skin uses the geographic frame explicitly documented by
`EarthEngine/Graphics/earth-engine-3d-graphics-engine.js`:
- longitude 0° faces local +X;
- east-positive longitude moves toward local -Z;
- positive latitude points +Y;
- longitude is normalized to -180°..+180°;
- positions are expressed in the Earth surface's local coordinate frame.

This is intentionally different from the numerical Grid Rendering Skin's
local +Z central meridian. The satellite texture and its Earth Engine mapping
are the alignment reference for this Atmosphere overlay.

The overlay is attached to the Atmosphere globe's existing Earth surface, so it inherits the same globe rotation. It is offset to radius 1.010, just above the numerical grid layer at radius 1.009. Antimeridian-crossing segments are not bridged.

The line object disables raycasting so recursive gesture picking continues to hit the actual Earth surface rather than decorative border lines. The Atmosphere controller owns creation and disposal.

## Styling

Default boundary colour: `#a8d8e8`; opacity: `0.62`; spherical ribbon width: `0.0048` world units. The skin uses a single indexed triangle mesh rather than WebGL line primitives because mobile browsers often ignore line width. Temperature grid opacity remains `0.75`. Atmosphere WebGL requests `high-performance` for the interactive globe; actual frame rate remains device-dependent.


## Adaptive border presentation

- Satellite/base mode: `#3A5568` at 32% opacity, render order 10.
- Temperature mode: `#263746` at 32% opacity, render order 3 (beneath the temperature GPU skin at render order 4).
- Both modes retain the same 0.0048 world-unit ribbon geometry and no glow.
- `Atmosphere/atmosphere-view-controller.js` switches the style when the selected dataset changes.


Visibility refinement: both adaptive border styles use 32% opacity so the geographic guides remain gently visible over satellite imagery and temperature fields.
