# Activate the Nature automated workflow

The Nature code and workflow template are inside this upload ZIP, but the current repository ZIP importer explicitly rejects `.github/` paths. For that reason the template cannot be installed by `LIVE_EARTH_MAIN_UPLOAD.zip`.

After the main upload has completed successfully:

1. Open the repository on GitHub.
2. Open `nature/publisher/NATURE_PUBLISHER_WORKFLOW_TEMPLATE.yml`.
3. Copy its complete contents.
4. Create a new file named `.github/workflows/nature-publisher.yml`.
5. Paste the contents and commit the new workflow file.

This separate workflow is what enables daily collection and the monthly publication schedule. Until it is created, the Nature Collector/Publisher code is present but no scheduled run is active.

The workflow caches only `.publisher-data/nature/`, never commits the database, and commits only completed files under `nature/published/`. It does not alter the existing Alien World workflow.
