# Weather 3D — Real Scene Source V1

## Architecture correction
The approved Weather scene is now authored directly in `Weather/weather-view.js`.
`Weather/Art/service-worker-extension.js` no longer rewrites the Weather module,
intercepts `fetch`, or applies a chain of string-based scene patches. It only keeps
the existing Live Art renderer in the service-worker app shell.

This removes the fragile runtime transformation layer that caused entire scene
refinements to disappear when one marker or geometry assertion failed.

## Preserved approved scene
- Front-facing square camera and centered canvas.
- Mount Fuji at the approved reduced height and right-shifted position.
- Three continuous rolling hills, including the lowered rear ridge.
- Balanced Japanese garden trees.
- Pavilion rotated 15 degrees counter-clockwise from its original orientation.
- Slim raised foundation, shortened support piers and traditional four-step timber stairs.
- Closed timber stair infill.
- Forecast controls show/hide toggle and existing weather preview UI.
- Existing weather effects, water, Location privacy boundary and Stacks feature lifecycle.

## Pavilion guard rails
All four rail runs are children of the same `house` group as the deck and walls.
They therefore inherit the approved pavilion rotation and transform together.
The rails are positioned above the deck surface (deck top approximately y=1.588):
- Left and right long sides: continuous upper and lower rails with balusters.
- Rear side: continuous upper and lower rails with balusters.
- Front side: two matching rail returns, leaving the central stair entrance open.

## Regression prevention
Future refinements must edit the actual scene construction in `Weather/weather-view.js`.
Do not restore service-worker source rewriting. A scene update is rejected if it removes
the real-scene marker, Fuji/hill geometry, pavilion rotation, stair infill, rail layout,
camera, or forecast control toggle.
