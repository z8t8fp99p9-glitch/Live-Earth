# Alien World Publisher (View-specific)

This is the only first-release component that collects Alien World's configured space sources and writes its dedicated SQLite store. The store is scoped to `alien-world` and `alien-world-publisher`; the Publisher passes the Engine a separate read-only connection.

The Publisher is responsible for:
- official NASA feed allowlisting and source collection;
- timestamps, URL identity/deduplication and a 30-day / 500-record bound;
- screening NASA-hosted image-search results for common third-party credit markers;
- a 48-hour live-feed window and 48-hour magazine coverage window;
- a weekly Space Journal profile plus manual magazine test runs.

The database and its media assets are held in a bounded, rebuildable GitHub Actions cache, not committed to the application repository. If the cache is evicted, recent items can be recollected from the configured public feeds. Only completed, bounded publication outputs are committed under `published/alien-world/`.

Image screening is not a legal rights guarantee. Every selected image retains source/credit information and a NASA media-policy note; any story without suitable media remains usable without an image.
