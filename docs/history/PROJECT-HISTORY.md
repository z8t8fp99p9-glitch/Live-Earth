# LIVE // EARTH — Consolidated Project History

**Purpose:** preserve the important decisions recorded in the former scattered root notes while separating historical implementation detail from current rules. This is a historical record, not runtime configuration. Exact previous note versions remain accessible through earlier repository commits.

## 28–31 October 2026 — App continuity and view boundaries

The engineering continuity register recorded hard-won safeguards that must not be removed as apparent cleanup:
- iOS full-screen/root-flow and viewport recovery, including orientation-only stale-scroll clearing.
- An owner-identified hidden Home image/visual used by the scroller workaround. The exact selector was not conclusively located; it remains protected until traced.
- Home visual lock: Earth framing, size, texture, renderer baseline, Moon geometry, star/stardust/orbit visuals and five Home Orbs.
- Five Home Orbs and the distinction between primary views (Earth, Moon, Sun) and global utilities (Location, Stacks).
- Stacks scatter/hitbox alignment and animation completion fallback.
- Location OFF privacy; no automatic geolocation; local observer-time values remain hidden when off.
- Startup integrity checks, online/offline readiness, staged updates, local data/recovery and the rule that `sw.js`/`update-manager.js` build identities must be checked together.
- Basic Map was retained pending route clarification.

A 31 October Views Separation audit described `view-manager.js` as the primary-view authority, `view-module-registry.js` as the shared module/feature registry, `sky-view-controller.js` as the shared sky host, Moon's controller/interface as separate, and Sun's renderer as separately loaded. The PDF Reader was a shared, view-independent utility; its then-current device acceptance was owner-reported and not a blanket test of every view/orientation.

Historical V93/V96/V97/V109 build references in those notes are snapshots/candidates from that period. They must never be copied into current release configuration without inspecting the current source.

## 1 November 2026 — Nature/Alien World product and folder records

The old View-specific implementation notes recorded a period when Nature and Alien World were separate content Views with their own data destinations, Publishers and workflows. At that time, notes described:
- independent SQLite/cache destinations;
- hourly Nature and Alien World workflow schedules at minute 15 and minute 45 UTC;
- a rolling 48-hour Live Feed, up to 10 visible stories and browser refresh every five minutes;
- online-only browser behaviour with `cache: no-store`, no browser feed persistence and clear-on-close;
- Alien World Live Feeds only, with no magazine/catalogue output.

Other 1 November notes document folder ownership, cleanup of generated Python cache artifacts and view-owned test organisation. A repository cleanup addendum explicitly preserved production modules, published output, databases, the app shell, workflows, PDF Reader, Home, Sun and Moon during that package.

These schedules, caps/windows and View-specific collectors belong to the retired configuration period. They are not current settings.

## 2 November 2026 — Rights, Checker, Image Engine and editorial work

The dated Global Checker standard established principles that remain important:
- source, article text and image are assessed separately;
- public access, a credit or a link does not by itself grant reuse rights;
- unknown or restrictive evidence is held;
- educational/non-commercial purpose is not a blanket permission;
- approval is tied to the exact source, item, asset and intended use;
- publication must fail closed when the Checker is unavailable.

The date-specific source examples included NASA, NOAA, USGS, Phys.org, Mongabay, ScienceDaily, Nature Portfolio and Wikimedia Commons. They were policy examples/registrations for the then-existing Views. Do not assume these feeds or registrations are active today; inspect the current registry and Manager assignments.

The Global Image Engine integration record described preserving existing approved documentary images, using a local illustration fallback only under explicit Checker permission, labelling generated art as illustration/not photograph, and rechecking the exact candidate before release. The Image Engine never grants rights.

The Editorial text upgrade was text-only and extractive: sentence ranking and redundancy reduction with safeguards for numbers, quotations, negation and uncertainty. It did not generate facts or paraphrase restricted text. Image editing was explicitly out of scope because a safe binary-image/provenance derivative contract had not been defined.

## 3 November 2026 — Global-only Newsroom architecture

The accepted architecture was consolidated around:
`Global Collection Manager → one Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → final Global Checker → shared Newsroom Database Writer → matching View Publisher`.

