# Alien World workflow operations

Active GitHub Actions workflow: `.github/workflows/alien-world-publisher.yml`.

## Manual modes

- `live` — refresh the Collector database and publish the rolling live feed.
- `magazine` — refresh the Collector database and publish a Space Journal for the previous 48-hour coverage window.
- `all` — refresh the database and publish both outputs.

The scheduled workflow runs collection/live publication every three hours and the magazine mode weekly. The Collector is run before the Publisher in each workflow execution.

## Persistence and failure behaviour

- The Collector database is cached at `.publisher-data/alien-world/`.
- The cache key family remains `alien-world-db-v1-...`; the folder reorganisation does not create a new database or discard prior cache entries.
- The workflow commits only files under `alien-world/published/`.
- The Publisher runs the Alien World regression tests before publication, opens the database read-only, and preserves last-good outputs on failure.
- The workflow installs dependencies from the shared `editorial-engine/requirements.txt`.

## Custom editorial brief

The view provides a copyable brief. Open the Publisher workflow in GitHub Actions, choose the desired mode, paste the brief into `custom_request`, then run it. The app does not store a GitHub token.
