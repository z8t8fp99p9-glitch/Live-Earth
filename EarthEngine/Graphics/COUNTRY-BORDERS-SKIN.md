# Country Borders Skin

LIVE // EARTH shared geographic overlay.

- Data: Natural Earth 1:50m Admin 0 land boundary lines.
- Source: https://www.naturalearthdata.com/downloads/50m-cultural-vectors/
- Data file: `EarthEngine/Assets/country-boundaries-50m.json`
- Renderer: `EarthEngine/Graphics/country-borders-skin.js`
- Integration: `EarthEngine/Core/earth-engine.js`

The shared Earth Engine attaches this overlay to every globe it creates. View-specific numerical skins remain independent. Default styling is a subtle blue-white line at 62% opacity and a small radial offset above the globe to reduce z-fighting. The skin exposes `setVisible`, `setStyle`, and `dispose` for future view-level controls.

Natural Earth data is public domain. Keep the data file and renderer together when moving or extending this skin.
