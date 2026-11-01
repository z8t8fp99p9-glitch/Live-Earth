# LIVE // EARTH — Global Checker Standard

**Decision date:** 2 November 2026  
**Status:** Integrated candidate prepared; Global Checker v1.0.3 passes 30/30 deterministic tests. Not yet uploaded, activated in GitHub Actions, deployed or iPhone-verified.  
**Applies to:** every current and future LIVE // EARTH content view.

## Decision

LIVE // EARTH will use one shared **Global Content Rights & Provenance Checker**. It will own the common source, text, image and final-publication rights decisions. Individual Collectors will retain only their view-specific source discovery, network and technical processing responsibilities. Individual Publishers will retain view-specific feed shaping and atomic output responsibilities, but may not bypass the final Checker gate.

## Mandatory principles

1. Rights are checked at two points: before database storage and immediately before publication.
2. Article text and attached images are separate copyright works and receive separate decisions.
3. A free-to-read page or RSS feed is not automatically free for persistent database storage, transformation, republication or image reuse.
4. A credit, source link or source-domain match does not itself create permission.
5. Use the least restrictive clearly documented public/open rights route; do not assume permission or seek individual permission as a default project workflow.
6. RED and UNKNOWN material is not stored or published. AMBER material is allowed only in its exact documented limited form. GREEN means allowed for the particular use recorded, not universally unrestricted.
7. If the Checker or registry is unavailable, the pipeline fails closed and preserves the last-good public feed.
8. Image denial does not automatically disqualify an otherwise-cleared text story; publish it text-only.
9. Preserve each view's independent SQLite database, current 32-day retention, existing cache family and existing Publisher/Collector ownership.
10. Do not alter approved views, Home composition, locked Moon View, Sun View, Stacks, Location-OFF privacy, offline startup, local recovery, PDF library or browser feed-storage rules as part of this work.
11. A metadata-only Checker cannot visually prove every logo, identifiable person, misleading caption or hidden third-party asset. Such uncertain items must be held rather than treated as automatically cleared; image bytes must still pass the Collector's technical validation.

## Initial source policy

- NASA: conditional item-level route for official NASA material with no third-party or restrictive rights signals. Only the five exact current NASA feed URLs in registry v2026-11-02.3 are approved; a new feed on the same host is UNKNOWN until reviewed. NASA's general guidance is not a blanket clearance for every page, author, image, logo or embedded third-party asset.
- Phys.org RSS: limited headline/link/date route only; do not persist or display its RSS summary in the current workflow.
- ScienceDaily: blocked from persistent collection because its RSS terms prohibit database storage without prior written consent.
- Mongabay: hold unless the exact article supplies an accepted open licence and author/attribution evidence.
- Nature Portfolio: blocked for the current persistent database route; its general site terms prohibit storing site content/feed data to populate a database except where specifically permitted.
- Wikimedia Commons: assess every exact file page and licence independently; retain creator, licence, source page, credit, contextual caption and modification note.
- Unknown and new sources start UNKNOWN; they are blocked before retrieval. Approval is bound to the exact reviewed feed URL as well as the host/source identity; a new feed on the same domain is not automatically approved.

## Current approved NASA feed endpoints
- `https://www.nasa.gov/news-release/feed/`
- `https://science.nasa.gov/feed/`
- `https://www.nasa.gov/feeds/iotd-feed/`
- `https://www.nasa.gov/blogs/artemis/feed/`
- `https://www.nasa.gov/blogs/spacestation/feed/`

Any other NASA feed URL must be added to the versioned registry only after review and test coverage. Same-domain matching alone is insufficient.

## Operating architecture

`Global Source Registry → view-specific Collector → pre-storage Checker → view-owned DB → view-specific Publisher → Universal Editorial Engine → final Checker gate → view-owned public feed`.

The Global Source Registry is part of the Global Checker, not a separate Collector, Publisher or standalone global system. The Checker does not become an owner of either view database; it writes one additive evidence table within the database supplied by that view's Collector/Publisher. The current Nature final gate also stages its public image-rights manifest and releases it only after the matching candidate feed passes.

## Implementation boundary
The rights decisions are centralized in the Global Checker. Collectors keep only the source-specific retrieval work and technical integrity controls (HTTPS/redirect validation, byte/time limits, MIME, decoding, safe paths and database ownership). Publishers keep view-specific feed selection and atomic writing, but the final output gate is mandatory. Existing feed formatting and each view's independent database remain unchanged.

## Implementation verification
- Global Checker version: `1.0.3`.
- Source Registry version: `2026-11-02.3`.
- Deterministic Checker and adapter tests: `30/30` passed locally.
- Both staged workflow YAML files parse. Live GitHub Actions, deployment and iPhone verification are still pending.

## Versioning

The source registry carries its own version and review dates. Changes to terms, allowed source routes or accepted licences require a policy version increment, tests and a continuity note. Decision evidence is retained for a bounded 32-day period from its latest check. A decision may briefly outlive its story row; expired decision records are pruned without changing the existing story-retention policy.
