# LIVE // EARTH — local data foundation package

This package preserves the existing homepage design and globe interaction. It adds a versioned IndexedDB foundation only; it does **not** connect live weather, earthquake feeds, or a Sun/Moon calculation engine yet. Provider selection, attribution, licensing and actual data adapters are later steps.

## Upload from iPhone
1. Download and extract `LIVE-EARTH-Local-Database-Foundation.zip` in Files.
2. Open the existing GitHub repository `z8t8fp99p9-glitch/Live-Earth` and branch `main`.
3. Upload/replace the package files in the repository root, keeping the exact filenames and folder level. Do not upload the ZIP itself as the app.
4. Commit with: `Add extensible local data foundation`
5. Wait for GitHub Pages to redeploy, then open the app online once. The database initialization is silent; it does not add buttons, cards, labels or overlays.

## Included files
- `index.html`: same visual composition and interaction, with an isolated dynamic import to initialize IndexedDB without blocking the globe.
- `data-store.js`: versioned IndexedDB schema, typed helper methods, expiry cleanup, and a startup save/retrieve/delete smoke test.
- `dataset-manifest.json`: catalog of planned dataset modules; clearly labels providers as not yet selected/connected.
- `sw.js`: shell cache revision bump and inclusion of the new local files.
- `manifest.json`, `icon.svg`: current app metadata and icon, unchanged.

## Local database stores
`locations`, `preferences`, `dataset_catalog`, `astronomy_cache`, `weather_cache`, `earthquakes`, and `asset_metadata`.

Retention rules are 30 days for cached astronomy results, 3 days for weather snapshots, and 365 days for earthquake events. Locations, preferences and catalog metadata are not automatically removed. Earthquake event timestamps should be numeric Unix milliseconds. Each event should have `id`, `eventTime`, `magnitude`, `location`, and an official `url`.

## Important limitations
- IndexedDB is local to this browser/device and is not cloud sync. Clearing website data or browser storage eviction may remove it.
- GitHub Pages is static hosting, not a server database.
- No weather or earthquake provider has been activated. No Sun/Moon engine has been integrated yet.
- The startup self-test runs in the browser after deployment and logs no UI. This package can be syntax-checked before upload, but real iPhone-browser verification requires loading the deployed app.
- No 50–60 MB asset collection is bundled. Assets should be licensed, selected and downloaded individually on demand later.
