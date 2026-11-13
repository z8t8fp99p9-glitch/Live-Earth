# Clear Maple Pavilion — painted-master replay correction

This is a corrective patch for the first schema-v3 Clear Maple Pavilion replay. The approved painted master remains byte-for-byte unchanged.

## What is corrected

- Rebuilds the five-stage mask atlas from the actual painted pigment pixels, retaining broad filled brush forms and their natural texture instead of narrow contour-only traces.
- Keeps red leaves and floating red accents out of the first three stages; leaves appear in stage 4, and the sun plus its finishing marks appear only in stage 5.
- Uses equal timing for all 100 authored gestures, with only short pauses at stage boundaries. The complete replay remains exactly 30 seconds and the progress counter advances steadily.
- Updates the binding production guide, machine-readable art direction, catalogue and technical addendum to standard 2.5.
- Includes a five-stage preview for review.

## Protected

- Original approved master image is unchanged.
- Rain artwork and schema-v1 renderer are unchanged.
- Historical schema-v2 artwork support is unchanged.
- Weather layout, card ratio, typography, forecast UI, service worker, online loading and offline/recovery behaviour are unchanged.

## Validation

Run `node Tests/weather-art-master-reveal.test.cjs` from the repository root. The test checks the 100-gesture / 30-second contract, stage order, invalid data rejection, and Rain / legacy compatibility.

## Upload

Upload this ZIP to the repository root on `main` without unpacking it. The manifest contains the commit title:

`Correct Clear Live Art Brush Reveal and Preserve Painted Master`
