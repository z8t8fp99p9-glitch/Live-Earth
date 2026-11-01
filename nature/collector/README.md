# Nature Collector

The Collector is the only network-enabled Nature component and the only writer of `.publisher-data/nature/nature.sqlite3`.

It reads the view-owned RSS source list from `../publisher/profile.json`, fetches bounded RSS/Atom metadata, and checks a fixed set of documentary photograph candidates against the original Wikimedia Commons file page through the Commons API. It does not scrape article bodies, reuse images from search-result thumbnails, or infer rights from an image-host domain.

An asset is eligible only when the original Commons file page reports the exact expected creator and an explicitly accepted licence. The downloaded thumbnail is bounded, decoded and verified by Pillow. A record of the source page, creator, licence/version, access time, contextual caption and any permitted optimization is stored in the Nature database.

The curated allowlist is conservative and contextual. Images are never described as the image from an article unless the source record establishes that. A wrong-species or unrelated image is not substituted; in particular the October giant-water-lily story receives no Commons *Victoria amazonica* image because that is not the newly reported Colombian species.
