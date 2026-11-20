> **Historical package note — not the current project specification.** This README describes an earlier Universal Collector Fix Package v4 and its old payload. For current project instructions, read `README-FIRST.txt`, `PROJECT-CONTINUITY.md`, `Documentation/INDEX.md` and `STARTUP-ESSENTIALS-POLICY.md`. Current inspected application baseline is v154; the v155 on-demand feature-view package is a locally prepared candidate only until the user uploads and verifies it.

---

# LIVE // EARTH — Universal Collector Fix Package v4

This archive is formatted for the repository's manifest-validated ZIP extractor.

## Included complete replacements
- `Data/Universal/engine/collector.py`
- `Data/Universal/engine/bootstrap.py`
- `EarthEngine/Graphics/earth-grid-gpu-skin.js` — generic, dataset-agnostic GPU grid renderer
- `.gitignore`

## Important scope
This v4 package contains complete file replacements only. It intentionally does not include `.patch` files: the repository ZIP extractor writes archive entries as files and does not execute `git apply`. The adapter and Atmosphere View Controller refinements from the prior draft are therefore not represented as completed changes in this archive.

The renderer is generic. Dataset-specific palettes, ranges, units, and contour settings belong in the relevant View Controller, not in the universal renderer.

## Upload
Place this ZIP at the repository root and let the existing manifest-validated extractor workflow process it. The manifest supplies the commit title:
`Fix universal collector scheduling and generic grid rendering`

Do not unzip into a wrapper directory. The archive already contains repository-relative paths.
