# LIVE // EARTH — Lunar Stardust v81

## First, the important distinction

The screenshot of Home is expected to show the original scene. The lunar Arc and curved scroller are **Moon View overlays**, not Home decorations. The current live app will not show them until this v81 source change is uploaded and committed to the repository. The previous ZIP included the UI script, but left the wiring/cache/version changes as manual instructions; that was incomplete delivery on my part.

There is **no artificial wait** needed. Once all v81 edits are in one commit and GitHub Pages has published that commit, the existing LIVE // EARTH update mechanism should handle the staged build through its normal launch flow. This package does not modify GitHub or deploy on its own because uploads/commits are kept manual.

## Recommended: apply the complete patch to a local checkout

1. Download/clone the current `z8t8fp99p9-glitch/Live-Earth` repository at the v80 baseline.
2. Place `apply-lunar-stardust-v81.py`, `moon-lunar-interface.js`, and `lunar-rise-set-interval.snippet.js` together in the package directory.
3. Check the patch without changing files:

   ```bash
   python3 apply-lunar-stardust-v81.py /path/to/Live-Earth --check
   ```

4. Apply it:

   ```bash
   python3 apply-lunar-stardust-v81.py /path/to/Live-Earth
   ```

The script refuses unknown source versions, validates every target edit before writing, makes backup copies of the original four files, adds the new UI script, matches `sw.js` and `update-manager.js` at `v81-lunar-stardust`, adds the script to the app shell, and exports `moonRiseSetInterval` from `astronomy.js`. It does not create a commit or deploy.

## If editing directly in GitHub's web editor

Upload `moon-lunar-interface.js` to the repository root. Then edit these four existing files from `main`:

1. **`astronomy.js`** — append the entire `lunar-rise-set-interval.snippet.js` contents to the end.
2. **`index.html`** — in the active controller bootstrap `assets` array, add ` './moon-lunar-interface.js',` immediately after ` './view-manager.js',`.
3. **`sw.js`** — change the top comment to `/* LIVE // EARTH — v81 Lunar Stardust staged update. */`; set `BUILD_ID` to `v81-lunar-stardust`; set `CACHE_NAME` to `live-earth-shell-v81-lunar-stardust`; in `APP_SHELL`, add `"./moon-lunar-interface.js",` after `"./view-manager.js",`.
4. **`update-manager.js`** — change its `BUILD_ID` to `v81-lunar-stardust`.

Commit all five source changes together, not in separate commits. Commit title:

```text
Add Lunar Stardust Arc and curved time scroller (v81)
```

## Visual + safety behavior

- Adds a dramatic wide silver-blue Moon Arc and a separate S-shaped scroller over the lake; the main Moon and rail marker share one progress value.
- Rise and set labels use the local selected lunar interval, including intervals crossing midnight. Calculations are approximate, not precision ephemeris.
- The Moon-only overlay is inserted into the existing `#le-sky-view`; the background art, Home scene, approved Earth/Moon sizing, Orb dock, Sun view, IndexedDB, and recovery data are not replaced.
- Location is never requested by this layer unless the existing Location control is ON. With Location OFF, local rise/set values remain hidden; the visual interface can still open, but time scrubbing is unavailable until local event times can be calculated.
- No persistent coordinates are added, no storage is cleared, and Location is not switched ON by installing/updating.

## Verification boundary

Static syntax/package checks do not equal a deployed runtime test. After the commit is published, test Moon open/close, Sun open/close, portrait/landscape, repeated transitions, scrubbing on both curves, LIVE return, and Location OFF/ON on the iPhone. No user device or Pages deployment was changed by preparing this package.
