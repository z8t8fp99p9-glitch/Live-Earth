# Global Collector — integration contract

## Position in the agreed pipeline

`Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Global Editor → FINAL EDITED NEWS PACKAGE → View-specific Publisher`

The Global Collector is one shared service. It accepts a single-View job produced by Global Collection Manager and fetches only the exact feeds allowed by that job's Source-View Assignments.

## Relationship to the existing View Collectors

The 3 November Newsroom Master Blueprint requires each content View to retain its own collection ownership and database writer. This Global Collector build is the shared fetch/parse/normalization service. It does not open SQLite, write records, create a shared story database, or change the existing Nature/Alien World Collector entry points.

At the later integration stage, each existing View Collector remains the View-specific adapter and sole database writer. It will call the shared Global Collector for source intake, pass candidates through Global Checker, and persist only the View's Checker-approved result to its own existing database. The integration must preserve the current View-specific image handling, source restrictions, database schema and cache families unless a separately approved change is made.

## Global Collector duties

- Validate a single-View job from Global Collection Manager.
- Validate the job against the current Manager Source Registry, View Collection Profiles and Source-View Assignments.
- Validate each source's `checkerPolicyRef`, View applicability and exact feed URL against the existing Global Checker Source Registry.
- Fetch bounded HTTPS RSS/Atom feeds from the explicitly registered feed host family only.
- Follow redirects only when they remain inside the exact source policy's allowed feed domain boundary.
- Parse source-provided story metadata, dates, links, author/byline and media candidates.
- Normalize the original canonical URL and stable View/source-scoped story ID.
- Preserve source identity, feed identity, dates, retrieval time and source-policy references.
- Remove entries outside the Manager job's request window when a valid publication timestamp exists.
- Deduplicate repeated copies of the same canonical story from the same source inside one View job. Keep different source identities separate for Global Checker and Global Editor to assess.
- Continue with other feeds if one feed is unavailable or malformed; report the failed feed and mark the batch `partial`.

## Explicitly not Global Collector duties

- No rights, permission, provenance or factual approval. All records begin `checkerStatus: PENDING`.
- No image binary download, image substitution, image generation or image approval. It extracts only metadata references from the feed. Global Image Engine and Global Checker own later image stages.
- No editorial rewriting, story ranking, headline or summary generation.
- No SQLite access or story-database writes.
- No shared database, Magazine database or publication output.
- No direct GitHub Actions dispatch or workflow change in this first slice.
- No browser cache, localStorage, IndexedDB, paid API, hosted inference, login or new cloud service.

## Handoff record shape

The JSON output is a transient collection batch. Each `records[]` item intentionally includes the fields already consumed by `global_checker.evaluate_text(...)`:

- `id` / `story_id`
- `viewId`
- `sourceId`, `sourceName`, `sourceUrl`
- `sourcePolicyRef`
- `url`, `title`, `summary`, `author`
- `publishedAt`, `retrievedAt`
- `mediaCandidates[]` (each explicitly `PENDING_GLOBAL_CHECKER`)
- `checkerStatus: PENDING`
- `persistenceStatus: NOT_PERSISTED`

`summary` is a transient source-derived candidate. Its presence does not authorize storage, transformation, display or publication. Global Checker decides permitted uses first. If the Checker refuses storage, the raw text must not be retained in a View database.

## Invocation

Generate a Manager job with the existing Manager command, save the JSON output as a job file, then run:

```bash
python -m global_collector --job-file manager-job.json
```

Or pipe the Manager JSON directly to standard input:

```bash
python -m global_collector --job-file -
```

The JSON batch is written to standard output. Diagnostic errors go to standard error. The Collector itself does not write a result file.

## Current scope

This first build includes the current Nature and Alien World assignments already recorded by Global Collection Manager. The service is View-neutral and accepts future Views only after explicit Manager profiles, assignments, source entries, and matching Global Checker policies have been added. It does not automatically discover Views or sources.

## Next integration gate

Do not route the current Nature or Alien World production workflows through this component yet. First complete the remaining agreed Newsroom systems. Then integrate one View-specific adapter at a time, preserving the existing database and publication baselines. Full Collector → Checker → database → Engine → Publisher → feed testing is reserved for the overall system-testing phase.
