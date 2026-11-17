# LIVE // EARTH — GitHub-native Earth Intelligence

This replaces the abandoned Cloudflare implementation. No Worker, D1, external database host, or local browser database is used.

## Architecture

- The public `Live-Earth` repository contains app code and curated Publisher snapshots only.
- A separate **private GitHub repository** stores the one-year observation archive.
- A scheduled GitHub Actions workflow checks official source feeds, deduplicates records, prunes records older than 365 days, calculates curated summaries, and publishes small JSON snapshots into the public app repository.
- The six worlds read only `Data/Published/worlds/*.json`. They never fetch or inspect the private archive.
- The browser period selector filters the curated one-year timeline to 24 hours, 7 days, 30 days, 90 days, or one year. It does not create a local database.

## Connected source in this first release

**Earth Activity:** USGS Earthquake Hazards Program GeoJSON `all_week` feed. The feed is checked hourly. USGS records are displayed with source-reported magnitude, location, depth, timestamp, status and original event link. They are not presented as earthquake predictions.

The other five worlds remain visible but are marked as awaiting an approved source adapter. No placeholder measurements or simulated events are shown.

## Private vault setup (GitHub only)

1. Create a new **private** GitHub repository, e.g. `live-earth-intelligence-vault`.
2. Add a `README.md` so it has a default branch.
3. Create a fine-grained personal access token restricted to that private repository, with **Contents: Read and write**. Do not paste the token into source files.
4. In the public `Live-Earth` repository, open Settings → Secrets and variables → Actions → New repository secret:
   - `EARTH_INTELLIGENCE_VAULT_TOKEN` = the fine-grained token.
   - `EARTH_INTELLIGENCE_VAULT_REPO` = `OWNER/live-earth-intelligence-vault`.
5. Install the separately supplied workflow at `.github/workflows/earth-intelligence.yml`. The ZIP extractor protects `.github`, so this file must be added manually in GitHub.
6. Run the workflow once with **Actions → LIVE // EARTH Earth Intelligence → Run workflow**.

## Retention and publication

- Private archive: rolling 365 days, daily JSONL partitions, source-record deduplication.
- Public snapshots: curated records only; currently at most 500 recent event summaries and 365 daily counts for Earth Activity.
- The screen shows at most 20 event cards at a time.
- The app can choose 24h / 7d / 30d / 90d / 1y without changing archive retention.
- The private archive must never be checked out into the public Pages output folder.

## Local tests

Run with Node 22:
`node --test Backend/GitHub-Intelligence/tests/*.test.mjs`

Run locally after placing a test vault folder:
`node Backend/GitHub-Intelligence/src/run.mjs --vault ./vault --publish ./Data/Published/worlds`

The workflow uses the same command after checking out the private vault.
