# Nature Live Publisher

The Publisher is Live-Feed-only. It accepts `--mode live`, reads `.publisher-data/nature/nature.sqlite3` with SQLite `mode=ro` and `PRAGMA query_only=ON`, and invokes the shared Python Universal Editorial Engine in live mode.

It does not collect source material, connect to RSS/Commons, write to the source database, generate PDFs, publish catalogues, or maintain an issue archive. It validates the rolling feed contract and source/image provenance before replacing `nature/published/live-feed.json`.

Approved documentary photographs are optional in the live feed. When a story has a current, verified Nature image record, the Publisher copies the hash-named file to `nature/published/assets/` and writes its rights/credit record to `assets/image-rights.json`. A story without a verified image remains eligible as a text report. Failed validation preserves the last-good feed.
