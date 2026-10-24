# Validation report — Global Feature Orb prototype

## Automated checks completed in this workspace
- `node --check view-module-registry.js` — PASS.
- Smoke test — PASS: six default feature entries are registered, Stacks library toggles, opening a feature hides the original navigation, switching calls outgoing `deactivate` before incoming `activate`, close calls cleanup and restores the five-Orb navigation, and feature-mode marker is removed.
- Source-scope check — the package replaces only the already-loaded `view-module-registry.js`; it does not modify `index.html`, `sw.js`, scene renderer files, Earth/Moon geometry, or the Location controller.

## Not tested here
- Visual rendering in Safari/iOS standalone app.
- Physical touch targets, orientation changes, and hit-testing after rotation.
- Service-worker update and cold-start/offline cache behavior on device.
- Existing Moon Arc, Sun view, Location, and all Home Orb interactions on the actual deployed app.

## Required device test before calling this complete
1. Home loads with the existing five Orbs and approved Earth/Moon framing.
2. Tap Stacks; a scrollable Orb library appears with no X close button.
3. Open Weather; the three-Orb dock appears and the main five-Orb dock is hidden.
4. Tap Stacks, select Alien World; Weather's deactivate lifecycle runs before Alien World's activate lifecycle.
5. Tap Alien World's own Orb; feature view closes and the original primary view/five Orbs return.
6. Toggle Location from the three-Orb dock; red glow/state must match ON/OFF, and OFF must preserve current privacy rules.
7. Repeat in portrait and landscape, including switching orientation while the feature library is open.
8. Test an online reload and a fresh/offline launch; confirm the existing saved data is untouched.
9. Re-test Moon Arc and Sun view to ensure they are not regressed.

Do not claim the prototype is device-verified until these checks are done.
