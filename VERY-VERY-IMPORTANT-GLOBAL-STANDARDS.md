# VERY VERY IMPORTANT — GLOBAL STANDARDS

These standards apply across LIVE // EARTH. The master continuity file explains the project history; this document defines the rules that govern changes.

## 1. Global Orb standard

- Orb behaviour and dependencies are protected global infrastructure.
- Preserve the five Home Orbs: Earth, Moon, Sun, Location and Stacks.
- Preserve width-driven circular sizing, approved positions, touch areas, visual states and landscape geometry.
- Primary-view navigation belongs to the existing view manager. Utility Orbs must not unexpectedly replace an active primary view.
- Preserve the Location toggle semantics: enabling Location is an explicit user action, not a navigation side effect.
- Preserve Stacks feature lifecycle, the feature dock, hitbox alignment and animation cleanup guards.
- Do not change Orb code or its dependency chain without explicit owner approval and targeted iPhone tests.

## 2. Independent-view standard

Moon and Sun are independent views. The shared sky stage/host is an integration point, not permission to merge renderers or view-specific state.

- Shared host: `sky-view-controller.js`.
- Moon renderer: `moon-view-controller.js`.
- Moon interface and lunar overlay/scroller: `moon-lunar-interface.js`.
- Sun renderer: `sun-view-renderer.js`.
- Shared module integration uses the existing view registry and stage.
- Keep Sun-specific calculations and rendering out of the Moon implementation, and Moon-specific calculations and interface behaviour out of the Sun implementation.
- Validate open/close, repeated transitions, portrait/landscape and return-to-Home behaviour on the installed iPhone.

## 3. Global-engine standard

The shared architecture is:

`Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → final Global Checker → shared Newsroom Database Writer → configured View Publisher`

The exact applicable stages are defined by the current component contracts. The ownership rules are stable:

- Manager assigns; Collector gathers; Checker decides; Image Engine prepares; Editorial formats; Writer persists approved records; Publisher produces a View's configured output.
- A downstream stage must not silently take over an upstream stage's authority.
- A View may have its own profile, destination, database identity and Publisher adapter. It does not get its own copy of a Global service.
- Current Manager configuration is empty after Nature and Alien World retirement. Do not infer active jobs from the architecture diagram.

## 4. Global Collector contract

The current `global_collector/README.md` defines a universal `LIVE_EARTH_UNIVERSAL_POST_V1` 38-field record schema and four Collector-owned evidence sections:

1. Manager ID card and integrity fingerprint.
2. Full article/page material and retrieval evidence.
3. Original image candidate records and their metadata.
4. Source and rights evidence gathered from the source/feed/page.

The Collector returns this structured batch transiently. It does not write databases, download image binaries, make licence or copyright decisions, edit stories or publish. It does not create the Checker section or trim collected material based on rights. Operational transport protections and collection bounds remain part of its responsibility.

## 5. Global Checker and permission standard

- The Checker is the shared authority for source, text, image and publication permission.
- Article text and its attached image are separate works; each needs its own decision.
- A publicly readable page, RSS entry, credit or source link is not automatically permission for persistent storage, transformation, republication or image reuse.
- Educational and non-commercial purpose is context, not a blanket copyright licence.
- Unknown, incomplete or contradictory evidence must be held; the pipeline must fail closed rather than quietly allow it.
- Re-evaluate the exact item and exact intended use. Do not generalise an approval to another image, page, source or use.
- A Checker decision must remain traceable to source evidence, identifiers and policy version.
- Checker unavailability or incomplete required checks must not cause an unchecked publication.

### Append-only Checker / Image Engine report contract

The current component READMEs describe this section ownership:
- Collector supplies Sections 1–4.
- Global Checker creates Sections 5–8.
- Global Image Engine creates Section 9.
- Global Checker adds Section 10 (exact final-image review) and Section 11 (post-engine audit/final editorial decision).

Sections 1–9 remain immutable when Sections 10–11 are added. Section 6 must not be rewritten with later checks. Section 10/11 are separate audit entries; they do not overwrite the original per-post records. Unknown required checks do not silently pass. Read `global-checker/README.md` and `image-engine/README.md` before changing this contract.

## 6. Image Engine standard

- Prefer the exact permitted original image where the Checker has authorised that route.
- Alternative image discovery/processing requires explicit route and temporary-processing permission.
- The Image Engine returns one exact candidate or `NO IMAGE SELECTED`.
- It does not create rights or publication approval.
- The final Checker reviews the exact candidate and staged bytes independently.
- A generated illustration must be clearly distinguished from a photograph and must not be described as documentary evidence or a data-accurate scientific visual unless it truly is one.
- Preserve original approved assets and provenance. Do not overwrite a documentary original with fallback artwork.

## 7. Editorial and database standard

- The Universal Editorial Engine is shared, deterministic infrastructure; it does not fetch external sources, own a database or set schedules.
- It may only format content that arrives through the approved handoff. It cannot override Checker decisions or invent missing reporting.
- The text-upgrade record describes extractive sentence selection/reordering, repetition reduction and protection of numbers, quotations, negation and uncertainty. It does not author new facts or paraphrase restricted source text.
- The shared Newsroom Database Writer persists only individually final-approved stories.
- It uses the Manager-selected destination under `.publisher-data/<viewId>/`, applies that View's retention policy and validates ownership.
- It must not reset, drop or silently adopt a database whose ownership does not match the selected View profile.
- It does not write public feeds or publish image assets.

## 8. Offline, privacy and recovery

- Location remains OFF unless manually enabled; no automatic geolocation request.
- Live feeds or other online-only results must not be presented as current while offline.
- Preserve the existing service-worker shell, optional-resource cache and staged update handshake unless the task explicitly concerns them.
- Build identifiers and cache identities must be checked across the service worker and update manager before release.
- Never clear Cache Storage, localStorage, sessionStorage, IndexedDB or a database as a generic troubleshooting shortcut.
- Use the relevant recovery record and a reversible restore plan. Do not blanket-restore unrelated snapshots or workflow YAML.

## 9. Current-versus-historical rule

Nature and Alien World are retired. Their historic schedules, source profiles, 48-hour windows, 32-day retention settings, story caps and old Publisher results are not current operating settings. A future View's policy, retention, schedule and output rules must come from its current Manager profile and code.
