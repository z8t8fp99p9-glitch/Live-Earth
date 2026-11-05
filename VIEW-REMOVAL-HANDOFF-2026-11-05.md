# LIVE // EARTH — View Retirement Handoff

**Date:** 5 November 2026  
**Branch:** `main`

## Completed retirement

Nature and Alien World are no longer active app or feed Views. Their app controllers, publishers, tests, source folders, published-output folders, workflow templates and database-cleaner implementation were removed. The three existing scheduled/cleaner workflows were disabled through the GitHub Actions API; their YAML files, plus this one-time cleanup workflow, must be deleted manually after this run because the standard workflow token is not used to edit files under `.github/workflows`.

The Global Collection Manager now has an empty source catalogue, no source-to-View assignments, no View profiles and no schedules. It cannot issue jobs for either retired View. The shared Global Manager, Global Collector, Global Checker, Global Image Engine, Editorial Engine and generic Newsroom Database Writer remain in place.

The matching GitHub Actions database cache families were deleted: `nature-db-v1-*`, `alien-world-db-v1-*`, `global-database-cleaner-nature-*` and `global-database-cleaner-alien-world-*`. Existing Checker report artifacts and historical project notes were not deleted.

The app's service-worker and update-manager build identity was advanced together to `v110-retired-news-views`; the retired controller is no longer in the app shell, repair list, startup loader or Stacks catalogue. The browser must receive the next successful Pages update before the installed app stops using its older cached shell.

## Preserved deliberately

Shared global pipeline engines and their contracts remain. The Global Checker source-rights catalogue is retained as shared policy/reference data; it is not a Global Manager source subscription and no feed job can reach it while Manager profiles and assignments are empty. Historical Nature/Alien World notes remain for project history and are not active configuration.

## Validation

The retirement workflow runs the Manager, database-bridge and global architecture regression tests, plus JavaScript syntax checks for the changed app files. After it succeeds, manually delete `.github/workflows/nature-publisher.yml`, `.github/workflows/alien-world-publisher.yml`, `.github/workflows/global-database-cleaner.yml` and `.github/workflows/remove-nature-alien-world.yml`. Then check the Pages update and installed-iPhone behavior.
