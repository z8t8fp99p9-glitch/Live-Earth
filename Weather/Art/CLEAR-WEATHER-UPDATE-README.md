# LIVE // EARTH — Clear Weather Live Art update

This is a **prepared app update package**, not a deployment or GitHub commit.

## What is included

- `Weather/Art/clear-maple-pavilion-001.json` — ordered-path drawing data derived from the supplied Clear Weather master. It uses the existing 1000 × 700 / 10:7 schema and contains 757 encoded paths.
- `Weather/Art/art-library.json` — catalogue replacement retaining the existing Rain entry and adding Clear.
- `Weather/Art/References/clear-weather-master-001.jpg` — the original user-supplied master, copied byte-for-byte.
- `Weather/Art/References/clear-weather-path-preview-001.png` — preview reconstructed from the ordered paths.
- `Weather/Art/Plans/clear-maple-pavilion-001.md` — the scene-specific drawing sequence.
- `Weather/Art/LIVE-ART-MASTER-FIRST-WORKFLOW.md` — binding master-first process for all future art.
- `Weather/Art/LIVE-ART-PRODUCTION-GUIDE-ADDENDUM-2.1.md` and `ART-DIRECTION-ADDENDUM-2.1.json` — the updated production rules and approved Clear plan.
- `apply-clear-weather-renderer-update.py` — minimal, baseline-guarded script required to make the existing renderer select `clear`.

## Install into the repository

1. Extract this ZIP at the root of `z8t8fp99p9-glitch/Live-Earth`, preserving the folder structure. Allow the included `Weather/Art/art-library.json` to replace the current catalogue.
2. From the repository root, run:

   `python3 apply-clear-weather-renderer-update.py`

   The script verifies that `Weather/Art/live-art-online.js` matches the inspected source blob before changing anything. If the renderer differs, it stops without changing the file.
3. Review the diff. Only the catalogue, new Clear artwork/reference/production files, and the four narrow renderer-selection edits should change.
4. Upload/commit the reviewed changes yourself, then test the Clear Replay and Rain Replay in the app.

## Protected behaviour

The path decoder, painting algorithm, Replay timing, paper rendering, Rain artwork file, online/on-demand behaviour, cache policy, card layout, and unrelated views are not redesigned by this package.

## Fidelity note

The uploaded master is preserved unchanged. The app path file reconstructs its contours and tonal details through the existing closed-path renderer; it is **not pixel-identical** to the source JPEG. The app supplies its own warm-paper ground, so the source's individual paper-grain pixels cannot be carried over by this schema. The master remains included as the immutable source of truth. Do not describe the path preview as a byte-for-byte or pixel-perfect copy.

## Verified against the inspected main-branch baseline

- Rain artwork: `93a0c77599008d07d29ce38ae7eda115df03cbf0`
- Art catalogue: `cf61d9e3236e1cb7d254404d4a85263b131250e3`
- Live Art renderer: `d4e03712d324b1b9a8a0cacb3560de09e910d42a`

No files were written to GitHub and no deployment was performed.

## Integrity files

`VALIDATION-REPORT.txt` records the checks performed. `CLEAR-WEATHER-UPDATE-MANIFEST.json` records source and output details. `SHA256-MANIFEST.txt` contains checksums for the package files.
