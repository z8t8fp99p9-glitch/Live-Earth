# Atmosphere Wind Vector Data Architecture

**Status:** Approved target architecture; interim verified-grid flow rendering is implemented in the Atmosphere controller.
**Scope:** Atmosphere Wind only.
**Current baseline:** The current controller loads the verified speed and direction grids together for flow rendering. The speed grid remains the scalar GPU colour surface; the paired direction grid drives streamline motion. The existing speed-only and direction-only products remain independent and must be preserved.

## Decision

Create one **derived, combined Wind Vector dataset** in the existing Central Database and feed that dataset to one coordinated Wind GPU grid surface.

This is an additive extension, not a database migration or replacement of the current data pipeline.

Proposed dataset ID:

`earth.atmosphere.wind_vector`

## Source and derivation

The authoritative 10 m horizontal wind components are:

- `UGRD` / `u10`: eastward component; positive eastward, negative westward.
- `VGRD` / `v10`: northward component; positive northward, negative southward.

For each valid cell:

- `speed = hypot(U, V)` in m/s.
- Meteorological direction **FROM** north, clockwise:
  `(atan2(-U, -V) * 180 / PI + 360) % 360`.

The direction convention must remain explicit. A meteorological direction describes where wind comes from; animated streamlines follow the vector `(U,V)`. Do not use the FROM bearing as the particle travel bearing without reversing it.

## Combined grid contract

The derived product should contain, at minimum:

- One shared grid definition and geographic ordering.
- One valid time and forecast reference shared by all channels.
- Per-cell U and V components and derived speed.
- A validity mask so missing values remain missing rather than becoming zero.
- Units, source variable identifiers, derivation/version information, and integrity metadata/checksums.

The product builder must reject or explicitly handle source inputs whose grid geometry, valid time, forecast reference, or missing-value masks do not align. Do not silently combine different forecast cycles.

Direction should not be stored or interpolated as an ordinary scalar angle. Interpolate U/V components first, then reconstruct direction. This correctly handles the 359°/1° boundary without producing a false 180° result.

## Rendering contract

One combined dataset feeds one Wind GPU grid surface:

- **Speed mode:** colour the surface from derived speed.
- **Direction mode:** reconstruct the meteorological bearing from interpolated U/V and apply a cyclic compass palette.
- **Flow mode:** advect curved streamlines using U/V; use speed to control movement rate and visual trail treatment.

Do not render speed and direction as two independent coplanar transparent globe meshes. Do not invent decorative paths or cyclones; visible flow must follow the actual vector field.

## Compatibility and protection

- Preserve `earth.atmosphere.wind_speed` and `earth.atmosphere.wind_direction` unchanged as independently verifiable products and fallback sources.
- Do not change the Central Database schema, collector, publisher, or refresh workflow in this planning/documentation phase.
- Do not change the Universal Grid System scalar contract just to accommodate Wind. If multi-channel support is required, add it as an optional, backward-compatible capability with scalar datasets retaining their current behaviour.
- Do not modify Temperature, Pressure, Moisture, other feature views, Earth Engine ownership, Home/Prime Earth, Stacks lifecycle, service-worker policy, or Location privacy.
- The combined dataset must be independently validated against the original U/V inputs and the existing speed/direction products before the Wind controller switches to it.
- Keep the implementation reversible: if the combined dataset is unavailable or fails verification, the current verified single-field Wind path remains usable.

## Implementation sequence

1. Inspect the live collector, Central Database publisher, dataset metadata/binary format, and refresh workflow.
2. Confirm whether raw UGRD/VGRD components are retained or must be obtained from the existing upstream source. Existing derived-product metadata alone is not proof that raw components are stored as separate grids.
3. Specify the combined binary layout, channel encoding, missing-value handling, metadata, and checksums.
4. Build the derived product without changing existing products.
5. Validate cell-by-cell speed and direction derivation, grid alignment, timestamps, and representative geographic locations.
6. Add optional multi-channel loading/rendering without breaking scalar grid consumers.
7. Switch only the Atmosphere Wind controller to the combined dataset after validation.
8. Test speed, direction, and flow modes individually and together with lifecycle, mobile, online/offline, and fallback checks.

## Acceptance checks

- Source cycles, grid definitions, and validity masks align.
- Derived speed matches `hypot(U,V)` within the declared encoding precision.
- Reconstructed direction matches the meteorological FROM convention.
- Interpolation across north (359°/1°) remains near north.
- Flow streamlines follow the direction of `(U,V)`, not the FROM bearing.
- One Wind surface is rendered; no coplanar duplicate overlays or colour blending.
- Existing scalar datasets and all non-Wind views behave exactly as before.
- Failure of the new product leaves existing Wind products available.

## Current implementation status

**Interim flow rendering implemented; combined vector dataset remains future work.** The Atmosphere Wind selection loads both verified NOAA 10 m speed and direction grids, checks that their geometry aligns, renders the speed field on the existing GPU skin, and advects visible-hemisphere streamlines using bilinearly sampled vector components. Meteorological FROM bearings are reversed to obtain the direction particles travel. The current visual layer uses 64 animated streamlines with 28 segments each, a restrained cyan glow, and a brighter advancing edge; stronger verified winds move streamlines faster. Isolated particle heads are not rendered. Calm and missing cells do not generate invented flow. Animation pauses while the document is hidden and is disposed with the Wind layer.

This interim implementation does **not** create `earth.atmosphere.wind_vector`, change the collector/publisher, alter the database schema, or add a multi-channel GPU texture. The scalar speed surface and paired direction grid remain separate verified products. The combined vector architecture above remains the intended future design.
