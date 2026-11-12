# LIVE // EARTH — Online Weather Live Art test

## First scene: A Rainy Tea Afternoon

This is the first online-on-demand Live Art test scene for the Weather view. It is available for the `rain` and `cloudy` conditions and uses the approved 10:7 art direction.

The artwork data is a vector-region interpretation of the approved tea-window scene: 870 ordered closed paths, a fixed 13-colour palette and a 1000 × 700 drawing coordinate space. The renderer progressively paints those regions into the Weather Live Art canvas; it does not reveal a flat image or download a raster wallpaper. This is the first integration/test asset, not the final multi-weather library.

## Online and offline behaviour

- The small `live-art-online.js` renderer is added to the app shell so the Weather view can always show its paper fallback.
- The small `art-library.json` catalogue is fetched only when the Weather Live Art card is active.
- Only the matching artwork JSON is fetched for the current weather. The whole art library is not downloaded.
- Catalogue and artwork use the public repository's raw-content endpoint with `cache: no-store`; they are not part of the service-worker app shell or Cache Storage.
- The selected vector artwork stays in memory for the current Weather view session. Replay redraws that in-memory data and does not fetch it again.
- Offline or failed artwork loading shows warm paper and `Connect to paint`; Replay is disabled. The old eight procedural studies are retained in source for this first test, but their canvas is replaced by the online adapter when the Weather view mounts.
- The artwork uses a fixed palette and does not auto-recolour between day and night.

## One manual activation line

After this ZIP has been extracted and the files have reached `main`, open the existing root `sw.js` and add the following single line at the very bottom, after the final event listener:

```js
importScripts("./Weather/Art/service-worker-extension.js");
```

Do not replace `sw.js` with the extension file. The extension adds only `live-art-online.js` to `APP_SHELL` and wraps the existing Home transformer to inject that script. The current `sw.js` needs only the one-line import above; its existing startup, cache and recovery logic is otherwise unchanged.

## Test on the app

1. Let the ZIP extractor finish and confirm its follow-on commit is on `main`.
2. Add the one-line service-worker import above and commit that change. Allow the app to receive the updated service worker.
3. Open the Weather view, turn on internet access, and select `RAIN` in the Weather scene selector. The title should become **A Rainy Tea Afternoon** and the illustration should paint progressively for about 18 seconds.
4. Tap **REPLAY**. It should redraw from the already-loaded data without another artwork download.
5. Turn internet access off while the Weather view is open. The Live Art card should return to warm paper, show **Connect to paint**, and disable Replay.
6. Reconnect. When using the manual preview selector, switch from `RAIN` to `CLEAR`, then back to `RAIN` to trigger a fresh artwork request.

The `CLOUDY` preview intentionally uses the same first scene. Other weather scenes are not part of this first test yet.

## Safe rollout

No old procedural studies are deleted in this package. No Weather layout, 10:7 card sizing, main Weather painter, Home/Earth scene, Orb dock, Location permissions or user data are changed. Remove the old studies only after this online test has been confirmed on-device and broader regression checks pass. The later offline mini-library (one or two selected works per weather condition) remains a separate phase.
