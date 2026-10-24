# Validation report — Stacks Float Refinement

## Local automated checks completed
- `node --check view-module-registry.js` — PASS.
- `node smoke-test.cjs` — PASS.
- The smoke test verifies six default feature entries, a transparent vertical Stacks list, independently scrollable list styling, primary-view request to Home when opening a feature from Moon, outgoing feature deactivation before incoming activation, and restoration of the five-Orb navigation on close.
- Scope review: the draft changes only `view-module-registry.js`; no renderer, index, service-worker, Moon, Location, or storage file is included as a replacement.

## Not tested here
- Visual rendering and scrolling in Safari/iOS standalone app.
- Real touch gestures, safe areas, and orientation changes on device.
- Service-worker cache refresh and offline/cold-start behavior after manual upload.
- Full Home/Moon Arc/Sun/Location regression on the live site.

## Device test checklist
1. Open Stacks while Moon is active: list appears as floating vertical Orbs, without a surrounding panel or blurred/dimmed scrim.
2. Scroll the Stacks list: only the list scrolls; the Earth/Moon background and bottom controls remain fixed.
3. Tap Clouds or Alien World from Moon: Moon view deactivates and the feature shell opens over Home, not over the Moon view.
4. Open Stacks while Weather is active, then select Alien World: Weather deactivates before Alien World activates.
5. Tap the active feature Orb: feature closes and the original five Home Orbs return.
6. Toggle Location from the three-Orb dock; active glow must match ON/OFF and Location-OFF privacy rules remain intact.
7. Repeat in portrait and landscape, including orientation change while Stacks is open.
8. Test online reload and offline/fresh launch; confirm existing local/IndexedDB data is untouched.
9. Re-test Moon Arc and Sun navigation before calling the refinement stable.

Do not call this release or device-verified until these checks pass on the target devices.
