# V89.0 candidate — validation report

## Source baseline
- Repository: `z8t8fp99p9-glitch/Live-Earth`
- Branch: `main`
- HEAD: `8893a872aab1166a43cdf7564b391ef68ef7d163`
- Original `orb-controls-v4.js` Git blob SHA: `2abaf3972a60c7123523083d11fdd8e03c3cc49c` (verified against the exact source fetched from current main)

## Static checks
- PASS — `node --check orb-controls-v4.js`.
- PASS — legacy `stacksOpen`, `featurePanel`, `stacksPanel()` and `showPanel()` implementation removed from the replacement controls file.
- PASS — fallback Stacks activation delegates to `window.LiveEarthFeatureViews.toggleLibrary()`; it does not create a second panel.
- PASS — `paintButtons()` skips the Stacks button, so it cannot overwrite the canonical controller's `aria-pressed` state.
- PASS — Location is still initialised OFF, and existing Location/geolocation state guards remain.
- PASS — orientation-change, resize, visualViewport resize and pageshow recovery handlers remain.
- PASS — no new script, image, cache, database, or service-worker dependency was introduced.
- PASS — rollback source matches the recorded current-main blob SHA.
- PASS — package ZIP integrity.

## Not tested
- Physical iPhone/iOS Safari touch behaviour.
- Installed PWA / old-cache / fresh-install regression matrix.
- GitHub Pages deployment and live SHA.
- The separately reported update error or a real update cycle.

## Scope note
This is a small first cleanup of the duplicate legacy Stacks panel in `orb-controls-v4.js`. It does **not** extract the complete Feature Orb controller from `view-module-registry.js` into a new script. That larger split would add startup/cache dependencies and should be considered separately only if still useful after this single-owner cleanup is verified.
