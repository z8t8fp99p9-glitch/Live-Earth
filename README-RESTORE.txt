LIVE // EARTH — WORKING UPDATES RESTORE PACK (V53)

Purpose
Restore the latest known-good V53 working behavior while preserving the V51 Home visual lock and V52 location scanner. This is a changed-files-only recovery ZIP, not a full site archive.

Files to replace in the repository root
- sw.js
- earth-mode-navigation.js
- location-scanner.js (add if absent)

Included behavior
- V51: preserve the approved Home Earth geometry and renderer pixel ratio; Home camera framing remains protected.
- V52: persistent location dot + Exploration-only scanner, same globe orientation retained on return Home.
- V53: Location and Stacks orbs do not close Explorer; Earth orb alone enters/exits Explorer.
- Basic/HD quality and bounded Exploration zoom retained.

Protected
- The solar/day-night injection is carried forward unchanged from the V53 working patch. No lighting correction is included.
- No Sun preview/time-zone correction is included.
- Do not replace index.html, orb-controls-v4.js, data-store.js, or earth-orb-globe.js with this pack.
- Do not change the approved Home Earth/Moon size, framing, camera composition, or orbit/stardust.

Apply
1. Unzip this archive.
2. Replace the three listed files in the repository root (add location-scanner.js if missing).
3. Commit and deploy from your own GitHub workflow.
4. After deployment, fully reload the app once so the V53 service-worker cache activates.
5. Verify Home framing; enter Explorer; test Basic/HD and zoom; tap Location and Stacks without leaving Explorer; test Scanner and return Home.

Validation performed on this archive: ZIP integrity, expected V53 cache name, Home visual-lock code, solar function presence, and JavaScript syntax. Static checks are not a substitute for iPhone runtime testing.
