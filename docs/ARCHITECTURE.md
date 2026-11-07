# LIVE // EARTH — Simple Architecture Map

This is a high-level guide. The source files remain the authority for exact behaviour.

## 1. App layer

The repository-root app files coordinate the app shell, view registration, navigation, update handling and view controllers. Individual views own their rendering and interaction logic.

## 2. View layer

- Home and other registered app views use the shared app shell.
- Moon has its own Moon controller and Moon-specific rendering/assets.
- Sun has its own Sun renderer and Sun-specific calculations/assets.
- Orb behaviour is a protected shared standard; do not change its dependency chain casually.
- Stacks and feature workspaces use their existing feature modules. `engine-feature-views.js` is a working feature-workspace module and is not the deleted Celestial experiment notes.

## 3. Shared engines

The shared engines are reusable services, not copies owned by individual views:

- Collection Manager — defines assignments/jobs and directs collection.
- Global Collector — gathers source material; it is not the permissions authority.
- Global Checker — evaluates permissions, provenance and approval gates.
- Global Image Engine — handles approved image workflows.
- Universal Editorial Engine — performs shared editorial processing.
- Newsroom Database Writer — generic persistence layer, using the selected destination and its ownership rules.

Nature and Alien World are retired. Their historical documents may describe older workflows that are no longer active.

## 4. Data and assets

- `runtime-assets/` contains runtime/offline assets. Do not remove these during a documentation cleanup.
- View controllers and renderers should retain their own IDs and boundaries.
- Database and cache ownership must be respected by the component that owns them.
- Recovery files are kept separate in `recovery/`.

## 5. Safe change path

1. Inspect the current source and callers.
2. Identify the exact component that owns the behaviour.
3. Check its tests and dependencies.
4. Change only the named scope.
5. Run targeted checks.
6. Review the diff and verify the deployed/device result where applicable.
