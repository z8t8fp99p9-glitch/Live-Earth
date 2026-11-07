# Shared Newsroom Pipeline Architecture

## Responsibility order

`Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → final Global Checker → shared Newsroom Database Writer → configured View Publisher`

The diagram represents ownership for a future/registered View. The Manager's current assignments and schedules are empty following the retirement of Nature and Alien World.

## 1. Manager
The Manager validates source catalogue entries, View profiles, assignments and schedules, then creates an immutable View-scoped job envelope. One job belongs to one View and carries its IDs and destination. It assigns; it does not fetch sources or approve content.

## 2. Global Collector
One universal Collector receives the job and returns transient structured evidence. It collects source/feed data, full article material, original image candidates and source/rights evidence. It preserves IDs and provenance, validates transport boundaries and does not write a database or make rights/editorial decisions.

## 3. Global Checker
The Checker owns source, text, image and publication decisions. The Collector's evidence is not approval. Checker decisions must be traceable and fail closed when required evidence is unavailable.

## 4. Global Image Engine
The Image Engine prepares the exact permitted candidate and reports it. It does not approve rights or publish.

## 5. Universal Editorial Engine
The shared Engine receives the approved handoff and builds the requested feed/document output. It is deterministic and does not invent reporting. The Publisher supplies the View context, read-only database connection and destination.

## 6. Final Checker
The final Checker verifies the exact editorial/image handoff. Earlier report sections remain immutable; later decisions are recorded as new sections.

## 7. Newsroom Database Writer
The shared Writer writes only individually final-approved stories. It initializes or additively updates a correctly owned View database; it never resets, drops or silently adopts an unowned destination. The database identity/path comes from the Manager profile under `.publisher-data/<viewId>/`.

## 8. View Publisher
The configured Publisher reads only its own approved records in read-only mode and writes only the output types/destination it owns. It is not a Collector, rights authority or database writer.

## Data separation and failure behaviour
- Each registered View has its own database identity, retention policy and published output.
- A job must not mix View IDs, source assignments or destinations.
- Preserve the last-good public output when a new run fails.
- Never present stale online-only data as current while offline.
- Never reset or merge View databases as a convenience.
- The exact active config, contracts, tests and workflow files must be inspected before any future registration.

## Current status
The Manager README currently records no registered source catalogue, assignments, View profiles or schedules. Nature and Alien World are retired. This document preserves the shared design; it does not claim the old schedules or per-View pipelines still run.
