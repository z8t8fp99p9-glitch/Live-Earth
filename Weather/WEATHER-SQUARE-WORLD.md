# Weather 3D — Forecast Controls Toggle v19

## Floating controls toggle
- Add a compact 42px circular floating button at the lower-right of the Weather view, positioned above the existing feature dock and respecting the device safe-area inset.
- The button toggles the forecast controls as one group:
  - Today / 7 Days range selector
  - Weather scene selector
  - Forecast section heading
  - Hourly forecast cards
  - Seven-day forecast rows
- The default state remains expanded so the current Weather view opens exactly as before.
- When collapsed, the temperature/condition header, weather metrics, status text, 3D scene, feature dock and navigation remain visible.
- The button updates its chevron, accessible label and `aria-expanded` state on each toggle.

## Approved composition lock
- Preserve the V18 pavilion orientation: 15 degrees counter-clockwise from original (`rotation.y = -15°`).
- Preserve Mount Fuji height (`0.54` vertical scale), rightward position (`x = +3.75`), depth (`z = -64`) and grounded origin (`y = 6.048`).
- Preserve the three continuous rolling ridges and lowered distant dark-green ridge.
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Do not alter weather data, forecast generation, Location permission flow, weather effects, pavilion geometry, trees, water or feature lifecycle.

## Upgrade and verification
- The service-worker extension upgrades an already-transformed V18 Weather module by adding the toggle markup, scoped CSS and click handler.
- The controls begin expanded; tapping the floating button hides or restores only the requested forecast controls.
- The transformed module is returned only after checks confirm the toggle markup, collapsed-state selectors, click handler, approved Fuji, pavilion rotation, hills and camera.
