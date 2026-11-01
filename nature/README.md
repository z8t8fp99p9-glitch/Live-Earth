# LIVE // EARTH — Nature

Nature is an independent Live Feeds view inside Stacks.

## Ownership
- `collector/` is the only Nature component allowed to access approved external sources and write the Nature database.
- `publisher/` reads the Nature database read-only and publishes only the rolling Live Feed.
- `view/` owns both the Nature view controller and its browser-side feed client.
- The shared `editorial-engine/` validates and generates the finished feed; it is not duplicated for Nature.
- `assets/` contains the reviewed image allowlist and rights-policy records.
- The runtime SQLite store and prepared image cache live in `.publisher-data/nature/` and are not committed.

## Live publication
The feed uses a rolling 48-hour window and is refreshed by GitHub Actions every three hours. Nature sources are collected by the Collector before the Publisher runs. Only the current `live-feed.json` and current feed media/rights manifest are public outputs. No Nature magazine PDF, monthly catalogue or issue history is generated.

Documentary photographs are optional per story. The Collector must verify the original Wikimedia Commons file page, creator and accepted licence. Reports without a verified photograph remain publishable as text reports. Image rights checks are not waived by the Live-Feed-only change.

## Workflow
The active workflow is `.github/workflows/nature-publisher.yml`. Replace its entire contents with the separately supplied `nature-live-feed-workflow.yml`. It caches the existing `.publisher-data/nature/` key family, never commits the database, and commits only validated files beneath `nature/published/`.
