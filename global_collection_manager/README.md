# LIVE // EARTH — Global Collection Manager

**Version:** 0.2.0  
**Status:** Shared production assignment layer for every View.

## One global Manager, one Global Collector

The Global Collection Manager is the global assignment layer for every collection-owning View. It stores the source catalogue, each View's collection profile, source-to-View subscriptions and UTC schedule. It creates an immutable job envelope for the **same shared Global Collector** for every View.

The Manager does not fetch websites, parse feeds, download images, check rights, write story records, edit stories or publish feeds/PDFs. It assigns work. The Global Collector executes the source-intake job; Global Checker retains all rights and provenance decisions.

## Adding another View

There are no Nature/Alien World allowlists or View-specific code branches in this Manager. A future View is registered through configuration only:

1. Add its stable `viewId` and unique `profileId` to `config/view-collection-profiles.json`.
2. Add the View's source subscriptions and unique `assignmentId` values to `config/source-view-assignments.json`.
3. Add any new source catalogue entries to `config/source-registry.json`.
4. Add its cadence under the exact same `viewId` in `config/scheduler.json`.
5. Ensure Global Checker has an applicable policy for the View and source, because collection assignment never grants rights.

The new profile must use the fixed shared Collector entry point `global_collector`. It must retain its own View ID, profile ID, assignments, source IDs, feed URLs and destination database identity/path. Its presentation adapter is registered separately in the same profile via `publisherEntrypoint`; the Global Dispatcher resolves that adapter from configuration rather than adding a collection code branch. The destination path must remain inside `.publisher-data/<viewId>/`.

Adding a View does not require editing Python code, creating another Collector, adding a View name to a choices list, or changing another View's sources or destination. The Global Checker policy must explicitly include that View for each source it is allowed to use.

## Manager commands

From the repository root:

```bash
python -m global_collection_manager.manager overview
python -m global_collection_manager.manager assign --view nature
python -m global_collection_manager.manager assign --view alien-world
python -m global_collection_manager.manager assign-due
```

`plan --view <viewId>` remains as a backward-compatible alias for `assign --view <viewId>`.

Manual assignment requires the configured authorization flag:

```bash
python -m global_collection_manager.manager assign --view <viewId> --manual --authorised
```

The assignment command prints a JSON job envelope. Its `collectorEntrypoint` is always `global_collector`; the envelope carries the target View's IDs, allowed feeds and destination. `collectorWorkflow` is retained as the existing per-View workflow context for compatibility with the current Global Collector and Checker job contracts. This Manager package does not edit or trigger workflows.

The Global Newsroom Orchestrator creates the Manager job and invokes the Global Collector directly. For diagnostics, the envelope can also be passed to the Global Collector CLI:

```bash
python -m global_collector --job-file manager-job.json
```

## Safety and compatibility

- The Manager's Source Registry is distinct from `global-checker/source-registry.json`.
- The Manager never treats an educational/non-commercial purpose as a rights grant.
- All assigned feed URLs must exist in the Manager Source Registry; the Global Collector and Global Checker revalidate policy and source boundaries.
- Every job contains exactly one View. IDs and source subscriptions are not mixed between Views.
- Every View keeps its own destination database identity and path. The Manager does not open or write databases.
- All scheduled Views use the same Global Newsroom Orchestrator and Global Collector. The shared Writer initializes the isolated database selected by each Manager profile. View Publishers remain presentation adapters and read only Checker-released rows.
- Runtime assignment audit events are written under `.manager-state/`; they are operational records, not story data.

## Files

- `manager.py` — generic overview, assignment and due-job commands.
- `dispatcher.py` — creates deterministic job envelopes routed to the shared Collector.
- `source_registry.py`, `profiles.py`, `assignments.py`, `scheduler.py` — validated configuration readers.
- `models.py` — shared identifiers, job schema and fixed global Collector target.
- `health_audit.py` — append-only assignment audit log.
- `config/*.json` — source catalogue, View profiles, assignments and schedules.
- `tests/` — local Manager-only regression tests, including a future View not hard-coded in Python.
