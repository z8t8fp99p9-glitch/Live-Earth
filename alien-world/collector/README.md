# Alien World Collector

**Canonical file:** `alien-world/collector/collector.py`  
**Policy:** `alien-world/publisher/profile.json`

The Collector is the only Alien World component allowed to contact approved external sources and write source records/media into the Alien World SQLite database. It runs automatically through the Alien World workflow; no manual story-by-story approval is required.

## Source and image safeguards

The first release is restricted to official NASA feed/article sources on HTTPS. For each eligible story, the Collector looks for the image actually attached to that original NASA post through RSS/Atom media fields, feed HTML, Open Graph/Twitter metadata, JSON-LD, article image elements, responsive `srcset`, lazy-load attributes and inline background-image references. It never searches for a merely similar image or substitutes unrelated space artwork.

Image candidates are checked for NASA host-family provenance, redirects, file type, dimensions, size, caption, credit and explicit third-party/copyright restrictions. Image-specific credit is retained when exposed; when no separate image credit is available, NASA is credited as the source. Article bylines are never substituted for image credits. Illustrations and artist concepts remain clearly labelled. Restricted or uncertain assets are held back while the story text remains eligible.

The internal screening status is an editorial safety filter, not a licence, rights-holder permission or legal clearance. NASA's current Media Usage Guidelines and explicit third-party notices remain controlling.

## Architecture boundary

- External source retrieval, image discovery/screening and database writes: **Collector only**.
- Database location: `.publisher-data/alien-world/`.
- Feed, catalogue and magazine creation: shared Engine, instructed by the read-only Publisher.
- Browser view: reads completed publication outputs only.
