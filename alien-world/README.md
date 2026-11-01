# Alien World — Live Feeds

Alien World is a NASA-sourced, online Live Feed. It no longer publishes Space Journal editions, magazine PDFs, catalogues or publication archives.

## Structure

- `collector/collector.py` — retrieves allowed NASA source records and screens original source images; writes the Alien World runtime database only.
- `publisher/publisher.py` — read-only publication controller; accepts Live mode only.
- `publisher/profile.json` — source rules, feed window, image handling and Live Feed output contract.
- `publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml` — copy-ready replacement for the active GitHub Actions workflow.
- `published/live-feed.json` — the single public output.
- `view/alien-world-view-controller.js` — Live Reports view and refresh lifecycle.
- `view/alien-world-publisher-client.js` — retrieves and validates the current Live Feed.
- `tests/test_alien_world_pipeline.py` — deterministic live-feed contract and regression tests.

## Ownership

- **Collector:** source network access, source policy screening and database writes.
- **Publisher:** publication command, validation and atomic replacement of the one live-feed file.
- **Universal Editorial Engine:** shared feed generation service; no source fetching, database ownership or publication schedule.
- **GitHub Actions:** hourly collection and Live Feed publication schedule.
- **Alien World View:** displays the current public feed; it does not keep an Alien World publication archive or saved-PDF list.

The copy-ready hourly workflow replacement is `publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml`; paste it manually into `.github/workflows/alien-world-publisher.yml` because `.github/` files cannot be included in the ZIP importer. The independent Alien World database at `.publisher-data/alien-world/` retains up to 32 days of source records (with a 2,000-record safety ceiling). The Live Feed shows up to 10 stories from the rolling 48-hour window. Feed content is held only in the active app view memory and cleared when the view closes; no feed history is saved on the device. The shared PDF Reader, saved files belonging to other views, Home composition, Moon View and all unrelated services are outside this change.
