# Alien World browser view

- `alien-world-view-controller.js` registers the view with the shared Feature Views system, builds the interface and manages activation/deactivation.
- `alien-world-publisher-client.js` reads the published JSON feed/catalogue and opens a published issue through the shared Global PDF Reader.

Neither browser file collects news, contacts NASA, opens SQLite, writes data, composes PDFs or owns local persistence. Live reports and the public catalogue are online content; only a PDF explicitly saved by the user in the shared reader is available offline.
