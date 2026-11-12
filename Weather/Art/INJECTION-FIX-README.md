# LIVE // EARTH — Weather Live Art injection fix

Fixes the HTML injection guard. The previous guard searched for the renderer filename anywhere in Home HTML; the controller bootstrap already mentions that filename in its asset list, so script injection was skipped.

The replacement checks for an actual script element loading `Weather/Art/live-art-online.js`.

## Apply
- Extract this ZIP at the repository root.
- Keep the existing root `sw.js` import unchanged:
  `importScripts("./Weather/Art/service-worker-extension.js");`
- Do not replace `sw.js` or modify Weather layout, `Weather/weather-view.js`, the art catalogue, or the tea artwork.

## Expected test
With internet enabled, open Weather and select RAIN. The title should change to **A Rainy Tea Afternoon** and paint progressively. This code fix still requires on-device verification.
