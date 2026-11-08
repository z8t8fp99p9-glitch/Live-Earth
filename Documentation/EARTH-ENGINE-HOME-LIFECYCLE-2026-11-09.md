# Earth Engine — Home active-view lifecycle (9 November 2026)

## Decision

Home is the default active view. When a different Engine Earth group becomes active (for example, Independent Earth View), the Earth Engine suspends the Home renderer and its Moon refresh timer. When ownership returns to the Home group, the Engine applies the latest global quaternion first, then resumes Home and requests a fresh frame. Secondary feature overlays that deliberately render layers on Home's persistent Earth group keep that shared renderer alive; they are not a separate Earth render owner.

## Ownership boundary

The Earth Engine owns the active-owner decision and the lifecycle ordering. A globe may register a generic view-runtime adapter with `registerViewRuntime({ activate, deactivate })`. The Engine invokes `deactivate` for the outgoing owner before view cleanup, and invokes `activate` for the incoming owner only after the Engine has applied its shared quaternion. The adapter supplies renderer-specific pause/resume work; it does not read or synchronize the viewpoint.

Home's adapter pauses its on-demand render scheduling, cancels a pending frame and viewport settling work, stops the Moon refresh timer, and clears any in-progress pointer gesture. On activation it refreshes Moon position, restarts the timer, settles the canvas viewport, and requests a render. Home's Earth group, surface, texture, Moon orbit, star field, camera framing and locked zoom remain allocated and unchanged.

## Expected transitions

- `primary:home` → any other owner: capture Home quaternion, suspend Home before outgoing cleanup.
- Any other owner → `primary:home`: apply the current Engine quaternion, resume Home, render without waiting for touch.
- `primary:home` → `secondary:<feature>` with no independent Engine globe: Home's shared renderer remains active for the feature layer.
- `primary:home` → a Secondary view with its own Engine globe: Home is suspended and the new group's renderer takes ownership.
- Page hide: capture the active quaternion and deactivate registered render runtimes.

## Verification boundary

The regression suite verifies suspend/resume ordering and confirms that the incoming Home runtime observes the already-applied quaternion. Code-level tests do not replace the required installed-iPhone test of Primary and Secondary view transitions, Moon visibility, and Home rendering on return.
