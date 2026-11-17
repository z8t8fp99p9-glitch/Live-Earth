# LIVE // EARTH — Central Earth Intelligence API

This directory contains the single Cloudflare Worker and migration set for all six numerical discovery worlds. The app repository remains the only GitHub repository. One Cloudflare D1 database stores the retained observations. Collection, period filtering, counts, comparisons and retention cleanup run in the Worker; the browser receives bounded, curated JSON only.

## Connected-source status in this release

| World | Status | Source |
|---|---|---|
| Earth Activity | Connected | USGS Earthquake Hazards Program — all earthquakes, past 7 days, GeoJSON |
| Atmosphere | Awaiting source | No measurements displayed |
| Oceans | Awaiting source | No measurements displayed |
| Land | Awaiting source | No measurements displayed |
| Water & Ice | Awaiting source | No measurements displayed |
| Energy & Humanity | Awaiting source | No measurements displayed |

The five pending worlds are registered in the app and database schema, but do not show synthetic or guessed values. A world becomes connected only after its source adapter and numerical mapping have been verified.

## Storage and API contract

- One D1 database shared by the six worlds.
- Retention is capped at 365 days from the source observation timestamp. A scheduled daily cleanup removes older observations and ingestion-run records.
- The collector checks the USGS past-7-day GeoJSON feed once per hour. The feed is updated by USGS more frequently, but this application polls hourly.
- Source record IDs are unique, so repeating the same weekly feed does not duplicate events.
- The API returns at most 100 recent events and a daily timeline. It never exposes raw database rows or write operations.
- `1d` and `7d` comparisons include the immediately preceding equal-length window. A prior `1y` window is outside the 365-day retention limit and is explicitly unavailable.
- No browser IndexedDB, GitHub Actions archive, second GitHub repository, PAT, or client-side data calculations are used for this pipeline.

Cloudflare's current D1 limits list a maximum database size of 500 MB on Free and 10 GB on Workers Paid. D1 is single-threaded per database. Start with one database as requested, monitor storage and query performance, and only consider splitting the database if measured limits require it. See [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

## One-time deployment

Requirements: a Cloudflare account, Node.js with npm, and Wrangler access to that account.

1. Upload the app patch ZIP to the existing `Live-Earth` repository using the existing ZIP extractor. Do not create a GitHub workflow or a private vault repository for Earth Intelligence.
2. Open a terminal in `Backend/Earth-Intelligence` from the repository checkout and run:

   ```bash
   npm install
   npx wrangler login
   npm test
   npx wrangler d1 create live-earth-intelligence
   ```

3. Cloudflare prints the new database ID. Replace the all-zero placeholder `database_id` in `wrangler.jsonc` with that exact ID. Keep the binding name `EARTH_INTELLIGENCE_DB` and database name `live-earth-intelligence` unchanged.
4. In `wrangler.jsonc`, replace `APP_ORIGIN` with the exact LIVE // EARTH site origin (scheme and hostname only; no path and no trailing slash). Do not use the Worker URL here.
5. Apply the schema and deploy the Worker:

   ```bash
   npx wrangler d1 migrations apply live-earth-intelligence --remote
   npx wrangler deploy
   ```

6. Copy the Worker URL printed by deploy. In the app repository, update the single URL in `Data/earth-intelligence-config.js` to that exact Worker URL, then upload that small app change through the same ZIP extractor. This value is public and is not a secret.
7. Verify the Worker endpoints:

   ```text
   https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/health
   https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/v1/worlds
   https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/v1/worlds/earth-activity?period=7d
   ```

8. Confirm `health` reports `database: "connected"`, and the world catalogue shows exactly one connected world until additional source adapters are completed.

The D1 database is created in Cloudflare; it is not created by uploading the ZIP. The app cannot display live API observations until the Worker is deployed and its URL is entered in `Data/earth-intelligence-config.js`.

## Endpoints

- `GET /health` — Worker and D1 binding status.
- `GET /v1/worlds` — six-world catalogue and source connection status.
- `GET /v1/worlds/{worldId}?period=1d|7d|1y` — curated summary for one world.
- `OPTIONS` — browser preflight for read-only requests.

Only `GET` and `OPTIONS` are exposed. No public write endpoint exists.

## Scheduled work

- `17 * * * *` UTC — fetch the USGS past-7-day GeoJSON feed, insert unseen observations, and record the ingestion result.
- `31 3 * * *` UTC — remove observations and ingestion logs older than 365 days.

Cloudflare notes that cron changes can take several minutes (up to 15 minutes) to propagate. The scheduled handler records failures in Worker logs and the D1 ingestion-run table. USGS feed observations are source-reported values; they are not predictions.

## Safe extension rule

Add future numerical sources as isolated adapters under this Worker. Every adapter must validate source identity, timestamp, numeric value and unit before inserting. Preserve source attribution and the source record ID for deduplication. Never use imagery, webcam frames, inferred visual observations, or fabricated values as scientific numerical inputs.
