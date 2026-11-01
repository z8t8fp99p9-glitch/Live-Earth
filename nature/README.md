# LIVE // EARTH — Nature

Nature is an independent editorial view inside Stacks.

## Ownership
- `collector/` is the only Nature component allowed to access external sources and write the Nature database.
- `publisher/` reads the Nature database read-only, has no source-network code, and commands the shared `editorial-engine/`.
- `view/` consumes completed files under `nature/published/` only.
- The shared `editorial-engine/` and root `universal-pdf-viewer.js` are reused.
- `assets/` contains rights-policy and allowlist records, not a second copy of the shared Engine.
- The runtime SQLite store and prepared source media live in `.publisher-data/nature/` and are not committed.

The first November 2026 run imports the eight source-linked October summaries from `nature/collector/initial-october-seed.json` exactly once. The seed is production Collector input, not a test-folder fixture. The old fixture PDF is not imported. Later monthly runs use the continuing feed collection path.

## Publication
The Publisher generates the previous complete UTC calendar month. Public output contains one current PDF (`nature/published/current.pdf`), one catalogue record and the current live feed. A new issue is staged and validated before the current files are replaced. If any gate fails, existing public files are left unchanged.

The 20–40 page goal is an editorial aspiration, not a minimum. No filler is added to reach a page target. At least five source-linked stories and a configurable minimum of four fully verified documentary photographs are the initial release gates. These are engineering settings in `publisher/profile.json`; they do not override licence checks.

## Workflow
The active GitHub Actions workflow is `.github/workflows/nature-publisher.yml`. It supports manual `collect`, `publish` and `all` modes plus scheduled collection/publication. It caches only `.publisher-data/nature/`, never commits the database, and commits only validated files under `nature/published/`. See [`docs/WORKFLOW.md`](docs/WORKFLOW.md) for the current operating instructions.
