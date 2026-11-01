# Nature — The Living World

- Stable view id: `nature`
- Publisher id: `nature-publisher`
- Publication window: previous complete UTC calendar month (`[month start, next month start)`).
- First in-app test edition: October 2026, `nature-202610`.
- Editorial profile: `profile.json`.

The Nature browser view is a consumer only. It reads `published/nature/live-feed.json` and `published/nature/catalog.json`, then opens the supplied PDF with the existing Global PDF Reader. It does not collect sources, open a database, write records or generate PDFs.

The October 2026 package contains a curated, source-linked test fixture used with an isolated in-memory SQLite database to exercise the production Universal Editorial Engine. It is not a persistent Nature production database, a live Collector or an automated monthly publishing schedule. Those components must be added as Nature-owned services before future monthly issues can be collected and published automatically. Alien World's database, Collector, Publisher and workflow remain untouched.
