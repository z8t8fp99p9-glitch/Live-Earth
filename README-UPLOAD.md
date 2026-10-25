# Upload guide — LIVE // EARTH V89.0 candidate

This ZIP is a **manual-upload candidate**, not a deployment.

## The one runtime file to upload
- `orb-controls-v4.js` → replace the repository's existing `orb-controls-v4.js` only.

## Do not upload these files
- `ROLLBACK-orb-controls-v4.js` is a recovery copy.
- The Markdown reports, diff, checksum list, and commit title are supporting files, not runtime assets.

## Scope
This removes the older Stacks placeholder panel from `orb-controls-v4.js`. The existing `LiveEarthFeatureViews` controller in `view-module-registry.js` remains the canonical owner of the Stacks library, random scatter, and collection animation. If the canonical controller isn't ready when the fallback handler runs, the new code shows a short loading notice rather than creating a second panel.

No HTML, service-worker, cache-list, database, renderer, or visual-art file is changed. No GitHub operation or deployment was performed.

## Test after manual upload/commit/deployment
1. Open and close Stacks repeatedly; the feature-orb library should still open and close through the existing controller.
2. Select and close a feature; the three-item feature dock and the original five main Orbs should return as before.
3. Toggle Location on/off; Location OFF must stop tracking and remove the marker as before.
4. Rotate portrait/landscape and verify the existing touch/viewport fix.
5. Test the installed PWA and offline return after an online refresh.

If anything regresses, restore `ROLLBACK-orb-controls-v4.js` by renaming it to `orb-controls-v4.js` and uploading that source manually.
