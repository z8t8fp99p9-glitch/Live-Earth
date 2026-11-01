# Nature automated tests

Run from the repository root:

```bash
python -m unittest discover -s nature/tests -p 'test_*.py' -v
node --check nature/collector/collector.py
node --check nature/view/nature-view-controller.js
```

The contract suite uses mocked Commons metadata and a temporary SQLite database. It does not access the network and does not change the active app. GitHub Actions uses the complete production repository and additionally exercises the shared Engine in the Publisher.

The original `tests/nature-monthly` story set was a fixture-only editorial sample. It is retained as historical test data in that old folder until the first production release has been reviewed; it is not loaded into the production Nature database by this Collector.
