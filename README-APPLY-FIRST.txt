LIVE // EARTH — V57 INDEPENDENT VIEW STATE (CHANGED FILES ONLY)

Purpose
Introduce a central foreground-view state manager while keeping Home outside the manager's rendering authority. Stacks is a contextual option, Location is a global feature toggle, and only one primary foreground View can be active.

Changed files
- sw.js: V55 solar-lighting baseline preserved; cache version updated; adds view-state.js to shell and injects it before the controller scripts.
- view-state.js: new authoritative state for foreground View, options, and global features. null means protected Home; the manager does not render or mutate Home.
- orb-controls-v4.js: foreground glow derives from the manager; Stacks updates option state; Location updates global feature state; Sun/Moon become exclusive foreground Views.
- earth-mode-navigation.js: Explorer enter/exit is registered with the manager. Location and Stacks never close Explorer.

Protected
- V55 Earth-only day/night shader direction is unchanged.
- index.html and its Home composition are unchanged.
- Earth/Moon sizes and Home framing are unchanged.
- No GitHub writes or deployment were performed.

Apply
Replace the four listed files in the repository root. Do not upload this ZIP itself.
Commit title: Add independent foreground view state manager

Validation
JavaScript syntax and ZIP integrity checks passed locally. This architecture patch has not yet been browser/iPhone runtime-tested. Test transitions before treating it as approved.
