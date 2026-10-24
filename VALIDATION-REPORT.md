# V88.4 Validation Report

## Automated checks run locally

- `node --check view-module-registry.js` — PASS.
- `node smoke-test.cjs` — PASS. The mocked DOM test checks six registered features, transparent vertical list, scroll ownership, live Home-Stacks anchoring, edge clamping, bottom anchoring, current dock-Stacks anchoring when Home navigation is hidden, resize re-anchoring, vmin size tokens, compact grouped Home navigation, landscape bottom offset, primary-view cleanup, lifecycle order and restoration of Home navigation.
- `index.html` source checks — PASS. Confirmed the primary Orb size uses the shared `vmin` token, width-based size overrides are removed from the two old breakpoint rules, the five-Orb group is capped with `vmin`, and the landscape offset uses the agreed shorter-side-based rule.
- Source provenance verified before editing: main `index.html` blob SHA `5777f8cbf1db2498a6805e71deb17b2615f1fd97`; main `view-module-registry.js` blob SHA `52caba5ac85fc3a599dacb50868ecefca27ca94e`.

## Not yet tested

- Real iPhone visual positioning/touch scrolling in portrait and landscape.
- Browser, previously installed PWA, and freshly installed PWA after manual upload.
- Real service-worker update/cache behaviour.

This is a local draft, not a deployment confirmation. Mocked tests cannot guarantee the rail will look correct on an iPhone; perform the device checks before considering the build stable.
