# LIVE // EARTH — Architecture Overview

## 1. Application and view layer

The root app shell and managers coordinate navigation and lifecycle:
- Home and its protected visual/Orb baseline;
- Earth, Moon and Sun primary views;
- Location and Stacks global utilities;
- full-screen Weather, Clouds, Traffic and Earthquakes Stacks feature workspaces;
- the retained Elevation workspace in the shared Stacks feature runtime;
- the single Universal Editorial Engine feature workspace;
- offline/runtime resources and recovery.

Moon and Sun use the shared sky host but retain separate rendering and view-specific behaviour. The existing view manager remains the primary-view transition authority.

## 2. Retained editorial tool

The four independently-owned Stacks workspaces live in flat top-level folders (`Weather/`, `Clouds/`, `Traffic/`, `Earthquakes/`) and register through `Stacks/stacks-feature-views.js`. The Global three-Orb dock remains unchanged. The Universal Editorial Engine is retained under `Editorial-Engine/`. Its core Python implementation, browser helper and extractive text-intelligence utilities remain in place. The Engine workspace is the only retained content-related Feature Orb.

The app no longer contains the previous source-discovery, collection, rights-checking, image-processing, feed, database-writing, Publisher or Magazine services. The preserved Editorial Engine core still contains its prior read-only approved-record input contract; without those former upstream services, that contract is dormant. Do not describe the app as running a live content pipeline.

## 3. Runtime and data

`sw.js` manages service-worker resource caching and startup shell behaviour. `Global/update-manager.js` coordinates readiness and staged updates. The Home, Earth, Moon, Sun, Location, Stacks and dedicated feature folders keep view-owned runtime artwork alongside their relevant view files. `Data/data-store.js` and `Data/data-recovery.js` support local data/recovery.

Every file referenced by the service worker, update manager, view controller or lazy-loading path is a dependency. Do not remove or relocate based on filename alone. Do not reset, merge or delete databases, browser storage, cache families or local data as part of unrelated work.
