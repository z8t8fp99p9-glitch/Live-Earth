# Nature publishing workflow

**Status: Active.** The live workflow is `.github/workflows/nature-publisher.yml`. It is already present in the repository; it does not need to be created manually from the template.

## Manual runs

Open **GitHub → Actions → Nature Monthly Publisher → Run workflow** and choose:

- `collect` to run the Nature Collector only.
- `publish` to run the read-only Nature Publisher only, using the Collector database restored by the workflow cache.
- `all` to run collection followed by publication. Use this for a complete refresh.

## Data and publication boundaries

- The Collector alone accesses approved external sources and writes `.publisher-data/nature/`.
- The Publisher has no source-network access and opens the database read-only.
- The workflow caches the private runtime database but does not commit it.
- Only validated files under `nature/published/` are committed.
- Failed publication gates preserve the previous last-good public files.

`nature/publisher/NATURE_PUBLISHER_WORKFLOW_TEMPLATE.yml` is retained as a reference template. Do not create a duplicate workflow from it while the active workflow already exists.
