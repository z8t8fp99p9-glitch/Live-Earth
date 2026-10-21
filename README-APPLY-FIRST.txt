LIVE // EARTH — V56 GLOBAL ORB STATE REPAIR

Purpose
Keep the V55 Earth-only day/night shader direction, while making entry into Earth Explorer explicitly clear any active Sun/Moon orb state and hide the Sun/Moon preview panel. This is a narrow state-synchronization repair; it does not redesign orb CSS or change Home composition.

Files
- sw.js — retains V55 solar shader direction; increments the service-worker cache name to V56.
- earth-mode-navigation.js — when Explorer activates, explicitly sets Sun/Moon aria-pressed=false, hides #astroPanel, then dispatches the existing global exclusive-mode event.

Apply
1. Keep the current deployed files as a rollback copy.
2. Replace only these two files with the files in this ZIP.
3. Commit title: Restore global orb state synchronization
4. Deploy, then fully reload the site on iPhone. Test Sun preview -> Earth Explorer, Moon preview -> Earth Explorer, Location ON/OFF, and Stacks ON/OFF.

Preserved standards
- Earth/Moon/Home geometry and camera framing are unchanged.
- Solar shader direction from V55 is retained.
- Earth controls Explorer entry/exit; Location and Stacks never close Explorer.
- Earth, Sun, and Moon are mutually exclusive; Location and Stacks remain independent.

Validation
Runtime behavior must be confirmed on device. This patch does not change index.html orb glow CSS or orb-controls-v4.js.
