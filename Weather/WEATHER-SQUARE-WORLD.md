# Weather 3D — Forecast Controls Toggle Interaction Fix v20

## Floating controls toggle
- Preserve the compact 42px circular floating toggle at the lower-right of the Weather view, above the existing feature dock and respecting the safe-area inset.
- Explicitly set `pointer-events: auto` on the button. The parent `.wx2-ui` intentionally uses `pointer-events: none`, so the toggle must opt back in to receive taps.
- The button hides/restores only the forecast toolbar, range selector, scene selector, section heading, hourly cards and seven-day rows.
- Temperature, condition, metrics, status, 3D scenery and feature dock remain visible.
- The toggle retains its click handler, chevron update, accessible label and `aria-expanded` state.

## Approved composition lock
- Preserve the V18 pavilion orientation: 15 degrees counter-clockwise from original (`rotation.y = -15°`).
- Preserve Mount Fuji height (`0.54` vertical scale), rightward position (`x = +3.75`), depth (`z = -64`) and grounded origin (`y = 6.048`).
- Preserve the three continuous rolling ridges and lowered distant dark-green ridge.
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- No weather data, forecast, location permission, weather effects, pavilion geometry, trees, water or feature lifecycle changes.

## Upgrade and verification
- The service-worker extension upgrades an already-transformed V19 Weather module by adding explicit pointer interaction to the floating toggle.
- Runtime verification confirms the V19-to-V20 patch retains the button markup and click handler and adds the pointer-events correction.
