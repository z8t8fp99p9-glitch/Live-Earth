# Alien World feature folder — compatibility scaffold

The sibling root folder has been established as agreed. The live Alien World Collector and Publisher are intentionally still reachable through their existing workflow paths (`data-collection/alien-world/collector.py`, `publishers/alien-world/publisher.py`, and `published/alien-world/`). The active `.github/workflows/alien-world-publisher.yml` references those paths and the ZIP importer prevents `.github/` edits.

Do not delete or move those working paths until a separate workflow migration is approved and the compatibility mirror is verified. This scaffold avoids breaking the established Alien World schedule or its published issue retention.
