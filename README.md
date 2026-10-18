# LIVE // EARTH — Fixed World Map

A minimal, responsive, fixed-zoom world map for the LIVE // EARTH homepage. The map has no pan, zoom, or touch controls. Branding and map attribution are kept subtle so the world remains the focus.

## What changed

- Replaced the dashboard homepage with a full-screen global map.
- Fixed the map to a global view at zoom level 2.
- Disabled dragging, touch zoom, double-tap zoom, wheel zoom, keyboard movement, and zoom controls.
- Kept OpenStreetMap attribution visible as required.
- Updated the service-worker cache version so browsers can fetch the new homepage.

## Publish from an iPhone

1. Extract the ZIP in the iPhone Files app.
2. Open the `Live-Earth` folder and upload its **five files** to the root of the GitHub repository `Live-Earth`, branch `main`, replacing the files with the same names.
3. Commit with: `Replace dashboard with fixed world map homepage`
4. Wait for the GitHub Pages workflow to finish successfully.
5. Open the website and refresh it. If the old page remains, close the tab and reopen the site; an installed PWA may need to be fully closed and reopened to update its cached shell.

## Important limitations

- This is a fixed 2D global map, not a photorealistic 3D globe.
- Map tiles are fetched from OpenStreetMap tile servers and require internet access. OpenStreetMap's tile service has usage policies; this prototype is not a guarantee of unlimited or commercial-scale free map hosting. Keep the visible attribution.
- External Leaflet library and map tiles must load for the map to appear. If either is unavailable, the page may show an error or blank map.
- The map is not draggable, zoomable, or touch-interactive by design.
