# Project History

This is a short record of durable decisions, not a log of every experiment or patch. Deleted documentation remains available in Git history.

## October 2026 — Product and visual foundation

- LIVE // EARTH established as a lightweight, phone-first Earth and sky explorer.
- Home settled on a realistic 3D Earth globe with fixed framing, one-finger rotation and five Home Orbs.
- Location was defined as explicit opt-in and OFF by default.

## 28–31 October — Navigation and view boundaries

- Primary-view navigation, shared Orb/Stacks lifecycle and iOS root-flow safeguards were formalized.
- Moon and Sun remained separate views. Local data and recovery were protected.
- Alien World changed from an early game concept to an online astronomy discovery view; later plans and prototypes are historical unless present in current source.

## 7–9 November — Architecture consolidation

- The former content collection and publishing pipeline was removed at the owner's direction. The Universal Editorial Engine core and workspace were retained without the old upstream services.
- Weather, Clouds, Traffic and Earthquakes were separated into feature folders using one Stacks runtime.
- Earth Engine became the shared globe factory and sole owner of quaternion-only viewpoint continuity. Home, Earth View, Moon, Sun and Orb boundaries remain protected.

## 10–14 November — Feature refinements

- Weather went through several visual prototypes and layout trials. Those trial specifications are superseded by the current full-screen Weather direction.
- Live Cams discovery and camera-permission handling were refined within the Traffic feature. Current source and tests take precedence over dated patch notes.
- The shared dock and protected Home/Celestial views remained unchanged.

## 15 November — Current Weather rebuild

- Weather was rebuilt as a full-screen, responsive 2D Canvas atmosphere driven by Open-Meteo conditions when an approved Location fix is available.
- It uses labelled samples when live data cannot be used, and keeps its rendering lifecycle inside the existing Stacks runtime.
- GitHub Pages build succeeded for commit `4c2dc6a95088fdebd0f99059b0c46d3989439395`. Installed-iPhone acceptance remains separate and open.


## Independent Traffic and Live Cams modules

- Split the former combined `Traffic/traffic-view.js` implementation into two independent feature modules.
- `Traffic/traffic-view.js` now owns only the Traffic Orb and clearly reports that no verified traffic provider is connected.
- `LiveCams/live-cams-view.js` now owns the camera-directory discovery experience; its six discovery images live under `LiveCams/Assets/`.
- The shared Stacks loader registers both modules independently. The shared Orb registry, Home Earth, dock and close lifecycle remain the common protected infrastructure.
- The service-worker shell cache and repair path include the new Live Cams module and its assets.
