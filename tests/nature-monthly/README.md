# Archived Nature monthly test scaffold

This folder is retained only for historical test-fixture traceability. Production Nature code, tests, Collector, Publisher, database schema, media policy and public outputs have moved under the root `nature/` folder.

- `stories.json` is an October 2026 test fixture, not a source of production records.
- `build-result.json`, `profile.json`, and `run_nature_monthly.py` were removed from the active upload because they built an in-memory, fixture-only test magazine.
- The canonical test suite is now `nature/tests/`.
- Never publish this fixture PDF or treat its summaries as newly collected live reporting.
