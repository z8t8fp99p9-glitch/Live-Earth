# LIVE // EARTH — Alien World pipeline rollback note

This release changes only:
- `data-collection/alien-world/collector.py`
- `data-collection/alien-world/README.md`
- `publishers/alien-world/publisher.py`
- `publishers/alien-world/README.md`
- `alien-world-publisher-client.js`
- `tests/test_alien_world_pipeline.py`
- this recovery/documentation material

It does not change `.github/workflows/`, `sw.js`, `update-manager.js`, `index.html`, `view-manager.js`, the Home/Earth/Moon/Sun views, Orb assets, or the shared PDF Viewer.

## Known-good pre-release GitHub baseline

Repository: `z8t8fp99p9-glitch/Live-Earth`
Branch: `main`
Baseline commit: `2aab07c2fb51259a49fcc376b2f55dad606cef15`

The previous versions of the changed source files remain in Git history at this baseline. If rollback is ever needed, use GitHub's **Revert** action on the single commit created by the ZIP Extractor for this package. Do not delete the recovery folder or reset app storage. The active Publisher workflow is not part of this release and must remain untouched.
