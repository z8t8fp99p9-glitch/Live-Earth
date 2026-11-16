# Weather 3D — Single Deck and Aligned Perimeter Guard V3

## Diagnosis
The committed V2 source drew three visibly distinct horizontal construction layers:
1. The perimeter beam ring at y=1.25.
2. Five intermediate cross-joists at y=1.43.
3. Ten visible deck boards at y=1.565.
It also drew a second low guard rail at y=1.78, creating another horizontal band just above the floor.

## V3 single-floor structure
- Keep one visible walking surface made from ten close-laid timber boards.
- Boards are edge-to-edge: 0.54-unit pitch and 0.54-unit board depth.
- Replace the old lower perimeter beam ring and five internal joists with one four-beam
  perimeter frame. The frame sits directly on the existing shortened support piers and
  finishes immediately below the deck boards.
- No intermediate joist row or second floor slab is generated.

## V3 perimeter guard
- Remove the lower horizontal rail from all four sides.
- Keep one upper handrail on left and right, the rear, and the front returns.
- Vertical balusters start at the deck surface and connect to the upper handrail.
- Rail outer faces align with the deck's outer footprint:
  - left/right: x = -3.79 / +3.79
  - rear/front: z = -2.71 / +2.69
- Keep the central front opening clear for the existing four-step staircase.

## Protected scene elements
Mount Fuji, all three rolling ridges, garden trees, pavilion rotation, roof, walls,
Shoji divisions, lanterns, shortened support piers, traditional stairs and stair infill,
square camera, forecast controls toggle, weather effects, water, Location privacy
boundary and Stacks feature lifecycle are preserved.

## Validation
Generated from the current `main` Weather source, Git blob SHA
`ea7a8235ce4fba0b802eb12cde86d490acd17374`.
JavaScript syntax, retained-scene regressions, single-deck assertions, rail outer-edge
alignment, pier-to-frame contact, frame-to-board spacing and baluster-to-deck/handrail
alignment were checked. Final visual confirmation requires testing the app.
