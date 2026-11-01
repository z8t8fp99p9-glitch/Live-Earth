# Nature browser view

- `nature-view-controller.js` registers Nature with the shared Stacks Feature Views system, builds the Live Feeds interface, and manages activation, deactivation and automatic refresh.
- `nature-publisher-client.js` reads and validates only `nature/published/live-feed.json`.

Both files are owned by this view folder. The root-level `nature-view-controller.js` is retained only as a small backwards-compatible loader for any older entry point that still requests the historical path.

The browser view does not collect sources, open SQLite, generate PDFs, manage an archive, or write local persistence. Live Nature reports are online content.
