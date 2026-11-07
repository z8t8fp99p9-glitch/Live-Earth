LIVE // EARTH — START HERE
Updated: 7 November 2026
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main

1. READ THESE FIRST
- docs/INDEX.md — where to find project notes.
- docs/CURRENT-STATUS.md — what is active, retired, or protected.
- docs/WORKING-RULES.md — safety rules for changes and ZIP uploads.
- docs/ARCHITECTURE.md — simple map of the app and shared engines.

2. CURRENT PROJECT POSITION
- Nature and Alien World collection Views and their old publishing pipelines are retired. Their dated documents are historical records, not instructions to reactivate them.
- Home, Moon, Sun, Orb and the remaining app modules must be treated as existing production code. Check the current source before proposing changes.
- Moon and Sun are independent views. Preserve their separate controllers and rendering behaviour.
- Global Orb behaviour and its dependencies are a protected project standard. Do not change them unless the owner explicitly asks.
- Shared Global Checker, Global Collector, Global Collection Manager, Global Image Engine, Universal Editorial Engine and generic Newsroom Database Writer code are separate reusable modules. Do not convert global services into view-specific copies.
- The experimental Celestial Engine notes are removed in this package. This does NOT remove working Moon/Sun controllers, real offline Moon/Sun assets, `engine-feature-views.js`, or ordinary feature-engine workspaces.

3. SAFE WORK RULES
- Inspect the actual `main` branch before every change. Do not assume an earlier ZIP is still current.
- Change only files required for the named task.
- Do not redesign or refactor unrelated systems.
- Preserve existing IDs, data boundaries, offline assets, service-worker behaviour and working view dependencies unless explicitly included in the task.
- Keep history. Mark old decisions as superseded or historical instead of silently presenting them as current.
- Run relevant syntax checks and tests. State clearly what was and was not tested.
- Never claim a GitHub upload, commit, deployment or device test succeeded until it has been verified.

4. ZIP UPLOAD
- Follow `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md`.
- Upload one ZIP to the repository root on `main`; do not unpack it.
- The ZIP must contain `UPLOAD_MANIFEST.json` at its root, with exact file sizes, SHA-256 hashes, a task-specific `commitTitle`, and any approved `delete` paths.
- Keep exactly one root-level ZIP in the repository during an upload attempt.
- Check the GitHub Actions run and verify the resulting commit and changed files.

For the full documentation map, open `docs/INDEX.md`.
