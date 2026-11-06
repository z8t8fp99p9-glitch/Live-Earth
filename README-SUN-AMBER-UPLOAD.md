# LIVE // EARTH — Sun View Amber Rise/Set Markers

## What this update changes

This is a Sun View-only visual refinement. The only runtime file changed is `sun-view-renderer.js`.

- The small Rise marker uses brighter honey-gold accents.
- The small Set marker uses a slightly deeper sunset amber.
- Each icon's wave lines, rising/setting Sun shape, sparkle and reflection are coloured individually.
- The Rise/Set time values and the small RISE/SET captions receive matching warm shades.
- The styling is scoped to `#le-sky-view[data-view="sun"]` and does not recolour the Moon View.

## What stays unchanged

No icon position, size, spacing, typography size, time calculation, scroller movement, arc geometry, star trail, background, Home composition, five Home Orbs, Location privacy rule or other view is changed. When Location is OFF, local Rise/Set values remain hidden as before.

The existing optional-resource delivery path is retained. `sun-view-renderer.js` is not an essential app-shell file; it is requested through the current optional-resource path, which fetches online first and maintains its existing bounded cache. No `sw.js` or build-ID change is included or required for this narrow styling change.

## Upload instructions

1. Upload this ZIP to the repository root on branch `main`.
2. The ZIP filename must be exactly `LIVE_EARTH_MAIN_UPLOAD.zip` so the existing ZIP Extractor workflow recognizes it.
3. Use this manual upload commit title:

   `Warm Sun Rise and Set Markers in Amber`

4. The manifest lists every payload file, as required by the current extractor. The workflow applies the runtime file and this README, removes the uploaded ZIP, then makes its normal automatic follow-up commit:

   `Apply LIVE // EARTH Main Upload`

Do not edit workflow YAML or replace any other runtime file. The user performs the upload and commit.

## Source and validation

Prepared against the read-only inspected `main` baseline at commit `39b37d8898cc6dbb21598cbb0eb96a968e497d74`. The unmodified portion of `sun-view-renderer.js` was reconstructed and its Git blob SHA matched the current `main` file exactly: `32a8c6aa6b4a21d9d527d453e3bf30bcf32f188b`.

JavaScript syntax, upload-manifest file coverage, every payload size and SHA-256, and ZIP integrity were checked locally. The deployed Sun View and actual iPhone portrait/landscape appearance still require post-upload testing.
