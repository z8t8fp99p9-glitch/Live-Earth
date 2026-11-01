# Alien World automated tests

Run from the repository root:

```bash
python -m unittest discover -s alien-world/tests -p 'test_*.py' -v
```

Install the shared Python dependencies first with `python -m pip install -r editorial-engine/requirements.txt`.

The suite uses temporary SQLite databases, synthetic feed/page data and temporary publication folders. It does not access the internet or the production Publisher database. The active Alien World workflow keeps its own Publisher contract checks; this directory holds the view-owned regression suite.
