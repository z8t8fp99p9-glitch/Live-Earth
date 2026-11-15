# Live Cams — GitHub Pages Public Sources

**Build:** `v137-github-pages-public-cameras`

## Deployment model
Live Cams remains a static GitHub Pages feature. It makes direct, browser-side requests to public agency APIs and loads permitted image/video URLs directly from their publishers. There is no backend, API secret, proxy, database ingestion service, or paid stream session in this change.

## Enabled direct adapters
- Fintraffic Digitraffic — Finland weather-camera presets only when station collection status is `GATHERING` and preset `inCollection` is true. Frames refresh approximately every 10 minutes; CC BY 4.0 attribution is displayed.
- Hong Kong Transport Department via DATA.GOV.HK — public traffic snapshots; source refresh approximately every 2 minutes; government source attribution and source link are displayed.
- Singapore LTA via data.gov.sg — public traffic snapshots; endpoint documentation recommends polling at approximately one-minute intervals. Source timestamp is retained when supplied.

## Browser constraints
All metadata requests use direct HTTPS `fetch` with CORS mode and no credentials. Provider CORS is not assumed: each source is isolated and records its own diagnostic result. A CORS-denied provider is skipped without preventing other sources from loading. Image/video elements load provider-hosted media directly; no proxy is attempted.

## Media semantics
- Still snapshots are labelled with their provider refresh cadence, not misrepresented as continuous video.
- The three enabled direct providers currently supply still snapshots, not continuous video. The player can support a future provider-published direct video URL only after its API and reuse permission are verified.
- OpenEye WHEP remains an optional existing integration, separate from direct provider video.
- No unknown, paid, publisher-only, or unsupported stream is started automatically.
- Source URLs and attribution are retained per record.

## Limitations
- Public API availability, CORS headers, rate limits and media formats are controlled by each provider and can change.
- This is a browser-side discovery catalogue, not a persistent global camera database. Results are fetched when the Live Cams view is opened or searched.
- YouTube discovery is not included because automated search requires a Google API key; Windy is not included because its developer terms restrict redistribution and require its own linking/attribution model.
- Caltrans is deferred until its CWWP2 CCTV conditions are reviewed; its general dataset licence is not assumed to cover every live image.
- TfL is deferred because the current Unified API recommends account registration and an API key.
- New Zealand, Norway and other sources remain candidates pending confirmation of browser CORS and intended reuse terms.

## Validation still required
Test the three enabled source requests from the deployed GitHub Pages origin and on iOS Safari. Confirm the visible image loads, refresh cadence, attribution, and ensure still frames are never labelled as continuous video. A provider failing CORS must remain reported as unavailable rather than being silently proxied.
