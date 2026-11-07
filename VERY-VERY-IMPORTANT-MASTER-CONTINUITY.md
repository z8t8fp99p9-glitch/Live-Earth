# VERY VERY IMPORTANT — MASTER CONTINUITY

Read this before every LIVE // EARTH task.

## Protected project rules
- Inspect the actual `main` branch and current commit before every task.
- Preserve working production code; make only the requested, narrowly scoped change.
- Global Orb behaviour and its dependency chain are protected. Never alter them as a side effect.
- Moon and Sun are independent views. Preserve their separate controllers/renderers and behaviour.
- Preserve real offline/runtime assets, local data, recovery paths, service-worker behaviour and staged-update safeguards.
- Do not reset databases, browser storage or caches as a troubleshooting shortcut.
- Shared Global services remain global and reusable; do not duplicate them into view-specific implementations.
- Nature and Alien World are retired. Their notes are historical and must not reactivate their old pipelines.
- Preserve important decisions and history. Mark superseded material; do not silently erase it.

## Safe working sequence
1. Read this note and `VERY-VERY-IMPORTANT-PROTECTED-DECISIONS.md`.
2. Read the relevant standard and architecture note.
3. Inspect current source, callers, tests and dependencies.
4. Explain risky scope before changing it.
5. Make one focused change.
6. Run relevant checks and report exactly what passed or was not run.
7. Prepare the upload ZIP using the root-level ZIP standard.
8. Verify the Actions run, resulting commit and owner device test before claiming completion.

A note is not proof that code is currently deployed. Historical SHAs, build IDs, candidate versions and old test results must be labelled historical. Current `main` source is authoritative for present behaviour.
