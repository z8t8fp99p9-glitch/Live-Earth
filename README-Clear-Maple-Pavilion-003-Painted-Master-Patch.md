# LIVE // EARTH — Painted Master Brush-Reveal Patch

## What this patch does
- Restores the approved painted Clear Maple Pavilion as the active artwork, using the exact user-supplied master image copied byte-for-byte.
- Adds a schema-v3 master-reveal renderer: 100 authored pressure-shaped brush sweeps progressively reveal the original painting, clipped to a five-stage image-derived transparent mask atlas instead of redrawing it as line art.
- Clear Replay contains 100 brush gestures (maximum 100) and runs for exactly 30 seconds.
- Implements the binding stage order: thick structure; attached thin details; air/birds/little things; leaves; sun last and final finish.
- Updates the production guide, machine-readable art direction, catalogue, and Clear-specific production plan to standard 2.4.
- Retains schema-v1 and schema-v2 rendering support for backwards compatibility.

## Protected
- Rain artwork and its active catalogue record are unchanged.
- Existing Weather view layout, 10:7 card, typography, controls, portrait/landscape behaviour, service-worker logic and network/cache behaviour are not intentionally changed.
- Historical Clear 001 and Clear 002 assets remain in the repository, unchanged.

## Validation
Run:
`node --check Weather/Art/live-art-online.js`
`node Tests/weather-art-master-reveal.test.cjs`
The preview `Weather/Art/References/clear-maple-pavilion-003-brush-reveal-preview.png` shows the fully revealed final artwork derived from the exact master.

## Upload
Upload this ZIP to the repository root on `main`. Do not unpack it. The manifest carries the commit title.

## Commit title
`Restore Painted Clear Live Art with 30-Second Brush Reveal`
