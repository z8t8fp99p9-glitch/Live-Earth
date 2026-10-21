LIVE // EARTH — V58 Dedicated Sun & Moon Sky Views

Changed files only:
- sw.js — preserves the V55 solar shader and updates cache version; includes/injects sky-views.js.
- sky-views.js — adds separate immersive Sun Sky View and Moon Sky View, fixed compass-style arc projection, approximate lightweight Sun/Moon coordinates, timeline scrubbing, Live return, and next horizon-crossing labels.
- earth-mode-navigation.js — closes a Sky View before the Earth orb performs its existing Explorer/Home transition.
- orb-controls-v4.js — included unchanged from the existing repository archive as a companion dependency.
- README-APPLY-FIRST.txt — these instructions.

Important:
- index.html is not modified; the protected Home composition is untouched.
- The V55 solar shader direction is preserved.
- Location is requested through the browser's existing permission flow. Without coordinates, the view does not display a fabricated personalized arc.
- Sky position and event calculations in this first implementation are lightweight approximations, not certified astronomical ephemerides. Verify against trusted references before treating event times as precise.
- The actual iPhone/runtime behavior has not been tested. Keep V55 available for rollback.

Apply:
Replace the listed files in the repository root. Do not upload this ZIP itself.
Suggested commit title: Add dedicated Sun and Moon Sky Views
