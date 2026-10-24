LIVE // EARTH — V88.1 Stacks Float Refinement

WHAT CHANGED
- Replaces only the existing view-module-registry.js.
- Keeps the five Home Orbs and approved Home/Earth framing unchanged while idle.
- The Stacks chooser is now a transparent layer: no surrounding glass card, no dim scrim, and no backdrop blur.
- Six feature Orbs float in one centered vertical column. The column scrolls independently; the Home scene and bottom navigation are not part of that scroll area.
- When any feature Orb opens, the active Moon/Sun/Earth Explorer primary view is closed to Home first, then the feature view opens. This prevents stale Moon/Sun scenes lingering behind the feature shell.
- Switching from one feature to another still deactivates and cleans up the outgoing feature before activating the next.
- The active feature screen keeps the intended three-Orb dock: active feature toggle, Location toggle, and Stacks.
- Tapping the active feature Orb closes it and restores the original five Home Orbs.

SCOPE AND SAFETY
- This package replaces only root view-module-registry.js.
- Do not replace index.html, sw.js, any renderer, the Moon Arc, or Location files for this refinement.
- The six items are UI/navigation preview shells. Live weather, cloud, alien-world, elevation, earthquake, and traffic data are not connected by this change.
- Keep a backup of the existing deployed view-module-registry.js before replacing it.
- This file has passed local syntax and smoke checks only. It has NOT been verified on the physical iPhone, in orientation changes, or through offline/service-worker reloads.
- Do not call it device-verified until the device checklist is completed.

GITHUB COMMIT TITLE (for manual use)
LIVE // EARTH V88.1 — Float Stacks Orbs and Clean View Switching