Key decisions:
- one shared Manager and one shared Collector; no View-specific Collector copies;
- Manager jobs are View-scoped and preserve IDs/destination;
- Collector output is transient evidence; Collector does not write SQLite or approve rights;
- Checker owns rights/provenance decisions;
- the Image Engine prepares one exact candidate under Checker-issued permission;
- Editorial formats approved content but does not override Checker or create missing facts;
- the Writer persists only individually approved stories into the Manager-selected, View-isolated database;
- the Publisher reads its own approved records and writes its configured output;
- databases and cache destinations remain separate per registered View; no reset, merge or silent adoption.

The earlier 3 November integration note superseded an even earlier note that required View-specific Collectors. The shared/global architecture is the enduring design; active View registration remains a separate question.

## 4 November 2026 — 13-section Newsroom reporting design

A dated integration record documented a detailed 13-section audit route: Manager job, four Collector sections, Checker reviews, Image Engine section, post-engine Checker review, Editorial output, final Checker decision, PDF report, redacted JSON archive, database bridge and matching Publisher.

It recorded important safeguards:
- no stage may alter a previous stage's immutable report;
- report PDFs omit raw article bodies and summaries;
- archived reports redact transient raw text/local staging paths;
- Writer receives only records with the final approve decision;
- the Publisher remains downstream and does not make rights decisions;
- semantic visual relevance was UNKNOWN without a configured inspection adapter, so unknown results were held rather than fabricated.

This 13-section record is an implementation/history reference. The current component contracts and current code determine what is active; do not infer an active scheduled Nature/Alien World run from the old document.

## 5 November 2026 — Nature and Alien World retirement

The retirement handoff records that Nature and Alien World ceased to be active app/feed Views. Their View controllers, Publishers, tests, source folders, published-output folders, workflow templates and database-cleaner implementation were retired. Their scheduled/cleaner jobs were disabled. The Manager source catalogue, assignments, View profiles and schedules were emptied.

The following shared services were deliberately retained:
- Global Collection Manager;
- Global Collector;
- Global Checker;
- Global Image Engine;
- Universal Editorial Engine;
- generic Newsroom Database Writer.

The Global Checker source-rights catalogue remains shared policy/reference data; it is not a Manager subscription or active feed job. The historical handoff also recorded the removal of Nature/Alien World cache families and a coordinated `v110-retired-news-views` app build identity at that date. Those IDs and cache details are historical; verify current values from code before any release.

## 6 November 2026 — independent Sun and Moon

The Sun/Moon separation note recorded the Sun renderer as a static implementation rather than runtime transformation/fetching of Moon source. Both views continue to use the existing shared sky stage and view-module registry. Sun-specific calculations and styling remain in the Sun renderer; Moon controller, lunar Arc/scroller and Moon assets remain Moon-specific.

A separate Sun amber refinement applied distinct warm Rise and Set marker colours. It was intentionally Sun-only and did not alter Moon colours, positions, sizes, timing calculations, geometry, Home, Orb behaviour or Location privacy. The package notes recorded syntax/static checks but not live device acceptance.

## 7 November 2026 — Celestial experiment cleanup and documentation consolidation

The owner asked to remove the Celestial experiment notes. The seven named experiment documentation files were already absent from the branch inspected for the current documentation rebuild. The cleanup must not remove:
- `engine-feature-views.js`;
- `tests/moon-engine-api.test.cjs`;
- `moon-view-controller.js`;
- `sun-view-renderer.js`;
- real Moon/Sun runtime assets and offline textures;
- ordinary feature-workspace modules.

The owner then asked that the very important notes and ZIP upload standard be obvious at the root. The three `VERY-VERY-IMPORTANT` documents now serve as master entry points. The ZIP upload standard is a permanent protected root file.

## Historical test report caveat

A former root `TEST-REPORT.txt` recorded a mixed test snapshot: a set of suites passed, while several older Global Checker, Image Engine and Newsroom Database Writer tests had known failures/import mismatches. It also explicitly said GitHub Actions, deployment and iPhone verification were not run. That report is not a current test result and must not be presented as proof of current green tests.

## Historical retention and cap conflicts

The dated notes contained changing and contradictory feed parameters:
- earlier 48-hour / 10-visible-story arrangements;
- later 32-day/768-hour uncapped publishing proposals;
- a distinct 50-story Nature target in a dated policy/runtime record;
- Alien World record-ceiling values in earlier configurations.

These values applied to different snapshots and were superseded by retirement of those Views. No number in those historic documents should be reused for a future View. A future View's schedule, lookback, cap and retention must be declared in its current Manager profile, Checker policy and Publisher contract.
