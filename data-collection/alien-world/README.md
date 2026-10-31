# Alien World Data Collection

This is the only Alien World component allowed to access external sources and write source records/media into the Alien World SQLite database.

## Image collection

The Collector prefers the image actually attached to the original NASA feed/article. It checks RSS/Atom media fields, feed HTML, Open Graph/Twitter metadata, JSON-LD `ImageObject` data, ordinary image tags, responsive `srcset` and common lazy-loading attributes. It also checks inline background-image URLs used by some source pages. Entity-escaped Atom HTML is decoded before its image tags are parsed.

The Collector does not perform keyword-based image searches or substitute a merely similar NASA image. It fetches only HTTPS URLs on the NASA.gov host family, checks redirects, applies byte and image-size limits, normalizes supported image files, and retains the original image URL, article URL, caption, credit and image-type/usage note. The original NASA page is sent as the media request Referer where allowed. Third-party exclusion rules remain active; non-NASA hosts remain rejected.

A story with no valid original-post image remains text-only. A failed image attempt is recorded for diagnostics but does not lock the story out for seven days; missing images are retried during the next bounded Collector run. Successfully downloaded media is reused when its local cached file is present.

## What it does not do

- It does not create live-feed JSON, magazine layouts, PDFs or public manifests.
- It does not grant independent image rights; NASA guidance and asset-specific third-party terms still apply.
- It does not write into the app's local IndexedDB or browser cache.

The active workflow runs this Collector first. The Publisher then reads the resulting database in read-only mode and commands the shared Universal Editorial Engine.
