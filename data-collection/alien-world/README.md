# Alien World Data Collection

The Collector is the only Alien World component allowed to access external sources and write source records/media into the Alien World SQLite database. It remains fully automatic. No person has to approve stories or images one by one.

## Automatic image collection and safeguards (version 3)

For each recent story, the Collector looks for the image actually attached to that original NASA post. It checks RSS/Atom media fields, feed HTML, Open Graph/Twitter metadata, JSON-LD `ImageObject` metadata, article image elements, responsive `srcset`, common lazy-loading attributes and inline background-image references. It does not search for a merely similar image or substitute unrelated NASA artwork.

Every candidate is screened automatically:

- HTTPS only, and only the NASA.gov host family; redirects are checked and must remain on that host family.
- Image must be attached to the originating story/feed and is stored with the original article URL and image URL.
- Use the exact image credit when the page/feed exposes one. When no separate image credit is published in the extracted metadata, credit NASA as the source in keeping with NASA's media-use guidance. The article author/byline is never used as an image credit.
- Hold back explicit copyright/licence restrictions, identified protected third-party assets and known stock-agency sources. A joint institutional credit such as NASA/ESA/CSA is not rejected merely because more than one agency is named; explicit rights restrictions still take precedence.
- Keep illustrations clearly labelled as illustrations/artist concepts.
- Validate file type, dimensions and size; reject unsuitable assets and automatically try the next candidate.

The Collector scans a bounded set of recent stories so an article with no suitable image does not prevent another eligible story from receiving one. It screens the complete recent publication window even after reaching the five-image target, retaining only the first five current-policy images and clearing stale or over-quota cached image fields from the remaining stories. Failed or restricted candidates stay text-only and are retried on the next scheduled run. Existing pre-v3 cached images are re-collected through the automated screen; no database reset or app cache reset occurs.

The policy is for factual editorial use only. Images remain with their corresponding stories and source links. No NASA endorsement is implied. The internal screening flag is not a licence, rights-holder permission or legal clearance. NASA's official Media Usage Guidelines remain controlling; explicit third-party copyright notices require the rights holder's permission.

## Architecture boundaries

- Collector: external fetch, image discovery, screening and database writes only.
- Publisher: read-only database access; no network access or collection.
- Universal Editorial Engine: shared view-independent engine; receives database records from the Publisher and creates feed/PDF outputs.
- Alien World Main Page: displays finished output only.

The Collector never creates feeds, magazine layouts, PDFs or public manifests and never writes to browser IndexedDB.
