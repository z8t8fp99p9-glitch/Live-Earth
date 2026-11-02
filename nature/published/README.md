# Nature published output

This folder contains only the current Nature Live Feed and its current supporting media.

- `live-feed.json` — all validated Nature reports available in the rolling 32-day window, without a story-count cap.
- `assets/` — only approved, current feed images and `image-rights.json` attribution/provenance.

No magazine PDF, monthly catalogue or issue history is published here. The Collector database and prepared-image cache remain private under `.publisher-data/nature/`.

The published feed is fetched online by the app. Feed cards are not persisted on the device and are cleared when the Nature view closes.
