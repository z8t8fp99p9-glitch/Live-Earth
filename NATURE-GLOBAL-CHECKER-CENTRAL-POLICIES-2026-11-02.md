# LIVE // EARTH — central source policies and Nature feed upgrade

Date: 2026-11-02

## Architecture

All source permissions and restrictions are maintained in exactly one policy data file:

- `global-checker/source-registry.json` — the central source registry for both Nature and Alien World.
- `global-checker/global_checker_policy_engine.py` — shared evaluator logic for conditional government educational/informational-use rules. It reads policy data from the central registry and installs into the existing Global Checker module before either view runs.
- `global-checker/live_earth_global_checker_bootstrap.py` — installs the same shared evaluator for both views before dispatching either pipeline.
- `global-checker/nature_adaptive_runtime.py` — Nature-only feed parsing, 50-story cap and adaptive-selection support. It contains no source policy definitions and makes no rights decisions.

There is no Nature-only rights registry and no second rights checker. The existing Global Checker remains the sole collector-write and final-publication authority.

## Central source coverage

| Source | Registry policy | Views | Use rule |
|---|---|---|---|
| NASA | `nasa-official-federal-source-text-v1` | Nature + Alien World | Official NASA-created educational/informational material with attribution; item-level third-party restrictions held |
| NOAA Ocean Service | `noaa-ocean-service-educational-government-v1` | Nature + Alien World | Official agency content with NOAA attribution; restrictive item signals held |
| USGS | `usgs-national-news-educational-government-v1` | Nature + Alien World | Official agency content with USGS attribution; restrictive item signals held |
| Phys.org | `physorg-rss-headline-link-limited-v1` | Nature | Headline/link and Phys.org attribution only; summary is not retained; headline-only fails publication eligibility unless an approved relevant image supplies the visual route |
| Mongabay | `mongabay-per-item-open-license-required-v2` | Nature | Exact article licence and author required; unsupported no-derivatives routes remain held |
| ScienceDaily | `sciencedaily-no-persistent-database-v1` | Nature | Blocked for persistent database use absent written permission |
| Nature Portfolio | `nature-portfolio-database-storage-prohibited-v1` | Nature | Blocked for persistent database use absent a specific permission route |

The project purpose is educational and non-commercial across both views. That purpose is context for applying permissions actually granted by each source; it is not a blanket copyright licence and never overrides third-party or item-level restrictions.

## Image handling

NASA's central image policy remains independently evaluated for exact NASA-origin images, their source article, credit, caption and exclusion markers. Nature's existing Wikimedia Commons contextual-image allowlist remains exact-file/creator/licence/credit/caption checked. The shared final gate accepts a separately approved NASA-origin image in Nature without changing the existing Commons policy version; the output retains the actual NASA policy version and source identity. The Nature feed upgrade does not automatically import third-party publisher photographs or assume that an agency-hosted page clears every image on it.

## Nature feed configuration

Nature subscribes to seven verified feed endpoints: NOAA Ocean Facts, NOAA NOS News, NASA Earth Observatory Image of the Day, NASA Earth Observatory Natural Events, USGS National News Releases, Phys.org Environment and Mongabay.

Nature retains a 48-hour initial lookback and expands through 96, 168, 336, 504 and 768 hours when fewer than 50 eligible unique items are available. Only Checker-approved meaningful text or a separately approved relevant image counts toward the target. Maximum output is 50 stories. Retention remains 32 days in Nature's independent SQLite database. Alien World's profile, database, collector and publisher settings are not changed by this Nature feed-profile update.

## Validation performed for this upload package

- Central source registry JSON parses and contains seven source policies.
- NASA, NOAA and USGS source policies are explicitly shared by both views.
- Shared policy evaluator compiles; an automated repository test file covers all three agency policies in both views, third-party author holds, restrictive-marker holds, missing-summary handling, wrong-feed rejection, headline-only eligibility and Nature Commons/NASA image decision scoping. A separate local mock-checker test of the same scenarios passed.
- Nature adaptive runtime and bootstrap compile.
- Nature profile checks: seven feeds, 50-story target, 48-hour initial lookback, 768-hour maximum lookback and 32-day retention.
- Full repository test suite and actual GitHub Actions runs have not yet been executed against this package. No GitHub files were written, committed or deployed.
