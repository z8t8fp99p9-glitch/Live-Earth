# LIVE // EARTH Feed Collector service

This is a small read-only Python WSGI service for the Feed Collector workspace. It **reuses** the existing `global_collector.security.fetch`, `global_collector.parsers.parse_payload`, the shared continuation-page helpers in `global_collector.collector`, and the 38-field `global_collector.universal_post.normalize_post` function. It does not create a view-specific Collector, Manager job, Checker decision, database write, or Publisher action.

## Endpoints

- `GET /health` — service health.
- `POST /api/feed-collector/discover` — `{ "url": "https://example.org", "lookbackDays": 30 }` discovers declared and common-path RSS, Atom and JSON feeds, and counts entries inside the selected period.
- `POST /api/feed-collector/inspect-feed` — `{ "feedUrl": "https://example.org/feed", "lookbackDays": 30 }` returns feed metadata and all dated entries in the selected period, plus undated-entry count and full 38-field records.
- `POST /api/feed-collector/inspect-article` — `{ "articleUrl": "https://example.org/story", "lookbackDays": 30 }` returns the complete article, bounded continuation pages, image records, source metadata and rights evidence.

## Run

Run from the repository root so the existing `global_collector` package is importable:

```bash
python -m feed_collector_service
```

The development server listens on `127.0.0.1:8080`. Production must provide HTTPS, reverse-proxy `/api/feed-collector/*` and `/health` to the WSGI app, and set `FEED_COLLECTOR_ALLOWED_ORIGINS` to the exact LIVE // EARTH app origin(s), comma-separated. The origin allowlist is empty by default, so browser requests are blocked until `FEED_COLLECTOR_ALLOWED_ORIGINS` is configured. Set it to the exact LIVE // EARTH app origin(s), comma-separated. Use `*` only for temporary local testing. The service is intentionally stateless.

The browser workspace uses `feed-collector/discovery-config.js`. It defaults to the same-origin `/api/feed-collector` route. When the Python service is hosted on a separate HTTPS address, set `window.LIVE_EARTH_FEED_COLLECTOR_API_BASE` there to that host plus `/api/feed-collector`; configure the exact app origin in the API's allowlist. The service must be deployed from the repository root so imports of the existing `global_collector` package resolve. A static-only site host cannot execute this Python API by itself.

## Safety and boundaries

- All source retrieval goes through the existing Global Collector safe HTTPS fetcher, including DNS/private-address and redirect validation.
- Responses are bounded to 2 MiB and 12 seconds per page, with no retry for this interactive inspection flow.
- Discovery checks up to 50 declared/common feed locations and lists only RSS, Atom or supported JSON responses.
- Feed entry date windows are applied to source-published dates. Undated entries are counted separately, not silently assigned a date.
- Individual article inspection reuses the Collector's same-host-family continuation rule and its maximum of five continuation pages.
- No credentials, article HTML or feed contents are written to disk or a database by this service.
- Manager lineage is explicitly marked not applicable for user-initiated inspection. No fake Manager IDs, View IDs or database destinations are created.
- The API accepts public HTTPS URLs only and applies a basic per-process rate limit. Keep it behind HTTPS and an origin allowlist; for public production exposure, add host-level abuse protection.
