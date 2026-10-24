# LIVE // EARTH — Global Feature Orb Contract

## Goal
Grow the feature catalogue without adding permanent buttons to the protected five-Orb Home.

## Active-feature control set
When a Stacks feature is active, show exactly three controls:
1. The active feature's own identity Orb — tapping it closes that feature.
2. Location — uses the existing Location ON/OFF implementation and retains the red-glow rule.
3. Stacks — opens/closes the feature library.

No X/close button is introduced.

## Switching
- Stacks opens a scrollable Orb catalogue.
- Selecting a different feature runs the outgoing feature's `deactivate` hook before running the next feature's `activate` hook.
- The feature manager emits `live-earth-feature-view-change` events with phase `activate` or `deactivate`.
- One feature is active at a time.
- Closing the active feature restores the underlying primary view and the five original Home/navigation Orbs.

## Feature extension API
`window.LiveEarthFeatureViews.register(id, options)` accepts:
- `title`, `shortLabel`, `symbol`, `description`, `connected`
- `activate(previousFeatureId, source)`
- `deactivate(nextFeatureId, reason)`

Other methods: `open(id, source)`, `close()`, `toggleLibrary()`, `getActive()`, `getReturnView()`, `isLibraryOpen()`, `list()`, `isActive(id)`, `unregister(id)`.

Feature `activate`/`deactivate` hooks are the place future data modules must start/stop their timers, event listeners, render loops, and subscriptions. Registering a feature does not itself connect live data.

## Initial default catalogue
- Clouds (cloud symbol, cool silver/blue glass glow)
- Weather (weather symbol, blue glow)
- Alien World (saucer symbol, violet glow)
- Elevation (mountain symbol, green glow)
- Earthquakes (wave symbol, warm amber glow)
- Traffic (direction symbol, teal glow)

These are placeholder views for validating global navigation only. Their data layers are not connected.

## Protected invariants
- Do not resize/reframe/zoom the Earth or alter the approved Home camera.
- Do not change the Moon size or approved orbital curves.
- Do not add feature buttons to the idle Home Orb dock.
- Do not change Location-OFF privacy semantics.
- The current primary view is left intact underneath the temporary feature shell and restored on close.
- No service-worker or cache manifest changes are made by this prototype.
