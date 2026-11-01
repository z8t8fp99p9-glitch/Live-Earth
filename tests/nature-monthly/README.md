# Nature monthly test fixture

This is the first in-app test edition for the Stacks **Nature** view.

- Coverage: 1–31 October 2026 (UTC, start inclusive and end exclusive).
- Input: eight curated source-linked October reports in `stories.json`.
- Database: a disposable in-memory SQLite database created by the test runner; no existing app or Alien World database is opened.
- Engine: the production `Universal Editorial Engine` (`editorial-engine/universal_editorial_engine.py`).
- Output: a 10-page, 420 × 912 pt phone-portrait magazine at `published/nature/magazines/nature-202610.pdf`.

Rebuild and validate the editorial output:

```bash
python tests/nature-monthly/run_nature_monthly.py
```

Validate browser contracts, Stacks registration, optional startup loading and the shared PDF Reader handoff:

```bash
node tests/nature-monthly/test_app_contracts.js
```

The fixture is a test source set, not an ongoing Collector or live Nature database. It does not introduce a new scheduled workflow. The next production step is a Nature-owned Collector/database/Publisher and monthly schedule. The Alien World pipeline remains separate and unchanged.
