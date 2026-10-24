# LIVE // EARTH — Lunar Stardust v81

This is a staged patch package, not a deployment. The working v80 build and the GitHub repository are not modified by this package. Apply all changes together in one commit so the service worker never expects an asset that is not yet present.

## Files included

- `moon-lunar-interface.js` — new self-contained SVG Arc + curved time-scroller overlay.
- `lunar-rise-set-interval.snippet.js` — astronomy export to append after exposing `moonPosition`.

## Apply in this order

### 1. Add the new asset

Upload `moon-lunar-interface.js` to the repository root, beside `sky-view-controller.js`.

### 2. Update `astronomy.js`

Append the complete contents of `lunar-rise-set-interval.snippet.js` to the end of `astronomy.js`. It exports the existing private `moonPosition` binding without changing its implementation, then adds a rise-to-next-set interval that correctly handles intervals crossing midnight. The calculation remains low precision, as documented in the code.

### 3. Load the layer

In `index.html`, locate the controller bootstrap `assets` array. Immediately after `./view-manager.js`, add:

`'./moon-lunar-interface.js',`

Keep the existing sequential loader behavior.

### 4. Cache the new asset and bump the build ID

At the top of `sw.js`, update the build comment to `/* LIVE // EARTH — v81 Lunar Stardust staged update. */`, and change:

`const BUILD_ID = "v80-sun-bluehour-amber";`

to:

`const BUILD_ID = "v81-lunar-stardust";`

Change:

`const CACHE_NAME = "live-earth-shell-v80-sun-bluehour-amber";`

to:

`const CACHE_NAME = "live-earth-shell-v81-lunar-stardust";`

In `APP_SHELL`, add `"./moon-lunar-interface.js",` immediately after `"./sky-view-controller.js",`.

### 5. Match the update manager

In `update-manager.js`, change its `BUILD_ID` from `"v80-sun-bluehour-amber"` to `"v81-lunar-stardust"`. Keep its message type and existing update behavior unchanged.

## Guardrails implemented

- Moon-only overlay; Sun View and Home are not given the Arc/scroller.
- Does not edit Earth framing, Moon orb size, Orb layout, or the Home canvas.
- Does not request location or calculate local rise/set while the existing Location feature is OFF.
- When Location is switched OFF, locally held observer coordinates are cleared and event times are hidden.
- SVG curves resize to the active viewport; touch dragging and keyboard arrow/Home/End scrubbing share a single progress value.
- Existing IndexedDB/local recovery state is untouched; no storage clearing, migration, or persistent location record is added.

## Before uploading

1. Add/modify all files above in one commit.
2. Confirm the new script is included in the app shell and both build IDs match.
3. Test Moon open/close, Sun open/close, repeated transitions, Location OFF/ON, portrait/landscape, touch scrubbing, and return to LIVE on the iPhone.
4. Treat astronomy timestamps as approximate, not precision ephemeris data.

The ZIP does not deploy to GitHub Pages and does not alter the repository on its own.
