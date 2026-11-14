> **Historical design note — superseded 14 November 2026.** This document records the earlier globe-first Live Cameras proposal. That design is not the current implementation and must not be reintroduced as part of the present Live Cams redesign. The user explicitly cancelled adding a globe to Live Cams. The current source-of-truth design is [LIVE-CAMS-DISCOVERY-REDESIGN-2026-11-14.md](./LIVE-CAMS-DISCOVERY-REDESIGN-2026-11-14.md). The historical proposal below is retained so the project record is not erased.

# LIVE // EARTH — Live Cameras workspace

**Prepared:** 14 November 2026  
**Integration:** Existing Stacks feature runtime, replacing the former Traffic preview slot; Home navigation remains five Orbs.

## Scope

- Full-screen Live Cameras workspace under Stacks.
- Reuses the shared Home Earth through `LiveEarthStacksFeatureRuntime.attachLayer`; no second Earth, scene or renderer.
- Uses the anonymous OpenEye public catalogue endpoints for global camera map positions and camera metadata.
- Renders up to 450 globally sampled camera or cluster markers on the existing globe, plus a searchable/category-filtered list of up to 100 returned camera records, selected-camera preview, operator attribution and source link.
- Uses preview images only when the API explicitly reports `view.render === "image"` and `redistribution.preview_embed === true`.
- Cameras without an embeddable preview open the source/publisher page when a safe HTTPS watch URL is supplied. This first version does not attempt paid WHEP playback or direct-stream proxying, and does not yet fetch every camera record in the global catalogue.
- Clears live camera records on offline and view teardown; refreshes every five minutes while active.
- Does not request Location permission or store coordinates.

## Source and limitations

OpenEye documents anonymous public GET endpoints at `https://api.openeye.cam/v1/catalog/map` and `/catalog`, permissive CORS, camera coordinates, view rendering instructions and redistribution metadata. The service documents paid per-second WHEP sessions for continuous video; this workspace does not invoke them. A listed camera is not guaranteed to be working at the instant it is opened. The source directory's own camera/operator attribution is preserved.

## Integration note

The existing Stacks loader already loads `Traffic/traffic-view.js` and the service worker already includes that path in its app shell. This package replaces the former honest Traffic preview with the new Live Cameras workspace in that existing Stacks slot. The slot's visible title is relabelled at runtime; Home Orbs and the protected Global dock are not changed.

## Verification boundary

The included Node contract test checks the integration and safety rules. It does not verify third-party API uptime, camera freshness, publisher playback, service-worker refresh, deployment or iPhone rendering. Those require testing after the user uploads the package and the app reloads.
