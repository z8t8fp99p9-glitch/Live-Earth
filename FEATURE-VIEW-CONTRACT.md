# Feature View Contract — V88.5 Orb Hunt

1. Stacks open: release six feature buttons from the centre of the visible Stacks Orb and scatter them asymmetrically.
2. Scatter: every item is a button with an absolute position; the clickable element wraps its orb and label. There is no inner scroll pane.
3. Layout: measure the screen's available region and the visible nav's top edge. Avoid the Stacks heading and bottom navigation. Check overlap before accepting each random position; use a jittered fallback if needed.
4. Selection: collect all buttons back into Stacks, then close the chooser and activate the selected view. The existing feature lifecycle deactivates the old feature before activating the new feature.
5. Dismissal: tapping Stacks collects the feature buttons and restores the underlying navigation unchanged.
6. Motion accessibility: respect prefers-reduced-motion.
7. Safety: Home/Earth/Moon scene and original five Home Orbs are protected; no service-worker or data modifications.
