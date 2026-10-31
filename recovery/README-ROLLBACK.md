# Recovery

This is an overlay update. It does not delete files, reset SQLite, clear browser IndexedDB, change caches, edit workflow YAML, or touch the Main Page.

If the new Collector does not pass its tests, the Publisher workflow will stop before replacing public outputs and preserve the last-known-good feed/PDF. To roll back, restore the previous versions of only `data-collection/alien-world/collector.py`, `publishers/alien-world/profile.json`, `publishers/alien-world/publisher.py`, the two updated README files, and `tests/test_alien_world_pipeline.py`. Keep `.publisher-data/alien-world/` intact.
