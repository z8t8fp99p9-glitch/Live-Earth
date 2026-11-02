# LIVE // EARTH — 32-Day Uncapped Live Feed Publishing Addendum

**Date:** 2 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Scope:** Nature and Alien World publishing pipelines only

## Decision

Both Nature and Alien World now use the complete rolling 768-hour (32-day) database window. Story-count targets, visible story caps, Alien World record-count ceiling and documentary-image count ceiling are disabled. The databases remain independent and retain records for 32 days. Publishing considers every unique, eligible item available from each approved source within the window.

The Collector can only collect history actually supplied by the source feeds during a run. This change does not make a feed provider expose older items than it publishes.

## Agreed pipeline

1. The view-owned Collector retrieves current source-feed entries and retains permitted records in that view's own SQLite database for 32 days.
2. Global Checker evaluates text/source permission before storage. Items that are not permitted for persistent storage are rejected. If only headline/link/date use is permitted, the restricted summary is removed and is not summarized or reconstructed.
3. Documentary image rights are checked independently. An approved documentary image can proceed. If it is missing or rejected, the Image Engine may create original illustrative artwork using only permitted story metadata.
4. Global Checker evaluates the original illustration. Only a GREEN image decision is passed to the Universal Editorial Engine.
5. The Editorial Engine lays out all eligible source-approved text and Checker-approved imagery. The final Global Checker gate checks the candidate feed again before the public JSON is replaced.
6. The existing Live Feed output, view-specific caches and GitHub Pages delivery remain in place.

## Sources

Phys.org has been removed from Nature's active source profile and Collector host allowlist. No replacement source was added in this patch because an additional source must first be reviewed and registered. The prior Phys.org policy record remains dormant in the central registry and is not subscribed by Nature.

## Configuration

- Nature: 768-hour publication window, 32-day retention, no story cap, six active sources.
- Alien World: 768-hour publication window, 32-day retention, no story cap, no record-count ceiling, no documentary-image quota.
- Nature and Alien World retain separate databases, caches, published JSON and asset folders.
- Existing YAML schedules are unchanged: Nature at minute 15 UTC; Alien World at minute 45 UTC.

## Editorial Engine boundary

The current Python Editorial Engine is deterministic; it does not call an AI service. It passes through source summaries only when the Global Checker marks summary use as permitted and preserves the approved source-summary digest. It does not invent or paraphrase restricted text. Headline/link-only items can still be published when their independently Checker-approved original illustration satisfies the image route.

## Verification

Local regression checks passed for the current patch:

- Nature tests: 17 passed.
- Alien World tests: 14 passed.
- Global Checker tests: 78 passed (including the pre-layout Image Engine hand-off test).
- Image Engine tests: 23 passed.

Python compile checks also passed. These are local tests only; the new code still requires successful GitHub Actions runs after the owner uploads the package. No GitHub files have been written or committed by this work.
