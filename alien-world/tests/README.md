# Alien World regression tests

Run from the repository root:

```bash
python -m unittest discover -s alien-world/tests -p 'test_*.py' -v
```

Install shared Python dependencies with:

```bash
python -m pip install -r editorial-engine/requirements.txt
```

The suite uses synthetic feeds/pages, temporary SQLite databases and temporary PDF/output paths. It does not access the internet or the production `.publisher-data/alien-world/` database. The Publisher runs this suite before publishing.
