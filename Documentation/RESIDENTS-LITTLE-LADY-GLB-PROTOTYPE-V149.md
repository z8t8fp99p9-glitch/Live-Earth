# LIVE // EARTH — Little Lady GLB Weather Preview (v149)

**Date:** 10 November 2026  
**Status:** PREPARED FOR USER UPLOAD; app/device verification pending  
**Scope:** An opt-in, single-character GLB prototype inside the existing Weather Residents preview.

## User goal

The user wants to inspect the newly authored Little Lady GLB in the real LIVE // EARTH Weather scene, under the app's actual camera framing, lighting, landscape background, scale and iPhone canvas dimensions.

## Reviewed baseline

- Repository: `z8t8fp99p9-glitch/Live-Earth`
- Branch: `main`
- Reviewed commit: `e230459f9586a0c56b868758bc2ac77061657492`
- Reviewed Residents 3D engine blob: `2aeaa844f6c6f619396b8567f172526ccb98f932`
- Reviewed Residents library blob: `e4b51a004e26e4527c9c8395534ac12042c0d9b9`
- Reviewed Weather view blob: `90ecfbd824a726836fb5337fe5ba7c3169d486c0`
- Reviewed service-worker blob: `8ae88c7257c19106252797597efb0c62cf54e191`
- The latest observed regression workflow #36 stopped at `resident-3d-refinement.test.cjs`: `COLORS.eye` existed in the palette but the iris used a duplicate hard-coded value. The package uses the existing `COLORS.eye` token for the iris.
- Two other source-string regression assertions were stale against the deployed engine: the old skin colour literal, and the old umbrella hand offset / raised-arm values. Those tests are updated to validate the current actual implementation.
- This package does not claim that the full GitHub workflow is green. GitHub must run it after the user uploads the package.

## Opt-in route only

The prototype is activated by this URL query parameter:

`?residentPrototype=little-lady`

Example full URL:

`https://z8t8fp99p9-glitch.github.io/Live-Earth/?residentPrototype=little-lady`

The normal app URL has no query parameter and continues to show the existing three procedural Residents.

## Runtime design

### Isolated one-character renderer

- New module: `Residents/resident-lady-gltf-preview.mjs`
- GLB asset: `Residents/assets/little-lady-prototype-v02.glb`
- The prototype uses the existing local Three.js r180 runtime and a version-pinned r180 `GLTFLoader` source.
- The loader imports are rewritten to use the already-staged same-origin `./vendor/three.module.js`, avoiding a second Three.js runtime copy.
- The preview module source, loader source and GLB are stored in a dedicated `CacheStorage` namespace after successful online retrieval. This allows later offline reopen after the first successful online load. A first-ever offline attempt without cached prototype assets safely falls back to the standard trio.
- The prototype module is imported through a Blob URL after its source is cached; its static Three.js import is rewritten to the app-local module URL.
- The renderer matches the existing Weather camera, lighting, tone mapping, colour space, reduced-motion behavior, 30 fps ceiling and mobile pixel-ratio cap.
- The model is normalized to about 2.08 scene units tall and grounded at y=0.
- Available clips: `Idle_Breath_and_Gaze`, `Walk_In_Place`, and `Smile_Expression`.
- A small visible label, `LITTLE LADY · GLB PROTOTYPE`, distinguishes this review route from the production trio.

### Safe fallback

If the GLB, loader or renderer fails, the prototype is disposed before the standard Residents renderer is restored. The fallback renderer receives a fresh canvas so a lost prototype WebGL context cannot interfere with the original renderer. The existing 2D artwork fallback remains if the protected three-Resident renderer also fails.

## Prototype asset facts

`LittleLady_Prototype_0.2.glb` is a structurally validated GLB 2.0 asset:

- 8,853,696 bytes
- 18 mesh primitives
- 20-joint skin
- 3 animation clips
- 9 embedded PNG texture images
- 96,087 reported vertices and 188,896 triangles in the original generation validation report

This is a review prototype, not a final Blender-authored production model. It is not a complete replacement for the existing three-character scene and does not yet contain all 14 activity-specific performances.

## Exact v149 package changes

1. `Residents/resident-3d-engine.mjs` — one-line CI consistency correction: use `COLORS.eye` for the iris.
2. `Residents/resident-library.js` — query-gated single-character prototype route; default roster, version and renderer API remain intact; module source caching and safe fallback.
3. `Residents/resident-lady-gltf-preview.mjs` — isolated GLB loader, camera/lights, animation selection, offline asset caches and disposal.
4. `Residents/assets/little-lady-prototype-v02.glb` — real binary GLB model.
5. `Tests/resident-lady-prototype.test.cjs` — query route/fallback contract, loader pin, GLB header, embedded textures, skeleton, clips and normalized skin weights.
6. `Tests/resident-3d-refinement.test.cjs` — replace a stale literal skin-colour assertion with the deployed palette value.
7. `Tests/resident-3d-wardrobe-accessory.test.cjs` — update the stale umbrella hand offset and rain-pose assertions to match the actual deployed engine.
8. `Documentation/RESIDENTS-LITTLE-LADY-GLB-PROTOTYPE-V149.md` — this handoff record.

No changes to `Weather/weather-view.js`, `sw.js`, Home, Earth, Moon, Sun, Location, Stacks, forecast logic, Location privacy, databases or activity definitions.

## Validation performed locally

- JavaScript syntax checks passed for all changed modules and tests.
- All available Residents-specific regression tests passed, including the existing appearance, engine-contract, model-realism, natural-form, play, rain-umbrella, refinement, sculpt, wardrobe and activity-framework tests.
- New GLB test passed: header/version/chunk lengths, 20 named joints, 3 required animations, 9 embedded images, skin-weight accessors and per-vertex normalized weights.
- ZIP manifest, sizes, SHA-256 and archive integrity are to be rechecked after packaging.

**Not yet verified:** a full GitHub Actions run, actual GLTFLoader execution in iOS Safari, in-app display on the iPhone, or offline reopen on the target device. Those require upload/deployment and device testing.

## User test steps

1. Upload `Residents-v149-Little-Lady-Prototype.zip` using the existing root-level ZIP extractor workflow.
2. Wait for the extractor and Pages deployment to finish. Review the regression workflow separately; successful Pages deployment is not proof that the regression suite passed.
3. Open the URL above in the app/browser and open Weather.
4. The prototype mode shows Little Lady alone against the actual Weather scene.
5. Try Exercise, Evening Play and a few other Weather preview buttons to inspect her idle/walk/smile responses. The first prototype maps activities to the available clips; it does not yet recreate every activity's props or custom movement.
6. After one successful online load, reopen with the same query while offline to test the cached module, loader and GLB.
7. Remove `?residentPrototype=little-lady` to return to the standard three-Resident scene.

## Rollback and protection

The default app route remains on the existing procedural trio. To leave the prototype, remove the query parameter. If a repository rollback is needed, revert only the v149 files listed above; keep the v148 procedural engine baseline. The assistant has not written to GitHub; the user retains the established ZIP upload and deployment workflow.
