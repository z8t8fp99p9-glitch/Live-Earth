# V88.9 manual-upload instructions

1. Back up the current `view-module-registry.js`. The included `ROLLBACK-view-module-registry-V88.8.js` is the exact repository baseline fetched for this patch.
2. Replace only `view-module-registry.js` with the patched file.
3. Do not replace `index.html`, `sw.js`, Earth/Moon renderers, or other files for this patch.
4. The prior landscape size reduction came from the `max-height:460px` CSS override, not from the five fixed Home Orbs; the scatter safe bounds affect only placement.
5. Test: open Stacks; confirm no dotted ellipse crosses Home's Moon/stardust path; rotate portrait/landscape and compare feature Orb diameters; tap each Orb; tap Stacks to collect; verify the original five Home Orbs remain and feature views close in the expected order.
6. No GitHub write or deployment is included.
