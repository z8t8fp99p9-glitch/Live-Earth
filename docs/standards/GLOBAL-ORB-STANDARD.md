# Global Orb Standard

**Status:** protected Global standard.

## Home Orbs
The approved Home navigation contains exactly five primary Orbs: Earth, Moon, Sun, Location and Stacks. Preserve approved artwork, dimensions, position, circular geometry, touch targets and visual state.

## Primary navigation versus utilities
- Earth, Moon and Sun are the primary views.
- Selecting a different primary Orb changes the primary view.
- Selecting the active primary Orb returns Home.
- Location and Stacks are global utility features. They must not unexpectedly replace or close the active primary view.
- Location is a state toggle. It must not navigate merely because it is ON.

## Geometry and interaction
Orb diameter is width-driven and remains circular. Do not independently shrink height or distort aspect ratio. Landscape adjustments must preserve the approved circle size/position and hitbox alignment.

The Stacks/feature scatter uses a shared full-screen coordinate space. Visible Orbs and clickable hitboxes must move together. Avoid nested scrollers that offset touch coordinates. Preserve lifecycle cleanup and animation fallback guards.

## Change gate
No Orb behaviour, dependency, sizing, navigation, state, animation or touch-target change is authorised by a general cleanup request. Require explicit owner approval, source/caller inspection, targeted tests and installed-iPhone verification.
