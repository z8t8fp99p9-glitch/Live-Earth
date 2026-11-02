# Global Checker Final Review — Handoff Contract

## Upstream input

1. Exact Global Checker collection-intake JSON (`phase: collection-intake`).
2. Universal Editorial Engine Newsroom package (`phase: editorial-production`).
3. Optional retained stories from the same View for duplicate/related-story review.

Both required inputs must belong to the same registered View. Their Manager Source Registry and Global Checker policy registry versions must still match the repository's current registries.

## Required Editorial Engine identity

- `engine`: `Universal Editorial Engine`
- `coreEngineVersion`: `1.3.0`
- `newsroomAdapterVersion`: `1.0.0`
- `phase`: `editorial-production`

The package's `profileId` must match the enabled View Collection Profile.

## Required story provenance

Each package story must be a member of the matching intake `editorialInputs` branch and preserve:

- story identity and View identity;
- exact `globalCheckerIntakeDecisionId`;
- exact `sourcePolicyRef`;
- checked article URL;
- claims and linked evidence references; and
- structured `riskAssessment.flags`.

Evidence must reference a story in this editorial package and the exact source policy and intake decision. Evidence excerpts are transient review inputs only.

## Result contract

- Exact `GREEN`: included in `approvedStories`, with `approvedForStorage` and `approvedForPublisher` set by the existing Checker.
- `AMBER`, `RED`, or `UNKNOWN`: held; never sent to the database writer by this stage.
- Image denial: the image is removed from the approved story; independently approved text may continue text-only.

No result other than exact `GREEN` can proceed to the next stage.

## Next stage

**Correct View-owned database writer**, followed by the matching View Publisher. Nature and Alien World remain completely separate. The final-review adapter does not open, migrate, create, or write either database.

## Image-only branch

`imageEngineInputs` is not accepted as an editorial story source. Image-only eligibility cannot be upgraded by an image result. A later, separately designed coordinator must resolve that branch without relaxing Global Checker permissions or creating a story from an image alone.
