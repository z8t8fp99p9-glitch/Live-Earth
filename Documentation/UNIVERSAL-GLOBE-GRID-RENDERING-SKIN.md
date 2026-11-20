# Universal Globe Grid-Rendering Skin — Phase 1

## Purpose
One reusable renderer converts validated regular latitude/longitude numerical grids into a coloured Three.js overlay on the existing Earth surface. The six original numerical database worlds can use the same rendering implementation while keeping their controllers separate. The separate Atmospheric Composition Stacks view can reuse this pipeline once its data adapter is approved and connected.

## Input contract
`runtime.createGridRenderingSkin({ THREE, definition, values, gridId, signalId, observedAt, unit, radius, min, max, opacity, palette, name })`

`definition` requires `width`, `height`, `latStart`, `lonStart`, `latStep`, `lonStep`, `coordinateOrder: "lat-lon"`, `rowOrder: "north-to-south" | "south-to-north"`, and `longitudeConvention: "-180..180" | "0..360"`. `noDataValue` and `gridId` are optional. `values` must be a flat row-major array of exactly `width * height` entries.

The renderer creates cell quads on a sphere, applies a shared colour ramp (or a supplied palette), omits non-finite and declared no-data cells, and returns a mesh, render statistics, and idempotent disposal. Parent the mesh to the existing Earth surface mesh so it inherits the current base-surface rotation.

## Safeguards and limits
- Verify provider metadata, cell-centre/cell-edge convention, axis order, row order, longitude convention, no-data encoding and units before passing data. Never infer these from dimensions.
- Keep fixed `min`/`max` across dates when comparing values; automatic per-frame scaling can mislead.
- This first implementation uses one quad per grid cell. Large native grids need a texture/GPU path and device performance profiling before production.
- No source data, network adapter, database query, scheduler, timeline or world-controller integration is included. No Earthquake, Home, Moon, Sun, Weather or other Stacks view is changed.
- Geographic alignment and performance still require verification against a real provider grid and the installed Earth renderer.
