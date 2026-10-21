LIVE // EARTH — Sky View Adaptive Integration (draft patch)

Contents
- sky-view-adaptive-layer.js: additive visual layer for the existing V58 Sky View.
- APPLY-CAREFULLY.txt: required service-worker integration steps and validation notes.

IMPORTANT
This package is a draft integration patch, not a complete production-ready changed-files ZIP. It intentionally does not include a reconstructed sw.js because the service-worker source must be edited from the exact current repository file, not regenerated from snippets.

Before this script can run, wire it into the current service worker:
1. In sw.js APP_SHELL, add "./sky-view-adaptive-layer.js", "./sun-sky-background-responsive.svg", and "./moon-sky-background-responsive.svg".
2. Increment CACHE_NAME from live-earth-shell-v58-sky-views to a new version such as live-earth-shell-v59-adaptive-sky-views.
3. In networkFirst(), after the existing sky-views.js injection block, inject:
   <script src="./sky-view-adaptive-layer.js" defer></script>
   only if the HTML does not already include it.
4. Ensure the script loads after sky-views.js. Do not edit index.html.
5. Verify the exact sw.js diff before upload.

Known caution:
The current V58 sky view marks the selected view through its heading text. This patch uses that heading to select the Sun/Moon SVG. It also removes the tray card styling and positions data groups independently. Because `.le-data` uses `display: contents`, verify pointer/touch behavior and layout on actual iPhone Safari and desktop browsers before approval.
The SVGs use orientation-specific groups and media queries. Some browsers may not apply media queries inside an externally loaded SVG background consistently; verify portrait/landscape rendering. If necessary, create separate portrait/landscape SVG files and select the URL with app CSS.

Protected Home Page:
Do not modify index.html, Earth/Moon size or position, camera framing, lighting, orbit curves, existing orb dimensions/positions, or orb-controls-v4.js.
No repository files have been changed by this package.
