# Nature Live Feed Publisher

The Nature Publisher is a presentation-only adapter. It reads only `newsroom_approved_stories` for `view_id='nature'` from `.publisher-data/nature/nature.sqlite3` in read-only/query-only mode. It does not collect sources, access RSS/Atom, or make rights decisions.

Source assignment lives in the Global Collection Manager. Global Checker is the sole rights/provenance authority. The shared Newsroom Database Writer persists only final Checker-released stories and approved Image Engine metadata. The Publisher validates the rolling 32-day Live Feed and publishes Nature's feed and assets. Failed validation preserves the last-good feed.

Copy-ready workflow: `nature/publisher/NATURE_PUBLISHER_WORKFLOW_UPDATE.yml`.
