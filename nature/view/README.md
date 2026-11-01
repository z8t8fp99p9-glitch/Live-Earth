# Nature browser view

- `nature-view-controller.js` registers Nature with the shared Stacks Feature Views system, builds the Live Feeds interface, and manages activation, deactivation and automatic refresh.
- `nature-publisher-client.js` reads and validates only `nature/published/live-feed.json`.

Both files are owned and loaded directly from this view folder. The historical root-level compatibility loader has been removed.

The browser view does not collect sources, open SQLite, generate PDFs, manage an archive, or write local persistence. Live Nature reports are online content.
