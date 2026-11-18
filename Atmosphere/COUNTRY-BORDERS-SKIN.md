# Atmosphere Country Borders Skin

This is intentionally owned by the Atmosphere View Controller only. It is not
registered in, imported by, or created from the central Earth Engine. Other
views may select a different country-boundary skin later.

- Source: Natural Earth 1:50m Admin 0 land boundary lines (public domain).
- Runtime: `Atmosphere/country-borders-skin.js`
- Dataset: `Atmosphere/Assets/country-boundaries-50m.json`
- Owner: `Atmosphere/atmosphere-view-controller.js`

The view attaches the lines to the Earth surface so the overlay inherits the
surface's geographic alignment and rotation. It renders above the temperature
layer and is disposed with the Atmosphere globe. Styling is isolated from the
shared numerical grid renderer and central Earth Engine.
