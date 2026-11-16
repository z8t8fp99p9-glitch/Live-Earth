# Weather 3D — Lower Pavilion Structure Proportions V12

## Scope
This refinement changes only the vertical proportions of the lower pavilion structure.
The existing deck elevation and footprint, main house, roof, walls, rotation, Fuji, hills,
garden, railing, camera and Weather UI remain unchanged.

## Support pillars and stone footings
- Retains all eight existing support positions and the original ground-level stone footings.
- Adds a narrower stone socket above each footing, spanning y=0.28 to y=0.59.
- Reduces each visible timber support pillar from 0.88 to 0.66 units (25%).
- Pillar bases and tops remain in direct contact with the stone socket and perimeter beam.

## Foundation beams
- Reduces the vertical beam thickness from 0.36 to 0.27 units (25%).
- Keeps the beam top at y=1.52 and moves the beam centre to y=1.385, so it still meets
  the existing deck assembly and shortened support pillars without gaps.

## Traditional four-step staircase
- Keeps four steps, their width, depth, horizontal positions and timber materials.
- Replaces the bulky solid step blocks with thin closed riser boards, 0.07 units deep.
- Replaces the two-layer tread caps (combined 0.095 units) with one 0.07-unit tread board
  (about 26% thinner).
- Removes the previous separate infill pieces because the new riser boards close each face.
- Raises the last tread surface to y=1.5725, exactly matching the existing deck surface.

## Protected scene elements
Mount Fuji at its approved reduced height and rightward position; all three rolling hills;
balanced trees; pavilion rotation; roof; wall and Shoji divisions; lanterns; deck boards;
four-side railing and stair opening; camera; forecast controls toggle; weather effects;
water; Location permission boundary; Stacks feature lifecycle.

## Validation
Built from the current main-branch Weather source, Git blob SHA
`7471b16927c7d1d4da34e23d52cf413f6ec6e3c0` (matching the latest V11 source ZIP).
JavaScript syntax, scene-preservation assertions, all eight support positions, footing-to-socket,
socket-to-pillar, pillar-to-beam, beam-to-deck contacts, 25% beam/pillar reductions,
four-step count and stair-to-deck alignment were checked. Visual device confirmation remains
necessary after upload.
