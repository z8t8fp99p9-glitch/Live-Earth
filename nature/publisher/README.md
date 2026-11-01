# Nature Publisher

The Publisher has no network client and opens the Nature database with SQLite `mode=ro` plus `PRAGMA query_only=ON`. It invokes the shared Python Universal Editorial Engine in a separate process. It does not scrape sources, fetch photos, or write to the source database.

The Engine version in the inspected repository uses a NASA-named generic image status constant. Nature sets that module constant to its own view-specific sentinel in the Publisher process only; the global Engine source is not edited and Alien World's separate process is unaffected.

The Publisher checks the source count, verified documentary-photo count, image-credit records, source links and the finished PDF before it replaces `nature/published/current.pdf`, `live-feed.json` and `catalog.json`. It retains one public issue only.
