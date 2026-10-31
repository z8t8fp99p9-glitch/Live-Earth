# Alien World Data Collection

This is the only Alien World component allowed to access external sources and write source records/media into the Alien World SQLite database.

## What it does

1. Reads the Alien World Publisher profile for the approved NASA feed list and collection limits.
2. Collects RSS/Atom items, validates HTTPS source URLs and publication dates, and deduplicates records by canonical article URL.
3. Captures the image actually associated with the source post when the feed or original article exposes it: RSS/Atom media fields, embedded feed images, Open Graph/Twitter hero image, or the article's own image tags.
4. Downloads only allowlisted NASA-hosted media, validates and normalizes the file, retains the original media URL, original article URL, caption, credit and screening note.
5. Labels source-described illustrations/artist concepts clearly. It does not relabel them as documentary photographs.
6. Saves source records and media only inside `.publisher-data/alien-world/`, applies bounded retention, and removes only orphaned Collector-owned media files.

## What it does not do

- It does not create live-feed JSON, magazine layouts, PDFs or public manifests.
- It does not choose a merely similar NASA Image Library photograph when the original post image is unavailable.
- It does not claim to independently grant image rights. NASA guidance and asset-specific third-party restrictions still apply; credits and source links are preserved.
- It does not write into the app's local IndexedDB or browser cache.

The active workflow runs this Collector first. The Publisher then reads the resulting database in read-only mode and commands the shared Universal Editorial Engine.
