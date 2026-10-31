# Alien World Image Collector Rollback

`data-collection/alien-world/collector.py.before-image-fix-2026-10-31` is the exact Collector source that was active immediately before the 31 October 2026 image-extraction follow-up.

To roll back only this change, restore that file to:

`data-collection/alien-world/collector.py`

Do not restore or replace the Publisher, Universal Editorial Engine, workflow YAML, database, Actions cache, app shell, or other view files as part of this narrow rollback.
