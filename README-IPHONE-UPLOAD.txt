LIVE // EARTH — Personalisation patch bundle

WHAT THIS PATCH ADDS
- A five-orb dock using the existing repository-root WebP assets.
- Tap Stacks to open Personalisation.
- Orb Studio and Deck Studio tabs.
- Seven existing deck choices.
- Local preference persistence using localStorage.
- Browser Cache API storage for orb/deck artwork and service-worker precaching.
- A versioned service-worker shell cache.

IMPORTANT PACKAGE SCOPE
This is a replacement-file patch, not a full clone of the repository. The existing main branch already contains the referenced assets and support files. Keep these existing root files in place:
earth.webp, moon.webp, sun.webp, location.webp, stacks.webp,
deck_cosmic.png, deck_earth_nature.png, deck_frost_fire.png,
deck_frost_glass.png, deck_nebula_cloud.png,
frost-bite-ice-deck.webp, fire-sand-nation-deck.webp,
manifest.json, icon.svg, data-store.js, dataset-manifest.json.

UPLOAD
Replace only index.html and sw.js in the Live-Earth repository root on main. Do not upload this ZIP as a ZIP file expecting GitHub Pages to unpack it. Keep the existing files above unchanged. GitHub changes are not made by this package.

LOCAL SAVING
Choices are stored per browser/device in localStorage. The Cache API and service worker cache local copies of same-origin image assets when available. Browser storage is subject to the browser's storage quota and may be cleared by the user/device. First visit needs a network connection to download assets.

TEST STATUS
This package was generated from the repository source snapshot. It has not been deployed or tested on a physical iPhone. Review the changed files before uploading.
