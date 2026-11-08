# LIVE // EARTH — Global Orb & View Standard

**Status:** Global architecture standard, build `v128-global-orb-system`.

## One global system

`window.LiveEarthOrbSystem` is the unified registry and navigation facade for all application Orbs and views. Primary navigation, utility Orbs and Secondary views retain their distinct behaviour, but they share one catalogue, one active-view identity and one lifecycle.

## View taxonomy

- **Primary views:** Home, Earth, Sun and Moon. Home is the default screen and is active whenever no other view is selected. Earth, Sun and Moon are the three Primary view Orbs in the five-Orb main layout.
- **Feature Orbs:** Location and Stacks. They are utilities, not views. Location is an ON/OFF capability. Stacks opens and closes the Secondary-view library. Neither changes or closes the active view.
- **Secondary views:** Every view registered in the Stacks catalogue. Only one Secondary view may be active at a time. Its active Orb occupies the first slot in the three-Orb dock, followed by Location and Stacks.

## Navigation contract

- Selecting a Primary view opens it. Selecting the already active Primary view returns to Home. Selecting another Primary view switches directly.
- Selecting a Secondary view opens it. Selecting the active Secondary view closes it. Selecting a different Secondary view closes the outgoing view and opens the incoming view.
- Opening or closing the Stacks library does not close or replace the current view.
- Location can be toggled from either layout without changing the active view.
- A Secondary view uses Home as its base scene in the current implementation. The existing five-Orb and three-Orb UI, artwork, sizing, placement, animations and hitboxes remain protected.

## Expandability

New Secondary views register through `LiveEarthOrbSystem.registerSecondary(id, options)` or the compatible `LiveEarthFeatureViews.register(id, options)` entry point. They join the same catalogue and three-Orb behaviour. No new navigation controller or extra Orb layout is required.

The normalized registry exposes `getOrbRegistry()`, `getViewRegistry()`, `getState()`, `getActiveViewIdentity()`, `getLayout()`, `activate()`, `close()` and `toggle()`.

## Lifecycle contract

A single `live-earth-view-transition` event is emitted before outgoing view cleanup, followed by `live-earth-view-changed` after the incoming view is active. Direct Primary changes and Secondary open/switch/close operations use the same owner identity: `primary:<id>` or `secondary:<id>`. Location and Stacks-library visibility changes do not emit view transitions.

## Earth Engine connection

Earth Engine listens to the central lifecycle and stores one normalized quaternion snapshot only (`x`, `y`, `z`, `w`). It captures the outgoing active Earth group once at transition time and applies the snapshot once to the incoming active Engine globe, or when that globe is created later. Current Secondary overlays fall back to the shared Home Earth group; a future Secondary that calls `createEarthGlobe()` receives an Engine group registered automatically under its active owner.

No camera, zoom, scene, renderer, lighting, geometry, texture, child-surface transform or Moon orbital state is copied. There are no continuous observers, polling loops or per-frame viewpoint writes. The snapshot uses same-tab `sessionStorage`; previous Home-only V3/V2/V1 records are read for migration.

## Protected invariants

- Home's Engine `group` and `surface` identities remain unchanged; Home continues passing that exact group to `createMoonOrbit`.
- Home remains locked-zoom; Basic/HD controls belong only to independent Earth View.
- Moon Orbit remains additive and cannot mutate the Earth group or surface rotation.
- Primary and Secondary scene/camera/renderer ownership stays independent where it already exists.
- Preserve online/offline shell behaviour, current Stacks layer ownership and the existing five-/three-Orb layout geometry.
- Do not add viewpoint APIs to individual views. Views continue to use the shared navigation system and `createEarthGlobe()` only.
