# Recovery path inventory

The upload replaces:
- `nature-view-controller.js` (with an optional feature compatibility loader)
- `editorial-engine/universal-editorial-engine.js` (adds a strict Nature-only URL contract while retaining the Alien World NASA boundary)

The upload adds the Nature Collector, Publisher, workflow template, view module, rights records, tests, and sibling folder scaffolding.

The upload removes only superseded Nature test/public-output files and old root Nature service paths:
- `nature-publisher-client.js`
- old `publishers/nature/` profile/README
- old `published/nature/` fixture catalogue/feed/PDF
- old `assets/nature/` illustrated test cover
- old test-only runner/profile/build result and browser-contract test

The historical `tests/nature-monthly/stories.json` October fixture is preserved with an archival README. This fixture is not imported into the production database.
