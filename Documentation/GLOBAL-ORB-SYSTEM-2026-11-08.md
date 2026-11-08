# Global Orb System — implementation note

**Build:** `v128-global-orb-system`

The Primary view manager and Stacks feature-view manager remain the runtime owners for their respective content modules, but `Global/view-module-registry.js` now presents them through one global `LiveEarthOrbSystem` facade and emits one effective-view lifecycle.

The central registry distinguishes four Primary view identities (including the Home default), two utility Feature Orbs (Location and Stacks), and an expandable set of Secondary views. The main five-button row and Secondary three-button dock are unchanged. The Stacks library is an overlay/selector, not an active view. Location remains a utility state toggle.

Primary changes emit one pre-transition event before any outgoing module deactivation. Secondary open/switch/close emits the same event before feature cleanup. A direct Primary change while a Secondary view is active closes the Secondary view within the same effective transition. A Primary-to-Secondary change that internally returns the underlying primary scene to Home suppresses the intermediate Home owner event.

Earth Engine owns one global quaternion snapshot. It tracks the current Engine group by owner identity, captures only at a view transition or page hide, and applies once to the incoming existing group or at Engine group creation. Existing Secondary overlay views use the Home group by default; future Secondary views may create their own Engine globe without adding view-specific viewpoint code. The former Home-only bridge remains in the tree as a legacy migration reference, but Home, independent Earth View and Earth Modes no longer import or call it.

No Orb sizing/artwork/layout, Home scene framing, Moon orbit, solar layer, per-view camera/renderer, data view, or feature implementation was intentionally redesigned.
