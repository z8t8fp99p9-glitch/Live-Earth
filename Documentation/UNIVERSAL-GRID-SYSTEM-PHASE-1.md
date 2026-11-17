# Universal Grid System — Phase 1: NOAA Atmosphere

## Architecture

The numerical-data path is split into reusable stages:

1. Provider snapshot manifest and metadata identify the dataset, grid geometry, units, valid time and checksum.
2. `EarthEngine/Graphics/universal-grid-system.js` fetches the snapshot, validates its metadata, decompresses the payload, verifies SHA-256 and normalizes the values into a flat typed array plus a common geographic grid definition.
3. A reusable visual skin consumes that normalized grid. `earth-grid-gpu-skin.js` uploads it as one compact RGBA texture and shades one sphere mesh. It does not create one JavaScript mesh per cell.
4. The world controller owns only its registered layer and view-scoped cleanup. The existing shared Earth and Stacks layer lifecycle remain in control.

The Universal Grid System is data-format infrastructure, not a per-dataset renderer. Future grid datasets should add or reuse a decoder in the shared system and select a reusable visual skin. Point-event datasets such as USGS earthquakes require a point-data path rather than being coerced into a continuous grid.

## Phase 1 connected dataset

- World: Atmosphere
- Dataset: `ATMOSPHERE_01` / `air_temperature`
- Provider: NOAA NCEP
- Product: GFS 0.25° analysis
- Variable: `t2m`
- Units: degrees Celsius
- Grid: 1440 × 721, latitude/longitude, south-to-north rows, 0.25° spacing, 0..360° longitude
- Encoding: little-endian signed int16; stored integer divided by 100
- Integrity: SHA-256 of the uncompressed value bytes must match the manifest before any values are displayed

This is a GFS model-analysis field, not direct thermometer observations. The interface displays the product's valid time separately from the manifest publication time.

## Rendering

The GPU skin maps normalized values to a texture and samples it on a UV sphere parented to the existing shared Earth surface. The initial temperature colour domain is fixed at -80 to 45 °C so colours do not silently rescale between refreshes. The shader uses alpha to omit invalid cells. The source grid remains 1440 × 721; the globe geometry is a lightweight 256 × 128 sphere.

## Safety and limitations

- A failed request, unsupported encoding, invalid grid, missing Web Crypto/gzip support or checksum mismatch prevents display; no synthetic values are substituted.
- The browser fetches the published repository snapshot over HTTPS. Raw GitHub CORS, service-worker caching and iOS memory/performance still require validation on the deployed app.
- This phase connects only the Atmosphere temperature dataset. It does not claim that all 56 catalog signals or all six worlds are connected.
- The existing cell-by-cell grid skin remains available for small grids, but must not be used for this full-resolution NOAA grid.
- Home, Earth Engine, Moon, Sun, Location, existing Weather/Clouds/Elevation/Traffic/Earthquakes and other numerical-world controllers are not intentionally modified by this patch.
