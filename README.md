# LIVE // EARTH

LIVE // EARTH is a modular web application and Progressive Web App. This repository contains the protected app shell, Earth/Sun/Moon views, Location and Stacks features, runtime assets, recovery utilities and the retained Universal Editorial Engine.

## Core project references

Read these before starting work:

1. [`PROJECT-CONTINUITY.md`](PROJECT-CONTINUITY.md) — project safeguards and safe working sequence.
2. [`GLOBAL-STANDARDS.md`](GLOBAL-STANDARDS.md) — Orb, view and Editorial Engine standards.
3. [`PROTECTED-DECISIONS.md`](PROTECTED-DECISIONS.md) — areas requiring explicit owner approval.
4. [`ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md`](ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md) — mandatory ZIP procedure. This file stays at the repository root, unchanged.

## Documentation

Start at [`Documentation/INDEX.md`](Documentation/INDEX.md). It points to current status, architecture, application standards and consolidated app history.

## Main repository areas

| Area | Purpose |
|---|---|
| `Global/` | Shared view systems, Orb controls, astronomy, Earth Engine, PDF reader and update manager |
| `Data/` | Local data store, recovery logic and dataset manifest |
| `Tools/` | Layout editor tool |
| Root application files | App shell, navigation and iOS startup safeguard |
| `Editorial-Engine/` | Retained Universal Editorial Engine and extractive text utilities |
| `Home/`, `Earth/`, `Moon/`, `Sun/`, `Location/`, `Stacks/` | View-specific code and artwork kept together |
| `Recovery/` | General app recovery instructions and retained recovery material |
| `Tests/` | App and retained-engine regression tests |
| `Documentation/` | Current guidance, standards, architecture and app history |

## Current system boundary

The app retains its five Home Orbs, separate Sun and Moon views, Location, Stacks environmental features, the generic PDF Reader and the Universal Editorial Engine.

The previous collection, source-discovery, feed, policy-checking, image-processing, newsroom database and Publisher systems, along with their associated feature views and Magazine scaffold, have been removed. No scheduled content-collection or publishing pipeline is part of the current app.
