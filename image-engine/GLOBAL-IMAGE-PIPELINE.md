# LIVE // EARTH — Callable Global Image Pipeline

This module composes the Global Checker and Global Image Engine in the agreed order:

`Global Collector Sections 1–4 → Global Checker Sections 5–8 → Global Image Engine Section 9 → Global Checker Section 10 → Global Checker Section 11`.

## API

```python
from global_image_pipeline import run_global_image_pipeline

final_report = run_global_image_pipeline(
    collector_batch,
    staging_dir=".image-engine-staging",
    text_policy=text_policy_by_source,
    image_policies=initial_exact_image_policies,
    image_engine_dispatch=checker_issued_routes,
    final_image_policies=fresh_exact_alternative_policies,
    discovered_candidates=authorised_candidates_by_post,
    candidate_discoverer=authorised_discovery_callback,
    visual_inspector=vision_adapter,
)
```

All policy inputs are explicit. No permission is inferred from public availability, source identity, educational purpose, non-commercial purpose or credit. Discovery callbacks may use only routes approved in Checker dispatch.

## Output and immutability

The returned report contains eleven sections. Section 9 returns the candidate and evidence. Section 10 independently verifies the exact image. Section 11 records the audit continuation and final Editorial decision.

**The finalizer changes none of Sections 1–9. It does not append checks to Section 6 and does not rewrite the original `posts` array or existing summary.** It adds only the new Section 10 and Section 11 containers and their names to the top-level section-order index.

Section 11 returns `EDITORIAL_READY` only when original Section 7 text approval is YES and Section 10 image approval is YES with every check passed. Otherwise the post is `HOLD`.

## Not included

- The scheduled Newsroom runner is not modified or wired to call this module.
- It does not write View databases, feed JSON, public asset folders, or publish.
- A real semantic vision adapter must be configured; absent one, visual inspection is `UNKNOWN` and the Checker does not approve the image.
- External discovery providers must be explicitly configured; built-in routes remain restricted by Checker dispatch.

The integration test exercises a Collector-shaped input through Checker Sections 5–8, Image Engine Section 9 and Checker Sections 10–11 with mocked image retrieval and deterministic test vision. It is not a live NASA/Commons network test or scheduled-runner smoke test.
