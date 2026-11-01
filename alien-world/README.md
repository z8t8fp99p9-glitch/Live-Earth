# LIVE // EARTH — Alien World

Alien World is an independent feature view inside Stacks. All view-owned source code, policy, tests and public publication outputs live in this folder, following the same ownership pattern as Nature.

## Folder map

```text
alien-world/
├── README.md
├── assets/
├── collector/
│   ├── collector.py
│   └── README.md
├── docs/
│   └── WORKFLOW.md
├── publisher/
│   ├── publisher.py
│   ├── profile.json
│   ├── ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml
│   └── README.md
├── published/
│   ├── live-feed.json
│   ├── catalog.json
│   ├── latest-publication.json
│   └── magazines/
├── tests/
│   ├── test_alien_world_pipeline.py
│   └── README.md
└── view/
    ├── alien-world-view-controller.js
    ├── alien-world-publisher-client.js
    └── README.md
```

## Ownership and boundaries

- **Collector:** `collector/collector.py` is the only Alien World component permitted to access the approved NASA source feeds/pages, discover source-post images, screen rights/provenance and write the Alien World SQLite database.
- **Database:** `.publisher-data/alien-world/` is the Collector-owned runtime store. GitHub Actions restores and saves this exact cache path. It is not committed or reset by this view migration.
- **Publisher:** `publisher/publisher.py` opens the database read-only and passes its connection plus the publication brief to the shared Universal Editorial Engine. It has no source-network access and cannot write the source database.
- **Profile:** `publisher/profile.json` contains the source policy, image rules, editorial profile and output contract.
- **Published output:** `published/` contains the public live feed, catalogue, latest issue pointer and actual PDF editions. Keep last-good outputs if a run fails.
- **Browser view:** `view/alien-world-view-controller.js` owns only the feature lifecycle and interface. `view/alien-world-publisher-client.js` reads validated published JSON and opens issues through the shared Global PDF Reader.
- **Tests:** `tests/` contains deterministic regression/contract tests. The Publisher runs them before changing public output.

## Shared infrastructure (not duplicated here)

- `editorial-engine/` — the single Universal Editorial Engine.
- `universal-pdf-viewer.js` — the single Global PDF Reader.
- `index.html`, `sw.js`, `update-manager.js` — shared application shell and offline/update protection.
- `.github/workflows/alien-world-publisher.yml` — GitHub-required workflow location. The copy-ready replacement is inside `publisher/`; the ZIP importer intentionally does not edit `.github/`.

Nature and Magazine remain independent peer folders. Earth, Sun, Moon, Sky, Location, all Home Orbs, shared storage and local recovery are outside Alien World's ownership.
