# Global Checker v2 Integration Contract

1. Pass the complete Global Collector batch to `GlobalChecker.run()` without altering Sections 1–4.
2. Supply explicit text policy and per-post image policy objects from the policy decision stage. A policy identifier without `sourceMatch: true` / `policyMatch: true` is insufficient.
3. Supply Image Engine proposals under `image_engine_candidates[postId]`. These are untrusted candidate suggestions, not approvals.
4. Section 5 selects exactly one eligible original URL or returns `NO IMAGE SELECTED`.
5. Section 8 evaluates only the exact Section 5 selected URL. It cannot silently substitute another candidate.
6. Section 7 independently evaluates text permissions. Full-article permission is separate from feed-summary permission.
7. Section 6 is the unified record of all checks executed in Sections 5, 7 and 8.
8. A missing policy/evidence item is not permission. `UNKNOWN` does not pass.
9. The Checker does not edit Collector sections, fetch sources, download images, write databases, or publish.
10. The orchestrator must hold any record whose required decision is not YES and must pass the report to the next authorized stage without changing its evidence.

## Result contract

Each check has stable `checkId`, `executed`, `passed`, `result`, `evidence`, and `reason`. `executed` is YES/NO. `passed` is YES/NO. `result` is PASS/FAIL/UNKNOWN. Every executed check is copied into Section 6.
