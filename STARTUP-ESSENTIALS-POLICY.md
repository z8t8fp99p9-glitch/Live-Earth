# LIVE // EARTH — Startup Essentials Protection

**Status:** Protected architecture rule  
**Approval:** The user's explicit approval is required before any change to startup Essentials.

## Non-negotiable rule

Do not add, remove, or modify a file in the startup Essentials inventory, startup controller sequence, Service Worker `APP_SHELL`, or `RUNTIME_DEPENDENCIES` unless the user explicitly asks for that change.

A proposed addition must first be explained with its exact dependency reason and receive approval. Do not silently expand launch-time downloads.

## What is not an Essential

Feature-only controllers, optional renderers, editorial workspaces, feature textures/backgrounds, datasets, media, and any module used only after a user opens a view are not startup Essentials.

They must be fetched only after the user selects the relevant view. Once fetched, they may use the bounded optional cache; this does not make them startup Essentials.

## Core launch contract

The core app may load only the files required to:
- render and operate the Home / Earth scene;
- provide the existing Global Orb navigation and view registry;
- provide shared Earth Engine and graphics foundations;
- provide the existing Moon and sky-stage core;
- initialize Location-OFF privacy and data-store/recovery foundations;
- verify and recover the actual core startup.

The catalogue may register lightweight feature names, symbols, labels, and descriptions so the Stacks library can display its Orbs. A catalogue entry is not permission to download its implementation.

## On-demand contract

- Selecting a Stacks Feature Orb loads the shared Stacks feature runtime and only that selected feature controller.
- Selecting Editorial Engine loads its workspace controller only then.
- Selecting Sun loads the Sun renderer and its view-only textures/backgrounds only then.
- Feature download failures must not mark Home/core startup as failed. They must leave the core scene and Global Orb controls intact and allow a later retry.

## Change discipline

Before any future Essentials change:
1. Identify the exact file and its actual startup dependency.
2. Explain why it cannot be loaded on demand.
3. Show the proposed inventory change.
4. Obtain the user's explicit approval.
5. Keep `index.html`, `sw.js`, startup recovery checks, and this policy document consistent.

**Never treat convenience, preloading, or a new feature registration as authorization to add a launch-time download.**
