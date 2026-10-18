LIVE // EARTH — 3D GLOBE CANDIDATE (NOT YET DEPLOYED)

This package contains a replacement index.html only. It is intended to replace the current repository-root index.html after review.

Features:
- 3D spherical Earth, dark space and subtle atmosphere
- fixed camera / zoom
- one-pointer drag rotation; pinch zoom and map controls are not implemented
- NASA Blue Marble texture loaded from NASA's public imagery host
- Three.js loaded from jsDelivr CDN
- responsive viewport and low-power renderer preference

External dependencies (network required on first load):
- Three.js 0.180.0 module via jsDelivr
- Earth texture: https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57723/land_ocean_ice_2048.png

Attribution: Earth texture source NASA/GSFC. NASA should be acknowledged; do not imply NASA endorsement. Review NASA media/data guidance and the selected image's specific rights before public/commercial promotion. Three.js is MIT licensed and must retain its license notice when distributed as software; it is loaded from its official project distribution CDN here.

Important: This is a candidate package and has NOT been deployed or verified on the live site. The current website remains unchanged. Replace only index.html first; do not upload this ZIP as a nested folder. Existing manifest.json, sw.js and icon.svg are left untouched. After commit, wait for GitHub Pages deployment and test the actual URL on iPhone. If an older service worker serves stale content, we may need to update sw.js in a separate, verified step.

This package also includes sw.js with a bumped cache version so the new homepage can replace the older cached homepage. Upload index.html and sw.js as two separate files to the repository root, replacing the existing versions. Keep all other existing files.
