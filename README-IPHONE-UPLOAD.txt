LIVE // EARTH — shiny orb buttons (deck not included yet)

This patch changes only index.html and sw.js. It uses the five existing orb assets already present in the repository root:
earth.webp, moon.webp, sun.webp, location.webp, stacks.webp.

DESIGN
- Each orb is a separate accessible button with its own tap/active shine and glow.
- The orb artwork is adaptive and circular; no deck image or card panel is included.
- The working globe, lighting, starfield, one-finger rotation, data-store and button-selection persistence are preserved.
- The five buttons remain navigation placeholders where features are not connected yet.
- The new service-worker cache version precaches the five orb assets and keeps network-first HTML refresh.

UPLOAD FROM IPHONE
1. Open the Live-Earth repository on GitHub, branch main.
2. Replace the root index.html with this index.html.
3. Replace the root sw.js with this sw.js.
4. Commit title: Activate shiny glass orb buttons
5. Wait for GitHub Pages deployment to complete, then reopen the installed app while online.

Important: this ZIP does not upload or commit anything. No GitHub changes were made by preparing it. The deck will be added separately after the orb buttons are verified.
