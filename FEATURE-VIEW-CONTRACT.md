# LIVE // EARTH — Global Feature Orb Contract (V88.1 refinement)

## Stacks interaction
- Stacks opens a transparent overlay, not a glass panel or dim/blur screen.
- Feature Orbs appear in a single centered vertical column with individual glass-Orb styling.
- The feature list scrolls inside its own bounded region. The Earth/Moon scene and bottom navigation do not move with that scroll.
- On short viewports, the scroll region becomes shorter while leaving room for the bottom navigation/dock.

## Lifecycle contract
1. When a feature is selected, clean up the previously active feature first (if any).
2. If the primary view manager is on Moon, Sun, or Earth Explorer, request Home so the old scene deactivates.
3. Mark the feature active and show the feature shell plus the three-Orb dock.
4. When switching features, deactivate the outgoing feature before activating the incoming feature.
5. Tapping the active feature Orb deactivates it, hides the feature shell/dock, and restores the original five Home Orbs on Home.

## Protected behavior
- No changes to Earth renderer size/camera framing, Moon geometry/Arc, Home composition, original five Home Orbs, data stores, service worker, or Location privacy logic.
- The Location toggle remains independent and Location-OFF privacy behavior is unchanged by this file-only refinement.

## Current limits
The six default feature entries remain preview shells only. Data providers and the future Alien World interaction are out of scope for this prototype.
