# Image Engine Section 9 — Integration Contract

## Required call order

1. Global Collector creates Sections 1–4.
2. Global Checker v2.1.1 creates Sections 5–8 and issues explicit per-post image route policy.
3. Image Engine v1.0.0 receives the complete eight-section report and appends Section 9 for every post.
4. The complete nine-section report and `checkerHandoff` return to Global Checker.
5. Global Checker appends Section 10, independently reviewing the exact candidate.
6. Global Checker appends Section 11, recording the post-engine audit and final Editorial decision.
7. Sections 1–9 and the original Section 6 audit remain unchanged throughout steps 5–6.
8. Only Section 11 `EDITORIAL_READY` posts are passed to Editorial.

## Already-approved original image

When Section 8 is YES for the exact Section 5 selected URL, Image Engine prioritises that image. It fetches/validates it only through the explicit allowed host, checks the bytes and records the original image's identity. It does not run broad discovery first. If the original is technically unsuitable, it can consider alternatives, which Checker must independently authorise in Section 10 with a fresh exact-candidate policy.

## Alternative image

A not-yet-approved candidate requires an explicit Checker-supplied HTTPS host allowlist and `temporaryProcessingAllowed: true` before retrieval. An external `candidate_discoverer` callback is invoked only when Checker explicitly enables at least one `discoveryRoutes.*.enabled` route (or `externalDiscoveryAllowed: true`). Built-in Commons and local illustration routes require their own explicit policies. Rights do not transfer from the original image or a different alternative.

## Semantic vision adapter

Pass an adapter at engine construction exposing `inspect(image_path=..., context=..., candidate=...)` or a callable with the same arguments. It must return structured visual facts, an explicit `PASS`, `FAIL` or `UNKNOWN`, article relevance and misrepresentation warnings. No default hosted provider, key or paid inference service is added. Without an adapter, semantic visual assessment is `UNKNOWN` and Section 10 does not grant image approval.

## Callable integration

`global_image_pipeline.py` calls Checker Sections 5–8, Image Engine Section 9, Checker Section 10 and Checker Section 11 in order. Section 10 and 11 are append-only. Section 6 and prior section data are not changed. The callable does not modify the scheduled runner, run schedules, write View databases, write feeds or publish. Full live runner wiring and a production visual provider are separate integration work.
