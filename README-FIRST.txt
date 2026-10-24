LIVE // EARTH V88.5 — ORB HUNT: RANDOM, ASYMMETRIC FEATURE ORBS

STATUS
Review-only prototype package. No GitHub writes or deployment were performed.

WHAT CHANGED
- Stacks now releases six feature Orbs into randomized, non-symmetric positions across the available screen area.
- Every feature orb is an absolutely positioned button in a single full-screen coordinate space. The visible orb and its hitbox move together; there is no nested scroller to offset taps.
- Orbs emerge from the centre of the visible Stacks orb, settle into the randomized layout, drift gently, and collect back into Stacks when the chooser closes or a feature is selected.
- The visible Stacks orb is measured directly from its .orbShell, not the taller button including its text label.
- The Home five-Orb navigation, vmin size tokens and approved Earth/Moon composition are retained. No Home scene renderer, Moon geometry, service worker, location privacy or stored-data code is changed.
- The existing "View preview" caption is retained in portrait; the compact landscape CSS reduces caption sizing to protect fit.
- Reduced-motion preference disables transition/float animation.

FILES
- view-module-registry.js: intended replacement based on V88.4 committed blob d73e711cbd8757cafa741a9dc2a690dd08802209.
- index.html: unchanged copy of V88.4 committed blob 98c79eea09d9be2d251198a4caaf108372ecc5c1, included only so the full package is self-contained.
- ROLLBACK-* files: exact V88.4 copies. Confirm your live files match these blobs before replacing anything.

MANUAL TEST ORDER
1. Back up your current registry file. The package's index.html should not need replacing; keep the current version unless you compare it with the included file.
2. Replace view-module-registry.js on your own branch only after comparing it against the current file.
3. Tap Stacks in portrait. Six feature Orbs should emerge from Stacks, scatter asymmetrically, stay clear of the bottom navigation, and be directly tappable at their visible positions.
4. Tap Stacks again. Orbs should collect back into Stacks and disappear.
5. Open Stacks, select Weather, and verify collection finishes before the feature view opens. Confirm the previous primary view is closed.
6. Open Stacks from the three-Orb feature dock, check the anchor origin, select another feature, and confirm lifecycle cleanup order.
7. Rotate to landscape and back while Stacks is open. Orbs should be re-scattered within the available viewport without clipping. Tap each visible Orb near its centre and edge to confirm hitboxes.
8. Test browser and installed PWA, and confirm Home/Earth/Moon framing, five Home Orbs, Location ON/OFF privacy, offline behaviour and saved local data are unchanged.

TEST LIMITATION
Node syntax and mocked DOM smoke tests are useful checks but do not replace physical iPhone portrait/landscape and installed-PWA testing. Random placement is collision-checked in code; device viewport measurements still need to be verified on device.

COMMIT TITLE
LIVE // EARTH V88.5 — Release Random Orb Hunt for Stacks
