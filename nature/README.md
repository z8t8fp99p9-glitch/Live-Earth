# LIVE // EARTH — Nature

Nature is an independent editorial view inside Stacks.

## Ownership
- `collector/` is the only Nature component allowed to access external sources and write the Nature database.
- `publisher/` reads the Nature database read-only, has no source-network code, and commands the shared `editorial-engine/`.
- `view/` consumes completed files under `nature/published/` only.
- The shared `editorial-engine/` and root `universal-pdf-viewer.js` are reused.
- `assets/` contains rights-policy and allowlist records, not a second copy of the shared Engine.
- The runtime SQLite store and prepared source media live in `.publisher-data/nature/` and are not committed.

The first November 2026 run imports the eight source-linked October summaries already curated in the project fixture exactly once. It does not import the old fixture PDF. Later monthly issues use the continuing feed collection path.

## Publication
The Publisher generates the previous complete UTC calendar month. Public output contains one current PDF (`published/current.pdf`), one catalogue record and the current live feed. A new issue is staged and validated before the current files are replaced. If any gate fails, existing public files are left unchanged.

The 20–40 page goal is an editorial aspiration, not a minimum. No filler is added to reach a page target. At least five source-linked stories and a configurable minimum of four fully verified documentary photographs are the initial release gates. These are engineering settings and can be adjusted in `publisher/profile.json`; they do not override licence checks.

## Current workflow status
The application code and workflow template are included in the upload package. The active GitHub Actions workflow must be created separately at `.github/workflows/nature-publisher.yml`; the existing ZIP importer explicitly blocks `.github/` paths. See `NATURE_WORKFLOW_SETUP.md` at repository root. Until that separate workflow file is created and run successfully, automated collection/publication is not active.
