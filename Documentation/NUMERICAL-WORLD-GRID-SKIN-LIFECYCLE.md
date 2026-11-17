# Numerical World Grid-Skin View Lifecycle

## Architecture

The universal renderer remains a shared utility at
`EarthEngine/Graphics/earth-grid-rendering-skin.js`, but it is no longer loaded
by `Stacks/stacks-feature-views.js`.

Each numerical-world controller loads the renderer lazily from its own
`activateView()` callback. The first world opened loads the script; subsequent
worlds reuse the same renderer API and browser load promise.

## View ownership

When a numerical world opens:
1. Its controller mounts its existing view through the established feature-view contract.
2. It loads the shared grid-rendering skin only if it is not already available.
3. It attaches a world-specific layer group through the existing shared Earth layer interface.
4. It reports that the renderer is ready but waits for verified grid data.

When the view closes:
1. The controller's returned cleanup callback runs.
2. Any grid handle is disposed.
3. The world-specific layer registration is removed.
4. The view-owned group is detached.
5. The shared Earth base mesh and all other views remain untouched.

## Boundaries preserved

- `Stacks/stacks-feature-views.js` is restored to the version in the user's
  working ZIP. It does not load or expose the numerical grid renderer.
- The existing shared Earth and Earth Engine remain unchanged.
- All six numerical worlds use the same renderer implementation.
- No numerical measurements, network requests, fake values or persistent state
  are introduced.
- The existing Earthquakes Orb remains independent and unchanged.
- The current renderer is still a first-pass grid-cell mesh implementation;
  full-resolution scientific grids require GPU texture rendering and device
  performance validation before production use.

## Not yet connected

No world has a verified data adapter or actual grid payload connected. The
controllers establish view-scoped loading and disposal only.
