# LIVE // EARTH — Global Orb Size Standard (V88.5)

## Core rule
Use the shorter current viewport dimension (`vmin`) as the global reference for Orb diameters. Distinct roles may use different multipliers, but they share one reference system.

## Protected visual baseline
Home Orb dimensions and styling stay at the V88.4-approved vmin tokens; this revision does not change the Earth or Moon renderer/camera/geometry. The Home Orb row stays grouped and slightly lower in landscape according to the existing V88.4 CSS.

## Stacks Orb Hunt
The six feature-Orb buttons use the existing smaller feature size token. Their positions are sampled randomly within the measured visible region between the Stacks heading and the visible Home/dock navigation. Collision checks prevent their button rectangles from overlapping; if random placement cannot fit, a jittered, orientation-aware fallback is used. The button and its visible Orb are a single positioned element so hitboxes travel with their visuals.

## Viewport and touch notes
Coordinates use the rendered full-screen overlay's `getBoundingClientRect()` space and the visible Stacks Orb circle (`.orbShell`) as the animation origin. This avoids using the button's label-expanded bounding box as the source point. The layout is recalculated on resize, orientation change and visual viewport resize.

## Motion
Feature Orbs emerge from Stacks, settle at randomly scattered positions, drift very slightly, and collect back into Stacks when dismissed or selected. Reduced-motion settings skip animation. Orb positions remain stable while the user is tapping, and the buttons themselves carry the hitboxes.

## Exclusions
No service-worker changes, no deployment, no live-data integrations, no local-storage or IndexedDB migrations, no Location ON/OFF logic changes, and no Earth/Moon visual framing changes.
