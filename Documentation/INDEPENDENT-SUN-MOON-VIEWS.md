# Independent Sun and Moon Views

**Decision baseline:** 6 November 2026 and the prior view-separation audit.

## Principle
Sun and Moon are independent primary views. They may share a sky-stage host and module registry, but must not share or transform one another's renderer implementation at runtime.

## Current responsibility map
- `Global/sky-view-controller.js` — shared sky stage/host, common background selection and view lifecycle.
- `Moon/moon-view-controller.js` — Moon-specific 3D rendering and Moon View behaviour.
- `Moon/moon-lunar-interface.js` — Moon-specific lunar Arc/time-scroller interface and overlay lifecycle.
- `Sun/sun-view-controller.js` — standalone Sun controller, solar calculations, Sun-specific Arc/scroller and Sun visual treatment.
- `Global/view-manager.js` — primary-view transition authority.
- `Global/view-module-registry.js` — shared view-module lifecycle/registry.

The stage and registry are integration points. They do not make Moon and Sun one renderer.

## Required safeguards
- No Sun dependency on Moon controller source or runtime transformation of Moon code.
- No Moon/Lunar state, geometry, calculations or interface injected into Sun.
- Keep each view's lifecycle scoped to its own primary view.
- Keep Location-OFF privacy: local rise/set data remains hidden when Location is OFF.
- Keep the existing portrait/landscape background assets and stage sizing.
- Do not move, rename or remove background images or textures without tracing service-worker/runtime references.
- Preserve global Orb behaviour and the Home scene.

## Verification for any future view change
1. Syntax-check the changed renderer/controller.
2. Confirm the unrelated renderer and controller are unchanged.
3. Open/close the affected view repeatedly.
4. Test Moon and Sun independently, including return to Home.
5. Test portrait → landscape → portrait on the installed iPhone.
6. Verify Location OFF does not reveal local observer times or trigger geolocation.
7. Verify online/offline asset readiness when an app-shell or optional-resource path changes.

## Historical Sun amber refinement
A previous Sun-only update applied brighter honey-gold Rise accents and deeper sunset-amber Set accents to the small marker artwork, wave lines, time values and captions. It was scoped to the Sun stage and did not change Moon colours, positions, sizes, spacing, calculations or Arc geometry. Treat this as a recorded visual decision, not a blanket instruction to recolour the current renderer.
