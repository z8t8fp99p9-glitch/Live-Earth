# LIVE // EARTH — Workflow Failure Fix

Date: 2 November 2026
Target: `z8t8fp99p9-glitch/Live-Earth`, branch `main`

## Root causes addressed

1. The previous Python `.pth` startup hook ran the feed pipeline and raised `SystemExit` while Python was still importing `site`. GitHub Actions reported `Fatal Python error: init_import_site` even after Nature collection had completed. The hook now uses `os.execv` to replace the startup process with `live_earth_dispatch.py`. The dispatcher runs as a normal Python script. Child Python processes inherit the project-root marker and install the same shared Global Checker policy engine before tests run.
2. Alien World's preflight tests were not installing the shared policy engine when the test module was executed as a child process. The test now installs the engine explicitly. The old Nature route assertion was updated to the current `nature_pipeline.py` single-owner adapter.
3. Nature's strict `ElementTree` parser rejected malformed RSS/Atom payloads from NOAA NOS News and NASA Earth Observatory. The Nature discovery parser now uses `feedparser`, which can recover valid entries from common malformed-feed markup. An empty unrecoverable response is still reported as a source error; no feed content is fabricated.
4. The two NASA Earth Observatory feed URLs in the profile returned invalid XML in the failed run. They are replaced with the official NASA Image of the Day RSS endpoint and the current NASA Science Earth Observatory feed URL. Both routes are explicitly listed in the central Global Checker registry.

## Preserved behaviour

- One central `source-registry.json` and shared Global Checker policy engine.
- Nature and Alien World keep independent feed profiles and databases.
- Nature starts at 48 hours and expands through 96, 168, 336, 504 and 768 hours.
- Nature 50-story target and 32-day retention remain unchanged.
- Hourly workflow schedules, online-only feed delivery, last-good-feed protection and Publisher approval gates remain owned by their existing workflows.
- No workflow YAML, database reset, GitHub commit, push or deployment is included.

## Validation performed locally

- Python compilation passed for the updated bootstrap, dispatcher, Nature runtime and added tests.
- Bootstrap dispatch test passed: verifies `execv` replaces the startup process and does not raise `SystemExit` from `.pth` initialisation.
- Nature parser recovery tests passed with a simulated malformed-feed parser result and a no-recovery error case.
- Configuration checks passed: seven configured Nature feeds have exact central-registry entries; shared NASA/NOAA/USGS policies include both views; target 50, 48-hour initial lookback and 32-day retention are unchanged.
- ZIP manifest hashes and archive membership are checked during package creation.

The full repository test suite and live GitHub Actions workflows have not been run from this local package. Those need to be confirmed after the ZIP is uploaded and the two existing workflows are dispatched.
