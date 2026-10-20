LIVE // EARTH — Interactive 3D Earth Orb patch
Repository: z8t8fp99p9-glitch/Live-Earth | Branch: main
Prepared 2026-10-20

UPLOAD THESE THREE FILES TO THE REPOSITORY ROOT:
- location.html (replace)
- sw.js (replace)
- earth-orb-globe.js (new)

Commit title:
Replace flat map with interactive 3D Earth orb

This changes only the Earth-mode screen. index.html is intentionally not included or changed. The flat 2D map is replaced by a large circular 3D Earth orb. Drag with one finger to rotate; pinch with two fingers to zoom; tap the globe without moving to return Home. The small top-right Earth/Home orb also returns Home. Basic, HD and Offline labels are preserved; HD uses a higher sphere detail and pixel ratio.

Important: the 3D renderer needs WebGL, Three.js from a CDN and a remote Earth texture. If texture loading fails, the saved earth.webp artwork remains visible. Offline is not yet a fully independent offline 3D engine; full 3D offline use depends on browser-cached engine and texture. This ZIP is prepared and statically checked, not deployed or iPhone-tested. Home artwork, Earth/Moon framing and the five homepage orbs are not changed.
