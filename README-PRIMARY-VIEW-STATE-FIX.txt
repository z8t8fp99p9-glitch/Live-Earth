LIVE // EARTH — Primary View State Synchronization Fix

PURPOSE
Fix disagreement between the primary-view manager and the legacy orb controller. Keep Home's approved Earth/Moon composition untouched.

FILES IN THIS PATCH
- view-manager.js — paints live orb nodes and centrally handles Earth Explorer, Moon View, and Sun View clicks.
- orb-controls-v4.js — lets the manager own primary-view glow/state; Location and Stacks remain independent; closing Stacks no longer resets primary view.
- earth-mode-navigation.js — Escape returns Explorer to Home through the manager.
- sky-view-controller.js — retained unchanged to keep the existing view layer in sync.
- sw.js — cache version bumped to v63 so clients can fetch the corrected scripts.

UPLOAD
Replace the listed files in the repository root together in ONE commit. Do not upload this ZIP itself and do not delete other files. No GitHub files have been changed by ChatGPT.

Suggested GitHub commit title (copyable):
Synchronize primary view state and independent utilities

CHECKS PERFORMED
JavaScript syntax checks and ZIP integrity checks are run before delivery. These checks do not substitute for testing on the live iPhone/browser. After upload, verify: (1) Location toggles without leaving Moon/Sun/Explorer; (2) Stacks opens/closes without leaving the active view; (3) Earth/Moon/Sun switch each other correctly; (4) tapping the active primary orb returns Home; (5) Home Earth/Moon sizes and positions remain unchanged.
