# LIVE // EARTH — Central Earth Intelligence (v143)

## Agreed architecture

One GitHub repository (`Live-Earth`), one Cloudflare Worker API and one Cloudflare D1 database shared by all six numerical worlds. The browser requests bounded curated responses only. Collection, validation, period filtering, counts, equal-window comparisons and retention cleanup run centrally. No browser database or second GitHub repository is used.

## Source connection status

- **Earth Activity:** connected to the USGS Earthquake Hazards Program past-7-day GeoJSON feed, collected hourly. Only source-reported earthquake catalogue records are published in this release.
- **Atmosphere, Oceans, Land, Water & Ice, Energy & Humanity:** registered, but awaiting approved numerical source adapters. The API reports them as unavailable; no values are fabricated.

## Data and retention

The shared schema records world, source, source-record identifier, signal, observation time, ingestion time, location coordinates when supplied, numeric value, unit, quality flag and source metadata. Unique source-record IDs prevent duplicate inserts when a rolling source feed is recollected. Observations and ingestion-run records older than 365 days are pruned daily.

API periods are `1d`, `7d` and `1y`. Responses are bounded to 100 recent events plus a daily timeline. The previous equal-length comparison is returned for 1-day and 7-day windows only; the prior one-year interval lies outside the one-year retention window and is not represented as available.

## Operational constraints

Cloudflare D1 currently supports up to 500 MB per database on Free and 10 GB on Workers Paid, and each database processes queries single-threaded. Keep the requested single-database architecture initially and monitor real usage. Consider partitioning only when measured storage or throughput justifies it. See [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

## Deployment and protection

Follow `Backend/Earth-Intelligence/README.md`. The Worker requires one D1 binding and an exact app-origin allowlist value. Keep the existing app views, feature registry and Stacks module loader intact. The service-worker cache and update-manager build IDs are advanced together to v143. No new GitHub Actions workflow is included.
