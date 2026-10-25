# LIVE // EARTH V90 — Validation Report

Status: candidate package created; not deployed or device-tested.

Source baseline: `f9eb8d212eac8b17e95f24dd0b7e2e74db8b79d1`.

The current `sw.js` and `update-manager.js` source blob IDs were independently matched before editing. The only runtime changes are the worker `BUILD_ID`, `CACHE_NAME`, and the matching update-manager `BUILD_ID`; readiness and repair logic are retained.

- `sw.js`: 55458 bytes, 1109 lines; SHA-256 `8cfa1f96cd3b989e35c178cd3816bc953c484eb113a0d036cf721cbea15fdd90`
- `update-manager.js`: 1922 bytes, 44 lines; SHA-256 `bf155ead8491d7d15c35a3823731efa90717b601c8e74c0b3e92feacdb3624ec`
- Matching build ID: `v90-coherent-app-shell`
- Cache name: `live-earth-shell-v90-coherent-app-shell`

Device tests still required: online launch, second online launch, and offline launch. A successful static check is not proof of an iPhone runtime fix.
