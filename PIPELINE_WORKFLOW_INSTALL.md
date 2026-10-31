# One required workflow update

The upload ZIP extractor deliberately rejects changes under `.github/` so ordinary application uploads cannot replace GitHub automation.

After applying `LIVE_EARTH_MAIN_UPLOAD.zip`, replace the contents of this existing file in GitHub:

`.github/workflows/alien-world-publisher.yml`

Use the separate workflow file supplied with this package: `ALIEN_WORLD_PUBLISHER_WORKFLOW.yml`.

Do not change `.github/workflows/zip-extract-auto-upload.yml`; it remains the active main-ZIP importer.

The replacement workflow runs two distinct steps in sequence: Data Collection writes the database; Publisher then reads it read-only, commands the Universal Editorial Engine, and routes the finished output to the Alien World view.
