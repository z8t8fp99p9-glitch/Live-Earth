# Global Collector — integration contract

## Agreed production pipeline

`Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → Post-Editorial Global Checker → Global Newsroom Database Writer → View Publisher`

There is exactly one collection engine for all Views. Nature, Alien World, and future Views are Manager profiles and source assignments—not separate Collector implementations.

## Global Collector duties

- Accept one immutable job produced by Global Collection Manager.
- Validate the job against the current Manager Source Registry, View profiles, Source-View Assignments, and Global Checker policy references.
- Fetch bounded, allowlisted HTTPS feeds and parse supported feed formats.
- Normalize source records and preserve complete Manager lineage and media candidates.
- Apply the requested lookback window, deduplicate within the job, and report partial source failures without inventing content.
- Return a transient in-memory collection batch.

## Shared downstream ownership

- Global Checker is the sole rights, provenance, and use-permission authority. Text and each image candidate are checked independently.
- Global Image Engine handles the media work assigned by the shared pipeline; it cannot approve its own output.
- Universal Editorial Engine edits only the Checker-cleared inputs.
- Post-Editorial Global Checker independently verifies the package before release.
- Global Newsroom Database Writer initializes and writes only the registered View database selected by the Manager job. It persists released editorial stories, never raw source text or unapproved candidates.
- Each View Publisher is a presentation adapter. It reads only Checker-released rows for its own View and writes only that View's publication output.

## Database and isolation contract

Global collection does not mean mixing View data. The Manager selects a unique database identity and a repository-relative path under `.publisher-data/<viewId>/`. The shared Writer creates the generic schema when needed, verifies ownership, and performs additive changes only. Existing database files and rows are preserved; no reset, truncate, or replacement is permitted. Retention is read from the Manager profile (currently 32 days) and there is no story-count cap.

## Explicit prohibitions

- No `nature/collector/` or `alien-world/collector/` production implementation.
- No per-View Collector allowlists, source scrapers, source filters, image downloaders, or database bootstrap scripts.
- No workflow step may invoke a View-specific Collector. Every scheduled workflow starts the same Global Newsroom Orchestrator after dependency installation.
- No Global Collector database write; its output remains transient until Checker and editorial verification release it to the shared Writer.
- No automatic source discovery, rights inference, similar-image substitution, unapproved media persistence, raw-source text persistence, or cross-View database access.

## Adding a View

Register the View in Global Collection Manager configuration, add source assignments and matching Global Checker policies, provide a destination database identity/path, and configure its publication adapter. No new Collector or Global Collector code branch is created.
