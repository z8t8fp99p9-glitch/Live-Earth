# LIVE // EARTH — Location Orb integration bundle

## Included
- `location.html`: full-screen BASIC interactive map, manual pan/zoom, optional geolocation, and a restrained red scan only after a genuine location fix.
- `sw.js`: service-worker shell list updated to include `location.html`.
- `index-integration-snippet.js`: the exact navigation change to make in the existing homepage.
- `README.txt`: setup and provider limitations.

## Important status
This is a targeted integration bundle, **not yet a complete one-click replacement of the existing homepage**. The current homepage source was inspected and the Location orb still uses a placeholder. To connect it, the existing `index.html` needs the small change in `index-integration-snippet.js`. Do not upload this ZIP by overwriting the whole repository or replacing `index.html` with `location.html`.

## Connect the orb
In `index.html`, find this line inside `function activate(id)`:
`status.textContent= id==="location" ? "Location tools are not connected yet. Your globe remains available." : \`${labels[id]} view is not connected yet. Your Earth globe remains available.\`;`

Replace that one line with:
`if(id==="location"){location.href="./location.html?locate=1";return}`

Keep the other line behavior for Stacks:
`status.textContent = \`${labels[id]} view is not connected yet. Your Earth globe remains available.\`;`

This makes the browser open the BASIC map first, then request location. If permission is granted and a fix is obtained, the red sweep and marker appear. If denied, the map remains open without the effect.

## Upload
1. Add `location.html` to the repository root.
2. Replace `sw.js` with the included file.
3. Apply the one-line Location navigation change above to the existing `index.html`.
4. Commit title: `Connect Location orb to BASIC map`

## Provider / cost / offline notes
- This prototype uses Leaflet (open-source map UI library) and OpenStreetMap standard raster tiles.
- It requires internet access for map tiles. This ZIP does **not** contain offline map data.
- The public OpenStreetMap tile service has a usage policy and is not a guaranteed unlimited production tile-hosting service. Do not promise unlimited free tile hosting.
- Location access requires a secure context (GitHub Pages HTTPS) and the user's permission.
- Homepage Earth and Moon composition is not changed by these files.
