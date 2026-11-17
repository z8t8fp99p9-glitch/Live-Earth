# LIVE // EARTH — Earth Intelligence Backend

This is the first online backend foundation for the six numerical discovery worlds. It is a separate Cloudflare Worker + D1 service; it is not hosted by GitHub Pages and it is not deployed by the repository ZIP extractor.

## Data policy

- The central D1 database stores raw observations, normalised observations, detected pattern candidates, verified events, event history, source metadata and published snapshots.
- Retention is capped at **365 days**. The daily scheduled cleanup enforces the configured value, and the code clamps it to a maximum of 365 days.
- The app-facing API exposes only six world availability records and a deliberately small Publisher snapshot. There is no public raw-observation, source-payload, or internal-event-history endpoint.
- A published snapshot expires for public display after six hours unless it is republished. Its database record remains subject to the 365-day retention policy.
- Pattern detection creates candidates only. It does not declare an event verified. A separate authenticated review action is required before an event can be published.
- No provider is silently assumed. The initial backend accepts records only from explicitly registered and approved sources. Provider-specific collectors are a later integration phase.

## Folder contents

- `src/index.js` — Worker API, authenticated ingestion/review/publishing routes, anomaly candidate calculation, public curated endpoints and scheduled cleanup.
- `migrations/0001_initial.sql` — D1 schema and indexes.
- `wrangler.jsonc` — Worker, D1 binding and daily retention-cleanup schedule.

## Deploy

Requirements: a Cloudflare account with Workers and D1 enabled, and Node.js/npm available on a computer with Wrangler installed.

1. In Cloudflare, create a D1 database named `live-earth-intelligence`.
2. Copy its database ID into `wrangler.jsonc`, replacing `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID`.
3. Replace `APP_ORIGIN` with the exact deployed LIVE // EARTH origin (scheme + hostname only; no path or trailing slash).
4. From this directory, run `npx wrangler d1 migrations apply live-earth-intelligence --remote`.
5. Set the private ingestion/review token: `npx wrangler secret put INGEST_TOKEN`.
6. Deploy: `npx wrangler deploy`.
7. Open the Worker URL and check `/health`.

Do not put `INGEST_TOKEN` in the website, repository, browser code, or ZIP manifest. Only the backend operator should hold it.

## API

Public, read-only:

- `GET /health`
- `GET /v1/worlds`
- `GET /v1/worlds/{worldId}` where worldId is one of the six world IDs.

Authenticated (Bearer `INGEST_TOKEN`):

- `POST /internal/sources` — register source metadata; new sources start as `pending`.
- `POST /internal/sources/{sourceId}/approve` — explicitly approve a registered source for ingestion.
- `POST /internal/observations` — ingest 1–500 validated numerical observations. Values are retained with their units; `identity-v1` currently preserves the source unit/value and does not pretend to convert units.
- `POST /internal/verify-event` — human/operator review of a detected pattern candidate and creation of a verified event with evidence.
- `POST /internal/publish/{worldId}` — publish a limited snapshot. Up to 8 metrics, 5 verified events and 7 timeline points are accepted.

All internal endpoints require the bearer token. Public endpoints never expose raw observation rows, source payloads, internal pattern evidence or event history.

## Observation payload shape

```json
{
  "observations": [
    {
      "worldId": "atmosphere",
      "sourceId": "approved-source-id",
      "sourceRecordId": "provider-record-123",
      "signalId": "air-temperature",
      "observedAt": "2026-11-17T00:00:00.000Z",
      "value": 18.4,
      "unit": "degC",
      "latitude": 28.6,
      "longitude": 77.2,
      "regionCode": "IN-UP"
    }
  ]
}
```

This is an API contract example, not a real measurement. Do not submit it as live data.

## Important current limits

- No external data provider adapters are bundled yet. The system is deliberately not populated with synthetic data.
- The first anomaly calculation is a conservative rolling z-score candidate detector. It requires at least 20 prior observations for the same world/signal/region in the preceding 30 days and a 3-standard-deviation threshold. It is not an event-verification engine.
- The current normaliser records a version and preserves original value/unit. Source-specific unit conversion, geospatial aggregation, robust baselines and cross-signal intelligence are future engine work.
- The website's six visual worlds remain usable as previews until the Worker is deployed and the front-end API connection is configured in a subsequent step.
